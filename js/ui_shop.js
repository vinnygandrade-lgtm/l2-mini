// ==========================================
// UI - SHOP (LOJAS DE COMPRA E VENDA)
// ==========================================

function shopT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

function shopPlayerLevel() {
    const n = typeof window.nivel !== 'undefined' ? window.nivel : 1;
    const parsed = parseInt(n, 10);
    return Math.max(1, Math.min(85, Number.isFinite(parsed) ? parsed : 1));
}

/** Preço unitário (Grocer + mega-shop NPC) — alinha cliente offline ao EconomyBalance e à RPC npc_shop_buy_stackable. */
function effectiveShopUnitForCatalogItem(item) {
    if (!item) return 0;
    const base = Math.max(0, Number(item.preco) || 0);
    if (base <= 0) return 0;
    const EB = window.EconomyBalance;
    if (EB && typeof EB.effectiveShopUnitPrice === 'function') {
        return EB.effectiveShopUnitPrice(base, shopPlayerLevel());
    }
    return base;
}

let qtdCompraSelecionada = 1;
let itemSelecionado = null; 

function fecharLoja() { 
    document.getElementById('janela-loja').style.display = 'none'; 
    if(document.getElementById('compra-qtd-container')) document.getElementById('compra-qtd-container').style.display = 'none';
    document.getElementById('btn-comprar-item').onclick = null; 
    
    // Esconde as abas quando fecha a janela
    let abas = document.getElementById('store-tabs');
    if(abas) abas.style.display = 'none';
    
    toggleModalBackdrop('janela-loja', false);
}

// Nova função de feedback visual para o botão!
function animarBotaoCompra() {
    let btn = document.getElementById('btn-comprar-item');
    if(!btn) return;
    const flash = shopT('game.shop.bagFlash');
    let txtOriginal = shopT('game.shop.buyItemButton');
    btn.innerText = flash;
    btn.style.background = "#10b981";
    setTimeout(() => {
        if(btn.innerText === flash) {
            btn.innerText = txtOriginal;
            btn.style.background = "#15803d";
        }
    }, 1000); // 1 segundo de feedback visual
}

function abrirLojaGrocer(categoria) { 
    const grid = document.getElementById('loja-itens'); grid.innerHTML = ''; 
    let itens = (categoria === 'consumables') ? catalogoConsumiveis : catalogoScrolls; 
    itens.forEach(item => { grid.innerHTML += `<div class="store-item-slot" onclick="selecionarConsumivel('${item.id}', '${categoria}', this)"><img src="${item.img}" title="${item.nome}"></div>`; }); 
    document.querySelector('#janela-loja .store-header span').innerText = (categoria === 'consumables') ? shopT('game.shop.consumablesTitle') : shopT('game.shop.scrollsTitle'); 
    document.getElementById('detalhe-texto').innerHTML = shopT('game.shop.selectItemHint'); 
    if(document.getElementById('compra-qtd-container')) document.getElementById('compra-qtd-container').style.display = 'none';
    document.getElementById('btn-comprar-item').style.display = 'none'; 
    itemSelecionado = null; 
    
    // Garante que as abas de equipamento não apareçam na loja do Grocer
    let abas = document.getElementById('store-tabs');
    if(abas) abas.style.display = 'none';

    abrirModal('janela-loja', 1500); 
}

function selecionarConsumivel(id, categoria, elemento) {
    // Adiciona feedback visual de seleção
    document.querySelectorAll('#loja-itens .store-item-slot').forEach(s => s.classList.remove('selected-slot'));
    if(elemento) elemento.classList.add('selected-slot');

    let btnBuy = document.getElementById('btn-comprar-item'); 
    let qtdContainer = document.getElementById('compra-qtd-container');
    let catalogo = (categoria === 'consumables') ? catalogoConsumiveis : catalogoScrolls;
    itemSelecionado = catalogo.find(i => i.id === id); 
    if(!itemSelecionado) return;

    // Detecta a moeda do item (Adena 'a' ou Ancient Coin 'ac')
    let siglaMoeda = itemSelecionado.moeda === 'Ancient' ? 'ac' : 'a';
    let corMoeda = itemSelecionado.moeda === 'Ancient' ? '#60a5fa' : '#ffcc00';
    const unitEff = effectiveShopUnitForCatalogItem(itemSelecionado);

    document.getElementById('detalhe-texto').innerHTML = `
        <b style="color:white">${itemSelecionado.nome}</b><br><br>
        ${itemSelecionado.desc}<br>
        ${shopT('game.shop.labelPrice')} <span style="color:${corMoeda}">${unitEff}${siglaMoeda}</span> ${shopT('game.shop.eachLabel')}<br><br>
        ${shopT('game.shop.totalLabel')}: <span id="compra-total-preco" style="color:#00ff00">${unitEff}${siglaMoeda}</span>
    `; 
    
    if(qtdContainer) qtdContainer.style.display = 'flex'; 
    document.getElementById('input-qtd-compra').value = 1; qtdCompraSelecionada = 1;
    btnBuy.innerText = shopT('game.shop.buyItemButton'); btnBuy.style.display = 'block';
    
    btnBuy.onclick = function() { confirmarCompraMultipla(categoria); };
}

function alterarQtdCompra(delta) { 
    if(!itemSelecionado) return; 
    let atual = parseInt(document.getElementById('input-qtd-compra').value); 
    if (isNaN(atual)) atual = 0; 
    let novo = atual + delta; if(novo < 1) novo = 1; 
    document.getElementById('input-qtd-compra').value = novo; atualizarPrecoTotalCompra(); 
}

// DICA: Ajuste também o botão MAX no ui_shop.js
function setQtdCompraMax() { 
    if(!itemSelecionado) return; 
    let saldoDisponivel = (itemSelecionado.moeda === 'Ancient') ? ancientCoins : adenas;
    const unitEff = effectiveShopUnitForCatalogItem(itemSelecionado);
    if (unitEff <= 0) return;
    let max = Math.floor(saldoDisponivel / unitEff); 
    if(max < 1) max = 1; 
    document.getElementById('input-qtd-compra').value = max; 
    atualizarPrecoTotalCompra(); 
}

function atualizarPrecoTotalCompra() { 
    if(!itemSelecionado) return; 
    let inputEl = document.getElementById('input-qtd-compra'); 
    let val = parseInt(inputEl.value); 
    if (isNaN(val) || val < 1) val = 1; 
    qtdCompraSelecionada = val; 
    const unitEff = effectiveShopUnitForCatalogItem(itemSelecionado);
    let total = unitEff * qtdCompraSelecionada; 
    let spanTotal = document.getElementById('compra-total-preco');
    
    // Define qual saldo checar: Adena ou Ancient
    let saldoDisponivel = (itemSelecionado.moeda === 'Ancient') ? ancientCoins : adenas;
    let sigla = (itemSelecionado.moeda === 'Ancient') ? 'ac' : 'a';

    if(spanTotal) {
        spanTotal.innerText = total + sigla; 
        spanTotal.style.color = (saldoDisponivel >= total) ? "#00ff00" : "#ef4444"; 
    }
}

function confirmarCompraMultipla(categoria) {
    if (!itemSelecionado) return;
    const unitEff = effectiveShopUnitForCatalogItem(itemSelecionado);
    let total = unitEff * qtdCompraSelecionada;
    
    let carteira = itemSelecionado.moeda === 'Ancient' ? ancientCoins : adenas;
    let nomeMoeda = itemSelecionado.moeda === 'Ancient' ? shopT('game.shop.currencyAncientCoins') : shopT('game.shop.currencyAdenasShort');

    const cloudShop = window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled &&
        window.SupabaseAPI && typeof window.SupabaseAPI.getUser === 'function' && window.SupabaseAPI.getUser() &&
        typeof window.charName === 'string' && window.charName;

    if (cloudShop) {
        void (async () => {
            const { data, error } = await window.SupabaseAPI.npcShopBuyStackable(
                window.charName,
                itemSelecionado.id,
                qtdCompraSelecionada
            );
            if (error || !data || data.ok !== true) {
                const code = data && data.error;
                if (code === 'insufficient_funds') {
                    mostrarAviso(shopT('game.shop.insufficientCurrency', { currency: nomeMoeda }));
                } else {
                    mostrarAviso(typeof window.t === 'function'
                        ? window.t('game.cloud.shopStackableFailed')
                        : 'Purchase failed. Check connection or sync your character.');
                }
                return;
            }
            window.adenas = typeof data.adenas === 'number' ? data.adenas : parseInt(data.adenas, 10) || 0;
            window.ancientCoins = typeof data.ancient_coins === 'number' ? data.ancient_coins : parseInt(data.ancient_coins, 10) || 0;
            if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();
            const inm = data.item_name || itemSelecionado.nome;
            const qAfter = typeof data.qty_after === 'number' ? data.qty_after : parseInt(data.qty_after, 10);
            if (inm && !Number.isNaN(qAfter)) {
                inventario[inm] = qAfter;
            }
            tocarSom('adenas');
            escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logBoughtMats', { qtd: qtdCompraSelecionada, name: itemSelecionado.nome }) + '</span>');
            atualizar();
            salvarJogo();
            animarBotaoCompra();
            atualizarPrecoTotalCompra();
        })();
        return;
    }

    if (carteira >= total) {
        if (itemSelecionado.moeda === 'Ancient') ancientCoins -= total;
        else adenas -= total;

        tocarSom('adenas');
        if(inventario[itemSelecionado.nome]) inventario[itemSelecionado.nome] += qtdCompraSelecionada;
        else inventario[itemSelecionado.nome] = qtdCompraSelecionada;
        
        escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logBoughtMats', { qtd: qtdCompraSelecionada, name: itemSelecionado.nome }) + '</span>');
        atualizar(); salvarJogo();
        animarBotaoCompra();
        atualizarPrecoTotalCompra();
    } else {
        mostrarAviso(shopT('game.shop.insufficientCurrency', { currency: nomeMoeda }));
    }
}

// ==========================================
// MEGA LOJA DE EQUIPAMENTOS (ABAS DINÂMICAS)
// ==========================================
let lojaGradeAtual = 'No-Grade';

function mostrarGradesEquipment() { 
    document.getElementById('menu-equipment').style.display = 'none'; 
    document.getElementById('menu-equipment-grades').style.display = 'flex'; 
}

function voltarMenuEquipment() { 
    document.getElementById('menu-equipment-grades').style.display = 'none'; 
    document.getElementById('menu-equipment').style.display = 'flex'; 
}

function abrirMegaLoja(grade) {
    lojaGradeAtual = grade;
    document.getElementById('titulo-loja-span').innerText = shopT('game.shop.equipmentsTitle', { grade: grade });
    document.getElementById('store-tabs').style.display = 'flex'; // Exibe as abas no topo
    mudarAbaLoja('weapon'); // Abre a aba de armas como padrão
    abrirModal('janela-loja', 1500);
}

function mudarAbaLoja(tipo) {
    // Muda a cor das abas para mostrar qual está ativa
    document.getElementById('tab-weapon').style.background = (tipo === 'weapon') ? '#1d4ed8' : '#222';
    document.getElementById('tab-armor').style.background = (tipo === 'armor') ? '#1d4ed8' : '#222';
    document.getElementById('tab-jewel').style.background = (tipo === 'jewel') ? '#1d4ed8' : '#222';

    const grid = document.getElementById('loja-itens');
    grid.innerHTML = '';
    
    // Seleciona o catálogo correto com base na aba clicada
    let catalogo = [];
    if (tipo === 'weapon') catalogo = catalogoArmas;
    else if (tipo === 'armor') catalogo = catalogoArmaduras;
    else if (tipo === 'jewel') catalogo = catalogoJoias;

    // 🛡️ TRAVA DE MERCADO AQUI: Filtra pela Grade *E* exige que o Preço seja maior que 0!
    let itensFiltrados = catalogo.filter(item => item.grade === lojaGradeAtual && item.preco > 0);
    
    if (itensFiltrados.length === 0) {
        grid.innerHTML = '<span style="color:#aaa; font-size:0.8em; grid-column: span 4; text-align:center; padding-top: 10px;">' + shopT('game.shop.comingSoon') + '</span>';
    } else {
        itensFiltrados.forEach(item => {
            grid.innerHTML += `<div class="store-item-slot" onclick="selecionarItemLoja('${item.id}', '${tipo}', this)"><img src="${item.img}" title="${item.nome}"></div>`;
        });
    }

    document.getElementById('detalhe-texto').innerHTML = shopT('game.shop.selectItemHint');
    document.getElementById('btn-comprar-item').style.display = 'none';
    if(document.getElementById('compra-qtd-container')) document.getElementById('compra-qtd-container').style.display = 'none';
    itemSelecionado = null;
}

function selecionarItemLoja(id, tipo, elemento) { 
    // Feedback visual
    document.querySelectorAll('#loja-itens .store-item-slot').forEach(s => s.classList.remove('selected-slot'));
    if(elemento) elemento.classList.add('selected-slot');

    let btnBuy = document.getElementById('btn-comprar-item'); 
    let qtdContainer = document.getElementById('compra-qtd-container');
    if(qtdContainer) qtdContainer.style.display = 'none'; 
    
    if (tipo === 'armor') { 
        itemSelecionado = catalogoArmaduras.find(i => i.id === id); 
        let infoExtra = "";
        let pDefValor = itemSelecionado.pDef || itemSelecionado.def || 0;
        let reqLinha = '';
        if (typeof validarEquipPorGrade === 'function') {
            let vReq = validarEquipPorGrade(itemSelecionado);
            let corReq = vReq.permitido ? '#22c55e' : '#ef4444';
            reqLinha = `<br>${shopT('game.shop.labelReqLevel')} <span style="color:${corReq}; font-weight:bold;">${vReq.nivelMinimo}</span> <span style="color:#94a3b8;">${shopT('game.shop.youLevelHint', { level: vReq.nivelAtual })}</span>`;
        }
        
        // Lê o tipo de armadura e dá uma cor
        let corTipo = itemSelecionado.tipo === 'Heavy' ? '#ef4444' : (itemSelecionado.tipo === 'Light' ? '#10b981' : '#3b82f6');
        let tipoTxt = itemSelecionado.tipo ? `<br>${shopT('game.shop.labelType')} <span style="color:${corTipo}; font-weight:bold;">${itemSelecionado.tipo}</span>` : '';
        
        // Verifica e adiciona os bônus ocultos que criamos
        if (itemSelecionado.bonusHp) infoExtra += `<br>${shopT('game.shop.labelMaxHp')} <span style="color:#10b981">+${itemSelecionado.bonusHp}</span>`;
        if (itemSelecionado.bonusMp) infoExtra += `<br>${shopT('game.shop.labelMaxMp')} <span style="color:#3b82f6">+${itemSelecionado.bonusMp}</span>`;
        if (itemSelecionado.bonusSpd) infoExtra += `<br>${shopT('game.shop.labelAtkSpeed')} <span style="color:#fcd34d">${shopT('game.shop.atkSpeedFast', { n: itemSelecionado.bonusSpd })}</span>`;
        if (itemSelecionado.bonusCrit) infoExtra += `<br>${shopT('game.shop.labelCritRate')} <span style="color:#ef4444">+${itemSelecionado.bonusCrit}%</span>`;
        if (itemSelecionado.bonusMDef) infoExtra += `<br>${shopT('game.shop.labelMDefBonus')} <span style="color:#a855f7">+${itemSelecionado.bonusMDef}</span>`;
        if (itemSelecionado.desc) infoExtra += `<br><br><span style="color:#c4b5fd; font-style:italic;">"${itemSelecionado.desc}"</span>`;
        const precoEquip = effectiveShopUnitForCatalogItem(itemSelecionado);
        document.getElementById('detalhe-texto').innerHTML = `<b style="color:white; font-size:1.1em;">${itemSelecionado.nome}</b><br><br>${shopT('game.shop.labelGrade')} <span style="color:#60a5fa">[${itemSelecionado.grade}]</span>${tipoTxt}${reqLinha}<br>${shopT('game.shop.labelPDef')} <span style="color:#fde047">+${pDefValor}</span>${infoExtra}<br><br><hr style="border:0.5px solid #444; margin:5px 0;">${shopT('game.shop.labelPrice')} <span style="color:#ffcc00">${precoEquip}a</span>`; 
        btnBuy.onclick = function() { confirmarCompraArmor(); }; 
    } 
    else if (tipo === 'weapon') { 
        itemSelecionado = catalogoArmas.find(i => i.id === id); 
        let infoExtra = "";
        let tipoArma = itemSelecionado.tipo ? `<br>${shopT('game.shop.labelType')} <span style="color:#f59e0b; font-weight:bold;">${itemSelecionado.tipo}</span>` : '';
        let reqLinha = '';
        if (typeof validarEquipPorGrade === 'function') {
            let vReq = validarEquipPorGrade(itemSelecionado);
            let corReq = vReq.permitido ? '#22c55e' : '#ef4444';
            reqLinha = `<br>${shopT('game.shop.labelReqLevel')} <span style="color:${corReq}; font-weight:bold;">${vReq.nivelMinimo}</span> <span style="color:#94a3b8;">${shopT('game.shop.youLevelHint', { level: vReq.nivelAtual })}</span>`;
        }
        
        // Adiciona o M.Atk para os magos conseguirem comprar cajados direito
        if (itemSelecionado.matk) infoExtra += `<br>${shopT('game.shop.labelMAtkBase')} <span style="color:#3b82f6">+${itemSelecionado.matk}</span>`;
        if (itemSelecionado.bonusHp) infoExtra += `<br>${shopT('game.shop.labelMaxHp')} <span style="color:#10b981">+${itemSelecionado.bonusHp}</span>`;
        if (itemSelecionado.bonusMp) infoExtra += `<br>${shopT('game.shop.labelMaxMp')} <span style="color:#60a5fa">+${itemSelecionado.bonusMp}</span>`;
        if (itemSelecionado.bonusSpd) infoExtra += `<br>${shopT('game.shop.labelAtkSpeed')} <span style="color:#fcd34d">${shopT('game.shop.atkSpeedFast', { n: itemSelecionado.bonusSpd })}</span>`;
        if (itemSelecionado.bonusCrit) infoExtra += `<br>${shopT('game.shop.labelCritRate')} <span style="color:#ef4444">+${itemSelecionado.bonusCrit}%</span>`;
        if (itemSelecionado.desc) infoExtra += `<br><br><span style="color:#c4b5fd; font-style:italic;">"${itemSelecionado.desc}"</span>`;
        const precoW = effectiveShopUnitForCatalogItem(itemSelecionado);
        document.getElementById('detalhe-texto').innerHTML = `<b style="color:white; font-size:1.1em;">${itemSelecionado.nome}</b><br><br>${shopT('game.shop.labelGrade')} <span style="color:#60a5fa">[${itemSelecionado.grade}]</span>${tipoArma}${reqLinha}<br>${shopT('game.shop.labelPAtkBase')} <span style="color:#ef4444">+${itemSelecionado.atk}</span>${infoExtra}<br><br><hr style="border:0.5px solid #444; margin:5px 0;">${shopT('game.shop.labelPrice')} <span style="color:#ffcc00">${precoW}a</span>`; 
        btnBuy.onclick = function() { confirmarCompraWeapon(); }; 
    }
    else if (tipo === 'jewel') {
        itemSelecionado = catalogoJoias.find(i => i.id === id);
        let infoJoia = '';
        let reqLinha = '';
        if (typeof validarEquipPorGrade === 'function') {
            let vReq = validarEquipPorGrade(itemSelecionado);
            let corReq = vReq.permitido ? '#22c55e' : '#ef4444';
            reqLinha = `<br>${shopT('game.shop.labelReqLevel')} <span style="color:${corReq}; font-weight:bold;">${vReq.nivelMinimo}</span> <span style="color:#94a3b8;">${shopT('game.shop.youLevelHint', { level: vReq.nivelAtual })}</span>`;
        }
        if (itemSelecionado.bonusHp) infoJoia += `<br>${shopT('game.shop.labelMaxHp')} <span style="color:#10b981">+${itemSelecionado.bonusHp}</span>`;
        if (itemSelecionado.bonusMp) infoJoia += `<br>${shopT('game.shop.labelMaxMp')} <span style="color:#60a5fa">+${itemSelecionado.bonusMp}</span>`;
        if (itemSelecionado.bonusSpd) infoJoia += `<br>${shopT('game.shop.labelAtkSpeed')} <span style="color:#fcd34d">${shopT('game.shop.atkSpeedFast', { n: itemSelecionado.bonusSpd })}</span>`;
        if (itemSelecionado.bonusCrit) infoJoia += `<br>${shopT('game.shop.labelCritRate')} <span style="color:#ef4444">+${itemSelecionado.bonusCrit}%</span>`;
        if (itemSelecionado.pAtk) infoJoia += `<br>${shopT('game.shop.labelPAtk')} <span style="color:#ef4444">+${itemSelecionado.pAtk}</span>`;
        if (itemSelecionado.mAtk) infoJoia += `<br>${shopT('game.shop.labelMAtk')} <span style="color:#3b82f6">+${itemSelecionado.mAtk}</span>`;
        if (itemSelecionado.desc) infoJoia += `<br><br><span style="color:#c4b5fd; font-style:italic;">"${itemSelecionado.desc}"</span>`;
        const precoJ = effectiveShopUnitForCatalogItem(itemSelecionado);
        document.getElementById('detalhe-texto').innerHTML = `<b style="color:white; font-size:1.1em;">${itemSelecionado.nome}</b><br><br>${shopT('game.shop.labelType')} <span style="color:#a855f7; text-transform:capitalize;">${itemSelecionado.tipoItem}</span><br>${shopT('game.shop.labelGrade')} <span style="color:#60a5fa">[${itemSelecionado.grade}]</span>${reqLinha}<br>${shopT('game.shop.labelMDef')} <span style="color:#a855f7">+${itemSelecionado.mDef}</span>${infoJoia}<br><br><hr style="border:0.5px solid #444; margin:5px 0;">${shopT('game.shop.labelPrice')} <span style="color:#ffcc00">${precoJ}a</span>`; 
        btnBuy.onclick = function() { confirmarCompraJewel(); };
    }
    
    btnBuy.style.display = 'block'; btnBuy.innerText = shopT('game.shop.buyItemButton'); btnBuy.disabled = false; btnBuy.style.background = "#15803d"; 
}

function confirmarCompraArmor() { 
    if (!itemSelecionado) return; 
    const preco = effectiveShopUnitForCatalogItem(itemSelecionado);
    if (adenas >= preco) { 
        adenas -= preco; tocarSom('adenas');
        InventoryManager.adicionarEquipamento({ tipo: 'armor', base: itemSelecionado, enchant: 0, origin: 'Shop' }); 
        escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logBoughtEquip', { name: itemSelecionado.nome }) + '</span>');
        calcularStatusGlobais(); atualizar(); salvarJogo(); 
        animarBotaoCompra();
    } else {
        mostrarAviso(shopT('game.shop.insufficientAdena')); 
    }
}

function confirmarCompraWeapon() { 
    if (!itemSelecionado) return; 
    const preco = effectiveShopUnitForCatalogItem(itemSelecionado);
    if (adenas >= preco) { 
        adenas -= preco; tocarSom('adenas');
        InventoryManager.adicionarEquipamento({ tipo: 'weapon', base: itemSelecionado, enchant: 0, augmented: false, origin: 'Shop' }); 
        escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logBoughtEquip', { name: itemSelecionado.nome }) + '</span>');
        calcularStatusGlobais(); atualizar(); salvarJogo(); 
        animarBotaoCompra();
    } else {
        mostrarAviso(shopT('game.shop.insufficientAdena')); 
    }
}

function confirmarCompraJewel() { 
    if (!itemSelecionado) return; 
    const preco = effectiveShopUnitForCatalogItem(itemSelecionado);
    if (adenas >= preco) { 
        adenas -= preco; tocarSom('adenas');
        InventoryManager.adicionarEquipamento({ tipo: 'jewel', base: itemSelecionado, enchant: 0, origin: 'Shop' }); 
        escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logBoughtEquip', { name: itemSelecionado.nome }) + '</span>');
        calcularStatusGlobais(); atualizar(); salvarJogo(); 
        animarBotaoCompra();
    } else {
        mostrarAviso(shopT('game.shop.insufficientAdena')); 
    }
}

// === SISTEMA DE VENDA ===
let itemParaVender = null; let qtdVendaSelecionada = 1;
function fecharVenda() { 
    document.getElementById('janela-venda').style.display = 'none'; 
    if(document.getElementById('venda-qtd-container')) document.getElementById('venda-qtd-container').style.display = 'none'; 
    document.getElementById('btn-vender-item').onclick = null; 
    toggleModalBackdrop('janela-venda', false);
}
function abrirLojaVenda() { 
    const grid = document.getElementById('venda-itens'); 
    grid.innerHTML = ''; 
    var kMoedaAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    var kMoedaAc = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';
    let nomesDosItens = Object.keys(inventario).filter(function (nome) { return nome !== kMoedaAd && nome !== kMoedaAc; });
    if (nomesDosItens.length === 0) { 
        grid.innerHTML = '<span style="color:#aaa; font-size:0.8em; grid-column: span 4; text-align:center; padding-top: 10px;">' + shopT('game.shop.bagEmpty') + '</span>'; 
    } else { 
        nomesDosItens.forEach(nome => { 
            let qtd = inventario[nome]; 
            // Tenta encontrar o ícone no banco de dados para ficar bonito na venda
            let itemData = catalogoMateriais.find(m => m.nome === nome) || 
                           catalogoConsumiveis.find(c => c.nome === nome) || 
                           catalogoScrolls.find(s => s.nome === nome);
            
            let imgHtml = itemData ? `<img src="${itemData.img}" style="width:70%; height:70%; object-fit:contain; margin-bottom: 8px;">` : `<span style="font-size: 8px; color:#ddd; text-align:center; padding: 2px;">${nome}</span>`;
            
            grid.innerHTML += `<div class="store-item-slot" onclick="selecionarItemVenda('${nome}', this)" style="position:relative; flex-direction:column;">
                ${imgHtml}
                <div class="inv-qtd">${qtd}</div>
            </div>`; 
        }); 
    } 
    abrirModal('janela-venda', 1500); 
    document.getElementById('venda-detalhe-texto').innerHTML = shopT('game.shop.selectItemToSell'); 
    document.getElementById('btn-vender-item').style.display = 'none'; 
    if(document.getElementById('venda-qtd-container')) document.getElementById('venda-qtd-container').style.display = 'none'; 
    itemParaVender = null; 
}
function selecionarItemVenda(nome, elemento) { 
    // Feedback visual
    document.querySelectorAll('#venda-itens .store-item-slot').forEach(s => s.classList.remove('selected-slot'));
    if(elemento) elemento.classList.add('selected-slot');

    itemParaVender = nome; let qtd = inventario[nome]; let precoUnitario = precosVenda[nome] || 5; qtdVendaSelecionada = 1; document.getElementById('venda-detalhe-texto').innerHTML = `<b style="color:white">${nome}</b><br><br>${shopT('game.shop.ownedLabel')} ${qtd}<br>${shopT('game.shop.sellPriceLabel')} <span style="color:#ffcc00">${precoUnitario}a</span> ${shopT('game.shop.eachLabel')}<br><br>${shopT('game.shop.totalLabel')}: <span id="venda-total-preco" style="color:#00ff00">${precoUnitario}a</span>`; if(document.getElementById('venda-qtd-container')) document.getElementById('venda-qtd-container').style.display = 'flex'; let inputQtd = document.getElementById('input-qtd-venda'); if(inputQtd) { inputQtd.value = qtdVendaSelecionada; inputQtd.max = qtd; inputQtd.oninput = function() { atualizarPrecoTotalVenda(); }; } let btnVender = document.getElementById('btn-vender-item'); btnVender.onclick = function() { confirmarVenda(); }; btnVender.style.display = 'block'; }
function alterarQtdVenda(delta) { if(!itemParaVender) return; let max = inventario[itemParaVender]; let inputEl = document.getElementById('input-qtd-venda'); if(!inputEl) return; let atual = parseInt(inputEl.value); if (isNaN(atual)) atual = 0; let novo = atual + delta; if(novo < 1) novo = 1; if(novo > max) novo = max; inputEl.value = novo; atualizarPrecoTotalVenda(); }
function setQtdVendaMax() { if(!itemParaVender) return; qtdVendaSelecionada = inventario[itemParaVender]; let inputEl = document.getElementById('input-qtd-venda'); if(inputEl) { inputEl.value = qtdVendaSelecionada; atualizarPrecoTotalVenda(); } }
function atualizarPrecoTotalVenda() { if(!itemParaVender) return; let inputEl = document.getElementById('input-qtd-venda'); if(!inputEl) return; let rawValue = inputEl.value; let max = inventario[itemParaVender]; if (rawValue === "" || rawValue === "0") { document.getElementById('venda-total-preco').innerText = "0a"; return; } let val = parseInt(rawValue); if(val > max) { val = max; inputEl.value = max; } qtdVendaSelecionada = val; let precoUnitario = precosVenda[itemParaVender] || 5; let total = precoUnitario * qtdVendaSelecionada; document.getElementById('venda-total-preco').innerText = total + "a"; }
function confirmarVenda() { 
    if (!itemParaVender || !inventario[itemParaVender]) return; 
    var kMoedaAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    var kMoedaAc = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';
    if (itemParaVender === kMoedaAd || itemParaVender === kMoedaAc) {
        return mostrarAviso(shopT('game.shop.cannotSellCurrency'));
    }
    let inputEl = document.getElementById('input-qtd-venda'); 
    let val = inputEl ? parseInt(inputEl.value) : 1; 
    if (isNaN(val) || val < 1) return mostrarAviso(shopT('game.shop.invalidSellAmount')); 
    if (val > inventario[itemParaVender]) val = inventario[itemParaVender]; 
    let qtdParaVender = val; 
    let precoUnitario = precosVenda[itemParaVender] || 5; 
    let totalAdena = precoUnitario * qtdParaVender; 
    inventario[itemParaVender] -= qtdParaVender; 
    adenas += totalAdena; 
    if(typeof tocarSom === 'function') tocarSom('adenas'); 
    escreverLog('<span style="color:#00ff00">' + shopT('game.shop.logSold', { qtd: qtdParaVender, name: itemParaVender, total: totalAdena }) + '</span>');
    
    // Anima o botão de venda também!
    let btn = document.getElementById('btn-vender-item');
    let txtOriginal = btn.innerText;
    const soldFlash = shopT('game.shop.soldFlash');
    btn.innerText = soldFlash;
    btn.style.background = "#10b981";
    setTimeout(() => { if(btn && btn.innerText === soldFlash) { btn.innerText = txtOriginal; btn.style.background = "#b91d1d"; } }, 1000);

    if (inventario[itemParaVender] <= 0) { 
        delete inventario[itemParaVender]; 
        itemParaVender = null; 
        document.getElementById('venda-detalhe-texto').innerHTML = shopT('game.shop.selectItemToSell'); 
        document.getElementById('btn-vender-item').style.display = 'none'; 
        if(document.getElementById('venda-qtd-container')) document.getElementById('venda-qtd-container').style.display = 'none'; 
    } else { 
        selecionarItemVenda(itemParaVender); 
    } 
    atualizar(); abrirLojaVenda(); salvarJogo(); 
}

// ==========================================
// SISTEMA DE BUFFS (GRAND MASTER)
// ==========================================
function comprarBuff(tipo) {
    const EB = window.EconomyBalance;
    let precoBuff = EB && typeof EB.grandMasterBuffPrice === 'function'
        ? EB.grandMasterBuffPrice(shopPlayerLevel())
        : 500;
    
    if (tipo === 'fighter' && typeof tempoFimBuffGuerreiro !== 'undefined' && tempoFimBuffGuerreiro > Date.now()) return mostrarAviso(shopT('game.shop.fighterBuffActive'));
    if (tipo === 'mage' && typeof tempoFimBuffMistico !== 'undefined' && tempoFimBuffMistico > Date.now()) return mostrarAviso(shopT('game.shop.mageBuffActive'));

    if (adenas >= precoBuff) {
        adenas -= precoBuff;
        
        let tempoFim = Date.now() + 1800000; 
        
        if (tipo === 'fighter') {
            tempoFimBuffGuerreiro = tempoFim;
            tempoFimBuffMistico = 0; 
        } else {
            tempoFimBuffMistico = tempoFim;
            tempoFimBuffGuerreiro = 0; 
        }
        
        if(typeof tocarSom === 'function') tocarSom('enchant'); 
        if(typeof calcularStatusGlobais === 'function') calcularStatusGlobais(); 
        atualizar();
        salvarJogo();
        
        let nomePacote = tipo === 'fighter' ? shopT('game.shop.blessingPackFighter') : shopT('game.shop.blessingPackMage');
        let corMsg = tipo === 'fighter' ? '#10b981' : '#3b82f6';
        
        escreverLog(`<span style="color:${corMsg}; font-weight:bold;">${shopT('game.shop.blessingLog', { pack: nomePacote })}</span>`);
        if(typeof fecharNpc === 'function') fecharNpc();
        
    } else {
        mostrarAviso(shopT('game.shop.blessingsNeedAdena', { amount: precoBuff }));
    }
}