import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export function execute(command, args, cwd) {
  // Static shell program forwards each argument separately, including on Windows.
  const result = spawnSync('bash', ['-c', 'exec "$@"', 'clidoc-action', command, ...args],
    { cwd, stdio: 'inherit', env: { ...process.env, HUSKY: '0', CI: 'true' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.signal})`);
}

export function installValidator(config, directory, run = execute) {
  if (config.version) {
    run('npm', ['install', '--prefix', directory, '--ignore-scripts', '--no-audit', '--no-fund',
      '--package-lock=false', `@clidoc/core@${config.version}`], directory);
    return pathToFileURL(join(directory, 'node_modules/@clidoc/core/dist/index.js')).href;
  }
  run('git', ['init', '--quiet', directory], directory);
  run('git', ['remote', 'add', 'origin', 'https://github.com/bhouston/clidoc.git'], directory);
  run('git', ['fetch', '--quiet', '--depth=1', 'origin', config.ref], directory);
  run('git', ['checkout', '--quiet', '--detach', config.ref], directory);
  run('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts', '--filter', 'clidoc',
    '--filter', '@clidoc/core'], directory);
  run('pnpm', ['--filter', '@clidoc/core', 'build'], directory);
  return pathToFileURL(join(directory, 'packages/core/dist/index.js')).href;
}
