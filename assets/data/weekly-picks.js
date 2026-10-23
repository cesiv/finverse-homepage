/* Finverse — 公开研究框架数据（不再包含任何个股、价格、买卖点或复盘收益）
 *
 * 2026-10-20 P0 整改：公开页只展示研究方法，不展示具体证券标的。
 * `picks` / `review` 保持为空数组；如未来恢复展示，必须先完成证券投资咨询
 * 资质与适当性合规评估（见 audit/01-compliance.md）。
 */
window.FINVERSE_PICKS = {
  "sample": true,
  "updated": "2026-10-20",
  "weekLabel": "公开版 · 研究方法",
  "notice": "本页仅介绍 FINVERSE 研究框架，不展示任何个股、代码、价格或买卖建议。",
  "picks": [],
  "review": [],
  "method": [
    { "name": "Fundamentals", "note": "盈利加速、利润率扩张，连续多季超预期" },
    { "name": "Institutional", "note": "机构持仓数量与比例逐季递增" },
    { "name": "New", "note": "新产品、新产能或价格突破带来的新叙事" },
    { "name": "Volume", "note": "有效突破必须伴随成交量显著放大" },
    { "name": "Earnings", "note": "业绩预告与实际值双超一致预期" },
    { "name": "Relative", "note": "相对强度排名位于全市场前 15%" },
    { "name": "Supply", "note": "流通盘适中、筹码集中，无大规模解禁" },
    { "name": "Exit", "note": "明确止损与止盈条件，规则先于情绪" }
  ]
};
