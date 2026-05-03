// ==========================================
// SISTEMA DE HABILIDADES (SKILLS) - COMPLETO
// ==========================================

const bancoDeSkills = {
    // === NIVEL 1 (Fighter e Mage Iniciais) ===
    "Attack": { tipo: "basico", mp: 0, cd: 0, desc: "Basic attack. Essential for hunting.", cor: "#e2e8f0", icone: '<img src="assets/skills/dem_attack.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Power Strike": { tipo: "ataque", mp: 12, poder: 1.5, cd: 4000, desc: "Heavy physical strike. Damage x1.5", cor: "#ef4444", icone: '<img src="assets/skills/power_strike.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000); pointer-events: none;">' },
    "Wind Strike": { tipo: "ataque", mp: 15, poder: 1.6, cd: 4000, desc: "Hurls a sharp wind blade. Fast magic damage.", cor: "#38bdf8", icone: '<img src="assets/skills/dem_wind_strike.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },

    // === WARRIOR (Nível 20) ===
    "War Cry": { tipo: "buff_atk", mp: 25, poder: 1.2, cd: 45000, desc: "Increases Attack by 20%.", cor: "#ea580c", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(45deg); pointer-events: none;">' },
    "Lion Heart": { tipo: "buff_def", mp: 25, poder: 1.3, cd: 45000, desc: "Increases P. Def. by 30%.", cor: "#fbbf24", icone: '<img src="assets/skills/iron_skin.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) sepia(100%); pointer-events: none;">' },
    "Double Strike": { tipo: "ataque", mp: 20, poder: 2.0, cd: 6000, desc: "Fast double hit. Damage x2.0", cor: "#f87171", icone: '<img src="assets/skills/colossal_smash.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000); pointer-events: none;">' },
    "Focus Attack": { tipo: "buff_atk", mp: 30, poder: 1.15, cd: 60000, desc: "Increases attack speed by 15%.", cor: "#38bdf8", icone: '<img src="assets/skills/battle_roar.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(180deg); pointer-events: none;">' },

    // === GLADIATOR (Nível 40) ===
    "Sonic Blaster": { tipo: "ataque", mp: 35, poder: 2.8, cd: 5000, desc: "Fires blade energy.", cor: "#38bdf8", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(180deg); pointer-events: none;">' },
    "Triple Sonic Slash": { tipo: "ataque", mp: 60, poder: 4.8, cd: 12000, desc: "Three simultaneous sonic cuts.", cor: "#0284c7", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(200deg); pointer-events: none;">' },
    "Duelist Spirit": { tipo: "buff_atk", mp: 50, poder: 1.45, cd: 60000, desc: "+45% P. Atk.", cor: "#facc15", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) brightness(1.5); pointer-events: none;">' },
    "Sonic Barrier": { tipo: "buff_def", mp: 55, poder: 1.6, cd: 60000, desc: "Sonic shield. +60% defense.", cor: "#06b6d4", icone: '<img src="assets/skills/iron_will.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(120deg); pointer-events: none;">' },

    // === WARLORD (Nível 40) ===
    "Whirlwind": { tipo: "ataque_area", mp: 45, poder: 1.6, cd: 7000, desc: "Spin your weapon, hitting ALL monsters.", cor: "#fb923c", icone: '<img src="assets/skills/whirlwind.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000); pointer-events: none;">' },
    "Thunder Storm": { tipo: "ataque_area", mp: 70, poder: 2.5, cd: 14000, desc: "Area lightning burst.", cor: "#fbbf24", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 5px yellow); pointer-events: none;">' },
    "Thrill Fight": { tipo: "buff_def", mp: 55, poder: 1.55, cd: 60000, desc: "+55% defense to hold the line.", cor: "#b45309", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) sepia(100%); pointer-events: none;">' },
    "Howl": { tipo: "debuff", mp: 40, poder: 0, cd: 20000, desc: "Lowers attack of nearby monsters.", cor: "#64748b", icone: '<img src="assets/skills/hamstring.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(280deg); pointer-events: none;">' },

    // === DUELIST & DREADNOUGHT (Nível 76) ===
    "Max Sonic Slash": { tipo: "ataque_ultimate", mp: 120, poder: 8.5, cd: 120000, desc: "Supreme single-target damage. Total obliteration.", cor: "#e11d48", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(300deg); pointer-events: none;">' },
    "Earthquake": { tipo: "ataque_area", mp: 130, poder: 5.0, cd: 120000, desc: "Wrecks every monster in the area.", cor: "#78350f", icone: '<img src="assets/skills/ataque_guerreiro.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000) hue-rotate(50deg) brightness(0.8); pointer-events: none;">' },

    // === HUMAN KNIGHT, DARK AVENGER, PALADIN ===
    "Whirlwind_K": { tipo: "ataque_area", mp: 20, poder: 1.2, cd: 6000, desc: "Spin your weapon, hitting ALL monsters.", cor: "#fb923c", icone: '<img src="assets/skills/whirlwind.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Colossal Smash": { tipo: "ataque", mp: 25, poder: 2.5, cd: 8000, desc: "Brute-force blow. Damage x2.5", cor: "#ef4444", icone: '<img src="assets/skills/colossal_smash.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Battle Roar": { tipo: "buff_atk", mp: 30, poder: 1.3, cd: 30000, desc: "Increases Attack by 30%.", cor: "#facc15", icone: '<img src="assets/skills/battle_roar.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Iron Skin": { tipo: "buff_def", mp: 30, poder: 1.4, cd: 30000, desc: "Increases Defense by 40%.", cor: "#94a3b8", icone: '<img src="assets/skills/iron_skin.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Drain Health": { tipo: "ataque_cura", mp: 40, poder: 2.0, cd: 12000, desc: "Shadow damage that heals you.", cor: "#8b5cf6", icone: '<img src="assets/skills/drain_health.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Summon Panther": { tipo: "pet", mp: 80, poder: 0, cd: 120000, desc: "Summons the Black Panther to fight for you.", cor: "#111827", icone: '<img src="assets/skills/summon_panther.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Iron Will": { tipo: "buff_def", mp: 35, poder: 1.4, cd: 40000, desc: "Greatly increases M. Def.", cor: "#94a3b8", icone: '<img src="assets/skills/iron_will.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Hamstring": { tipo: "debuff", mp: 30, poder: 0, cd: 15000, desc: "Hobbles the enemy’s legs.", cor: "#64748b", icone: '<img src="assets/skills/hamstring.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Touch of Death": { tipo: "ataque_ultimate", mp: 150, poder: 8.0, cd: 120000, desc: "Supreme strike of darkness.", cor: "#7f1d1d", icone: '<img src="assets/skills/touch_of_death.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Holy Strike": { tipo: "ataque", mp: 35, poder: 2.2, cd: 8000, desc: "Smash the foe with holy power.", cor: "#fef08a", icone: '<img src="assets/skills/holy_strike.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Shield Stun": { tipo: "ataque", mp: 25, poder: 1.8, cd: 12000, desc: "Brutal shield bash.", cor: "#cbd5e1", icone: '<img src="assets/skills/shield_stun.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Holy Blessing": { tipo: "cura", mp: 50, poder: 0.3, cd: 15000, desc: "Divine light restores 30% HP.", cor: "#4ade80", icone: '<img src="assets/skills/holy_blessing.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Majesty": { tipo: "buff_def", mp: 40, poder: 1.5, cd: 40000, desc: "Greatly increases P. Def.", cor: "#fbbf24", icone: '<img src="assets/skills/majesty.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Phoenix Strike": { tipo: "ataque_ultimate", mp: 150, poder: 8.0, cd: 120000, desc: "Calls the Phoenix’s fire.", cor: "#f97316", icone: '<img src="assets/skills/phoenix_strike.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === ROGUE (Nível 20) ===
    "Mortal Strike": { tipo: "ataque", mp: 25, poder: 2.2, cd: 6000, desc: "Fast strike aimed at vitals.", cor: "#10b981", icone: '<img src="assets/skills/mortal_strike.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Vicious Stance": { tipo: "buff_atk", mp: 30, poder: 1.25, cd: 40000, desc: "Increases critical damage multiplier by 25%.", cor: "#ef4444", icone: '<img src="assets/skills/vicious_stance.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Dash": { tipo: "buff_spd", mp: 15, poder: 1.5, cd: 30000, desc: "Greatly increases move speed.", cor: "#3b82f6", icone: '<img src="assets/skills/dash.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Ultimate Evasion": { tipo: "buff_def", mp: 30, poder: 2.0, cd: 60000, desc: "Greatly increases evasion chance.", cor: "#a78bfa", icone: '<img src="assets/skills/ultimate_evasion.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === TREASURE HUNTER (Nível 40) ===
    "Deadly Blow": { tipo: "ataque", mp: 40, poder: 3.5, cd: 8000, desc: "Deadly dagger strike. Massive damage.", cor: "#059669", icone: '<img src="assets/skills/deadly_blow.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Backstab": { tipo: "ataque", mp: 50, poder: 4.5, cd: 12000, desc: "Treacherous backstab. Extreme positional damage.", cor: "#047857", icone: '<img src="assets/skills/backstab.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Fake Death": { tipo: "utilidade", mp: 20, poder: 0, cd: 60000, desc: "Play dead to drop monsters’ aggro.", cor: "#6b7280", icone: '<img src="assets/skills/fake_death.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Stealth": { tipo: "utilidade", mp: 35, poder: 0, cd: 45000, desc: "Turn invisible to non-aggressive monsters.", cor: "#4b5563", icone: '<img src="assets/skills/stealth.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === ADVENTURER (Nível 76) ===
    "Lethal Blow": { tipo: "ataque_ultimate", mp: 90, poder: 8.5, cd: 120000, desc: "Assassin's crown skill — chance of a one-hit kill.", cor: "#064e3b", icone: '<img src="assets/skills/lethal_blow.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === HAWKEYE (Nível 40) ===
    "Double Shot": { tipo: "ataque", mp: 35, poder: 2.8, cd: 6000, desc: "Fire two arrows almost at once.", cor: "#f97316", icone: '<img src="assets/skills/double_shot.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Stun Shot": { tipo: "ataque", mp: 45, poder: 3.5, cd: 12000, desc: "Heavy damage and disorients the enemy.", cor: "#facc15", icone: '<img src="assets/skills/stun_shot.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Snipe": { tipo: "buff_atk", mp: 40, poder: 1.4, cd: 60000, desc: "Elite marksman stance. +40% P. Atk.", cor: "#ef4444", icone: '<img src="assets/skills/snipe.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Rapid Shot": { tipo: "buff_spd", mp: 30, poder: 1.3, cd: 60000, desc: "Greatly increases attack speed.", cor: "#3b82f6", icone: '<img src="assets/skills/rapid_shot.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === SAGITTARIUS (Nível 76) ===
    "Death Shot": { tipo: "ataque_ultimate", mp: 110, poder: 8.5, cd: 120000, desc: "The arrow of annihilation. Devastating damage.", cor: "#b91c1c", icone: '<img src="assets/skills/death_shot.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === HUMAN WIZARD (Nível 20) ===
    "Aura Burn": { tipo: "ataque", mp: 25, poder: 2.2, cd: 3000, desc: "Burn the target with an energy blast.", cor: "#facc15", icone: '<img src="assets/skills/aura_burn.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Vampiric Touch": { tipo: "ataque_cura", mp: 35, poder: 1.8, cd: 8000, desc: "Steals life force to heal your HP.", cor: "#ef4444", icone: '<img src="assets/skills/vampiric_touch.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Concentration": { tipo: "buff_spd", mp: 30, poder: 1.3, cd: 60000, desc: "Greatly increases cast speed.", cor: "#a855f7", icone: '<img src="assets/skills/concentration.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Flame Strike": { tipo: "ataque_area", mp: 45, poder: 1.5, cd: 10000, desc: "Rain of fire on all monsters.", cor: "#f97316", icone: '<img src="assets/skills/flame_strike.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === NECROMANCER (Nível 40) ===
    "Death Spike": { tipo: "ataque", mp: 50, poder: 3.8, cd: 5000, desc: "Bone spike. Extreme shadow damage.", cor: "#7e22ce", icone: '<img src="assets/skills/death_spike.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Summon Zombie": { tipo: "pet", mp: 80, poder: 0, cd: 120000, desc: "Raises an undead to fight beside you.", cor: "#65a30d", icone: '<img src="assets/skills/summon_zombie.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Curse Gloom": { tipo: "debuff", mp: 40, poder: 0, cd: 15000, desc: "Severely lowers the enemy’s M. Def.", cor: "#4c1d95", icone: '<img src="assets/skills/curse_gloom.png" style="width: 35px; height: 35px; object-fit: contain;">' },
    "Corpse Burst": { tipo: "ataque_area", mp: 75, poder: 3.0, cd: 12000, desc: "Detonates corpses for massive area damage.", cor: "#991b1b", icone: '<img src="assets/skills/corpse_burst.png" style="width: 35px; height: 35px; object-fit: contain;">' },

    // === SOULTAKER (Nível 76) ===
    "Gehenna": { tipo: "ataque_ultimate", mp: 150, poder: 9.0, cd: 120000, desc: "Calls the abyss. Catastrophic damage.", cor: "#000000", icone: '<img src="assets/skills/gehenna.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 5px red);">' },

    // === SORCERER (Nível 40) - [4 SKILLS] ===
    "Prominence": { 
        tipo: "ataque", mp: 55, poder: 4.0, cd: 4000, desc: "Hurls a concentrated fire sphere. Massive magic damage.", cor: "#ef4444", 
        icone: '<img src="assets/skills/prominence.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 5px red);">' 
    },
    "Blazing Circle": { 
        tipo: "ataque_area", mp: 80, poder: 2.8, cd: 10000, desc: "A ring of fire expands, burning ALL monsters.", cor: "#f97316", 
        icone: '<img src="assets/skills/blazing_circle.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },
    "Surrender To Fire": { 
        tipo: "debuff", mp: 40, poder: 0, cd: 15000, desc: "Shatters the target’s fire resistance, lowering M. Def.", cor: "#fca5a5", 
        icone: '<img src="assets/skills/surrender_fire.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },
    "Sleeping Cloud": { 
        tipo: "utilidade", mp: 50, poder: 0, cd: 45000, desc: "Magical mist that puts monsters to sleep — they lose sight of you.", cor: "#cbd5e1", 
        icone: '<img src="assets/skills/sleeping_cloud.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },

    // === ARCHMAGE (Nível 76) - [1 SKILL ULTIMATE] ===
    "Volcano": { 
        tipo: "ataque_ultimate", mp: 160, poder: 9.5, cd: 120000, desc: "Summons a volcano under the enemy. Total fiery obliteration.", cor: "#7f1d1d", 
        icone: '<img src="assets/skills/volcano.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 8px orange);">' 
    },
    // === WARLOCK (Nível 40) - [4 SKILLS] ===
    "Summon Kai the Cat": { 
        tipo: "pet", mp: 60, poder: 0, cd: 120000, desc: "Summons Kai the Cat — a swift, lethal magical feline that fights for you.", cor: "#ca8a04", 
        icone: '<img src="assets/skills/kai_cat.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 5px yellow);">' 
    },
    "Servitor Heal": { 
        tipo: "cura", mp: 40, poder: 0.6, cd: 12000, desc: "Channels magic to heal you and your servitor quickly.", cor: "#22c55e", 
        icone: '<img src="assets/skills/servitor_heal.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },
    "Servitor Physical Buff": { 
        tipo: "buff_atk", mp: 45, poder: 1.5, cd: 30000, desc: "Greatly boosts your servitor’s damage and Fury (and yours).", cor: "#f97316", 
        icone: '<img src="assets/skills/servitor_buff.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },
    "Wind Shackle": { 
        tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Cuts the winds around the enemy, greatly slowing attack speed.", cor: "#94a3b8", 
        icone: '<img src="assets/skills/wind_shackle.png" style="width: 35px; height: 35px; object-fit: contain;">' 
    },

    // === ARCANE LORD (Nível 76) - [1 SKILL ULTIMATE] ===
    "Summon Feline King": { 
        tipo: "pet", mp: 150, poder: 0, cd: 120000, desc: "Summons the Feline King — a giant beast with devastating claws.", cor: "#b91c1c", 
        icone: '<img src="assets/skills/feline_king.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 8px red);">' 
    },
    // === CLERIC, BISHOP E CARDINAL (Linha Sagrada) ===
    "Divine Flash": { 
        tipo: "ataque", mp: 30, poder: 1.8, cd: 3000, desc: "Fires pure light energy at the enemy.", cor: "#fef08a", 
        icone: '<span style="font-size:24px; filter: drop-shadow(0 0 5px yellow);">✨</span>' 
    },
    "Greater Heal": { 
        tipo: "cura", mp: 50, poder: 0.6, cd: 8000, desc: "Divine heal that restores 60% of max HP.", cor: "#22c55e", 
        icone: '<span style="font-size:24px; filter: drop-shadow(0 0 5px green);">💚</span>' 
    },
    "Trance": { 
        tipo: "utilidade", mp: 35, poder: 0, cd: 15000, desc: "Sacred chant that puts the target in deep magical sleep.", cor: "#d8b4fe", 
        icone: '<span style="font-size:24px; filter: drop-shadow(0 0 5px purple);">💤</span>' 
    },
    "Holy Armor": { 
        tipo: "buff_def", mp: 40, poder: 1.8, cd: 30000, desc: "Blesses armor, greatly increasing P. Def.", cor: "#facc15", 
        icone: '<span style="font-size:24px; filter: drop-shadow(0 0 5px gold);">🛡️</span>' 
    },
    "Miracle": { 
        tipo: "cura", mp: 150, poder: 1.0, cd: 60000, desc: "The ultimate miracle. Restores 100% HP instantly.", cor: "#10b981", 
        icone: '<span style="font-size:24px; filter: drop-shadow(0 0 8px white);">🕊️</span>' 
    },
    // === MAGIAS COMPLEMENTARES DA LINHA SAGRADA ===
    "Might": { 
        tipo: "buff_atk", mp: 25, poder: 1.15, cd: 30000, desc: "Blesses the target, increasing P. Atk.", cor: "#dc2626", 
        icone: '<span style="font-size:24px;">💪</span>' 
    },
    "Wind Walk": { 
        tipo: "buff_spd", mp: 25, poder: 1.2, cd: 30000, desc: "Call the winds to increase your speed.", cor: "#a3e635", 
        icone: '<span style="font-size:24px;">🏃</span>' 
    },
    "Major Heal": { 
        tipo: "cura", mp: 80, poder: 0.8, cd: 10000, desc: "Advanced sacred heal. Restores 80% of max HP.", cor: "#16a34a", 
        icone: '<span style="font-size:24px;">💖</span>' 
    },
    "Dryad Root": { 
        tipo: "debuff", mp: 30, poder: 0, cd: 15000, desc: "Summons magical roots that pin the monster to the ground.", cor: "#854d0e", 
        icone: '<span style="font-size:24px;">🌿</span>' 
    },
    // Ícones de skill set `dem_*`: PNG **256×256** quadrado; moldura unificada §11.3 (.cursor/rules).
    "Mortal Blow": { tipo: "ataque", mp: 15, poder: 1.8, cd: 4000, desc: "Precise dagger strike.", cor: "#9ca3af", icone: '<span style="font-size:24px;">🗡️</span>' },
    "Hex": { tipo: "debuff", mp: 25, poder: 0, cd: 15000, desc: "Curses the target, drastically lowering defense.", cor: "#7e22ce", icone: '<span style="font-size:24px;">📉</span>' },
    "Deadly Blow": { tipo: "ataque", mp: 35, poder: 2.8, cd: 6000, desc: "Deep lethal strike from the shadows.", cor: "#4b5563", icone: '<span style="font-size:24px;">🔪</span>' },
    "Lethal Blow": { tipo: "ataque", mp: 60, poder: 4.5, cd: 10000, desc: "Supreme assassination technique.", cor: "#111827", icone: '<span style="font-size:24px;">☠️</span>' },

    "Twister": { tipo: "ataque", mp: 25, poder: 1.5, cd: 3000, desc: "Hurls a cutting wind vortex.", cor: "#10b981", icone: '<img src="assets/skills/dem_twister.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Shadow Spark": { tipo: "ataque", mp: 30, poder: 1.7, cd: 4000, desc: "Fires a sphere of pure darkness.", cor: "#6b21a8", icone: '<img src="assets/skills/dem_shadow_spark.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Hurricane": { tipo: "ataque", mp: 50, poder: 2.5, cd: 5000, desc: "Summons a devastating hurricane.", cor: "#059669", icone: '<img src="assets/skills/dem_hurricane.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Demon Wind": { tipo: "ataque", mp: 90, poder: 3.8, cd: 8000, desc: "Abyss wind. Total destruction.", cor: "#047857", icone: '<img src="assets/skills/dem_demon_wind.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    // === COMPLETANDO O ARSENAL ASSASSIN (Lvl 20) ===
    "Sting": { tipo: "ataque", mp: 20, poder: 2.0, cd: 4000, desc: "Bloody, painful dagger attack.", cor: "#991b1b", icone: '<span style="font-size:24px;">🩸</span>' },
    "Ultimate Evasion": { tipo: "buff_def", mp: 30, poder: 1.5, cd: 30000, desc: "Greatly increases evasion and defense.", cor: "#d97706", icone: '<span style="font-size:24px;">💨</span>' },

    // === COMPLETANDO O ARSENAL ABYSS WALKER (Lvl 40) ===
    "Focus Death": { tipo: "buff_atk", mp: 40, poder: 1.8, cd: 30000, desc: "Focuses on vitals, massively increasing damage.", cor: "#1f2937", icone: '<span style="font-size:24px;">🎯</span>' },
    "Blinding Blow": { tipo: "ataque", mp: 45, poder: 3.2, cd: 6000, desc: "Fast strike that disorients the enemy.", cor: "#facc15", icone: '<span style="font-size:24px;">⚡</span>' },
    "Silent Move": { tipo: "utilidade", mp: 30, poder: 0, cd: 20000, desc: "Perfect camouflage. Monsters lose track of you.", cor: "#4b5563", icone: '<span style="font-size:24px;">🥷</span>' },

    // === COMPLETANDO O ARSENAL DARK WIZARD (Lvl 20) ===
    "Vampiric Touch": { tipo: "ataque", mp: 35, poder: 2.2, cd: 5000, desc: "Overwhelming blood magic.", cor: "#be123c", icone: '<img src="assets/skills/dem_vampiric_touch.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Curse Weakness": { tipo: "debuff", mp: 25, poder: 0, cd: 15000, desc: "Weakens the enemy’s structure.", cor: "#4c1d95", icone: '<img src="assets/skills/dem_curse_weakness.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },

    // === COMPLETANDO O ARSENAL SPELLHOWLER (Lvl 40) ===
    "Death Spike": { tipo: "ataque", mp: 45, poder: 2.8, cd: 4000, desc: "Hurls a cursed piercing bone at the target.", cor: "#d1d5db", icone: '<img src="assets/skills/dem_death_spike.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Shadow Flare": { tipo: "ataque", mp: 60, poder: 3.5, cd: 6000, desc: "A blast of shadow under the enemy’s feet.", cor: "#312e81", icone: '<img src="assets/skills/dem_shadow_flare.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Silence": { tipo: "utilidade", mp: 40, poder: 0, cd: 20000, desc: "Fully seals the monster’s skills.", cor: "#1e3a8a", icone: '<img src="assets/skills/dem_silence.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },

    // === ARQUEIROS DARK ELVES (Palus Ranger - Lvl 20) ===
    "Power Shot": { tipo: "ataque", mp: 18, poder: 1.8, cd: 4000, desc: "A fast, powerful shot.", cor: "#9ca3af", icone: '<span style="font-size:24px;">🏹</span>' },
    "Poison Arrow": { tipo: "debuff", mp: 25, poder: 0, cd: 12000, desc: "Poisons and corrodes the enemy’s armor.", cor: "#10b981", icone: '<span style="font-size:24px;">🧪</span>' },
    "Vicious Stance": { tipo: "buff_atk", mp: 30, poder: 1.3, cd: 30000, desc: "Increases attack power and crit chance.", cor: "#ef4444", icone: '<span style="font-size:24px;">💢</span>' },
    "Freezing Strike": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Freezes the enemy’s legs, slowing attacks.", cor: "#3b82f6", icone: '<span style="font-size:24px;">❄️</span>' },

    // === ARQUEIROS DARK ELVES (Phantom Ranger - Lvl 40) ===
    "Lethal Shot": { tipo: "ataque", mp: 40, poder: 2.8, cd: 5000, desc: "A lethal shot to the target’s vitals.", cor: "#4b5563", icone: '<span style="font-size:24px;">🎯</span>' },
    "Fatal Counter": { tipo: "ataque", mp: 55, poder: 3.5, cd: 8000, desc: "Desperate attack of extreme physical power.", cor: "#7f1d1d", icone: '<span style="font-size:24px;">💥</span>' },
    "Dead Eye": { tipo: "buff_atk", mp: 60, poder: 2.0, cd: 40000, desc: "Total focus that absurdly multiplies bow damage.", cor: "#111827", icone: '<span style="font-size:24px;">👁️‍🗨️</span>' },
    "Stun Shot": { tipo: "utilidade", mp: 45, poder: 0, cd: 18000, desc: "Crushing impact arrow that stuns the target.", cor: "#f59e0b", icone: '<span style="font-size:24px;">💫</span>' },

    // === ARQUEIROS DARK ELVES (Ghost Sentinel - Lvl 76) ===
    "Seven Arrows": { tipo: "ataque", mp: 90, poder: 5.0, cd: 12000, desc: "Supreme technique: fires 7 simultaneous arrows of pure hate.", cor: "#3730a3", icone: '<span style="font-size:24px;">🌠</span>' },

    // === DARK ELVES (Palus Knight - Lvl 20) ===
    "Dark Strike": { tipo: "ataque", mp: 20, poder: 1.6, cd: 4000, desc: "A heavy blow imbued with dark magic.", cor: "#374151", icone: '<span style="font-size:24px;">🗡️</span>' },
    "Sting": { tipo: "ataque", mp: 25, poder: 1.8, cd: 6000, desc: "Deep cut that causes bleeding.", cor: "#b91c1c", icone: '<span style="font-size:24px;">🩸</span>' },
    "Hex": { tipo: "debuff", mp: 30, poder: 0, cd: 15000, desc: "Curse that shatters the enemy’s armor.", cor: "#6d28d9", icone: '<span style="font-size:24px;">🔮</span>' },
    "Freezing Strike": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Freezes the enemy, lowering attack power.", cor: "#3b82f6", icone: '<span style="font-size:24px;">❄️</span>' },

    // === DARK ELVES (Bladedancer - Lvl 40) ===
    "Fatal Strike": { tipo: "ataque", mp: 40, poder: 2.5, cd: 5000, desc: "Devastating frontal attack with both swords.", cor: "#991b1b", icone: '<span style="font-size:24px;">⚔️</span>' },
    "Dance of Fire": { tipo: "buff_atk", mp: 50, poder: 1.5, cd: 30000, desc: "Dance that multiplies strength and crit damage.", cor: "#ea580c", icone: '<span style="font-size:24px;">🔥</span>' },
    "Dance of Warrior": { tipo: "buff_atk", mp: 50, poder: 1.5, cd: 30000, desc: "Dance that massively increases P. Atk.", cor: "#b45309", icone: '<span style="font-size:24px;">💪</span>' },
    "Poison Dance": { tipo: "debuff", mp: 45, poder: 0, cd: 15000, desc: "Toxic dance that weakens the target’s defense.", cor: "#10b981", icone: '<span style="font-size:24px;">🐍</span>' },

    // === DARK ELVES (Spectral Dancer - Lvl 76) ===
    "Symphony of Blades": { tipo: "ataque", mp: 80, poder: 4.8, cd: 10000, desc: "Supreme technique: a blade tornado that shreds the enemy.", cor: "#4c1d95", icone: '<span style="font-size:24px;">🌪️</span>' },
    
    // === DARK ELVES (Shillien Knight - Lvl 40) ===
    "Vampiric Touch": { tipo: "ataque_cura", mp: 45, poder: 2.0, cd: 8000, desc: "Dark magic that drains the enemy’s life to heal you.", cor: "#9f1239", icone: '<img src="assets/skills/dem_vampiric_touch.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Shield Stun": { tipo: "ataque", mp: 30, poder: 1.5, cd: 12000, desc: "Brutal shield bash that stuns the target.", cor: "#eab308", icone: '<span style="font-size:24px;">🛡️</span>' },
    "Ultimate Defense": { tipo: "buff_def", mp: 50, poder: 2.5, cd: 60000, desc: "Wall stance: massively raises P. Def. for 30s.", cor: "#1e3a8a", icone: '<span style="font-size:24px;">🏰</span>' },
    "Lightning Strike": { tipo: "ataque", mp: 60, poder: 3.0, cd: 15000, desc: "Summons devastating black lightning to punish the enemy.", cor: "#a855f7", icone: '<span style="font-size:24px;">⚡</span>' },

    // === DARK ELVES (Shillien Templar - Lvl 76) ===
    "Touch of Death": { tipo: "ataque_ultimate", mp: 100, poder: 4.5, cd: 20000, desc: "Supreme technique: lethal curse dealing massive dark damage.", cor: "#450a0a", icone: '<span style="font-size:24px;">☠️</span>' },
    // === DARK ELVES (Phantom Summoner - Lvl 40) ===
    "Summon Silhouette": { tipo: "pet", mp: 60, poder: 1.0, cd: 60000, desc: "Summons a lethal twin-blade shadow to fight beside you for 2 minutes.", cor: "#475569", icone: '<span style="font-size:24px;">👤</span>' },
    "Corpse Burst": { tipo: "ataque_area", mp: 45, poder: 1.8, cd: 12000, desc: "Profane magic: dark energy explosion hitting all enemies.", cor: "#991b1b", icone: '<span style="font-size:24px;">💥</span>' },
    "Curse Gloom": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Shadow curse that corrodes 30% of the enemy’s defense.", cor: "#1e3a8a", icone: '<span style="font-size:24px;">🌑</span>' },
    "Servitor Empowerment": { tipo: "buff_atk", mp: 50, poder: 1.5, cd: 40000, desc: "Injects dark energy, massively raising your M. Atk.", cor: "#7e22ce", icone: '<span style="font-size:24px;">💉</span>' },

    // === DARK ELVES (Spectral Master - Lvl 76) ===
    "Summon Spectral Lord": { tipo: "pet", mp: 120, poder: 1.0, cd: 60000, desc: "Summons the supreme Spectral Lord — devastating damage demon.", cor: "#334155", icone: '<span style="font-size:24px;">🗡️</span>' },
    // === DARK ELVES (Shillien Elder - Lvl 40) ===
    "Greater Heal": { tipo: "cura", mp: 60, poder: 0.5, cd: 8000, desc: "Restores 50% max HP with divine power.", cor: "#22c55e", icone: '<span style="font-size:24px;">💚</span>' },
    "Empower": { tipo: "buff_atk", mp: 50, poder: 1.6, cd: 40000, desc: "Greatly increases M. Atk. for 30s.", cor: "#1d4ed8", icone: '<span style="font-size:24px;">🔮</span>' },
    "Dryad Root": { tipo: "debuff", mp: 40, poder: 0, cd: 15000, desc: "Pins the monster with magic roots, slowing attacks.", cor: "#a3e635", icone: '<span style="font-size:24px;">🌿</span>' },
    "Trance": { tipo: "utilidade", mp: 35, poder: 0, cd: 20000, desc: "Puts the monster in a brief deep sleep, stopping attacks.", cor: "#c084fc", icone: '<span style="font-size:24px;">💤</span>' },

    // === DARK ELVES (Shillien Saint - Lvl 76) ===
    "Prophecy of Wind": { tipo: "buff_spd", mp: 100, poder: 1.6, cd: 60000, desc: "Supreme buff: massively increases physical/magic attack speed.", cor: "#06b6d4", icone: '<span style="font-size:24px;">🌪️</span>' },
    // === ELFOS DA LUZ (Elven Knight - Lvl 20) ===
    "Ice Strike": { tipo: "ataque", mp: 30, poder: 1.5, cd: 8000, desc: "Cutting attack imbued with ice magic.", cor: "#38bdf8", icone: '<span style="font-size:24px;">❄️</span>' },
    "Elemental Heal": { tipo: "cura", mp: 40, poder: 0.3, cd: 10000, desc: "Quickly heals wounds with nature magic (30% HP).", cor: "#4ade80", icone: '<span style="font-size:24px;">🌿</span>' },
    "Deflect Arrow": { tipo: "buff_def", mp: 25, poder: 1.5, cd: 30000, desc: "Raises P. Def. against ranged and melee attacks.", cor: "#94a3b8", icone: '<span style="font-size:24px;">🛡️</span>' },
    "Entangle": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Tangles the enemy’s feet in vines, lowering defense and speed.", cor: "#166534", icone: '<span style="font-size:24px;">🌱</span>' },

    // === ELFOS DA LUZ (Temple Knight - Lvl 40) ===
    "Tribunal": { tipo: "ataque", mp: 45, poder: 2.2, cd: 12000, desc: "Holy strike dealing high physical and magic damage together.", cor: "#facc15", icone: '<span style="font-size:24px;">⚖️</span>' },
    "Summon Storm Cubic": { tipo: "pet", mp: 60, poder: 1.0, cd: 60000, desc: "Summons a Storm Cubic that auto-fires lightning at the target.", cor: "#0284c7", icone: '<span style="font-size:24px;">🧊</span>' },
    "Aegis Stance": { tipo: "buff_def", mp: 50, poder: 2.0, cd: 45000, desc: "Raises the shield on all sides, doubling defense briefly.", cor: "#1e3a8a", icone: '<span style="font-size:24px;">🏰</span>' },
    "Arrest": { tipo: "debuff", mp: 40, poder: 0, cd: 20000, desc: "Holy magic pins the monster to the ground (same idea as Dryad Root).", cor: "#eab308", icone: '<span style="font-size:24px;">⛓️</span>' },

    // === ELFOS DA LUZ (Eva's Templar - Lvl 76) ===
    "Shield of Faith": { tipo: "buff_def", mp: 100, poder: 3.5, cd: 60000, desc: "Supreme power: makes the knight nearly immune to physical damage for 30s.", cor: "#fef08a", icone: '<span style="font-size:24px;">👼</span>' },
    // === ELFOS DA LUZ (Swordsinger - Lvl 40) ===
    "Sword Symphony": { tipo: "ataque_area", mp: 45, poder: 1.8, cd: 12000, desc: "Channels blade energy into a sonic wave hitting all enemies.", cor: "#c084fc", icone: '<span style="font-size:24px;">🎵</span>' },
    "Song of Earth": { tipo: "buff_def", mp: 40, poder: 1.5, cd: 40000, desc: "Sings the song of earth, greatly raising P. Def. for 30s.", cor: "#15803d", icone: '<span style="font-size:24px;">🌍</span>' },
    "Song of Hunter": { tipo: "buff_atk", mp: 45, poder: 1.6, cd: 40000, desc: "Hunter’s song increases attack power and lethal precision.", cor: "#ea580c", icone: '<span style="font-size:24px;">🏹</span>' },
    "Song of Wind": { tipo: "buff_spd", mp: 50, poder: 1.5, cd: 40000, desc: "Song of winds greatly increases attack speed.", cor: "#38bdf8", icone: '<span style="font-size:24px;">🌪️</span>' },

    // === ELFOS DA LUZ (Sword Muse - Lvl 76) ===
    "Song of Champion": { tipo: "buff_atk", mp: 90, poder: 2.5, cd: 60000, desc: "Supreme symphony: massive boost to all offensive stats.", cor: "#facc15", icone: '<span style="font-size:24px;">👑</span>' },
    // === ELFOS DA LUZ (Elven Scout - Lvl 20) ===
    "Mortal Blow": { tipo: "ataque", mp: 25, poder: 1.5, cd: 8000, desc: "Fatal dagger strike dealing heavy damage.", cor: "#9ca3af", icone: '<span style="font-size:24px;">🗡️</span>' },
    "Sprint": { tipo: "buff_spd", mp: 20, poder: 1.5, cd: 30000, desc: "Greatly increases attack and movement speed.", cor: "#3b82f6", icone: '<span style="font-size:24px;">🏃</span>' },
    "Poison Arrow": { tipo: "debuff", mp: 30, poder: 0, cd: 15000, desc: "Fires a toxic arrow that poisons the target, draining HP over time.", cor: "#10b981", icone: '<span style="font-size:24px;">🏹</span>' },
    "Ultimate Evasion": { tipo: "buff_def", mp: 40, poder: 2.0, cd: 45000, desc: "Supreme evasion. Nearly untouchable — doubles defense briefly.", cor: "#fcd34d", icone: '<span style="font-size:24px;">💨</span>' },

    // === ELFOS DA LUZ (Plains Walker - Lvl 40) ===
    "Deadly Blow": { tipo: "ataque", mp: 40, poder: 2.2, cd: 10000, desc: "Deadly strike that finds the enemy’s weak point.", cor: "#ef4444", icone: '<span style="font-size:24px;">🩸</span>' },
    "Backstab": { tipo: "ataque", mp: 50, poder: 3.0, cd: 12000, desc: "Sneak attack with extremely high damage.", cor: "#1f2937", icone: '<span style="font-size:24px;">🥷</span>' },
    "Sand Bomb": { tipo: "debuff", mp: 35, poder: 0, cd: 20000, desc: "Throws sand in the monster’s eyes, lowering accuracy and attack power.", cor: "#d97706", icone: '<span style="font-size:24px;">⏳</span>' },
    "Focus Death": { tipo: "buff_atk", mp: 45, poder: 1.8, cd: 40000, desc: "Lethal focus. Massively increases all your attack power.", cor: "#b91c1c", icone: '<span style="font-size:24px;">👁️</span>' },

    // === ELFOS DA LUZ (Wind Rider - Lvl 76) ===
    "Lethal Blow": { tipo: "ataque", mp: 80, poder: 4.5, cd: 20000, desc: "The winds’ ultimate strike. Catastrophic physical damage.", cor: "#14532d", icone: '<span style="font-size:24px;">🌪️</span>' },
    // === ELFOS DA LUZ (Silver Ranger - Lvl 40) ===
    "Double Shot": { tipo: "ataque", mp: 40, poder: 2.2, cd: 10000, desc: "Fires two arrows in a row with lethal precision.", cor: "#9ca3af", icone: '<span style="font-size:24px;">🏹</span>' },
    "Burst Shot": { tipo: "ataque_area", mp: 50, poder: 1.8, cd: 15000, desc: "Fires an explosive arrow hitting multiple enemies in the area.", cor: "#ef4444", icone: '<span style="font-size:24px;">💥</span>' },
    "Rapid Shot": { tipo: "buff_spd", mp: 45, poder: 1.8, cd: 40000, desc: "Greatly increases bow firing speed.", cor: "#38bdf8", icone: '<span style="font-size:24px;">⚡</span>' },
    "Stun Shot": { tipo: "debuff", mp: 40, poder: 0, cd: 20000, desc: "A heavy shot that stuns the target, stopping it from acting.", cor: "#facc15", icone: '<span style="font-size:24px;">💫</span>' },

    // === ELFOS DA LUZ (Moonlight Sentinel - Lvl 76) ===
    "Seven Arrow": { tipo: "ataque", mp: 80, poder: 4.5, cd: 20000, desc: "Legendary technique: a hail of seven light arrows. Devastating damage.", cor: "#fef08a", icone: '<span style="font-size:24px;">🌟</span>' },
    // === ELFOS DA LUZ (Elven Wizard - Lvl 20) ===
    "Aqua Swirl": { tipo: "ataque", mp: 30, poder: 1.5, cd: 8000, desc: "Creates a water vortex that strikes the enemy.", cor: "#38bdf8", icone: '<span style="font-size:24px;">🌊</span>' },
    "Freezing Strike": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Freezes the enemy, drastically lowering attack power.", cor: "#0ea5e9", icone: '<span style="font-size:24px;">❄️</span>' },
    "Solar Flare": { tipo: "ataque", mp: 35, poder: 1.6, cd: 10000, desc: "Fires a burst of divine light that briefly blinds the target.", cor: "#fef08a", icone: '<span style="font-size:24px;">☀️</span>' },
    "Concentration": { tipo: "buff_def", mp: 40, poder: 1.5, cd: 30000, desc: "Raises resistance to stop cast interruption.", cor: "#a78bfa", icone: '<span style="font-size:24px;">🧘</span>' },

    // === ELFOS DA LUZ (Spellsinger - Lvl 40) ===
    "Hydro Blast": { tipo: "ataque", mp: 55, poder: 2.5, cd: 12000, desc: "Fires a jet of extremely high-pressure water.", cor: "#0284c7", icone: '<span style="font-size:24px;">💧</span>' },
    "Frost Wall": { tipo: "ataque_area", mp: 65, poder: 2.0, cd: 15000, desc: "Raises an ice wall that explodes, hitting multiple enemies.", cor: "#7dd3fc", icone: '<span style="font-size:24px;">🧊</span>' },
    "Surrender To Water": { tipo: "debuff", mp: 45, poder: 0, cd: 20000, desc: "Shatters the monster’s resistance to water magic (breaks defense).", cor: "#1d4ed8", icone: '<span style="font-size:24px;">🌊</span>' },
    "Seed of Water": { tipo: "buff_atk", mp: 50, poder: 1.8, cd: 40000, desc: "Infuses your body with water power, massively increasing magic damage.", cor: "#0ea5e9", icone: '<span style="font-size:24px;">🌱</span>' },

    // === ELFOS DA LUZ (Mystic Muse - Lvl 76) ===
    "Ice Vortex": { tipo: "ataque", mp: 90, poder: 4.5, cd: 20000, desc: "Absolute-zero vortex that freezes and annihilates the target.", cor: "#bae6fd", icone: '<span style="font-size:24px;">🌪️</span>' },
    // === ELFOS DA LUZ (Elemental Summoner - Lvl 40) ===
    "Summon Mirage the Unicorn": { tipo: "pet", mp: 60, poder: 1.0, cd: 60000, desc: "Summons the Mirage Unicorn to attack with magic bursts.", cor: "#38bdf8", icone: '<span style="font-size:24px;">🦄</span>' },
    "Summon Aqua Cubic": { tipo: "pet", mp: 40, poder: 1.0, cd: 60000, desc: "Summons an autonomous water cubic that shoots ice at enemies.", cor: "#0284c7", icone: '<span style="font-size:24px;">🧊</span>' },
    "Wind Shackle": { tipo: "debuff", mp: 45, poder: 0, cd: 20000, desc: "Wind chains slow movement and reduce the enemy’s strength.", cor: "#94a3b8", icone: '<span style="font-size:24px;">⛓️‍💥</span>' },
    "Servitor Empowerment": { tipo: "buff_atk", mp: 50, poder: 1.8, cd: 40000, desc: "Channels pure elemental energy, massively raising M. Atk.", cor: "#818cf8", icone: '<span style="font-size:24px;">⚡</span>' },

    // === ELFOS DA LUZ (Elemental Master - Lvl 76) ===
    "Summon Magnus the Unicorn": { tipo: "pet", mp: 100, poder: 1.0, cd: 60000, desc: "Summons Magnus, King of Unicorns — magic attacks are devastating.", cor: "#4f46e5", icone: '<span style="font-size:24px;">👑</span>' },
    // === ELFOS DA LUZ (Elven Oracle - Lvl 20) ===
    "Wind Strike": { tipo: "ataque", mp: 25, poder: 1.5, cd: 8000, desc: "Basic wind-element damage spell.", cor: "#a7f3d0", icone: '<img src="assets/skills/dem_wind_strike.png" alt="" style="width:35px;height:35px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,0.9));">' },
    "Light Heal": { tipo: "cura", mp: 30, poder: 0.3, cd: 10000, desc: "Uses divine magic to heal 30% of your HP.", cor: "#4ade80", icone: '<span style="font-size:24px;">✨</span>' },
    "Recharge": { tipo: "cura_mp", mp: 0, poder: 0.4, cd: 15000, desc: "The famous mana battery. Restores 40% of max MP. (No MP cost!)", cor: "#60a5fa", icone: '<span style="font-size:24px;">🔋</span>' },
    "Holy Armor": { tipo: "buff_def", mp: 35, poder: 1.5, cd: 30000, desc: "Blesses your armor, raising physical defense.", cor: "#fef08a", icone: '<span style="font-size:24px;">🛡️</span>' },

    // === ELFOS DA LUZ (Elven Elder - Lvl 40) ===
    "Might of Heaven": { tipo: "ataque", mp: 45, poder: 2.2, cd: 12000, desc: "Calls down a pillar of divine light dealing severe damage.", cor: "#fde047", icone: '<span style="font-size:24px;">⚡</span>' },
    "Greater Heal": { tipo: "cura", mp: 60, poder: 0.6, cd: 12000, desc: "Powerful divine heal that restores 60% of your HP.", cor: "#22c55e", icone: '<span style="font-size:24px;">💖</span>' },
    "Advanced Recharge": { tipo: "cura_mp", mp: 0, poder: 0.7, cd: 20000, desc: "Instantly restores 70% of your mana bar.", cor: "#2563eb", icone: '<span style="font-size:24px;">⚡🔋</span>' },
    "Agility": { tipo: "buff_spd", mp: 40, poder: 1.5, cd: 40000, desc: "Blesses your legs, increasing cast and attack speed.", cor: "#38bdf8", icone: '<span style="font-size:24px;">👟</span>' },

    // === ELFOS DA LUZ (Eva's Saint - Lvl 76) ===
    "Prophecy of Water": { tipo: "buff_atk", mp: 100, poder: 3.0, cd: 60000, desc: "Eva’s final blessing. Multiplies magic and physical power to colossal levels.", cor: "#0284c7", icone: '<span style="font-size:24px;">🌊👼</span>' },
    // === ORCS (Orc Raider - Lvl 20) ===
    "Power Smash": { tipo: "ataque", mp: 25, poder: 1.8, cd: 8000, desc: "Crushing weapon strike focused on raw physical force.", cor: "#f87171", icone: '<span style="font-size:24px;">💥</span>' },
    "Whirlwind": { tipo: "ataque_area", mp: 35, poder: 1.5, cd: 15000, desc: "Spins your weapon like a tornado, hitting all nearby enemies.", cor: "#ef4444", icone: '<span style="font-size:24px;">🌪️</span>' },
    "War Cry": { tipo: "buff_atk", mp: 30, poder: 1.5, cd: 40000, desc: "Intimidating battle cry that raises attack power.", cor: "#dc2626", icone: '<span style="font-size:24px;">🗣️</span>' },
    "Lionheart": { tipo: "buff_def", mp: 35, poder: 1.5, cd: 40000, desc: "Lion heart. Ignores fear and raises resist and P. Def.", cor: "#facc15", icone: '<span style="font-size:24px;">🦁</span>' },

    // === ORCS (Destroyer - Lvl 40) ===
    "Fatal Strike": { tipo: "ataque", mp: 45, poder: 2.5, cd: 10000, desc: "Lethal strike that cleaves the target’s armor.", cor: "#991b1b", icone: '<span style="font-size:24px;">🪓</span>' },
    "Crush of Doom": { tipo: "ataque", mp: 55, poder: 3.2, cd: 15000, desc: "Apocalyptic overhead smash. Massive damage.", cor: "#7f1d1d", icone: '<span style="font-size:24px;">🔨</span>' },
    "Frenzy": { tipo: "buff_atk", mp: 50, poder: 2.5, cd: 60000, desc: "Blind rage! Multiplies attack (colossal damage if HP is below 30%).", cor: "#b91c1c", icone: '<span style="font-size:24px;">🩸</span>' },
    "Guts": { tipo: "buff_def", mp: 50, poder: 3.0, cd: 60000, desc: "Survival instinct. Multiplies P. Def. to absurd levels.", cor: "#450a0a", icone: '<span style="font-size:24px;">🛡️</span>' },

    // === ORCS (Titan - Lvl 76) ===
    "Earthquake": { tipo: "ataque_area", mp: 80, poder: 4.5, cd: 20000, desc: "Slams the weapon into the ground, causing an earthquake that wipes multiple enemies.", cor: "#78350f", icone: '<span style="font-size:24px;">🌋</span>' },
    // === ORCS (Monk - Lvl 20) ===
    "Iron Punch": { tipo: "ataque", mp: 25, poder: 1.6, cd: 8000, desc: "Focused punch with iron-like force.", cor: "#d97706", icone: '<span style="font-size:24px;">🥊</span>' },
    "Puma Spirit Totem": { tipo: "buff_spd", mp: 30, poder: 1.5, cd: 30000, desc: "Embodies the puma spirit, greatly increasing attack speed.", cor: "#fcd34d", icone: '<span style="font-size:24px;">🐆</span>' },
    "Crippling Blow": { tipo: "debuff", mp: 35, poder: 0, cd: 15000, desc: "Strike to the joints that shatters the enemy’s defense.", cor: "#b45309", icone: '<span style="font-size:24px;">🦵</span>' },
    "Focused Force": { tipo: "buff_atk", mp: 40, poder: 1.4, cd: 30000, desc: "Channels Ki (life energy) to boost the next strikes’ damage.", cor: "#fbbf24", icone: '<span style="font-size:24px;">🔥</span>' },

    // === ORCS (Tyrant - Lvl 40) ===
    "Hurricane Assault": { tipo: "ataque", mp: 50, poder: 2.8, cd: 12000, desc: "Devastating flurry of punches at hurricane speed.", cor: "#ea580c", icone: '<span style="font-size:24px;">🌪️</span>' },
    "Force Buster": { tipo: "ataque_area", mp: 60, poder: 1.8, cd: 15000, desc: "Releases a Ki blast hitting all enemies around you.", cor: "#c2410c", icone: '<span style="font-size:24px;">💥</span>' },
    "Ogre Spirit Totem": { tipo: "buff_def", mp: 45, poder: 2.0, cd: 40000, desc: "Embodies the ogre, gaining crushing physical defense.", cor: "#78350f", icone: '<span style="font-size:24px;">👹</span>' },
    "Bison Spirit Totem": { tipo: "buff_atk", mp: 55, poder: 2.0, cd: 60000, desc: "Bison fury! Absurdly raises attack when HP drops below 30%.", cor: "#991b1b", icone: '<span style="font-size:24px;">🦬</span>' },

    // === ORCS (Grand Khavatari - Lvl 76) ===
    "Force of Destruction": { tipo: "ataque", mp: 90, poder: 4.5, cd: 20000, desc: "Final strike of orc martial arts. Massive single-target damage.", cor: "#431407", icone: '<span style="font-size:24px;">☄️</span>' },
    // === ORCS (Orc Shaman - Lvl 20) ===
    "Steal Essence": { tipo: "ataque_dreno", mp: 35, poder: 1.5, cd: 8000, desc: "Blood magic. Deals magic damage and heals 50% of damage dealt.", cor: "#991b1b", icone: '<span style="font-size:24px;">🩸</span>' },
    "Frost Flame": { tipo: "debuff", mp: 40, poder: 0, cd: 15000, desc: "Freezing fire that corrodes and breaks physical and magic defense.", cor: "#0284c7", icone: '<span style="font-size:24px;">🔥</span>' },
    "Dreaming Spirit": { tipo: "debuff", mp: 40, poder: 0, cd: 20000, desc: "Puts the enemy in a deep trance, rooting them in place.", cor: "#8b5cf6", icone: '<span style="font-size:24px;">💤</span>' },
    "Chant of Battle": { tipo: "buff_atk", mp: 30, poder: 1.5, cd: 30000, desc: "Shamanic chant that raises combat power.", cor: "#b45309", icone: '<span style="font-size:24px;">🥁</span>' },

    // === ORCS (Overlord -> Dominator) - Foco em Controle e Selos ===
    "Despair": { tipo: "ataque", mp: 50, poder: 2.2, cd: 10000, desc: "High-impact shadow magic.", cor: "#1f2937", icone: '<span style="font-size:24px;">☠️</span>' },
    "Seal of Binding": { tipo: "debuff", mp: 50, poder: 0, cd: 20000, desc: "Tribal seal that chains the enemy to the ground.", cor: "#4c1d95", icone: '<span style="font-size:24px;">⛓️</span>' },
    "Seal of Winter": { tipo: "debuff", mp: 55, poder: 0, cd: 25000, desc: "Seal that drastically lowers speed and strength.", cor: "#0369a1", icone: '<span style="font-size:24px;">❄️</span>' },
    "Pa'agrian Gift": { tipo: "buff_def", mp: 60, poder: 1.8, cd: 40000, desc: "Blesses your armor with Pa’agrio’s fire resistance.", cor: "#ea580c", icone: '<span style="font-size:24px;">🛡️</span>' },
    "Seal of Disease": { tipo: "ataque_area", mp: 90, poder: 3.5, cd: 20000, desc: "[Dominator Lvl 76] Supreme seal. Massive damage and weakness on all enemies.", cor: "#14532d", icone: '<span style="font-size:24px;">🦠</span>' },

    // === ORCS (Warcryer -> Doomcryer) - Foco em Buffs e Dano Contínuo ===
    "Freezing Flame": { tipo: "ataque", mp: 50, poder: 2.2, cd: 10000, desc: "Mystic fire that burns the target’s spirit.", cor: "#0ea5e9", icone: '<span style="font-size:24px;">☄️</span>' },
    "Chant of Vampire": { tipo: "ataque_dreno", mp: 60, poder: 2.5, cd: 15000, desc: "Advanced life drain. Destructive damage that restores lots of HP.", cor: "#9f1239", icone: '<span style="font-size:24px;">🦇</span>' },
    "Chant of Fire": { tipo: "buff_def", mp: 50, poder: 1.8, cd: 40000, desc: "Greatly raises M. Def. and P. Def.", cor: "#dc2626", icone: '<span style="font-size:24px;">🔥</span>' },
    "Chant of Fury": { tipo: "buff_spd", mp: 55, poder: 1.5, cd: 40000, desc: "Absurdly raises attack and cast speed.", cor: "#f59e0b", icone: '<span style="font-size:24px;">⚡</span>' },
    "Magnus' Chant": { tipo: "buff_atk", mp: 100, poder: 3.0, cd: 60000, desc: "[Doomcryer Lvl 76] Final chant. Multiplies all stats to the extreme.", cor: "#fbbf24", icone: '<span style="font-size:24px;">👑</span>' },
    // === ANÕES (Caminho do Farm: Scavenger -> Bounty Hunter) ===
    "Spoil": { tipo: "debuff_spoil", mp: 15, poder: 0, cd: 8000, desc: "Secret greed magic. Marks the monster to try for extra materials on death.", cor: "#facc15", icone: '<span style="font-size:24px;">⛏️</span>' },
    "Sweeper": { tipo: "utilidade", mp: 5, poder: 0, cd: 3000, desc: "Instantly collects bonus loot from a foe killed under Spoil.", cor: "#eab308", icone: '<span style="font-size:24px;">🧲</span>' },
    "Hammer Crush": { tipo: "ataque", mp: 25, poder: 1.5, cd: 10000, desc: "Heavy axe or hammer swing. High chance to stun the enemy.", cor: "#f87171", icone: '<span style="font-size:24px;">🔨</span>' },
    "Bounty Luck": { tipo: "buff_atk", mp: 30, poder: 1.3, cd: 40000, desc: "Raises attack and accuracy, guided by greed.", cor: "#ca8a04", icone: '<span style="font-size:24px;">🍀</span>' },
    "Spoil Festival": { tipo: "debuff_spoil", mp: 45, poder: 0, cd: 15000, desc: "[Bounty Hunter Lvl 40] Advanced Spoil. Marks the enemy and slightly weakens defense.", cor: "#a16207", icone: '<span style="font-size:24px;">💰</span>' },
    "Spoil Crush": { tipo: "ataque_ultimate", mp: 80, poder: 4.0, cd: 20000, desc: "[Fortune Seeker Lvl 76] A crushing strike that applies Spoil and deals massive damage.", cor: "#854d0e", icone: '<span style="font-size:24px;">💎</span>' },

    // === ANÕES (Caminho da Forja: Artisan -> Warsmith) ===
    "Summon Mechanic Golem": { tipo: "pet", mp: 50, poder: 0, cd: 60000, desc: "Summons an iron-gear golem focused on physical attack and high defense.", cor: "#94a3b8", icone: '<span style="font-size:24px;">🤖</span>' },
    "Armor Crush": { tipo: "debuff", mp: 45, poder: 0, cd: 12000, desc: "Shatters the enemy’s armor, drastically lowering defense.", cor: "#991b1b", icone: '<span style="font-size:24px;">💥</span>' },
    "Summon Big Boom": { tipo: "pet", mp: 70, poder: 0, cd: 60000, desc: "[Warsmith Lvl 40] Summons a volatile powder golem that hits incredibly hard.", cor: "#ef4444", icone: '<span style="font-size:24px;">💣</span>' },
    "Wrath": { tipo: "ataque_area", mp: 60, poder: 1.8, cd: 15000, desc: "[Warsmith Lvl 40] Violently spins spear or axe, hitting all monsters.", cor: "#b45309", icone: '<span style="font-size:24px;">🌪️</span>' },
    "Summon Siege Golem": { tipo: "pet", mp: 120, poder: 0, cd: 90000, desc: "[Maestro Lvl 76] Ultimate creation. Summons a colossal siege golem.", cor: "#1e293b", icone: '<span style="font-size:24px;">🏰</span>' },
};

// ÁRVORE DE APRENDIZADO
const arvoreDeSkills = {
   // === CLASSES BASE (Nível 1) ===
   "Fighter": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Power Strike" } ],
   "Mage": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Wind Strike" } ],
   "Dark_Fighter": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Power Strike" } ],
   "Dark_Mage": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Wind Strike" } ],
   "Elf_Fighter": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Power Strike" } ],
   "Elf_Mage": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Wind Strike" } ],
   "Orc_Fighter": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Power Strike" } ],
   "Orc_Mage": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Wind Strike" } ],

   // === ARVORE HUMANOS ===
   "Warrior": [ { lvl: 20, nome: "War Cry" }, { lvl: 20, nome: "Lion Heart" }, { lvl: 20, nome: "Double Strike" }, { lvl: 20, nome: "Focus Attack" } ],
   "Gladiator": [ { lvl: 40, nome: "Sonic Blaster" }, { lvl: 40, nome: "Triple Sonic Slash" }, { lvl: 40, nome: "Duelist Spirit" }, { lvl: 40, nome: "Sonic Barrier" } ],
   "Duelist": [ { lvl: 76, nome: "Max Sonic Slash" } ],
   "Warlord": [ { lvl: 40, nome: "Whirlwind" }, { lvl: 40, nome: "Thunder Storm" }, { lvl: 40, nome: "Thrill Fight" }, { lvl: 40, nome: "Howl" } ],
   "Dreadnought": [ { lvl: 76, nome: "Earthquake" } ],
   "Human Knight": [ { lvl: 20, nome: "Whirlwind_K" }, { lvl: 20, nome: "Colossal Smash" }, { lvl: 20, nome: "Battle Roar" }, { lvl: 20, nome: "Iron Skin" } ],
   "Dark Avenger": [ { lvl: 40, nome: "Drain Health" }, { lvl: 40, nome: "Summon Panther" }, { lvl: 40, nome: "Iron Will" }, { lvl: 40, nome: "Hamstring" } ],
   "Hell Knight": [ { lvl: 76, nome: "Touch of Death" } ],
   "Paladin": [ { lvl: 40, nome: "Holy Strike" }, { lvl: 40, nome: "Shield Stun" }, { lvl: 40, nome: "Holy Blessing" }, { lvl: 40, nome: "Majesty" } ],
   "Phoenix Knight": [ { lvl: 76, nome: "Phoenix Strike" } ],
   "Rogue": [ { lvl: 20, nome: "Mortal Strike" }, { lvl: 20, nome: "Vicious Stance" }, { lvl: 20, nome: "Dash" }, { lvl: 20, nome: "Ultimate Evasion" } ],
   "Treasure Hunter": [ { lvl: 40, nome: "Deadly Blow" }, { lvl: 40, nome: "Backstab" }, { lvl: 40, nome: "Fake Death" }, { lvl: 40, nome: "Stealth" } ],
   "Adventurer": [ { lvl: 76, nome: "Lethal Blow" } ],
   "Hawkeye": [ { lvl: 40, nome: "Double Shot" }, { lvl: 40, nome: "Stun Shot" }, { lvl: 40, nome: "Snipe" }, { lvl: 40, nome: "Rapid Shot" } ],
   "Sagittarius": [ { lvl: 76, nome: "Death Shot" } ],
   
   "Human Wizard": [ { lvl: 20, nome: "Aura Burn" }, { lvl: 20, nome: "Vampiric Touch" }, { lvl: 20, nome: "Concentration" }, { lvl: 20, nome: "Flame Strike" } ],
   "Necromancer": [ { lvl: 40, nome: "Death Spike" }, { lvl: 40, nome: "Summon Zombie" }, { lvl: 40, nome: "Curse Gloom" }, { lvl: 40, nome: "Corpse Burst" } ],
   "Soultaker": [ { lvl: 76, nome: "Gehenna" } ],
   "Sorcerer": [ { lvl: 40, nome: "Prominence" }, { lvl: 40, nome: "Blazing Circle" }, { lvl: 40, nome: "Surrender To Fire" }, { lvl: 40, nome: "Sleeping Cloud" } ],
   "Archmage": [ { lvl: 76, nome: "Volcano" } ],
   "Warlock": [ { lvl: 40, nome: "Summon Kai the Cat" }, { lvl: 40, nome: "Servitor Heal" }, { lvl: 40, nome: "Servitor Physical Buff" }, { lvl: 40, nome: "Wind Shackle" } ],
   "Arcane Lord": [ { lvl: 76, nome: "Summon Feline King" } ],
   "Cleric": [ { lvl: 20, nome: "Divine Flash" }, { lvl: 20, nome: "Greater Heal" }, { lvl: 20, nome: "Might" }, { lvl: 20, nome: "Wind Walk" } ],
   "Bishop": [ { lvl: 40, nome: "Trance" }, { lvl: 40, nome: "Holy Armor" }, { lvl: 40, nome: "Major Heal" }, { lvl: 40, nome: "Dryad Root" } ],
   "Cardinal": [ { lvl: 76, nome: "Miracle" } ],

   // === ARVORE DARK ELVES ===
   "Assassin": [ { lvl: 20, nome: "Mortal Blow" }, { lvl: 20, nome: "Hex" }, { lvl: 20, nome: "Sting" }, { lvl: 20, nome: "Ultimate Evasion" } ],
   "Abyss Walker": [ { lvl: 40, nome: "Deadly Blow" }, { lvl: 40, nome: "Focus Death" }, { lvl: 40, nome: "Blinding Blow" }, { lvl: 40, nome: "Silent Move" } ],
   "Ghost Hunter": [ { lvl: 76, nome: "Lethal Blow" } ],
   "Dark Wizard": [ { lvl: 20, nome: "Twister" }, { lvl: 20, nome: "Shadow Spark" }, { lvl: 20, nome: "Vampiric Touch" }, { lvl: 20, nome: "Curse Weakness" } ],
   "Spellhowler": [ { lvl: 40, nome: "Hurricane" }, { lvl: 40, nome: "Death Spike" }, { lvl: 40, nome: "Shadow Flare" }, { lvl: 40, nome: "Silence" } ],
   "Storm Screamer": [ { lvl: 76, nome: "Demon Wind" } ],
   "Palus Ranger": [ { lvl: 20, nome: "Power Shot" }, { lvl: 20, nome: "Poison Arrow" }, { lvl: 20, nome: "Vicious Stance" }, { lvl: 20, nome: "Freezing Strike" } ],
   "Phantom Ranger": [ { lvl: 40, nome: "Lethal Shot" }, { lvl: 40, nome: "Fatal Counter" }, { lvl: 40, nome: "Dead Eye" }, { lvl: 40, nome: "Stun Shot" } ],
   "Ghost Sentinel": [ { lvl: 76, nome: "Seven Arrows" } ],
   "Palus Knight": [ { lvl: 20, nome: "Dark Strike" }, { lvl: 20, nome: "Sting" }, { lvl: 20, nome: "Hex" }, { lvl: 20, nome: "Freezing Strike" } ],
   "Bladedancer": [ { lvl: 40, nome: "Fatal Strike" }, { lvl: 40, nome: "Dance of Fire" }, { lvl: 40, nome: "Dance of Warrior" }, { lvl: 40, nome: "Poison Dance" } ],
   "Spectral Dancer": [ { lvl: 76, nome: "Symphony of Blades" } ],
   "Shillien Knight": [ { lvl: 40, nome: "Vampiric Touch" }, { lvl: 40, nome: "Shield Stun" }, { lvl: 40, nome: "Ultimate Defense" }, { lvl: 40, nome: "Lightning Strike" } ],
   "Shillien Templar": [ { lvl: 76, nome: "Touch of Death" } ],
   "Phantom Summoner": [ { lvl: 40, nome: "Summon Silhouette" }, { lvl: 40, nome: "Corpse Burst" }, { lvl: 40, nome: "Curse Gloom" }, { lvl: 40, nome: "Servitor Empowerment" } ],
   "Spectral Master": [ { lvl: 76, nome: "Summon Spectral Lord" } ],
   "Shillien Elder": [ { lvl: 40, nome: "Greater Heal" }, { lvl: 40, nome: "Empower" }, { lvl: 40, nome: "Dryad Root" }, { lvl: 40, nome: "Trance" } ],
   "Shillien Saint": [ { lvl: 76, nome: "Prophecy of Wind" } ],

   // === ARVORE ELFOS DA LUZ ===
   "Elven Knight": [ { lvl: 20, nome: "Ice Strike" }, { lvl: 20, nome: "Elemental Heal" }, { lvl: 20, nome: "Deflect Arrow" }, { lvl: 20, nome: "Entangle" } ],
   "Temple Knight": [ { lvl: 40, nome: "Tribunal" }, { lvl: 40, nome: "Summon Storm Cubic" }, { lvl: 40, nome: "Aegis Stance" }, { lvl: 40, nome: "Arrest" } ],
   "Eva's Templar": [ { lvl: 76, nome: "Shield of Faith" } ],
   "Swordsinger": [ { lvl: 40, nome: "Sword Symphony" }, { lvl: 40, nome: "Song of Earth" }, { lvl: 40, nome: "Song of Hunter" }, { lvl: 40, nome: "Song of Wind" } ],
   "Sword Muse": [ { lvl: 76, nome: "Song of Champion" } ],
   "Elven Scout": [ { lvl: 20, nome: "Mortal Blow" }, { lvl: 20, nome: "Sprint" }, { lvl: 20, nome: "Poison Arrow" }, { lvl: 20, nome: "Ultimate Evasion" } ],
   "Plains Walker": [ { lvl: 40, nome: "Deadly Blow" }, { lvl: 40, nome: "Backstab" }, { lvl: 40, nome: "Sand Bomb" }, { lvl: 40, nome: "Focus Death" } ],
   "Wind Rider": [ { lvl: 76, nome: "Lethal Blow" } ],
   "Silver Ranger": [ { lvl: 40, nome: "Double Shot" }, { lvl: 40, nome: "Burst Shot" }, { lvl: 40, nome: "Rapid Shot" }, { lvl: 40, nome: "Stun Shot" } ],
   "Moonlight Sentinel": [ { lvl: 76, nome: "Seven Arrow" } ],
   "Elven Wizard": [ { lvl: 20, nome: "Aqua Swirl" }, { lvl: 20, nome: "Freezing Strike" }, { lvl: 20, nome: "Solar Flare" }, { lvl: 20, nome: "Concentration" } ],
   "Spellsinger": [ { lvl: 40, nome: "Hydro Blast" }, { lvl: 40, nome: "Frost Wall" }, { lvl: 40, nome: "Surrender To Water" }, { lvl: 40, nome: "Seed of Water" } ],
   "Mystic Muse": [ { lvl: 76, nome: "Ice Vortex" } ],
   "Elemental Summoner": [ { lvl: 40, nome: "Summon Mirage the Unicorn" }, { lvl: 40, nome: "Summon Aqua Cubic" }, { lvl: 40, nome: "Wind Shackle" }, { lvl: 40, nome: "Servitor Empowerment" } ],
   "Elemental Master": [ { lvl: 76, nome: "Summon Magnus the Unicorn" } ],
   "Elven Oracle": [ { lvl: 20, nome: "Light Heal" }, { lvl: 20, nome: "Recharge" }, { lvl: 20, nome: "Holy Armor" } ],
   "Elven Elder": [ { lvl: 40, nome: "Might of Heaven" }, { lvl: 40, nome: "Greater Heal" }, { lvl: 40, nome: "Advanced Recharge" }, { lvl: 40, nome: "Agility" } ],
   "Eva's Saint": [ { lvl: 76, nome: "Prophecy of Water" } ],

   // === ARVORE ORCS ===
   "Orc Raider": [ { lvl: 20, nome: "Power Smash" }, { lvl: 20, nome: "Whirlwind" }, { lvl: 20, nome: "War Cry" }, { lvl: 20, nome: "Lionheart" } ],
   "Destroyer": [ { lvl: 40, nome: "Fatal Strike" }, { lvl: 40, nome: "Crush of Doom" }, { lvl: 40, nome: "Frenzy" }, { lvl: 40, nome: "Guts" } ],
   "Titan": [ { lvl: 76, nome: "Earthquake" } ],
   "Monk": [ { lvl: 20, nome: "Iron Punch" }, { lvl: 20, nome: "Puma Spirit Totem" }, { lvl: 20, nome: "Crippling Blow" }, { lvl: 20, nome: "Focused Force" } ],
   "Tyrant": [ { lvl: 40, nome: "Hurricane Assault" }, { lvl: 40, nome: "Force Buster" }, { lvl: 40, nome: "Ogre Spirit Totem" }, { lvl: 40, nome: "Bison Spirit Totem" } ],
   "Grand Khavatari": [ { lvl: 76, nome: "Force of Destruction" } ],
   "Orc Shaman": [ { lvl: 20, nome: "Steal Essence" }, { lvl: 20, nome: "Frost Flame" }, { lvl: 20, nome: "Chant of Battle" }, { lvl: 20, nome: "Dreaming Spirit" } ],
   "Overlord": [ { lvl: 40, nome: "Despair" }, { lvl: 40, nome: "Seal of Binding" }, { lvl: 40, nome: "Seal of Winter" }, { lvl: 40, nome: "Pa'agrian Gift" } ],
   "Warcryer": [ { lvl: 40, nome: "Freezing Flame" }, { lvl: 40, nome: "Chant of Vampire" }, { lvl: 40, nome: "Chant of Fire" }, { lvl: 40, nome: "Chant of Fury" } ],
   "Dominator": [ { lvl: 76, nome: "Seal of Disease" } ],
   "Doomcryer": [ { lvl: 76, nome: "Magnus' Chant" } ],
   // === ARVORE ANÕES ===
   "Dwarven Fighter": [ { lvl: 1, nome: "Attack" }, { lvl: 1, nome: "Power Strike" } ],
   
   "Scavenger": [ { lvl: 20, nome: "Spoil" }, { lvl: 20, nome: "Sweeper" }, { lvl: 20, nome: "Hammer Crush" }, { lvl: 20, nome: "Vicious Stance" } ],
   "Bounty Hunter": [ { lvl: 40, nome: "Spoil Festival" }, { lvl: 40, nome: "Bounty Luck" }, { lvl: 40, nome: "Whirlwind" }, { lvl: 40, nome: "Fatal Strike" } ],
   "Fortune Seeker": [ { lvl: 76, nome: "Spoil Crush" } ],

   "Artisan": [ { lvl: 20, nome: "Summon Mechanic Golem" }, { lvl: 20, nome: "Hammer Crush" }, { lvl: 20, nome: "War Cry" }, { lvl: 20, nome: "Armor Crush" } ],
   "Warsmith": [ { lvl: 40, nome: "Summon Big Boom" }, { lvl: 40, nome: "Wrath" }, { lvl: 40, nome: "Iron Will" }, { lvl: 40, nome: "Whirlwind" } ],
   "Maestro": [ { lvl: 76, nome: "Summon Siege Golem" } ]

};

// ==========================================
// LINHAGEM DE CLASSES (MEMÓRIA GENÉTICA)
// ==========================================
const linhagemClasses = {
    // === HUMANOS ===
    "Fighter": ["Fighter"],
    "Warrior": ["Fighter", "Warrior"],
    "Gladiator": ["Fighter", "Warrior", "Gladiator"],
    "Duelist": ["Fighter", "Warrior", "Gladiator", "Duelist"],
    "Warlord": ["Fighter", "Warrior", "Warlord"],
    "Dreadnought": ["Fighter", "Warrior", "Warlord", "Dreadnought"],
    "Human Knight": ["Fighter", "Human Knight"],
    "Dark Avenger": ["Fighter", "Human Knight", "Dark Avenger"],
    "Hell Knight": ["Fighter", "Human Knight", "Dark Avenger", "Hell Knight"],
    "Paladin": ["Fighter", "Human Knight", "Paladin"],
    "Phoenix Knight": ["Fighter", "Human Knight", "Paladin", "Phoenix Knight"],
    "Rogue": ["Fighter", "Rogue"],
    "Treasure Hunter": ["Fighter", "Rogue", "Treasure Hunter"],
    "Adventurer": ["Fighter", "Rogue", "Treasure Hunter", "Adventurer"],
    "Hawkeye": ["Fighter", "Rogue", "Hawkeye"],
    "Sagittarius": ["Fighter", "Rogue", "Hawkeye", "Sagittarius"],
    "Mage": ["Mage"],
    "Human Wizard": ["Mage", "Human Wizard"],
    "Necromancer": ["Mage", "Human Wizard", "Necromancer"],
    "Soultaker": ["Mage", "Human Wizard", "Necromancer", "Soultaker"],
    "Sorcerer": ["Mage", "Human Wizard", "Sorcerer"],
    "Archmage": ["Mage", "Human Wizard", "Sorcerer", "Archmage"],
    "Warlock": ["Mage", "Human Wizard", "Warlock"],
    "Arcane Lord": ["Mage", "Human Wizard", "Warlock", "Arcane Lord"],
    "Cleric": ["Mage", "Cleric"],
    "Bishop": ["Mage", "Cleric", "Bishop"],
    "Cardinal": ["Mage", "Cleric", "Bishop", "Cardinal"],
    "Prophet": ["Mage", "Cleric", "Prophet"],
    "Hierophant": ["Mage", "Cleric", "Prophet", "Hierophant"],

    // === DARK ELVES (ELFOS DA NOITE) ===
    "Dark_Fighter": ["Dark_Fighter"],
    "Dark_Mage": ["Dark_Mage"],
    "Assassin": ["Dark_Fighter", "Assassin"],
    "Abyss Walker": ["Dark_Fighter", "Assassin", "Abyss Walker"],
    "Ghost Hunter": ["Dark_Fighter", "Assassin", "Abyss Walker", "Ghost Hunter"],
    "Dark Wizard": ["Dark_Mage", "Dark Wizard"],
    "Spellhowler": ["Dark_Mage", "Dark Wizard", "Spellhowler"],
    "Storm Screamer": ["Dark_Mage", "Dark Wizard", "Spellhowler", "Storm Screamer"],
    "Palus Ranger": ["Dark_Fighter", "Palus Ranger"],
    "Phantom Ranger": ["Dark_Fighter", "Palus Ranger", "Phantom Ranger"],
    "Ghost Sentinel": ["Dark_Fighter", "Palus Ranger", "Phantom Ranger", "Ghost Sentinel"],
    "Palus Knight": ["Dark_Fighter", "Palus Knight"],
    "Bladedancer": ["Dark_Fighter", "Palus Knight", "Bladedancer"],
    "Spectral Dancer": ["Dark_Fighter", "Palus Knight", "Bladedancer", "Spectral Dancer"],
    "Shillien Knight": ["Dark_Fighter", "Palus Knight", "Shillien Knight"],
    "Shillien Templar": ["Dark_Fighter", "Palus Knight", "Shillien Knight", "Shillien Templar"],
    "Phantom Summoner": ["Dark_Mage", "Dark Wizard", "Phantom Summoner"],
    "Spectral Master": ["Dark_Mage", "Dark Wizard", "Phantom Summoner", "Spectral Master"],
    "Shillien Oracle": ["Dark_Mage", "Shillien Oracle"],
    "Shillien Elder": ["Dark_Mage", "Shillien Oracle", "Shillien Elder"],
    "Shillien Saint": ["Dark_Mage", "Shillien Oracle", "Shillien Elder", "Shillien Saint"],

    // === ELFOS DA LUZ (ELF) ===
    "Elf_Fighter": ["Elf_Fighter"],
    "Elf_Mage": ["Elf_Mage"],
    "Elven Knight": ["Elf_Fighter", "Elven Knight"],
    "Temple Knight": ["Elf_Fighter", "Elven Knight", "Temple Knight"],
    "Eva's Templar": ["Elf_Fighter", "Elven Knight", "Temple Knight", "Eva's Templar"],
    "Swordsinger": ["Elf_Fighter", "Elven Knight", "Swordsinger"],
    "Sword Muse": ["Elf_Fighter", "Elven Knight", "Swordsinger", "Sword Muse"],
    "Elven Scout": ["Elf_Fighter", "Elven Scout"],
    "Plains Walker": ["Elf_Fighter", "Elven Scout", "Plains Walker"],
    "Wind Rider": ["Elf_Fighter", "Elven Scout", "Plains Walker", "Wind Rider"],
    "Silver Ranger": ["Elf_Fighter", "Elven Scout", "Silver Ranger"],
    "Moonlight Sentinel": ["Elf_Fighter", "Elven Scout", "Silver Ranger", "Moonlight Sentinel"],
    "Elven Wizard": ["Elf_Mage", "Elven Wizard"],
    "Spellsinger": ["Elf_Mage", "Elven Wizard", "Spellsinger"],
    "Mystic Muse": ["Elf_Mage", "Elven Wizard", "Spellsinger", "Mystic Muse"],
    "Elemental Summoner": ["Elf_Mage", "Elven Wizard", "Elemental Summoner"],
    "Elemental Master": ["Elf_Mage", "Elven Wizard", "Elemental Summoner", "Elemental Master"],
    "Elven Oracle": ["Elf_Mage", "Elven Oracle"],
    "Elven Elder": ["Elf_Mage", "Elven Oracle", "Elven Elder"],
    "Eva's Saint": ["Elf_Mage", "Elven Oracle", "Elven Elder", "Eva's Saint"],

    // === ORCS ===
    "Orc_Fighter": ["Orc_Fighter"],
    "Orc_Mage": ["Orc_Mage"],
    "Orc Raider": ["Orc_Fighter", "Orc Raider"],
    "Monk": ["Orc_Fighter", "Monk"],
    "Destroyer": ["Orc_Fighter", "Orc Raider", "Destroyer"],
    "Tyrant": ["Orc_Fighter", "Monk", "Tyrant"],
    "Titan": ["Orc_Fighter", "Orc Raider", "Destroyer", "Titan"],
    "Grand Khavatari": ["Orc_Fighter", "Monk", "Tyrant", "Grand Khavatari"],
    "Orc Shaman": ["Orc_Mage", "Orc Shaman"],
    "Overlord": ["Orc_Mage", "Orc Shaman", "Overlord"],
    "Warcryer": ["Orc_Mage", "Orc Shaman", "Warcryer"],
    "Dominator": ["Orc_Mage", "Orc Shaman", "Overlord", "Dominator"],
    "Doomcryer": ["Orc_Mage", "Orc Shaman", "Warcryer", "Doomcryer"],
    // === ANÕES ===
    "Dwarven Fighter": ["Dwarven Fighter"],
    
    // Caminho do Farm (Spoil)
    "Scavenger": ["Dwarven Fighter", "Scavenger"],
    "Bounty Hunter": ["Dwarven Fighter", "Scavenger", "Bounty Hunter"],
    "Fortune Seeker": ["Dwarven Fighter", "Scavenger", "Bounty Hunter", "Fortune Seeker"],
    
    // Caminho da Forja (Golems)
    "Artisan": ["Dwarven Fighter", "Artisan"],
    "Warsmith": ["Dwarven Fighter", "Artisan", "Warsmith"],
    "Maestro": ["Dwarven Fighter", "Artisan", "Warsmith", "Maestro"],
};



// -----------------------------------------------------------------------------
// Spellbook (lista + painel de detalhe)
// -----------------------------------------------------------------------------
window.spellbookTipoLabel = function (tipo) {
    var key = 'game.spellbook.type.' + (tipo || 'basico');
    if (typeof window.t === 'function') {
        var s = window.t(key);
        if (s !== key) return s;
    }
    return tipo || '—';
};

window.spellbookFormatPowerCell = function (skill) {
    if (!skill) return typeof window.t === 'function' ? window.t('game.spellbook.powerNA') : '—';
    var tipo = skill.tipo || '';
    var tn = typeof window.t === 'function' ? window.t : function (k) { return k; };
    if (tipo === 'debuff' || tipo === 'utilidade' || tipo === 'pet') return tn('game.spellbook.powerNA');
    var p = skill.poder;
    if (tipo === 'basico') return tn('game.spellbook.powerNA');
    if (p === undefined || p === null) return tn('game.spellbook.powerNA');
    if (tipo === 'cura' || tipo === 'recuperacao') {
        return p <= 1.5 ? tn('game.spellbook.effectPctHp', { n: Math.round(p * 100) }) : String(p);
    }
    if (tipo === 'cura_mp') {
        return p <= 1.5 ? tn('game.spellbook.effectPctMp', { n: Math.round(p * 100) }) : String(p);
    }
    return tn('game.spellbook.powerFmt', { n: p });
};

window.spellbookIconInnerHtml = function (iconeHtml, px) {
    px = px || 38;
    if (!iconeHtml) return '<span>?</span>';
    var h = String(iconeHtml);
    if (h.indexOf('<img') !== -1) {
        var out = h.replace(/width:\s*[\d.]+px/gi, 'width:' + px + 'px').replace(/height:\s*[\d.]+px/gi, 'height:' + px + 'px');
        if (out === h && h.indexOf('35px') !== -1) out = h.replace(/35px/g, px + 'px');
        return out;
    }
    return h;
};

// FUNÇÕES DE GERENCIAMENTO
let skillSelecionadaSpellbook = null;

window.obterSkillsAprendidas = function() {
    let skillsDoChar = [];
    let linhagem = linhagemClasses[charClass] || [];
    
    linhagem.forEach(cls => {
        if (arvoreDeSkills[cls]) {
            arvoreDeSkills[cls].forEach(habilidade => {
                if (nivel >= habilidade.lvl) {
                    let raw = bancoDeSkills[habilidade.nome];
                    if (!raw) return;
                    let dadosSkill = Object.assign({}, raw, {
                        idNome: habilidade.nome,
                        _learnLvl: habilidade.lvl
                    });
                    skillsDoChar.push(dadosSkill);
                }
            });
        }
    });
    return skillsDoChar;
};

window.abrirSpellbook = function() {
    let listEl = document.getElementById('spellbook-list');
    let hintEl = document.getElementById('spellbook-select-hint');
    let detailEl = document.getElementById('spellbook-detail');
    let btnAssign = document.getElementById('btn-spellbook-assign');
    skillSelecionadaSpellbook = null;
    listEl.innerHTML = '';

    try {
        var jw = document.getElementById('janela-spellbook');
        if (typeof I18n !== 'undefined' && I18n.refreshDom && jw) I18n.refreshDom(jw);
    } catch (e) { /* noop */ }

    let skills = window.obterSkillsAprendidas();
    const secLab = (typeof window.t === 'function') ? window.t('game.spellbook.seconds') : 's';

    if (skills.length === 0) {
        hintEl.style.display = 'none';
        detailEl.classList.remove('spellbook-detail--visible');
        btnAssign.classList.remove('spellbook-assign--visible');
        listEl.innerHTML = `<div class="spellbook-empty">${typeof window.t === 'function' ? window.t('game.spellbook.empty') : 'No skills yet.'}</div>`;
    } else {
        hintEl.style.display = 'block';
        detailEl.classList.remove('spellbook-detail--visible');
        btnAssign.classList.remove('spellbook-assign--visible');

        const mpSh = typeof window.t === 'function' ? window.t('game.spellbook.mpShort') : 'MP';
        const cdSh = typeof window.t === 'function' ? window.t('game.spellbook.cdShort') : 'CD';

        skills.forEach(skill => {
            let row = document.createElement('button');
            row.type = 'button';
            row.className = 'spellbook-row';
            row.setAttribute('role', 'option');
            row.dataset.skillName = skill.idNome;

            let iconWrap = document.createElement('div');
            iconWrap.className = 'spellbook-row__icon';
            iconWrap.style.borderColor = skill.cor || '#7a664f';
            iconWrap.innerHTML = window.spellbookIconInnerHtml(skill.icone, 38);

            let body = document.createElement('div');
            body.className = 'spellbook-row__body';

            let nameEl = document.createElement('div');
            nameEl.className = 'spellbook-row__name';
            if (skill.cor) nameEl.style.color = skill.cor;
            nameEl.textContent = skill.idNome;

            let meta = document.createElement('div');
            meta.className = 'spellbook-row__meta';
            let mp = skill.mp != null ? skill.mp : 0;
            let cdSec = ((skill.cd != null ? skill.cd : 0) / 1000);
            meta.innerHTML =
                `<span class="spellbook-row__tag spellbook-row__tag--mp">${mpSh} ${mp}</span>` +
                `<span class="spellbook-row__tag spellbook-row__tag--cd">${cdSh} ${cdSec}${secLab}</span>` +
                `<span class="spellbook-row__tag spellbook-row__tag--type">${window.spellbookTipoLabel(skill.tipo)}</span>`;

            let descEl = document.createElement('div');
            descEl.className = 'spellbook-row__desc';
            descEl.textContent = skill.desc ? String(skill.desc).replace(/<[^>]+>/g, '') : '';

            body.appendChild(nameEl);
            body.appendChild(meta);
            body.appendChild(descEl);
            row.appendChild(iconWrap);
            row.appendChild(body);

            row.addEventListener('click', () => { window.selecionarSkillSpellbook(skill.idNome); });
            listEl.appendChild(row);
        });

        document.getElementById('spellbook-detail-name').textContent = '';
        document.getElementById('spellbook-detail-desc').textContent = '';
        document.getElementById('spellbook-detail-learn').textContent = '';
        document.getElementById('spellbook-stat-mp').textContent = '—';
        document.getElementById('spellbook-stat-cd').textContent = '—';
        document.getElementById('spellbook-stat-power').textContent = '—';
        document.getElementById('spellbook-stat-type').textContent = '—';
        document.getElementById('spellbook-detail-icon').innerHTML = '';
    }

    abrirModal('janela-spellbook', 1500);
};

window.fecharSpellbook = function() {
    skillSelecionadaSpellbook = null;
    fecharModal('janela-spellbook');
};

window.selecionarSkillSpellbook = function(nomeSkill) {
    let raw = bancoDeSkills[nomeSkill];
    if (!raw) return;

    skillSelecionadaSpellbook = Object.assign({}, raw, { idNome: nomeSkill });

    document.querySelectorAll('.spellbook-row').forEach(r => {
        r.classList.toggle('spellbook-row--selected', r.dataset.skillName === nomeSkill);
    });

    document.getElementById('spellbook-select-hint').style.display = 'none';
    let detailEl = document.getElementById('spellbook-detail');
    detailEl.classList.add('spellbook-detail--visible');

    let learnedMeta = window.obterSkillsAprendidas().find(s => s.idNome === nomeSkill);
    let learnP = document.getElementById('spellbook-detail-learn');
    if (learnedMeta && learnedMeta._learnLvl != null && typeof window.t === 'function') {
        learnP.textContent = window.t('game.spellbook.learnLevel', { lvl: learnedMeta._learnLvl });
        learnP.style.display = 'block';
    } else {
        learnP.textContent = '';
        learnP.style.display = 'none';
    }

    let iconHost = document.getElementById('spellbook-detail-icon');
    iconHost.style.borderColor = raw.cor || '#eab308';
    iconHost.innerHTML = window.spellbookIconInnerHtml(raw.icone, 42);

    let title = document.getElementById('spellbook-detail-name');
    title.textContent = nomeSkill;
    title.style.color = raw.cor || '';

    document.getElementById('spellbook-stat-mp').textContent = String(raw.mp != null ? raw.mp : 0);
    let cdMs = raw.cd != null ? raw.cd : 0;
    let secLbl = typeof window.t === 'function' ? window.t('game.spellbook.seconds') : 's';
    document.getElementById('spellbook-stat-cd').textContent = cdMs === 0 ? '—' : ((cdMs / 1000) + secLbl);
    document.getElementById('spellbook-stat-power').textContent = window.spellbookFormatPowerCell(raw);
    document.getElementById('spellbook-stat-type').textContent = window.spellbookTipoLabel(raw.tipo);

    document.getElementById('spellbook-detail-desc').textContent = raw.desc ? String(raw.desc).replace(/<[^>]+>/g, '') : '';

    document.getElementById('btn-spellbook-assign').classList.add('spellbook-assign--visible');

    try {
        detailEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) { /* noop */ }
};

window.mostrarSeletorSlot = function() {
    if (!skillSelecionadaSpellbook) return;

    abrirSeletorAtalhoGlobal(skillSelecionadaSpellbook.idNome, (index) => {
        barraAtalhos[index] = skillSelecionadaSpellbook.idNome;
        escreverLog(`<span style="color:#10b981;">Habilidade [${skillSelecionadaSpellbook.idNome}] equipada no slot ${index + 1}!</span>`);
        renderizarBarraAtalhos();
        if(typeof salvarJogo === 'function') salvarJogo();
        window.fecharSpellbook();
    });
};

window.equiparSkillNaBarra = function(indexSlot) {
    if (!skillSelecionadaSpellbook) return;

    barraAtalhos[indexSlot] = skillSelecionadaSpellbook.idNome;
    
    if(typeof tocarSom === 'function') tocarSom('enchant'); 
    escreverLog(`<span style="color:#10b981;">Habilidade [${skillSelecionadaSpellbook.idNome}] equipada no slot ${indexSlot + 1}!</span>`);
    
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    if(typeof salvarJogo === 'function') salvarJogo();
    
    window.fecharSpellbook();
};