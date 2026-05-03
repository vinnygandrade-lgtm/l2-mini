/**
 * Passo 1 — validação estática pós-migração de modais:
 * - IDs duplicados em index.html
 * - Cada id usado em abrirModal existe no HTML estático (exceto opcionais dinâmicos)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const counts = {};
ids.forEach((id) => {
  counts[id] = (counts[id] || 0) + 1;
});
const dups = Object.entries(counts).filter(([, n]) => n > 1);
console.log(dups.length ? "DUPLICATE IDs:\n" + dups.map(([k, v]) => `  ${k} (${v}x)`).join("\n") : "OK: no duplicate IDs");

function walkJs(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walkJs(p, out);
    else if (name.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const jsFiles = walkJs(path.join(root, "js"));
let bundled = "";
for (const f of jsFiles) bundled += fs.readFileSync(f, "utf8") + "\n";

const abrir = new Set([...bundled.matchAll(/abrirModal\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));

const missing = [...abrir].filter(
  (id) => !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)
);

console.log(
  missing.length
    ? "MISSING DOM for abrirModal:\n  " + missing.join("\n  ")
    : "OK: all abrirModal ids present in index.html"
);

if (dups.length || missing.length) process.exit(1);
process.exit(0);
