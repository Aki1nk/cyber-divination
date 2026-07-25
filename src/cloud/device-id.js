const DEVICE_ID_KEY = 'cyber-divination:device-id:v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getOrCreateDeviceId(storage, cryptoApi = globalThis.crypto) {
  const stored = storage.getItem(DEVICE_ID_KEY);
  if (UUID_PATTERN.test(stored ?? '')) return stored;
  if (!cryptoApi?.randomUUID) throw new Error('当前环境无法生成匿名设备编号');
  const created = cryptoApi.randomUUID();
  if (!UUID_PATTERN.test(created)) throw new Error('匿名设备编号格式无效');
  storage.setItem(DEVICE_ID_KEY, created);
  return created;
}
