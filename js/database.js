// ==========================================
// BANCO DE DADOS E VARIÁVEIS DO JOGADOR
// ==========================================

const sons = { 
    ataque: new Audio('assets/sons/hit.wav'), 
    enchant: new Audio('assets/sons/sucesso.wav'), 
    lvlup: new Audio('assets/sons/levelup.mp3'), 
    adenas: null // Sound file missing
};

function tocarSom(nome) { 
    if(sons[nome]) { 
        sons[nome].currentTime = 0; 
        sons[nome].play().catch(() => {}); 
    } 
}

// Banco de Dados de Status Iniciais por Raça
window.statusIniciais = {
    "Human": { 
        hpFighter: 100, mpFighter: 40, 
        hpMage: 80, mpMage: 80, 
        danoFighter: 10, danoMage: 6, 
        atkSpeedFighter: 500, atkSpeedMage: 600, 
        critico: 5 
    },
    "Elf": { 
        hpFighter: 90, mpFighter: 50, 
        hpMage: 70, mpMage: 100, 
        danoFighter: 8, danoMage: 8, 
        atkSpeedFighter: 450, atkSpeedMage: 550, 
        critico: 10 
    },
    "Dark Elf": { 
        hpFighter: 85, mpFighter: 45, 
        hpMage: 65, mpMage: 95, 
        danoFighter: 12, danoMage: 12, 
        atkSpeedFighter: 480, atkSpeedMage: 580, 
        critico: 15 
    },
    "Orc": { 
        hpFighter: 130, mpFighter: 30, 
        hpMage: 110, mpMage: 60, 
        danoFighter: 11, danoMage: 5, 
        atkSpeedFighter: 600, atkSpeedMage: 700, 
        critico: 3 
    },
    "Dwarf": { 
        hpFighter: 120, mpFighter: 40, 
        hpMage: 120, mpMage: 40, // Dwarf only has Fighter, but adding Mage for safety
        danoFighter: 9, danoMage: 4, 
        atkSpeedFighter: 550, atkSpeedMage: 650, 
        critico: 4 
    }
};

// Nota: As variáveis do personagem (charName, etc) foram movidas para js/core_globals.js 
// para centralização e segurança de escopo.
