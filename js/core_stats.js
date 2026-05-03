/* ========================================== */
/* STATS CALCULATION ENGINE                  */
/* ========================================== */

window.calcularStatusGlobais = function() {
    const race = window.charRace || "Human";
    const cl = window.charClass || "Fighter";
    
    if (!window.statusIniciais || !window.statusIniciais[race]) {
        console.warn("CalcularStatus: Raça não definida ou inválida. Usando padrão.");
    }
    
    let base = (window.statusIniciais && window.statusIniciais[race]) || (window.statusIniciais && window.statusIniciais["Human"]) || { hpFighter: 100, mpFighter: 40, hpMage: 80, mpMage: 80, danoFighter: 10, danoMage: 6, atkSpeedFighter: 500, atkSpeedMage: 600, critico: 5 };
    let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(cl) : false;

    if (typeof window.bancoDeSkills !== 'undefined' && window.bancoDeSkills['Attack']) {
        let imgAtaque = isMage ? "assets/skills/ataque_mago.png" : "assets/skills/ataque_guerreiro.png";
        window.bancoDeSkills['Attack'].icone = `<img src="${imgAtaque}" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0 0 3px #000); vertical-align: middle; pointer-events: none;">`;
    }

    let mod = (typeof window.classModifiers !== 'undefined' && window.classModifiers[cl]) ? window.classModifiers[cl] : { hp: 1.0, mp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 0 };
    let buffFighterLigado = (Date.now() < (window.tempoFimBuffGuerreiro || 0));
    let buffMageLigado = (Date.now() < (window.tempoFimBuffMistico || 0));

    if (buffFighterLigado) { 
        window.buffsAtivos.pAtkMult = 1.20; window.buffsAtivos.pDefMult = 1.20; window.buffsAtivos.mAtkMult = 1.0; window.buffsAtivos.mDefMult = 1.0; 
    } else if (buffMageLigado) { 
        window.buffsAtivos.mAtkMult = 1.30; window.buffsAtivos.mDefMult = 1.10; window.buffsAtivos.pAtkMult = 1.0; window.buffsAtivos.pDefMult = 1.0; 
    } else { 
        window.buffsAtivos.pAtkMult = 1.0; window.buffsAtivos.pDefMult = 1.0; window.buffsAtivos.mAtkMult = 1.0; window.buffsAtivos.mDefMult = 1.0; 
        window.tempoFimBuffGuerreiro = 0; window.tempoFimBuffMistico = 0; 
    }

    // Helper para extrair atributos de itens (suporta formato flat e aninhado .base)
    const getStat = (item, stat) => {
        if (!item) return 0;
        let val = 0;
        if (item.base && item.base[stat] !== undefined) val = item.base[stat];
        else if (item[stat] !== undefined) val = item[stat];
        return (typeof val === 'number' && !isNaN(val)) ? val : 0;
    };

    const arma = window.armaEquipadaBase;
    const armor = window.armaduraEquipada;
    const isAug = window.isAugmented;

    let bonusAugHp   = (isAug && arma) ? getStat(arma, 'augHp') : 0;
    let bonusAugPAtk = (isAug && arma) ? getStat(arma, 'augPAtk') : 0;
    let bonusAugMAtk = (isAug && arma) ? getStat(arma, 'augMAtk') : 0;
    let bonusAugPDef = (isAug && arma) ? getStat(arma, 'augPDef') : 0;
    let bonusAugMDef = (isAug && arma) ? getStat(arma, 'augMDef') : 0;
    let bonusAugSpd  = (isAug && arma) ? getStat(arma, 'augSpd') : 0;
    let bonusAugCrit = (isAug && arma) ? getStat(arma, 'augCrit') : 0;

    let armaBonusHp = getStat(arma, 'bonusHp');
    let armaBonusMp = getStat(arma, 'bonusMp');
    let armaBonusSpd = getStat(arma, 'bonusSpd');
    let armaBonusCrit = getStat(arma, 'bonusCrit');

    // Sincroniza os níveis de encante dos objetos com as globais
    let lvlWpn = (arma && arma.enchant !== undefined) ? arma.enchant : (window.enchant || 0);
    let lvlArm = (armor && armor.enchant !== undefined) ? armor.enchant : (window.enchantArmor || 0);

    let multEnchant = 1 + (lvlArm * 0.10);
    let armaduraBonusHp = Math.floor(getStat(armor, 'bonusHp') * multEnchant);
    let armaduraBonusMp = Math.floor(getStat(armor, 'bonusMp') * multEnchant);
    let armaduraBonusSpd = Math.floor(getStat(armor, 'bonusSpd') * multEnchant);
    let armaduraBonusCrit = Math.floor(getStat(armor, 'bonusCrit') * multEnchant);
    let armaduraBonusMDef = Math.floor(getStat(armor, 'bonusMDef') * multEnchant);
    
    let atkArmadura = Math.floor(getStat(armor, 'pAtk') * multEnchant);
    let matkArmadura = Math.floor(getStat(armor, 'mAtk') * multEnchant);
    
    let defArmaduraBase = getStat(armor, 'pDef') || getStat(armor, 'def');
    let defArmaduraTotal = Math.floor(defArmaduraBase * multEnchant);

    let joiasAtivas = [
        (window.colarEquipado || null),
        (window.brincoEquipado1 || null),
        (window.brincoEquipado2 || null),
        (window.anelEquipado1 || null),
        (window.anelEquipado2 || null)
    ].filter(j => j !== null);

    const getJewelEnchant = (j) => (j.enchant !== undefined ? j.enchant : (j.enchantJewel || 0));

    let joiasMDef = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'mDef') * (1 + (getJewelEnchant(j) * 0.10))), 0));
    let joiasBonusHp = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'bonusHp') * (1 + (getJewelEnchant(j) * 0.10))), 0)); 
    let joiasBonusMp = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'bonusMp') * (1 + (getJewelEnchant(j) * 0.10))), 0));
    let joiasBonusCrit = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'bonusCrit') * (1 + (getJewelEnchant(j) * 0.10))), 0));
    let joiasBonusSpd = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'bonusSpd') * (1 + (getJewelEnchant(j) * 0.10))), 0));
    let joiasPAtk = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'pAtk') * (1 + (getJewelEnchant(j) * 0.10))), 0));
    let joiasMAtk = Math.floor(joiasAtivas.reduce((soma, j) => soma + (getStat(j, 'mAtk') * (1 + (getJewelEnchant(j) * 0.10))), 0));

    let clanBonusPAtk = 1.0; let clanBonusPDef = 1.0; let clanBonusMAtk = 1.0; let clanBonusHp = 1.0;
    let castleBonusPAtk = 1.0; let castleBonusPDef = 1.0; let castleBonusMAtk = 1.0; let castleBonusMDef = 1.0;

    if (typeof clans !== 'undefined' && typeof playerClanId !== 'undefined' && playerClanId) {
        let meuClan = clans.find(c => c.id === playerClanId);
        if (meuClan && meuClan.level) {
            if (meuClan.level >= 2) clanBonusPAtk = 1.02;
            if (meuClan.level >= 3) clanBonusPDef = 1.02;
            if (meuClan.level >= 4) clanBonusHp = 1.03;
            if (meuClan.level >= 5) clanBonusMAtk = 1.03;
        }

        // Bônus de Castelo (Dominação)
        if (typeof CastleEngine !== 'undefined' && CastleEngine.getCastleBuffs) {
            const cBuffs = CastleEngine.getCastleBuffs();
            if (cBuffs) {
                castleBonusPAtk = cBuffs.pAtkMult;
                castleBonusPDef = cBuffs.pDefMult;
                castleBonusMAtk = cBuffs.mAtkMult;
                castleBonusMDef = cBuffs.mDefMult;
            }
        }
    }

    let baseHp = isMage ? base.hpMage : base.hpFighter;
    let baseMp = isMage ? base.mpMage : base.mpFighter;
    
    // Blindagem de Nível
    const safeNivel = (typeof window.nivel === 'number' && !isNaN(window.nivel)) ? window.nivel : 1;
    
    let hpBaseDaClasse = Math.floor((baseHp + ((safeNivel - 1) * 20) + bonusAugHp) * mod.hp);
    window.playerStats.maxHp = Math.floor((hpBaseDaClasse + armaduraBonusHp + armaBonusHp + joiasBonusHp) * clanBonusHp); 

    let multCP = isMage ? 0.4 : 0.6;
    if (race === "Orc") multCP += 0.1;
    if (race === "Dwarf") multCP += 0.05;
    window.playerStats.maxCp = Math.floor(window.playerStats.maxHp * multCP);

    let mpBaseDaClasse = Math.floor((baseMp + ((safeNivel - 1) * 5)) * mod.mp);
    window.playerStats.maxMp = mpBaseDaClasse + armaduraBonusMp + armaBonusMp + joiasBonusMp;

    let atkFisicoBase = isMage ? (base.danoFighter / 2) : base.danoFighter;
    let atkArma = getStat(arma, 'atk') || 5;
    let bonusEnchantWpnPAtk = Math.floor(atkArma * 0.10 * lvlWpn); 
    let atkTotal = atkFisicoBase + atkArma + bonusEnchantWpnPAtk + bonusAugPAtk + ((safeNivel - 1) * 3);
    window.playerStats.pAtk = Math.floor(atkTotal * mod.atk * window.buffsAtivos.pAtkMult * clanBonusPAtk * castleBonusPAtk) + atkArmadura + joiasPAtk;

    let atkMagicoBase = isMage ? base.danoMage : (base.danoMage / 2);
    let matkArma = getStat(arma, 'matk') || 5; 
    let bonusEnchantWpnMAtk = Math.floor(matkArma * 0.10 * lvlWpn); 
    let matkTotal = atkMagicoBase + matkArma + bonusEnchantWpnMAtk + bonusAugMAtk + ((safeNivel - 1) * 4);
    window.playerStats.mAtk = Math.floor(matkTotal * mod.atk * window.buffsAtivos.mAtkMult * clanBonusMAtk * castleBonusMAtk) + matkArmadura + joiasMAtk;

    let defTotal = 30 + defArmaduraTotal + ((safeNivel - 1) * 3.5) + 20 + bonusAugPDef;
    window.playerStats.pDef = Math.floor(defTotal * mod.def * window.buffsAtivos.pDefMult * clanBonusPDef * castleBonusPDef);

    let defMagicaBase = 20;
    let mdefTotal = defMagicaBase + joiasMDef + ((safeNivel - 1) * 3.0) + bonusAugMDef + armaduraBonusMDef;
    window.playerStats.mDef = Math.floor(mdefTotal * mod.def * window.buffsAtivos.mDefMult * castleBonusMDef);
    
    window.playerStats.critRate = Math.floor(base.critico + mod.crit + bonusAugCrit + armaduraBonusCrit + armaBonusCrit + joiasBonusCrit); 
    
    let spdBase = isMage ? base.atkSpeedMage : base.atkSpeedFighter;
    let spdTotal = (spdBase - ((safeNivel - 1) * 15)) * mod.spd;
    if (buffFighterLigado) spdTotal *= 0.7; 
    if (buffMageLigado) spdTotal *= 0.6; 
    spdTotal -= bonusAugSpd; spdTotal -= armaduraBonusSpd; spdTotal -= armaBonusSpd; spdTotal -= joiasBonusSpd;
    window.playerStats.atkSpeed = Math.floor(spdTotal * 1.0);
    if (window.playerStats.atkSpeed < 250) { window.playerStats.atkSpeed = 250; }

    if (window.playerHP > window.playerStats.maxHp) window.playerHP = window.playerStats.maxHp;
    if (window.playerMP > window.playerStats.maxMp) window.playerMP = window.playerStats.maxMp;
    if (window.playerCP > window.playerStats.maxCp) window.playerCP = window.playerStats.maxCp;
    
    const _tpPerf = document.getElementById('tela-perfil');
    const _tpVis = _tpPerf && (_tpPerf.style.display === 'contents' || _tpPerf.style.display === 'flex' || _tpPerf.style.display === 'block');
    if (_tpVis) {
        if(typeof atualizarVisualPaperdoll === 'function') atualizarVisualPaperdoll();
    }
};
