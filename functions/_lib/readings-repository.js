function addDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    riskCategories: JSON.parse(row.risk_categories_json ?? '[]'),
    payload: JSON.parse(row.payload_json ?? '{}'),
    aiReading: row.ai_reading_json ? JSON.parse(row.ai_reading_json) : null
  };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function createReadingsRepository(db, { now = () => new Date(), idFactory = () => crypto.randomUUID() } = {}) {
  if (!db?.prepare) throw new TypeError('缺少 D1 数据库绑定');
  return Object.freeze({
    async findByIdempotency(userId, deviceId, idempotencyKey) {
      return parseRow(await db.prepare('SELECT * FROM readings WHERE user_id = ? AND device_id = ? AND idempotency_key = ? LIMIT 1').bind(userId, deviceId, idempotencyKey).first());
    },
    async create(payload, risk, userId) {
      const current = now();
      const createdAt = current.toISOString();
      const row = { id: idFactory(), createdAt, expiresAt: addDays(current, 30) };
      await db.prepare(`INSERT INTO readings (id, user_id, device_id, idempotency_key, created_at, updated_at, expires_at, category, question, background, risk_level, risk_categories_json, status, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
        .bind(row.id, userId, payload.deviceId, payload.idempotencyKey, createdAt, createdAt, row.expiresAt, payload.question.category, payload.question.text, payload.question.background, risk.level, JSON.stringify(risk.categories), JSON.stringify(payload)).run();
      return row;
    },
    async markProcessing(id) {
      await db.prepare("UPDATE readings SET status = 'processing', updated_at = ?, error_code = NULL WHERE id = ?").bind(now().toISOString(), id).run();
    },
    async complete(id, result) {
      await db.prepare("UPDATE readings SET status = 'completed', updated_at = ?, ai_reading_json = ?, provider_response_id = ?, provider_model = ?, error_code = NULL WHERE id = ?")
        .bind(now().toISOString(), JSON.stringify(result.reading), result.responseId ?? null, result.model ?? null, id).run();
    },
    async refuse(id, responseId) {
      await db.prepare("UPDATE readings SET status = 'refused', updated_at = ?, provider_response_id = ?, error_code = 'provider_refused' WHERE id = ?").bind(now().toISOString(), responseId ?? null, id).run();
    },
    async fail(id, errorCode) {
      await db.prepare("UPDATE readings SET status = 'failed', updated_at = ?, error_code = ? WHERE id = ?").bind(now().toISOString(), errorCode, id).run();
    },
    async addAttempt(id, outcome, { errorCode = null, responseId = null } = {}) {
      await db.prepare('INSERT INTO ai_attempts (reading_id, created_at, outcome, error_code, provider_response_id) VALUES (?, ?, ?, ?, ?)').bind(id, now().toISOString(), outcome, errorCode, responseId).run();
    },
    async get(id) {
      return parseRow(await db.prepare('SELECT * FROM readings WHERE id = ? LIMIT 1').bind(id).first());
    },
    async getAdmin(id) {
      return parseRow(await db.prepare(`
        SELECT readings.*, users.nickname AS user_nickname, users.phone AS user_phone
        FROM readings
        LEFT JOIN users ON users.id = readings.user_id
        WHERE readings.id = ?
        LIMIT 1
      `).bind(id).first());
    },
    async getForDevice(id, deviceId) {
      return parseRow(await db.prepare('SELECT * FROM readings WHERE id = ? AND device_id = ? LIMIT 1').bind(id, deviceId).first());
    },
    async getForUser(id, userId) {
      return parseRow(await db.prepare('SELECT * FROM readings WHERE id = ? AND user_id = ? LIMIT 1').bind(id, userId).first());
    },
    async list({ q = '', status = '', category = '', page = 1, pageSize = 25 } = {}) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
      const where = [];
      const values = [];
      if (q) {
        const search = `%${escapeLike(q)}%`;
        where.push("(readings.question LIKE ? ESCAPE '\\' OR readings.background LIKE ? ESCAPE '\\' OR readings.device_id LIKE ? ESCAPE '\\')");
        values.push(search, search, search);
      }
      if (status) { where.push('readings.status = ?'); values.push(status); }
      if (category) { where.push('readings.category = ?'); values.push(category); }
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const source = ' FROM readings LEFT JOIN users ON users.id = readings.user_id';
      const totalRow = await db.prepare(`SELECT COUNT(*) AS count${source}${clause}`).bind(...values).first();
      const rows = await db.prepare(`SELECT readings.id, readings.device_id, readings.created_at, readings.expires_at, readings.category, readings.question, readings.status, readings.risk_level, readings.error_code, users.nickname AS user_nickname, users.phone AS user_phone${source}${clause} ORDER BY readings.created_at DESC LIMIT ? OFFSET ?`).bind(...values, safeSize, (safePage - 1) * safeSize).all();
      return { items: rows.results ?? [], total: Number(totalRow?.count ?? 0), page: safePage, pageSize: safeSize };
    },
    async delete(id) {
      return db.prepare('DELETE FROM readings WHERE id = ?').bind(id).run();
    }
  });
}
