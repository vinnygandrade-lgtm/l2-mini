/**
 * Generates src/i18n/polish12_catalog_i18n.ts from class evolutions + polish12_pt_catalog.json
 *
 * Run: npm run generate:polish12-i18n
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const classesPath = path.join(root, 'src/game/classes.ts');
const ptPath = path.join(root, 'scripts/polish12_pt_catalog.json');
const outPath = path.join(root, 'src/i18n/polish12_catalog_i18n.ts');

const ALL_RANKS = [
  'Paper 5', 'Paper 4', 'Paper 3', 'Paper 2', 'Paper 1',
  'Wood 5', 'Wood 4', 'Wood 3', 'Wood 2', 'Wood 1',
  'Copper 5', 'Copper 4', 'Copper 3', 'Copper 2', 'Copper 1',
  'Silver 5', 'Silver 4', 'Silver 3', 'Silver 2', 'Silver 1',
  'Gold 5', 'Gold 4', 'Gold 3', 'Gold 2', 'Gold 1',
  'Platinum 5', 'Platinum 4', 'Platinum 3', 'Platinum 2', 'Platinum 1',
  'Diamond 5', 'Diamond 4', 'Diamond 3', 'Diamond 2', 'Diamond 1',
  'Legendary 5', 'Legendary 4', 'Legendary 3', 'Legendary 2', 'Legendary 1',
  'Mythic',
];

const EN_TIERS = ['Paper', 'Wood', 'Copper', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legendary', 'Mythic'];

const RACE_EN = {
  human: { name: 'Human', desc: 'Balanced stats and great versatility. Capable of following any path.' },
  dark_elf: { name: 'Dark Elf', desc: 'High offense and speed, but lower health. Masters of dark arts and critical hits.' },
  elf: { name: 'Elf', desc: 'Extremely fast and agile. Experts in archery and supportive white magic.' },
  orc: { name: 'Orc', desc: 'Incredible strength and highest vitality. They crush enemies with raw power.' },
  dwarf: { name: 'Dwarf', desc: 'Masters of crafting and resource gathering. Extremely sturdy and rich.' },
};

const RACE_PT_NAMES = {
  human: 'Humano',
  dark_elf: 'Elfo Sombrio',
  elf: 'Elfo',
  orc: 'Orc',
  dwarf: 'Anão',
};

function slug(label) {
  return label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

function extractClassEvolutions(src) {
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
  return map;
}

function writeRecord(lines, indent, obj) {
  for (const [k, v] of Object.entries(obj)) {
    lines.push(`${indent}${k}: '${escapeStr(String(v))}',`);
  }
}

function main() {
  if (!fs.existsSync(ptPath)) {
    console.error('Missing scripts/polish12_pt_catalog.json');
    process.exit(1);
  }
  const ptCatalog = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
  const src = fs.readFileSync(classesPath, 'utf8');
  const evolutions = extractClassEvolutions(src);
  const sorted = [...evolutions.entries()].sort((a, b) => slug(a[0]).localeCompare(slug(b[0])));

  const missingPt = sorted.filter(([name]) => !ptCatalog.classes?.[slug(name)]);
  if (missingPt.length) {
    console.error('Missing PT class entries:', missingPt.map(([n]) => slug(n)).join(', '));
    process.exit(1);
  }

  const enClassNames = {};
  const enClassDesc = {};
  const ptClassNames = {};
  const ptClassDesc = {};
  for (const [name, desc] of sorted) {
    const s = slug(name);
    enClassNames[s] = name;
    enClassDesc[s] = desc;
    ptClassNames[s] = ptCatalog.classes[s].name;
    ptClassDesc[s] = ptCatalog.classes[s].desc;
  }

  const enRanks = { unranked: 'Unranked' };
  const ptRanks = { unranked: ptCatalog.olympiadRanks?.unranked || 'Sem rank' };
  for (const r of ALL_RANKS) {
    const s = slug(r);
    enRanks[s] = r;
    ptRanks[s] = ptCatalog.olympiadRanks?.[s] || (s === 'mythic' ? 'Mítico' : ptCatalog.olympiadRanks?.[`${s}`]);
    if (!ptRanks[s]) {
      console.error(`Missing PT rank: ${s} (${r})`);
      process.exit(1);
    }
  }

  const enTierNames = {};
  const ptTierNames = {};
  for (const t of EN_TIERS) {
    const s = slug(t);
    enTierNames[s] = t;
    ptTierNames[s] = ptCatalog.olympiadTiers?.[s];
    if (!ptTierNames[s]) {
      console.error(`Missing PT tier: ${s}`);
      process.exit(1);
    }
  }

  const enRaceNames = {};
  const enRaceDesc = {};
  const ptRaceNames = {};
  const ptRaceDesc = {};
  for (const [s, en] of Object.entries(RACE_EN)) {
    enRaceNames[s] = en.name;
    enRaceDesc[s] = en.desc;
    ptRaceNames[s] = RACE_PT_NAMES[s] || en.name;
    ptRaceDesc[s] = ptCatalog.races?.[s]?.desc;
    if (!ptRaceDesc[s]) {
      console.error(`Missing PT race desc: ${s}`);
      process.exit(1);
    }
  }

  const lines = [];
  lines.push('/**');
  lines.push(' * Auto-generated polish12 i18n — do not edit by hand.');
  lines.push(' * Regenerate: npm run generate:polish12-i18n');
  lines.push(' */');
  lines.push('');
  lines.push('export function polish12Slug(label: string): string {');
  lines.push("  return label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();");
  lines.push('}');
  lines.push('');
  lines.push('type Polish12Pack = {');
  lines.push('  classNames: Record<string, string>;');
  lines.push('  classDesc: Record<string, string>;');
  lines.push('  raceNames: Record<string, string>;');
  lines.push('  raceDesc: Record<string, string>;');
  lines.push('  ranks: Record<string, string>;');
  lines.push('  tierNames: Record<string, string>;');
  lines.push('};');
  lines.push('');
  lines.push('export const POLISH12_CATALOG_I18N: Record<string, Polish12Pack> = {');
  lines.push("  en: {");
  lines.push('    classNames: {');
  writeRecord(lines, '      ', enClassNames);
  lines.push('    },');
  lines.push('    classDesc: {');
  writeRecord(lines, '      ', enClassDesc);
  lines.push('    },');
  lines.push('    raceNames: {');
  writeRecord(lines, '      ', enRaceNames);
  lines.push('    },');
  lines.push('    raceDesc: {');
  writeRecord(lines, '      ', enRaceDesc);
  lines.push('    },');
  lines.push('    ranks: {');
  writeRecord(lines, '      ', enRanks);
  lines.push('    },');
  lines.push('    tierNames: {');
  writeRecord(lines, '      ', enTierNames);
  lines.push('    },');
  lines.push('  },');
  lines.push("  'pt-BR': {");
  lines.push('    classNames: {');
  writeRecord(lines, '      ', ptClassNames);
  lines.push('    },');
  lines.push('    classDesc: {');
  writeRecord(lines, '      ', ptClassDesc);
  lines.push('    },');
  lines.push('    raceNames: {');
  writeRecord(lines, '      ', ptRaceNames);
  lines.push('    },');
  lines.push('    raceDesc: {');
  writeRecord(lines, '      ', ptRaceDesc);
  lines.push('    },');
  lines.push('    ranks: {');
  writeRecord(lines, '      ', ptRanks);
  lines.push('    },');
  lines.push('    tierNames: {');
  writeRecord(lines, '      ', ptTierNames);
  lines.push('    },');
  lines.push('  },');
  lines.push('};');
  lines.push('');
  lines.push('export function mergePolish12CatalogIntoLocales(locales: Record<string, Record<string, unknown>>): void {');
  lines.push('  for (const locale of Object.keys(POLISH12_CATALOG_I18N)) {');
  lines.push('    const pack = POLISH12_CATALOG_I18N[locale];');
  lines.push('    if (!pack || !locales[locale]) continue;');
  lines.push('    const game = locales[locale].game as Record<string, unknown> | undefined;');
  lines.push('    if (game) {');
  lines.push('      const classes = (game.classes as Record<string, unknown>) || (game.classes = {});');
  lines.push('      const evolution = (classes.evolution as Record<string, unknown>) || (classes.evolution = {});');
  lines.push('      Object.assign(evolution, {');
  lines.push('        names: { ...(evolution.names as object), ...pack.classNames },');
  lines.push('        desc: { ...(evolution.desc as object), ...pack.classDesc },');
  lines.push('      });');
  lines.push('    }');
  lines.push('    const creation = (locales[locale].creation as Record<string, unknown>) || (locales[locale].creation = {});');
  lines.push('    Object.assign(creation, {');
  lines.push('      raceNames: { ...(creation.raceNames as object), ...pack.raceNames },');
  lines.push('      raceDesc: { ...(creation.raceDesc as object), ...pack.raceDesc },');
  lines.push('    });');
  lines.push('    const olympiad = (locales[locale].olympiad as Record<string, unknown>) || (locales[locale].olympiad = {});');
  lines.push('    Object.assign(olympiad, {');
  lines.push('      ranks: { ...(olympiad.ranks as object), ...pack.ranks },');
  lines.push('      tierNames: { ...(olympiad.tierNames as object), ...pack.tierNames },');
  lines.push('    });');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('export {};');

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote polish12 catalog: ${sorted.length} classes, ${Object.keys(enRanks).length} ranks, ${Object.keys(enTierNames).length} tiers`);
}

main();
