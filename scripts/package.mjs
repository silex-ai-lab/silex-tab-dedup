// Builds dist/silex-tab-dedup-<version>.zip containing only what the extension needs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const { version } = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
if (pkg.version !== version) throw new Error(`package.json ${pkg.version} != manifest.json ${version}`);

const out = `dist/silex-tab-dedup-${version}.zip`;
mkdirSync(new URL('../dist', import.meta.url), { recursive: true });
rmSync(new URL(`../${out}`, import.meta.url), { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, 'manifest.json', 'LICENSE', 'src', '_locales', 'icons'], { cwd: root, stdio: 'inherit' });
console.log(out);
