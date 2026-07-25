import { buildReadingUpload } from './reading-contract.js';
import { createUploadTask, nextRetryAt } from './upload-queue.js';

export function createSyncManager({ repository, client, deviceId, now = () => new Date(), onRecordUpdated = () => {} }) {
  let flushing = null;

  async function applyResponse(task, response) {
    const ai = { status: response.status, readingId: response.id ?? null, reading: response.aiReading ?? null, errorCode: response.errorCode ?? null, updatedAt: now().toISOString() };
    await repository.patchRecord(task.readingId, { ai });
    onRecordUpdated(task.readingId, ai);
    if (response.status === 'completed' || response.status === 'refused') await repository.removeUpload(task.id);
    else await repository.markUploadFailed(task.id, { cloudReadingId: response.id ?? task.cloudReadingId ?? null, attempts: task.attempts + 1, nextAttemptAt: nextRetryAt(now(), task.attempts + 1), errorCode: response.errorCode ?? 'cloud_failed' });
  }

  async function processTask(task) {
    try {
      const response = task.cloudReadingId
        ? await client.retry(task.cloudReadingId, deviceId)
        : await client.create(task.payload);
      await applyResponse(task, response);
    } catch (error) {
      const attempts = task.attempts + 1;
      await repository.markUploadFailed(task.id, { attempts, nextAttemptAt: nextRetryAt(now(), attempts), errorCode: error.message });
      const ai = { status: 'queued', readingId: null, reading: null, errorCode: error.message, updatedAt: now().toISOString() };
      await repository.patchRecord(task.readingId, { ai });
      onRecordUpdated(task.readingId, ai);
    }
  }

  return Object.freeze({
    async queue(record) {
      const task = createUploadTask({ readingId: record.id, payload: buildReadingUpload(record, deviceId), createdAt: now().toISOString() });
      await repository.enqueueUpload(task);
      await repository.patchRecord(record.id, { ai: { status: 'queued', readingId: null, reading: null, errorCode: null, updatedAt: now().toISOString() } });
      return task;
    },
    async flush() {
      if (flushing) return flushing;
      flushing = (async () => {
        for (const task of await repository.listDueUploads(now())) await processTask(task);
      })().finally(() => { flushing = null; });
      return flushing;
    },
    async retryRecord(record) {
      let current = record;
      if (!current.ai?.readingId) {
        await this.queue(current);
        await this.flush();
        current = await repository.getRecord(current.id);
        const needsUpgrade = current.ai?.readingId
          && current.ai.status === 'completed'
          && !current.ai.reading?.comprehensive_hexagram_reading;
        if (!needsUpgrade) return current.ai;
      }

      const force = current.ai.status === 'completed' && !current.ai.reading?.comprehensive_hexagram_reading;
      const response = await client.retry(current.ai.readingId, deviceId, { force });
      const ai = { status: response.status, readingId: response.id ?? current.ai.readingId, reading: response.aiReading ?? null, errorCode: response.errorCode ?? null, updatedAt: now().toISOString() };
      await repository.patchRecord(current.id, { ai });
      onRecordUpdated(current.id, ai);
      return ai;
    }
  });
}
