import { spawn, execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const portArg = args.find((arg) => arg.startsWith('--port='));
const port = Number(portArg?.slice(7) || process.env.PORT || 3000);
const shouldOpen = !args.includes('--no-open');
let child;
let stopping = false;

function stop() {
  stopping = true;
  child?.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function run(command, commandArgs, options = {}) {
  if (stopping) throw new Error('Startup cancelled.');
  return new Promise((done, reject) => {
    child = spawn(command, commandArgs, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (code === 0 || stopping) done();
      else reject(new Error(`Command failed (${signal || code}). See the output above.`));
    });
  });
}

function openBrowser(url) {
  const [command, commandArgs] =
    process.platform === 'win32'
      ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  execFile(command, commandArgs, (error) => {
    if (error) console.log(`Open your browser at ${url}`);
  });
}

async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13))
    throw new Error(
      'Install Node.js 24 LTS from https://nodejs.org, then run this launcher again.',
    );
  if (args.some((arg) => arg !== '--no-open' && !arg.startsWith('--port=')))
    throw new Error('Supported options: --no-open and --port=3002.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Choose a port between 1024 and 65535 with --port=3002.');
  await import('node:sqlite');
  await new Promise((done, reject) => {
    const probe = createServer();
    probe.once('error', () =>
      reject(
        new Error(
          `Port ${port} is already in use. Stop the other app, or run: npm run local -- --port=${port === 3002 ? 3003 : 3002}`,
        ),
      ),
    );
    probe.listen(port, '127.0.0.1', () => probe.close(done));
  });
  console.log('\nBrainADZ Hospitality OS · Local workspace\n');
  let dependenciesReady = existsSync(resolve(root, 'node_modules/.package-lock.json'));
  for (const dependency of ['express', 'react', 'vite']) {
    try {
      require.resolve(dependency);
    } catch {
      dependenciesReady = false;
    }
  }
  if (!dependenciesReady) {
    console.log('Installing dependencies. Internet access is needed the first time.\n');
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli))
      throw new Error(
        'Start this launcher with npm run local so the bundled npm installer is available.',
      );
    await run(process.execPath, [npmCli, 'ci', '--include=dev', '--no-audit', '--no-fund']);
  }
  console.log('\nPreparing the app…\n');
  await run(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build']);
  if (stopping) return;
  const url = `http://localhost:${port}`;
  const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1', SECURE_COOKIES: 'false' };
  let ready = false;
  const readyTimer = setInterval(async () => {
    if (ready || stopping) return;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/config`, {
        signal: AbortSignal.timeout(1000),
      });
      if (!response.ok) return;
      ready = true;
      clearInterval(readyTimer);
      console.log(
        `\nYour app is ready: ${url}\nUse Group owner, General manager or Front desk to explore Hospitality OS. HR remains available at /hr.\nKeep this window open. Press Ctrl+C to stop.\n`,
      );
      if (shouldOpen) openBrowser(url);
    } catch {
      /* Wait for the application to finish starting. */
    }
  }, 400);
  try {
    await run(process.execPath, ['server/index.js', '--production'], { env });
  } finally {
    clearInterval(readyTimer);
  }
}
main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exitCode = 1;
});
