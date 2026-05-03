/* ========================================== */
/* COMBAT MATH ENGINE (DAMAGE CALCULATION)    */
/* ========================================== */

window.calcularDefesaDoPlayer = function(ataqueMagicoDoMonstro) {
    let defesaUsada = ataqueMagicoDoMonstro ? playerStats.mDef : playerStats.pDef;
    if (motorBuffsEspeciais.esquiva > 0 && (Math.random() * 100) < motorBuffsEspeciais.esquiva) {
        escreverLog(`<span style="color:#34d399; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.combatMath.dodgePerfect') : '💨 You dodged the attack perfectly!'}</span>`);
        return 999999;
    }
    return defesaUsada > 0 ? defesaUsada : 1;
};

function executarDanoDeUmMonstro(mob) {
    try {
        let isMagico = mob.tipo === 'magico';
        // Reduzimos a variabilidade do monstro para ser mais previsível
        let danoBaseMonstro = Math.floor(Math.random() * (mob.atk * 0.2)) + (mob.atk * 0.9);
        let defesaSegura = calcularDefesaDoPlayer(isMagico);
        
        if (defesaSegura !== 999999) {
            // Nova fórmula asintótica mais equilibrada para o jogador (Player recebendo)
            let danoRecebido = Math.floor((danoBaseMonstro * 700) / (400 + defesaSegura));
            
            // Garantia de dano mínimo (pelo menos 3% do atk do monstro)
            let danoMinimo = Math.floor(mob.atk * 0.03);
            if (danoRecebido < danoMinimo) danoRecebido = danoMinimo;

            if (isNaN(danoRecebido) || danoRecebido <= 0) danoRecebido = 1;
            
            let lvlMob = mob.lvl || mob.nivel || 1;
            if (nivel > lvlMob) {
                let red = Math.min(0.6, (nivel - lvlMob) * 0.03); // Redução por nível um pouco maior
                danoRecebido = Math.floor(danoRecebido * (1 - red));
            }
            
            playerHP -= danoRecebido;
            let hpBarFill = document.getElementById('player-hp-fill');
            if (hpBarFill) { hpBarFill.classList.remove('player-dano'); void hpBarFill.offsetWidth; hpBarFill.classList.add('player-dano'); }
        }
        if (playerHP <= 0) {
            playerHP = Math.max(1, Math.floor(playerStats.maxHp * 0.1));
            escreverLog(`<span style="color:red; font-weight:bold; font-size:1.1em;">${(typeof window.t === 'function') ? window.t('game.combatMath.playerDefeated') : '💀 YOU were defeated! Returning...'}</span>`);
            pararAtaqueMonstro(); window.autoAtaqueAtivo = false;
            if (loopAutoAtaque) clearTimeout(loopAutoAtaque);
            if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
            atualizar(); setTimeout(() => { prepararTelaCacada(); irPara('cidade'); }, 1500);
        } else { atualizar(); }
    } catch (error) { console.error(error); }
}

function aplicarDanoNoMonstro(index, dano) {
    let monstro = monstrosAtivos[index]; if(!monstro) return; 
    monstro.hp -= dano;
    if (monstro.hp <= 0) { processarMorteMonstro(index); } 
    else {
        let hpPorcento = (monstro.hp / monstro.maxHp) * 100;
        let fill = document.getElementById(`mob-hp-fill-${monstro.idUnico}`);
        let text = document.getElementById(`mob-hp-text-${monstro.idUnico}`);
        if(fill) fill.style.width = Math.max(0, hpPorcento) + "%";
        if(text) text.innerText = `${Math.max(0, Math.floor(monstro.hp))}`;
        let mobImg = document.getElementById(`monster-img-${monstro.idUnico}`);
        if (mobImg && !mobImg.src.includes('_atk')) { mobImg.classList.remove('tomando-dano'); void mobImg.offsetWidth; mobImg.classList.add('tomando-dano'); }
    }
}

window.autoAtaqueAtivo = false; let loopAutoAtaque = null;
window.isAutoAtaqueLigado = function() { return window.autoAtaqueAtivo; };

function atacar() {
    if (playerHP <= 0 || typeof monstrosAtivos === 'undefined' || monstrosAtivos.length === 0) return;
    window.autoAtaqueAtivo = !window.autoAtaqueAtivo; 
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    if (window.autoAtaqueAtivo) { escreverLog(`<span style="color:#10b981; font-weight:bold;">⚔️ Auto-Ataque: LIGADO</span>`); realizarGolpeAutoAtaque(); } 
    else { escreverLog(`<span style="color:#ef4444; font-weight:bold;">🛑 Auto-Ataque: DESLIGADO</span>`); if (loopAutoAtaque) clearTimeout(loopAutoAtaque); }
}

function realizarGolpeAutoAtaque() {
    if (playerHP <= 0 || !window.autoAtaqueAtivo || typeof monstrosAtivos === 'undefined' || monstrosAtivos.length === 0) { window.autoAtaqueAtivo = false; if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); return; }
    if (typeof globalCooldownAtivo !== 'undefined' && Date.now() < globalCooldownAtivo) { loopAutoAtaque = setTimeout(realizarGolpeAutoAtaque, 100); return; }
    if(typeof tocarSom === 'function') tocarSom('ataque');
    let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
    let monstro = monstrosAtivos[0];
    let defAlvo = isMage ? (monstro.mDef || (monstro.def * 0.8)) : (monstro.pDef || monstro.def);
    if (monstro.debuffs && monstro.debuffs.defMult) defAlvo = Math.floor(defAlvo * monstro.debuffs.defMult);
    
    // Melhoria na fórmula: Coeficiente aumentado de 880 para 1100 e base de defesa reduzida para 350
    // Isso torna o P.Atk do jogador muito mais relevante contra defesas altas.
    let atkAtual = isMage ? playerStats.mAtk : playerStats.pAtk;
    let danoBase = (atkAtual * 1100) / (350 + (defAlvo || 1));
    
    // Garantia de Dano Mínimo: O jogador NUNCA causará menos de 8% do seu Atk base como dano.
    // Isso resolve o problema de tirar "10 de dano" com itens bons.
    let danoMinimo = Math.floor(atkAtual * 0.08);
    if (danoBase < danoMinimo) danoBase = danoMinimo;

    let lvlMob = monstro.lvl || monstro.nivel || 1;
    if (nivel > lvlMob) { danoBase *= (1 + Math.min(1.0, (nivel - lvlMob) * 0.03)); }
    let danoFinal = danoBase * (0.9 + (Math.random() * 0.2));
    let foiCritico = false; if (!isMage && (Math.random() * 100) < playerStats.critRate) { danoFinal *= motorBuffsEspeciais.critMult; foiCritico = true; }
    danoFinal = Math.max(1, Math.floor(danoFinal));
    let shot = isMage ? 'B. Spiritshot (NG)' : 'Soulshot (NG)';
    if (typeof autoShotAtivo !== 'undefined' && autoShotAtivo) {
        if (inventario[shot] && inventario[shot] > 0) { inventario[shot]--; danoFinal = Math.floor(danoFinal * 1.2); if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); if (inventario[shot] <= 0) { autoShotAtivo = false; escreverLog(`<span style="color:#ef4444; font-weight:bold;">${shot} acabaram!</span>`); } } 
        else { autoShotAtivo = false; }
    }
    escreverLog(foiCritico ? `<span style="color:#ff3333; font-weight:bold;">CRITICAL HIT! ${danoFinal}</span>` : `You dealt <span style="color:white">${danoFinal}</span> damage!`);
    aplicarDanoNoMonstro(0, danoFinal); atualizar();
    if (typeof dispararAnimacaoGCD === 'function') { dispararAnimacaoGCD(playerStats.atkSpeed, 'Attack'); }
    loopAutoAtaque = setTimeout(realizarGolpeAutoAtaque, playerStats.atkSpeed);
}
