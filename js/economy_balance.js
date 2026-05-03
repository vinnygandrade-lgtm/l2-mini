/**
 * ECONOMY_BALANCE.JS — Curvas Adena / Ancient para multiplayer e farm satisfatório.
 * Preço de loja escala com o nível (cliente + RPC npc_shop_buy_stackable no Supabase).
 */
(function () {
    const SHOP_LEVEL_COEFF = 0.018;
    const SHOP_LEVEL_CAP = 2.35;
    const LOOT_LEVEL_COEFF = 0.006;
    const LOOT_LEVEL_MAX_BONUS = 0.52;
    const ZONE_LOOT_BONUS = {
        'No-Grade': 0.12,
        'D': 0.18,
        'C': 0.24,
        'B': 0.30,
        'A': 0.36,
        'S': 0.42
    };

    function clampLevel(level) {
        const n = Number(level);
        if (!Number.isFinite(n)) return 1;
        return Math.max(1, Math.min(85, Math.floor(n)));
    }

    /** Multiplicador de preço NPC (stackable + equip/treinos) por nível do personagem. */
    function shopLevelPriceMult(level) {
        const lv = clampLevel(level);
        return Math.min(SHOP_LEVEL_CAP, 1 + Math.max(0, lv - 1) * SHOP_LEVEL_COEFF);
    }

    /** Preço unitário final (arredondado) = base do catálogo × mult nível. */
    function effectiveShopUnitPrice(basePrice, level) {
        const b = Math.max(0, Number(basePrice) || 0);
        if (b <= 0) return 0;
        return Math.max(1, Math.ceil(b * shopLevelPriceMult(level)));
    }

    /** Bônus de Adena no loot de mob (nível + zona). */
    function adenaLootMult(level, zonaId) {
        const lv = clampLevel(level);
        const z = zonaId && ZONE_LOOT_BONUS[zonaId] != null ? ZONE_LOOT_BONUS[zonaId] : 0.10;
        const fromLevel = Math.min(LOOT_LEVEL_MAX_BONUS, Math.max(0, lv - 1) * LOOT_LEVEL_COEFF);
        return 1 + fromLevel + z;
    }

    /** Preço do buff Grand Master (escala com nível). */
    function grandMasterBuffPrice(level) {
        const lv = clampLevel(level);
        const base = 500;
        const extra = Math.floor((lv - 1) * 14);
        return Math.min(8500, base + extra);
    }

    window.EconomyBalance = {
        shopLevelPriceMult,
        effectiveShopUnitPrice,
        adenaLootMult,
        grandMasterBuffPrice
    };
})();
