// Builds the web app and the API bundle, then packs everything needed to run in Docker into release/bank-tracking-<version>.zip.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const name = `bank-tracking-${version}`;
const releaseDir = path.join(root, 'release');
const outDir = path.join(releaseDir, name);
const zipPath = path.join(releaseDir, `${name}.zip`);

const run = (command) => execSync(command, { cwd: root, stdio: 'inherit' });

run('npm run check');
run('npm run build');

rmSync(outDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(outDir, { recursive: true });

cpSync(path.join(root, 'apps/api/dist/server.cjs'), path.join(outDir, 'server.cjs'));
cpSync(path.join(root, 'apps/api/dist/server.cjs.map'), path.join(outDir, 'server.cjs.map'));
cpSync(path.join(root, 'apps/web/dist'), path.join(outDir, 'public'), { recursive: true });
for (const file of ['Dockerfile', 'docker-compose.yml', '.env.example', 'README.md']) {
  cpSync(path.join(root, 'deploy', file), path.join(outDir, file));
}
writeFileSync(path.join(outDir, 'VERSION'), `${version}\n`);

if (!existsSync(path.join(outDir, 'public/index.html'))) {
  throw new Error('Web build missing: public/index.html not found');
}

// The zip extracts into the current folder (no top-level directory) so it can be unzipped over a previous version.
execSync(`zip -qr "${zipPath}" .`, { cwd: outDir, stdio: 'inherit' });
console.log(`\nRelease ready: ${path.relative(root, zipPath)}`);
