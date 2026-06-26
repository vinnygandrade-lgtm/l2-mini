/**
 * Player-facing display helpers for Polish 12 i18n (creation, classes, Olympiad ranks).
 */
import { polish12Slug } from './polish12_catalog_i18n';

const RACE_SLUG: Record<string, string> = {
  Human: 'human',
  'Dark Elf': 'dark_elf',
  Elf: 'elf',
  Orc: 'orc',
  Dwarf: 'dwarf',
};

function tOr(key: string, fallback: string): string {
  try {
    if (typeof window.t !== 'function') return fallback;
    const v = window.t(key);
    return v && v !== key ? v : fallback;
  } catch {
    return fallback;
  }
}

export function classEvolutionDisplayName(nome: string): string {
  return tOr(`game.classes.evolution.names.${polish12Slug(nome)}`, nome);
}

export function classEvolutionDisplayDesc(nome: string, fallbackDesc: string): string {
  return tOr(`game.classes.evolution.desc.${polish12Slug(nome)}`, fallbackDesc);
}

export function olympiadRankDisplay(rankId: string): string {
  return tOr(`olympiad.ranks.${polish12Slug(rankId)}`, rankId);
}

export function olympiadTierDisplay(tierName: string): string {
  return tOr(`olympiad.tierNames.${polish12Slug(tierName)}`, tierName);
}

export function creationRaceDisplayName(race: string): string {
  const slug = RACE_SLUG[race] || polish12Slug(race);
  return tOr(`creation.raceNames.${slug}`, race);
}

export function creationRaceDesc(race: string, fallback: string): string {
  const slug = RACE_SLUG[race] || polish12Slug(race);
  return tOr(`creation.raceDesc.${slug}`, fallback);
}

export {};
