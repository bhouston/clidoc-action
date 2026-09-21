import { mkdtemp, rm, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, validateFiles, escapeCommand } from './validate.mjs';
import { installValidator } from './install.mjs';

let directory;
try {
  const config = configuration(process.env);
  directory = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'clidoc-validator-'));
  const core = await import(installValidator(config, directory));
  const count = await validateFiles(config, core);
  const validator = config.version ? `npm:${config.version}` : `git:${config.ref}`;
  console.log(`Validated ${count} OpenCLI document(s) with ${validator}`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `validated-count=${count}\nvalidator=${validator}\n`);
} catch (error) {
  console.error(`::error::${escapeCommand(error.message)}`);
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}
