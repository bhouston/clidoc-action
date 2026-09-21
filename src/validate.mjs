import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function configuration(env) {
  const files = (env.INPUT_FILES ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!files.length) throw new Error('files must contain at least one document path');
  const specification = env.INPUT_SPECIFICATION || 'auto';
  const format = env.INPUT_FORMAT || 'auto';
  if (!['auto', 'bcdxn', 'opencli-dev'].includes(specification))
    throw new Error('specification must be auto, bcdxn, or opencli-dev');
  if (!['auto', 'json', 'yaml'].includes(format))
    throw new Error('format must be auto, json, or yaml');
  const version = env.INPUT_VALIDATOR_VERSION || '';
  const ref = env.INPUT_VALIDATOR_REF || '';
  if (version && !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version))
    throw new Error('validator-version must be an exact npm version, not a range, tag, URL or path');
  if (!version && !/^[a-f0-9]{40}$/.test(ref))
    throw new Error('validator-ref must be a full 40-character Git commit SHA');
  return { files, specification, format, version, ref,
    directory: resolve(env.GITHUB_WORKSPACE || process.cwd(), env.INPUT_WORKING_DIRECTORY || '.') };
}

export async function validateFiles(config, core) {
  if (typeof core.parseDocument !== 'function' || typeof core.detectDialect !== 'function')
    throw new Error('This validator does not expose parseDocument and detectDialect; select a compatible clidoc revision/version');
  const failures = [];
  for (const file of config.files) {
    try {
      const document = core.parseDocument(await readFile(resolve(config.directory, file), 'utf8'),
        config.format === 'auto' ? {} : { format: config.format });
      const dialect = core.detectDialect(document);
      if (config.specification !== 'auto' && dialect !== config.specification)
        throw new Error(`Expected ${config.specification}, detected ${dialect}`);
    } catch (error) {
      failures.push(`${file}: ${error.message}`);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  return config.files.length;
}

export function escapeCommand(message) {
  return String(message).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}
