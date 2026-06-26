import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/game/classes.ts'), 'utf8');
const start = src.indexOf('const classEvolutions');
const end = src.indexOf('// === LÓGICA DE BUSCA');
const block = src.slice(start, end);
const re = /nome:\s*"([^"]+)",\s*reqLvl:\s*\d+,\s*desc:\s*"((?:\\.|[^"\\])*)"/g;
const map = new Map();
let m;
while ((m = re.exec(block))) {
  const nome = m[1];
  const desc = m[2].replace(/\\"/g, '"');
  if (!map.has(nome)) map.set(nome, desc);
}
console.log(JSON.stringify([...map.entries()].map(([name, desc]) => ({ name, desc })), null, 2));
