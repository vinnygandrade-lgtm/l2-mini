// ==========================================
// SISTEMA DE CLASSES E EVOLUÇÃO
// ==========================================

// Modificadores de Status por Classe (1.0 = 100%, 2.0 = 200%, etc.)
const classModifiers = {
    // === CLASSES BASE (Iniciantes Nível 1) ===
    "Fighter": { hp: 0.85, mp: 0.8, atk: 1.0, def: 0.85, spd: 1.0, crit: 5 },
    "Mage": { hp: 0.7, mp: 1.0, atk: 1.0, def: 0.6, spd: 1.0, crit: 2 },
    // === CLASSE BASE (Nível 1) ===
    "Dark_Fighter": { hp: 0.75, mp: 0.9, atk: 1.2, def: 0.65, spd: 1.2, crit: 10 },
    "Dark_Mage": { hp: 0.6, mp: 1.1, atk: 1.2, def: 0.5, spd: 1.1, crit: 5 },
    // === PRIMEIRA TRANSFERÊNCIA (NÍVEL 20) ===
    "Warrior": { hp: 1.2, mp: 1.0, atk: 1.3, def: 1.1, spd: 1.05, crit: 5 },
    "Human Knight": { hp: 1.4, mp: 1.0, atk: 0.9, def: 1.5, spd: 1.0, crit: 0 },
    "Rogue": { hp: 1.0, mp: 1.0, atk: 1.2, def: 0.9, spd: 0.85, crit: 10 }, 
    "Human Wizard": { hp: 0.8, mp: 1.5, atk: 1.6, def: 0.8, spd: 0.9, crit: 5 },
    "Cleric": { hp: 1.0, mp: 1.5, atk: 1.2, def: 1.0, spd: 0.9, crit: 5 },

    // === SEGUNDA TRANSFERÊNCIA (NÍVEL 40) ===
    "Gladiator": { hp: 1.4, mp: 1.1, atk: 1.7, def: 1.2, spd: 1.1, crit: 10 },
    "Warlord": { hp: 1.6, mp: 1.0, atk: 1.5, def: 1.3, spd: 0.9, crit: 5 },
    "Paladin": { hp: 1.8, mp: 1.2, atk: 0.9, def: 2.2, spd: 0.9, crit: 2 },
    "Dark Avenger": { hp: 1.8, mp: 1.0, atk: 1.0, def: 2.0, spd: 1.0, crit: 2 }, 
    "Treasure Hunter": { hp: 1.1, mp: 1.0, atk: 1.4, def: 0.9, spd: 0.7, crit: 25 }, 
    "Hawkeye": { hp: 1.1, mp: 1.0, atk: 1.8, def: 0.9, spd: 1.1, crit: 20 }, 
    "Necromancer": { hp: 0.8, mp: 2.0, atk: 2.5, def: 0.8, spd: 0.8, crit: 10 },
    "Sorcerer": { hp: 0.8, mp: 2.0, atk: 2.5, def: 0.8, spd: 0.8, crit: 10 }, // <-- Mago de Fogo Adicionado
    "Bishop": { hp: 1.1, mp: 2.2, atk: 1.5, def: 1.1, spd: 0.9, crit: 5 },

    // === TERCEIRA TRANSFERÊNCIA (NÍVEL 76 - ENDGAME) ===
    "Duelist": { hp: 1.6, mp: 1.2, atk: 2.5, def: 1.3, spd: 1.2, crit: 15 },
    "Dreadnought": { hp: 2.0, mp: 1.2, atk: 2.2, def: 1.5, spd: 0.95, crit: 10 },
    "Phoenix Knight": { hp: 2.6, mp: 1.5, atk: 1.2, def: 3.5, spd: 0.95, crit: 5 },
    "Hell Knight": { hp: 2.5, mp: 1.2, atk: 1.3, def: 3.2, spd: 0.95, crit: 5 }, 
    "Adventurer": { hp: 1.3, mp: 1.2, atk: 2.0, def: 1.0, spd: 0.5, crit: 45 }, 
    "Sagittarius": { hp: 1.3, mp: 1.2, atk: 3.0, def: 1.0, spd: 1.0, crit: 35 }, 
    "Soultaker": { hp: 0.9, mp: 3.0, atk: 4.0, def: 0.9, spd: 0.7, crit: 15 },
    "Archmage": { hp: 0.9, mp: 3.0, atk: 4.0, def: 0.9, spd: 0.7, crit: 15 }, // <-- Mestre dos Vulcões Adicionado
    "Warlock": { hp: 1.2, mp: 2.0, atk: 2.0, def: 1.1, spd: 0.9, crit: 5 },
    "Arcane Lord": { hp: 1.4, mp: 3.0, atk: 3.2, def: 1.2, spd: 0.9, crit: 8 },
    "Cardinal": { hp: 1.2, mp: 3.5, atk: 2.0, def: 1.2, spd: 0.9, crit: 5 },

    // === DARK ELVES (Fighters & Mages) ===
    "Assassin": { hp: 0.90, mp: 1.0, atk: 1.6, def: 0.7, spd: 1.5, crit: 18 },
    "Abyss Walker": { hp: 1.05, mp: 1.0, atk: 2.2, def: 0.75, spd: 1.6, crit: 25 },
    "Ghost Hunter": { hp: 1.25, mp: 1.0, atk: 3.0, def: 0.8, spd: 1.7, crit: 35 },
    // === DARK ELVES (Magos) ===
    "Dark_Mage": { hp: 0.60, mp: 1.10, atk: 1.2, def: 0.50, spd: 1.1, crit: 5 },
    "Dark Wizard": { hp: 0.75, mp: 1.25, atk: 1.8, def: 0.55, spd: 1.3, crit: 6 },
    "Spellhowler": { hp: 0.90, mp: 1.40, atk: 2.6, def: 0.60, spd: 1.5, crit: 7 },
    "Storm Screamer": { hp: 1.10, mp: 1.60, atk: 3.8, def: 0.65, spd: 1.7, crit: 8 },
    // === DARK ELVES (Arqueiros) ===
    "Palus Ranger": { hp: 0.90, mp: 1.0, atk: 1.7, def: 0.7, spd: 1.4, crit: 20 },
    "Phantom Ranger": { hp: 1.05, mp: 1.1, atk: 2.5, def: 0.7, spd: 1.5, crit: 30 },
    "Ghost Sentinel": { hp: 1.25, mp: 1.2, atk: 3.5, def: 0.8, spd: 1.6, crit: 45 },
    // === DARK ELVES (Espadas Duplas / Dançarinos) ===
    "Palus Knight": { hp: 0.95, mp: 1.0, atk: 1.5, def: 0.80, spd: 1.3, crit: 12 },
    "Bladedancer": { hp: 1.15, mp: 1.2, atk: 2.1, def: 0.85, spd: 1.5, crit: 15 },
    "Spectral Dancer": { hp: 1.40, mp: 1.4, atk: 3.2, def: 0.95, spd: 1.6, crit: 20 },
    // === DARK ELVES (Tanque Sombrio / Escudo) ===
    // (O Palus Knight Lvl 20 já existe no seu código, não precisa duplicar)
    "Shillien Knight": { hp: 1.25, mp: 1.1, atk: 1.8, def: 1.25, spd: 1.4, crit: 15 },
    "Shillien Templar": { hp: 1.55, mp: 1.2, atk: 2.5, def: 1.65, spd: 1.5, crit: 18 },

    // === DARK ELVES (Invocador de Sombras) ===
    // (O Dark Wizard Lvl 20 já existe no seu código)
    "Phantom Summoner": { hp: 0.90, mp: 1.40, atk: 2.2, def: 0.70, spd: 1.4, crit: 7 },
    "Spectral Master": { hp: 1.15, mp: 1.60, atk: 3.0, def: 0.85, spd: 1.5, crit: 8 },

    // === DARK ELVES (Curandeiro / Suporte) ===
    "Shillien Oracle": { hp: 0.70, mp: 1.30, atk: 1.3, def: 0.55, spd: 1.2, crit: 5 },
    "Shillien Elder": { hp: 0.85, mp: 1.50, atk: 1.6, def: 0.65, spd: 1.3, crit: 6 },
    "Shillien Saint": { hp: 1.05, mp: 1.80, atk: 2.2, def: 0.75, spd: 1.4, crit: 7 },
    // === ELFOS DA LUZ (Base Lvl 20) ===
    "Elven Knight": { hp: 1.1, mp: 1.1, atk: 1.2, def: 1.3, spd: 1.4, crit: 10 },
    "Elven Scout": { hp: 0.8, mp: 1.0, atk: 1.3, def: 0.8, spd: 1.6, crit: 20 },
    "Elven Wizard": { hp: 0.6, mp: 1.4, atk: 1.4, def: 0.6, spd: 1.5, crit: 5 },
    "Elven Oracle": { hp: 0.7, mp: 1.4, atk: 1.0, def: 0.6, spd: 1.4, crit: 4 },

    // === ELFOS DA LUZ (Guerreiros Nível 40 e 76) ===
    "Temple Knight": { hp: 1.3, mp: 1.2, atk: 1.4, def: 1.6, spd: 1.6, crit: 12 },
    "Eva's Templar": { hp: 1.6, mp: 1.3, atk: 1.9, def: 2.1, spd: 1.7, crit: 15 },
    
    "Swordsinger": { hp: 1.1, mp: 1.2, atk: 1.4, def: 1.3, spd: 1.5, crit: 15 },
    "Sword Muse": { hp: 1.4, mp: 1.4, atk: 1.8, def: 1.6, spd: 1.6, crit: 18 },

    "Plains Walker": { hp: 0.9, mp: 1.0, atk: 1.5, def: 0.9, spd: 2.0, crit: 25 },
    "Wind Rider": { hp: 1.1, mp: 1.1, atk: 2.2, def: 1.1, spd: 2.3, crit: 30 },

    "Silver Ranger": { hp: 0.8, mp: 1.1, atk: 1.6, def: 0.8, spd: 1.8, crit: 20 },
    "Moonlight Sentinel": { hp: 1.0, mp: 1.2, atk: 2.4, def: 1.0, spd: 2.1, crit: 25 },

    // === ELFOS DA LUZ (Magos Nível 40 e 76) ===
    "Spellsinger": { hp: 0.7, mp: 1.6, atk: 1.8, def: 0.7, spd: 1.8, crit: 6 },
    "Mystic Muse": { hp: 0.9, mp: 2.0, atk: 2.6, def: 0.9, spd: 2.0, crit: 8 },

    "Elemental Summoner": { hp: 0.9, mp: 1.5, atk: 1.6, def: 0.8, spd: 1.6, crit: 6 },
    "Elemental Master": { hp: 1.1, mp: 1.8, atk: 2.2, def: 1.0, spd: 1.8, crit: 8 },

    "Elven Elder": { hp: 0.8, mp: 1.7, atk: 1.2, def: 0.7, spd: 1.6, crit: 5 },
    "Eva's Saint": { hp: 1.0, mp: 2.1, atk: 1.8, def: 0.9, spd: 1.8, crit: 6 },

    // === ORCS (Classes Base - Lvl 1) ===
    "Orc_Fighter": { hp: 1.2, mp: 0.6, atk: 1.3, def: 1.1, spd: 0.8, crit: 4 },
    "Orc_Mage": { hp: 1.0, mp: 0.9, atk: 1.1, def: 0.9, spd: 0.9, crit: 3 },

    // === ORCS (Primeira Transferência - Lvl 20) ===
    "Orc Raider": { hp: 1.5, mp: 0.7, atk: 1.6, def: 1.2, spd: 0.8, crit: 5 }, // Espadão de 2 mãos
    "Monk": { hp: 1.3, mp: 0.8, atk: 1.4, def: 1.0, spd: 1.3, crit: 10 }, // Garras e Socos
    "Orc Shaman": { hp: 1.2, mp: 1.1, atk: 1.4, def: 1.1, spd: 1.0, crit: 4 }, // Mago de Batalha

    // === ORCS (Segunda Transferência - Lvl 40) ===
    "Destroyer": { hp: 2.0, mp: 0.8, atk: 2.2, def: 1.4, spd: 0.8, crit: 8 },
    "Tyrant": { hp: 1.6, mp: 1.0, atk: 1.8, def: 1.1, spd: 1.6, crit: 15 },
    "Overlord": { hp: 1.6, mp: 1.4, atk: 1.8, def: 1.4, spd: 1.0, crit: 5 }, // Foco em Debuff e absorção
    "Warcryer": { hp: 1.5, mp: 1.5, atk: 1.7, def: 1.3, spd: 1.1, crit: 5 }, // Foco em Buffs para o grupo

    // === ORCS (Terceira Transferência - Lvl 76) ===
    "Titan": { hp: 2.8, mp: 1.0, atk: 3.5, def: 1.8, spd: 0.85, crit: 12 }, // O monstro do Frenzy
    "Grand Khavatari": { hp: 2.0, mp: 1.2, atk: 2.8, def: 1.3, spd: 1.9, crit: 25 }, // Metralhadora de socos
    "Dominator": { hp: 2.2, mp: 1.8, atk: 2.5, def: 1.8, spd: 1.0, crit: 8 },
    "Doomcryer": { hp: 2.0, mp: 2.0, atk: 2.4, def: 1.6, spd: 1.2, crit: 8 },

    // === ANÕES (Classe Base - Lvl 1) ===
    "Dwarven Fighter": { hp: 1.2, mp: 0.8, atk: 1.1, def: 1.2, spd: 0.9, crit: 4 },

    // === ANÕES (SCAVENGER / BOUNTY HUNTER / FORTUNE SEEKER) - Foco em Spoil e Adagas ===
    "Scavenger": { hp: 1.3, mp: 0.9, atk: 1.2, def: 1.2, spd: 1.1, crit: 8 },
    "Bounty Hunter": { hp: 1.5, mp: 1.0, atk: 1.4, def: 1.3, spd: 1.2, crit: 12 },
    "Fortune Seeker": { hp: 1.8, mp: 1.1, atk: 1.7, def: 1.5, spd: 1.3, crit: 15 },

    // === ANÕES (ARTISAN / WARSMITH / MAESTRO) - Foco em Força, Golems e Machados ===
    "Artisan": { hp: 1.4, mp: 1.1, atk: 1.3, def: 1.3, spd: 0.9, crit: 5 },
    "Warsmith": { hp: 1.7, mp: 1.2, atk: 1.6, def: 1.5, spd: 0.9, crit: 6 },
    "Maestro": { hp: 2.1, mp: 1.4, atk: 2.0, def: 1.8, spd: 1.0, crit: 8 },
};

// Árvore de Evolução e Requisitos (Com trava de Raça para Nível 1)
const classEvolutions = {
    // === Nível 1 -> 20 (Filtro por Raça) ===
    // === Nível 1 -> 20 (Filtro por Raça) ===
    "Human_Fighter": [
        { nome: "Warrior", reqLvl: 20, desc: "Focus on brute physical damage and melee combat.", cor: "#f97316" },
        { nome: "Human Knight", reqLvl: 20, desc: "Focus on defense and survival (tank).", cor: "#60a5fa" },
        { nome: "Rogue", reqLvl: 20, desc: "Focus on speed, critical hits, and evasion.", cor: "#fde047" }
    ],
    "Human_Mage": [
        { nome: "Human Wizard", reqLvl: 20, desc: "Focus on destructive magic damage. Low defense.", cor: "#ef4444" },
        { nome: "Cleric", reqLvl: 20, desc: "Focused on healing magic and divine support.", cor: "#22c55e" }
    ],
   // === Nível 1 -> 20 (Atualize a lista do Dark_Fighter para ter as 3 opções) ===
    "Dark_Fighter": [
        { nome: "Assassin", reqLvl: 20, desc: "Focus on speed, daggers, and critical damage.", cor: "#6b7280" },
        { nome: "Palus Ranger", reqLvl: 20, desc: "Dark archer focused on high damage per shot.", cor: "#166534" },
        { nome: "Palus Knight", reqLvl: 20, desc: "Warrior focused on dual swords and shadow magic.", cor: "#7f1d1d" }
    ],
    "Dark_Mage": [
        { nome: "Dark Wizard", reqLvl: 20, desc: "Mage focused on offensive damage spells and summons.", cor: "#991b1b" },
        { nome: "Shillien Oracle", reqLvl: 20, desc: "Focused on heals, combat buffs, and divine support.", cor: "#2563eb" }
    ],
    // === Nível 20 -> 40 ===
    "Warrior": [
        { nome: "Gladiator", reqLvl: 40, desc: "Blade master. High damage and speed.", cor: "#ea580c" },
        { nome: "Warlord", reqLvl: 40, desc: "Pole weapon master. Area damage specialist.", cor: "#b45309" }
    ],
    "Human Knight": [
        { nome: "Paladin", reqLvl: 40, desc: "Warrior of Light. Extreme divine defense and healing.", cor: "#3b82f6" },
        { nome: "Dark Avenger", reqLvl: 40, desc: "Dark knight. Near-impenetrable defense.", cor: "#8b5cf6" }
    ],
    "Rogue": [
        { nome: "Treasure Hunter", reqLvl: 40, desc: "Dagger master. Extreme crit and lethal speed.", cor: "#fde047" },
        { nome: "Hawkeye", reqLvl: 40, desc: "Bow master. Massive ranged damage.", cor: "#f97316" }
    ],
   "Human Wizard": [
        { nome: "Necromancer", reqLvl: 40, desc: "Master of Death. Overwhelming shadow damage.", cor: "#9333ea" },
        { nome: "Sorcerer", reqLvl: 40, desc: "Fire master. Explosions and catastrophic area damage.", cor: "#ef4444" },
        { nome: "Warlock", reqLvl: 40, desc: "Summoner master. Calls magical felines into battle.", cor: "#ca8a04" }
    ],
    "Assassin": [
        { nome: "Abyss Walker", reqLvl: 40, desc: "Lethal shadow assassin.", cor: "#374151" }
    ],
  "Dark Wizard": [
        { nome: "Spellhowler", reqLvl: 40, desc: "Mage focused on raw magic damage, wind, and darkness.", cor: "#7e22ce" },
        { nome: "Phantom Summoner", reqLvl: 40, desc: "Summoner who commands dark demons to fight for him.", cor: "#475569" }
    ],
    "Shillien Oracle": [
        { nome: "Shillien Elder", reqLvl: 40, desc: "Master of buffs and mana recharge.", cor: "#1d4ed8" }
    ],
    "Palus Ranger": [
        { nome: "Phantom Ranger", reqLvl: 40, desc: "Lethal shooter; trades defense for massive damage.", cor: "#14532d" }
    ],
    // === Nível 20 -> 40 ===
    "Palus Knight": [
        { nome: "Bladedancer", reqLvl: 40, desc: "Master of dual blades and war dances.", cor: "#991b1b" },
        { nome: "Shillien Knight", reqLvl: 40, desc: "Dark knight with sword, shield, and life-steal magic.", cor: "#1e3a8a" }
    ],
    // === Nível 40 -> 76 (3rd Class Transfer) ===
    "Gladiator": [
        { nome: "Duelist", reqLvl: 76, desc: "The peak of martial combat. Massive physical damage.", cor: "#ef4444" }
    ],
    "Warlord": [
        { nome: "Dreadnought", reqLvl: 76, desc: "Lord of battle. Dominates whole armies.", cor: "#9a3412" }
    ],
    "Paladin": [
        { nome: "Phoenix Knight", reqLvl: 76, desc: "Immortality incarnate. Unbreakable wall of light.", cor: "#2563eb" }
    ],
    "Dark Avenger": [
        { nome: "Hell Knight", reqLvl: 76, desc: "Absolute shadow control. A wall of terror and resilience.", cor: "#dc2626" }
    ],
    "Treasure Hunter": [
        { nome: "Adventurer", reqLvl: 76, desc: "Peak lethal combat. Imperceptible moves and perfect crits.", cor: "#facc15" }
    ],
    "Hawkeye": [
        { nome: "Sagittarius", reqLvl: 76, desc: "Legendary elite archer. Every arrow is a death sentence.", cor: "#ea580c" }
    ],
    "Necromancer": [
        { nome: "Soultaker", reqLvl: 76, desc: "The abyss incarnate. Commands life, death, and cruel curses.", cor: "#6b21a8" }
    ],
    "Sorcerer": [
        { nome: "Archmage", reqLvl: 76, desc: "The peak of fire magic. Volcanic obliteration.", cor: "#7f1d1d" }
    ],
    "Warlock": [
        { nome: "Arcane Lord", reqLvl: 76, desc: "Lord of summons. Commands the Feline King.", cor: "#b91c1c" }
    ],
    // Lembre de colocar a vírgula depois do bloco do Warlock!
    "Cleric": [
        { nome: "Bishop", reqLvl: 40, desc: "Master of heals and divine shields. Nearly immortal.", cor: "#22c55e" }
    ],
    "Bishop": [
        { nome: "Cardinal", reqLvl: 76, desc: "Sacred envoy. Can perform miraculous heals.", cor: "#10b981" }
    ],
    "Abyss Walker": [
        { nome: "Ghost Hunter", reqLvl: 76, desc: "A lethal ghost on the battlefield.", cor: "#111827" }
    ],
    "Spellhowler": [
        { nome: "Storm Screamer", reqLvl: 76, desc: "The storm incarnate. Extreme damage.", cor: "#3b0764" }
    ],
    "Phantom Ranger": [
        { nome: "Ghost Sentinel", reqLvl: 76, desc: "The phantom shooter. Shots that pierce the soul.", cor: "#052e16" }
    ],
    "Bladedancer": [
        { nome: "Spectral Dancer", reqLvl: 76, desc: "The dance of death. Their moves wipe out armies.", cor: "#450a0a" }
    ],
    "Shillien Knight": [ { nome: "Shillien Templar", reqLvl: 76, desc: "Shillien's unbreakable wall.", cor: "#172554" } ],
    "Phantom Summoner": [ { nome: "Spectral Master", reqLvl: 76, desc: "Supreme master of shadow entities.", cor: "#334155" } ],
    "Shillien Elder": [ { nome: "Shillien Saint", reqLvl: 76, desc: "Divinity of healing and shadow miracles.", cor: "#1e40af" } ],
    // === Nível 1 -> 20 (Elfos da Luz) ===
    "Elf_Fighter": [
        { nome: "Elven Knight", reqLvl: 20, desc: "Warrior focused on shield defense and light magic.", cor: "#3b82f6" },
        { nome: "Elven Scout", reqLvl: 20, desc: "Expert in evasion, speed, daggers, and bows.", cor: "#22c55e" }
    ],
    "Elf_Mage": [
        { nome: "Elven Wizard", reqLvl: 20, desc: "Mage focused on cast speed and water magic.", cor: "#0ea5e9" },
        { nome: "Elven Oracle", reqLvl: 20, desc: "Healer focused on defense and speed.", cor: "#facc15" }
    ],

    // === Nível 20 -> 40 (Elfos da Luz) ===
    "Elven Knight": [
        { nome: "Temple Knight", reqLvl: 40, desc: "Holy knight with divine shield and high block rate.", cor: "#1d4ed8" },
        { nome: "Swordsinger", reqLvl: 40, desc: "Support warrior who sings songs that raise party defense.", cor: "#8b5cf6" }
    ],
    "Elven Scout": [
        { nome: "Plains Walker", reqLvl: 40, desc: "Fastest assassin in Aden. Dagger specialist.", cor: "#15803d" },
        { nome: "Silver Ranger", reqLvl: 40, desc: "Extremely fast archer. Shoot and run.", cor: "#a3e635" }
    ],
    "Elven Wizard": [
        { nome: "Spellsinger", reqLvl: 40, desc: "Water mage with the fastest casting in the game.", cor: "#0284c7" },
        { nome: "Elemental Summoner", reqLvl: 40, desc: "Summoner who commands magic unicorns.", cor: "#60a5fa" }
    ],
    "Elven Oracle": [
        { nome: "Elven Elder", reqLvl: 40, desc: "Healer focused on quick heals and defense buffs.", cor: "#eab308" }
    ],

    // === Nível 40 -> 76 (Elfos da Luz) ===
    "Temple Knight": [ { nome: "Eva's Templar", reqLvl: 76, desc: "Eva's absolute guardian. Impenetrable shield.", cor: "#1e3a8a" } ],
    "Swordsinger": [ { nome: "Sword Muse", reqLvl: 76, desc: "Divine voice that rallies whole armies.", cor: "#6d28d9" } ],
    "Plains Walker": [ { nome: "Wind Rider", reqLvl: 76, desc: "Rides the winds. Nearly impossible to hit.", cor: "#14532d" } ],
    "Silver Ranger": [ { nome: "Moonlight Sentinel", reqLvl: 76, desc: "Moon sentinel. Their arrows are beams of light.", cor: "#65a30d" } ],
    "Spellsinger": [ { nome: "Mystic Muse", reqLvl: 76, desc: "Absolute mastery of ice and water.", cor: "#0369a1" } ],
    "Elemental Summoner": [ { nome: "Elemental Master", reqLvl: 76, desc: "Commander of the Unicorn King (Magnus).", cor: "#3b82f6" } ],
    "Elven Elder": [ { nome: "Eva's Saint", reqLvl: 76, desc: "Saint of divine light. Supreme healing.", cor: "#ca8a04" } ],

    // === Nível 1 -> 20 (Filtro por Raça: ORCS) ===
    "Orc_Fighter": [
        { nome: "Orc Raider", reqLvl: 20, desc: "Warrior focused on brute strength and two-handed swords.", cor: "#dc2626" },
        { nome: "Monk", reqLvl: 20, desc: "Martial artist using claws and high-speed attacks.", cor: "#ea580c" }
    ],
    "Orc_Mage": [
        { nome: "Orc Shaman", reqLvl: 20, desc: "Battle mage. Curses enemies and supports physical attacks.", cor: "#84cc16" }
    ],

    // === Nível 20 -> 40 (ORCS) ===
    "Orc Raider": [
        { nome: "Destroyer", reqLvl: 40, desc: "A monster on the battlefield. The lower his HP, the harder he hits.", cor: "#991b1b" }
    ],
    "Monk": [
        { nome: "Tyrant", reqLvl: 40, desc: "Master of animal totems. Insane attack speed.", cor: "#c2410c" }
    ],
    "Orc Shaman": [
        { nome: "Overlord", reqLvl: 40, desc: "Clan leader. Expert at rooting and shattering whole armies.", cor: "#4d7c0f" },
        { nome: "Warcryer", reqLvl: 40, desc: "War shaman. Chants that empower everyone nearby.", cor: "#65a30d" }
    ],

    // === Nível 40 -> 76 (ORCS - ENDGAME) ===
    "Destroyer": [ { nome: "Titan", reqLvl: 76, desc: "Wrath incarnate. Said to slay gods in one blow.", cor: "#7f1d1d" } ],
    "Tyrant": [ { nome: "Grand Khavatari", reqLvl: 76, desc: "Peak of melee. Fists that break mountains.", cor: "#9a3412" } ],
    "Overlord": [ { nome: "Dominator", reqLvl: 76, desc: "Absolute lord of war. Relentless crowd control.", cor: "#3f6212" } ],
    "Warcryer": [ { nome: "Doomcryer", reqLvl: 76, desc: "Herald of destruction. Supreme support and damage chants.", cor: "#4d7c0f" } ],
    // === ANÕES: PRIMEIRA TRANSFERÊNCIA (Nível 20) ===
    "Dwarven Fighter": [
        { nome: "Scavenger", reqLvl: 20, desc: "Expert at extracting extra loot (Spoil) from monsters.", cor: "#facc15" },
        { nome: "Artisan", reqLvl: 20, desc: "Master builder. Summons mechanical golems to fight.", cor: "#d97706" }
    ],

    // === ANÕES: SEGUNDA TRANSFERÊNCIA (Nível 40) ===
    "Scavenger": [
        { nome: "Bounty Hunter", reqLvl: 40, desc: "King of farming. Maximizes rare resources and recipes.", cor: "#eab308" }
    ],
    "Artisan": [
        { nome: "Warsmith", reqLvl: 40, desc: "Legendary smith. Summons siege golems and hits hard with axes.", cor: "#b45309" }
    ],

    // === ANÕES: TERCEIRA TRANSFERÊNCIA (Nível 76) ===
    "Bounty Hunter": [ 
        { nome: "Fortune Seeker", reqLvl: 76, desc: "Living legend of wealth. Pulls unimaginable treasures (supreme Spoil).", cor: "#ca8a04" } 
    ],
    "Warsmith": [ 
        { nome: "Maestro", reqLvl: 76, desc: "Genius of mechanics. Wins battles with supreme clockwork creations.", cor: "#92400e" } 
    ],
};

function abrirMenuClasses() {
    fecharNpc(); // Esconde o menu do Grand Master
    
    let aviso = document.getElementById('classes-aviso');
    let container = document.getElementById('classes-opcoes-container');
    container.innerHTML = '';

    let tFn = (typeof window.t === 'function') ? window.t : null;
    let labelChange = tFn ? tFn('game.classes.changeBtn') : 'CHANGE';
    let labelAvailable = tFn ? tFn('game.classes.available') : 'Available!';
    let htmlRequires = function (lvl) { return tFn ? tFn('game.classes.requiresLevel', { level: lvl }) : ('Requires Level ' + lvl); };



    // === LÓGICA DE BUSCA DA CLASSE ===
    let chaveEvolucao = charClass;
    if (charClass === "Fighter" || charClass === "Mage") {
        chaveEvolucao = `${charRace}_${charClass}`; 
    }

    let opcoes = classEvolutions[chaveEvolucao];
    
    // Se a classe atual não tem mais pra onde evoluir (já é Level 76)
    if (!opcoes || opcoes.length === 0) {
        aviso.innerHTML = tFn ? tFn('game.classes.maxChroniclePower') : 'Your class has already reached the maximum power available in this chronicle!';
        aviso.style.color = "#10b981"; 
        aviso.style.display = "block";
        abrirModal('janela-classes', 1500);
        return;
    }

    // FILTRO: O que o jogador pode pegar e o que está bloqueado
    let precisaUpar = false;
    let temOpcaoDisponivel = false;
    
    opcoes.forEach(opcao => {
        let podeTransferir = nivel >= opcao.reqLvl;
        if (!podeTransferir) precisaUpar = true;
        else temOpcaoDisponivel = true;
        
        let btnDisabled = podeTransferir ? '' : 'disabled style="filter: grayscale(100%); opacity: 0.6;"';
        let txtStatus = podeTransferir ? `<span style="color:#10b981; font-weight:bold;">${labelAvailable}</span>` : `<span style="color:#ef4444; font-weight:bold;">${htmlRequires(opcao.reqLvl)}</span>`;
        
        // Só renderiza se ele já tiver nível pra ver, OU se for a próxima da linha dele
        container.innerHTML += `
            <div style="background: #111; border: 1px solid ${opcao.cor}; padding: 10px; border-radius: 5px; margin-bottom: 10px; text-align: left;">
                <h4 style="margin: 0 0 5px 0; color: ${opcao.cor}; text-shadow: 1px 1px 0 #000;">${opcao.nome}</h4>
                <p style="margin: 0 0 10px 0; font-size: 11px; color: #ccc;">${opcao.desc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    ${txtStatus}
                   <button class="btn-l2" style="width: auto; padding: 5px 15px; background: ${opcao.cor}; color: #000; font-weight: bold; margin: 0;" ${btnDisabled} onclick="confirmarTrocaClasse('${opcao.nome.replace(/'/g, "\\'")}')">${labelChange}</button>
                </div>
            </div>
        `;
    });
    
    if (precisaUpar && !temOpcaoDisponivel) { 
        let proximoLvl = opcoes[0].reqLvl;
        aviso.innerHTML = tFn
            ? tFn('game.classes.returnGrandMasterLevel', { level: proximoLvl })
            : (`Return to the Grand Master when you reach <b style="color:#ef4444;">Level ${proximoLvl}</b>.`);
        aviso.style.color = "#ccc"; 
        aviso.style.display = "block"; 
    } else { 
        aviso.style.display = "none"; 
    }
    
    abrirModal('janela-classes', 1500);
}

function fecharMenuClasses() { fecharModal('janela-classes'); }

function confirmarTrocaClasse(novaClasse) {
    // 1. Esconde a janela de lista de classes para não encavalar
    fecharMenuClasses();
    
    let tFn = (typeof window.t === 'function') ? window.t : null;

    // 2. Prepara a nossa janela nativa do jogo para perguntar se ele tem certeza
    abrirModal('janela-item-acao', 2100);
    
    let ctitle = tFn ? tFn('game.classes.confirmTitle') : 'CONFIRM CLASS';
    document.getElementById('acao-titulo').innerHTML = `<span style="color:#ef4444; text-shadow: 1px 1px 0 #000;">${ctitle}</span>`;
    document.getElementById('acao-img').src = 'assets/npcs/magister.png';
    
    let intro = tFn ? tFn('game.classes.confirmIntro') : 'You are about to walk the path of the';
    let warn = tFn ? tFn('game.classes.confirmWarning') : 'Warning: This choice is permanent and cannot be undone!';
    document.getElementById('acao-desc').innerHTML = `
        ${intro} <b style="color:#fde047; font-size:1.2em;">${novaClasse}</b>.<br><br>
        <span style="color:#ef4444; font-weight:bold;">${warn}</span>
    `;
    
    let btnAcao = document.getElementById('btn-acao-item');
    btnAcao.innerText = tFn ? tFn('game.classes.confirmAdvance') : 'YES, ADVANCE MY CLASS!';
    btnAcao.style.background = "#15803d"; // Verde de sucesso
    
    btnAcao.onclick = function() { 
        executarTrocaClasse(novaClasse); 
    };
}

function executarTrocaClasse(novaClasse) {
    let tFn = (typeof window.t === 'function') ? window.t : null;

    charClass = novaClasse;
    tocarSom('lvlup'); 
    let ascMsg = tFn ? tFn('game.classes.logAscension', { className: novaClasse }) : (`🌟 ASCENSION! You are now a ${novaClasse}!`);
    escreverLog(`<span style="color:#fde047; font-size:1.2em; font-weight:bold; text-shadow: 1px 1px 0 #000;">${ascMsg}</span>`);
    
    calcularStatusGlobais(); // Recalcula os status com a nova classe!
    playerHP = playerStats.maxHp; playerMP = playerStats.maxMp; // Enche a vida de brinde
    
    atualizar(); renderizarPerfil(); salvarJogo();
    
    let stitle = tFn ? tFn('game.classes.successTitle') : 'CLASS TRANSFER SUCCESS';
    document.getElementById('acao-titulo').innerHTML = `<span style="color:#10b981; text-shadow: 1px 1px 0 #000;">${stitle}</span>`;
    let congrats = tFn ? tFn('game.classes.successCongrats') : 'Congratulations!';
    let bodyRaw = tFn
        ? tFn('game.classes.successBody', { className: `<b style="color:#fde047">${novaClasse}</b>` })
        : (`You advanced to <b style="color:#fde047">${novaClasse}</b>. Your base stats were boosted and your combat potential rose sharply!`);
    document.getElementById('acao-desc').innerHTML = `<b style="color:white; font-size: 1.2em;">${congrats}</b><br><br><span style="color:#ccc;">${bodyRaw}</span>`;
    
    let btnAcao = document.getElementById('btn-acao-item');
    btnAcao.innerText = tFn ? tFn('game.enchantUi.continue') : 'CONTINUE'; 
    btnAcao.style.background = "#ca8a04";
    btnAcao.onclick = function() { fecharJanelaAcao(); };
}