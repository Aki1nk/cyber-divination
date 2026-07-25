import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production Wrangler config selects Tokunex GPT-5.5 and the existing D1 database', async () => {
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  assert.equal(config.name, 'cyber-divination');
  assert.equal(config.pages_build_output_dir, './dist');
  assert.equal(config.vars.OPENAI_BASE_URL, 'https://tokunex.com/v1');
  assert.equal(config.vars.OPENAI_MODEL, 'gpt-5.5');
  assert.deepEqual(config.d1_databases, [{
    binding: 'DB',
    database_name: 'cyber-divination-readings',
    database_id: 'eca2150f-dfc3-4366-a53d-b8effc92f80a'
  }]);
});

test('production documentation uses plaintext admin secret without obsolete hash tooling', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const readme = await readFile('README.md', 'utf8');
  assert.equal('hash-admin-password' in packageJson.scripts, false);
  assert.match(readme, /ADMIN_PASSWORD/);
  assert.doesNotMatch(readme, /ADMIN_PASSWORD_HASH/);
  assert.doesNotMatch(readme, /hash-admin-password/);
  assert.match(readme, /gpt-5\.5/);
});
