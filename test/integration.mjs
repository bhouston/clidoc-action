// Real engine contract tests; run once per OS after the action smoke test.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configuration, validateFiles } from '../src/validate.mjs';
import { installValidator } from '../src/install.mjs';
const directory = await mkdtemp(join(tmpdir(), 'clidoc-integration-'));
try {
  const config = configuration({ INPUT_FILES: 'fixtures/bcdxn.json', INPUT_VALIDATOR_REF: '04bde9553899737ac46e363da889f2fa729a4445' });
  const core = await import(installValidator(config, directory));
  assert.equal(await validateFiles({ ...config, format: 'json', specification: 'bcdxn' }, core), 1);
  assert.equal(await validateFiles({ ...config, files: ['fixtures/opencli-dev.yaml'], format: 'yaml', specification: 'opencli-dev' }, core), 1);
  for (const files of [['fixtures/invalid.json'], ['fixtures/invalid.yaml'], ['fixtures/missing.json']])
    await assert.rejects(validateFiles({ ...config, files }, core));
  await assert.rejects(validateFiles({ ...config, specification: 'opencli-dev' }, core), /Expected opencli-dev/);
  await assert.rejects(validateFiles({ ...config, files: ['fixtures/opencli-dev.yaml'], format: 'json' }, core), /Invalid OpenCLI JSON/);
  const bad = join(directory, 'unsupported.json');
  await writeFile(bad, '{"opencliVersion":"9.0.0"}');
  await assert.rejects(validateFiles({ ...config, files: [bad] }, core), /Unsupported/);
  const spaced = join(directory, 'file with spaces.json');
  await writeFile(spaced, '{"opencliVersion":"1.0.0-alpha.14","info":{"title":"Example","binary":"example","version":"1.0.0"},"commands":{}}');
  assert.equal(await validateFiles({ ...config, files: [resolve(spaced)] }, core), 1);
  console.log('Real validator integration checks passed');
} finally { await rm(directory, { recursive: true, force: true }); }
