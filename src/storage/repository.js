const ROOT_KEY = 'cyber-divination:v1';
const SCHEMA_VERSION = 1;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, records: [], settings: {} };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateState(value) {
  if (!value || typeof value !== 'object') throw new TypeError('本地仓库格式无效');
  if (value.schemaVersion !== SCHEMA_VERSION) throw new RangeError('不支持的本地仓库版本');
  if (!Array.isArray(value.records)) throw new TypeError('本地记录格式无效');
  if (!value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
    throw new TypeError('本地设置格式无效');
  }
  for (const record of value.records) {
    if (!record?.id || !record?.createdAt) throw new TypeError('占问记录格式无效');
  }
  return value;
}

export function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return Object.freeze({
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    get length() {
      return values.size;
    }
  });
}

export function createRepository(storage, { now = () => new Date() } = {}) {
  let state;

  function persist() {
    storage.setItem(ROOT_KEY, JSON.stringify(state));
  }

  function load() {
    if (state) return state;
    const raw = storage.getItem(ROOT_KEY);
    if (raw === null) {
      state = emptyState();
      persist();
      return state;
    }

    try {
      state = validateState(JSON.parse(raw));
    } catch {
      storage.setItem(`cyber-divination:recovery:${now().toISOString()}`, raw);
      state = emptyState();
      persist();
    }
    return state;
  }

  return Object.freeze({
    async saveRecord(record) {
      const current = load();
      const stored = clone(record);
      if (!stored.id || !stored.createdAt) throw new TypeError('记录必须包含 id 和 createdAt');
      const existingIndex = current.records.findIndex((item) => item.id === stored.id);
      if (existingIndex >= 0) current.records[existingIndex] = stored;
      else current.records.push(stored);
      persist();
      return clone(stored);
    },
    async getRecord(id) {
      const record = load().records.find((item) => item.id === id);
      return record ? clone(record) : null;
    },
    async listRecords() {
      return clone(load().records).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async saveSettings(patch) {
      const current = load();
      current.settings = { ...current.settings, ...clone(patch) };
      persist();
      return clone(current.settings);
    },
    async getSettings() {
      return clone(load().settings);
    },
    async clearRecords() {
      load().records = [];
      persist();
    },
    async findRecentDuplicate(questionFingerprint, currentTime = now()) {
      const currentMs = currentTime.getTime();
      const match = load().records
        .filter((record) => record.questionFingerprint === questionFingerprint)
        .map((record) => ({ record, createdMs: Date.parse(record.createdAt) }))
        .filter(({ createdMs }) => Number.isFinite(createdMs) && currentMs >= createdMs && currentMs - createdMs < DUPLICATE_WINDOW_MS)
        .sort((left, right) => right.createdMs - left.createdMs)[0];
      return match ? clone(match.record) : null;
    }
  });
}
