function passwordFields(password) {
  return [password.algorithm, password.iterations, password.salt, password.hash, password.version ?? 1];
}

export function createAccountRepository(db, { now = () => new Date() } = {}) {
  if (!db?.prepare) throw new TypeError('缺少 D1 数据库绑定');
  return Object.freeze({
    findByPhone(phone) { return db.prepare('SELECT * FROM users WHERE phone = ? LIMIT 1').bind(phone).first(); },
    async findSession(tokenHash, current = now().toISOString()) {
      return db.prepare(`SELECT users.* FROM user_sessions JOIN users ON users.id = user_sessions.user_id WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ? AND users.status = 'active' LIMIT 1`).bind(tokenHash, current).first();
    },
    async register({ user, password, session, inviteId }) {
      const usedAt = now().toISOString();
      const claimed = await db.prepare("UPDATE invite_codes SET status = 'used', used_at = ? WHERE id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)").bind(usedAt, inviteId, usedAt).run();
      if ((claimed.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('invalid_invite'), { code: 'invalid_invite' });
      try {
        await db.batch([
          db.prepare(`INSERT INTO users (id, phone, nickname, password_algorithm, password_iterations, password_salt, password_hash, password_version, status, must_change_password, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, '', ?, ?)`).bind(user.id, user.phone, user.nickname, ...passwordFields(password), user.createdAt, user.createdAt),
          db.prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(session.tokenHash, user.id, session.createdAt, session.createdAt, session.expiresAt),
          db.prepare('UPDATE invite_codes SET used_by_user_id = ? WHERE id = ?').bind(user.id, inviteId)
        ]);
      } catch (error) {
        await db.prepare("UPDATE invite_codes SET status = 'active', used_at = NULL, used_by_user_id = NULL WHERE id = ? AND status = 'used' AND (used_by_user_id IS NULL OR used_by_user_id = ?)").bind(inviteId, user.id).run();
        throw error;
      }
    },
    createSession(session) { return db.prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(session.tokenHash, session.userId, session.createdAt, session.createdAt, session.expiresAt).run(); },
    deleteSession(tokenHash) { return db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').bind(tokenHash).run(); },
    async updatePassword(userId, password, mustChange = false) {
      await db.prepare('UPDATE users SET password_algorithm = ?, password_iterations = ?, password_salt = ?, password_hash = ?, password_version = ?, must_change_password = ?, updated_at = ? WHERE id = ?').bind(...passwordFields(password), mustChange ? 1 : 0, now().toISOString(), userId).run();
    },
    async deleteAccount(userId) {
      const current = now().toISOString();
      await db.batch([
        db.prepare("UPDATE users SET status = 'deleted', phone = 'deleted:' || id, nickname = '', admin_note = '', deleted_at = ?, updated_at = ? WHERE id = ?").bind(current, current, userId),
        db.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId)
      ]);
    },
    async list({ q = '', status = '', page = 1, pageSize = 25 } = {}) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
      const where = [], values = [];
      if (q) { where.push('(phone LIKE ? OR nickname LIKE ? OR admin_note LIKE ?)'); values.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      if (status) { where.push('status = ?'); values.push(status); }
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const count = await db.prepare(`SELECT COUNT(*) AS count FROM users${clause}`).bind(...values).first();
      const rows = await db.prepare(`SELECT id, phone, nickname, status, must_change_password, admin_note, created_at, updated_at FROM users${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...values, safeSize, (safePage - 1) * safeSize).all();
      return { items: rows.results ?? [], total: Number(count?.count ?? 0), page: safePage, pageSize: safeSize };
    },
    get(id) { return db.prepare('SELECT id, phone, nickname, status, must_change_password, admin_note, created_at, updated_at FROM users WHERE id = ? LIMIT 1').bind(id).first(); },
    updateAdmin(id, fields) {
      return db.prepare('UPDATE users SET phone = ?, nickname = ?, status = ?, admin_note = ?, updated_at = ? WHERE id = ?').bind(fields.phone, fields.nickname, fields.status, fields.adminNote, now().toISOString(), id).run();
    }
  });
}

export function createInvitesRepository(db, { now = () => new Date(), idFactory = () => crypto.randomUUID() } = {}) {
  if (!db?.prepare) throw new TypeError('缺少 D1 数据库绑定');
  return Object.freeze({
    findUsable(lookupHash, current = now().toISOString()) { return db.prepare("SELECT * FROM invite_codes WHERE lookup_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?) LIMIT 1").bind(lookupHash, current).first(); },
    async create({ lookupHash, encryptedCode, expiresAt = null }) {
      const item = { id: idFactory(), createdAt: now().toISOString() };
      await db.prepare("INSERT INTO invite_codes (id, lookup_hash, encrypted_code, status, created_at, expires_at) VALUES (?, ?, ?, 'active', ?, ?)").bind(item.id, lookupHash, encryptedCode, item.createdAt, expiresAt).run();
      return item;
    },
    findByLookup(lookupHash) { return db.prepare('SELECT id, status FROM invite_codes WHERE lookup_hash = ? LIMIT 1').bind(lookupHash).first(); },
    async list() { return (await db.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC').all()).results ?? []; },
    revoke(id) { return db.prepare("UPDATE invite_codes SET status = 'revoked' WHERE id = ? AND status = 'active'").bind(id).run(); }
  });
}

export function createLoginAttemptsRepository(db, { now = () => new Date() } = {}) {
  if (!db?.prepare) throw new TypeError('缺少 D1 数据库绑定');
  return Object.freeze({
    async isBlocked({ phoneHash, ipHash, since, limit = 5 }) {
      const row = await db.prepare('SELECT COUNT(*) AS count FROM login_attempts WHERE succeeded = 0 AND created_at >= ? AND (phone_hash = ? OR ip_hash = ?)').bind(since, phoneHash, ipHash).first();
      return Number(row?.count ?? 0) >= limit;
    },
    record({ phoneHash, ipHash, succeeded }) {
      const createdAt = now().toISOString();
      if (succeeded) return db.batch([
        db.prepare('DELETE FROM login_attempts WHERE succeeded = 0 AND (phone_hash = ? OR ip_hash = ?)').bind(phoneHash, ipHash),
        db.prepare('INSERT INTO login_attempts (phone_hash, ip_hash, succeeded, created_at) VALUES (?, ?, 1, ?)').bind(phoneHash, ipHash, createdAt)
      ]);
      return db.prepare('INSERT INTO login_attempts (phone_hash, ip_hash, succeeded, created_at) VALUES (?, ?, 0, ?)').bind(phoneHash, ipHash, createdAt).run();
    }
  });
}
