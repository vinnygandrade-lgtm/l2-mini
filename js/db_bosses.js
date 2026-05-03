// ==========================================
// DATABASE: RAID BOSSES & EPIC ENCOUNTERS
// ==========================================

const catalogoBosses = {
    'boss_antharas': {
        id: 'boss_antharas',
        nome: 'Antharas, the Earth Dragon',
        nivel: 85,
        img: 'assets/mobs/undead_knight_idle.png', // Placeholder (Original missing)

        // 🕒 SISTEMA DE HORÁRIO DE SPAWN (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab)
        spawn: {
            dias: [2, 4, 6], // Aparece às Terças, Quintas e Sábados
            horaInicio: 15,  // Abre às 15:00
            horaFim: 22,     // Fecha às 22:00
            msgFechado: "The Earth Dragon sleeps. It awakens on Tuesday, Thursday, and Saturday, between 15:00 and 22:00."
        },
        
        // Status Colossais (Feitos para 50 pessoas baterem por minutos)
        hpMax: 10000000, 
        pAtk: 3500,      
        mAtk: 4500,      
        pDef: 3000,
        mDef: 2500,
        
       // Tabela de Drops Épicos
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 500, max: 1500 }, 
            { id: 'frag_antharas', chance: 100, min: 5, max: 15, epic: true }, 
            { id: 'sc_ba_s', chance: 50, min: 1, max: 4 }, 
            { id: 'sc_bw_s', chance: 35, min: 1, max: 2 } 
        ],

        // Inteligência Artificial / Padrão de Ataque (RaidEngine: especial → AoE → básico)
        skills: {
            furia_quando_hp_menor_que_pct: 25,
            furia_bonus_chance: 16,
            msg_furia_log: "<span style='color:#fca5a5; font-weight:bold;'>[ENRAGE] Antharas’s heart ruptures — the Earth Dragon is done playing!</span>",
            ataque_basico: {
                nome: "Crushing Claws",
                tipo: "single",
                danoMult: 1.0,
                delay: 1900,
                msg: "Antharas crushes a warrior with its claws!"
            },
            habilidade_area: {
                nome: "Earthquake & Dragon Breath",
                tipo: "aoe",
                danoMult: 1.48,
                danoMultFuria: 1.14,
                cooldown: 14500,
                chance: 32,
                msg: "<span style='color:#ef4444; font-weight:bold;'>Antharas takes flight and breathes fire on the whole raid! CATACLYSM!</span>",
                msgDanoPlayer: "Dragon breath sears you for ${dano} magic damage!"
            },
            habilidade_especial: {
                nome: "Deep Earth Implosion",
                cooldown: 22000,
                chance: 24,
                inicioAposMs: 8000,
                danoMult: 2.35,
                danoMultFuria: 1.18,
                tipoDano: "mágico",
                msg: "<span style='color:#f97316; font-weight:bold;'>The ground collapses under Antharas — telluric energy erupts in a cone!</span>",
                msgDanoPlayer: "Telluric implosion shatters your defenses: ${dano} HP!"
            }
        }
    }
};

// ==========================================
// BOSSES DIÁRIOS (1x/dia por personagem — grade = tier do jogador)
// Regiões espelham as zonas de caça do jogo (Talking Island → Imperial Tomb)
// ==========================================

const catalogoBossesDiarios = {
    daily_boss_ng: {
        id: 'daily_boss_ng',
        nome: 'Queen Arachnobid — Crystal Spider',
        regiao: 'Talking Island',
        gradeRef: 'No-Grade',
        nivel: 12,
        img: 'assets/mobs/goblin.png',
        hpMax: 4000,
        pAtk: 45,
        mAtk: 55,
        pDef: 140,
        mDef: 125,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 8, max: 28 },
            { id: 'sc_w_ng', chance: 55, min: 1, max: 2 },
            { id: 'sc_a_ng', chance: 70, min: 1, max: 3 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 42,
            furia_bonus_chance: 10,
            msg_furia_log: "<span style='color:#f87171; font-weight:bold;'>[Frenzy] The Queen accelerates — venom and stings come faster!</span>",
            ataque_basico: {
                nome: 'Venomous Mandible',
                tipo: 'single',
                danoMult: 1.0,
                delay: 2700,
                msg: 'The Queen pierces the crystal floor and stings the front line!'
            },
            habilidade_area: {
                nome: 'Web Rain',
                tipo: 'aoe',
                danoMult: 1.32,
                danoMultFuria: 1.1,
                cooldown: 14500,
                chance: 26,
                msg: "<span style='color:#a78bfa; font-weight:bold;'>Web Rain — acid covers the whole field!</span>",
                msgDanoPlayer: 'Acid webs burn you for ${dano} magic damage!'
            },
            habilidade_especial: {
                nome: 'Brood Ambush',
                cooldown: 22000,
                chance: 20,
                inicioAposMs: 6500,
                danoMult: 1.88,
                danoMultFuria: 1.12,
                tipoDano: 'físico',
                msg: "<span style='color:#fbbf24; font-weight:bold;'>Spiderlings drop from the ceiling in sync!</span>",
                msgDanoPlayer: 'The brood bites and tears — ${dano} HP lost!'
            }
        }
    },
    daily_boss_d: {
        id: 'daily_boss_d',
        nome: 'Barion, Headsman of the Ruins',
        regiao: 'Ruins of Despair',
        gradeRef: 'D',
        nivel: 28,
        img: 'assets/mobs/zombie.png',
        hpMax: 12000,
        pAtk: 120,
        mAtk: 110,
        pDef: 275,
        mDef: 240,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 22, max: 65 },
            { id: 'sc_w_d', chance: 45, min: 1, max: 2 },
            { id: 'sc_a_d', chance: 60, min: 1, max: 2 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 38,
            furia_bonus_chance: 11,
            msg_furia_log: "<span style='color:#86efac; font-weight:bold;'>[Catacomb] Barion bleeds pestilence — every breath spreads rot!</span>",
            ataque_basico: {
                nome: 'Catacomb Reaper',
                tipo: 'single',
                danoMult: 1.0,
                delay: 2350,
                msg: 'Barion drags his rusted blade and cuts someone on the front line!'
            },
            habilidade_area: {
                nome: 'Putrid Fog',
                tipo: 'aoe',
                danoMult: 1.4,
                danoMultFuria: 1.12,
                cooldown: 12800,
                chance: 28,
                msg: "<span style='color:#86efac; font-weight:bold;'>Putrid Fog — noxious mist corrodes every lung!</span>",
                msgDanoPlayer: 'The gas rots your flesh: ${dano} magic damage!'
            },
            habilidade_especial: {
                nome: 'Abyss Burier',
                cooldown: 20000,
                chance: 22,
                inicioAposMs: 6000,
                danoMult: 2.05,
                danoMultFuria: 1.14,
                tipoDano: 'físico',
                msg: "<span style='color:#bef264; font-weight:bold;'>Barion drives the ritual spade into the ground — the floor swallows you!</span>",
                msgDanoPlayer: 'Buried impact! You lose ${dano} HP.'
            }
        }
    },
    daily_boss_c: {
        id: 'daily_boss_c',
        nome: 'Zaken’s Shade — Sombra do Estreito',
        regiao: 'Death Pass',
        gradeRef: 'C',
        nivel: 45,
        img: 'assets/mobs/fettered_soul.png',
        hpMax: 35000,
        pAtk: 280,
        mAtk: 320,
        pDef: 440,
        mDef: 460,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 45, max: 120 },
            { id: 'sc_bw_c', chance: 35, min: 1, max: 1 },
            { id: 'sc_a_c', chance: 55, min: 1, max: 2 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 36,
            furia_bonus_chance: 12,
            msg_furia_log: "<span style='color:#93c5fd; font-weight:bold;'>[Echo] Zaken’s shade screams — black magic condenses in the air!</span>",
            ataque_basico: {
                nome: 'Spectral Claw',
                tipo: 'single',
                danoMult: 1.0,
                delay: 2180,
                msg: 'The shade crosses the strait and slashes an adventurer head-on!'
            },
            habilidade_area: {
                nome: 'Strait Howl',
                tipo: 'aoe',
                danoMult: 1.46,
                danoMultFuria: 1.12,
                cooldown: 11800,
                chance: 30,
                msg: "<span style='color:#93c5fd; font-weight:bold;'>Strait Howl — frozen souls pass through you!</span>",
                msgDanoPlayer: 'The howl tears at your soul: ${dano} magic damage!'
            },
            habilidade_especial: {
                nome: 'Umbral Embrace',
                cooldown: 19000,
                chance: 24,
                inicioAposMs: 5500,
                danoMult: 2.15,
                danoMultFuria: 1.15,
                tipoDano: 'mágico',
                msg: "<span style='color:#c4b5fd; font-weight:bold;'>Spectral arms clutch your silhouette!</span>",
                msgDanoPlayer: 'The gloom crushes your mind — ${dano} HP!'
            }
        }
    },
    daily_boss_b: {
        id: 'daily_boss_b',
        nome: 'Drake Matriarch “Flameheart”',
        regiao: 'Dragon Valley',
        gradeRef: 'B',
        nivel: 58,
        img: 'assets/mobs/cave_beast.png',
        hpMax: 90000,
        pAtk: 700,
        mAtk: 750,
        pDef: 720,
        mDef: 690,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 90, max: 220 },
            { id: 'sc_bw_b', chance: 40, min: 1, max: 2 },
            { id: 'sc_ba_b', chance: 28, min: 1, max: 1 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 34,
            furia_bonus_chance: 13,
            msg_furia_log: "<span style='color:#fb923c; font-weight:bold;'>[Ignition] Flameheart scorches the air — the valley becomes an inferno!</span>",
            ataque_basico: {
                nome: 'Meteor Tail',
                tipo: 'single',
                danoMult: 1.0,
                delay: 2050,
                msg: 'Flameheart spins her blazing tail and hurls a lesser drake at the raid!'
            },
            habilidade_area: {
                nome: 'Valley Flames',
                tipo: 'aoe',
                danoMult: 1.5,
                danoMultFuria: 1.14,
                cooldown: 11200,
                chance: 32,
                msg: "<span style='color:#fb923c; font-weight:bold;'>Valley Flames — a heat wave melts armor!</span>",
                msgDanoPlayer: 'Flames wrap around you: ${dano} magic damage!'
            },
            habilidade_especial: {
                nome: 'Draconic Meteor',
                cooldown: 18500,
                chance: 26,
                inicioAposMs: 5000,
                danoMult: 2.05,
                danoMultFuria: 1.16,
                tipoDano: 'mágico',
                msg: "<span style='color:#f97316; font-weight:bold;'>A drake-shaped meteor crashes down on you!</span>",
                msgDanoPlayer: 'Searing impact! ${dano} HP burn away to ash!'
            }
        }
    },
    daily_boss_a: {
        id: 'daily_boss_a',
        nome: 'Sentinel of Insolence — Throne Warden',
        regiao: 'Tower of Insolence',
        gradeRef: 'A',
        nivel: 72,
        img: 'assets/mobs/doom_knight.png',
        hpMax: 180000,
        pAtk: 1400,
        mAtk: 1600,
        pDef: 1520,
        mDef: 1480,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 180, max: 420 },
            { id: 'frag_baium', chance: 18, min: 1, max: 1, epic: true },
            { id: 'sc_bw_a', chance: 42, min: 1, max: 2 },
            { id: 'sc_ba_a', chance: 30, min: 1, max: 2 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 32,
            furia_bonus_chance: 14,
            msg_furia_log: "<span style='color:#fde047; font-weight:bold;'>[Judgment] The Sentinel accelerates — the whole tower becomes a weapon!</span>",
            ataque_basico: {
                nome: 'Tower Blade',
                tipo: 'single',
                danoMult: 1.0,
                delay: 1920,
                msg: 'The Sentinel drops like a stone and shatters the ground beneath a target!'
            },
            habilidade_area: {
                nome: 'Vertical Judgment',
                tipo: 'aoe',
                danoMult: 1.55,
                danoMultFuria: 1.15,
                cooldown: 10200,
                chance: 34,
                msg: "<span style='color:#fde047; font-weight:bold;'>Vertical Judgment — golden bolts fall in a line!</span>",
                msgDanoPlayer: 'Tower lightning pierces you: ${dano} magic damage!'
            },
            habilidade_especial: {
                nome: 'Celestial Plunge',
                cooldown: 17500,
                chance: 28,
                inicioAposMs: 4800,
                danoMult: 2.2,
                danoMultFuria: 1.18,
                tipoDano: 'físico',
                msg: "<span style='color:#fcd34d; font-weight:bold;'>The Sentinel dives from the heavens with a glass-edged blade!</span>",
                msgDanoPlayer: 'Celestial cleave! You bleed for ${dano} HP.'
            }
        }
    },
    daily_boss_s: {
        id: 'daily_boss_s',
        nome: 'Harik Lich Lord — Master of the Imperial Tomb',
        regiao: 'Imperial Tomb',
        gradeRef: 'S',
        nivel: 80,
        img: 'assets/mobs/undead_knight.png',
        hpMax: 300000,
        pAtk: 2200,
        mAtk: 2600,
        pDef: 2350,
        mDef: 2280,
        drops: [
            { id: 'Ancient Coin', chance: 100, min: 420, max: 980 },
            { id: 'frag_antharas', chance: 12, min: 1, max: 2, epic: true },
            { id: 'sc_bw_s', chance: 45, min: 1, max: 3 },
            { id: 'sc_ba_s', chance: 38, min: 1, max: 2 }
        ],
        skills: {
            furia_quando_hp_menor_que_pct: 30,
            furia_bonus_chance: 15,
            msg_furia_log: "<span style='color:#c084fc; font-weight:bold;'>[Necrosis] Harik unleashes the final rite — death hastens!</span>",
            ataque_basico: {
                nome: 'Reaper Arc',
                tipo: 'single',
                danoMult: 1.0,
                delay: 1820,
                msg: 'Harik channels black mist and reaps a fighter with the ritual scythe!'
            },
            habilidade_area: {
                nome: 'Necrocrypt Storm',
                tipo: 'aoe',
                danoMult: 1.58,
                danoMultFuria: 1.16,
                cooldown: 9600,
                chance: 36,
                msg: "<span style='color:#c084fc; font-weight:bold;'>Necrocrypt Storm — souls lash the air like cutting wind!</span>",
                msgDanoPlayer: 'The necrotic storm tears ${dano} HP from you!'
            },
            habilidade_especial: {
                nome: 'Eternal Lich Claw',
                cooldown: 16800,
                chance: 30,
                inicioAposMs: 4200,
                danoMult: 2.25,
                danoMultFuria: 1.2,
                tipoDano: 'mágico',
                msg: "<span style='color:#e9d5ff; font-weight:bold;'>Harik manifests the Lich Claw — ice and hate in one blow!</span>",
                msgDanoPlayer: 'Spectral claws tear your soul: ${dano} magic damage!'
            }
        }
    }
};