// ==========================================
// UI - ENCHANT (ENCANTAMENTO DE ITENS)
// ==========================================

let targetEquipObj = null; // Agora guarda o objeto complexo (seja da bolsa ou equipado)
let targetScroll = null; 
let listaItensEnchant = []; // Catálogo dinâmico de todos os itens encantáveis

function extrairMetaScroll(scroll) {
    if (!scroll) return { tipo: null, grade: null, abencoado: false };
    const nome = (scroll.nome || '').toUpperCase();
    const id = (scroll.id || '').toLowerCase();
    const tipo = scroll.tipo || (nome.includes('WEAPON') ? 'weapon' : (nome.includes('ARMOR') ? 'armor' : null));
    const grade = scroll.grade
        || (nome.includes('(NG)') ? 'No-Grade'
            : nome.includes('(D)') ? 'D'
            : nome.includes('(C)') ? 'C'
            : nome.includes('(B)') ? 'B'
            : nome.includes('(A)') ? 'A'
            : nome.includes('(S)') ? 'S'
            : null);
    const abencoado = (typeof scroll.abencoado === 'boolean') ? scroll.abencoado : (nome.includes('BLESSED') || id.includes('sc_b'));
    return { tipo, grade, abencoado };
}

function scrollCompativelComTipo(scrollTipo, tipoEquip) {
    if (!scrollTipo || !tipoEquip) return false;
    if (scrollTipo === tipoEquip) return true;
    // Regra L2 do projeto: joias usam scroll de armadura
    if (scrollTipo === 'armor' && tipoEquip === 'jewel') return true;
    return false;
}

function abrirJanelaEnchant() { 
    targetEquipObj = null; 
    targetScroll = null; 
    atualizarInterfaceEnchant(); 
    abrirModal('janela-enchant', 1500); 
}

function fecharEnchant() { 
    fecharModal('janela-enchant'); 
}

function selecionarScrollEnchant(tipo) { 
    targetScroll = tipo; 
    atualizarInterfaceEnchant(); 
}

// Abre a janela de confirmação do item antes de jogar no slot
function abrirInfoEquipEnchant(idUnico) {
    let item = listaItensEnchant.find(i => i.idUnico === idUnico);
    if(!item) return;

    abrirModal('janela-item-acao', 2100);
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectGear') : 'SELECT GEAR';
    document.getElementById('acao-img').src = item.base.img;
    
    // Pega a função de formatar texto lá do ui_inventory.js
    let info = formatarTooltipEquipamento(item.base, item.lvl, item.isAugment, item.tipo, item.refOriginal);
    let locText = item.local === 'equipado' ? '<br><b style="color:#10b981;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.equippedNow') : '[EQUIPPED]') + '</b>' : '<br><b style="color:#aaa;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.inBag') : '[IN BAG]') + '</b>';
    
    document.getElementById('acao-desc').innerHTML = info + locText;
    
    let btnAcao = document.getElementById('btn-acao-item');
    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectForEnchant') : 'SELECT FOR ENCHANT';
    btnAcao.style.background = "#ca8a04";
    btnAcao.onclick = function() {
        targetEquipObj = item;
        atualizarInterfaceEnchant();
        fecharJanelaAcao(); 
    };
}

function abrirInfoScrollEnchant(nomeItem) {
    let infoScroll = catalogoScrolls.find(s => s.nome === nomeItem);
    if(!infoScroll) return;
    let meta = extrairMetaScroll(infoScroll);
    abrirModal('janela-item-acao', 2100);
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectScroll') : 'SELECT SCROLL';
    document.getElementById('acao-img').src = 'assets/npcs/grocer.png'; 
    
    const ownLbl = (typeof window.t === 'function') ? window.t('game.shop.ownedLabel') : 'Owned:';
    let desc = `<b style="color:${meta.abencoado ? '#fde047' : '#8b5cf6'}">${nomeItem}</b><br><br>${infoScroll.desc}<br><br><span style="color:#aaa;">${ownLbl} ${inventario[nomeItem]}</span>`;
    document.getElementById('acao-desc').innerHTML = desc;
    
    let btnAcao = document.getElementById('btn-acao-item');
    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectScroll') : 'SELECT SCROLL';
    btnAcao.style.background = meta.abencoado ? "#ca8a04" : "#8b5cf6";
    btnAcao.onclick = function() {
        selecionarScrollEnchant(nomeItem);
        fecharJanelaAcao();
    };
}

function atualizarInterfaceEnchant() {
    // 1. FAZ A VARREDURA E CRIA A LISTA DE ITENS ENCANTÁVEIS
    listaItensEnchant = [];
    
    // Itens Equipados
    if (armaEquipadaBase && armaEquipadaBase.nome !== 'Treining Sword' && armaEquipadaBase.base) {
        listaItensEnchant.push({ 
            idUnico: 'eq_wpn', 
            local: 'equipado', 
            tipo: 'weapon', 
            base: armaEquipadaBase.base, 
            lvl: armaEquipadaBase.enchant || 0, 
            isAugment: armaEquipadaBase.augmented || false,
            uid: armaEquipadaBase.uid,
            refOriginal: armaEquipadaBase // Referência direta para alteração!
        });
    }
    if (armaduraEquipada && armaduraEquipada.base) {
        listaItensEnchant.push({ 
            idUnico: 'eq_arm', 
            local: 'equipado', 
            tipo: 'armor', 
            base: armaduraEquipada.base, 
            lvl: armaduraEquipada.enchant || 0, 
            isAugment: false,
            uid: armaduraEquipada.uid,
            refOriginal: armaduraEquipada
        });
    }

    const slotsJoias = [
        { id: 'eq_neck', item: colarEquipado, tipo: 'jewel' },
        { id: 'eq_ear1', item: brincoEquipado1, tipo: 'jewel' },
        { id: 'eq_ear2', item: brincoEquipado2, tipo: 'jewel' },
        { id: 'eq_ring1', item: anelEquipado1, tipo: 'jewel' },
        { id: 'eq_ring2', item: anelEquipado2, tipo: 'jewel' }
    ];

    slotsJoias.forEach(slot => {
        if (slot.item && slot.item.base) {
            listaItensEnchant.push({
                idUnico: slot.id,
                local: 'equipado',
                tipo: slot.tipo,
                base: slot.item.base,
                lvl: slot.item.enchant || 0,
                isAugment: false,
                uid: slot.item.uid,
                refOriginal: slot.item
            });
        }
    });

    // Itens na Bolsa (inventarioEquips)
    inventarioEquips.forEach((equip, idx) => {
        if (!equip || !equip.base) return;
        listaItensEnchant.push({ 
            idUnico: 'bolsa_' + (equip.uid || idx), 
            local: 'bolsa', 
            index: idx, 
            tipo: equip.tipo || equip.base.tipoItem || equip.base.tipo, 
            base: equip.base, 
            lvl: equip.enchant || 0, 
            isAugment: equip.augmented || false,
            uid: equip.uid,
            refOriginal: equip
        });
    });

    // 2. DESENHA A GRID DE EQUIPAMENTOS
    let htmlEquip = ''; 
    listaItensEnchant.forEach(item => {
        let bordaAtiva = (targetEquipObj && targetEquipObj.idUnico === item.idUnico) ? 'glow-yellow' : '';
        let marcaEquipado = item.local === 'equipado' ? `<div style="position:absolute; top:2px; left:2px; font-size:9px; color:#10b981; font-weight:bold; text-shadow: 1px 1px 0 #000; z-index:10;">${(typeof window.t === 'function') ? window.t('game.enchantUi.markEquipped') : '[E]'}</div>` : '';
        
        htmlEquip += `<div class="store-item-slot ${bordaAtiva}" onclick="abrirInfoEquipEnchant('${item.idUnico}')">
            ${marcaEquipado}
            <img src="${item.base.img}" class="inv-img">
            ${item.lvl > 0 ? `<div class="inv-qtd">+${item.lvl}</div>` : ''}
        </div>`;
    });
    document.getElementById('enchant-equip-grid').innerHTML = htmlEquip.length > 0 ? htmlEquip : `<span style="font-size:8px; color:#aaa; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noEquipment') : 'No equipment.'}</span>`;
    
    // 3. DESENHA A GRID DE SCROLLS
    let htmlScroll = ''; 
    let temScroll = false;
    Object.keys(inventario).forEach(nomeItem => {
        let infoScroll = catalogoScrolls.find(s => s.nome === nomeItem);
        if (infoScroll) {
            temScroll = true;
            let meta = extrairMetaScroll(infoScroll);
            let corTexto = meta.abencoado ? '#fde047' : '#8b5cf6';
            let bordaAtiva = targetScroll === nomeItem ? 'glow-yellow' : '';
            
            htmlScroll += `
                <div class="store-item-slot ${bordaAtiva}" onclick="abrirInfoScrollEnchant('${nomeItem}')" style="flex-direction:column;">
                    <span style="font-size:7px; color:${corTexto}; text-shadow:1px 1px 0 #000; text-align:center; padding: 2px; line-height:1;">${nomeItem}</span>
                    <div class="inv-qtd">${inventario[nomeItem]}</div>
                </div>`;
        }
    });
    document.getElementById('enchant-scroll-grid').innerHTML = temScroll ? htmlScroll : `<span style="font-size:8px; color:#aaa; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noScrolls') : 'No scrolls.'}</span>`;
    
    // 4. DESENHA O PREVIEW DO MEIO
    let previewEquip = targetEquipObj ? `<img src="${targetEquipObj.base.img}" style="width:35px">` : '?'; 
    let infoScrollAlvo = catalogoScrolls.find(s => s.nome === targetScroll);
    let metaPreview = extrairMetaScroll(infoScrollAlvo);
    let previewScroll = infoScrollAlvo ? `<span style="font-size:8px; color:${metaPreview.abencoado ? '#fde047' : '#8b5cf6'};">${targetScroll}</span>` : '?'; 
    
    document.getElementById('slot-target-equip').innerHTML = previewEquip; 
    document.getElementById('slot-target-scroll').innerHTML = previewScroll;
    
    // 5. VALIDAÇÕES FINAIS (Travar botão se errado)
    let btn = document.getElementById('btn-executar-enchant'); 
    let aviso = document.getElementById('enchant-warning'); 
    aviso.style.display = 'none'; 
    btn.disabled = true; 
    
    if (targetEquipObj && targetScroll && infoScrollAlvo) { 
        let gradeEquip = targetEquipObj.base.grade || 'No-Grade';
        let lvlAtual = targetEquipObj.lvl;
        
        let metaScroll = extrairMetaScroll(infoScrollAlvo);
        if (gradeEquip === 'No-Grade') { aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.noGradeCannotEnchant') : 'No-Grade equipment cannot be enchanted.'; aviso.style.color = "#aaa"; aviso.style.display = 'block'; return; }
        if (metaScroll.grade !== gradeEquip || !scrollCompativelComTipo(metaScroll.tipo, targetEquipObj.tipo)) {
            aviso.innerText = (typeof window.t === 'function')
                ? window.t('game.enchantUi.scrollIncompatible', { grade: gradeEquip, type: targetEquipObj.tipo.toUpperCase() })
                : (`INCOMPATIBLE SCROLL! Requires [${gradeEquip}] for ${targetEquipObj.tipo.toUpperCase()} (jewels use armor scroll).`);
            aviso.style.color = "#ef4444"; aviso.style.display = 'block'; return;
        }
        if (lvlAtual >= 25) { aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.maxPlus25') : 'Maximum reached (+25).'; aviso.style.color = "#3b82f6"; aviso.style.display = 'block'; return; }
        
        btn.disabled = false; 
        if (lvlAtual >= 3 && !metaScroll.abencoado) { aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.breakRisk') : '⚠️ BREAK RISK ⚠️'; aviso.style.color = "#ef4444"; aviso.style.display = 'block'; } 
        else if (lvlAtual >= 3 && metaScroll.abencoado) { aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.safeBlessed') : '✨ SAFE ENCHANT (BLESSED) ✨'; aviso.style.color = "#fde047"; aviso.style.display = 'block'; }
    } 
}

async function executarEnchant() {
    if (!targetEquipObj || !targetScroll) return; 
    if (!inventario[targetScroll] || inventario[targetScroll] <= 0) return; 
    
    let infoScrollAlvo = catalogoScrolls.find(s => s.nome === targetScroll);
    let lvlAtual = targetEquipObj.lvl; 
    let nomeEquip = targetEquipObj.base.nome;
    let gradeEquip = targetEquipObj.base.grade || 'No-Grade';
    let tipoItem = targetEquipObj.tipo;
    
    let metaScroll = extrairMetaScroll(infoScrollAlvo);
    if (gradeEquip === 'No-Grade' || metaScroll.grade !== gradeEquip || !scrollCompativelComTipo(metaScroll.tipo, tipoItem) || lvlAtual >= 25) { return; }

    let btnAcaoEnchant = document.getElementById('btn-executar-enchant');
    btnAcaoEnchant.disabled = true;
    btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchanting') : 'ENCHANTING...';
    btnAcaoEnchant.style.background = "#ca8a04";

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName && targetEquipObj.uid) {
        try {
            const { data, error } = await window.SupabaseAPI.enchantItem(window.charName, targetEquipObj.uid, targetScroll);
            
            if (error) {
                console.error('[Enchant RPC Error]', error);
                if (typeof window.l2Alert === 'function') window.l2Alert(typeof window.t === 'function' ? window.t('game.cloud.error') + ': ' + (error.message || error) : 'Cloud Error: ' + (error.message || error));
                btnAcaoEnchant.disabled = false;
                btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
                return;
            }

            if (data && data.success) {
                // Sincroniza inventário local (remover scroll)
                inventario[targetScroll]--; 
                if (inventario[targetScroll] <= 0) delete inventario[targetScroll];

                if (data.enchant_success) {
                    tocarSom('enchant');
                    let novoLvl = data.new_level;
                    
                    // Atualiza referência local
                    if (targetEquipObj.refOriginal) {
                        targetEquipObj.refOriginal.enchant = novoLvl;
                        if (targetEquipObj.refOriginal.base) targetEquipObj.refOriginal.base.enchant = novoLvl;
                    }

                    let mensagemLog = `<span style="color:#00ff00; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSuccess', { item: nomeEquip, level: novoLvl, chance: '?' }) : ('✨ SUCCESS! Your ' + nomeEquip + ' is now +' + novoLvl + '!')}</span>`;
                    if (novoLvl === 15) mensagemLog += `<br><span style="color:#fde047; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal15', { item: nomeEquip }) : ('🌟 [WORLD] Legendary! A ' + nomeEquip + ' +15!')}</span>`;
                    if (novoLvl === 20) mensagemLog += `<br><span style="color:#f97316; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal20', { item: nomeEquip }) : ('🔥 [WORLD] Epic! A ' + nomeEquip + ' +20!')}</span>`;
                    if (novoLvl === 25) mensagemLog += `<br><span style="color:#ef4444; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal25') : '⚡ [WORLD] Divine! +25 cap reached!'}</span>`;
                    escreverLog(mensagemLog);

                    // Pop-up de Sucesso
                    abrirModal('janela-item-acao', 2100);
                    document.getElementById('acao-titulo').innerHTML = '<span style="color:#10b981; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantSuccess') : 'ENCHANT SUCCESS!') + '</span>';
                    document.getElementById('acao-img').src = targetEquipObj.base.img;
                    document.getElementById('acao-desc').innerHTML = formatarTooltipEquipamento(targetEquipObj.base, novoLvl, targetEquipObj.isAugment, tipoItem, targetEquipObj.refOriginal);
                    
                    let btnAcao = document.getElementById('btn-acao-item');
                    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.continue') : 'CONTINUE';
                    btnAcao.style.background = "#15803d";
                    btnAcao.onclick = function() { fecharJanelaAcao(); };
                    targetScroll = null;
                } else {
                    if (data.crystallized) {
                        escreverLog(`<span style="color:#ef4444; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logFatalFail', { item: nomeEquip, level: lvlAtual }) : ('💥 FAIL! Your ' + nomeEquip + ' +' + lvlAtual + ' crystallized! 💥')}</span>`); 
                        let ganhoCristais = data.crystals_gained;
                        if(inventario['Crystals']) inventario['Crystals'] += ganhoCristais; else inventario['Crystals'] = ganhoCristais; 
                        escreverLog(`<span style="color:#60a5fa">${(typeof window.t === 'function') ? window.t('game.enchantUi.logReceivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</span>`); 
                        
                        // Remove item localmente
                        if (targetEquipObj.local === 'equipado') {
                            const slotAlvo = targetEquipObj.idUnico.replace('eq_', '');
                            InventoryManager.desequiparGarantido(slotAlvo);
                            InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                        } else {
                            InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                        }

                        // Pop-up de Cristalização
                        abrirModal('janela-item-acao', 2100);
                        document.getElementById('acao-titulo').innerHTML = '<span style="color:#ef4444; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.crystallized') : 'CRYSTALLIZED!') + '</span>';
                        document.getElementById('acao-img').src = 'assets/npcs/grocer.png'; 
                        document.getElementById('acao-desc').innerHTML = `<b style="color:#ef4444">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.equipDestroyed') : 'Your equipment was destroyed.'}</span><br><br><b style="color:#60a5fa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.receivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</b>`;
                        targetEquipObj = null; 
                        targetScroll = null;
                    } else {
                        // Safe Fail (Blessed)
                        escreverLog(`<span style="color:#fde047; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSafeFail', { chance: '?', item: nomeEquip, level: lvlAtual }) : ('🛡️ SAFE FAIL! Scroll gone; ' + nomeEquip + ' stays +' + lvlAtual + '.')}</span>`);
                        abrirModal('janela-item-acao', 2100);
                        document.getElementById('acao-titulo').innerHTML = '<span style="color:#fde047; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantFailed') : 'ENCHANT FAILED') + '</span>';
                        document.getElementById('acao-img').src = targetEquipObj.base.img;
                        document.getElementById('acao-desc').innerHTML = `<b style="color:white">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.enchantScrollSafe', { level: lvlAtual }) : ('The scroll was destroyed, but your equipment is safe. It stays +' + lvlAtual + '.')}</span>`;
                    }
                }
                
                btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
                btnAcaoEnchant.style.background = "#15803d";
                if (typeof InventoryManager !== 'undefined' && InventoryManager.sincronizarStatus) InventoryManager.sincronizarStatus();
                atualizarInterfaceEnchant();
            }
        } catch (err) {
            console.error('[Enchant RPC Exception]', err);
            btnAcaoEnchant.disabled = false;
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    // Remove o pergaminho imediatamente
    inventario[targetScroll]--; 
    if (inventario[targetScroll] <= 0) delete inventario[targetScroll];
    
    let isBlessed = metaScroll.abencoado; 
    let chance = 100; 
    if (lvlAtual >= 3) {
        const curvaDeChances = [ 66, 63, 60, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 8, 4, 1 ];
        chance = curvaDeChances[lvlAtual - 3] || 1; 
    }

    // Espera 1.5 segundos (1500 ms) antes de revelar o resultado!
    setTimeout(() => {
        if (Math.random() * 100 <= chance) { 
            tocarSom('enchant'); 
            let novoLvl = lvlAtual + 1; 
            
            // APLICA O ENCHANT DIRETAMENTE NO OBJETO ORIGINAL (Barreira de Integridade)
            if (targetEquipObj.refOriginal) {
                targetEquipObj.refOriginal.enchant = novoLvl;
                if (targetEquipObj.refOriginal.base) {
                    targetEquipObj.refOriginal.base.enchant = novoLvl;
                }
            }

            // Sincroniza via InventoryManager (isso cuidará de tudo)
            if (typeof InventoryManager !== 'undefined' && InventoryManager.sincronizarStatus) {
                InventoryManager.sincronizarStatus();
            }
            
            let mensagemLog = `<span style="color:#00ff00; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSuccess', { item: nomeEquip, level: novoLvl, chance }) : ('✨ SUCCESS! Your ' + nomeEquip + ' is now +' + novoLvl + '! (' + chance + '% chance)')}</span>`;
            if (novoLvl === 15) mensagemLog += `<br><span style="color:#fde047; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal15', { item: nomeEquip }) : ('🌟 [WORLD] Legendary! A ' + nomeEquip + ' +15!')}</span>`;
            if (novoLvl === 20) mensagemLog += `<br><span style="color:#f97316; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal20', { item: nomeEquip }) : ('🔥 [WORLD] Epic! A ' + nomeEquip + ' +20!')}</span>`;
            if (novoLvl === 25) mensagemLog += `<br><span style="color:#ef4444; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal25') : '⚡ [WORLD] Divine! +25 cap reached!'}</span>`;
            escreverLog(mensagemLog);
            
            // Pop-up de Sucesso
            abrirModal('janela-item-acao', 2100);
            document.getElementById('acao-titulo').innerHTML = '<span style="color:#10b981; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantSuccess') : 'ENCHANT SUCCESS!') + '</span>';
            document.getElementById('acao-img').src = targetEquipObj.base.img;
            document.getElementById('acao-desc').innerHTML = formatarTooltipEquipamento(targetEquipObj.base, novoLvl, targetEquipObj.isAugment, tipoItem, targetEquipObj.refOriginal);
            
            let btnAcao = document.getElementById('btn-acao-item');
            btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.continue') : 'CONTINUE';
            btnAcao.style.background = "#15803d";
            btnAcao.onclick = function() { fecharJanelaAcao(); };

            targetScroll = null; 
            
        } else { 
            if (isBlessed) {
                escreverLog(`<span style="color:#fde047; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSafeFail', { chance, item: nomeEquip, level: lvlAtual }) : ('🛡️ SAFE FAIL! (' + chance + '%). Scroll gone; ' + nomeEquip + ' stays +' + lvlAtual + '.')}</span>`);
                abrirModal('janela-item-acao', 2100);
                document.getElementById('acao-titulo').innerHTML = '<span style="color:#fde047; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantFailed') : 'ENCHANT FAILED') + '</span>';
                document.getElementById('acao-img').src = targetEquipObj.base.img;
                document.getElementById('acao-desc').innerHTML = `<b style="color:white">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.enchantScrollSafe', { level: lvlAtual }) : ('The scroll was destroyed, but your equipment is safe. It stays +' + lvlAtual + '.')}</span>`;
                
            } else {
                escreverLog(`<span style="color:#ef4444; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logFatalFail', { item: nomeEquip, level: lvlAtual }) : ('💥 FAIL! Your ' + nomeEquip + ' +' + lvlAtual + ' crystallized! 💥')}</span>`); 
                let ganhoCristais = (lvlAtual * 10) + 50; 
                if(inventario['Crystals']) inventario['Crystals'] += ganhoCristais; else inventario['Crystals'] = ganhoCristais; 
                escreverLog(`<span style="color:#60a5fa">${(typeof window.t === 'function') ? window.t('game.enchantUi.logReceivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</span>`); 
                
                // Registra a destruição no sistema de segurança
                if (typeof ItemSecurity !== 'undefined') {
                    ItemSecurity.registerDestruction(targetEquipObj.refOriginal);
                }

                // DESTRÓI O ITEM NO LOCAL CORRETO
                if (targetEquipObj.local === 'equipado') {
                    const slotAlvo = targetEquipObj.idUnico.replace('eq_', '');
                    // Força desequipe (o item vai para a bolsa)
                    InventoryManager.desequiparGarantido(slotAlvo);
                    // Agora remove da bolsa (UID check)
                    InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                } else {
                    // Remove da bolsa por UID
                    InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                }
                
                // Pop-up de Cristalização
                abrirModal('janela-item-acao', 2100);
                document.getElementById('acao-titulo').innerHTML = '<span style="color:#ef4444; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.crystallized') : 'CRYSTALLIZED!') + '</span>';
                document.getElementById('acao-img').src = 'assets/npcs/grocer.png'; 
                document.getElementById('acao-desc').innerHTML = `<b style="color:#ef4444">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.equipDestroyed') : 'Your equipment was destroyed.'}</span><br><br><b style="color:#60a5fa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.receivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</b>`;
                
                targetEquipObj = null; 
                targetScroll = null;
            }
            
            let btnAcao = document.getElementById('btn-acao-item');
            btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.continue') : 'CONTINUE';
            btnAcao.style.background = "#444";
            btnAcao.onclick = function() { fecharJanelaAcao(); };
        } 
        
        btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
        btnAcaoEnchant.style.background = "#15803d";
        
        if (typeof InventoryManager !== 'undefined' && InventoryManager.sincronizarStatus) {
            InventoryManager.sincronizarStatus();
        }
        atualizarInterfaceEnchant(); 
        
    }, 1500); 
}

// ==========================================
// ESQUELETO DO SISTEMA DE AUGMENT
// ==========================================

// ==========================================
// ESQUELETO DO SISTEMA DE AUGMENT
// ==========================================

// ==========================================
// SISTEMA DE AUGMENT (FORJA)
// ==========================================
// ==========================================
// SISTEMA DE AUGMENT (FORJA) - COMPLETO
// ==========================================
// ==========================================
// SISTEMA DE AUGMENT (FORJA) - COMPLETO E FINAL
// ==========================================
let augmentArmaSelecionada = null;
let augmentStoneSelecionada = null;
let augmentIndexArma = null;

function abrirJanelaAugment() {
    if (typeof fecharNpc === 'function') fecharNpc();
    abrirModal('janela-augment', 1500);
    resetarAugment();
    renderizarAugmentGrids();
}

function fecharAugment() {
    fecharModal('janela-augment');
}

function resetarAugment() {
    augmentArmaSelecionada = null;
    augmentStoneSelecionada = null;
    augmentIndexArma = null;
    document.getElementById('slot-target-augment-equip').innerHTML = '?';
    document.getElementById('slot-target-augment-stone').innerHTML = '?';
    let btn = document.getElementById('btn-executar-augment');
    if(btn) {
        btn.disabled = true;
        btn.style.background = '#444';
    }
    let aviso = document.getElementById('augment-warning');
    if(aviso) aviso.style.display = 'none';
}

// Função ajudante para pintar o AUG na cor do nível!
function criarBadgeAugment(isAug, equip) {
    if (!isAug) return '';
    let lvl = equip.augLevel || 1;
    let cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
    let cor = cores[lvl - 1] || '#a855f7';
    let txt = lvl === 5 ? 'MAX' : `LV${lvl}`;
    return `<div style="position:absolute; background:rgba(0,0,0,0.8); width:100%; height:100%; top:0; left:0; display:flex; flex-direction:column; justify-content:center; align-items:center; font-size:10px; color:${cor}; font-weight:bold; z-index:5; text-shadow: 0 0 5px ${cor}; box-sizing:border-box;"><span>AUG</span><span style="font-size:8px;">${txt}</span></div>`;
}

// ... Substitua a sua função renderizarAugmentGrids INTEIRA por esta: ...
function renderizarAugmentGrids() {
    const gridEquip = document.getElementById('augment-equip-grid');
    const gridStone = document.getElementById('augment-stone-grid');
    if(!gridEquip || !gridStone) return;
    gridEquip.innerHTML = ''; gridStone.innerHTML = '';

    let temArma = false;

    if (typeof armaEquipadaBase !== 'undefined' && armaEquipadaBase && armaEquipadaBase.nome !== 'Treining Sword') {
        temArma = true;
        let isAug = typeof isAugmented !== 'undefined' ? isAugmented : false;
        let encLevel = typeof enchant !== 'undefined' ? enchant : 0;
        
        let labelPlus = (encLevel > 0) ? `<div class="inv-qtd">+${encLevel}</div>` : '';
        let badgeE = `<div style="position:absolute; top:2px; left:2px; color:#10b981; font-size:9px; font-weight:bold; text-shadow:1px 1px 0 #000; z-index:10;">[E]</div>`;
        let blockAugment = criarBadgeAugment(isAug, armaEquipadaBase);

        gridEquip.innerHTML += `
            <div class="store-item-slot" onclick="${isAug ? '' : `abrirAugmentAcao('equipped')`}">
                <img src="${armaEquipadaBase.img}" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                ${badgeE} ${labelPlus} ${blockAugment}
            </div>`;
    }

    if(typeof inventarioEquips !== 'undefined') {
        inventarioEquips.forEach((equip, index) => {
            if (equip.tipo === 'weapon' && equip.base.nome !== 'Treining Sword') {
                temArma = true;
                let labelPlus = (equip.enchant > 0) ? `<div class="inv-qtd">+${equip.enchant}</div>` : '';
                let blockAugment = criarBadgeAugment(equip.augmented, equip.base);

                gridEquip.innerHTML += `
                    <div class="store-item-slot" onclick="${equip.augmented ? '' : `abrirAugmentAcao(${index})`}">
                        <img src="${equip.base.img}" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                        ${labelPlus} ${blockAugment}
                    </div>`;
            }
        });
    }

    if (!temArma) gridEquip.innerHTML = `<span style="font-size:10px; color:#555; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noWeaponsAugment') : 'No weapons.'}</span>`;

    let qtdStones = (typeof inventario !== 'undefined' && inventario["Life Stone"]) ? inventario["Life Stone"] : 0;
    if (qtdStones > 0) {
         gridStone.innerHTML += `
            <div class="store-item-slot" onclick="selecionarAugmentStone()">
                <img src="assets/itens/life_stone.png" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                <div class="inv-qtd">${qtdStones}</div>
            </div>`;
    } else {
         gridStone.innerHTML = '<span style="font-size:10px; color:#555; grid-column:span 3; text-align:center;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.noStones') : 'No stones.') + '</span>';
    }
}

// ==========================================
// JANELA DE CONFIRMAÇÃO DO AUGMENT (INTELIGENTE)
// ==========================================
function fecharAugmentAcao() {
    fecharModal('janela-augment-acao');
}

function abrirAugmentAcao(indexInventario) {
    let equip;
    let isEquipped = false;
    
    if (indexInventario === 'equipped') {
        equip = { base: armaEquipadaBase, enchant: enchant, augmented: typeof isAugmented !== 'undefined' ? isAugmented : false };
        isEquipped = true;
    } else {
        equip = inventarioEquips[indexInventario];
        if (armaEquipadaBase && armaEquipadaBase.nome === equip.base.nome && (equip.enchant||0) === enchant && (equip.augmented||false) === (typeof isAugmented !== 'undefined' ? isAugmented : false)) {
            isEquipped = true;
        }
    }

    abrirModal('janela-augment-acao', 1700);
    document.getElementById('augment-acao-img').src = equip.base.img;

    const getGradeColor = (g) => { return {'D':'#60a5fa', 'C':'#93c5fd', 'B':'#fca5a5', 'A':'#fde047', 'S':'#c084fc'}[g] || '#fff'; };
    
    let corGrade = getGradeColor(equip.base.grade);
    let encLevel = equip.enchant || 0;
    let nomeDisplay = encLevel > 0 ? `+${encLevel} ${equip.base.nome}` : equip.base.nome;
    
    // Matemática do P. Atk
    let pAtkBase = equip.base.atk || 0;
    let pAtkEnchant = Math.floor(pAtkBase * 0.10 * encLevel);
    let pAtkTotal = pAtkBase + pAtkEnchant + (equip.augmented ? 15 : 0);

    // Matemática do M. Atk (Se existir na arma)
    let mAtkBase = equip.base.matk || 0;
    let mAtkEnchant = Math.floor(mAtkBase * 0.10 * encLevel);
    let mAtkTotal = mAtkBase + mAtkEnchant + (equip.augmented ? 15 : 0);

    let infoHtml = `
        <div style="font-size: 1.1em; font-weight: bold; color: white; margin-bottom: 5px;">
            ${nomeDisplay} <span style="color:${corGrade}; font-size:0.8em;">[${equip.base.grade}]</span>
        </div>
        <hr style="border: 0.5px solid #444; margin: 8px 10%; width: 80%;">
        
        <div style="text-align: left; padding: 0 15%; width: 100%; box-sizing: border-box;">
            
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                <span style="color:#ccc;">P. Atk (Total):</span> <b style="color:#ffcc00; font-size:1.1em;">${pAtkTotal}</b>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Base:</span> <span style="color: #aaa;">${pAtkBase}</span>
            </div>
            ${encLevel > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Encante (+${encLevel}):</span> <span style="color: #3b82f6;">+${pAtkEnchant}</span>
            </div>` : ''}

            ${mAtkBase > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; margin-top: 10px;">
                <span style="color:#ccc;">M. Atk (Total):</span> <b style="color:#3b82f6; font-size:1.1em;">${mAtkTotal}</b>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Base:</span> <span style="color: #aaa;">${mAtkBase}</span>
            </div>
            ${encLevel > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Encante (+${encLevel}):</span> <span style="color: #3b82f6;">+${mAtkEnchant}</span>
            </div>` : ''}
            ` : ''}

        </div>
    `;

    if (isEquipped) {
        infoHtml += `<div style="color: #10b981; font-weight: bold; margin-top: 15px; font-size: 0.9em;">[EQUIPADO ATUALMENTE]</div>`;
    }

    document.getElementById('augment-acao-desc').innerHTML = infoHtml;

    let btnConfirmar = document.getElementById('btn-augment-confirmar-selecao');
    btnConfirmar.onclick = function() {
        selecionarAugmentArma(indexInventario);
        fecharAugmentAcao();
    };
}

// ==========================================
// LÓGICA DE SELEÇÃO E MOTOR
// ==========================================
function selecionarAugmentArma(indexInventario) {
    if (indexInventario === 'equipped') {
        augmentIndexArma = 'equipped';
        augmentArmaSelecionada = { base: armaEquipadaBase, enchant: enchant, augmented: typeof isAugmented !== 'undefined' ? isAugmented : false };
    } else {
        augmentIndexArma = indexInventario;
        augmentArmaSelecionada = inventarioEquips[indexInventario];
    }
    
    let labelPlus = (augmentArmaSelecionada.enchant > 0) ? `<div style="color:#fff; font-weight:bold; position:absolute; bottom:2px; left:2px; text-shadow:1px 1px 0 #000;">+${augmentArmaSelecionada.enchant}</div>` : '';
    document.getElementById('slot-target-augment-equip').innerHTML = `
        <div style="position:relative; width:100%; height:100%; border: 1px solid #444;">
            <img src="${augmentArmaSelecionada.base.img}" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='assets/armas/espada_inicial.png'">
            ${labelPlus}
        </div>`;
    checarProntidaoAugment();
}

function selecionarAugmentStone() {
    augmentStoneSelecionada = "Life Stone";
    document.getElementById('slot-target-augment-stone').innerHTML = `<img src="assets/itens/life_stone.png" style="width:100%; height:100%; object-fit:contain; border: 1px solid #444;" onerror="this.src='assets/armas/espada_inicial.png'">`;
    checarProntidaoAugment();
}

function checarProntidaoAugment() {
    let btn = document.getElementById('btn-executar-augment');
    let aviso = document.getElementById('augment-warning');

    if (augmentArmaSelecionada && augmentStoneSelecionada) {
        btn.disabled = false;
        btn.style.background = '#a855f7'; 
        aviso.style.display = 'block';
        aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentFeeLine') : 'Fee: 5,000 Adena';
    }
}

// ==========================================
// MOTOR RNG DO AUGMENT
// ==========================================
async function executarAugment() {
    if (!augmentArmaSelecionada || !augmentStoneSelecionada) return;

    let custoAdena = 5000; let custoLifeStone = 1; let custoAncientCoin = 5;
    let qtdStone = inventario['Life Stone'] || 0;
    let qtdCoin = typeof ancientCoins !== 'undefined' ? ancientCoins : (window.ancientCoins || 0);

    if (adenas < custoAdena || qtdStone < custoLifeStone || qtdCoin < custoAncientCoin) {
        if(typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.enchant.augmentRequirement', { adena: custoAdena, lifeStone: custoLifeStone, ancientCoin: custoAncientCoin }) : `Requisito: ${custoAdena}a, ${custoLifeStone}x Life Stone e ${custoAncientCoin}x Ancient Coin.`);
        return;
    }

    let btn = document.getElementById('btn-executar-augment');
    btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.forging') : 'FORGING...'; btn.disabled = true;
    if(typeof tocarSom === 'function') tocarSom('enchant');

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName && augmentArmaSelecionada.uid) {
        try {
            const { data, error } = await window.SupabaseAPI.augmentItem(window.charName, augmentArmaSelecionada.uid, augmentStoneSelecionada);
            
            if (error) {
                console.error('[Augment RPC Error]', error);
                if (typeof window.l2Alert === 'function') window.l2Alert(typeof window.t === 'function' ? window.t('game.cloud.error') + ': ' + (error.message || error) : 'Cloud Error: ' + (error.message || error));
                btn.disabled = false;
                btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
                return;
            }

            if (data && data.success) {
                // Sincroniza recursos locais
                adenas -= custoAdena; 
                inventario['Life Stone'] -= custoLifeStone;
                if (inventario['Life Stone'] <= 0) delete inventario['Life Stone'];
                ancientCoins = (Number(ancientCoins) || Number(window.ancientCoins) || 0) - custoAncientCoin;
                window.ancientCoins = ancientCoins;

                let augLevel = data.aug_level;
                let stat1 = data.stat1;
                let stat2 = data.stat2;
                let itemUpdated = data.item_updated;

                // Atualiza a referência local da arma (importante para o HUD e cálculos)
                if (augmentIndexArma === 'equipped') {
                    armaEquipadaBase = itemUpdated.base;
                    isAugmented = true;
                } else {
                    inventarioEquips[augmentIndexArma] = itemUpdated;
                }

                if(typeof tocarSom === 'function') tocarSom('enchant_success');
                let cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
                let corMsg = cores[augLevel - 1];
                
                let augIntroRaw = (typeof window.t === 'function') ? window.t('game.enchantUi.logAugmentIntro', { level: augLevel }) : (`✨ AUGMENT LVL ${augLevel}! Hidden powers awakened:`);
                if(typeof escreverLog === 'function') escreverLog(`<span style="color:${corMsg}; font-weight:bold; text-shadow:1px 1px 0 #000;">${augIntroRaw}</span><br><span style="color:#fff;">↳ ${stat1.txt} +${stat1.val}</span><br><span style="color:#fff;">↳ ${stat2.txt} +${stat2.val}</span>`);
                
                btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
                if(typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
                if(typeof atualizar === 'function') atualizar();
                
                if(typeof fecharAugment === 'function') fecharAugment(); 
                mostrarResultadoAugment(itemUpdated.base);
            }
        } catch (err) {
            console.error('[Augment RPC Exception]', err);
            btn.disabled = false;
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    adenas -= custoAdena; inventario['Life Stone'] -= custoLifeStone;
    ancientCoins = (Number(ancientCoins) || Number(window.ancientCoins) || 0) - custoAncientCoin;
    window.ancientCoins = ancientCoins;
    if (inventario['Life Stone'] <= 0) delete inventario['Life Stone'];

    setTimeout(() => {
        // ... (resto da lógica offline mantida)
        // --- A ROLETA DE NÍVEL (RNG) ---
        let chanceNivel = Math.random() * 100;
        let augLevel = 1;
        if (chanceNivel <= 50) augLevel = 1;      // 50% chance Lvl 1 (Cinza)
        else if (chanceNivel <= 80) augLevel = 2; // 30% chance Lvl 2 (Verde)
        else if (chanceNivel <= 93) augLevel = 3; // 13% chance Lvl 3 (Azul)
        else if (chanceNivel <= 98) augLevel = 4; // 5% chance Lvl 4 (Vermelho)
        else augLevel = 5;                        // 2% chance Lvl 5 (Dourado/Max)

        // --- A ROLETA DE STATUS ---
        let mult = augLevel; // Níveis altos dão multiplicadores gigantes
        let pool = [
            { prop: 'augPAtk', txt: 'P. Atk',   val: Math.floor(Math.random() * (15 * mult)) + (5 * mult) },
            { prop: 'augMAtk', txt: 'M. Atk',   val: Math.floor(Math.random() * (15 * mult)) + (5 * mult) },
            { prop: 'augPDef', txt: 'P. Def',   val: Math.floor(Math.random() * (10 * mult)) + (5 * mult) },
            { prop: 'augMDef', txt: 'M. Def',   val: Math.floor(Math.random() * (10 * mult)) + (5 * mult) },
            { prop: 'augSpd',  txt: 'Speed',    val: Math.floor(Math.random() * (20 * mult)) + (10 * mult) },
            { prop: 'augCrit', txt: 'Crit Rate',val: Math.floor(Math.random() * (2 * mult)) + (1 * mult) }
        ];
        pool.sort(() => Math.random() - 0.5); // Embaralha a lista
        let stat1 = pool[0]; let stat2 = pool[1];

        // --- APLICA NA ARMA (COM CLONAGEM) ---
        let equipAlvo;
        if (augmentIndexArma === 'equipped') {
            // MÁGICA DA CLONAGEM: Separa a arma do banco de dados global
            armaEquipadaBase = JSON.parse(JSON.stringify(armaEquipadaBase));
            equipAlvo = armaEquipadaBase;
            isAugmented = true;
        } else {
            // Clona a arma que está guardada na bolsa
            inventarioEquips[augmentIndexArma].base = JSON.parse(JSON.stringify(inventarioEquips[augmentIndexArma].base));
            equipAlvo = inventarioEquips[augmentIndexArma].base;
            inventarioEquips[augmentIndexArma].augmented = true;
        }

        // Zera tudo antes para garantir que não fique lixo de outro nível
        equipAlvo.augLevel = augLevel;
        equipAlvo.augPAtk = 0; equipAlvo.augMAtk = 0; equipAlvo.augPDef = 0; equipAlvo.augMDef = 0; equipAlvo.augSpd = 0; equipAlvo.augCrit = 0;
        
        // Aplica os dois poderes sorteados
        equipAlvo[stat1.prop] = stat1.val;
        equipAlvo[stat2.prop] = stat2.val;

        if(typeof tocarSom === 'function') tocarSom('enchant_success');
        let cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
        let corMsg = cores[augLevel - 1];
        
        let augIntroRaw = (typeof window.t === 'function') ? window.t('game.enchantUi.logAugmentIntro', { level: augLevel }) : (`✨ AUGMENT LVL ${augLevel}! Hidden powers awakened:`);
        if(typeof escreverLog === 'function') escreverLog(`<span style="color:${corMsg}; font-weight:bold; text-shadow:1px 1px 0 #000;">${augIntroRaw}</span><br><span style="color:#fff;">↳ ${stat1.txt} +${stat1.val}</span><br><span style="color:#fff;">↳ ${stat2.txt} +${stat2.val}</span>`);
        
        btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
        if(typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
        if(typeof atualizar === 'function') atualizar();
        if(typeof salvarJogo === 'function') salvarJogo();
        
        // ==========================================
        // MÁGICA VISUAL: FECHA A FORJA E MOSTRA O RESULTADO!
        // ==========================================
        if(typeof fecharAugment === 'function') fecharAugment(); 
        mostrarResultadoAugment(equipAlvo); 

    }, 1500); 
}

// Função para fechar a tela de resultado
function fecharAugmentResultado() {
    fecharModal('janela-augment-resultado');
    if(typeof atualizar === 'function') atualizar();
}

function mostrarResultadoAugment(armaNova) {
    // Pega o nível que foi sorteado (ou 1 por garantia)
    let nivel = armaNova.augLevel || 1;
    
    // Tabela de cores de Raridade
    let cores = {
        1: '#9ca3af', // Cinza     (Comum)
        2: '#10b981', // Verde     (Incomum)
        3: '#3b82f6', // Azul      (Raro)
        4: '#ef4444', // Vermelho  (Épico)
        5: '#facc15'  // Dourado   (Lendário)
    };
    let corTema = cores[nivel];

    // ==========================================
    // MÁGICA VISUAL: PINTANDO A JANELA
    // ==========================================
    let janela = document.getElementById('janela-augment-resultado');
    janela.style.boxShadow = `0 0 30px ${corTema}80`; // O "80" no final dá 50% de transparência pro brilho
    janela.style.border = `2px solid ${corTema}`;
    
    document.getElementById('aug-res-header').style.background = `linear-gradient(90deg, transparent, ${corTema}, transparent)`;
    document.getElementById('aug-res-title-text').innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentResultTitle', { level: nivel }) : (`✦ AUGMENT LVL ${nivel} ✦`);
    
    document.getElementById('aug-res-img-slot').style.border = `2px solid ${corTema}`;
    document.getElementById('aug-res-img-slot').style.boxShadow = `inset 0 0 20px ${corTema}60`;
    
    document.getElementById('aug-res-subtitle').style.color = corTema;
    document.getElementById('aug-res-box').style.border = `1px dashed ${corTema}`;
    
    let btn = document.getElementById('aug-res-btn');
    btn.style.background = corTema;
    btn.style.border = `1px solid ${corTema}`;
    // Ajusta a cor da letra do botão para preto se for Dourado (pra dar leitura)
    btn.style.color = (nivel === 5) ? '#000' : '#fff';

    // ==========================================
    // PREENCHENDO OS DADOS DA ARMA
    // ==========================================
    document.getElementById('aug-res-img').src = armaNova.img || 'assets/itens/item_generic.png';
    document.getElementById('aug-res-nome').innerText = armaNova.nome;
    
    let statsHtml = '';
    
    if (armaNova.augPAtk) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">P. Atk:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augPAtk}</span></div>`;
    if (armaNova.augMAtk) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">M. Atk:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augMAtk}</span></div>`;
    if (armaNova.augPDef) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">P. Def:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augPDef}</span></div>`;
    if (armaNova.augMDef) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">M. Def:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augMDef}</span></div>`;
    if (armaNova.augSpd)  statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">Atk. Speed:</span> <span style="color:${corTema}; font-weight:bold;">Fast +${armaNova.augSpd}</span></div>`;
    if (armaNova.augCrit) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">Crit Rate:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augCrit}%</span></div>`;

    document.getElementById('aug-res-status').innerHTML = statsHtml;
    
    if(typeof tocarSom === 'function') tocarSom('lvlup');
    
    abrirModal('janela-augment-resultado', 1800);
}
