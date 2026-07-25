import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountRepository } from '../../functions/_lib/account-repository.js';

function foreignKeyDatabase() {
  const users = new Set();
  const statements = [];

  return {
    statements,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              statements.push(sql);
              if (sql.startsWith('INSERT INTO users')) users.add(values[0]);
              if (sql.includes("UPDATE invite_codes SET status = 'used'") && sql.includes('used_by_user_id')) {
                if (!users.has(values[1])) throw new Error('FOREIGN KEY constraint failed');
              }
              if (sql.startsWith('UPDATE invite_codes SET used_by_user_id')) {
                if (!users.has(values[0])) throw new Error('FOREIGN KEY constraint failed');
              }
              return { meta: { changes: 1 } };
            }
          };
        }
      };
    },
    async batch(items) {
      for (const item of items) await item.run();
      return items.map(() => ({ success: true }));
    }
  };
}

test('register creates the user before linking it to the consumed invite', async () => {
  const db = foreignKeyDatabase();
  const accounts = createAccountRepository(db, { now: () => new Date('2026-07-25T00:00:00Z') });

  await accounts.register({
    user: { id: 'user-1', phone: '13800138000', nickname: '', createdAt: '2026-07-25T00:00:00.000Z' },
    password: { algorithm: 'pbkdf2-sha256', iterations: 1, salt: 'salt', hash: 'hash', version: 1 },
    session: { tokenHash: 'token-hash', createdAt: '2026-07-25T00:00:00.000Z', expiresAt: '2026-08-24T00:00:00.000Z' },
    inviteId: 'invite-1'
  });

  const userInsert = db.statements.findIndex((sql) => sql.startsWith('INSERT INTO users'));
  const inviteLink = db.statements.findIndex((sql) => sql.startsWith('UPDATE invite_codes SET used_by_user_id'));
  assert.ok(userInsert >= 0);
  assert.ok(inviteLink > userInsert);
});
