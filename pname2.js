/**
 * 日期：2026-04-21 最终修复版（原作者 @Key）
 * 修复：$substore.env → $.env（避免加载时报错）
 * 支持 SubStore 所有平台（推荐 Loon/Surge 使用效果最佳）
 * 用法：
 * https://raw.githubusercontent.com/Jomejyjle/rule/refs/heads/main/pname2.js#bs=30&timeout=1000
 * 参数：bs=批处理数（建议20-50）、timeout=超时(ms)、flag=加国旗、px=按延迟排序、debug=调试日志
 */

const $ = $substore;
const iar = $arguments;

let timeout = iar.timeout || 2000,
    flag = iar.flag,
    debug = iar.debug,
    Sort = iar.px,
    bs = iar.bs || 20;

// 正确获取平台信息
const { isLoon, isSurge } = $.env || {};

async function operator(e = [], targetPlatform, env) {
    let tzname = "", subcoll = "", x = false, xy = false;
    if (env?.source?.[e?.[0]?.subName]) x = true;
    if (env?.source?._collection?.name) xy = true;
    if (x && xy) {
        tzname = env.source._collection.name + ": [" + env.source._collection.subscriptions + "]";
        subcoll = "组合订阅内单条订阅加了脚本";
    } else if (x) {
        tzname = env.source[e[0].subName].name;
        subcoll = "单条订阅脚本";
    } else {
        tzname = env.source._collection.name;
        subcoll = "组合订阅脚本";
    }

    const startTime = new Date();

    // 使用 targetPlatform 优先兼容所有平台
    let target = targetPlatform;
    if (!target) {
        target = isLoon ? "Loon" : isSurge ? "Surge" : undefined;
    }

    if (!target) {
        $.notify("PNAME", "不支持的平台", `当前平台: ${targetPlatform || "未知"}，跳过处理`);
        return e;
    }

    if (e.length < 1) {
        $notification.post("PNAME:" + subcoll + tzname, "订阅无节点", "");
        return e;
    }

    function klog(...arg) {
        console.log("[PNAME] " + subcoll + tzname + " " + arg);
    }

    const ein = e.length;
    klog(`开始处理 ${ein} 个节点，批处理数: ${bs}`);

    let i = 0, newnode = [];
    while (i < e.length) {
        const batch = e.slice(i, i + bs);
        await Promise.all(
            batch.map(async (pk) => {
                try {
                    const OUTK = await OUTIA(pk);
                    const qcip = pk.server + OUTK.ip;
                    if (flag) pk.name = getflag(OUTK.loc) + " " + pk.name;
                    newnode.push(OUTK.ip);
                    pk.Key = OUTK;
                    pk.qc = qcip;
                } catch (err) {
                    delog(err.message);
                }
            })
        );
        i += bs;
    }

    e = removels(e);
    let eout = e.length;

    if (eout > 2 && isSurge) {
        const allsame = newnode.every((v, i, arr) => v === arr[0]);
        if (allsame) {
            klog(`未使用带指定节点功能的 SubStore`);
            $notification.post(
                'PNAME：点击安装对应版本' + subcoll + tzname,
                '未使用 ability=http-client-policy 或所有节点IP相同',
                '',
                { url: "https://raw.githubusercontent.com/sub-store-org/Sub-Store/master/config/Surge-ability.sgmodule" }
            );
            return e;
        }
    }

    if (Sort) e.sort((a, b) => a.Key.tk - b.Key.tk);

    const endTime = new Date();
    klog(`处理完成，剩余 ${eout} 个节点，总耗时 ${zhTime(endTime.getTime() - startTime.getTime())}`);

    return e;
}

// 以下函数保持不变（getflag、sleep、OUTIA、removels、zhTime 等）
function getflag(e) {
    const t = e.toUpperCase().split("").map((e) => 127397 + e.charCodeAt());
    return String.fromCodePoint(...t).replace(/🇹🇼/g, "🇨🇳");
}

function sleep(e) { return new Promise(t => setTimeout(t, e)); }

let apiRead = 0, apiw = 0;
async function OUTIA(e) {
    const maxRE = 2;
    const url = `https://cloudflare.com/cdn-cgi/trace`;

    const getHttp = async (reTry) => {
        try {
            let r = ProxyUtils.produce([e], target);
            let time = Date.now();
            const response = await Promise.race([
                $.http.get({ url: url, node: r, "policy-descriptor": r }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout))
            ]);
            const data = response.body;
            if (data && data.length > 0) {
                let endtime = Date.now() - time;
                let lines = data.split("\n");
                let key = lines.reduce((acc, line) => {
                    const [name, value] = line.split("=").map(item => item.trim());
                    if (["ip", "loc", "warp"].includes(name)) {
                        acc[name] = value;
                        acc["tk"] = endtime;
                    }
                    return acc;
                }, {});
                return key;
            } else {
                throw new Error("empty response");
            }
        } catch (error) {
            if (reTry < maxRE) {
                await sleep(getRandom());
                delog(e.name + "-> [OUTKApi超时查询次数] " + reTry);
                return getHttp(reTry + 1);
            } else {
                throw error;
            }
        }
    };

    return new Promise((resolve, reject) => {
        getHttp(1).then(data => { apiw++; resolve(data); }).catch(reject);
    });
}

function getRandom() {
    return Math.floor(Math.random() * (200 - 20 + 1) + 20);
}

function delog(...arg) {
    if (debug) console.log("[PNAME] " + arg);
}

function removels(e) {
    const t = new Set();
    const n = [];
    for (const s of e) {
        if (s.qc && !t.has(s.qc)) {
            t.add(s.qc);
            n.push(s);
        }
    }
    return n;
}

function zhTime(e) {
    e = e.toString().replace(/-/g, "");
    if (e < 1000) return `${Math.round(e)}毫秒`;
    else if (e < 60000) return `${Math.round(e / 1000)}秒`;
    else if (e < 3600000) return `${Math.round(e / 60000)}分钟`;
    else return `${Math.round(e / 3600000)}小时`;
}
