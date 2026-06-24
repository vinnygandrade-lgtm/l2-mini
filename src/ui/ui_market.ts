/**
 * UI — mercado global (Iron Gate)
 * Migrado: js/ui_market.js — Fase 4: tipos explícitos.
 */

import type {
  EquipInstance,
  MarketHistoryEntry,
  MarketHistoryFilter,
  MarketOperationResult,
  MarketPayoutRow,
  MarketSaleSelection,
  MarketSortOrder,
  MarketUiListingEntry,
  MarketUiTab,
} from '../types/game';

// --- Sistema de mercado global ---
// Seletor de item (Sell): docs/inventory-grid-layout.md — abrirSeletorItemMarket + _l2AppendInvGridSlot

let marketItems: MarketUiListingEntry[] = [];
let marketHistory: MarketHistoryEntry[] = [];
let marketFiltroAtual = 'all';
let marketFiltroHistorico: MarketHistoryFilter = 'global';
let marketOrdenacaoAtual: MarketSortOrder = 'newest';
let marketAbaAtual: MarketUiTab = 'buy';
let itemSelecionadoParaVenda: MarketSaleSelection | null = null;
let marketFiltroGrade = 'all';
let marketFiltroSubtipo = 'all';
let marketProcessando = false;
let marketInicializado = false;
let marketCloudLoadFailed = false;
/** IDs cancelados nesta sessão — evita fantasma até o refresh da nuvem. */
const marketHiddenListingIds = new Set<string>();

function marketHideListingId(id: string | number | null | undefined): void {
    if (id != null && String(id).trim() !== '') marketHiddenListingIds.add(String(id));
}

function marketApplyHiddenFilter(items: MarketUiListingEntry[]): MarketUiListingEntry[] {
    if (!marketHiddenListingIds.size) return items;
    return items.filter((i) => !marketHiddenListingIds.has(String(i.id)));
}

function marketT(key: string, params?: Record<string, string | number>): string {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

/**
 * Taxa 5% (arredondada para cima), alinhada ao Postgres em market_claim_payouts.
 * Preço 1: ceil(5%) daria 1 e zerava o vendedor — limitamos para no máximo (preço - 1).
 */
function mercadoCalcularTaxaVenda(gross: number): number {
    const g = Math.max(0, Math.floor(Number(gross) || 0));
    if (g < 1) return 0;
    const raw = Math.ceil(g * 0.05);
    const cap = Math.max(0, g - 1);
    return Math.min(raw, cap);
}

/** Limite de assunto do correio (ver window.enviarMail). */
function marketTruncMailSubject(str: string): string {
    return String(str).substring(0, 30);
}

/** Monta assunto localizado do correio do mercado. */
function marketAssuntoMail(keyId: string, nome: unknown): string {
    const raw = (nome != null && String(nome).trim() !== '') ? String(nome).trim() : marketT('market.categoryItemGeneric');
    return marketTruncMailSubject(marketT(keyId, { name: raw }));
}

function marketSortButtonText(): string {
    if (marketOrdenacaoAtual === 'price_low') return marketT('market.sortPriceLow');
    if (marketOrdenacaoAtual === 'price_high') return marketT('market.sortPriceHigh');
    return marketT('market.sortNewest');
}

function refreshMarketUiI18n(): void {
    const menu = document.getElementById('menu-social-market');
    if (!menu || menu.style.display !== 'flex') return;
    const btnS = document.getElementById('btn-sort-price');
    if (btnS) btnS.textContent = marketSortButtonText();
    if (marketAbaAtual === 'buy') renderizarListaMarket();
    else if (marketAbaAtual === 'sell') renderizarMeusLeiloes();
    else if (marketAbaAtual === 'history') renderizarHistoricoMercado();
    atualizarFeeMercado();
}

/** Mercado só com jogadores reais; com Supabase, listagens globais em market_cloud.js */
async function refreshMarketFromCloud(): Promise<void> {
    if (typeof window.MarketCloud === 'undefined' || !window.MarketCloud.isAvailable()) return;
    try {
        const meta = typeof window.MarketCloud.fetchListingsWithMeta === 'function'
            ? await window.MarketCloud.fetchListingsWithMeta()
            : { listings: await window.MarketCloud.fetchListings(), error: undefined as string | undefined };
        if (meta.error && meta.listings.length === 0) {
            marketCloudLoadFailed = true;
            window.mostrarAviso(marketT('market.loadFailed'));
            return;
        }
        marketCloudLoadFailed = false;
        const fetched = meta.listings;
        const fetchedIds = new Set(fetched.map((entry) => String(entry.id)));
        marketHiddenListingIds.forEach((hid) => {
            if (!fetchedIds.has(hid)) marketHiddenListingIds.delete(hid);
        });
        marketItems = marketApplyHiddenFilter(fetched as MarketUiListingEntry[]);
        if (marketAbaAtual === 'buy') renderizarListaMarket();
        else if (marketAbaAtual === 'sell') renderizarMeusLeiloes();
    } catch (e) {
        console.error('[Market] refresh cloud:', e);
        window.mostrarAviso(marketT('market.loadFailed'));
    }
}

function marketSetActionButtonBusy(busy: boolean): void {
    const btn = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled = busy;
    if (busy) {
        if (!btn.dataset.l2MarketPrevLabel) btn.dataset.l2MarketPrevLabel = btn.innerText;
        btn.innerText = marketT('market.processing');
    } else if (btn.dataset.l2MarketPrevLabel) {
        btn.innerText = btn.dataset.l2MarketPrevLabel;
        delete btn.dataset.l2MarketPrevLabel;
    }
}

function marketSetRegisterButtonBusy(busy: boolean): void {
    const btn = document.querySelector('#janela-market-registrar .btn-store-action') as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled = busy;
    if (busy) {
        if (!btn.dataset.l2MarketPrevLabel) btn.dataset.l2MarketPrevLabel = btn.innerText;
        btn.innerText = marketT('market.processing');
    } else if (btn.dataset.l2MarketPrevLabel) {
        btn.innerText = btn.dataset.l2MarketPrevLabel;
        delete btn.dataset.l2MarketPrevLabel;
    }
}

/** Mensagem amigável para erros da RPC do mercado (nuvem). */
function mensagemErroMercadoNuvem(result: MarketOperationResult | null | undefined): string {
    if (!result || result.ok !== false) return marketT('market.errCloudGeneric');
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
    if (code === 'not_authenticated') return marketT('market.errCancelAuth');
    if (code === 'seller_not_owner') return marketT('market.errCancelSeller');
    if (code === 'invalid_params') return marketT('market.errCloudGeneric');
    if (code === 'cancel_failed') return marketT('market.cancelFailed');
    if (code === 'rpc_error' && result.message) return marketT('market.errRpcMsg', { message: result.message });
    if (code === 'rpc_error') return marketT('market.errRpcSql');
    return marketT('market.errCloudGeneric');
}

/** Serializa equip para anexo de correio (cópia para armazenamento local). */
function mercadoSerializarItemParaCorreio(fullItem: unknown): unknown {
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
async function mercadoEnviarCorreioComprador(finalEntry: MarketUiListingEntry): Promise<void> {
    if (typeof window.enviarMail !== 'function' || !window.charName) return;
    const snap = finalEntry.item || {};
    const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
    const assunto = marketAssuntoMail('market.mailSubjectParcel', nome);
    
    // Agora usa await para garantir que o envio (possivelmente via RPC) seja concluído
    await window.enviarMail(window.charName, marketT('market.mailSender'), assunto, 'market', {
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
async function mercadoEnviarCorreioVendaLocal(finalEntry: MarketUiListingEntry): Promise<void> {
    if (typeof window.enviarMail !== 'function') return;
    const snap = finalEntry.item || {};
    const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
    const gross = Number(finalEntry.preco) || 0;
    const tax = mercadoCalcularTaxaVenda(gross);
    const net = Math.max(0, gross - tax);
    const assunto = marketAssuntoMail('market.mailSubjectSold', nome);
    
    await window.enviarMail(finalEntry.vendedor, marketT('market.mailSender'), assunto, 'market', {
        marketKind: 'sale_proceeds',
        valor: net,
        moeda: finalEntry.moeda === 'coin' ? 'coin' : 'adena',
        gross,
        tax,
        buyerName: window.charName
    });
}

/** Vendedor: credita vendas na nuvem via RPC (taxa 5% já aplicada no servidor). */
async function aplicarPayoutsMercadoNuvem(): Promise<void> {
    if (typeof window.MarketCloud === 'undefined' || !window.MarketCloud.isAvailable() || !window.charName) return;
    try {
        const res = await window.MarketCloud.claimPendingPayouts(window.charName);
        if (res.ok !== true) {
            if (res.error && res.error !== 'claim_failed') {
                console.warn('[Market] claim payout:', res.error, res.details || res.message || '');
            }
            return;
        }
        if (!('payouts' in res) || !res.payouts?.length) return;

        for (const raw of res.payouts) {
            const p = raw as MarketPayoutRow;
            const net = Number(p.net) || 0;
            const moeda = p.currency === 'coin' ? 'coin' : 'adena';
            const snap = p.item_snapshot || {};
            const nome = snap.nome != null && String(snap.nome).trim() !== '' ? String(snap.nome).trim() : marketT('market.categoryItemGeneric');
            const tax = p.tax != null ? Number(p.tax) : null;
            const gross = p.gross != null ? Number(p.gross) : null;
            const assuntoVenda = marketAssuntoMail('market.mailSubjectSold', nome);
            if (typeof window.enviarMail === 'function') {
                await window.enviarMail(window.charName, marketT('market.mailSender'), assuntoVenda, 'market', {
                    marketKind: 'sale_proceeds',
                    valor: net,
                    moeda,
                    gross,
                    tax,
                    buyerName: p.buyer_char_name || '—'
                });
            }
            if (typeof window.escreverLog === 'function') {
                const safeNome = String(nome).replace(/[<>]/g, '');
                window.escreverLog(`<span style="color:#ca8a04;">${marketT('market.mailLogPrefix')}</span> <span style="color:#a8a29e;">${marketT('market.payoutLog', { name: safeNome })}</span>`);
            }
        }

        if (typeof window.salvarJogo === 'function') window.salvarJogo();
        if (typeof window.atualizar === 'function') window.atualizar();
        if (typeof window.mostrarAviso === 'function') {
            window.mostrarAviso(marketT('market.payoutMailbox'));
        }
    } catch (e) {
        console.error('[Market] payout:', e);
    }
}

function iniciarSistemaMercado(): void {
    if (marketInicializado) {
        if (typeof window.atualizarIconeMailbox === 'function') void window.atualizarIconeMailbox();
        if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) {
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
        if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) {
            try {
                marketItems = await window.MarketCloud.fetchListings() as MarketUiListingEntry[];
                marketInicializado = true;
                window.MarketCloud.subscribeListings(() => {
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
        if (typeof window.atualizarIconeMailbox === 'function') void window.atualizarIconeMailbox();
    })();
}

function gerarItensIniciaisMercado(): void {
    marketItems = [];
    marketInicializado = true;
    salvarMercado();
}

function salvarMercado(): void {
    if (typeof window.MarketCloud === 'undefined' || !window.MarketCloud.isAvailable()) {
        localStorage.setItem('l2mini_market', JSON.stringify(marketItems));
    }
    localStorage.setItem('l2mini_market_history', JSON.stringify(marketHistory));
}

function mudarAbaMarket(aba: MarketUiTab | string): void {
    marketAbaAtual = aba as MarketUiTab;
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
        if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) aplicarPayoutsMercadoNuvem();
    }
    else if (aba === 'history') renderizarHistoricoMercado();
}

function filtrarMarket(categoria: string): void {
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

function filtrarMarketGrade(grade: string): void {
    marketFiltroGrade = grade;
    atualizarVisualSubfiltros();
    renderizarListaMarket();
}

function filtrarMarketSubtipo(subtipo: string): void {
    marketFiltroSubtipo = subtipo;
    atualizarVisualSubfiltros();
    renderizarListaMarket();
}

function atualizarVisualSubfiltros(): void {
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

function toggleSortMarket(): void {
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

function renderizarListaMarket(): void {
    const listCont = document.getElementById('market-list');
    const searchInput = document.getElementById('market-search-input') as HTMLInputElement | null;
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
        const isMeuItem = entry.vendedor === window.charName;
        const labelMoeda = entry.moeda === 'adena' ? '<div class="coin-icon coin-adena"></div>' : '<div class="coin-icon coin-ancient"></div>';
        const corPreco = entry.moeda === 'adena' ? '#facc15' : '#60a5fa';
        const enchantTxt = entry.enchant > 0 ? `<span style="color:#38bdf8;">+${entry.enchant}</span> ` : '';
        const gradeTxt = item.grade
            ? ((typeof window.buildGradeTagHtml === 'function')
                ? window.buildGradeTagHtml(item.grade)
                : `<span style="color:${getCorGrade(item.grade)}; font-size: 0.8em; margin-left: 5px;">[${item.grade}]</span>`)
            : '';

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

function executarCompraMarket(id: string | number): void {
    if (marketProcessando) return;

    const index = marketItems.findIndex(i => String(i.id) === String(id));
    if (index === -1) {
        window.fecharJanelaAcao();
        return window.mostrarAviso(marketT('market.itemUnavailable'));
    }

    const entry = marketItems[index];

    if (entry.vendedor === window.charName) {
        return window.mostrarAviso(marketT('market.cannotBuyOwn'));
    }

    if (typeof window.MarketCloud === 'undefined' || !window.MarketCloud.isAvailable()) {
        if (entry.moeda === 'adena') {
            if (window.adenas < entry.preco) return window.mostrarAviso(marketT('market.notEnoughAdena'));
        } else {
            if (typeof window.ancientCoins === 'undefined') window.ancientCoins = 0;
            if (window.ancientCoins < entry.preco) return window.mostrarAviso(marketT('market.notEnoughCoins'));
        }
    }

    marketProcessando = true;
    marketSetActionButtonBusy(true);

    (async () => {
        try {
            let finalEntry: MarketUiListingEntry = entry;
            let saldoJaDebitadoNaNuvem = false;

            if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) {
                const purchase = await window.MarketCloud.completePurchase(String(id), window.charName || '');
                if (!purchase.ok) {
                    window.fecharJanelaAcao();
                    await refreshMarketFromCloud();
                    window.mostrarAviso(mensagemErroMercadoNuvem(purchase));
                    return;
                }
                if ('entry' in purchase) finalEntry = purchase.entry as MarketUiListingEntry;
                if ('balances' in purchase && purchase.balances) {
                    window.adenas = Number(purchase.balances.adenas) || 0;
                    window.ancientCoins = Number(purchase.balances.ancientCoins) || 0;
                    saldoJaDebitadoNaNuvem = true;
                }
                if (typeof window.syncMoedasInventarioComCarteira === 'function') {
                    window.syncMoedasInventarioComCarteira();
                }
                if (typeof window.atualizar === 'function') window.atualizar();
            }

            registrarHistoricoMercado({
                vendedor: finalEntry.vendedor,
                comprador: window.charName,
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
                    window.adenas -= finalEntry.preco;
                } else {
                    window.ancientCoins -= finalEntry.preco;
                }
            }

            if (typeof window.MarketCloud === 'undefined' || !window.MarketCloud.isAvailable()) {
                await mercadoEnviarCorreioVendaLocal(finalEntry);
                await mercadoEnviarCorreioComprador(finalEntry);
            }
            // Nuvem: servidor insere purchase_delivery + sale_proceeds na mailbox (evita duplicar / cliente sem RLS insert)

            window.fecharJanelaAcao();
            renderizarListaMarket();
            window.atualizar();
            window.mostrarAviso(marketT('market.tradeRegistered'));
            window.escreverLog(`<span style="color:#ca8a04;">${marketT('market.mailLogPrefix')}</span> <span style="color:#d6d3d1;">${marketT('market.tradeLogBroker')}</span>`);
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } finally {
            marketProcessando = false;
            marketSetActionButtonBusy(false);
        }
    })();
}

function renderizarMeusLeiloes(): void {
    const cont = document.getElementById('market-my-listings');
    if(!cont) return;

    let meus = marketItems.filter(i => i.vendedor === window.charName);
    
    if (meus.length === 0) {
        cont.innerHTML = '<div class="market-empty-msg">' + marketT('market.emptyMyAuctions') + '</div>';
        return;
    }

    let html = '';
    meus.forEach(entry => {
        const item = entry.item;
        const idEsc = JSON.stringify(String(entry.id));
        const gradeTxt = item.grade
            ? ((typeof window.buildGradeTagHtml === 'function')
                ? window.buildGradeTagHtml(item.grade)
                : `<span style="color:${getCorGrade(item.grade)}; font-size: 0.8em; margin-left: 5px;">[${item.grade}]</span>`)
            : '';
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

function cancelarLeilao(id: string | number): void {
    if (marketProcessando) return;

    const index = marketItems.findIndex(i => String(i.id) === String(id));
    if (index === -1) return;

    const entry = marketItems[index];
    if (entry.vendedor !== window.charName) return;

    marketProcessando = true;
    marketSetActionButtonBusy(true);

    (async () => {
        try {
            if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) {
                const cancel = await window.MarketCloud.cancelListing(String(id), window.charName || '');
                if (cancel.ok !== true) {
                    await refreshMarketFromCloud();
                    window.mostrarAviso(mensagemErroMercadoNuvem(cancel));
                    return;
                }
                marketHideListingId(id);
                await refreshMarketFromCloud();
            } else {
                marketItems.splice(index, 1);
                marketHideListingId(id);
                salvarMercado();
            }

            if (entry.categoria === 'equips') {
                const itemParaDevolver = entry.fullItem || {
                    tipo: entry.item.tipoItem || entry.item.tipo || 'armor',
                    base: entry.item,
                    enchant: entry.enchant
                };
                window.InventoryManager.adicionarEquipamento(itemParaDevolver as EquipInstance);
            } else {
                const nomeItem = entry.item.nome || '';
                window.inventario[nomeItem] = (window.inventario[nomeItem] || 0) + entry.qtd;
            }

            renderizarMeusLeiloes();
            renderizarListaMarket();
            window.atualizar();
            window.mostrarAviso(marketT('market.listingCanceled'));
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } finally {
            marketProcessando = false;
            marketSetActionButtonBusy(false);
        }
    })();
}

function abrirModalRegistrarMercado(): void {
    itemSelecionadoParaVenda = null;
    const slot = document.getElementById('market-reg-slot');
    const nomeEl = document.getElementById('market-reg-nome');
    const descEl = document.getElementById('market-reg-desc');
    const priceInput = document.getElementById('input-market-price') as HTMLInputElement | null;
    const qtdInput = document.getElementById('input-market-qtd') as HTMLInputElement | null;
    const qtdCont = document.getElementById('market-reg-qtd-container');
    if (slot) slot.innerHTML = '<span style="font-size: 20px; color: #555;">+</span>';
    if (nomeEl) nomeEl.innerText = marketT('market.selectItemPlaceholder');
    if (descEl) descEl.innerText = marketT('market.tapSlotDesc');
    window.abrirModal('janela-market-registrar', 1700);
    if (priceInput) priceInput.value = '1000';
    if (qtdInput) qtdInput.value = '1';
    if (qtdCont) qtdCont.style.display = 'none';
    atualizarFeeMercado();
}

function fecharModalRegistrarMercado(): void {
    window.fecharModal('janela-market-registrar');
}

/** Equipamento na bolsa com campos legados usados pelo seletor de leilão. */
type MarketBagEquip = EquipInstance & Record<string, unknown>;

function _marketCatalogFindByName(nome: string): { id?: string; nome?: string; img?: string } | undefined {
    if (typeof window.catalogoMateriais !== 'undefined') {
        const hit = window.catalogoMateriais.find((m) => {
            const row = m as { id?: string; nome?: string; img?: string };
            return row.id === nome || row.nome === nome;
        }) as { id?: string; nome?: string; img?: string } | undefined;
        if (hit) return hit;
    }
    if (typeof window.catalogoConsumiveis !== 'undefined') {
        return window.catalogoConsumiveis.find((c) => {
            const row = c as { id?: string; nome?: string; img?: string };
            return row.id === nome || row.nome === nome;
        }) as { id?: string; nome?: string; img?: string } | undefined;
    }
    return undefined;
}
// Spec: docs/inventory-grid-layout.md § Leilão — seletor de item
function _marketResolveStackItemImg(nome: string): string {
    const kMoedaAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    let imgSrc = 'assets/itens/item_generic.png';
    const dadosItem = _marketCatalogFindByName(nome);
    if (dadosItem?.img) imgSrc = dadosItem.img;
    else {
        if (nome.indexOf('Potion') !== -1) imgSrc = 'assets/itens/pot_hp.png';
        else if (nome.indexOf('Recipe') !== -1) imgSrc = 'assets/itens/recipe_s.png';
        else if (nome.indexOf('Ancient') !== -1) imgSrc = 'assets/itens/ancient_coin.png';
        else if (nome === kMoedaAd) imgSrc = 'assets/itens/adena_coin.png';
    }
    return imgSrc;
}

function abrirSeletorItemMarket(): void {
    const grid = document.getElementById('market-seletor-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (typeof window._l2AppendInvGridSlot !== 'function' || typeof window._l2InvIconFrameHtml !== 'function') {
        console.warn('[Market] inventory grid helpers missing — reload client.');
        return;
    }

    // 1. Equipamentos (instâncias: nome/img em .base — mesmo padrão que ui_inventory.js)
    window.inventarioEquips.forEach((rawItem, index) => {
        const item = rawItem as MarketBagEquip | null;
        if (!item) return;
        const base = (item.base || item) as Record<string, unknown>;
        if (!base.nome) return;

        const imgSrc = String(base.img || item.img || 'assets/itens/item_generic.png');
        const enc = item.enchant !== undefined
            ? item.enchant
            : Number(item.enchantArmor || item.enchantJewel || 0);
        const labelPlus = enc > 0 ? `<div class="enchant-label">+${enc}</div>` : '';
        const badgeAugment = (item.augmented || base.augmented)
            ? '<div class="augment-label" style="background:#a855f7;"></div>'
            : '';
        const innerHtml = badgeAugment + window._l2InvIconFrameHtml(imgSrc) + labelPlus;

        window._l2AppendInvGridSlot(grid, 'inv-slot', innerHtml, function () {
            preverItemParaVenda(item, 'equips', index);
        }, String(base.nome));
    });

    const kMad = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    const kMac = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';

    // 2. Materiais / consumíveis empilháveis
    for (let nome in window.inventario) {
        let qtd = window.inventario[nome];
        if (nome === kMad || nome === kMac) continue;
        if (nome && nome !== 'undefined' && nome !== 'null' && qtd > 0) {
            const imgSrc = _marketResolveStackItemImg(nome);
            const innerHtml = window._l2InvIconFrameHtml(imgSrc) + `<div class="inv-qtd">${qtd}</div>`;
            window._l2AppendInvGridSlot(grid, 'inv-slot', innerHtml, function () {
                preverItemParaVenda({ nome: nome, img: imgSrc }, 'mats', nome);
            }, nome);
        }
    }

    if (grid.children.length === 0) {
        grid.innerHTML = '<div class="market-seletor-empty">' + marketT('market.inventoryEmpty') + '</div>';
    }

    window.abrirModal('janela-market-seletor', 1800);
}

function preverItemParaVenda(
    item: EquipInstance | Record<string, unknown> | null | undefined,
    categoria: 'equips' | 'mats',
    indexOuNome: number | string
): void {
    if (!item) return;

    window.abrirModal('janela-item-acao', 2100);
    const titulo = document.getElementById('acao-titulo');
    const acaoImg = document.getElementById('acao-img') as HTMLImageElement | null;
    const acaoDesc = document.getElementById('acao-desc');
    if (titulo) titulo.innerText = marketT('market.confirmSelection');

    let info = '';
    if (categoria === 'equips' && typeof window.formatarTooltipEquipamento === 'function') {
        const equip = item as MarketBagEquip;
        const itemBase = (equip.base || equip) as Record<string, unknown>;
        const tipoBruto = equip.tipo || itemBase.tipoItem || itemBase.tipo || 'misc';
        const enc = equip.enchant !== undefined
            ? equip.enchant
            : Number(equip.enchantArmor || equip.enchantJewel || 0);
        const isAug = !!(equip.augmented || itemBase.augmented);
        if (acaoImg) acaoImg.src = String(itemBase.img || equip.img || 'assets/icons/etc_etc_box_ot_i00.png');
        info = window.formatarTooltipEquipamento(
            itemBase as Parameters<typeof window.formatarTooltipEquipamento>[0],
            enc,
            isAug,
            String(tipoBruto),
            equip
        );
    } else {
        const mat = item as Record<string, unknown>;
        if (acaoImg) acaoImg.src = String(mat.img || 'assets/icons/etc_etc_box_ot_i00.png');
        const nomeMat = String(mat.nome || '');
        const totalDisp = window.inventario[nomeMat] || 0;
        info = `<div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">${nomeMat}</div>`;
        info += `<div style="color:#aaa; font-size:0.9em;">${marketT('market.categoryMatMisc')}</div>`;
        info += `<div style="color:#10b981; font-size:0.9em; margin-top:5px;">${marketT('market.availableInBag', { n: totalDisp })}</div>`;
    }

    if (acaoDesc) acaoDesc.innerHTML = info;
    
    const btnAcao = document.getElementById('btn-acao-item');
    if (btnAcao) {
        btnAcao.style.display = 'block';
        btnAcao.innerText = marketT('market.selectThisItem');
        btnAcao.style.background = '#15803d';
        btnAcao.onclick = () => {
            selecionarItemParaMarket(item, categoria, indexOuNome);
            window.fecharJanelaAcao();
        };
    }
}

function selecionarItemParaMarket(
    item: EquipInstance | Record<string, unknown>,
    categoria: 'equips' | 'mats',
    indexOuNome: number | string
): void {
    itemSelecionadoParaVenda = { item, categoria, ref: indexOuNome };

    const equip = item as MarketBagEquip;
    const baseUi = (categoria === 'equips' && equip.base) ? equip.base : (equip.base || equip);
    const nomeUi = String((baseUi as Record<string, unknown>).nome || equip.nome || '');
    const imgUi = String((baseUi as Record<string, unknown>).img || equip.img || '');

    const slot = document.getElementById('market-reg-slot');
    const nomeEl = document.getElementById('market-reg-nome');
    const descEl = document.getElementById('market-reg-desc');
    const qtdCont = document.getElementById('market-reg-qtd-container');
    const qtdInput = document.getElementById('input-market-qtd') as HTMLInputElement | null;

    if (slot) {
        slot.innerHTML = imgUi
            ? `<img src="${imgUi}" style="width:100%; height:100%; object-fit:contain;">`
            : `<div style="font-size:10px; color:#aaa; text-align:center; padding: 2px;">${nomeUi}</div>`;
    }
    const encLabel = equip.enchant !== undefined
        ? equip.enchant
        : Number(equip.enchantArmor || equip.enchantJewel || 0);
    if (nomeEl) nomeEl.innerText = (encLabel > 0 ? '+' + encLabel + ' ' : '') + nomeUi;
    if (descEl) descEl.innerText = categoria === 'equips' ? marketT('market.equipmentItem') : marketT('market.stackableMaterial');

    if (categoria === 'mats') {
        const nomeMat = String(equip.nome || '');
        if (qtdCont) qtdCont.style.display = 'flex';
        if (qtdInput) {
            qtdInput.max = String(window.inventario[nomeMat] || 0);
            qtdInput.value = '1';
        }
    } else if (qtdCont) {
        qtdCont.style.display = 'none';
    }

    fecharSeletorItemMarket();
}

function fecharSeletorItemMarket(): void {
    window.fecharModal('janela-market-seletor');
}

function cliqueSlotRegistroMarket(): void {
    if (!itemSelecionadoParaVenda) {
        abrirSeletorItemMarket();
    } else {
        preverItemParaVenda(itemSelecionadoParaVenda.item, itemSelecionadoParaVenda.categoria, itemSelecionadoParaVenda.ref);
        const btn = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
        if (!btn) return;
        btn.innerText = marketT('market.changeItem');
        btn.style.background = '#ca8a04';
        btn.onclick = () => {
            itemSelecionadoParaVenda = null;
            const slot = document.getElementById('market-reg-slot');
            const nomeEl = document.getElementById('market-reg-nome');
            if (slot) slot.innerHTML = '<span style="font-size: 20px; color: #555;">+</span>';
            if (nomeEl) nomeEl.innerText = marketT('market.selectItemPlaceholder');
            window.fecharJanelaAcao();
            abrirSeletorItemMarket();
        };
    }
}

function confirmarRegistroMarket(): void {
    if (marketProcessando) return;
    if (!itemSelecionadoParaVenda) return window.mostrarAviso(marketT('market.selectItemAlert'));

    const priceInput = document.getElementById('input-market-price') as HTMLInputElement | null;
    const currencySelect = document.getElementById('select-market-currency') as HTMLSelectElement | null;
    const qtdInput = document.getElementById('input-market-qtd') as HTMLInputElement | null;

    const preco = parseInt(priceInput?.value || '', 10);
    const moeda = currencySelect?.value || 'adena';
    const qtd = itemSelecionadoParaVenda.categoria === 'mats' ? parseInt(qtdInput?.value || '', 10) : 1;

    if (isNaN(preco) || preco <= 0) return window.mostrarAviso(marketT('market.invalidPrice'));
    if (isNaN(qtd) || qtd <= 0) return window.mostrarAviso(marketT('market.invalidQty'));

    marketProcessando = true;
    marketSetRegisterButtonBusy(true);

    let fullItemParaVenda: EquipInstance | null = null;
    if (itemSelecionadoParaVenda.categoria === 'equips') {
        const refIdx = itemSelecionadoParaVenda.ref as number;
        fullItemParaVenda = window.inventarioEquips[refIdx] ?? null;
        if (fullItemParaVenda !== itemSelecionadoParaVenda.item) {
            marketProcessando = false;
            marketSetRegisterButtonBusy(false);
            return window.mostrarAviso(marketT('market.inventorySyncError'));
        }
        window.inventarioEquips.splice(refIdx, 1);
    } else {
        const nomeMat = String((itemSelecionadoParaVenda.item as Record<string, unknown>).nome || '');
        if ((window.inventario[nomeMat] || 0) < qtd) {
            marketProcessando = false;
            marketSetRegisterButtonBusy(false);
            return window.mostrarAviso(marketT('market.notEnoughQty'));
        }
        window.inventario[nomeMat] -= qtd;
    }

    const rollbackInv = (): void => {
        if (itemSelecionadoParaVenda!.categoria === 'equips') {
            window.inventarioEquips.splice(itemSelecionadoParaVenda!.ref as number, 0, fullItemParaVenda!);
        } else {
            const nomeMat = String((itemSelecionadoParaVenda!.item as Record<string, unknown>).nome || '');
            window.inventario[nomeMat] = (window.inventario[nomeMat] || 0) + qtd;
        }
    };

    (async () => {
        try {
            const raw = itemSelecionadoParaVenda.item as EquipInstance & Record<string, unknown>;
            const rawBase = raw.base as Record<string, unknown> | undefined;
            const item_snapshot = {
                nome: raw.nome || (rawBase && rawBase.nome) || 'Item',
                img: raw.img || (rawBase && rawBase.img),
                icone: raw.icone || (rawBase && rawBase.icone),
                grade: raw.grade || (rawBase && rawBase.grade),
                tipo: raw.tipo || (rawBase && rawBase.tipo),
                tipoItem: raw.tipoItem || (rawBase && rawBase.tipoItem),
                preco: raw.preco != null ? raw.preco : (rawBase && rawBase.preco)
            };

            if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable()) {
                let fullJson: unknown = null;
                try {
                    fullJson = fullItemParaVenda ? JSON.parse(JSON.stringify(fullItemParaVenda)) : null;
                } catch (_e) {
                    fullJson = fullItemParaVenda;
                }
                const pub = await window.MarketCloud.publishListing({
                    seller_char_name: window.charName || '',
                    price: preco,
                    currency: moeda,
                    categoria: itemSelecionadoParaVenda.categoria,
                    qtd: qtd,
                    enchant: Number(raw.enchant) || 0,
                    item_snapshot: item_snapshot as Record<string, unknown>,
                    full_item: fullJson
                });
                if (pub.ok !== true) {
                    rollbackInv();
                    if (pub.error === 'insufficient_listing_fee') {
                        const req = pub.details && pub.details.required != null ? pub.details.required : window.MarketCloud.LISTING_FEE_ADENA;
                        window.mostrarAviso(marketT('market.listingFeeInsufficient', { fee: req }));
                    } else if (pub.error === 'rpc_error' && pub.message) {
                        window.mostrarAviso(marketT('market.errRpcMsg', { message: pub.message }));
                    } else {
                        window.mostrarAviso(marketT('market.publishCloudFail'));
                    }
                    return;
                }
                if ('balances' in pub && pub.balances) {
                    window.adenas = Number(pub.balances.adenas) || 0;
                    window.ancientCoins = Number(pub.balances.ancientCoins) || 0;
                }
                if (typeof window.syncMoedasInventarioComCarteira === 'function') {
                    window.syncMoedasInventarioComCarteira();
                }
                if (typeof window.atualizar === 'function') window.atualizar();
                await refreshMarketFromCloud();
            } else {
                const selItem = itemSelecionadoParaVenda.item as Record<string, unknown>;
                marketItems.push({
                    id: Date.now() + Math.random(),
                    vendedor: window.charName || '',
                    isBot: false,
                    item: { ...selItem } as MarketUiListingEntry['item'],
                    fullItem: fullItemParaVenda,
                    enchant: Number(selItem.enchant) || 0,
                    preco: preco,
                    moeda: moeda,
                    categoria: itemSelecionadoParaVenda.categoria,
                    qtd: qtd
                });
                salvarMercado();
            }

            window.fecharModalRegistrarMercado();
            mudarAbaMarket('sell');
            window.mostrarAviso(marketT('market.listedSuccess'));
            window.atualizar();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } finally {
            marketProcessando = false;
            marketSetRegisterButtonBusy(false);
        }
    })();
}

function atualizarFeeMercado(): void {
    const priceInput = document.getElementById('input-market-price') as HTMLInputElement | null;
    const preco = parseInt(priceInput?.value || '', 10) || 0;
    const fee = mercadoCalcularTaxaVenda(preco);
    const wrap = document.getElementById('market-fee-info');
    if (wrap) {
        let html = marketT('market.feeLine') + ' <span id="market-fee-val">' + fee + '</span>';
        if (typeof window.MarketCloud !== 'undefined' && window.MarketCloud.isAvailable && window.MarketCloud.isAvailable()) {
            html += '<div style="margin-top:4px;color:#94a3b8;font-size:0.95em;">' +
                marketT('market.listingFeePublisher', { fee: window.MarketCloud.LISTING_FEE_ADENA }) + '</div>';
        }
        wrap.innerHTML = html;
    }
}

document.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (target?.id === 'input-market-price') atualizarFeeMercado();
});

function setMarketRegMaxQtd(): void {
    if (itemSelecionadoParaVenda && itemSelecionadoParaVenda.categoria === 'mats') {
        const qtdInput = document.getElementById('input-market-qtd') as HTMLInputElement | null;
        const nomeMat = String((itemSelecionadoParaVenda.item as Record<string, unknown>).nome || '');
        if (qtdInput) qtdInput.value = String(window.inventario[nomeMat] || 0);
    }
}

function abrirAcaoItemMarket(id: string | number): void {
    const entry = marketItems.find(i => String(i.id) === String(id));
    if (!entry) return;

    const item = entry.item;
    const displaySource = (entry.fullItem || item) as EquipInstance & Record<string, unknown>;
    const itemBaseParaTip = (displaySource.base || displaySource) as Record<string, unknown>;
    const enchant = entry.enchant || Number(displaySource.enchant) || 0;
    const isAug = !!(displaySource.augmented || (displaySource.base && (displaySource.base as Record<string, unknown>).augmented));
    const tipo = String(
        displaySource.tipo
        || (displaySource.base && ((displaySource.base as Record<string, unknown>).tipoItem || (displaySource.base as Record<string, unknown>).tipo))
        || item.tipoItem || item.tipo || 'misc'
    );

    window.abrirModal('janela-item-acao', 2100);

    const tit = document.getElementById('acao-titulo');
    const img = document.getElementById('acao-img') as HTMLImageElement | null;
    const desc = document.getElementById('acao-desc');
    const btn = document.getElementById('btn-acao-item');

    if(tit) tit.innerText = marketT('market.marketItemInfo');
    if (img) {
        img.src = String(
            (itemBaseParaTip && itemBaseParaTip.img) || item.img || item.icone || 'assets/icons/etc_etc_box_ot_i00.png'
        );
    }
    
    let info = '';
    if (entry.categoria === 'equips' && typeof window.formatarTooltipEquipamento === 'function' && itemBaseParaTip.nome) {
        info = window.formatarTooltipEquipamento(
            itemBaseParaTip as Parameters<typeof window.formatarTooltipEquipamento>[0],
            enchant,
            isAug,
            tipo,
            (entry.fullItem || displaySource) as EquipInstance
        );
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
        const isMeuItem = entry.vendedor === window.charName;
        if (isMeuItem) {
            btn.style.display = 'block';
            btn.innerText = marketT('market.btnCancelAuction');
            btn.style.background = '#991b1b';
            btn.onclick = () => {
                cancelarLeilao(id);
                window.fecharJanelaAcao();
            };
        } else {
            btn.style.display = 'block';
            btn.innerText = marketT('market.btnConfirmPurchase');
            btn.style.background = '#15803d';
            btn.onclick = () => { void executarCompraMarket(id); };
        }
    }
}

function getCorGrade(grade: unknown): string {
    if (typeof window.getGradeColor === 'function') return window.getGradeColor(grade);
    if (typeof window.getCorGrade === 'function') return window.getCorGrade(grade);
    return '#b5b3ae';
}

// --- Histórico de transações do mercado ---

function registrarHistoricoMercado(entry: MarketHistoryEntry): void {
    marketHistory.unshift(entry); // Adiciona no início (mais recente primeiro)
    
    // Limita o histórico global para não crescer infinitamente (ex: 100 entradas)
    if (marketHistory.length > 100) {
        marketHistory.pop();
    }
    
    salvarMercado();
}

function filtrarHistorico(tipo: MarketHistoryFilter | string): void {
    marketFiltroHistorico = tipo as MarketHistoryFilter;
    const btnGlobal = document.getElementById('btn-history-global');
    const btnPersonal = document.getElementById('btn-history-personal');
    
    if (btnGlobal) btnGlobal.classList.toggle('active', tipo === 'global');
    if (btnPersonal) btnPersonal.classList.toggle('active', tipo === 'personal');
    
    renderizarHistoricoMercado();
}

function renderizarHistoricoMercado(): void {
    const listCont = document.getElementById('market-history-list');
    if (!listCont) return;

    let filtrados = marketHistory;
    if (marketFiltroHistorico === 'personal') {
        filtrados = marketHistory.filter(h => h.vendedor === window.charName || h.comprador === window.charName);
    }

    if (filtrados.length === 0) {
        listCont.innerHTML = `<div class="market-empty-msg">${marketT('market.emptyHistory')}</div>`;
        return;
    }

    let html = '';
    filtrados.forEach(h => {
        const item = h.item;
        const isVendaMinha = h.vendedor === window.charName;
        const isCompraMinha = h.comprador === window.charName;
        
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
window.iniciarSistemaMercado = iniciarSistemaMercado;
window.verificarPagamentosPendentes = function verificarPagamentosPendentes() {
    void aplicarPayoutsMercadoNuvem();
};
window.mudarAbaMarket = mudarAbaMarket;
window.filtrarMarket = filtrarMarket;
window.filtrarMarketGrade = filtrarMarketGrade;
window.filtrarMarketSubtipo = filtrarMarketSubtipo;
window.toggleSortMarket = toggleSortMarket;
window.abrirAcaoItemMarket = abrirAcaoItemMarket;
window.executarCompraMarket = executarCompraMarket;
window.cancelarLeilao = cancelarLeilao;
window.abrirModalRegistrarMercado = abrirModalRegistrarMercado;
window.fecharModalRegistrarMercado = fecharModalRegistrarMercado;
window.cliqueSlotRegistroMarket = cliqueSlotRegistroMarket;
window.confirmarRegistroMarket = confirmarRegistroMarket;
window.setMarketRegMaxQtd = setMarketRegMaxQtd;
window.fecharSeletorItemMarket = fecharSeletorItemMarket;
window.filtrarHistorico = filtrarHistorico;

export {};
