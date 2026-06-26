#!/usr/bin/env node
/**
 * Syntax-check locales_bundle.ts (object-literal integrity) on Node 20+.
 * `node --check` on the raw .ts file fails in CI because of import/export/TS syntax.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(repoRoot, 'src/i18n/locales_bundle.ts');
const cacheDir = path.join(repoRoot, 'node_modules/.cache');
const tmpFile = path.join(cacheDir, 'locales-bundle-syntax-check.cjs');

const source = fs.readFileSync(bundlePath, 'utf8');

const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  reportDiagnostics: true,
  fileName: bundlePath,
});

const errors = (diagnostics ?? []).filter(
  (d) => d.category === ts.DiagnosticCategory.Error,
);
if (errors.length) {
  for (const d of errors) {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.error(`${bundlePath}: ${msg}`);
  }
  process.exit(1);
}

const stripped = outputText.replace(/^import\s+[\s\S]*?;\s*\r?\n/gm, '') +
  '\nfunction mergeSkillCatalogIntoLocales() {}\nfunction mergePolish12CatalogIntoLocales() {}\n';
if (!stripped.trim()) {
  console.error('check-locales-bundle: empty transpile output');
  process.exit(1);
}

fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(tmpFile, stripped);

const check = spawnSync(process.execPath, ['--check', tmpFile], { encoding: 'utf8' });
if (check.status !== 0) {
  process.stderr.write(check.stderr || check.stdout || 'node --check failed\n');
  process.exit(check.status ?? 1);
}

console.log('check:i18n OK — locales_bundle.ts');
