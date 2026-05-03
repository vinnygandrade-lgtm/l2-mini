// ==========================================
// BANCO DE DADOS - MONSTROS E ZONAS DE CAÇA
// (drops Adena alinhados a economia multiplayer / farm)
// ==========================================

const zonasDeCaca = {
    'No-Grade': { 
        id: 'No-Grade', nome: 'Talking Island', custo: 0, 
        mobs: [
            { idImg: 'spider', nome: 'GIANT SPIDER', hpMax: 100, atk: 22, def: 20, dropAd: 72, xp: 40, chance: 40, atkSpd: 2000, lvl: 5 },
            { idImg: 'wolf', nome: 'WOLF', hpMax: 80, atk: 25, def: 15, dropAd: 52, xp: 35, chance: 35, atkSpd: 1200, lvl: 3 },
            { idImg: 'goblin', nome: 'GOBLIN', hpMax: 60, atk: 18, def: 10, dropAd: 38, xp: 20, chance: 25, atkSpd: 2500, lvl: 2 }
        ] 
    },
    'D': { 
        id: 'D', nome: 'Ruins of Despair', custo: 100, 
        mobs: [
            { idImg: 'zombie', nome: 'ZOMBIE SOLDIER', hpMax: 350, atk: 55, def: 60, dropAd: 238, xp: 120, chance: 40, atkSpd: 2200, lvl: 22 },
            { idImg: 'skeleton', nome: 'SKELETON ARCHER', hpMax: 280, atk: 65, def: 40, dropAd: 205, xp: 110, chance: 35, atkSpd: 1800, lvl: 24 },
            { idImg: 'bat', nome: 'RUIN BAT', hpMax: 180, atk: 45, def: 30, dropAd: 158, xp: 90, chance: 25, atkSpd: 1000, lvl: 20 }
        ] 
    },
    'C': { 
        id: 'C', nome: 'Death Pass', custo: 500, 
        mobs: [
            { idImg: 'fettered_soul', nome: 'FETTERED SOUL', hpMax: 1200, atk: 180, def: 180, dropAd: 718, xp: 400, chance: 40, atkSpd: 2800, lvl: 42 },
            { idImg: 'leto_lizardman', nome: 'LETO LIZARDMAN', hpMax: 900, atk: 150, def: 150, dropAd: 636, xp: 350, chance: 35, atkSpd: 1800, lvl: 40 },
            { idImg: 'wyrm', nome: 'WYRM', hpMax: 600, atk: 110, def: 100, dropAd: 478, xp: 250, chance: 25, atkSpd: 1000, lvl: 38 }
        ] 
    },
    'B': { 
        id: 'B', nome: 'Dragon Valley', custo: 2000, 
        mobs: [
            { idImg: 'cave_beast', nome: 'CAVE BEAST', hpMax: 3000, atk: 350, def: 350, dropAd: 2150, xp: 1100, chance: 40, atkSpd: 2800, lvl: 55 },
            { idImg: 'malruk_soldier', nome: 'MALRUK SOLDIER', hpMax: 2400, atk: 320, def: 300, dropAd: 1980, xp: 1000, chance: 35, atkSpd: 1800, lvl: 53 },
            { idImg: 'bloody_queen', nome: 'BLOODY QUEEN', hpMax: 1600, atk: 250, def: 200, dropAd: 1490, xp: 800, chance: 25, atkSpd: 1000, lvl: 51 }
        ] 
    },
    'A': { 
        id: 'A', nome: 'Tower of Insolence', custo: 10000, 
        mobs: [
            { idImg: 'doom_knight', nome: 'DOOM KNIGHT', hpMax: 7000, atk: 750, def: 700, dropAd: 6800, xp: 3500, chance: 40, atkSpd: 2800, lvl: 70 },
            { idImg: 'platinum_guardian', nome: 'PLATINUM GUARDIAN', hpMax: 6000, atk: 650, def: 600, dropAd: 5950, xp: 3000, chance: 35, atkSpd: 1800, lvl: 68 },
            { idImg: 'guardian_angel', nome: 'GUARDIAN ANGEL', hpMax: 4500, atk: 500, def: 450, dropAd: 4760, xp: 2500, chance: 25, atkSpd: 1000, lvl: 65 }
        ] 
    },
   'S': { 
        id: 'S', nome: 'Imperial Tomb', custo: 50000, 
        mobs: [
            { idImg: 'undead_knight', nome: 'UNDEAD KNIGHT', hpMax: 15000, atk: 1400, def: 1500, dropAd: 31800, xp: 12000, chance: 40, atkSpd: 2800, lvl: 80 },
            { idImg: 'imperial_guard', nome: 'IMPERIAL GUARD', hpMax: 12000, atk: 1200, def: 1200, dropAd: 26500, xp: 10000, chance: 35, atkSpd: 1800, lvl: 78 },
            { idImg: 'tomb_banshee', nome: 'TOMB BANSHEE', hpMax: 8500, atk: 1000, def: 900, dropAd: 21200, xp: 8000, chance: 25, atkSpd: 1000, lvl: 76 }
        ] 
    }
};

let zonaAtual = zonasDeCaca['No-Grade'];
