/* Finverse — 市场温度公开页数据
 *
 * 每次更新只需修改本文件里的数字与文字，保存后同步部署即可。
 * 页面会读取 window.FINVERSE_TEMPERATURE 渲染。
 * sample: true 时页面顶部显示「示例数据」标记；接入真实数据后改为 false。
 */
window.FINVERSE_TEMPERATURE = {
  "sample": true,
  "updated": "2026-10-14 15:30",
  "market": "A股",
  "score": 62,
  "label": "偏暖",
  "history": [55, 58, 61, 59, 62],
  "kpis": [
    { "label": "上涨家数", "value": "2,871", "tone": "up" },
    { "label": "下跌家数", "value": "1,932", "tone": "down" },
    { "label": "涨停 / 跌停", "value": "46 / 7" },
    { "label": "两市成交额", "value": "1.02 万亿" }
  ],
  "indices": [
    { "name": "上证指数", "value": "3,218.4", "change": 0.6 },
    { "name": "深证成指", "value": "10,455.2", "change": 0.9 },
    { "name": "创业板指", "value": "2,186.7", "change": 1.2 },
    { "name": "恒生指数", "value": "19,842.6", "change": -0.3 },
    { "name": "纳斯达克", "value": "18,274.1", "change": 0.4 }
  ],
  "dims": [
    { "name": "趋势", "score": 68, "note": "主要指数站上 20 日均线" },
    { "name": "市场广度", "score": 55, "note": "上涨家数占优，但集中在权重股" },
    { "name": "量能", "score": 71, "note": "成交额回到 1 万亿上方" },
    { "name": "领涨强度", "score": 64, "note": "半导体与电网设备连续三日居前" },
    { "name": "波动率", "score": 48, "note": "波动收敛，尚未出现极端情绪" },
    { "name": "资金流向", "score": 59, "note": "主力资金小幅净流入" }
  ],
  "sectors": [
    { "name": "半导体", "change": 3.2, "note": "设备与材料分支领涨" },
    { "name": "电网设备", "change": 2.4, "note": "订单预期改善" },
    { "name": "创新药", "change": 1.8, "note": "龙头放量突破" },
    { "name": "银行", "change": -0.6, "note": "高股息资金分流" },
    { "name": "房地产", "change": -1.4, "note": "成交回落" }
  ],
  "commentary": "指数在震荡区间上沿获得量能支持，领涨方向仍集中在半导体与电网设备。市场温度处于偏暖区间，但广度尚未全面扩散；量能回升与广度不足同时存在，需继续观察。"
};
