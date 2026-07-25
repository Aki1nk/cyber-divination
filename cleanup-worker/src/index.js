async function cleanup(db) {
  const expiredReadings = await db.prepare("DELETE FROM readings WHERE datetime(expires_at) <= datetime('now')").run();
  const expiredAttempts = await db.prepare("DELETE FROM ai_attempts WHERE created_at <= datetime('now', '-30 days')").run();
  console.log(JSON.stringify({ event: 'cloud_readings_cleanup', readingsDeleted: expiredReadings.meta?.changes ?? 0, attemptsDeleted: expiredAttempts.meta?.changes ?? 0 }));
}

export default {
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanup(env.DB));
  }
};
