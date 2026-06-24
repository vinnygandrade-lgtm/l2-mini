/**
 * Player-facing combat strings — mob names, drop labels, locale refresh.
 */

const ITEM_DROP_KEYS: Record<string, string> = {
  Adena: 'game.items.drop.adena',
  'Ancient Coin': 'game.items.drop.ancientCoin',
  'Animal Skin': 'game.items.drop.animalSkin',
  'Animal Bone': 'game.items.drop.animalBone',
  Coal: 'game.items.drop.coal',
  Charcoal: 'game.items.drop.charcoal',
  'Iron Ore': 'game.items.drop.ironOre',
  'Recipe: Vesper Noble Heavy': 'game.combat.recipes.vesperNobleHeavy',
  'Recipe: Vesper Noble Light': 'game.combat.recipes.vesperNobleLight',
  'Recipe: Vesper Noble Robe': 'game.combat.recipes.vesperNobleRobe',
  'Recipe: Vesper Weapon': 'game.combat.recipes.vesperWeapon',
  'Recipe: Vesper Jewel': 'game.combat.recipes.vesperJewel',
};

const CONSUMABLE_KEYS: Record<string, string> = {
  'Soulshot (NG)': 'game.items.consumables.soulshotNg',
  'B. Spiritshot (NG)': 'game.items.consumables.blessedSpiritshotNg',
  'HP Potion': 'game.items.consumables.hpPotion',
  'Mana Potion': 'game.items.consumables.manaPotion',
  'MP Potion': 'game.items.consumables.manaPotion',
};

const CONSUMABLE_DESC_KEYS: Record<string, string> = {
  'HP Potion': 'game.smartbar.itemDesc.hpPotion',
  'Mana Potion': 'game.smartbar.itemDesc.manaPotion',
  'MP Potion': 'game.smartbar.itemDesc.manaPotion',
  'Soulshot (NG)': 'game.smartbar.itemDesc.soulshot',
  'B. Spiritshot (NG)': 'game.smartbar.itemDesc.spiritshot',
};

const BOSS_I18N_IDS: Record<string, string> = {
  boss_antharas: 'antharas',
};

const PET_SKILL_SLUG: Record<string, string> = {
  'Summon Zombie': 'zombie',
  'Summon Kai the Cat': 'kaiTheCat',
  'Summon Feline King': 'felineKing',
  'Summon Silhouette': 'silhouette',
  'Summon Spectral Lord': 'spectralLord',
  'Summon Storm Cubic': 'stormCubic',
  'Summon Mirage the Unicorn': 'mirageUnicorn',
  'Summon Aqua Cubic': 'aquaCubic',
  'Summon Magnus the Unicorn': 'magnus',
  'Summon Mechanic Golem': 'mechanicGolem',
  'Summon Big Boom': 'bigBoom',
  'Summon Siege Golem': 'siegeGolem',
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
  const i18nKey = ITEM_DROP_KEYS[itemKey] || CONSUMABLE_KEYS[itemKey];
  if (i18nKey && typeof window.t === 'function') {
    const text = window.t(i18nKey);
    if (text && text !== i18nKey) return text;
  }
  return itemKey;
}

export function consumableDisplayName(itemKey: string): string {
  return itemDropDisplayName(itemKey);
}

export function consumableDescText(itemKey: string): string {
  if (!itemKey) return '';
  const i18nKey = CONSUMABLE_DESC_KEYS[itemKey];
  if (i18nKey && typeof window.t === 'function') {
    const text = window.t(i18nKey);
    if (text && text !== i18nKey) return text;
  }
  return '';
}

function dailyBossI18nKey(bossId: string, field: string): string {
  return `game.bosses.daily.${bossId}.${field}`;
}

function translateIfPresent(key: string, params?: Record<string, string | number>): string {
  if (typeof window.t !== 'function') return '';
  const text = window.t(key, params || {});
  return text && text !== key ? text : '';
}

export function dailyBossRegionDisplay(bossId: string | undefined, fallback?: string): string {
  if (!bossId) return fallback || '';
  if (bossId.startsWith('daily_boss_')) {
    const text = translateIfPresent(dailyBossI18nKey(bossId, 'region'));
    if (text) return text;
  }
  return fallback || '';
}

export function hotbarDisplayName(slotKey: string): string {
  if (!slotKey) return '';
  if (slotKey === 'Attack') {
    const attackKey = 'game.skills.names.attack';
    const attackLabel = translateIfPresent(attackKey);
    if (attackLabel) return attackLabel;
    return 'Attack';
  }
  const consumable = consumableDisplayName(slotKey);
  if (consumable !== slotKey) return consumable;
  const slug = slotKey.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  const skillLabel = translateIfPresent(`game.skills.names.${slug}`);
  if (skillLabel) return skillLabel;
  return slotKey;
}

export function bossDisplayName(bossId: string | undefined, fallback?: string): string {
  if (!bossId) return fallback || '';
  if (bossId.startsWith('daily_boss_')) {
    const text = translateIfPresent(dailyBossI18nKey(bossId, 'name'));
    if (text) return text;
  }
  const slug = BOSS_I18N_IDS[bossId];
  if (slug) {
    const text = translateIfPresent(`game.bosses.${slug}.name`);
    if (text) return text;
  }
  return fallback || bossId;
}

export function bossShortName(bossId: string | undefined, fallback?: string): string {
  if (!bossId) return fallback || '';
  if (bossId.startsWith('daily_boss_')) {
    const text = translateIfPresent(dailyBossI18nKey(bossId, 'shortName'));
    if (text) return text;
  }
  const slug = BOSS_I18N_IDS[bossId];
  if (slug) {
    const text = translateIfPresent(`game.bosses.${slug}.shortName`);
    if (text) return text;
  }
  return fallback || bossId;
}

export function raidBossLogMsg(
  bossId: string | undefined,
  logKey: string,
  params?: Record<string, string | number>,
): string {
  if (!bossId) return '';
  if (bossId.startsWith('daily_boss_')) {
    const text = translateIfPresent(dailyBossI18nKey(bossId, `log.${logKey}`), params);
    if (text) return text;
  }
  const slug = BOSS_I18N_IDS[bossId];
  if (!slug) return '';
  return translateIfPresent(`game.bosses.${slug}.log.${logKey}`, params);
}

export function raidDropDisplayName(dropId: string, catalogNome?: string): string {
  if (dropId === 'Adena' || dropId === 'Ancient Coin') {
    return itemDropDisplayName(dropId);
  }
  return catalogNome || dropId;
}

export function petDisplayName(nomeSkill: string, legacyFallback: string): string {
  const slug = PET_SKILL_SLUG[nomeSkill] || 'panther';
  const key = `game.skills.pets.${slug}`;
  if (typeof window.t === 'function') {
    const text = window.t(key);
    if (text && text !== key) return text;
  }
  return legacyFallback;
}

export function writeSkillLog(
  key: string,
  params?: Record<string, string | number>,
  style?: string,
): void {
  const fullKey = `game.skills.log.${key}`;
  if (typeof window.t !== 'function' || typeof window.escreverLog !== 'function') return;
  const msg = window.t(fullKey, params || {});
  if (!msg || msg === fullKey) return;
  window.escreverLog(style ? `<span style="${style}">${msg}</span>` : msg);
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
window.consumableDisplayName = consumableDisplayName;
window.consumableDescText = consumableDescText;
window.dailyBossRegionDisplay = dailyBossRegionDisplay;
window.hotbarDisplayName = hotbarDisplayName;
window.bossDisplayName = bossDisplayName;
window.bossShortName = bossShortName;
window.raidBossLogMsg = raidBossLogMsg;
window.raidDropDisplayName = raidDropDisplayName;
window.petDisplayName = petDisplayName;
window.writeSkillLog = writeSkillLog;
window.refreshForestMobNames = refreshForestMobNames;

export {};
