// ==========================================
// BANCO DE DADOS - ITENS, LOJAS E SCROLLS
// ==========================================

// --- MATERIAIS DE DROP E CRAFT (Para o inventário reconhecer) ---
// --- MATERIAIS DE DROP E CRAFT (Para o inventário reconhecer) ---
const catalogoMateriais = [
    { id: 'Animal Skin', nome: 'Animal Skin', tipo: 'material', desc: 'Monster hide. Can be refined into Leather.', img: 'assets/itens/animal_skin.png', preco: 12 },
    { id: 'Animal Bone', nome: 'Animal Bone', tipo: 'material', desc: 'Sturdy bone. Used in crafting.', img: 'assets/itens/animal_bone.png', preco: 12 },
    { id: 'Coal', nome: 'Coal', tipo: 'material', desc: 'Mineral coal.', img: 'assets/itens/coal.png', preco: 12 },
    { id: 'Charcoal', nome: 'Charcoal', tipo: 'material', desc: 'Charcoal. Burns hot and fast.', img: 'assets/itens/charcoal.png', preco: 14 },
    { id: 'Iron Ore', nome: 'Iron Ore', tipo: 'material', desc: 'Raw iron ore.', img: 'assets/itens/iron_ore.png', preco: 18 },
    // Ícones de moeda: §11.3 — PNG **256×256** (ou set alinhado), quadrado, moldura tipo adena/ancient_coin; cor de fundo por brief do projeto.
    { id: 'Adena', nome: 'Adena', tipo: 'currency', desc: 'Common coin of Aden. Used everywhere for trade.', img: 'assets/itens/adena_coin.png', preco: 0 },
    { id: 'Ancient Coin', nome: 'Ancient Coin', tipo: 'material', desc: 'Coin from a forgotten empire. Priceless.', img: 'assets/itens/ancient_coin.png', preco: 1200 },

    // Processados
    { id: 'Leather', nome: 'Leather', tipo: 'material', desc: 'Leather refined by Dwarven craft.', img: 'assets/itens/leather.png', preco: 58 },
    { id: 'Steel', nome: 'Steel', tipo: 'material', desc: 'Tempered steel.', img: 'assets/itens/steel.png', preco: 118 },
    { id: 'Cokes', nome: 'Cokes', tipo: 'material', desc: 'Purified coal for extreme forges.', img: 'assets/itens/cokes.png', preco: 95 },

    // Receitas como Itens Visuais na Bolsa
    { id: 'Recipe: Vesper Noble Heavy', nome: 'Recipe: Vesper Heavy', tipo: 'recipe', desc: 'Divine instructions to forge Vesper Noble Heavy.', img: 'assets/itens/recipe_s.png', preco: 5000000 },
    { id: 'Recipe: Vesper Noble Light', nome: 'Recipe: Vesper Light', tipo: 'recipe', desc: 'Instructions to forge Vesper Noble Light.', img: 'assets/itens/recipe_s.png', preco: 5000000 },
    { id: 'Recipe: Vesper Noble Robe', nome: 'Recipe: Vesper Robe', tipo: 'recipe', desc: 'Instructions to weave Vesper Noble Robe.', img: 'assets/itens/recipe_s.png', preco: 5000000 },
    { id: 'Recipe: Vesper Weapon', nome: 'Recipe: Vesper Weapon', tipo: 'recipe', desc: 'Mastersmith cipher: one blueprint for any Vesper weapon.', img: 'assets/itens/recipe_s.png', preco: 0 },
    { id: 'Recipe: Vesper Jewel', nome: 'Recipe: Vesper Jewel', tipo: 'recipe', desc: 'Lost art of Aden jewelcraft — necklace, earring, or ring.', img: 'assets/itens/recipe_s.png', preco: 0 },

    // ==========================================
    // 🧩 FRAGMENTOS DE JOIAS ÉPICAS
    // ==========================================
    { id: 'frag_antharas', nome: 'Fragment of Antharas', tipo: 'material', grade: 'S', preco: 50000, desc: 'Shard from the Earth Dragon’s scale. Combine to craft Earring of Antharas.', img: 'assets/itens/frag_antharas.png' },
    { id: 'frag_valakas', nome: 'Fragment of Valakas', tipo: 'material', grade: 'S', preco: 50000, desc: 'Blazing fragment of the Fire Dragon. Combine to craft Necklace of Valakas.', img: 'assets/itens/frag_valakas.png' },
    { id: 'frag_baium', nome: 'Fragment of Baium', tipo: 'material', grade: 'S', preco: 50000, desc: 'Splinter from the Tower of Insolence. Combine to craft Ring of Baium.', img: 'assets/itens/frag_baium.png' }
];

const catalogoArmaduras = [
    // NO-GRADE
    { id: 'a1', nome: 'Wooden Set', grade: 'No-Grade', pDef: 30, bonusHp: 50, tipo: 'Heavy', preco: 800, img: 'assets/itens/item_generic.png', desc: 'Simple reinforced wood armor. A first bulwark against chaos.' },
    { id: 'a2', nome: 'Leather Set', grade: 'No-Grade', pDef: 22, bonusSpd: 10, bonusCrit: 1, tipo: 'Light', preco: 800, img: 'assets/itens/item_generic.png', desc: 'Light leather for nimble adventurers. Ideal for quick hunts.' },
    { id: 'a3', nome: 'Devotion Set', grade: 'No-Grade', pDef: 15, bonusMp: 50, bonusMDef: 10, tipo: 'Robe', preco: 800, img: 'assets/itens/item_generic.png', desc: 'Novice acolyte robes. Boosts basic arcane focus.' },

    // D-GRADE
    { id: 'a4', nome: 'Brigandine Set', grade: 'D', pDef: 80, bonusHp: 150, tipo: 'Heavy', preco: 25000, img: 'assets/itens/item_generic.png', desc: 'Sturdy frontier plates. Built to endure brutal charges.' },
    { id: 'a5', nome: 'Manticore Set', grade: 'D', pDef: 60, bonusSpd: 20, bonusCrit: 2, tipo: 'Light', preco: 25000, img: 'assets/itens/item_generic.png', desc: 'Treated Manticore leather. Mobility and precision in combat.' },
    { id: 'a6', nome: 'Knowledge Set', grade: 'D', pDef: 40, bonusMp: 150, bonusMDef: 25, tipo: 'Robe', preco: 25000, img: 'assets/itens/item_generic.png', desc: 'Arcane library vestments. Great for mages on the rise.' },

    // C-GRADE
    { id: 'a7', nome: 'Composite Set', grade: 'C', pDef: 150, bonusHp: 300, tipo: 'Heavy', preco: 120000, img: 'assets/itens/item_generic.png', desc: 'Campaign armor for veterans. Solid endurance in long fights.' },
    { id: 'a8', nome: 'Plated Leather', grade: 'C', pDef: 110, bonusSpd: 35, bonusCrit: 4, tipo: 'Light', preco: 120000, img: 'assets/itens/item_generic.png', desc: 'Plated leather for duelists. Fast strikes with calculated risk.' },
    { id: 'a9', nome: 'Karmian Set', grade: 'C', pDef: 75, bonusMp: 300, bonusMDef: 45, tipo: 'Robe', preco: 120000, img: 'assets/itens/item_generic.png', desc: 'Classic mage robes. Efficient MP channeling and defense.' },

    // B-GRADE
    { id: 'a10', nome: 'Doom Plate', grade: 'B', pDef: 240, bonusHp: 500, tipo: 'Heavy', preco: 450000, img: 'assets/itens/item_generic.png', desc: 'Elite dark steel. A bastion for heavy raids.' },
    { id: 'a11', nome: 'Doom Leather', grade: 'B', pDef: 180, bonusSpd: 50, bonusCrit: 6, tipo: 'Light', preco: 450000, img: 'assets/itens/item_generic.png', desc: 'Elite hunter gear. Tempo and lethality above the norm.' },
    { id: 'a12', nome: 'Avadon Robe', grade: 'B', pDef: 125, bonusMp: 500, bonusMDef: 70, tipo: 'Robe', preco: 450000, img: 'assets/itens/item_generic.png', desc: 'Avadon ritual robe. Refined M. Def. for long duels.' },

    // A-GRADE
    { id: 'a13', nome: 'Dark Crystal', grade: 'A', pDef: 350, bonusHp: 800, tipo: 'Heavy', preco: 1500000, img: 'assets/itens/item_generic.png', desc: 'Tempered black crystals. Frontline defense at its finest.' },
    { id: 'a14', nome: 'Majestic Leather', grade: 'A', pDef: 260, bonusSpd: 75, bonusCrit: 8, tipo: 'Light', preco: 1500000, img: 'assets/itens/item_generic.png', desc: 'Majestic elite set. Top-tier speed and precision.' },
    { id: 'a15', nome: 'Tallum Robe', grade: 'A', pDef: 180, bonusMp: 800, bonusMDef: 110, tipo: 'Robe', preco: 1500000, img: 'assets/itens/item_generic.png', desc: 'Tallum arcane robe. Magical mastery for large-scale war.' },

    // S-GRADE
    { id: 'a16', nome: 'Imperial Crusader', grade: 'S', pDef: 500, bonusHp: 1500, tipo: 'Heavy', preco: 5000000, img: 'assets/itens/item_generic.png', desc: 'Legendary imperial breastplate. Brutal resilience for S-Grade champions.' },
    { id: 'a17', nome: 'Draconic Leather', grade: 'S', pDef: 380, bonusSpd: 100, bonusCrit: 12, tipo: 'Light', preco: 5000000, img: 'assets/itens/item_generic.png', desc: 'Rare draconic leather. Assassin mobility with high crit damage.' },
    { id: 'a18', nome: 'Major Arcana', grade: 'S', pDef: 260, bonusMp: 1500, bonusMDef: 180, tipo: 'Robe', preco: 5000000, img: 'assets/itens/item_generic.png', desc: 'Supreme arcane vestments. Peak MP and magic defense for endgame.' },
     
    // --- ELITE S-GRADE (CRAFT EXCLUSIVO - SET VESPER) ---
    { 
        id: 'arm_s_vesper_heavy', nome: 'Vesper Noble Heavy', grade: 'S', tipo: 'Heavy', 
        pDef: 650, bonusHp: 2500, pAtk: 150, bonusMDef: 120, preco: 0, moeda: 'Adena',
        desc: '[Elite Craft] Supreme heavy armor. Colossal HP (+2500), huge P. Atk (+150), and nigh-impenetrable defense.', 
        img: 'assets/itens/vesper_heavy.png' 
    },
    { 
        id: 'arm_s_vesper_light', nome: 'Vesper Noble Light', grade: 'S', tipo: 'Light', 
        pDef: 480, bonusSpd: 150, bonusCrit: 20, pAtk: 100, bonusHp: 1000, preco: 0, moeda: 'Adena',
        desc: '[Elite Craft] Ancient dragon leather. Extreme mobility (+150 Spd), lethal crit (+20%), and P. Atk (+100).', 
        img: 'assets/itens/vesper_light.png' 
    },
    { 
        id: 'arm_s_vesper_robe', nome: 'Vesper Noble Robe', grade: 'S', tipo: 'Robe', 
        pDef: 300, bonusMp: 3000, bonusMDef: 350, mAtk: 250, bonusSpd: 80, preco: 0, moeda: 'Adena',
        desc: '[Elite Craft] Robe of chaotic magic. Massive MP (+3000), devastating M. Atk (+250), and fast casting.', 
        img: 'assets/itens/vesper_robe.png' 
    }
];

// --- JOIAS (ACESSÓRIOS) ---
const catalogoJoias = [
    // --- NO-GRADE ---
    { id: 'j_ng_neck', nome: 'Wooden Necklace', tipoItem: 'neck', grade: 'No-Grade', preco: 300, mDef: 12, bonusHp: 15, bonusMp: 10, desc: 'Rustic jewelry. Grants a small vitality boost.', img: 'assets/itens/wooden_necklace.png' },
    { id: 'j_ng_ear', nome: 'Wooden Earring', tipoItem: 'ear', grade: 'No-Grade', preco: 200, mDef: 9, bonusHp: 10, bonusMp: 5, desc: 'Simple earrings. Slightly improves resistance.', img: 'assets/itens/wooden_earring.png' },
    { id: 'j_ng_ring', nome: 'Wooden Ring', tipoItem: 'ring', grade: 'No-Grade', preco: 150, mDef: 6, bonusHp: 5, bonusMp: 5, desc: 'Carved wooden ring.', img: 'assets/itens/wooden_ring.png' },
    
    // --- D-GRADE ---
    { id: 'j_d_neck', nome: 'Elven Necklace', tipoItem: 'neck', grade: 'D', preco: 2000, mDef: 28, bonusHp: 40, bonusMp: 25, bonusCrit: 1, desc: 'Elf-crafted. Grants +1% Critical Rate.', img: 'assets/itens/elven_necklace.png' },
    { id: 'j_d_ear', nome: 'Elven Earring', tipoItem: 'ear', grade: 'D', preco: 1500, mDef: 21, bonusHp: 25, bonusMp: 15, desc: 'Elven earrings that sharpen focus.', img: 'assets/itens/elven_earring.png' },
    { id: 'j_d_ring', nome: 'Elven Ring', tipoItem: 'ring', grade: 'D', preco: 1000, mDef: 14, bonusHp: 15, bonusMp: 10, bonusCrit: 1, desc: 'Polished ring. +1% Critical Rate.', img: 'assets/itens/elven_ring.png' },
    
    // --- C-GRADE ---
    { id: 'j_c_neck', nome: 'Aquastone Necklace', tipoItem: 'neck', grade: 'C', preco: 6000, mDef: 50, bonusHp: 90, bonusMp: 50, bonusCrit: 2, bonusSpd: 5, desc: 'Aquatic magic stone. Starts lowering attack/cast delay.', img: 'assets/itens/aquastone_necklace.png' },
    { id: 'j_c_ear', nome: 'Aquastone Earring', tipoItem: 'ear', grade: 'C', preco: 4500, mDef: 37, bonusHp: 60, bonusMp: 30, bonusSpd: 3, desc: 'Aquastone earrings.', img: 'assets/itens/aquastone_earring.png' },
    { id: 'j_c_ring', nome: 'Aquastone Ring', tipoItem: 'ring', grade: 'C', preco: 3000, mDef: 25, bonusHp: 30, bonusMp: 20, bonusCrit: 2, desc: 'Magic-infused ring. +2% Critical Rate.', img: 'assets/itens/aquastone_ring.png' },
    
    // --- B-GRADE ---
    { id: 'j_b_neck', nome: 'Black Ore Necklace', tipoItem: 'neck', grade: 'B', preco: 18000, mDef: 70, bonusHp: 150, bonusMp: 90, bonusCrit: 3, bonusSpd: 10, pAtk: 15, mAtk: 15, desc: 'Black-ore jewelry. Direct attack power bonus.', img: 'assets/itens/blackore_necklace.png' },
    { id: 'j_b_ear', nome: 'Black Ore Earring', tipoItem: 'ear', grade: 'B', preco: 13500, mDef: 52, bonusHp: 100, bonusMp: 60, bonusSpd: 5, pAtk: 10, mAtk: 10, desc: 'Black-ore earrings. +10 P. Atk and M. Atk.', img: 'assets/itens/blackore_earring.png' },
    { id: 'j_b_ring', nome: 'Black Ore Ring', tipoItem: 'ring', grade: 'B', preco: 9000, mDef: 35, bonusHp: 60, bonusMp: 40, bonusCrit: 3, pAtk: 5, mAtk: 5, desc: 'Greatly improves critical hit chance.', img: 'assets/itens/blackore_ring.png' },
    
    // --- A-GRADE ---
    { id: 'j_a_neck', nome: 'Majestic Necklace', tipoItem: 'neck', grade: 'A', preco: 60000, mDef: 100, bonusHp: 250, bonusMp: 150, bonusCrit: 4, bonusSpd: 20, pAtk: 35, mAtk: 35, desc: 'Majestic jewelry. Formidable speed and damage bonuses.', img: 'assets/itens/majestic_necklace.png' },
    { id: 'j_a_ear', nome: 'Majestic Earring', tipoItem: 'ear', grade: 'A', preco: 45000, mDef: 75, bonusHp: 180, bonusMp: 100, bonusSpd: 10, pAtk: 25, mAtk: 25, desc: 'Speeds up body and mind.', img: 'assets/itens/majestic_earring.png' },
    { id: 'j_a_ring', nome: 'Majestic Ring', tipoItem: 'ring', grade: 'A', preco: 30000, mDef: 50, bonusHp: 100, bonusMp: 60, bonusCrit: 4, pAtk: 15, mAtk: 15, desc: 'Solid gold band. +4% Critical Rate.', img: 'assets/itens/majestic_ring.png' },
    
    // --- S-GRADE ---
    { id: 'j_s_neck', nome: 'Tateossian Necklace', tipoItem: 'neck', grade: 'S', preco: 250000, mDef: 140, bonusHp: 400, bonusMp: 250, bonusCrit: 5, bonusSpd: 30, pAtk: 70, mAtk: 70, desc: 'Jewelry of the lords. Drastically raises offensive and defensive stats.', img: 'assets/itens/tateossian_necklace.png' },
    { id: 'j_s_ear', nome: 'Tateossian Earring', tipoItem: 'ear', grade: 'S', preco: 180000, mDef: 105, bonusHp: 280, bonusMp: 180, bonusSpd: 15, pAtk: 50, mAtk: 50, desc: 'Tateossian earrings. Absolute vitality and strength.', img: 'assets/itens/tateossian_earring.png' },
    { id: 'j_s_ring', nome: 'Tateossian Ring', tipoItem: 'ring', grade: 'S', preco: 125000, mDef: 70, bonusHp: 150, bonusMp: 100, bonusCrit: 5, pAtk: 35, mAtk: 35, desc: 'Tateossian ring. Pushes Critical Rate to the limit.', img: 'assets/itens/tateossian_ring.png' },
    
    // --- ELITE S-GRADE (CRAFT EXCLUSIVO - SET VESPER) ---
    { id: 'j_vesper_neck', nome: 'Vesper Necklace', tipoItem: 'neck', grade: 'S', preco: 0, mDef: 165, bonusHp: 650, bonusMp: 400, bonusCrit: 7, bonusSpd: 45, pAtk: 120, mAtk: 120, desc: 'Forged by legends. The apex of mortal gear.', img: 'assets/itens/vesper_necklace.png' },
    { id: 'j_vesper_ear', nome: 'Vesper Earring', tipoItem: 'ear', grade: 'S', preco: 0, mDef: 125, bonusHp: 450, bonusMp: 280, bonusSpd: 25, pAtk: 85, mAtk: 85, desc: 'Vesper earrings. Amplifies your class’s base power.', img: 'assets/itens/vesper_earring.png' },
    { id: 'j_vesper_ring', nome: 'Vesper Ring', tipoItem: 'ring', grade: 'S', preco: 0, mDef: 85, bonusHp: 250, bonusMp: 150, bonusCrit: 7, pAtk: 60, mAtk: 60, desc: 'Vesper ring. Unmatched precision and brutality.', img: 'assets/itens/vesper_ring.png' },

    // --- EPIC JEWELS (ULTRA ELITE - DROP DE BOSS) ---
    { id: 'j_epic_valakas', nome: 'Necklace of Valakas', tipoItem: 'neck', grade: 'S', preco: 0, mDef: 200, bonusHp: 1000, bonusMp: 500, bonusCrit: 8, bonusSpd: 30, pAtk: 300, mAtk: 300, desc: 'Blazing necklace of the Fire Dragon. Peak physical and magic power.', img: 'assets/itens/valakas_necklace.png' },
    { id: 'j_epic_antharas', nome: 'Earring of Antharas', tipoItem: 'ear', grade: 'S', preco: 0, mDef: 150, bonusHp: 800, bonusMp: 300, bonusCrit: 5, pAtk: 150, mAtk: 150, desc: 'Blessed by the Earth Dragon. Colossal vitality.', img: 'assets/itens/antharas_earring.png' },
    { id: 'j_epic_baium', nome: 'Ring of Baium', tipoItem: 'ring', grade: 'S', preco: 0, mDef: 100, bonusSpd: 60, bonusCrit: 12, pAtk: 200, mAtk: 200, desc: 'Emperor’s ring. Shatters bodily limits, greatly lowering delay.', img: 'assets/itens/baium_ring.png' }
    
];



// --- ARMAS ---
const catalogoArmas = [ 
    // ======================
    // NO-GRADE
    // ======================
    { id: 'wpn_ng_longsword', nome: 'Long Sword', grade: 'No-Grade', tipo: 'Sword', preco: 500, atk: 25, bonusHp: 25, img: 'assets/armas/claymore.png', desc: 'Reliable starter sword. Balanced for any physical class.' },
    { id: 'wpn_ng_dagger', nome: 'Shining Knife', grade: 'No-Grade', tipo: 'Dagger', preco: 520, atk: 21, bonusCrit: 2, bonusSpd: 10, img: 'assets/armas/elven_sword.png', desc: 'Light dagger for fast strikes and frequent crits.' },
    { id: 'wpn_ng_bow', nome: 'Training Bow', grade: 'No-Grade', tipo: 'Bow', preco: 560, atk: 28, bonusCrit: 3, img: 'assets/armas/stormbringer.png', desc: 'Training bow with solid accuracy for early farming.' },
    { id: 'wpn_ng_mace', nome: 'Apprentice Mace', grade: 'No-Grade', tipo: 'Mace', preco: 600, atk: 24, matk: 18, bonusMp: 40, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Hybrid mace for physical classes with light magic support.' },
    { id: 'wpn_ng_magic', nome: 'Magic Staff', grade: 'No-Grade', tipo: 'Magic Sword', preco: 620, atk: 16, matk: 34, bonusMp: 80, img: 'assets/armas/elven_sword.png', desc: 'Basic arcane focus for novice mages.' },

    // ======================
    // D-GRADE
    // ======================
    { id: 'wpn_d_elven_sword', nome: 'Elven Long Sword', grade: 'D', tipo: 'Sword', preco: 2000, atk: 55, bonusHp: 60, img: 'assets/armas/elven_sword.png', desc: 'Refined elven blade with solid base power.' },
    { id: 'wpn_d_heavy_sword', nome: 'Heavy Sword', grade: 'D', tipo: 'Sword', preco: 2500, atk: 65, bonusHp: 90, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Heavy sword for steady physical burst.' },
    { id: 'wpn_d_stiletto', nome: 'Stiletto', grade: 'D', tipo: 'Dagger', preco: 2200, atk: 49, bonusCrit: 5, bonusSpd: 18, img: 'assets/armas/elven_sword.png', desc: 'Deadly dagger focused on crit rate.' },
    { id: 'wpn_d_hunters_bow', nome: 'Hunter Bow', grade: 'D', tipo: 'Bow', preco: 2600, atk: 70, bonusCrit: 4, img: 'assets/armas/stormbringer.png', desc: 'Long bow for ranged classes.' },
    { id: 'wpn_d_war_hammer', nome: 'War Hammer', grade: 'D', tipo: 'Mace', preco: 2700, atk: 58, matk: 42, bonusHp: 70, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Sturdy war hammer with hybrid offense.' },
    { id: 'wpn_d_wizard_staff', nome: 'Wizard Staff', grade: 'D', tipo: 'Magic Sword', preco: 2800, atk: 26, matk: 84, bonusMp: 180, img: 'assets/armas/elven_sword.png', desc: 'Mage staff with high M. Atk for D-grade.' },

    // ======================
    // C-GRADE
    // ======================
    { id: 'wpn_c_stormbringer', nome: 'Stormbringer', grade: 'C', tipo: 'Sword', preco: 8000, atk: 120, bonusHp: 150, img: 'assets/armas/stormbringer.png', desc: 'Classic C-grade sword with high physical impact.' },
    { id: 'wpn_c_sabre', nome: 'Tempered Sabre', grade: 'C', tipo: 'Sword', preco: 8600, atk: 128, bonusCrit: 3, img: 'assets/armas/claymore.png', desc: 'Balanced saber with stable damage and good handling.' },
    { id: 'wpn_c_dark_screamer', nome: 'Dark Screamer', grade: 'C', tipo: 'Dagger', preco: 8200, atk: 110, bonusCrit: 8, bonusSpd: 25, img: 'assets/armas/elven_sword.png', desc: 'Legendary assassin dagger of the C progression.' },
    { id: 'wpn_c_akat_bow', nome: 'Akat Long Bow', grade: 'C', tipo: 'Bow', preco: 9000, atk: 150, bonusCrit: 6, img: 'assets/armas/stormbringer.png', desc: 'Powerful bow for ranged burst.' },
    { id: 'wpn_c_knuckle', nome: 'Battle Knuckle', grade: 'C', tipo: 'Fist', preco: 8700, atk: 118, bonusSpd: 35, bonusHp: 120, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Fist weapon for accelerated DPS.' },
    { id: 'wpn_c_sorcerer_staff', nome: 'Sorcerer Staff', grade: 'C', tipo: 'Magic Sword', preco: 9200, atk: 52, matk: 180, bonusMp: 320, bonusSpd: 20, img: 'assets/armas/elven_sword.png', desc: 'High M. Atk staff for C-grade mages.' },

    // ======================
    // B-GRADE
    // ======================
    { id: 'wpn_b_damascus', nome: 'Sword of Damascus', grade: 'B', tipo: 'Sword', preco: 25000, atk: 200, bonusHp: 260, img: 'assets/armas/damascus.png', desc: 'Classic B-grade sword of brutal damage.' },
    { id: 'wpn_b_samurai', nome: 'Samurai Longsword', grade: 'B', tipo: 'Sword', preco: 26500, atk: 210, bonusCrit: 5, img: 'assets/armas/claymore.png', desc: 'Elite blade with superior physical aggression.' },
    { id: 'wpn_b_kris', nome: 'Kris', grade: 'B', tipo: 'Dagger', preco: 24000, atk: 184, bonusCrit: 12, bonusSpd: 38, img: 'assets/armas/elven_sword.png', desc: 'A precise dagger for devastating crits.' },
    { id: 'wpn_b_hakens_bow', nome: 'Haken Bow', grade: 'B', tipo: 'Bow', preco: 28000, atk: 250, bonusCrit: 10, img: 'assets/armas/draconic.png', desc: 'B-grade bow for archer builds.' },
    { id: 'wpn_b_demon_splinter', nome: 'Demon Splinter', grade: 'B', tipo: 'Mace', preco: 27500, atk: 196, matk: 120, bonusHp: 180, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Hybrid mace with solid sustain for heavy PvE.' },
    { id: 'wpn_b_parasword', nome: 'Parasword', grade: 'B', tipo: 'Magic Sword', preco: 28500, atk: 90, matk: 310, bonusMp: 500, bonusSpd: 30, img: 'assets/armas/tallum.png', desc: 'Arcane sword for mages with high M. Atk.' },

    // ======================
    // A-GRADE
    // ======================
    { id: 'wpn_a_tallum', nome: 'Tallum Blade', grade: 'A', tipo: 'Sword', preco: 80000, atk: 350, bonusHp: 420, img: 'assets/armas/tallum.png', desc: 'A-grade blade for late-game physical builds.' },
    { id: 'wpn_a_dragon_slayer', nome: 'Dragon Slayer', grade: 'A', tipo: 'Sword', preco: 86000, atk: 370, bonusCrit: 8, img: 'assets/armas/damascus.png', desc: 'Execution greatsword with high damage.' },
    { id: 'wpn_a_soul_separator', nome: 'Soul Separator', grade: 'A', tipo: 'Dagger', preco: 78000, atk: 320, bonusCrit: 16, bonusSpd: 45, img: 'assets/armas/elven_sword.png', desc: 'A-grade dagger for extreme assassins.' },
    { id: 'wpn_a_carniage_bow', nome: 'Carnage Bow', grade: 'A', tipo: 'Bow', preco: 90000, atk: 430, bonusCrit: 14, img: 'assets/armas/draconic.png', desc: 'Heavy bow for maximum damage per shot.' },
    { id: 'wpn_a_forgotten_blade', nome: 'Forgotten Blade', grade: 'A', tipo: 'Mace', preco: 87000, atk: 340, matk: 220, bonusHp: 320, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'High-tier hybrid weapon for versatile classes.' },
    { id: 'wpn_a_arcana_mace', nome: 'Arcana Mace', grade: 'A', tipo: 'Magic Sword', preco: 92000, atk: 140, matk: 520, bonusMp: 900, bonusSpd: 45, img: 'assets/armas/tallum.png', desc: 'Advanced arcane catalyst for A-grade mages.' },

    // ======================
    // S-GRADE
    // ======================
    { id: 'wpn_s_infinity_sword', nome: 'Infinity Sword', grade: 'S', tipo: 'Sword', preco: 250000, atk: 600, bonusHp: 850, bonusCrit: 10, img: 'assets/armas/damascus.png', desc: 'S-grade sword for extreme physical DPS.' },
    { id: 'wpn_s_draconic', nome: 'Draconic Bow', grade: 'S', tipo: 'Bow', preco: 250000, atk: 620, bonusCrit: 18, img: 'assets/armas/draconic.png', desc: 'Legendary bow with maximum long-range power.' },
    { id: 'wpn_s_angelslayer', nome: 'Angel Slayer', grade: 'S', tipo: 'Dagger', preco: 245000, atk: 560, bonusCrit: 24, bonusSpd: 60, img: 'assets/armas/elven_sword.png', desc: 'Supreme dagger for brutal endgame crits.' },
    { id: 'wpn_s_dragon_hammer', nome: 'Dragon Hammer', grade: 'S', tipo: 'Mace', preco: 255000, atk: 590, matk: 280, bonusHp: 950, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Titanic mace for tanks and hybrid classes.' },
    { id: 'wpn_s_imperial_staff', nome: 'Imperial Staff', grade: 'S', tipo: 'Magic Sword', preco: 260000, atk: 220, matk: 700, bonusMp: 1600, bonusSpd: 70, img: 'assets/armas/tallum.png', desc: 'Imperial staff for S-grade mages with huge burst.' },
    { id: 'wpn_s_tyrants_fist', nome: 'Tyrant Fist', grade: 'S', tipo: 'Fist', preco: 252000, atk: 575, bonusSpd: 85, bonusHp: 700, img: 'assets/icons/icon_wpn_heavysword.png', desc: 'Legendary fists focused on speed and relentless pressure.' },
    // --- ELITE S-GRADE (CRAFT EXCLUSIVO - ARMAS VESPER) ---
    // --- ELITE S-GRADE (CRAFT EXCLUSIVO - ARMAS VESPER COM SA) ---
    { 
        id: 'wpn_s_vesper_cutter', nome: 'Vesper Cutter', grade: 'S', tipo: 'Sword', 
        atk: 600, matk: 250, preco: 0, moeda: 'Adena',
        bonusHp: 1500, bonusSpd: 50, // SA: Health & Haste
        desc: '[SA: Health & Haste] Legendary sword. +1500 Max HP and faster attack speed.', 
        img: 'assets/itens/vesper_cutter.png' 
    },
    { 
        id: 'wpn_s_vesper_shaper', nome: 'Vesper Shaper', grade: 'S', tipo: 'Dagger', 
        atk: 520, matk: 250, preco: 0, moeda: 'Adena',
        bonusCrit: 20, bonusSpd: 120, // SA: Focus & Haste
        desc: '[SA: Focus & Haste] Abyssal dagger. +120ms faster swings and +20% Critical Rate.', 
        img: 'assets/itens/vesper_shaper.png' 
    },
    { 
        id: 'wpn_s_vesper_thrower', nome: 'Vesper Thrower', grade: 'S', tipo: 'Bow', 
        atk: 720, matk: 200, preco: 0, moeda: 'Adena',
        bonusCrit: 25, // SA: Focus
        desc: '[SA: Focus] Bow of pure energy. Highest firepower in the game and +25% Critical Rate.', 
        img: 'assets/itens/vesper_thrower.png' 
    },
    { 
        id: 'wpn_s_vesper_fighter', nome: 'Vesper Fighter', grade: 'S', tipo: 'Fist', 
        atk: 620, matk: 250, preco: 0, moeda: 'Adena',
        bonusSpd: 100, bonusHp: 1000, // SA: Haste & Health
        desc: '[SA: Haste & Health] Beast claws for Orcs. +1000 Max HP and lethal attack speed.', 
        img: 'assets/itens/vesper_fighter.png' 
    },
    { 
        id: 'wpn_s_vesper_avenger', nome: 'Vesper Avenger', grade: 'S', tipo: 'Mace', 
        atk: 640, matk: 250, preco: 0, moeda: 'Adena',
        bonusHp: 1800, // SA: Health
        desc: '[SA: Health] War hammer of the Dwarf lords. Grants +1800 raw Max HP.', 
        img: 'assets/itens/vesper_avenger.png' 
    },
    { 
        id: 'wpn_s_vesper_buster', nome: 'Vesper Buster', grade: 'S', tipo: 'Magic Sword', 
        atk: 300, matk: 700, preco: 0, moeda: 'Adena',
        bonusMp: 2000, bonusSpd: 80, // SA: Acumen & Mana
        desc: '[SA: Acumen & Mana] Ultimate arcane focus. +2000 MP and incredibly fast spellcasting.', 
        img: 'assets/itens/vesper_buster.png' 
    }
];

const precosVenda = { "Animal Skin": 13, "Animal Bone": 18, "Coal": 24, "Charcoal": 30, "Iron Ore": 38 };

// --- CONSUMÍVEIS E SCROLLS ---
const catalogoConsumiveis = [
    { id: 'pot_hp', nome: 'HP Potion', preco: 58, img: 'assets/npcs/grocer.png', desc: 'Instantly restores 50 HP.' },
    { id: 'pot_mp', nome: 'Mana Potion', preco: 58, img: 'assets/npcs/grocer.png', desc: 'Instantly restores 40 MP.' },
    { id: 'shot_ng', nome: 'Soulshot (NG)', preco: 6, img: 'assets/npcs/grocer.png', desc: 'Auto-use: +20% damage on hit. [Fighters]' },
    { id: 'bshot_ng', nome: 'B. Spiritshot (NG)', preco: 6, img: 'assets/npcs/grocer.png', desc: 'Auto-use: +20% damage on hit. [Mages]' }
];

const catalogoScrolls = [
    // --- LIFE STONE ---
    { id: 'ls_1', nome: 'Life Stone', preco: 78, moeda: 'Ancient', desc: 'Rare catalyst for augmentation and master forges. Expensive for a reason.', img: 'assets/itens/life_stone.png' },

    // --- NO-GRADE (Adena) ---
    { id: 'sc_w_ng', nome: 'Enchant Weapon (NG)', preco: 1120, moeda: 'Adena', desc: 'Raises P. Atk / M. Atk on No-Grade weapons.', img: 'assets/itens/scroll_wpn_ng.png' },
    { id: 'sc_a_ng', nome: 'Enchant Armor (NG)', preco: 335, moeda: 'Adena', desc: 'Enchants No-Grade armor and jewels. On jewels, raises M. Def and enchant-linked bonuses.', img: 'assets/itens/scroll_arm_ng.png' },

    // --- D-GRADE ---
    { id: 'sc_w_d', nome: 'Enchant Weapon (D)', preco: 5600, moeda: 'Adena', desc: 'Scroll for D-grade weapons.', img: 'assets/itens/scroll_wpn_d.png' },
    { id: 'sc_bw_d', nome: 'Blessed Enchant Weapon (D)', preco: 6, moeda: 'Ancient', desc: 'Safe enchant: on failure, the weapon does NOT break.', img: 'assets/itens/scroll_b_wpn_d.png' },
    { id: 'sc_a_d', nome: 'Enchant Armor (D)', preco: 1680, moeda: 'Adena', desc: 'Scroll for D-grade armor/jewels. Jewels also use this scroll.', img: 'assets/itens/scroll_arm_d.png' },
    { id: 'sc_ba_d', nome: 'Blessed Enchant Armor (D)', preco: 3, moeda: 'Ancient', desc: 'Safe enchant for D armor/jewels. On failure, the item does not break.', img: 'assets/itens/scroll_b_arm_d.png' },

    // --- C-GRADE ---
    { id: 'sc_w_c', nome: 'Enchant Weapon (C)', preco: 22400, moeda: 'Adena', desc: 'Scroll for C-grade weapons.', img: 'assets/itens/scroll_wpn_c.png' },
    { id: 'sc_bw_c', nome: 'Blessed Enchant Weapon (C)', preco: 17, moeda: 'Ancient', desc: 'Safe enchant for C-grade weapons.', img: 'assets/itens/scroll_b_wpn_c.png' },
    { id: 'sc_a_c', nome: 'Enchant Armor (C)', preco: 6720, moeda: 'Adena', desc: 'Scroll for C-grade armor/jewels. Compatible with C jewels.', img: 'assets/itens/scroll_arm_c.png' },
    { id: 'sc_ba_c', nome: 'Blessed Enchant Armor (C)', preco: 7, moeda: 'Ancient', desc: 'Safe enchant for C armor/jewels. Failure protected.', img: 'assets/itens/scroll_b_arm_c.png' },

    // --- B-GRADE ---
    { id: 'sc_w_b', nome: 'Enchant Weapon (B)', preco: 112000, moeda: 'Adena', desc: 'Scroll for B-grade weapons.', img: 'assets/itens/scroll_wpn_b.png' },
    { id: 'sc_bw_b', nome: 'Blessed Enchant Weapon (B)', preco: 56, moeda: 'Ancient', desc: 'Safe enchant for B-grade weapons.', img: 'assets/itens/scroll_b_wpn_b.png' },
    { id: 'sc_a_b', nome: 'Enchant Armor (B)', preco: 33600, moeda: 'Adena', desc: 'Scroll for B-grade armor/jewels. B jewels use this scroll.', img: 'assets/itens/scroll_arm_b.png' },
    { id: 'sc_ba_b', nome: 'Blessed Enchant Armor (B)', preco: 22, moeda: 'Ancient', desc: 'Safe enchant for B armor/jewels. On failure, keeps the item.', img: 'assets/itens/scroll_b_arm_b.png' },

    // --- A-GRADE ---
    { id: 'sc_w_a', nome: 'Enchant Weapon (A)', preco: 560000, moeda: 'Adena', desc: 'Scroll for A-grade weapons.', img: 'assets/itens/scroll_wpn_a.png' },
    { id: 'sc_bw_a', nome: 'Blessed Enchant Weapon (A)', preco: 168, moeda: 'Ancient', desc: 'Safe enchant for A-grade weapons.', img: 'assets/itens/scroll_b_wpn_a.png' },
    { id: 'sc_a_a', nome: 'Enchant Armor (A)', preco: 168000, moeda: 'Adena', desc: 'Scroll for A-grade armor/jewels. Also used on A jewels.', img: 'assets/itens/scroll_arm_a.png' },
    { id: 'sc_ba_a', nome: 'Blessed Enchant Armor (A)', preco: 68, moeda: 'Ancient', desc: 'Safe enchant for A armor/jewels. Failure protected (no break).', img: 'assets/itens/scroll_b_arm_a.png' },

    // --- S-GRADE ---
    { id: 'sc_w_s', nome: 'Enchant Weapon (S)', preco: 2240000, moeda: 'Adena', desc: 'Scroll for S-grade weapons.', img: 'assets/itens/scroll_wpn_s.png' },
    { id: 'sc_bw_s', nome: 'Blessed Enchant Weapon (S)', preco: 560, moeda: 'Ancient', desc: 'Safe enchant for S-grade weapons.', img: 'assets/itens/scroll_b_wpn_s.png' },
    { id: 'sc_a_s', nome: 'Enchant Armor (S)', preco: 672000, moeda: 'Adena', desc: 'Scroll for S-grade armor/jewels. S jewels enchant here.', img: 'assets/itens/scroll_arm_s.png' },
    { id: 'sc_ba_s', nome: 'Blessed Enchant Armor (S)', preco: 224, moeda: 'Ancient', desc: 'Safe enchant for S armor/jewels. Protects against break.', img: 'assets/itens/scroll_b_arm_s.png' }
];

// ==========================================
// RECEITAS ELITE - VESPER / ÉPICAS
// ==========================================

const catalogoReceitas = {
    special: [
        {
            idReceita: 'rec_vesper_heavy',
            itemResultado: { tipoBase: 'armor', idBase: 'arm_s_vesper_heavy' },
            nome: 'Vesper Noble Heavy Set',
            img: 'assets/itens/vesper_heavy.png',
            desc: 'Forge the supreme heavy armor. Requires the rare recipe from Imperial Tomb.',
            ingredientes: [
                { id: 'Recipe: Vesper Noble Heavy', qtd: 1 },
                { id: 'Ancient Coin', qtd: 1400 },
                { id: 'Adena', qtd: 2800000 },
                { id: 'Steel', qtd: 420 },
                { id: 'Iron Ore', qtd: 5200 },
                { id: 'Coal', qtd: 2800 },
                { id: 'Life Stone', qtd: 12 }
            ]
        },
        {
            idReceita: 'rec_vesper_light',
            itemResultado: { tipoBase: 'armor', idBase: 'arm_s_vesper_light' },
            nome: 'Vesper Noble Light Set',
            img: 'assets/itens/vesper_light.png',
            desc: 'Forge the elite leather set.',
            ingredientes: [
                { id: 'Recipe: Vesper Noble Light', qtd: 1 },
                { id: 'Ancient Coin', qtd: 1400 },
                { id: 'Adena', qtd: 2800000 },
                { id: 'Leather', qtd: 420 },
                { id: 'Animal Skin', qtd: 5200 },
                { id: 'Animal Bone', qtd: 2800 },
                { id: 'Life Stone', qtd: 12 }
            ]
        },
        {
            idReceita: 'rec_vesper_robe',
            itemResultado: { tipoBase: 'armor', idBase: 'arm_s_vesper_robe' },
            nome: 'Vesper Noble Robe Set',
            img: 'assets/itens/vesper_robe.png',
            desc: 'Forge the ultimate magic robe.',
            ingredientes: [
                { id: 'Recipe: Vesper Noble Robe', qtd: 1 },
                { id: 'Ancient Coin', qtd: 1400 },
                { id: 'Adena', qtd: 2800000 },
                { id: 'Cokes', qtd: 350 },
                { id: 'Charcoal', qtd: 5200 },
                { id: 'Coal', qtd: 2800 },
                { id: 'Life Stone', qtd: 12 }
            ]
        },
        {
            idReceita: 'rec_vesper_weapon_unified',
            nome: 'Vesper Weapon',
            img: 'assets/itens/vesper_cutter.png',
            desc: 'Universal Vesper weapon forge. Consumes one Recipe: Vesper Weapon. Pick the weapon type before forging.',
            ingredientes: [
                { id: 'Recipe: Vesper Weapon', qtd: 1 },
                { id: 'Ancient Coin', qtd: 2400 },
                { id: 'Adena', qtd: 5800000 },
                { id: 'Steel', qtd: 950 },
                { id: 'Iron Ore', qtd: 5500 },
                { id: 'Coal', qtd: 4200 },
                { id: 'Charcoal', qtd: 3800 },
                { id: 'Life Stone', qtd: 24 }
            ],
            escolhasResultado: [
                { idBase: 'wpn_s_vesper_cutter', tipoBase: 'weapon', label: 'Cutter (Sword)' },
                { idBase: 'wpn_s_vesper_shaper', tipoBase: 'weapon', label: 'Shaper (Dagger)' },
                { idBase: 'wpn_s_vesper_thrower', tipoBase: 'weapon', label: 'Thrower (Bow)' },
                { idBase: 'wpn_s_vesper_fighter', tipoBase: 'weapon', label: 'Fighter (Fist)' },
                { idBase: 'wpn_s_vesper_avenger', tipoBase: 'weapon', label: 'Avenger (Mace)' },
                { idBase: 'wpn_s_vesper_buster', tipoBase: 'weapon', label: 'Buster (Staff)' }
            ]
        },
        {
            idReceita: 'rec_vesper_jewel_unified',
            nome: 'Vesper Jewel',
            img: 'assets/itens/vesper_necklace.png',
            desc: 'Universal Vesper jewel forge. Consumes one Recipe: Vesper Jewel. Pick necklace, earring, or ring.',
            ingredientes: [
                { id: 'Recipe: Vesper Jewel', qtd: 1 },
                { id: 'Ancient Coin', qtd: 1450 },
                { id: 'Adena', qtd: 3400000 },
                { id: 'Steel', qtd: 480 },
                { id: 'Cokes', qtd: 260 },
                { id: 'Leather', qtd: 380 },
                { id: 'Animal Bone', qtd: 4200 },
                { id: 'Life Stone', qtd: 30 }
            ],
            escolhasResultado: [
                { idBase: 'j_vesper_neck', tipoBase: 'jewel', label: 'Necklace' },
                { idBase: 'j_vesper_ear', tipoBase: 'jewel', label: 'Earring' },
                { idBase: 'j_vesper_ring', tipoBase: 'jewel', label: 'Ring' }
            ]
        },
        // ==========================================
        // 💎 RECEITAS ÉPICAS (JOIAS DE BOSS)
        // ==========================================
        {
            idReceita: 'rec_epic_antharas',
            itemResultado: { tipoBase: 'jewel', idBase: 'j_epic_antharas' }, // <-- O tipoBase agora é 'jewel'
            nome: 'Earring of Antharas',
            img: 'assets/itens/antharas_earring.png',
            desc: 'Forge the legendary Earth Dragon jewel. Requires fragments from the Grand Raid.',
            ingredientes: [
                { id: 'Fragment of Antharas', qtd: 130 },
                { id: 'Ancient Coin', qtd: 3400 },
                { id: 'Adena', qtd: 5500000 },
                { id: 'Steel', qtd: 400 },
                { id: 'Cokes', qtd: 120 }
            ]
        }
    ]
};

