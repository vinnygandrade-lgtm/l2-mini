// ==========================================
// UI - PAPERDOLL (VISUAL DO PERSONAGEM E NEON)
// ==========================================

function getGlowClass(lvl) { 
    if(lvl >= 25) return 'glow-25'; 
    if(lvl == 24) return 'glow-24'; 
    if(lvl == 23) return 'glow-23'; 
    if(lvl == 22) return 'glow-22'; 
    if(lvl == 21) return 'glow-21'; 
    if(lvl == 20) return 'glow-20'; 
    if(lvl >= 16) return 'glow-yellow'; 
    if(lvl >= 11) return 'glow-green'; 
    if(lvl >= 7) return 'glow-red'; 
    if(lvl >= 4) return 'glow-blue'; 
    return ''; 
}

window.atualizarVisualPaperdoll = function() {
    // 1. ATUALIZA A CAMADA BASE (O CORPO)
    let layerBase = document.getElementById('char-base-layer');
    if (layerBase) {
        let classeLimpa = typeof charClass !== 'undefined' ? charClass.toLowerCase().trim() : '';
        let isMage = classeLimpa.includes("mage") || classeLimpa.includes("wizard") || classeLimpa.includes("necromancer") || classeLimpa.includes("soultaker") || classeLimpa.includes("cleric");

        if (charRace === "Human" && !isMage) {
            layerBase.src = 'assets/chars/base_fighter.png'; 
            layerBase.style.objectFit = 'contain'; 
        } else {
            let prefixoRaca = "";
            if (charRace === "Dark Elf") prefixoRaca = "de_";
            else if (charRace === "Elf") prefixoRaca = "elf_";
            else if (charRace === "Orc") prefixoRaca = "orc_";
            else if (charRace === "Dwarf") prefixoRaca = "dwarf_";

            let sulfixoGenero = charGender === "Female" ? "mulher" : "homem";
            layerBase.src = `assets/chars/${prefixoRaca}${sulfixoGenero}.png`; 
            layerBase.style.objectFit = 'cover'; 
        }
    }

    // 2. ATUALIZA A CAMADA DA ARMADURA
    let layerArmor = document.getElementById('char-armor-layer');
    let armEquip = window.armaduraEquipada;
    if (armEquip && armEquip.id && layerArmor) {
        // Tenta usar a imagem específica de layer se existir, senão usa o padrão
        layerArmor.src = `assets/equips/${armEquip.id}.png`; 
        layerArmor.style.display = 'block';
        layerArmor.onerror = function() {
            this.onerror = null;
            this.style.display = 'none'; // Se não houver sprite de layer, esconde
        };
    } else if (layerArmor) {
        layerArmor.style.display = 'none'; 
    }

    // 3. ATUALIZA A CAMADA DA ARMA E DO CLONE DE LUZ
    let layerWeapon = document.getElementById('char-weapon-layer');
    let layerGlow = document.getElementById('char-weapon-glow'); 

    if (typeof armaEquipadaBase !== 'undefined' && armaEquipadaBase && layerWeapon) {
        const imgStr = armaEquipadaBase.img && String(armaEquipadaBase.img).trim();
        const srcWeapon = imgStr || (armaEquipadaBase.id ? `assets/equips/${armaEquipadaBase.id}.png` : '');
        if (srcWeapon) {
            layerWeapon.src = srcWeapon;
            layerWeapon.style.display = 'block';
            if (layerGlow) {
                layerGlow.src = srcWeapon;
                layerGlow.style.display = 'block';
            }
        } else {
            if (layerWeapon) layerWeapon.style.display = 'none';
            if (layerGlow) layerGlow.style.display = 'none';
        }
    } else {
        if (layerWeapon) layerWeapon.style.display = 'none'; 
        if (layerGlow) layerGlow.style.display = 'none'; 
    }

    // 4. LIGA O NEON!
    if (typeof atualizarBrilhoArma === 'function') {
        atualizarBrilhoArma();
    }
};

window.atualizarBrilhoArma = function() {
    let glowLayer = document.getElementById('char-weapon-glow');
    
    if (!glowLayer || typeof armaEquipadaBase === 'undefined' || !armaEquipadaBase || armaEquipadaBase.nome === 'Treining Sword') {
        if(glowLayer) {
            glowLayer.className = '';
            glowLayer.style.filter = 'none';
            glowLayer.style.animation = 'none';
        }
        return;
    }

    let lvl = typeof enchant !== 'undefined' ? enchant : 0;

    // Se menor que +4, desliga o brilho
    if (lvl < 4) { 
        glowLayer.className = ''; 
        glowLayer.style.filter = 'none'; 
        glowLayer.style.animation = 'none';
        return; 
    }

    // 1. DEFINIÇÃO DA COR
    let color = '#ffffff';
    if (lvl >= 4 && lvl <= 6)   color = '#00008b'; // Azul Escuro
    else if (lvl >= 7 && lvl <= 10)  color = '#ef4444'; // Vermelho
    else if (lvl >= 11 && lvl <= 15) color = '#22c55e'; // Verde
    else if (lvl >= 16 && lvl <= 19) color = '#eab308'; // Ouro
    else if (lvl === 20) color = '#f97316'; // Laranja
    else if (lvl === 21) color = '#a855f7'; // Roxo
    else if (lvl === 22) color = '#06b6d4'; // Ciano
    else if (lvl === 23) color = '#ec4899'; // Rosa
    else if (lvl === 24) color = '#ffffff'; // Branco

    // 2. CÁLCULO DA VELOCIDADE
    let speed = 2.4 - (lvl * 0.08); 
    if (speed < 0.4) speed = 0.4; 

    if (lvl >= 25) { 
        glowLayer.style.filter = '';
        glowLayer.style.animation = ''; 
        glowLayer.className = 'weapon-glow-divino'; 
    } else {
        glowLayer.className = ''; 
        glowLayer.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 18px ${color}) brightness(1.8) contrast(1.2)`;
        glowLayer.style.animation = 'none'; 
        void glowLayer.offsetWidth; // Truque para forçar o reset do CSS
        glowLayer.style.animation = `pulse-opacity ${speed}s infinite alternate ease-in-out`;
    }
};