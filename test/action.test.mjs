import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, validateFiles, escapeCommand } from '../src/validate.mjs';
import { installValidator, execute } from '../src/install.mjs';

const env = { INPUT_FILES: 'a.json', INPUT_VALIDATOR_REF: 'a'.repeat(40) };
test('validates inputs before installation and treats file paths as data', () => {
  assert.deepEqual(configuration({ ...env, INPUT_FILES: ' a b.json\r\n$(touch nope).yaml\n' }).files,
    ['a b.json', '$(touch nope).yaml']);
  for (const override of [{ INPUT_FILES: '' }, { INPUT_SPECIFICATION: 'other' },
    { INPUT_FORMAT: 'toml' }, { INPUT_VALIDATOR_REF: 'main' },
    ...['latest', '^1.0.0', 'file:foo', '1.0.0; echo bad', 'https://example.com'].map(INPUT_VALIDATOR_VERSION => ({ INPUT_VALIDATOR_VERSION }))])
    assert.throws(() => configuration({ ...env, ...override }));
  assert.throws(() => configuration({}));
  assert.equal(configuration({ ...env, INPUT_VALIDATOR_VERSION: '1.2.3-beta.1', INPUT_VALIDATOR_REF: 'ignored' }).version, '1.2.3-beta.1');
});
test('install plans pin source, ignore scripts and isolate packages', () => {
  const calls = [];
  const run = (...args) => calls.push(args);
  assert.match(installValidator(configuration(env), '/tmp/validator', run), /packages\/core\/dist\/index.js$/);
  assert.deepEqual(calls[2][1], ['fetch', '--quiet', '--depth=1', 'origin', 'a'.repeat(40)]);
  assert.ok(calls[4][1].includes('--frozen-lockfile'));
  assert.ok(calls[4][1].includes('--ignore-scripts'));
  calls.length = 0;
  assert.match(installValidator(configuration({ ...env, INPUT_VALIDATOR_VERSION: '1.2.3' }), '/tmp/validator', run), /node_modules\/@clidoc\/core\/dist\/index.js$/);
  assert.equal(calls.length, 1);
  assert.ok(calls[0][1].includes('@clidoc/core@1.2.3'));
  assert.ok(calls[0][1].includes('--ignore-scripts'));
});
test('validates every file, enforces dialect and format, fails on missing files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-test-'));
  try {
    await writeFile(join(directory, 'a.json'), '{}');
    const options = [];
    const core = { parseDocument: (s, o) => { options.push(o); return JSON.parse(s); }, detectDialect: () => 'bcdxn' };
    const config = { ...configuration(env), directory };
    assert.equal(await validateFiles(config, core), 1);
    assert.deepEqual(options.pop(), {});
    await validateFiles({ ...config, format: 'json' }, core);
    assert.deepEqual(options.pop(), { format: 'json' });
    await assert.rejects(validateFiles({ ...config, specification: 'opencli-dev' }, core), /Expected opencli-dev/);
    await assert.rejects(validateFiles({ ...config, files: ['missing1', 'missing2'] }, core), /missing1:[\s\S]*missing2:/);
    await assert.rejects(validateFiles(config, {}), /compatible clidoc/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('escapes GitHub annotation data including forged commands', () => {
  assert.equal(escapeCommand('bad%\r\n::warning::injected'), 'bad%25%0D%0A::warning::injected');
});
test('process wrapper forwards arguments literally and propagates exit status', () => {
  execute('node', ['-e', 'if(process.argv[1] !== "$(echo injected); spaces") process.exit(1)', '$(echo injected); spaces'], process.cwd());
  assert.throws(() => execute('node', ['-e', 'process.exit(3)'], process.cwd()), /failed \(3\)/);
  assert.throws(() => execute('node', [], '/does-not-exist-clidoc'));
});
