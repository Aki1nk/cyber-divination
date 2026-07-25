function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export function buildReadingUpload(record, deviceId) {
  if (!record?.id || !deviceId) throw new TypeError('云端解读缺少记录或设备编号');
  return Object.freeze({
    idempotencyKey: record.id,
    deviceId,
    createdAt: record.createdAt,
    question: {
      text: record.question,
      background: record.background ?? '',
      category: record.category ?? 'general'
    },
    casting: {
      method: record.method,
      algorithm: clone(record.algorithm),
      rawInputs: clone(record.rawInputs ?? {}),
      timeBasis: clone(record.timeBasis),
      hexagram: clone(record.hexagram),
      fiveElements: clone(record.fiveElements),
      classics: clone(record.classics),
      calculationLog: clone(record.calculationLog ?? [])
    },
    localReading: {
      profileId: record.interpretation?.profileId ?? 'local-deterministic-v1',
      questionContext: clone(record.interpretation?.questionContext ?? {}),
      sections: clone(record.interpretation?.sections ?? [])
    },
    clientRisk: clone(record.risk ?? { level: 'normal', categories: [] })
  });
}
