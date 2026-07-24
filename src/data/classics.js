function assertHexagramId(id) {
  if (!/^[01]{6}$/.test(id)) {
    throw new TypeError(`无效六爻 ID：${id}`);
  }
}

function normalizeRecord(record) {
  assertHexagramId(record.id);
  if (!record.name || !record.gua_ci || !Array.isArray(record.yao_ci)) {
    throw new TypeError(`经典数据不完整：${record.id}`);
  }
  if (record.yao_ci.length < 6) {
    throw new RangeError(`爻辞不足六条：${record.id}`);
  }

  return Object.freeze({
    id: record.id,
    name: record.name,
    symbol: record.symbol ?? '',
    judgment: record.gua_ci,
    tuan: record.tuan_ci ?? '',
    image: record.da_xiang ?? '',
    lineTexts: Object.freeze(record.yao_ci.slice(0, 6)),
    lineImages: Object.freeze((record.xiao_xiang ?? []).slice(0, 6)),
    specialLines: Object.freeze(record.yao_ci.slice(6).map((text, index) => ({
      text,
      image: record.xiao_xiang?.[index + 6] ?? ''
    })))
  });
}

export function createClassicsIndex(records) {
  if (!Array.isArray(records) || records.length !== 64) {
    throw new RangeError('经典数据必须包含 64 卦');
  }

  const index = new Map();
  for (const record of records) {
    const normalized = normalizeRecord(record);
    if (index.has(normalized.id)) {
      throw new Error(`六爻 ID 重复：${normalized.id}`);
    }
    index.set(normalized.id, normalized);
  }
  return index;
}

export function getHexagramClassic(index, id) {
  assertHexagramId(id);
  const classic = index.get(id);
  if (!classic) throw new RangeError(`未找到六爻 ID：${id}`);
  return classic;
}
