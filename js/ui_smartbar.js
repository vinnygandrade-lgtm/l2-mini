// ==========================================
// UI - SMART BAR (ATALHOS DINÂMICOS E SOULSHOTS)
// ==========================================

let modoAtalhoItem = null; 
let timerSegurarDedo;
let segurouDedo = false;
let autoShotAtivo = false; 

function abrirAcaoItemGeral(nome) {
    if (typeof window.abrirModal === 'function') window.abrirModal('janela-item-acao', 2100);
    else document.getElementById('janela-item-acao').style.display = 'flex';

    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.smartbar.itemOptions') : 'ITEM OPTIONS'; 
    
    var kAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    var kAc = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';
    let isCurrency = (nome === kAd || nome === kAc);

    var imgSlotEl = document.getElementById('acao-img-slot');
    if (imgSlotEl) {
        if (isCurrency) imgSlotEl.classList.add('l2-currency-modal-slot');
        else imgSlotEl.classList.remove('l2-currency-modal-slot');
    }

    let catalogos = [];
    if (typeof catalogoConsumiveis !== 'undefined') catalogos = catalogos.concat(catalogoConsumiveis);
    if (typeof catalogoScrolls !== 'undefined') catalogos = catalogos.concat(catalogoScrolls);
    if (typeof catalogoMateriais !== 'undefined') catalogos = catalogos.concat(catalogoMateriais);
    
    let itemData = catalogos.find(i => i.nome === nome || i.id === nome);
    
    let imgItem = 'assets/npcs/grocer.png';
    if (itemData && itemData.img) imgItem = itemData.img;
    else {
        if (nome.includes('Potion')) imgItem = 'assets/itens/pot_hp.png';
        else if (nome.includes('Recipe')) imgItem = 'assets/itens/recipe_s.png';
        else if (nome.includes('Ancient Coin')) imgItem = 'assets/itens/ancient_coin.png';
        else if (nome === 'Adena') imgItem = 'assets/itens/adena_coin.png';
        else if (nome.includes('Soulshot') || nome.includes('Spiritshot')) imgItem = 'assets/itens/shot_ng.png';
    }

    let textoDesc = itemData && itemData.desc ? itemData.desc : 'A utility item.';
    if (!itemData) {
        if (nome.includes('Potion')) textoDesc = 'Magic potion. Use to restore HP or MP in combat.';
        else if (nome.includes('Recipe')) textoDesc = 'Ancient instructions used to forge powerful gear.';
        else if (nome.includes('Ancient Coin')) textoDesc = 'Coin from a forgotten empire. Priceless.';
        else if (nome === 'Adena') textoDesc = 'Common coin of Aden. Used everywhere for trade.';
        else if (nome.includes('Soulshot')) textoDesc = 'Auto-use: greatly increases physical damage.';
        else if (nome.includes('Spiritshot')) textoDesc = 'Auto-use: greatly increases magic damage.';
    }

    let descricao = `<div style="color:#d4c4a8; font-size:0.85em; font-style:italic; margin-top:8px; border-top:1px dashed #444; padding-top:6px; text-align:center;">"${textoDesc}"</div>`;
    
    document.getElementById('acao-img').src = imgItem; 
    const acImg = document.getElementById('acao-img');
    if (acImg) {
        if (isCurrency) acImg.classList.add('l2-coin-modal'); else acImg.classList.remove('l2-coin-modal');
    }
    const qtyLabel = (typeof window.t === 'function') ? window.t('game.smartbar.quantity') : 'Quantity:';
    let extraBag = '';
    if (isCurrency) {
        var noPin = (typeof window.t === 'function')
            ? window.t('game.smartbar.currencyNoShortcut')
            : 'Currency cannot be assigned to shortcuts.';
        extraBag = `<div style="color:#94a3b8;font-size:0.78em;margin-top:8px;text-align:center;">${noPin}</div>`;
    }
    document.getElementById('acao-desc').innerHTML = `<b style="color:#fff">${nome}</b><br><span style="color:#aaa; font-size:0.9em;">${qtyLabel} ${inventario[nome]}</span>${descricao}${extraBag}`;
    
    let btnAcao = document.getElementById('btn-acao-item');
    btnAcao.style.display = 'block';
    if (isCurrency) {
        btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.closeDetails') : 'CLOSE';
        btnAcao.style.background = 'linear-gradient(180deg, #404040 0%, #262626 100%)';
        btnAcao.style.borderColor = '#737373';
        btnAcao.onclick = function () { if (typeof fecharJanelaAcao === 'function') fecharJanelaAcao(); };
    } else {
        btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.pinToShortcut') : 'ASSIGN TO SHORTCUT';
        btnAcao.style.background = 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)';
        btnAcao.style.borderColor = '#eab308';
        btnAcao.onclick = function() { 
            fecharJanelaAcao();
            abrirSeletorAtalhoGlobal(nome, (index) => {
                barraAtalhos[index] = nome;
                escreverLog(`<span style="color:#10b981;">${(typeof window.t === 'function') ? window.t('game.smartbar.itemPinnedToSlot', { item: nome, slot: String(index + 1) }) : (nome + ' pinned to slot ' + (index + 1) + '!')}</span>`);
                renderizarBarraAtalhos(); if(typeof salvarJogo === 'function') salvarJogo();
            });
        };
    }
}

window.abrirSeletorAtalhoGlobal = function(nomeItem, callback) {
    const modal = document.getElementById('janela-seletor-atalho-global');
    const grid = document.getElementById('grid-seletor-global');
    const imgPreview = document.getElementById('seletor-global-img');
    const nomePreview = document.getElementById('seletor-global-nome');
    
    if (!modal || !grid) return;

    // Configura o preview
    imgPreview.src = obterImgItemDinamico(nomeItem);
    nomePreview.innerText = nomeItem;
    
    // Limpa e preenche o grid
    grid.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        let nomeSlot = barraAtalhos[i];
        let visualSlot = '';
        
        if (nomeSlot) {
            if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills[nomeSlot]) {
                visualSlot = `<div style="font-size: 1.2em; filter: drop-shadow(0 0 2px #000);">${bancoDeSkills[nomeSlot].icone}</div>`;
            } else {
                visualSlot = `<img src="${obterImgItemDinamico(nomeSlot)}" style="width: 26px; height: 26px; object-fit: contain; filter: drop-shadow(0 0 2px #000);">`;
            }
        }

        const slot = document.createElement('div');
        slot.className = 'shortcut-slot';
        slot.style.width = '100%';
        slot.style.aspectRatio = '1/1';
        slot.style.border = '1px solid #4a3623';
        slot.style.background = 'linear-gradient(135deg, #1a1410 0%, #0a0806 100%)';
        slot.style.position = 'relative';
        slot.style.borderRadius = '3px';
        slot.style.cursor = 'pointer';
        slot.style.minWidth = '32px';
        
        slot.innerHTML = `
            <span style="position: absolute; top: 1px; left: 2px; font-size: 7px; color: ${i >= 10 ? '#facc15' : '#88745c'}; font-weight: bold;">${i+1}</span>
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                ${visualSlot}
            </div>
        `;
        
        slot.onclick = () => {
            callback(i);
            fecharSeletorGlobal();
            if (typeof tocarSom === 'function') tocarSom('enchant');
        };
        
        grid.appendChild(slot);
    }

    if (typeof abrirModal === 'function') abrirModal('janela-seletor-atalho-global', 3000);
    else modal.style.display = 'flex';
};

window.fecharSeletorGlobal = function() {
    if (typeof fecharModal === 'function') fecharModal('janela-seletor-atalho-global');
    else document.getElementById('janela-seletor-atalho-global').style.display = 'none';
};

function obterImgItemDinamico(nome) {
    if (!nome) return 'assets/itens/item_generic.png';

    let catalogos = [];
    if (typeof catalogoConsumiveis !== 'undefined') catalogos = catalogos.concat(catalogoConsumiveis);
    if (typeof catalogoScrolls !== 'undefined') catalogos = catalogos.concat(catalogoScrolls);
    if (typeof catalogoArmaduras !== 'undefined') catalogos = catalogos.concat(catalogoArmaduras);
    if (typeof catalogoArmas !== 'undefined') catalogos = catalogos.concat(catalogoArmas);
    if (typeof catalogoJoias !== 'undefined') catalogos = catalogos.concat(catalogoJoias);
    if (typeof catalogoMateriais !== 'undefined') catalogos = catalogos.concat(catalogoMateriais);

    let itemEncontrado = catalogos.find(i => i.nome === nome || i.id === nome);
    if (itemEncontrado && itemEncontrado.img) return itemEncontrado.img;
    
    // Fallbacks inteligentes
    if (nome.includes('Potion')) return 'assets/itens/pot_hp.png';
    if (nome.includes('Recipe')) return 'assets/itens/recipe_s.png';
    if (nome.includes('Soulshot')) return 'assets/itens/shot_ng.png';
    if (nome.includes('Spiritshot')) return 'assets/itens/shot_ng.png';
    if (nome.includes('Ancient Coin')) return 'assets/itens/ancient_coin.png';
    if (nome === 'Adena') return 'assets/itens/adena_coin.png';

    return 'assets/itens/item_generic.png'; 
}

function renderizarBarraAtalhos() {
    try {
        let container = document.getElementById('barra-de-atalhos-dinamica');
        const olyHook = document.getElementById('olympiad-atalhos-hook');
        
        // Se estiver na Olympiad, o container principal deve ser movido para o hook da arena
        const estaNaOlympiad = document.getElementById('tela-olympiad-arena')?.style.display === 'flex';
        
        if (estaNaOlympiad && olyHook && container) {
            if (container.parentElement !== olyHook) {
                olyHook.appendChild(container);
                container.style.display = 'grid';
                container.style.position = 'relative';
                container.style.bottom = 'auto';
                container.style.left = 'auto';
                container.style.transform = 'none';
                container.style.width = '100%';
                container.style.zIndex = '1000';
            }
        } else if (!estaNaOlympiad && container) {
            // Se não estiver na Olympiad, garante que a barra esteja no body (seu lugar original)
            if (container.parentElement !== document.body) {
                document.body.appendChild(container);
                container.style.display = 'grid';
                // Restaura estilos originais (ajuste conforme seu CSS base)
                container.style.position = 'fixed';
                container.style.bottom = '65px';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                container.style.width = 'auto';
            }
        }

        if(!container) return;
        
        let novoHtml = '';
        let agora = Date.now();
        
        for(let i = 0; i < 20; i++) {
            let nomeSlot = barraAtalhos[i];
            let numDisplay = i + 1; 
            let conteudo = '';
            let classExtra = ''; 
            let styleExtra = '';

            if (nomeSlot) {
                let pct = 0;
                let cdTotal = 1000;
                if (typeof cooldownsAtivos !== 'undefined' && cooldownsAtivos[nomeSlot] && cooldownsAtivos[nomeSlot] > agora) {
                    if (nomeSlot === 'Attack' && typeof playerStats !== 'undefined') cdTotal = playerStats.atkSpeed;
                    else if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills[nomeSlot]) cdTotal = bancoDeSkills[nomeSlot].cd;
                    else if (nomeSlot.includes('Potion')) cdTotal = 15000; 
                    
                    pct = ((cooldownsAtivos[nomeSlot] - agora) / cdTotal) * 100;
                    if(pct < 0) pct = 0; if(pct > 100) pct = 100;
                }

                let htmlTimer = `<div class="cd-timer-text" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#ffcc00; font-weight:900; font-size:14px; font-family:monospace; text-shadow:1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0px 0px 5px #000; z-index:10; pointer-events:none; display:none;"></div>`;

                if (nomeSlot === 'Attack') {
                    let auraAtiva = window.autoAtaqueAtivo === true;
                    // Na guerra, usa o estado do motor de guerra
                    if (typeof ClanWarEngine !== 'undefined' && ClanWarEngine.ativo) {
                        auraAtiva = ClanWarEngine.autoAtaqueAtivo;
                    }
                    
                    let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
                    let imgAtaque = isMage ? "assets/skills/ataque_mago.png" : "assets/skills/ataque_guerreiro.png";
                    
                    conteudo = `
                        ${auraAtiva ? `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; box-shadow: inset 0 0 10px rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.8); border-radius: 2px; z-index: 4; pointer-events: none; animation: pulsateAura 1.5s infinite ease-in-out;"></div>` : ''}
                        <div class="cd-overlay" data-cd="Attack" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <img src="${imgAtaque}" style="width:80%; height:80%; object-fit:contain; filter: drop-shadow(0 0 2px #000); z-index: 1;">
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
                    
                    styleExtra = auraAtiva ? `border-color: #fff; background: #333;` : ``;
                }
                else if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills[nomeSlot]) {
                    let skill = bancoDeSkills[nomeSlot];
                    conteudo = `
                        <div class="cd-overlay" data-cd="${nomeSlot}" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <span style="font-size:1.4em; filter: drop-shadow(0 0 3px #000); z-index: 1;">${skill.icone}</span>
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
                    styleExtra = `border-color: ${skill.cor}88; box-shadow: inset 0 0 8px ${skill.cor}20;`;
                } 
                else {
                    let qtd = 0;
                    if (typeof inventario !== 'undefined') {
                        if (nomeSlot === 'MP Potion' && inventario['Mana Potion']) qtd = inventario['Mana Potion'];
                        else if (nomeSlot === 'Mana Potion' && inventario['MP Potion']) qtd = inventario['MP Potion'];
                        else qtd = inventario[nomeSlot] || 0;
                    }
                    
                    let imgItem = obterImgItemDinamico(nomeSlot);
                    if (autoShotAtivo && (nomeSlot.includes('Soulshot') || nomeSlot.includes('Spiritshot'))) classExtra = 'auto-shot-active';

                    conteudo = `
                        <div class="cd-overlay" data-cd="${nomeSlot}" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <img src="${imgItem}" style="width:70%; height:70%; object-fit:contain; filter: drop-shadow(0 0 2px #000); z-index: 1;">
                        <span class="shortcut-count">${qtd}</span>
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
                }
            } else {
                conteudo = `<span class="shortcut-key" style="color:#333; ${i >= 10 ? 'font-size: 6px;' : ''}">${numDisplay}</span>`;
            }
            
            novoHtml += `
                <div class="shortcut-slot ${classExtra}" style="${styleExtra}"
                     onmousedown="iniciarToqueAtalho(${i})"
                     onmouseup="soltarToqueAtalho(${i})"
                     onmouseleave="cancelarToqueAtalho()"
                     ontouchstart="iniciarToqueAtalho(${i})"
                     ontouchend="event.preventDefault(); soltarToqueAtalho(${i})">
                    ${conteudo}
                </div>
            `;
        }
        container.innerHTML = novoHtml;
    } catch (erro) { console.error("Error drawing shortcuts:", erro); }
}

// === CONTROLES DE TOQUE (COM DETEÇÃO DA ARENA BOSS) ===
function iniciarToqueAtalho(index) {
    if (timerSegurarDedo) clearTimeout(timerSegurarDedo);
    segurouDedo = false;
    
    timerSegurarDedo = setTimeout(() => {
        let telaFloresta = document.getElementById('tela-floresta');
        let telaRaid = document.getElementById('tela-raid-arena'); // A nova aba do Boss!
        let telaOlympiad = document.getElementById('tela-olympiad-arena');
        
        let estaNaFloresta = telaFloresta && telaFloresta.style.display === 'flex';
        let estaNaRaid = telaRaid && telaRaid.style.display === 'flex'; // O jogo agora reconhece a Raid
        let estaNaOlympiad = telaOlympiad && telaOlympiad.style.display === 'flex';
        let estaNaGuerra = typeof ClanWarEngine !== 'undefined' && ClanWarEngine.ativo;
        
        // Se estiver caçando OU batendo no Boss, tranca os ícones!
        if (estaNaFloresta || estaNaRaid || estaNaOlympiad || estaNaGuerra || (typeof monstrosAtivos !== 'undefined' && monstrosAtivos.length > 0)) {
            escreverLog(`<span style="color:#fcd34d; font-size:0.9em;">${(typeof window.t === 'function') ? window.t('game.smartbar.shortcutsLocked') : '🔒 Shortcuts are locked in combat zones!'}</span>`);
            segurouDedo = true; 
            return; 
        }

        segurouDedo = true;
        if (barraAtalhos[index] && !modoAtalhoItem) {
            if (barraAtalhos[index].includes('shot')) autoShotAtivo = false;
            escreverLog(`<span style="color:#ef4444;">${(typeof window.t === 'function') ? window.t('game.smartbar.removedFromSlot', { item: barraAtalhos[index], slot: String(index + 1) }) : (barraAtalhos[index] + ' removed from slot ' + (index + 1) + '.')}</span>`);
            barraAtalhos[index] = null; 
            renderizarBarraAtalhos(); 
            if(typeof salvarJogo === 'function') salvarJogo(); 
            if(typeof tocarSom === 'function') tocarSom('ataque');
        }
    }, 600); 
}

// === EXECUÇÃO DE HABILIDADES (A MÁGICA DA RAID) ===
function soltarToqueAtalho(index) {
    if (timerSegurarDedo) clearTimeout(timerSegurarDedo);
    if (!segurouDedo) {
        if (modoAtalhoItem) {
            barraAtalhos[index] = modoAtalhoItem; modoAtalhoItem = null;
            let barra = document.getElementById('barra-de-atalhos-dinamica'); if(barra) barra.classList.remove('glow-yellow');
            escreverLog(`<span style="color:#10b981;">${(typeof window.t === 'function') ? window.t('game.smartbar.pinnedToSlot', { slot: String(index + 1) }) : ('Pinned to slot ' + (index + 1) + '!')}</span>`);
            renderizarBarraAtalhos(); if(typeof salvarJogo === 'function') salvarJogo();
        } 
        else {
            let nomeSlot = barraAtalhos[index];
            if (!nomeSlot) return;

            let naRaid = typeof RaidEngine !== 'undefined' && RaidEngine.ativo;
            let naOlympiad = typeof OlympiadEngine !== 'undefined' && OlympiadEngine.ativo;
            let naGuerra = typeof ClanWarEngine !== 'undefined' && ClanWarEngine.ativo;

            // 1. AÇÃO: ATAQUE BÁSICO
            if (nomeSlot === 'Attack') { 
                if (naOlympiad) {
                    OlympiadEngine.playerAtaca();
                } else if (naRaid) {
                    RaidEngine.playerAtaca(); // Bate direto no Dragão!
                } else if (naGuerra) {
                    ClanWarEngine.usarSkillPlayer('Attack');
                } else {
                    if (typeof atacar === 'function') atacar(); 
                    renderizarBarraAtalhos(); 
                }
            }
            // 2. AÇÃO: SKILLS E MAGIAS
            else if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills[nomeSlot]) { 
                if (naOlympiad) {
                    OlympiadEngine.playerUsaSkill(nomeSlot);
                } else if (naGuerra) {
                    ClanWarEngine.usarSkillPlayer(nomeSlot);
                } else if (naRaid) {
                    // --- O SISTEMA ROTEIA A SKILL PARA BATER NO BOSS ---
                    let skill = bancoDeSkills[nomeSlot];
                    let agora = Date.now();

                    // Verifica Mana e Cooldown
                    if (cooldownsAtivos[nomeSlot] && cooldownsAtivos[nomeSlot] > agora) return; // Em recarga
                    if (playerMP < skill.mp) {
                        escreverLog(`<span style="color:#3b82f6; font-size:10px;">${(typeof window.t === 'function') ? window.t('game.smartbar.insufficientMp', { skill: nomeSlot }) : ('Not enough MP for ' + nomeSlot + '!')}</span>`); return;
                    }

                    // Paga o custo
                    playerMP -= skill.mp;
                    if (typeof atualizar === 'function') atualizar();
                    dispararAnimacaoCooldown(nomeSlot, skill.cd);
                    escreverLog(`<span style="color:${skill.cor}; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.smartbar.youCast', { skill: nomeSlot }) : ('You cast ' + nomeSlot + '!')}</span>`);

                    // Se for magia de ataque, joga o dano direto no Antharas
                    if (skill.tipo !== 'cura' && skill.tipo !== 'buff') {
                        let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
                        let danoBruto = isMage ? playerStats.mAtk : playerStats.pAtk;
                        let multSkill = skill.danoMult || 1.5; // Multiplicador de poder da skill
                        let defDoBoss = isMage ? RaidEngine.bossData.mDef : RaidEngine.bossData.pDef;

                        let multiplicadorDefesa = 1000 / (1000 + defDoBoss);
                        let danoFinal = Math.floor(danoBruto * multSkill * multiplicadorDefesa);

                        if (Math.random() * 100 <= playerStats.critRate) {
                            danoFinal *= isMage ? 1.5 : 2;
                            RaidEngine.escreverLogRaid(`<span style="color:${skill.cor}; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.raid.criticalSkillDamage', { damage: danoFinal }) : ('CRITICAL SKILL! You dealt ' + danoFinal + ' damage!')}</span>`);
                        } else {
                            RaidEngine.escreverLogRaid((typeof window.t === 'function') ? window.t('game.raid.magicDamageBoss', { damage: danoFinal }) : ('Your magic dealt ' + danoFinal + ' damage to the boss.'));
                        }
                        RaidEngine.receberDanoBoss(danoFinal, true);
                    } else if (skill.tipo === 'cura') {
                        let cura = skill.curaFixa || Math.floor(playerStats.mAtk * skill.curaMult);
                        playerHP += cura; if(playerHP > playerStats.maxHp) playerHP = playerStats.maxHp;
                        RaidEngine.escreverLogRaid(`<span style="color:#10b981; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.raid.healFor', { amount: cura }) : ('You healed for ' + cura + ' HP!')}</span>`);
                        if (typeof atualizar === 'function') atualizar();
                    }
                } else {
                    if(typeof usarSkill === 'function') usarSkill(nomeSlot); // Usa na floresta
                }
            }
            // 3. AÇÃO: POÇÕES E SHOTS
            else {
                let nomeReal = nomeSlot;
                if (nomeSlot === 'MP Potion' && inventario['Mana Potion']) nomeReal = 'Mana Potion';
                if (nomeSlot === 'Mana Potion' && inventario['MP Potion']) nomeReal = 'MP Potion';
                
                let qtdAtual = typeof inventario !== 'undefined' ? (inventario[nomeReal] || 0) : 0;

                if (qtdAtual <= 0 && !nomeSlot.includes('shot')) {
                    escreverLog(`<span style="color:#ef4444; font-weight:bold; font-size:0.9em;">${(typeof window.t === 'function') ? window.t('game.smartbar.emptyStock', { item: nomeSlot }) : ('Out of stock: ' + nomeSlot + '!')}</span>`);
                    return; 
                }

                if (nomeSlot === 'HP Potion') { if(typeof usarPocao === 'function') usarPocao(); }
                else if (nomeSlot === 'Mana Potion' || nomeSlot === 'MP Potion') { if(typeof usarPocaoMP === 'function') usarPocaoMP(nomeSlot); }
                else if (nomeSlot.includes('Soulshot') || nomeSlot.includes('Spiritshot')) {
                    autoShotAtivo = !autoShotAtivo;
                    if (autoShotAtivo) escreverLog(`<span style="color:#60a5fa; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.smartbar.autoShotOn') : '✨ Auto-Shot: ON'}</span>`);
                    else escreverLog(`<span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.smartbar.autoShotOff') : 'Auto-Shot: OFF.'}</span>`);
                    renderizarBarraAtalhos();
                }
            }
        }
    }
}

function cancelarToqueAtalho() { if (timerSegurarDedo) clearTimeout(timerSegurarDedo); }

window.dispararAnimacaoCooldown = function(nome, tempoMs) {
    if (typeof cooldownsAtivos !== 'undefined') cooldownsAtivos[nome] = Date.now() + tempoMs;
};

window.dispararAnimacaoGCD = function(tempoMs, nome) {
    window.dispararAnimacaoCooldown(nome, tempoMs);
};

setInterval(() => {
    let overlays = document.querySelectorAll('.cd-overlay');
    let agora = Date.now();

    overlays.forEach(overlay => {
        let nome = overlay.getAttribute('data-cd');
        let tempoFim = (typeof cooldownsAtivos !== 'undefined') ? cooldownsAtivos[nome] : 0;
        let timerText = overlay.nextElementSibling;

        if (tempoFim && tempoFim > agora) {
            let restamMs = tempoFim - agora;
            let cdTotal = 1000;
            if (nome === 'Attack' && typeof playerStats !== 'undefined') cdTotal = playerStats.atkSpeed;
            else if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills[nome]) cdTotal = bancoDeSkills[nome].cd;
            else if (nome && nome.includes('Potion')) cdTotal = 15000; 

            let porcentagem = (restamMs / cdTotal) * 100;
            if (porcentagem < 0) porcentagem = 0; if (porcentagem > 100) porcentagem = 100;
            
            overlay.style.height = porcentagem + '%';
            overlay.style.width = '100%';
            
            if (timerText && timerText.classList.contains('cd-timer-text')) {
                if (nome !== 'Attack') {
                    timerText.innerText = (restamMs / 1000).toFixed(1);
                    timerText.style.display = 'block';
                } else { timerText.style.display = 'none'; }
            }
        } else {
            overlay.style.height = '0%';
            if (timerText && timerText.classList.contains('cd-timer-text')) { timerText.style.display = 'none'; }
        }
    });
}, 50);