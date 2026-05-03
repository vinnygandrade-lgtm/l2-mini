// ==========================================
// UI - INVENTORY (BOLSA E PERFIL)
// ==========================================

function renderizarInventario() {
    const grid = document.getElementById('grid-inventario'); 
    if(!grid) return;
    grid.innerHTML = ''; 

    // 1. RENDERIZA EQUIPAMENTOS (LEITOR UNIVERSAL BLINDADO)
    try {
        if (typeof inventarioEquips !== 'undefined') {
            inventarioEquips.forEach((equip, index) => { 
                if (!equip) return;
                
                let itemBase = equip.base ? equip.base : equip; 
                if (!itemBase.nome) return; 

                let tipoGeral = equip.tipo || itemBase.tipoItem || itemBase.tipo || 'misc';
                let nivelEnchant = equip.enchant !== undefined ? equip.enchant : (equip.enchantArmor || equip.enchantJewel || 0);
                
                let labelPlus = nivelEnchant > 0 ? `<div class="enchant-label">+${nivelEnchant}</div>` : '';
                let badgeAugment = (equip.augmented || itemBase.augmented) ? `<div class="augment-label" style="background:#a855f7;"></div>` : '';

                let slot = document.createElement('div'); 
                slot.className = 'inv-slot'; 
                slot.onclick = () => abrirAcaoInventario(index); 
                
                slot.innerHTML = `
                    ${badgeAugment}
                    <img src="${itemBase.img}" onerror="this.src='assets/itens/item_generic.png'" class="inv-img">
                    ${labelPlus}
                `; 
                grid.appendChild(slot); 
            });
        }
    } catch (e) { console.error("Erro ao renderizar equipamentos:", e); }
    
    // 2. MATERIAIS E CONSUMÍVEIS — moedas primeiro (HUD espelho na bolsa)
    var kMoedaAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    var kMoedaAc = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';
    let keysMoeda = [kMoedaAd, kMoedaAc];

    const renderSlotStack = function (nome) {
        let qtd = inventario[nome];
        if (!qtd || qtd <= 0) return;
        let isCurrency = (nome === kMoedaAd || nome === kMoedaAc);
        let slot = document.createElement('div');
        slot.className = isCurrency ? 'inv-slot inv-slot-currency' : 'inv-slot';
        slot.onclick = () => { if (typeof abrirAcaoItemGeral === 'function') abrirAcaoItemGeral(nome); };

        let imgSrc = 'assets/itens/item_generic.png';
        let dadosItem = null;
        if (typeof catalogoMateriais !== 'undefined') dadosItem = catalogoMateriais.find(m => m.id === nome || m.nome === nome);
        if (!dadosItem && typeof catalogoConsumiveis !== 'undefined') dadosItem = catalogoConsumiveis.find(c => c.id === nome || c.nome === nome);

        if (dadosItem && dadosItem.img) imgSrc = dadosItem.img;
        else {
            if (nome.includes('Potion')) imgSrc = 'assets/itens/pot_hp.png';
            else if (nome.includes('Recipe')) imgSrc = 'assets/itens/recipe_s.png';
            else if (nome.includes('Ancient')) imgSrc = 'assets/itens/ancient_coin.png';
            else if (nome === kMoedaAd) imgSrc = 'assets/itens/adena_coin.png';
        }

        if (isCurrency) {
            slot.innerHTML = `
                <div class="l2-coin-plate">
                    <img src="${imgSrc}" onerror="this.src='assets/itens/item_generic.png'" alt="" class="l2-coin-img">
                </div>
                <div class="inv-qtd">${qtd}</div>
            `;
        } else {
            slot.innerHTML = `
                <img src="${imgSrc}" onerror="this.src='assets/itens/item_generic.png'" class="inv-img">
                <div class="inv-qtd">${qtd}</div>
            `;
        }
        grid.appendChild(slot);
    };

    keysMoeda.forEach(renderSlotStack);

    let nomesDosItens = Object.keys(inventario).filter(n => keysMoeda.indexOf(n) === -1);
    nomesDosItens.forEach(nome => { 
        renderSlotStack(nome);
    });
}

function fecharJanelaAcao() {
    document.getElementById('btn-acao-item').onclick = null;
    try {
        const acImg = document.getElementById('acao-img');
        if (acImg) acImg.classList.remove('l2-coin-modal');
        const imgSlotEl = document.getElementById('acao-img-slot');
        if (imgSlotEl) imgSlotEl.classList.remove('l2-currency-modal-slot');
    } catch (e) { /* noop */ }

    let container = document.getElementById('btn-acao-item').parentElement;
    let botoes = container.querySelectorAll('.btn-l2');
    botoes.forEach(btn => {
        if (btn.id !== 'btn-acao-item' && btn.innerText !== 'CLOSE') {
            btn.remove();
        }
    });

    if (typeof window.fecharModal === 'function') window.fecharModal('janela-item-acao');
    else {
        document.getElementById('janela-item-acao').style.display = 'none';
        if (typeof toggleModalBackdrop === 'function') toggleModalBackdrop('janela-item-acao', false);
    }
}

window.abrirJanelaBloqueioGrade = function(item, nivelMinimo, gradeNormalizada) {
    const janela = document.getElementById('janela-bloqueio-grade');
    const desc = document.getElementById('bloqueio-grade-desc');
    const titulo = document.getElementById('bloqueio-grade-titulo');
    if (!janela || !desc || !titulo) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.inventory.needLevelToEquip', { level: nivelMinimo }) : `You need level ${nivelMinimo} to equip this item.`);
        return;
    }

    const nomeItem = item?.nome || 'Item';
    const grade = gradeNormalizada || (item?.grade || 'No-Grade');
    const nivelAtual = typeof nivel !== 'undefined' ? nivel : 1;

    titulo.innerHTML = (typeof window.t === 'function') ? window.t('game.inventoryUi.reqTitle') : 'Equipment requirement';
    desc.innerHTML = `
        <div style="font-size:13px; color:#e5e7eb; margin-bottom:8px;"><b style="color:#fde047;">${nomeItem}</b></div>
        <div style="font-size:12px; color:#cbd5e1;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.gradeLabel') : 'Grade:'} <b style="color:#60a5fa;">[${grade}]</b></div>
        <div style="font-size:12px; color:#fca5a5; margin-top:6px;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.requiredLevel') : 'Required level:'} <b>${nivelMinimo}</b></div>
        <div style="font-size:12px; color:#93c5fd; margin-top:4px;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.yourLevel') : 'Your level:'} <b>${nivelAtual}</b></div>
    `;
    abrirModal('janela-bloqueio-grade', 2000);
};

window.fecharJanelaBloqueioGrade = function() {
    fecharModal('janela-bloqueio-grade');
};

function getGradeColor(grade) {
    if(grade === 'D') return '#60a5fa'; if(grade === 'C') return '#93c5fd'; if(grade === 'B') return '#fca5a5'; if(grade === 'A') return '#fde047'; if(grade === 'S') return '#c084fc'; return '#fff'; 
}

// ======================================================
// LEITOR UNIVERSAL DE STATUS E FERRAMENTAS
// ======================================================
function formatarTooltipEquipamento(base, lvlEncante, isAugment, tipoOriginal, itemCompleto = null) {
    let corGrade = getGradeColor(base.grade);
    let titulo = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:white; font-size:1.15em; text-shadow: 1px 1px 2px #000;">${lvlEncante > 0 ? '+'+lvlEncante+' ' : ''}${base.nome}</b>
            <span style="color:${corGrade}; font-size:0.75em; font-weight:bold; border: 1px solid ${corGrade}; padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,0.5);">[${base.grade}]</span>
        </div>`;
    let divisor = `<hr style="border: 0; height: 1px; background: linear-gradient(to right, transparent, #555, transparent); margin: 8px 0;">`;
    let detalhes = `<div style="text-align: left; padding: 6px; width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3); border-radius: 5px; border: 1px solid #333;">`;
    const addLinha = (label, val, color) => `<div style="display:flex; justify-content:space-between; font-size: 0.85em; margin-bottom: 4px;"><span style="color: #888;">${label}</span> <span style="color: ${color}; font-weight:bold;">${val}</span></div>`;

    // ... (rest of the logic remains the same until the end)

    let tipo = 'misc';
    if (['neck', 'ear', 'ring', 'jewel', 'ear1', 'ear2', 'ring1', 'ring2'].includes(tipoOriginal)) tipo = 'jewel';
    else if (['Heavy', 'Light', 'Robe', 'armor'].includes(tipoOriginal)) tipo = 'armor';
    else if (['Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword', 'weapon'].includes(tipoOriginal)) tipo = 'weapon';

    let basePAtk = base.atk || base.pAtk || 0;
    let baseMAtk = base.matk || base.mAtk || 0;
    let basePDef = base.def || base.pDef || 0;
    let baseMDef = base.mDef || 0;

    let linhaReqNivel = '';
    if (typeof validarEquipPorGrade === 'function') {
        let vReq = validarEquipPorGrade(base);
        let corReq = vReq.permitido ? '#22c55e' : '#ef4444';
        let txtReq = vReq.permitido ? 'Liberado' : 'Bloqueado';
        linhaReqNivel = `<div style="margin-bottom:6px; text-align:center; font-size:0.82em; color:${corReq}; border:1px solid ${corReq}; border-radius:4px; padding:4px 6px; background:rgba(0,0,0,0.35);">Requires Level ${vReq.nivelMinimo} <span style="color:#94a3b8;">(Your level: ${vReq.nivelAtual})</span> - <b>${txtReq}</b></div>`;
    }

    if (linhaReqNivel) detalhes += linhaReqNivel;

    if (tipo === 'weapon') {
        let bonusPAtk = Math.floor(basePAtk * 0.10 * lvlEncante);
        let totalPAtk = basePAtk + bonusPAtk + (isAugment ? (base.augPAtk || 0) : 0);
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">P. Atk (Total):</span> <b style="color:#ef4444; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalPAtk}</b></div>`;
        if(basePAtk > 0) detalhes += addLinha('➥ Base P. Atk:', basePAtk, '#aaa');
        if(baseMAtk > 0) detalhes += addLinha('➥ Base M. Atk:', baseMAtk, '#3b82f6');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusPAtk}`, '#3b82f6');
    } else if (tipo === 'armor') {
        let bonusPDef = Math.floor(basePDef * 0.10 * lvlEncante);
        let totalPDef = basePDef + bonusPDef;
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">P. Def (Total):</span> <b style="color:#fde047; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalPDef}</b></div>`;
        if(base.tipo) detalhes += addLinha('➥ Armor Type:', base.tipo, '#10b981');
        if(basePDef > 0) detalhes += addLinha('➥ Base P. Def:', basePDef, '#aaa');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusPDef}`, '#3b82f6');
    } else if (tipo === 'jewel') {
        let bonusMDef = Math.floor(baseMDef * 0.10 * lvlEncante);
        let totalMDef = baseMDef + bonusMDef;
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">M. Def (Total):</span> <b style="color:#a855f7; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalMDef}</b></div>`;
        if(baseMDef > 0) detalhes += addLinha('➥ Base M. Def:', baseMDef, '#aaa');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusMDef}`, '#3b82f6');
    }

    let dicStatus = [
        { k: 'pAtk', lbl: '↳ Extra P.Atk:', cor: '#ef4444', pfx: '+' },
        { k: 'mAtk', lbl: '↳ Extra M.Atk:', cor: '#3b82f6', pfx: '+' },
        { k: 'bonusHp', lbl: '↳ Max HP:', cor: '#10b981', pfx: '+' },
        { k: 'bonusMp', lbl: '↳ Max MP:', cor: '#3b82f6', pfx: '+' },
        { k: 'bonusSpd', lbl: '↳ Atk. Speed:', cor: '#fcd34d', pfx: 'Fast +' },
        { k: 'bonusCrit', lbl: '↳ Crit Rate:', cor: '#ef4444', pfx: '+', sfx: '%' },
        { k: 'bonusMDef', lbl: '↳ Extra M.Def:', cor: '#a855f7', pfx: '+' }
    ];

    let htmlBonusExtra = '';
    dicStatus.forEach(st => {
        if (base[st.k] && base[st.k] > 0) {
            if ((st.k === 'pAtk' || st.k === 'atk') && tipo === 'weapon') return;
            if ((st.k === 'mAtk' || st.k === 'matk') && tipo === 'weapon') return;
            if (st.k === 'bonusMDef' && tipo === 'jewel') return; 
            htmlBonusExtra += addLinha(st.lbl, `${st.pfx || ''}${base[st.k]}${st.sfx || ''}`, st.cor);
        }
    });

    if (htmlBonusExtra !== '') {
        let tituloBonus = tipo === 'weapon' ? 'SPECIAL ABILITY' : (tipo === 'jewel' ? 'EPIC POWER / BÔNUS' : 'EQUIPMENT BÔNUS');
        let corTitulo = tipo === 'weapon' ? '#eab308' : (tipo === 'jewel' ? '#f87171' : '#aaa');
        detalhes += `<div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #666;">`;
        detalhes += `<div style="text-align:center; color:${corTitulo}; font-size: 0.8em; margin-bottom:6px; font-weight:bold;">${tituloBonus}</div>`;
        detalhes += htmlBonusExtra;
        detalhes += `</div>`;
    }

    if (isAugment) {
        let augLvl = base.augLevel || 1; let coresLvl = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15']; let corAug = coresLvl[augLvl - 1] || '#a855f7'; let txtLvl = augLvl === 5 ? 'MAX' : `LVL ${augLvl}`;
        detalhes += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed ${corAug}; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 5px;">`;
        detalhes += `<div style="text-align:center; color:${corAug}; font-weight:bold; margin-bottom:6px; text-shadow: 0 0 5px ${corAug}; letter-spacing: 1px;">✦ AUGMENT ${txtLvl} ✦</div>`;
        let dicAug = [
            { k: 'augPAtk', lbl: '↳ P. Atk:', cor: corAug, pfx: '+' }, { k: 'augMAtk', lbl: '↳ M. Atk:', cor: corAug, pfx: '+' },
            { k: 'augPDef', lbl: '↳ P. Def:', cor: corAug, pfx: '+' }, { k: 'augMDef', lbl: '↳ M. Def:', cor: corAug, pfx: '+' },
            { k: 'augSpd', lbl: '↳ Atk. Speed:', cor: corAug, pfx: 'Fast +' }, { k: 'augCrit', lbl: '↳ Crit Rate:', cor: corAug, pfx: '+', sfx: '%' }
        ];
        dicAug.forEach(st => { if (base[st.k]) detalhes += addLinha(st.lbl, `${st.pfx || ''}${base[st.k]}${st.sfx || ''}`, st.cor); });
        detalhes += `</div>`;
    }

    if (base.desc) detalhes += `<div style="color:#d4c4a8; font-size:0.75em; font-style:italic; margin-top:8px; border-top:1px dashed #444; padding-top:6px; text-align:center;">"${base.desc}"</div>`;
    // Informações de Segurança (RG do Item) no Rodapé
    if (itemCompleto && itemCompleto.uid) {
        detalhes += `<div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #333; font-family: monospace; font-size: 7px; color: #555; text-align: center; letter-spacing: 0.5px;">`;
        detalhes += `OWNER: ${itemCompleto.owner || 'UNKNOWN'} | RG: ${itemCompleto.uid}`;
        detalhes += `</div>`;
    }

    detalhes += `</div>`;
    return titulo + divisor + detalhes;
}

function abrirAcaoInventario(index) {
    let equip = inventarioEquips[index]; 
    let itemBase = equip.base ? equip.base : equip;
    let tipoBruto = equip.tipo || itemBase.tipoItem || itemBase.tipo || 'misc';
    
    let nivelEnchant = 0;
    if (['weapon', 'Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword'].includes(tipoBruto)) nivelEnchant = equip.enchant || itemBase.enchant || 0;
    else if (['neck', 'ear', 'ring', 'jewel', 'ear1', 'ear2', 'ring1', 'ring2'].includes(tipoBruto)) nivelEnchant = equip.enchantJewel || itemBase.enchantJewel || equip.enchant || itemBase.enchant || 0;
    else nivelEnchant = equip.enchantArmor || itemBase.enchantArmor || equip.enchant || itemBase.enchant || 0;

    let isAugment = equip.augmented || itemBase.augmented || false;

    abrirModal('janela-item-acao', 2100); 
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO'; 
    document.getElementById('acao-img').src = itemBase.img;
    
    let info = formatarTooltipEquipamento(itemBase, nivelEnchant, isAugment, tipoBruto, equip);
    let descContainer = document.getElementById('acao-desc'); 
    descContainer.innerHTML = info; descContainer.style.width = "100%"; 
    
    let btnAcao = document.getElementById('btn-acao-item'); btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.equip') : 'EQUIP'; btnAcao.style.background = "#15803d"; btnAcao.style.display = "block";
    btnAcao.onclick = function() { btnAcao.onclick = null; equiparDaBolsa(index); };

    // Botão para colocar no atalho (Adicionado para Equipamentos)
    let btnAtalho = document.createElement('button');
    btnAtalho.className = 'btn-l2';
    btnAtalho.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.pinToShortcut') : 'ASSIGN TO SHORTCUT';
    btnAtalho.style.background = "#ca8a04";
    btnAtalho.style.marginTop = "8px";
    btnAtalho.onclick = function() {
        fecharJanelaAcao();
        abrirSeletorAtalhoGlobal(itemBase.nome, (index) => {
            barraAtalhos[index] = itemBase.nome;
            let logLine = (typeof window.t === 'function')
                ? window.t('game.smartbar.itemPinnedToSlot', { item: itemBase.nome, slot: index + 1 })
                : (`${itemBase.nome} pinned to slot ${index + 1}!`);
            escreverLog(`<span style="color:#10b981;">${logLine}</span>`);
            renderizarBarraAtalhos(); if(typeof salvarJogo === 'function') salvarJogo();
        });
    };
    document.getElementById('btn-acao-item').parentElement.insertBefore(btnAtalho, document.getElementById('btn-acao-item').nextSibling);
}

function abrirAcaoPerfil(tipo) {
    let fullItem = null; let enc = 0; let aug = false; let tipoBruto = '';

    if (tipo === 'weapon') { fullItem = armaEquipadaBase; enc = fullItem?.enchant || window.enchant || 0; aug = fullItem?.augmented || window.isAugmented || false; tipoBruto = 'weapon'; }
    else if (tipo === 'armor') { fullItem = armaduraEquipada; enc = fullItem?.enchant || window.enchantArmor || 0; tipoBruto = 'armor'; }
    else if (tipo === 'neck') { fullItem = colarEquipado; enc = fullItem?.enchant || fullItem?.enchantJewel || 0; tipoBruto = 'neck'; }
    else if (tipo === 'ear1') { fullItem = brincoEquipado1; enc = fullItem?.enchant || fullItem?.enchantJewel || 0; tipoBruto = 'ear'; }
    else if (tipo === 'ear2') { fullItem = brincoEquipado2; enc = fullItem?.enchant || fullItem?.enchantJewel || 0; tipoBruto = 'ear'; }
    else if (tipo === 'ring1') { fullItem = anelEquipado1; enc = fullItem?.enchant || fullItem?.enchantJewel || 0; tipoBruto = 'ring'; }
    else if (tipo === 'ring2') { fullItem = anelEquipado2; enc = fullItem?.enchant || fullItem?.enchantJewel || 0; tipoBruto = 'ring'; }

    if (!fullItem || (tipo === 'weapon' && (fullItem.nome === 'Treining Sword' || fullItem.base?.nome === 'Treining Sword'))) return;

    let itemBase = fullItem.base || fullItem;

    abrirModal('janela-item-acao', 2100); 
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO'; 
    document.getElementById('acao-img').src = itemBase.img; 
    
    let info = formatarTooltipEquipamento(itemBase, enc, aug, tipoBruto, fullItem);
    let descContainer = document.getElementById('acao-desc'); descContainer.innerHTML = info; descContainer.style.width = "100%";
    let btnAcao = document.getElementById('btn-acao-item'); btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.unequip') : 'UNEQUIP'; btnAcao.style.background = "#b91d1d"; btnAcao.style.display = "block";
    btnAcao.onclick = function() { 
        btnAcao.onclick = null; 
        InventoryManager.desequiparGarantido(tipo);
        fecharJanelaAcao();
    };

    // Botão para colocar no atalho (Adicionado para itens já equipados)
    let btnAtalho = document.createElement('button');
    btnAtalho.className = 'btn-l2';
    btnAtalho.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.pinToShortcut') : 'ASSIGN TO SHORTCUT';
    btnAtalho.style.background = "#ca8a04";
    btnAtalho.style.marginTop = "8px";
    btnAtalho.onclick = function() {
        fecharJanelaAcao();
        abrirSeletorAtalhoGlobal(itemBase.nome, (index) => {
            barraAtalhos[index] = itemBase.nome;
            let logLine = (typeof window.t === 'function')
                ? window.t('game.smartbar.itemPinnedToSlot', { item: itemBase.nome, slot: index + 1 })
                : (`${itemBase.nome} pinned to slot ${index + 1}!`);
            escreverLog(`<span style="color:#10b981;">${logLine}</span>`);
            renderizarBarraAtalhos(); if(typeof salvarJogo === 'function') salvarJogo();
        });
    };
    document.getElementById('btn-acao-item').parentElement.insertBefore(btnAtalho, document.getElementById('btn-acao-item').nextSibling);
}

function equiparDaBolsa(index) {
    InventoryManager.equiparGarantido(index);
    fecharJanelaAcao();
}

function desequiparItem(tipo) {
    InventoryManager.desequiparGarantido(tipo);
    fecharJanelaAcao();
}

// ==========================================
// RENDERIZAÇÃO DO PERFIL E STATUS DETALHADO
// ==========================================
function renderizarPerfil() {
    let classeLimpa = typeof charClass !== 'undefined' ? charClass.toLowerCase().trim() : '';
    let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;

    // Atualiza o título do perfil com o nome do personagem real
    const profileHeader = document.querySelector('#tela-perfil h4');
    if (profileHeader) {
        const tFn = typeof window.t === 'function' ? window.t : null;
        profileHeader.innerText = window.charName
            ? (tFn ? tFn('game.inventoryUi.profileWithName', { name: window.charName.toUpperCase() }) : `${window.charName.toUpperCase()} - PROFILE`)
            : (tFn ? tFn('game.inventoryUi.profileGeneric') : 'CHARACTER PROFILE');
    }

    if(document.getElementById('stat-class')) document.getElementById('stat-class').innerText = `${charRace} ${charClass}`; 
    
    // --- PAPERDOLL VISUAL COM 2 ANÉIS E 2 BRINCOS ---
    let slotWeapon = document.getElementById('slot-weapon');
    let fullWeapon = armaEquipadaBase;
    if (slotWeapon && fullWeapon) {
        let b = fullWeapon.base || fullWeapon;
        const imgStr = b.img && String(b.img).trim();
        const srcW = imgStr || (b.id ? `assets/equips/${b.id}.png` : '') || 'assets/armas/espada_inicial.png';
        slotWeapon.src = srcW;
        slotWeapon.onerror = function () { this.onerror = null; this.src = 'assets/armas/espada_inicial.png'; };
        slotWeapon.className = '';
        if (typeof isAugmented !== 'undefined' && isAugmented) slotWeapon.classList.add('augmented');
    }

    // Chama o motor de visual (layers/sprites) oficial
    if (typeof atualizarVisualPaperdoll === 'function') {
        atualizarVisualPaperdoll();
    }

    let slotArmor = document.getElementById('slot-armor-perfil');
    if (slotArmor) {
        let fullArm = armaduraEquipada;
        
        if (!fullArm) { 
            slotArmor.innerHTML = `<span class="paperdoll-slot-empty">${(typeof window.t === 'function') ? window.t('game.inventoryUi.slotArm') : 'ARM'}</span>`; 
            slotArmor.classList.remove('glow-blue', 'glow-red', 'glow-green', 'glow-yellow');
        } 
        else {
            let arm = fullArm.base || fullArm;
            const armImg = arm.img || (arm.id ? `assets/equips/${arm.id}.png` : '');
            const fallbackArmor = 'assets/icons/wooden_armor.png';
            
            slotArmor.innerHTML = `<img src="${armImg}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;">`;
            
            const im = slotArmor.querySelector('img');
            if (im) {
                im.onerror = function () {
                    this.onerror = null;
                    this.src = fallbackArmor;
                };
            }
            
            let currentEnchant = fullArm.enchant !== undefined ? fullArm.enchant : window.enchantArmor;
            let glow = typeof getGlowClass === 'function' ? getGlowClass(currentEnchant) : ''; 
            slotArmor.classList.remove('glow-blue', 'glow-red', 'glow-green', 'glow-yellow');
            if (currentEnchant > 0 && glow !== '') {
                slotArmor.classList.add(glow);
            }
        }
    }

    // Função auxiliar para as Joias com Fallback Blindado
    const preencherSlotJoia = (idSlot, fullItem, labelVazio, slotTipo, fallback) => {
        let slot = document.getElementById(idSlot);
        if (!slot) return;
        
        slot.onclick = () => abrirAcaoPerfil(slotTipo);
        
        if (fullItem) {
            let item = fullItem.base || fullItem;
            let imgSrc = item.img || fallback || 'assets/itens/item_generic.png';
            slot.innerHTML = `<img src="${imgSrc}" onerror="this.src='${fallback}'" style="width:100%; height:100%; object-fit:cover;" title="${item.nome}">`;
        } else {
            slot.innerHTML = `<span class="paperdoll-slot-empty">${labelVazio}</span>`;
        }
    };

    // Preenche as 5 caixinhas de joias com a nova função robusta
    const fallbackJoia = 'assets/itens/lifestone.png';
    const tInv = typeof window.t === 'function' ? window.t : null;
    const L = (k, fb) => tInv ? tInv(k) : fb;
    preencherSlotJoia('slot-neck-perfil', colarEquipado, L('game.inventoryUi.slotNeck', 'NECK'), 'neck', fallbackJoia);
    preencherSlotJoia('slot-ear1-perfil', brincoEquipado1, L('game.inventoryUi.slotEarL', 'EAR L'), 'ear1', fallbackJoia);
    preencherSlotJoia('slot-ear2-perfil', brincoEquipado2, L('game.inventoryUi.slotEarR', 'EAR R'), 'ear2', fallbackJoia);
    preencherSlotJoia('slot-ring1-perfil', anelEquipado1, L('game.inventoryUi.slotRingL', 'RING L'), 'ring1', fallbackJoia);
    preencherSlotJoia('slot-ring2-perfil', anelEquipado2, L('game.inventoryUi.slotRingR', 'RING R'), 'ring2', fallbackJoia);

    // ===============================================
    // ATUALIZAÇÃO DO STATUS DETALHADO (RESTAURADA E BLINDADA!)
    // ===============================================
    if (!document.getElementById('stat-hp')) return;

    let joiasAtivas = [
        colarEquipado,
        brincoEquipado1,
        brincoEquipado2,
        anelEquipado1,
        anelEquipado2
    ].filter(j => j !== null);

    let multEnchant = 1 + ((typeof enchantArmor !== 'undefined' ? enchantArmor : 0) * 0.10);
    let joiasPAtk = joiasAtivas.reduce((soma, j) => soma + (j.pAtk || 0), 0);
    let joiasMAtk = joiasAtivas.reduce((soma, j) => soma + (j.mAtk || 0), 0);
    let joiasBonusHp = Math.floor(joiasAtivas.reduce((soma, j) => soma + (j.bonusHp || 0), 0) * multEnchant);
    let joiasBonusMp = Math.floor(joiasAtivas.reduce((soma, j) => soma + (j.bonusMp || 0), 0) * multEnchant);
    let joiasBonusCrit = Math.floor(joiasAtivas.reduce((soma, j) => soma + (j.bonusCrit || 0), 0) * multEnchant);
    let joiasBonusSpd = Math.floor(joiasAtivas.reduce((soma, j) => soma + (j.bonusSpd || 0), 0) * multEnchant);
    let mdefJoias = Math.floor(joiasAtivas.reduce((soma, j) => soma + (j.mDef || 0), 0) * multEnchant);
    
    // Corrigindo a variável multEnchantArmor (deve ser multEnchant ou definida aqui)
    let multEnchantArmor = 1 + ((typeof enchantArmor !== 'undefined' ? enchantArmor : 0) * 0.10);
    
    let armBonus = {
        hp: Math.floor((armaduraEquipada?.bonusHp || 0) * multEnchantArmor), 
        mp: Math.floor((armaduraEquipada?.bonusMp || 0) * multEnchantArmor),
        patk: Math.floor((armaduraEquipada?.pAtk || 0) * multEnchantArmor), 
        matk: Math.floor((armaduraEquipada?.mAtk || 0) * multEnchantArmor),
        crit: Math.floor((armaduraEquipada?.bonusCrit || 0) * multEnchantArmor),
        spd: Math.floor((armaduraEquipada?.bonusSpd || 0) * multEnchantArmor)
    };
    
    let armaBonus = {
        hp: armaEquipadaBase?.bonusHp || 0,
        mp: armaEquipadaBase?.bonusMp || 0,
        crit: armaEquipadaBase?.bonusCrit || 0,
        spd: armaEquipadaBase?.bonusSpd || 0
    };

    // Leituras do Augment
    let augPAtk = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augPAtk) ? armaEquipadaBase.augPAtk : 0;
    let augMAtk = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augMAtk) ? armaEquipadaBase.augMAtk : 0;
    let augPDef = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augPDef) ? armaEquipadaBase.augPDef : 0;
    let augMDef = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augMDef) ? armaEquipadaBase.augMDef : 0;
    let augSpd  = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augSpd)  ? armaEquipadaBase.augSpd : 0;
    let augCrit = (typeof isAugmented !== 'undefined' && isAugmented && armaEquipadaBase && armaEquipadaBase.augCrit) ? armaEquipadaBase.augCrit : 0;

    const fmtFonte = (valor, label, cor) => valor > 0 ? ` <span style="color:${cor};">(+${valor} ${label})</span>` : '';

    // HP e MP
    document.getElementById('stat-hp').innerHTML = `${playerStats.maxHp}`
        + fmtFonte(armBonus.hp, 'Armadura', '#facc15')
        + fmtFonte(armaBonus.hp, 'Arma', '#ef4444')
        + fmtFonte(joiasBonusHp, 'Joias', '#a855f7');
    document.getElementById('stat-mp').innerHTML = `${playerStats.maxMp}`
        + fmtFonte(armBonus.mp, 'Armadura', '#facc15')
        + fmtFonte(armaBonus.mp, 'Arma', '#ef4444')
        + fmtFonte(joiasBonusMp, 'Joias', '#a855f7');

    // --- P.ATK RESTAURADO ---
    document.getElementById('stat-atk').innerText = playerStats.pAtk;
    if(document.getElementById('stat-base-raca')) document.getElementById('stat-base-raca').innerText = isMage ? (statusIniciais[charRace].danoFighter / 2) : statusIniciais[charRace].danoFighter;
    if(document.getElementById('stat-base-level-atk')) document.getElementById('stat-base-level-atk').innerText = "+" + ((nivel - 1) * 2);
    
    let baseAtkArma = armaEquipadaBase ? armaEquipadaBase.atk : 5;
    let bonusAtkEnchant = Math.floor(baseAtkArma * 0.10 * (typeof enchant !== 'undefined' ? enchant : 0));
    if(document.getElementById('stat-base-arma')) document.getElementById('stat-base-arma').innerText = (baseAtkArma + bonusAtkEnchant) + (augPAtk > 0 ? ` (+${augPAtk} Aug)` : "");

    if(document.getElementById('stat-base-armadura-atk')) {
        document.getElementById('stat-base-armadura-atk').innerHTML = armBonus.patk > 0 ? `+${armBonus.patk}` : "0";
        if (joiasPAtk > 0) document.getElementById('stat-base-armadura-atk').innerHTML += ` <span style="color:#a855f7; font-weight:bold;">(+${joiasPAtk} Joias)</span>`;
    }

    // --- M.ATK RESTAURADO ---
    if(document.getElementById('stat-matk')) {
        document.getElementById('stat-matk').innerText = playerStats.mAtk;
        if(document.getElementById('stat-base-matk-raca')) document.getElementById('stat-base-matk-raca').innerText = isMage ? statusIniciais[charRace].danoMage : (statusIniciais[charRace].danoMage / 2);
        if(document.getElementById('stat-base-level-matk')) document.getElementById('stat-base-level-matk').innerText = "+" + ((nivel - 1) * 3);
        
        let baseMAtkArma = armaEquipadaBase && armaEquipadaBase.matk ? armaEquipadaBase.matk : 5;
        let bonusMAtkEnchant = Math.floor(baseMAtkArma * 0.10 * (typeof enchant !== 'undefined' ? enchant : 0));
        if(document.getElementById('stat-base-marma')) document.getElementById('stat-base-marma').innerText = (baseMAtkArma + bonusMAtkEnchant) + (augMAtk > 0 ? ` (+${augMAtk} Aug)` : "");

        if(document.getElementById('stat-base-armadura-matk')) {
            document.getElementById('stat-base-armadura-matk').innerHTML = armBonus.matk > 0 ? `+${armBonus.matk}` : "0";
            if (joiasMAtk > 0) document.getElementById('stat-base-armadura-matk').innerHTML += ` <span style="color:#a855f7; font-weight:bold;">(+${joiasMAtk} Joias)</span>`;
        }
    }

    // --- DEFESAS RESTAURADAS ---
    let defArmaduraBase = armaduraEquipada ? (armaduraEquipada.pDef || armaduraEquipada.def || 0) : 0;
    let defArmaduraTotal = Math.floor(defArmaduraBase * multEnchant);
    let armBonusMDef = Math.floor((armaduraEquipada?.bonusMDef || 0) * multEnchant);

    document.getElementById('stat-def').innerText = playerStats.pDef;
    if(document.getElementById('stat-base-level-def')) document.getElementById('stat-base-level-def').innerText = "+" + ((nivel - 1) * 1);
    if(document.getElementById('stat-base-level-mdef')) document.getElementById('stat-base-level-mdef').innerText = "+" + ((nivel - 1) * 1.5);
    if(document.getElementById('stat-base-armadura')) {
        let txtPDefArmor = defArmaduraTotal > 0 ? `+${defArmaduraTotal}` : "0";
        if (augPDef > 0) txtPDefArmor += ` <span style="color:#22c55e;">(+${augPDef} Aug)</span>`;
        document.getElementById('stat-base-armadura').innerHTML = txtPDefArmor;
    }

    if(document.getElementById('stat-mdef')) document.getElementById('stat-mdef').innerText = playerStats.mDef;
    if(document.getElementById('stat-base-joias')) document.getElementById('stat-base-joias').innerText = mdefJoias;
    if(document.getElementById('stat-base-armadura-mdef')) {
        let txtMDefArmor = armBonusMDef > 0 ? `+${armBonusMDef}` : "0";
        if (augMDef > 0) txtMDefArmor += ` <span style="color:#22c55e;">(+${augMDef} Aug)</span>`;
        document.getElementById('stat-base-armadura-mdef').innerHTML = txtMDefArmor;
    }

    // Multiplicadores (classe e buffs) para auditoria visual real
    let modClasse = (typeof classModifiers !== 'undefined' && classModifiers[charClass]) ? classModifiers[charClass] : { atk: 1, def: 1 };
    let multBuffAtk = (typeof buffsAtivos !== 'undefined' && buffsAtivos) ? (buffsAtivos.pAtkMult || 1) : 1;
    let multBuffMAtk = (typeof buffsAtivos !== 'undefined' && buffsAtivos) ? (buffsAtivos.mAtkMult || 1) : 1;
    let multBuffDef = (typeof buffsAtivos !== 'undefined' && buffsAtivos) ? (buffsAtivos.pDefMult || 1) : 1;
    let multBuffMDef = (typeof buffsAtivos !== 'undefined' && buffsAtivos) ? (buffsAtivos.mDefMult || 1) : 1;

    if (document.getElementById('stat-mult-classe-atk')) document.getElementById('stat-mult-classe-atk').innerText = `x${(modClasse.atk || 1).toFixed(2)}`;
    if (document.getElementById('stat-mult-buff-atk')) document.getElementById('stat-mult-buff-atk').innerText = `x${multBuffAtk.toFixed(2)}`;
    if (document.getElementById('stat-mult-classe-matk')) document.getElementById('stat-mult-classe-matk').innerText = `x${(modClasse.atk || 1).toFixed(2)}`;
    if (document.getElementById('stat-mult-buff-matk')) document.getElementById('stat-mult-buff-matk').innerText = `x${multBuffMAtk.toFixed(2)}`;
    if (document.getElementById('stat-mult-classe-def')) document.getElementById('stat-mult-classe-def').innerText = `x${(modClasse.def || 1).toFixed(2)}`;
    if (document.getElementById('stat-mult-buff-def')) document.getElementById('stat-mult-buff-def').innerText = `x${multBuffDef.toFixed(2)}`;
    if (document.getElementById('stat-mult-classe-mdef')) document.getElementById('stat-mult-classe-mdef').innerText = `x${(modClasse.def || 1).toFixed(2)}`;
    if (document.getElementById('stat-mult-buff-mdef')) document.getElementById('stat-mult-buff-mdef').innerText = `x${multBuffMDef.toFixed(2)}`;

    // --- VELOCIDADE E CRÍTICO ---
    let txtCrit = `${playerStats.critRate}%`;
    if (augCrit > 0) txtCrit += ` <span style="color:#22c55e;">(+${augCrit}% Aug)</span>`;
    if (armaBonus.crit > 0) txtCrit += ` <span style="color:#ef4444;">(+${armaBonus.crit}% Arma)</span>`;
    if (armBonus.crit > 0) txtCrit += ` <span style="color:#facc15;">(+${armBonus.crit}% Armadura)</span>`;
    if (joiasBonusCrit > 0) txtCrit += ` <span style="color:#a855f7;">(+${joiasBonusCrit}% Joias)</span>`;
    document.getElementById('stat-crit').innerHTML = txtCrit; 
    
    let txtSpd = `${(playerStats.atkSpeed / 1000).toFixed(2)}s`; 
    if (augSpd > 0) txtSpd += ` <span style="color:#22c55e;">(-${augSpd}ms Aug)</span>`;
    if (armaBonus.spd > 0) txtSpd += ` <span style="color:#ef4444;">(-${armaBonus.spd}ms Arma)</span>`;
    if (armBonus.spd > 0) txtSpd += ` <span style="color:#facc15;">(-${armBonus.spd}ms Armadura)</span>`;
    if (joiasBonusSpd > 0) txtSpd += ` <span style="color:#a855f7;">(-${joiasBonusSpd}ms Joias)</span>`;
    document.getElementById('stat-spd').innerHTML = txtSpd; 
}

function abrirStatusDetalhado() { abrirModal('janela-status-detalhado', 1600); }
function fecharStatusDetalhado() { fecharModal('janela-status-detalhado'); }

// === EQUIP LOGIC SEGURA ===
function equiparItemSeguro(indexNaBolsa) {
    let itemNovo = inventarioEquips[indexNaBolsa]; if (!itemNovo) return;
    let slot = itemNovo.tipoItem || itemNovo.tipo;
    if (['weapon', 'arma', 'armor', 'armadura', 'neck', 'ear', 'ring'].includes(slot)) {
        let val = typeof validarEquipPorGrade === 'function' ? validarEquipPorGrade(itemNovo) : { permitido: true };
        if (!val.permitido) { 
            if (typeof abrirJanelaBloqueioGrade === 'function') abrirJanelaBloqueioGrade(itemNovo, val.nivelMinimo, val.grade); 
            else if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.inventory.levelRequired', { level: val.nivelMinimo }) : `Level ${val.nivelMinimo} required.`); 
            return; 
        }
    }
    let itemAntigoRemovido = null;
    if (slot === 'weapon' || slot === 'arma') { if (armaEquipadaBase && armaEquipadaBase.nome !== 'Treining Sword') itemAntigoRemovido = armaEquipadaBase; armaEquipadaBase = itemNovo; } 
    else if (slot === 'armor' || slot === 'armadura') { if (armaduraEquipada) itemAntigoRemovido = armaduraEquipada; armaduraEquipada = itemNovo; }
    else if (slot === 'neck') { if (typeof colarEquipado !== 'undefined' && colarEquipado) itemAntigoRemovido = colarEquipado; itemNovo.enchantJewel = itemNovo.enchantJewel || 0; colarEquipado = itemNovo; }
    else if (slot === 'ear') { itemNovo.enchantJewel = itemNovo.enchantJewel || 0; if (!brincoEquipado1) brincoEquipado1 = itemNovo; else if (!brincoEquipado2) brincoEquipado2 = itemNovo; else { itemAntigoRemovido = brincoEquipado1; brincoEquipado1 = itemNovo; } }
    else if (slot === 'ring') { itemNovo.enchantJewel = itemNovo.enchantJewel || 0; if (!anelEquipado1) anelEquipado1 = itemNovo; else if (!anelEquipado2) anelEquipado2 = itemNovo; else { itemAntigoRemovido = anelEquipado1; anelEquipado1 = itemNovo; } } 
    else { return; }
    inventarioEquips.splice(indexNaBolsa, 1);
    if (itemAntigoRemovido) { 
        InventoryManager.adicionarEquipamento(itemAntigoRemovido); 
        escreverLog(`<span style="color:#aaa;">Guardou ${itemAntigoRemovido.nome}.</span>`); 
    }
    escreverLog(`<span style="color:#facc15; font-weight:bold;">Equipou ${itemNovo.nome}.</span>`);
    if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais(); 
    if (typeof atualizar === 'function') atualizar(); 
    if (typeof salvarJogo === 'function') salvarJogo();
}
