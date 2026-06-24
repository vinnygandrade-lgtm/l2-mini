/**
 * Player-facing combat strings — mob names, drop labels, locale refresh.
 */

const ITEM_DROP_KEYS: Record<string, string> = {
  'Ancient Coin': 'game.items.drop.ancientCoin',
  'Animal Skin': 'game.items.drop.animalSkin',
  'Animal Bone': 'game.items.drop.animalBone',
  'Coal': 'game.items.drop.coal',
  'Charcoal': 'game.items.drop.charcoal',
  'Iron Ore': 'game.items.drop.ironOre',
  'Recipe: Vesper Noble Heavy': 'game.combat.recipes.vesperNobleHeavy',
  'Recipe: Vesper Noble Light': 'game.combat.recipes.vesperNobleLight',
  'Recipe: Vesper Noble Robe': 'game.combat.recipes.vesperNobleRobe',
  'Recipe: Vesper Weapon': 'game.combat.recipes.vesperWeapon',
  'Recipe: Vesper Jewel': 'game.combat.recipes.vesperJewel',
};

export function mobDisplayName(idImg: string | undefined, fallback?: string): string {
  if (!idImg) return fallback || '???';
  const key = `game.mobs.${idImg}`;
  if (typeof window.t === 'function') {
    const text = window.t(key);
    if (text && text !== key) return text;
  }
  return fallback || idImg;
}

export function formatMobCardName(mob: {
  idImg?: string;
  nome?: string;
  isChampion?: boolean;
}): string {
  const stripped = mob.nome ? mob.nome.replace(/<[^>]+>/g, '').replace(/^\[[^\]]+\]\s*/, '').trim() : '';
  const plain = mobDisplayName(mob.idImg, stripped || undefined);
  if (mob.isChampion) {
    const champLabel =
      typeof window.t === 'function' ? window.t('game.combat.championTag') : 'CHAMPION';
    return `<span style="color:gold; text-shadow: 0 0 5px orange;">[${champLabel}]</span> ${plain}`;
  }
  return plain;
}

export function itemDropDisplayName(itemKey: string): string {
  if (!itemKey) return '';
  const i18nKey = ITEM_DROP_KEYS[itemKey];
  if (i18nKey && typeof window.t === 'function') {
    const text = window.t(i18nKey);
    if (text && text !== i18nKey) return text;
  }
  return itemKey;
}

export function refreshForestMobNames(): void {
  if (
    typeof window.renderizarMonstros === 'function' &&
    Array.isArray(window.monstrosAtivos) &&
    window.monstrosAtivos.length > 0
  ) {
    window.renderizarMonstros();
  }
}

window.mobDisplayName = mobDisplayName;
window.formatMobCardName = formatMobCardName;
window.itemDropDisplayName = itemDropDisplayName;
window.refreshForestMobNames = refreshForestMobNames;

export {};
