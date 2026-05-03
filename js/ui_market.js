// --- Sistema de mercado global ---
let marketItems = []; // Itens no mercado global
let marketHistory = []; // Histórico de transações
let marketFiltroAtual = 'all';
let marketFiltroHistorico = 'global'; // 'global' ou 'personal'
let marketOrdenacaoAtual = 'newest'; // 'price_low', 'price_high' ou 'newest'
let marketAbaAtual = 'buy';
let itemSelecionadoParaVenda = null;
let marketFiltroGrade = 'all';
let marketFiltroSubtipo = 'all';
let marketProcessando = false; 
let marketInicializado = false;

function marketT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

/**
 * Taxa 5% (arredondada para cima), alinhada ao Postgres em market_claim_payouts.
 * Preço 1: ceil(5%) daria 1 e zerava o vendedor — limitamos para no máximo (preço - 1).
 */
function mercadoCalcularTaxaVenda(gross) {
    const g = Math.max(0, Math.floor(Number(gross) || 0));
    if (g < 1) return 0;
    const raw = Math.ceil(g * 0.05);
    const cap = Math.max(0, g - 1);
    return Math.min(raw, cap);
}

/** Limite de assunto do correio (ver enviarMail). */
function marketTruncMailSubject(str) {
    return String(str).substring(0, 30);
}

/** Monta assunto localizado do correio do mercado. */
function marketAssuntoMail(keyId, nome) {
    const raw = (nome != null && String(nome).trim() !== '') ? String(nome).trim() : marketT('market.categoryItemGeneric');
    return marketTruncMailSubject(marketT(keyId, { name: raw }));
}

function marketSortButtonText() {
    if (marketOrdenacaoAtual === 'price_low') return marketT('market.sortPriceLow');
    if (marketOrdenacaoAtual === 'price_high') return marketT('market.sortPriceHigh');
    return marketT('market.sortNewest');
}

function refreshMarketUiI18n() {
    const menu = document.getElementById('menu-social-market');
    if (!menu || menu.style.display !== 'flex') return;
    const btnS = document.getElementById('btn-sort-price');
    if (btnS) btnS.textContent = marketSortButtonText();
    if (marketAbaAtual === 'buy') renderizarListaMarket();
    else if (marketAbaAtual === 'sell') renderizarMeusLeiloes();
    else if (marketAbaAtual === 'history') renderizarHistoricoMercado();
    if (typeof atualizarFeeMercado === 'function') atualizarFeeMercado();
}

/** Mercado só com jogadores reais; com Supabase, listagens globais em market_cloud.js */
async function refreshMarketFromCloud() {
    if (typeof MarketCloud === 'undefined' || !MarketCloud.isAvailable()) return;
    try {
        marketItems = await MarketCloud.fetchListings();
        if (marketAbaAtual === 'buy') renderizarListaMarket();
        else if (marketAbaAtual === 'sell') renderizarMeusLeiloes();
    } catch (e) {
        console.error('[Market] refresh cloud:', e);
    }
}

/** Mensagem amigável para erros da RPC do mercado (nuvem). */
function mensagemErroMercadoNuvem(result) {
    if (!result) return marketT('market.errCloudGeneric');
    const code = result.error || '';
    if (code === 'insufficient_funds') {
        const req = result.details && result.details.required != null
            ? Number(result.details.required).toLocaleString()
            : '';
        return req
            ? marketT('market.errInsufficientCloudReq', { req })
            : marketT('market.errInsufficientCloud');
    }
    if (code === 'listing_not_available') return marketT('market.errListingGone');
    if (code === 'cannot_buy_own_listing') return marketT('market.errBuyOwn');
    if (code === 'buyer_not_found_or_not_owned') return marketT('market.errBuyerSession');
    if (code === 'rpc_error' && result.message) return marketT('market.errRpcMsg', { message: result.message });
    if (code === 'rpc_error') return marketT('market.errRpcSql');
    return marketT('market.errCloudGeneric');
}

/** Serializa equip para anexo de correio (cópia para armazenamento local). */
function mercadoSerializarItemParaCorreio(fullItem) {
    if (!fullItem) return null;
    try {
        return JSON.parse(JSON.stringify(fullItem));
    } catch (e) {
        return fullItem;
    }
}

/**
 * Comprador: envia parcela ao correio (estilo L2 — retirada na Iron Gate).
 */
async function mercadoEnviarCorreioComprador(finalEntry) {
    if (typeof enviarMail !== 'function' || !charName) return;
    const snap = finalEntry.item || {};
    const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
    const assunto = marketAssuntoMail('market.mailSubjectParcel', nome);
    
    // Agora usa await para garantir que o envio (possivelmente via RPC) seja concluído
    await enviarMail(charName, marketT('market.mailSender'), assunto, 'market', {
        marketKind: 'purchase_delivery',
        listingId: String(finalEntry.id),
        categoria: finalEntry.categoria || 'mats',
        enchant: finalEntry.enchant || 0,
        itemSnapshot: snap,
        fullItem: mercadoSerializarItemParaCorreio(finalEntry.fullItem),
        qtd: finalEntry.qtd != null ? finalEntry.qtd : 1,
        sellerName: finalEntry.vendedor,
        paid: finalEntry.preco,
        moeda: finalEntry.moeda === 'coin' ? 'coin' : 'adena',
        valor: 0
    });
}

/**
 * Vendedor (local): proventos líquidos via correio.
 */
async function mercadoEnviarCorreioVendaLocal(finalEntry) {
    if (typeof enviarMail !== 'function') return;
    const snap = finalEntry.item || {};
    const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
    const gross = Number(finalEntry.preco) || 0;
    const tax = mercadoCalcularTaxaVenda(gross);
    const net = Math.max(0, gross - tax);
    const assunto = marketAssuntoMail('market.mailSubjectSold', nome);
    
    await enviarMail(finalEntry.vendedor, marketT('market.mailSender'), assunto, 'market', {
        marketKind: 'sale_proceeds',
        valor: net,
        moeda: finalEntry.moeda === 'coin' ? 'coin' : 'adena',
        gross,
        tax,
        buyerName: charName
    });
}

/** Vendedor: credita vendas na nuvem via RPC (taxa 5% já aplicada no servidor). */
async function aplicarPayoutsMercadoNuvem() {
    if (typeof MarketCloud === 'undefined' || !MarketCloud.isAvailable() || !charName) return;
    try {
        const res = await MarketCloud.claimPendingPayouts(charName);
        if (!res.ok) {
            if (res.error && res.error !== 'claim_failed') {
                console.warn('[Market] claim payout:', res.error, res.details || res.message || '');
            }
            return;
        }
        if (!res.payouts || !res.payouts.length) return;

        for (const p of res.payouts) {
            const net = Number(p.net) || 0;
            const moeda = p.currency === 'coin' ? 'coin' : 'adena';
            const snap = p.item_snapshot || {};
            const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
            const tax = p.tax != null ? Number(p.tax) : null;
            const gross = p.gross != null ? Number(p.gross) : null;
            const assuntoVenda = marketAssuntoMail('market.mailSubjectSold', nome);
            if (typeof enviarMail === 'function') {
                await enviarMail(charName, marketT('market.mailSender'), assuntoVenda, 'market', {
                    marketKind: 'sale_proceeds',
                    valor: net,
                    moeda,
                    gross,
                    tax,
                    buyerName: p.buyer_char_name || '—'
                });
            }
            if (typeof escreverLog === 'function') {
                const safeNome = String(nome).replace(/[<>]/g, '');
                escreverLog(`<span style="color:#ca8a04;">${marketT('market.mailLogPrefix')}</span> <span style="color:#a8a29e;">${marketT('market.payoutLog', { name: safeNome })}</span>`);
            }
        }

        if (typeof salvarJogo === 'function') salvarJogo();
        if (typeof atualizar === 'function') atualizar();
        if (typeof mostrarAviso === 'function') {
            mostrarAviso(marketT('market.payoutMailbox'));
        }
    } catch (e) {
        console.error('[Market] payout:', e);
    }
}

function iniciarSistemaMercado() {
    if (marketInicializado) {
        if (typeof atualizarIconeMailbox === 'function') atualizarIconeMailbox();
        if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) {
            refreshMarketFromCloud().then(() => aplicarPayoutsMercadoNuvem());
        }
        return;
    }

    let savedHistory = localStorage.getItem('l2mini_market_history');
    if (savedHistory) {
        try {
            marketHistory = JSON.parse(savedHistory);
        } catch (e) { marketHistory = []; }
    }

    (async () => {
        if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) {
            try {
                marketItems = await MarketCloud.fetchListings();
                marketInicializado = true;
                MarketCloud.subscribeListings(() => {
                    refreshMarketFromCloud().then(() => aplicarPayoutsMercadoNuvem());
                });
                await aplicarPayoutsMercadoNuvem();
                console.log('[Market] Nuvem ativa. Listagens:', marketItems.length);
            } catch (e) {
                console.error('[Market] Falha ao carregar nuvem:', e);
                marketItems = [];
                marketInicializado = true;
            }
        } else {
            let savedMarket = localStorage.getItem('l2mini_market');
            if (savedMarket !== null) {
                try {
                    marketItems = JSON.parse(savedMarket).filter((i) => !i.isBot);
                } catch (err) {
                    console.error('Erro ao carregar mercado local:', err);
                    marketItems = [];
                }
            } else {
                marketItems = [];
            }
            marketInicializado = true;
            salvarMercado();
            console.log('[Market] Modo local. Listagens:', marketItems.length);
        }
        if (typeof atualizarIconeMailbox === 'function') atualizarIconeMailbox();
    })();
}

function gerarItensIniciaisMercado() {
    marketItems = [];
    marketInicializado = true;
    salvarMercado();
}

function salvarMercado() {
    if (typeof MarketCloud === 'undefined' || !MarketCloud.isAvailable()) {
        localStorage.setItem('l2mini_market', JSON.stringify(marketItems));
    }
    localStorage.setItem('l2mini_market_history', JSON.stringify(marketHistory));
}

function mudarAbaMarket(aba) {
    marketAbaAtual = aba;
    const btnBuy = document.getElementById('btn-market-buy');
    const btnSell = document.getElementById('btn-market-sell');
    const btnHistory = document.getElementById('btn-market-history');
    if(btnBuy) {
        btnBuy.classList.toggle('active', aba === 'buy');
    }
    if(btnSell) {
        btnSell.classList.toggle('active', aba === 'sell');
    }
    if(btnHistory) {
        btnHistory.classList.toggle('active', aba === 'history');
    }

    const tabBuy = document.getElementById('market-tab-buy');
    const tabSell = document.getElementById('market-tab-sell');
    const tabHistory = document.getElementById('market-tab-history');
    if(tabBuy) tabBuy.style.display = aba === 'buy' ? 'flex' : 'none';
    if(tabSell) tabSell.style.display = aba === 'sell' ? 'flex' : 'none';
    if(tabHistory) tabHistory.style.display = aba === 'history' ? 'flex' : 'none';

    if (aba === 'buy') renderizarListaMarket();
    else if (aba === 'sell') {
        renderizarMeusLeiloes();
        if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) aplicarPayoutsMercadoNuvem();
    }
    else if (aba === 'history') renderizarHistoricoMercado();
}

function filtrarMarket(categoria) {
    marketFiltroAtual = categoria;
    const botoes = document.querySelectorAll('.market-filter-btn:not(.sub-filter)');
    botoes.forEach(btn => {
        const cat = btn.getAttribute('data-market-cat');
        if (cat == null) return;
        btn.classList.toggle('active', cat === categoria);
    });

    // Mostra/Esconde sub-filtros de equipamentos
    const subCont = document.getElementById('market-subfilters-equips');
    if (subCont) {
        subCont.style.display = categoria === 'equips' ? 'flex' : 'none';
    }

    // Reseta sub-filtros ao mudar categoria principal
    marketFiltroGrade = 'all';
    marketFiltroSubtipo = 'all';
    atualizarVisualSubfiltros();

    renderizarListaMarket();
}

function filtrarMarketGrade(grade) {
    marketFiltroGrade = grade;
    atualizarVisualSubfiltros();
    renderizarListaMarket();
}

function filtrarMarketSubtipo(subtipo) {
    marketFiltroSubtipo = subtipo;
    atualizarVisualSubfiltros();
    renderizarListaMarket();
}

function atualizarVisualSubfiltros() {
    // Atualiza botões de Grade
    const gradeBtns = document.querySelectorAll('.grade-filter');
    gradeBtns.forEach(btn => {
        const g = btn.getAttribute('data-market-grade');
        const isMatch = (marketFiltroGrade === 'all' && g === 'all') || (g && g === marketFiltroGrade);
        btn.classList.toggle('active', !!isMatch);
    });

    // Atualiza botões de Tipo
    const typeBtns = document.querySelectorAll('.type-filter');
    typeBtns.forEach(btn => {
        const ty = btn.getAttribute('data-market-type');
        const isMatch = (marketFiltroSubtipo === 'all' && ty === 'all') || (ty && ty === marketFiltroSubtipo);
        btn.classList.toggle('active', !!isMatch);
    });
}

function toggleSortMarket() {
    if (marketOrdenacaoAtual === 'newest') {
        marketOrdenacaoAtual = 'price_low';
    } else if (marketOrdenacaoAtual === 'price_low') {
        marketOrdenacaoAtual = 'price_high';
    } else {
        marketOrdenacaoAtual = 'newest';
    }
    const btn = document.getElementById('btn-sort-price');
    if (btn) btn.textContent = marketSortButtonText();
    renderizarListaMarket();
}

function renderizarListaMarket() {
    const listCont = document.getElementById('market-list');
    const searchInput = document.getElementById('market-search-input');
    if (!listCont) return;

    const termoBusca = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtrados = marketItems.filter(entry => {
        const item = entry.item;
        
        // 1. Filtro de Categoria Principal
        if (marketFiltroAtual !== 'all' && entry.categoria !== marketFiltroAtual) return false;
        
        // 2. Filtros Específicos para Equipamentos
        if (marketFiltroAtual === 'equips') {
            // Filtro de Grade
            if (marketFiltroGrade !== 'all') {
                const gradeItem = (item.grade || 'No-Grade').toUpperCase();
                const gradeFiltro = marketFiltroGrade.toUpperCase();
                if (gradeItem !== gradeFiltro) return false;
            }

            // Filtro de Tipo (Weapon, Armor, Jewel)
            if (marketFiltroSubtipo !== 'all') {
                const tipo = (item.tipoItem || item.tipo || "").toLowerCase();
                const filtro = marketFiltroSubtipo.toLowerCase();
                
                if (filtro === 'weapon') {
                    if (!['sword', 'dagger', 'bow', 'mace', 'fist', 'magic sword'].includes(tipo)) return false;
                } else if (filtro === 'armor') {
                    if (!['heavy', 'light', 'robe', 'armor'].includes(tipo)) return false;
                } else if (filtro === 'jewel') {
                    if (!['neck', 'ear', 'ring', 'jewel'].includes(tipo)) return false;
                }
            }
        }

        // 3. Filtro de Nome (Barra de Pesquisa)
        if (termoBusca !== "" && !String(item.nome || '').toLowerCase().includes(termoBusca)) return false;

        return true;
    });

    // 4. Ordenação Dinâmica
    if (marketOrdenacaoAtual === 'price_low') {
        filtrados.sort((a, b) => a.preco - b.preco);
    } else if (marketOrdenacaoAtual === 'price_high') {
        filtrados.sort((a, b) => b.preco - a.preco);
    } else {
        filtrados.sort((a, b) => {
            const ta = a._createdAt ? new Date(a._createdAt).getTime() : (typeof a.id === 'number' ? a.id : 0);
            const tb = b._createdAt ? new Date(b._createdAt).getTime() : (typeof b.id === 'number' ? b.id : 0);
            return tb - ta;
        });
    }

    if (filtrados.length === 0) {
        const msg = termoBusca !== '' ? marketT('market.emptyNoSearch') : marketT('market.emptyCategory');
        listCont.innerHTML = `<div class="market-empty-msg">${msg}</div>`;
        return;
    }

    let html = '';
    filtrados.forEach(entry => {
        const item = entry.item;
        const isMeuItem = entry.vendedor === charName;
        const labelMoeda = entry.moeda === 'adena' ? '<div class="coin-icon coin-adena"></div>' : '<div class="coin-icon coin-ancient"></div>';
        const corPreco = entry.moeda === 'adena' ? '#facc15' : '#60a5fa';
        const enchantTxt = entry.enchant > 0 ? `<span style="color:#38bdf8;">+${entry.enchant}</span> ` : '';
        const gradeTxt = item.grade ? `<span style="color:${getCorGrade(item.grade)}; font-size: 0.8em; margin-left: 5px;">[${item.grade}]</span>` : '';

        const idEsc = JSON.stringify(String(entry.id));
        const botaoAcao = isMeuItem 
            ? `<button type="button" class="market-cancel-btn" style="padding: 4px 8px; font-size: 8px;" onclick='cancelarLeilao(${idEsc})'>${marketT('market.cancelListing')}</button>`
            : `<button type="button" class="market-buy-btn" onclick='abrirAcaoItemMarket(${idEsc})'>${marketT('market.buy')}</button>`;

        html += `
        <div class="market-card" onclick='abrirAcaoItemMarket(${idEsc})' style="${isMeuItem ? 'border-color: #ca8a04; background: rgba(61, 43, 31, 0.4);' : ''}">
            <div class="market-card-icon">
                <img src="${item.img || item.icone || 'assets/icons/etc_etc_box_ot_i00.png'}" onerror="this.src='assets/itens/item_generic.png'">
                ${isMeuItem ? '<div style="position:absolute; top:2px; left:2px; background:#ca8a04; color:#000; font-size:7px; padding:1px 3px; border-radius:2px; font-weight:bold; z-index:5;">' + marketT('market.badgeYou') + '</div>' : ''}
            </div>
            <div class="market-card-info">
                <div class="market-card-name">${enchantTxt}${item.nome} ${gradeTxt}</div>
                <div class="market-card-seller">${marketT('market.seller')} <span style="color: ${isMeuItem ? '#ca8a04' : '#22c55e'};">${isMeuItem ? marketT('market.you') : entry.vendedor}</span> ${entry.qtd > 1 ? '<b style="color:#10b981; margin-left:5px;">x'+entry.qtd+'</b>' : ''}</div>
            </div>
            <div class="market-card-price-zone" onclick="event.stopPropagation()">
                <div class="market-card-price" style="color: ${corPreco};">
                    ${entry.preco.toLocaleString()}<span style="font-size:0.7em; margin-left:2px;">${entry.moeda === 'adena' ? 'a' : 'ac'}</span>
                </div>
                ${botaoAcao}
            </div>
        </div>
        `;
    });
    listCont.innerHTML = html;
}

function executarCompraMarket(id) {
    if (marketProcessando) return;

    const index = marketItems.findIndex(i => String(i.id) === String(id));
    if (index === -1) {
        fecharJanelaAcao();
        return mostrarAviso(marketT('market.itemUnavailable'));
    }

    const entry = marketItems[index];

    if (entry.vendedor === charName) {
        return mostrarAviso(marketT('market.cannotBuyOwn'));
    }

    if (typeof MarketCloud === 'undefined' || !MarketCloud.isAvailable()) {
        if (entry.moeda === 'adena') {
            if (adenas < entry.preco) return mostrarAviso(marketT('market.notEnoughAdena'));
        } else {
            if (typeof ancientCoins === 'undefined') window.ancientCoins = 0;
            if (ancientCoins < entry.preco) return mostrarAviso(marketT('market.notEnoughCoins'));
        }
    }

    marketProcessando = true;

    (async () => {
        try {
            let finalEntry = entry;
            let saldoJaDebitadoNaNuvem = false;

            if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) {
                const purchase = await MarketCloud.completePurchase(id, charName);
                if (!purchase.ok) {
                    fecharJanelaAcao();
                    await refreshMarketFromCloud();
                    mostrarAviso(mensagemErroMercadoNuvem(purchase));
                    return;
                }
                finalEntry = purchase.entry;
                window.adenas = purchase.balances.adenas;
                window.ancientCoins = purchase.balances.ancientCoins;
                saldoJaDebitadoNaNuvem = true;
            }

            registrarHistoricoMercado({
                vendedor: finalEntry.vendedor,
                comprador: charName,
                item: finalEntry.item,
                enchant: finalEntry.enchant,
                preco: finalEntry.preco,
                moeda: finalEntry.moeda,
                qtd: finalEntry.qtd,
                data: Date.now()
            });

            const idx2 = marketItems.findIndex(i => String(i.id) === String(id));
            if (idx2 !== -1) marketItems.splice(idx2, 1);
            salvarMercado();

            if (!saldoJaDebitadoNaNuvem) {
                if (finalEntry.moeda === 'adena') {
                    adenas -= finalEntry.preco;
                } else {
                    ancientCoins -= finalEntry.preco;
                }
            }

            if (typeof MarketCloud === 'undefined' || !MarketCloud.isAvailable()) {
                await mercadoEnviarCorreioVendaLocal(finalEntry);
            }

            await mercadoEnviarCorreioComprador(finalEntry);

            fecharJanelaAcao();
            renderizarListaMarket();
            atualizar();
            mostrarAviso(marketT('market.tradeRegistered'));
            escreverLog(`<span style="color:#ca8a04;">${marketT('market.mailLogPrefix')}</span> <span style="color:#d6d3d1;">${marketT('market.tradeLogBroker')}</span>`);
            if (typeof salvarJogo === 'function') salvarJogo();
        } finally {
            marketProcessando = false;
        }
    })();
}

function renderizarMeusLeiloes() {
    const cont = document.getElementById('market-my-listings');
    if(!cont) return;

    let meus = marketItems.filter(i => i.vendedor === charName);
    
    if (meus.length === 0) {
        cont.innerHTML = '<div class="market-empty-msg">' + marketT('market.emptyMyAuctions') + '</div>';
        return;
    }

    let html = '';
    meus.forEach(entry => {
        const item = entry.item;
        const idEsc = JSON.stringify(String(entry.id));
        const gradeTxt = item.grade ? `<span style="color:${getCorGrade(item.grade)}; font-size: 0.8em; margin-left: 5px;">[${item.grade}]</span>` : '';
        const labelMoeda = entry.moeda === 'adena' ? 'a' : 'ac';
        const corPreco = entry.moeda === 'adena' ? '#facc15' : '#60a5fa';

        html += `
        <div class="market-card" onclick='abrirAcaoItemMarket(${idEsc})'>
            <div class="market-card-icon">
                <img src="${item.img || item.icone || 'assets/icons/etc_etc_box_ot_i00.png'}" onerror="this.src='assets/itens/item_generic.png'">
            </div>
            <div class="market-card-info">
                <div class="market-card-name">${entry.enchant > 0 ? '+'+entry.enchant+' ' : ''}${item.nome} ${gradeTxt}</div>
                <div class="market-card-price" style="color: ${corPreco}; font-size: 0.85em; margin-top: 2px;">
                    ${entry.preco.toLocaleString()}<span style="font-size:0.75em; margin-left:2px;">${labelMoeda}</span>
                    ${entry.qtd > 1 ? '<b style="color:#10b981; margin-left:10px;">x'+entry.qtd+'</b>' : ''}
                </div>
            </div>
            <div class="market-card-price-zone" onclick="event.stopPropagation()">
                <button type="button" class="market-cancel-btn" onclick='cancelarLeilao(${idEsc})'>${marketT('market.cancelListing')}</button>
            </div>
        </div>
        `;
    });
    cont.innerHTML = html;
}

function cancelarLeilao(id) {
    if (marketProcessando) return;

    const index = marketItems.findIndex(i => String(i.id) === String(id));
    if (index === -1) return;

    const entry = marketItems[index];
    if (entry.vendedor !== charName) return;

    marketProcessando = true;

    (async () => {
        try {
            if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) {
                const ok = await MarketCloud.cancelListing(id, charName);
                if (!ok) {
                    await refreshMarketFromCloud();
                    mostrarAviso(marketT('market.cancelFailed'));
                    return;
                }
                const idx = marketItems.findIndex(i => String(i.id) === String(id));
                if (idx !== -1) marketItems.splice(idx, 1);
            } else {
                marketItems.splice(index, 1);
            }
            salvarMercado();

            if (entry.categoria === 'equips') {
                const itemParaDevolver = entry.fullItem || {
                    tipo: entry.item.tipoItem || entry.item.tipo || 'armor',
                    base: entry.item,
                    enchant: entry.enchant
                };
                InventoryManager.adicionarEquipamento(itemParaDevolver);
            } else {
                inventario[entry.item.nome] = (inventario[entry.item.nome] || 0) + entry.qtd;
            }

            renderizarMeusLeiloes();
            atualizar();
            mostrarAviso(marketT('market.listingCanceled'));
            if (typeof salvarJogo === 'function') salvarJogo();
        } finally {
            marketProcessando = false;
        }
    })();
}

function abrirModalRegistrarMercado() {
    itemSelecionadoParaVenda = null;
    document.getElementById('market-reg-slot').innerHTML = '<span style="font-size: 20px; color: #555;">+</span>';
    document.getElementById('market-reg-nome').innerText = marketT('market.selectItemPlaceholder');
    document.getElementById('market-reg-desc').innerText = marketT('market.tapSlotDesc');
    abrirModal('janela-market-registrar', 1700);
    document.getElementById('input-market-price').value = 1000;
    document.getElementById('input-market-qtd').value = 1;
    document.getElementById('market-reg-qtd-container').style.display = 'none';
    atualizarFeeMercado();
}

function fecharModalRegistrarMercado() {
    fecharModal('janela-market-registrar');
}

function abrirSeletorItemMarket() {
    const grid = document.getElementById('market-seletor-grid');
    if(!grid) return;
    grid.innerHTML = '';

    // 1. Lista Equipamentos (instâncias: nome/img em .base — mesmo padrão que ui_inventory.js)
    inventarioEquips.forEach((item, index) => {
        if (!item) return;
        const base = item.base || item;
        if (!base || !base.nome) return;

        const div = document.createElement('div');
        div.className = 'inv-slot';
        const imgSrc = base.img || item.img || 'assets/icons/etc_etc_box_ot_i00.png';
        div.innerHTML = `<img src="${imgSrc}" style="width:32px; height:32px; object-fit:contain;">`;
        const enc = item.enchant !== undefined ? item.enchant : (item.enchantArmor || item.enchantJewel || 0);
        if (enc > 0) div.innerHTML += `<span class="enchant-label">+${enc}</span>`;
        div.onclick = () => preverItemParaVenda(item, 'equips', index);
        grid.appendChild(div);
    });

    const kMad = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    const kMac = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';

    // 2. Lista Materiais/Consumíveis (com verificação de integridade)
    for (let nome in inventario) {
        let qtd = inventario[nome];
        if (nome === kMad || nome === kMac) continue;
        if (nome && nome !== "undefined" && nome !== "null" && qtd > 0) {
            const div = document.createElement('div');
            div.className = 'inv-slot';
            // Tenta buscar um ícone se for material conhecido, senão usa genérico
            div.innerHTML = `<span style="font-size:8px; text-align:center; padding: 2px; word-break: break-all;">${nome}</span><span class="inv-qtd">${qtd}</span>`;
            div.onclick = () => preverItemParaVenda({ nome: nome, img: '' }, 'mats', nome);
            grid.appendChild(div);
        }
    }

    if (grid.children.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; color:#555; padding:20px;">' + marketT('market.inventoryEmpty') + '</div>';
    }

    abrirModal('janela-market-seletor', 1800);
}

function preverItemParaVenda(item, categoria, indexOuNome) {
    if (!item) return;

    abrirModal('janela-item-acao', 2100);
    document.getElementById('acao-titulo').innerText = marketT('market.confirmSelection');

    let info = '';
    if (categoria === 'equips' && typeof formatarTooltipEquipamento === 'function') {
        const itemBase = item.base || item;
        const tipoBruto = item.tipo || itemBase.tipoItem || itemBase.tipo || 'misc';
        const enc = item.enchant !== undefined ? item.enchant : (item.enchantArmor || item.enchantJewel || 0);
        const isAug = !!(item.augmented || itemBase.augmented);
        document.getElementById('acao-img').src = itemBase.img || item.img || 'assets/icons/etc_etc_box_ot_i00.png';
        info = formatarTooltipEquipamento(itemBase, enc, isAug, tipoBruto, item);
    } else {
        document.getElementById('acao-img').src = item.img || 'assets/icons/etc_etc_box_ot_i00.png';
        const totalDisp = inventario[item.nome] || 0;
        info = `<div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">${item.nome}</div>`;
        info += `<div style="color:#aaa; font-size:0.9em;">${marketT('market.categoryMatMisc')}</div>`;
        info += `<div style="color:#10b981; font-size:0.9em; margin-top:5px;">${marketT('market.availableInBag', { n: totalDisp })}</div>`;
    }

    document.getElementById('acao-desc').innerHTML = info;
    
    const btnAcao = document.getElementById('btn-acao-item');
    if (btnAcao) {
        btnAcao.style.display = 'block';
        btnAcao.innerText = marketT('market.selectThisItem');
        btnAcao.style.background = '#15803d';
        btnAcao.onclick = () => {
            selecionarItemParaMarket(item, categoria, indexOuNome);
            fecharJanelaAcao();
        };
    }
}

function selecionarItemParaMarket(item, categoria, indexOuNome) {
    itemSelecionadoParaVenda = { item, categoria, ref: indexOuNome };

    const baseUi = (categoria === 'equips' && item.base) ? item.base : (item.base || item);
    const nomeUi = baseUi.nome || item.nome || '';
    const imgUi = baseUi.img || item.img || '';

    document.getElementById('market-reg-slot').innerHTML = imgUi
        ? `<img src="${imgUi}" style="width:100%; height:100%; object-fit:contain;">`
        : `<div style="font-size:10px; color:#aaa; text-align:center; padding: 2px;">${nomeUi}</div>`;
    const encLabel = item.enchant !== undefined ? item.enchant : (item.enchantArmor || item.enchantJewel || 0);
    document.getElementById('market-reg-nome').innerText = (encLabel > 0 ? '+' + encLabel + ' ' : '') + nomeUi;
    document.getElementById('market-reg-desc').innerText = categoria === 'equips' ? marketT('market.equipmentItem') : marketT('market.stackableMaterial');
    
    if (categoria === 'mats') {
        const cont = document.getElementById('market-reg-qtd-container');
        const input = document.getElementById('input-market-qtd');
        cont.style.display = 'flex';
        input.max = inventario[item.nome];
        input.value = 1;
    } else {
        document.getElementById('market-reg-qtd-container').style.display = 'none';
    }

    fecharSeletorItemMarket();
}

function fecharSeletorItemMarket() {
    fecharModal('janela-market-seletor');
}

function cliqueSlotRegistroMarket() {
    if (!itemSelecionadoParaVenda) {
        abrirSeletorItemMarket();
    } else {
        // Se já tiver item, mostra detalhes com opção de trocar
        preverItemParaVenda(itemSelecionadoParaVenda.item, itemSelecionadoParaVenda.categoria, itemSelecionadoParaVenda.ref);
        const btn = document.getElementById('btn-acao-item');
        btn.innerText = marketT('market.changeItem');
        btn.style.background = '#ca8a04';
        btn.onclick = () => {
            itemSelecionadoParaVenda = null;
            document.getElementById('market-reg-slot').innerHTML = '<span style="font-size: 20px; color: #555;">+</span>';
            document.getElementById('market-reg-nome').innerText = marketT('market.selectItemPlaceholder');
            fecharJanelaAcao();
            abrirSeletorItemMarket();
        };
    }
}

function confirmarRegistroMarket() {
    if (marketProcessando) return;
    if (!itemSelecionadoParaVenda) return mostrarAviso(marketT('market.selectItemAlert'));

    const preco = parseInt(document.getElementById('input-market-price').value);
    const moeda = document.getElementById('select-market-currency').value;
    const qtd = itemSelecionadoParaVenda.categoria === 'mats' ? parseInt(document.getElementById('input-market-qtd').value) : 1;

    if (isNaN(preco) || preco <= 0) return mostrarAviso(marketT('market.invalidPrice'));
    if (isNaN(qtd) || qtd <= 0) return mostrarAviso(marketT('market.invalidQty'));

    marketProcessando = true;

    let fullItemParaVenda = null;
    if (itemSelecionadoParaVenda.categoria === 'equips') {
        fullItemParaVenda = inventarioEquips[itemSelecionadoParaVenda.ref];
        if (fullItemParaVenda !== itemSelecionadoParaVenda.item) {
            marketProcessando = false;
            return mostrarAviso(marketT('market.inventorySyncError'));
        }
        inventarioEquips.splice(itemSelecionadoParaVenda.ref, 1);
    } else {
        if (inventario[itemSelecionadoParaVenda.item.nome] < qtd) {
            marketProcessando = false;
            return mostrarAviso(marketT('market.notEnoughQty'));
        }
        inventario[itemSelecionadoParaVenda.item.nome] -= qtd;
    }

    const rollbackInv = () => {
        if (itemSelecionadoParaVenda.categoria === 'equips') {
            inventarioEquips.splice(itemSelecionadoParaVenda.ref, 0, fullItemParaVenda);
        } else {
            inventario[itemSelecionadoParaVenda.item.nome] = (inventario[itemSelecionadoParaVenda.item.nome] || 0) + qtd;
        }
    };

    (async () => {
        try {
            const raw = itemSelecionadoParaVenda.item;
            const item_snapshot = {
                nome: raw.nome || (raw.base && raw.base.nome) || 'Item',
                img: raw.img || (raw.base && raw.base.img),
                icone: raw.icone || (raw.base && raw.base.icone),
                grade: raw.grade || (raw.base && raw.base.grade),
                tipo: raw.tipo || (raw.base && raw.base.tipo),
                tipoItem: raw.tipoItem || (raw.base && raw.base.tipoItem),
                preco: raw.preco != null ? raw.preco : (raw.base && raw.base.preco)
            };

            if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable()) {
                let fullJson = null;
                try {
                    fullJson = fullItemParaVenda ? JSON.parse(JSON.stringify(fullItemParaVenda)) : null;
                } catch (e) {
                    fullJson = fullItemParaVenda;
                }
                const pub = await MarketCloud.publishListing({
                    seller_char_name: charName,
                    price: preco,
                    currency: moeda,
                    categoria: itemSelecionadoParaVenda.categoria,
                    qtd: qtd,
                    enchant: itemSelecionadoParaVenda.item.enchant || 0,
                    item_snapshot: item_snapshot,
                    full_item: fullJson
                });
                if (!pub.ok) {
                    rollbackInv();
                    if (pub.error === 'insufficient_listing_fee') {
                        const req = pub.details && pub.details.required != null ? pub.details.required : MarketCloud.LISTING_FEE_ADENA;
                        mostrarAviso(marketT('market.listingFeeInsufficient', { fee: req }));
                    } else if (pub.error === 'rpc_error' && pub.message) {
                        mostrarAviso(marketT('market.errRpcMsg', { message: pub.message }));
                    } else {
                        mostrarAviso(marketT('market.publishCloudFail'));
                    }
                    return;
                }
                window.adenas = pub.balances.adenas;
                window.ancientCoins = pub.balances.ancientCoins;
                await refreshMarketFromCloud();
            } else {
                marketItems.push({
                    id: Date.now() + Math.random(),
                    vendedor: charName,
                    isBot: false,
                    item: { ...itemSelecionadoParaVenda.item },
                    fullItem: fullItemParaVenda,
                    enchant: itemSelecionadoParaVenda.item.enchant || 0,
                    preco: preco,
                    moeda: moeda,
                    categoria: itemSelecionadoParaVenda.categoria,
                    qtd: qtd
                });
                salvarMercado();
            }

            fecharModalRegistrarMercado();
            mudarAbaMarket('sell');
            mostrarAviso(marketT('market.listedSuccess'));
            atualizar();
            if (typeof salvarJogo === 'function') salvarJogo();
        } finally {
            marketProcessando = false;
        }
    })();
}

function atualizarFeeMercado() {
    const preco = parseInt(document.getElementById('input-market-price').value) || 0;
    const fee = mercadoCalcularTaxaVenda(preco);
    const wrap = document.getElementById('market-fee-info');
    if (wrap) {
        let html = marketT('market.feeLine') + ' <span id="market-fee-val">' + fee + '</span>';
        if (typeof MarketCloud !== 'undefined' && MarketCloud.isAvailable && MarketCloud.isAvailable()) {
            html += '<div style="margin-top:4px;color:#94a3b8;font-size:0.95em;">' +
                marketT('market.listingFeePublisher', { fee: MarketCloud.LISTING_FEE_ADENA }) + '</div>';
        }
        wrap.innerHTML = html;
    }
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'input-market-price') atualizarFeeMercado();
});

function setMarketRegMaxQtd() {
    if (itemSelecionadoParaVenda && itemSelecionadoParaVenda.categoria === 'mats') {
        document.getElementById('input-market-qtd').value = inventario[itemSelecionadoParaVenda.item.nome];
    }
}

function abrirAcaoItemMarket(id) {
    const entry = marketItems.find(i => String(i.id) === String(id));
    if (!entry) return;

    const item = entry.item;
    const displaySource = entry.fullItem || item;
    const itemBaseParaTip = displaySource && (displaySource.base || displaySource);
    const enchant = entry.enchant || displaySource.enchant || 0;
    const isAug = !!(displaySource && (displaySource.augmented || (displaySource.base && displaySource.base.augmented)));
    const tipo = (displaySource && (displaySource.tipo || (displaySource.base && (displaySource.base.tipoItem || displaySource.base.tipo))))
        || item.tipoItem || item.tipo || (entry.categoria === 'equips' ? 'misc' : 'misc');

    abrirModal('janela-item-acao', 2100);

    const tit = document.getElementById('acao-titulo');
    const img = document.getElementById('acao-img');
    const desc = document.getElementById('acao-desc');
    const btn = document.getElementById('btn-acao-item');

    if(tit) tit.innerText = marketT('market.marketItemInfo');
    if (img) {
        img.src = (itemBaseParaTip && itemBaseParaTip.img) || item.img || item.icone || 'assets/icons/etc_etc_box_ot_i00.png';
    }
    
    let info = '';
    if (entry.categoria === 'equips' && typeof formatarTooltipEquipamento === 'function' && itemBaseParaTip && itemBaseParaTip.nome) {
        info = formatarTooltipEquipamento(itemBaseParaTip, enchant, isAug, tipo, entry.fullItem || displaySource);
    } else {
        const catLabel = entry.categoria === 'mats' ? marketT('market.categoryMaterial') : marketT('market.categoryItemGeneric');
        info = `<div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">${item.nome}</div>`;
        info += `<div style="color:#aaa; font-size:0.9em;">${marketT('market.categoryLabel')} ${catLabel}</div>`;
        if (entry.qtd > 1) info += `<div style="color:#10b981; font-size:0.9em; margin-top:5px;">${marketT('market.qtyInAuction', { n: entry.qtd })}</div>`;
    }

    // Adiciona informações de preço na descrição
    const labelMoeda = entry.moeda === 'adena' ? marketT('market.currencyAdenasLabel') : marketT('market.currencyCoinsLabel');
    info += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #444; text-align: center;">`;
    info += `<div style="color: #888; font-size: 0.8em; margin-bottom: 3px;">${marketT('market.price')}</div>`;
    info += `<div style="color: ${entry.moeda === 'adena' ? '#facc15' : '#60a5fa'}; font-weight: bold; font-size: 1.1em;">${entry.preco.toLocaleString()}${labelMoeda}</div>`;
    info += `</div>`;

    if(desc) {
        desc.innerHTML = info;
        desc.style.width = "100%";
    }
    
    if(btn) {
        const isMeuItem = entry.vendedor === charName;
        if (isMeuItem) {
            btn.style.display = 'block';
            btn.innerText = marketT('market.btnCancelAuction');
            btn.style.background = '#991b1b';
            btn.onclick = () => {
                cancelarLeilao(id);
                fecharJanelaAcao();
            };
        } else {
            btn.style.display = 'block';
            btn.innerText = marketT('market.btnConfirmPurchase');
            btn.style.background = '#15803d';
            btn.onclick = () => { void executarCompraMarket(id); };
        }
    }
}

function getCorGrade(grade) {
    switch(String(grade).toUpperCase()) {
        case 'D': return '#60a5fa';
        case 'C': return '#93c5fd';
        case 'B': return '#fca5a5';
        case 'A': return '#fde047';
        case 'S': return '#c084fc';
        default: return '#aaa';
    }
}

// --- Histórico de transações do mercado ---

function registrarHistoricoMercado(entry) {
    marketHistory.unshift(entry); // Adiciona no início (mais recente primeiro)
    
    // Limita o histórico global para não crescer infinitamente (ex: 100 entradas)
    if (marketHistory.length > 100) {
        marketHistory.pop();
    }
    
    salvarMercado();
}

function filtrarHistorico(tipo) {
    marketFiltroHistorico = tipo;
    const btnGlobal = document.getElementById('btn-history-global');
    const btnPersonal = document.getElementById('btn-history-personal');
    
    if (btnGlobal) btnGlobal.classList.toggle('active', tipo === 'global');
    if (btnPersonal) btnPersonal.classList.toggle('active', tipo === 'personal');
    
    renderizarHistoricoMercado();
}

function renderizarHistoricoMercado() {
    const listCont = document.getElementById('market-history-list');
    if (!listCont) return;

    let filtrados = marketHistory;
    if (marketFiltroHistorico === 'personal') {
        filtrados = marketHistory.filter(h => h.vendedor === charName || h.comprador === charName);
    }

    if (filtrados.length === 0) {
        listCont.innerHTML = `<div class="market-empty-msg">${marketT('market.emptyHistory')}</div>`;
        return;
    }

    let html = '';
    filtrados.forEach(h => {
        const item = h.item;
        const isVendaMinha = h.vendedor === charName;
        const isCompraMinha = h.comprador === charName;
        
        const labelMoeda = h.moeda === 'adena' ? '<div class="coin-icon coin-adena"></div>' : '<div class="coin-icon coin-ancient"></div>';
        const corPreco = h.moeda === 'adena' ? '#facc15' : '#60a5fa';
        const enchantTxt = h.enchant > 0 ? `<span style="color:#38bdf8;">+${h.enchant}</span> ` : '';
        
        const dataTransacao = new Date(h.data);
        const horaTxt = `${dataTransacao.getHours().toString().padStart(2,'0')}:${dataTransacao.getMinutes().toString().padStart(2,'0')}`;

        let statusTxt = `<span style="color:#aaa;">${marketT('market.historySoldBy')}</span> <span style="color:#eee;">${h.vendedor}</span>`;
        let highlightStyle = '';
        
        if (isVendaMinha) {
            statusTxt = `<span style="color:#10b981; font-weight:bold;">${marketT('market.historyYouSoldTo', { name: h.comprador })}</span>`;
            highlightStyle = 'border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.05);';
        } else if (isCompraMinha) {
            statusTxt = `<span style="color:#3b82f6; font-weight:bold;">${marketT('market.historyYouBoughtFrom', { name: h.vendedor })}</span>`;
            highlightStyle = 'border-left: 3px solid #3b82f6; background: rgba(59, 130, 246, 0.05);';
        } else {
            statusTxt = `<span style="color:#eee;">${marketT('market.historyGeneric', { seller: h.vendedor, buyer: h.comprador })}</span>`;
        }

        html += `
        <div class="market-card" style="padding: 8px 10px; gap: 10px; margin-bottom: 4px; pointer-events: none; ${highlightStyle}">
            <div class="market-card-icon" style="width: 32px; height: 32px; border-radius: 4px;">
                <img src="${item.img || item.icone || 'assets/icons/etc_etc_box_ot_i00.png'}" style="width: 24px; height: 24px;">
            </div>
            <div class="market-card-info" style="gap: 1px;">
                <div style="font-size: 0.8em; color: #fff; font-weight: bold;">${enchantTxt}${item.nome}${h.qtd > 1 ? ' x'+h.qtd : ''}</div>
                <div style="font-size: 0.65em; display: flex; align-items: center; gap: 4px;">
                    ${statusTxt}
                </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                <div style="color: ${corPreco}; font-size: 0.75em; font-weight: bold; display: flex; align-items: center; gap: 2px;">
                    ${h.preco.toLocaleString()} ${labelMoeda}
                </div>
                <div style="color: #555; font-size: 0.6em;">${horaTxt}</div>
            </div>
        </div>
        `;
    });
    listCont.innerHTML = html;
}

window.refreshMarketUiI18n = refreshMarketUiI18n;
