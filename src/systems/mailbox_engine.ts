/**
 * MAILBOX_ENGINE — correio, notificações e recompensas.
 * Migrado: js/systems/mailbox_engine.js — Fase 4: tipos explícitos.
 */

import type {
  CloudMailboxRow,
  EnviarMailFn,
  EquipRawInput,
  ItemCatalogBase,
  MailboxData,
  MailboxEngineApi,
  MailboxMessage,
} from '../types/game';
import { registerGlobal } from '../runtime/register-global';

let mailboxAbaAtual: 'inbox' | 'history' = 'inbox';
let mailboxDados: MailboxData = { inbox: [], history: [] };
let mailboxCollecting = false;

function mailboxCloudErrorMessage(err: unknown): string {
    if (typeof window.cloudRpcMessage === 'function') {
        return window.cloudRpcMessage(err, { prefix: 'game.cloud' });
    }
    return mb('game.cloud.error');
}

function mb(key: string, params?: Record<string, string | number>): string {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

function mailInputValue(id: string): string {
    const el = document.getElementById(id);
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : '';
}

function setMailInputValue(id: string, value: string | number): void {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = String(value);
    }
}

/** Unifica payload do correio (nuvem JSONB, snake_case, string serializada). */
function normalizeMailboxDetails(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    let o = raw;
    if (typeof o === 'string') {
        try {
            o = JSON.parse(o);
        } catch (e) {
            return {};
        }
    }
    if (typeof o !== 'object' || Array.isArray(o)) return {};
    const row = o as Record<string, unknown>;
    let fullItem = row.fullItem != null ? row.fullItem : row.full_item;
    if (typeof fullItem === 'string') {
        try {
            fullItem = JSON.parse(fullItem);
        } catch (e) {
            fullItem = null;
        }
    }
    let itemSnapshot = row.itemSnapshot != null ? row.itemSnapshot : row.item_snapshot;
    if (typeof itemSnapshot === 'string') {
        try {
            itemSnapshot = JSON.parse(itemSnapshot);
        } catch (e) {
            itemSnapshot = {};
        }
    }
    if (!itemSnapshot || typeof itemSnapshot !== 'object' || Array.isArray(itemSnapshot)) itemSnapshot = {};
    const snapObj = itemSnapshot as Record<string, unknown>;
    const fullItemObj = fullItem && typeof fullItem === 'object' && !Array.isArray(fullItem)
        ? (fullItem as Record<string, unknown>)
        : null;
    const base = fullItemObj && fullItemObj.base && typeof fullItemObj.base === 'object' && !Array.isArray(fullItemObj.base)
        ? (fullItemObj.base as Record<string, unknown>)
        : null;
    if (!snapObj.nome && base && base.nome) snapObj.nome = base.nome;
    if (!snapObj.img && base && base.img) snapObj.img = base.img;
    if (!snapObj.icone && base && base.icone) snapObj.icone = base.icone;
    if (!snapObj.tipo && fullItemObj && fullItemObj.tipo) snapObj.tipo = fullItemObj.tipo;
    if (!snapObj.tipoItem && base && base.tipo) snapObj.tipoItem = base.tipo;

    const sellerName = (row.sellerName != null && String(row.sellerName).trim() !== '')
        ? String(row.sellerName).trim()
        : (row.seller_name != null ? String(row.seller_name).trim() : '');
    const marketKind = row.marketKind || row.market_kind;
    const categoria = row.categoria != null ? row.categoria : row.category;
    const applicationIdRaw = row.applicationId != null ? row.applicationId : row.application_id;
    const applicationId = (applicationIdRaw != null && String(applicationIdRaw).trim() !== '')
        ? String(applicationIdRaw).trim()
        : null;

    return {
        ...row,
        fullItem,
        itemSnapshot: snapObj,
        sellerName,
        marketKind,
        categoria,
        ...(applicationId ? { applicationId } : {})
    };
}

function parcelMarketIsEquips(d: Record<string, unknown>): boolean {
    if (!d || typeof d !== 'object') return false;
    const c = String(d.categoria || d.category || '').toLowerCase();
    if (c === 'equips' || c === 'equipment') return true;
    const fi = d.fullItem || d.full_item;
    if (fi && typeof fi === 'object' && !Array.isArray(fi)) {
        const fiObj = fi as Record<string, unknown>;
        const fiBase = fiObj.base && typeof fiObj.base === 'object' ? (fiObj.base as Record<string, unknown>) : null;
        const t = String(fiObj.tipo || (fiBase && fiBase.tipo) || '').toLowerCase();
        if (t === 'weapon' || t === 'armor' || t === 'jewel') return true;
    }
    return false;
}

/**
 * Entrega conteúdo de purchase_delivery ao estado local (bolsa / equips).
 */
function aplicarParcelaMarketCompradorDoCorreio(detailRaw: unknown): void {
    const d = normalizeMailboxDetails(detailRaw);
    const kind = d.marketKind || d.market_kind;
    if (kind !== 'purchase_delivery') return;

    const snap = (d.itemSnapshot || {}) as Record<string, unknown>;
    const qtd = Math.max(1, Number(d.qtd) || 1);
    const equips = parcelMarketIsEquips(d);

    if (equips) {
        let novoItem: Record<string, unknown> | null = d.fullItem && typeof d.fullItem === 'object'
            ? (d.fullItem as Record<string, unknown>)
            : null;
        if (novoItem && typeof window.ItemSecurity !== 'undefined' && window.ItemSecurity.isValidInstance(novoItem)) {
            if (typeof window.charName === 'string') novoItem.owner = window.charName;
            novoItem.origin = 'IronGate';
        } else if (typeof window.ItemSecurity !== 'undefined') {
            const tipo = String((novoItem && novoItem.tipo) || snap.tipoItem || snap.tipo || 'armor');
            const base = (novoItem && novoItem.base) ? novoItem.base : snap;
            novoItem = window.ItemSecurity.createInstance(
                tipo,
                base as unknown as ItemCatalogBase,
                {
                    enchant: d.enchant != null ? Number(d.enchant) : 0,
                    origin: 'IronGate',
                },
            ) as unknown as Record<string, unknown>;
        } else {
            novoItem = {
                tipo: String(snap.tipoItem || snap.tipo || 'armor'),
                base: snap,
                enchant: Number(d.enchant) || 0,
            };
        }
        if (typeof window.InventoryManager !== 'undefined' && novoItem) {
            window.InventoryManager.adicionarEquipamento(novoItem as unknown as EquipRawInput);
        }
        window.escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketParcelEquip', { name: String(snap.nome || mb('mailbox.fallbackParcelEquip')) })}</span>`);
    } else {
        const nomeMat = String(snap.nome || d.itemNome || '');
        if (nomeMat) {
            if (typeof window.InventoryManager !== 'undefined' && typeof window.InventoryManager.adicionarStack === 'function') {
                window.InventoryManager.adicionarStack(nomeMat, qtd);
            } else {
                if (!window.inventario) window.inventario = {};
                window.inventario[nomeMat] = (Number(window.inventario[nomeMat]) || 0) + qtd;
            }
        }
        window.escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketParcelMats', { qty: qtd, name: nomeMat || mb('mailbox.fallbackParcelGoods') })}</span>`);
    }
}

function isMailboxRewardCurrencyRow(r: Record<string, unknown>): boolean {
    const rawId = r.id != null ? r.id : r.nome;
    if (rawId == null) return false;
    const idLower = String(rawId).toLowerCase();
    return idLower === 'ancient coin' || idLower === 'ancientcoin' || idLower === 'ancientcoins'
        || idLower === 'adena' || idLower === 'adenas';
}

/**
 * Uma linha de recompensa de correio (não moeda): equip instanciado ou stack na bolsa.
 * Moedas em modo nuvem são creditadas pelo RPC claim_mail_reward — não chamar isto para Adena/Coin.
 */
function aplicarItemRecompensaStackOuEquip(r: Record<string, unknown>): void {
    const rawId = r.id != null ? r.id : r.nome;
    if (rawId == null) return;
    let itemData: ItemCatalogBase | null = null;
    if (window.RankingSeasons && typeof window.RankingSeasons.findItemData === 'function') {
        itemData = window.RankingSeasons.findItemData(String(rawId));
    }
    if (itemData && (itemData.tipo === 'weapon' || itemData.tipo === 'armor' || itemData.tipo === 'jewel')) {
        if (typeof window.InventoryManager !== 'undefined') {
            window.InventoryManager.adicionarEquipamento({
                tipo: itemData.tipo,
                base: itemData,
                enchant: 0,
                augmented: false,
                origin: 'Season Reward'
            });
        }
    } else {
        const stackId = String(rawId);
        if (typeof window.InventoryManager !== 'undefined' && typeof window.InventoryManager.adicionarStack === 'function') {
            window.InventoryManager.adicionarStack(stackId, Number(r.qtd || 0));
        } else {
            if (!window.inventario) window.inventario = {};
            window.inventario[stackId] = (Number(window.inventario[stackId]) || 0) + Number(r.qtd || 0);
        }
    }
}

/**
 * Inicializa o sistema de Mailbox
 */
async function iniciarMailbox() {
    console.log("[Mailbox] Sistema Profissional inicializado.");
    await carregarMailbox();
    await atualizarIconeMailbox();

    // Intervalo de verificação de novas mensagens (simula recebimento de rede)
    setInterval(() => { void atualizarIconeMailbox(); }, 20000);
}

/**
 * Lê só localStorage (síncrono) — usado por syncFromCloud sem disputar com fetch da nuvem.
 */
function carregarMailboxLocalSomente() {
    if (!window.charName) return;
    try {
        const key = 'l2mini_mailbox_' + window.charName.toLowerCase();
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            mailboxDados = {
                inbox: Array.isArray(parsed.inbox) ? parsed.inbox : [],
                history: Array.isArray(parsed.history) ? parsed.history : []
            };
        }
    } catch (e) {
        console.warn('[Mailbox] carregarMailboxLocalSomente:', e);
    }
}

/**
 * Carrega as mensagens do LocalStorage ou Nuvem
 */
async function carregarMailbox() {
    if (!window.charName) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const cloudMails = await window.SupabaseAPI.fetchMailbox(window.charName);
        
        // Normaliza o formato da nuvem para o formato esperado pela UI
        const normalized = cloudMails.map(m => ({
            id: m.id,
            remetente: m.sender_name,
            assunto: m.subject,
            tipo: m.type,
            detalhes: normalizeMailboxDetails(m.details),
            lido: m.is_read,
            timestamp: new Date(m.created_at).getTime(),
            is_claimed: m.is_claimed
        }));

        mailboxDados.inbox = normalized.filter(m => !m.is_claimed);
        mailboxDados.history = normalized.filter(m => m.is_claimed);
        return;
    }

    // MODO LOCAL (OFFLINE)
    try {
        const key = 'l2mini_mailbox_' + window.charName.toLowerCase();
        const saved = localStorage.getItem(key);
        if (saved) {
            mailboxDados = JSON.parse(saved);
            if (!mailboxDados.inbox) mailboxDados.inbox = [];
            if (!mailboxDados.history) mailboxDados.history = [];
        } else {
            mailboxDados = { inbox: [], history: [] };
        }
    } catch (e) {
        console.error("[Mailbox] Falha crítica ao carregar dados:", e);
        mailboxDados = { inbox: [], history: [] };
    }
}

/**
 * Salva as mensagens no LocalStorage
 */
function salvarMailbox() {
    if (!window.charName) return;
    try {
        const key = 'l2mini_mailbox_' + window.charName.toLowerCase();
        localStorage.setItem(key, JSON.stringify(mailboxDados));
    } catch (e) {
        console.error("[Mailbox] Falha crítica ao salvar dados:", e);
    }
}

/**
 * Envia uma nova mensagem/notificação para QUALQUER jogador
 */
const enviarMail: EnviarMailFn = async (
    destinatario,
    remetente,
    assunto,
    tipo,
    detalhes = {},
) => {
    if (!destinatario || destinatario.trim() === "") return false;
    try { delete enviarMail.lastError; } catch (_) { /* noop */ }

    const destKey = destinatario.toLowerCase().trim();
    const remetenteNome = remetente || 'System';

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const result = await window.SupabaseAPI.sendMail(destinatario, assunto, tipo, detalhes);
        if (result && result.success) {
            // Se enviou para si mesmo, recarrega a inbox
            if (window.charName && destKey === window.charName.toLowerCase()) {
                await carregarMailbox();
                await atualizarIconeMailbox();
            }
            return true;
        }
        enviarMail.lastError = (result && result.error)
            ? (typeof result.error === 'string' ? result.error : (result.error.message || 'send_failed'))
            : 'send_failed';
        return false;
    }

    // MODO LOCAL (OFFLINE)
    try {
        const storageKey = 'l2mini_mailbox_' + destKey;
        const raw = localStorage.getItem(storageKey);
        let targetMail = raw ? JSON.parse(raw) : { inbox: [], history: [] };

        const novaMsg = {
            id: Date.now() + Math.random(),
            remetente: remetenteNome,
            assunto: assunto.substring(0, 30),
            tipo: tipo,
            detalhes: detalhes,
            lido: false,
            timestamp: Date.now()
        };

        targetMail.inbox.unshift(novaMsg);
        if (targetMail.inbox.length > 100) targetMail.inbox.pop();
        localStorage.setItem(storageKey, JSON.stringify(targetMail));

        if (window.charName && destKey === window.charName.toLowerCase()) {
            mailboxDados = targetMail;
            void atualizarIconeMailbox();
            if (document.getElementById('janela-mailbox')?.style.display === 'flex') {
                renderizarMailbox();
            }
        }
        return true;
    } catch (e) {
        console.error("[Mailbox] Erro ao enviar mail:", e);
        return false;
    }
};

/**
 * Atualiza só o HUD (sem rede): correio não lido em memória + Reward Hub pendente.
 * Usado no loop de UI (`atualizar`) e após `checkRewards` — evita sobrescrever o número só com recompensas.
 */
function aplicarNotifBadgeVisual() {
    const btn = document.getElementById('btn-sistema-notificacoes');
    const badge = document.getElementById('notif-badge');
    if (!btn || !badge) return;

    const mailUnread = (mailboxDados.inbox || []).filter(m => !m.lido).length;
    const rewardN = (window.RewardEngine && Array.isArray(window.RewardEngine.rewards))
        ? window.RewardEngine.rewards.length
        : 0;
    const total = mailUnread + rewardN;

    if (total > 0) {
        btn.classList.add('notif-icon-flashing');
        badge.style.display = rewardN > 0 ? 'flex' : 'block';
        badge.innerText = total > 99 ? '99+' : String(total);
        if (rewardN > 0) badge.classList.add('notif-badge--rewards');
        else badge.classList.remove('notif-badge--rewards');
    } else {
        btn.classList.remove('notif-icon-flashing');
        badge.style.display = 'none';
        badge.classList.remove('notif-badge--rewards');
    }
}

/** Fecha o correio e abre o Global Rewards (mesmo número no badge pode ser staff reward). */
function abrirRewardHubFechandoCorreio() {
    window.fecharModal('janela-mailbox');
    if (window.RewardEngine && typeof window.RewardEngine.open === 'function') {
        window.RewardEngine.open();
    }
}

/**
 * Atualiza o badge e animação do ícone de mail no HUD
 */
async function atualizarIconeMailbox() {
    const btn = document.getElementById('btn-sistema-notificacoes');
    if (!btn) return;

    await carregarMailbox();
    aplicarNotifBadgeVisual();
}

/**
 * Abre a janela de Mailbox
 */
async function abrirJanelaCorreio() {
    mailboxAbaAtual = 'inbox';
    if (window.RewardEngine && typeof window.RewardEngine.checkRewards === 'function') {
        await window.RewardEngine.checkRewards();
    }
    await carregarMailbox();

    // Reset visual dos botões
    mudarAbaMailbox('inbox');
    window.abrirModal('janela-mailbox', 2000);
    await atualizarIconeMailbox();
}

/**
 * Gerencia a troca de abas e botões de ação massiva
 */
function mudarAbaMailbox(aba) {
    mailboxAbaAtual = aba;
    
    const btnInbox = document.getElementById('btn-mail-inbox');
    const btnHist = document.getElementById('btn-mail-history');
    const btnCollectAll = document.getElementById('btn-mail-collect-all');
    
    if (btnInbox) {
        btnInbox.style.color = aba === 'inbox' ? '#fff' : '#666';
        btnInbox.style.borderBottom = aba === 'inbox' ? '2px solid #4338ca' : 'none';
    }
    if (btnHist) {
        btnHist.style.color = aba === 'history' ? '#fff' : '#666';
        btnHist.style.borderBottom = aba === 'history' ? '2px solid #4338ca' : 'none';
    }

    // Só mostra "Collect All" para proventos de venda (Adena/AC), não para parcelas de compra
    if (aba === 'inbox' && mailboxDados.inbox.some(m => {
        if (m.tipo !== 'market') return false;
        const d = m.detalhes || {};
        return d.marketKind !== 'purchase_delivery' && Number(d.valor) > 0;
    })) {
        if (btnCollectAll) btnCollectAll.style.display = 'block';
    } else {
        if (btnCollectAll) btnCollectAll.style.display = 'none';
    }

    renderizarMailbox();
}

/**
 * Renderiza a lista de mensagens
 */
function renderizarMailbox() {
    const cont = document.getElementById('mailbox-content');
    const countEl = document.getElementById('mailbox-count');
    if (!cont) return;

    const mensagens = mailboxAbaAtual === 'inbox' ? mailboxDados.inbox : mailboxDados.history;
    if (countEl) countEl.innerText = mb('mailbox.messageCount', { n: mensagens.length });

    if (mensagens.length === 0) {
        const emptyText = mailboxAbaAtual === 'inbox' ? mb('mailbox.emptyInbox') : mb('mailbox.emptyHistory');
        const rewardN = (window.RewardEngine && Array.isArray(window.RewardEngine.rewards))
            ? window.RewardEngine.rewards.length
            : 0;
        const rewardCta = (mailboxAbaAtual === 'inbox' && rewardN > 0)
            ? `<p style="font-family:'Cinzel'; font-size:10px; letter-spacing:0.06em; color:#a78bfa; max-width:260px; text-align:center; line-height:1.45; margin-top:14px;">${mb('mailbox.emptyInboxStaffRewards')}</p>
               <button type="button" class="btn-l2 mailbox-global-rewards-btn" style="margin-top:12px; min-height:44px; font-size:10px; background:linear-gradient(180deg,#4c1d95 0%,#5b21b6 100%); border-color:#7c3aed; position:relative; padding-left:14px; padding-right:14px;" onclick="abrirRewardHubFechandoCorreio()">
                  <span class="mailbox-global-rewards-notif" aria-label="${mb('reward.hubTitle')}">${rewardN > 99 ? '99+' : rewardN}</span>
                  ${mb('mailbox.openRewardHub')}
               </button>`
            : '';
        cont.innerHTML = `
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#555; padding: 16px 8px 8px;">
                <span style="font-size:3.5em; margin-bottom:15px; opacity:0.2;">✉️</span>
                <p style="font-family:'Cinzel'; font-size:11px; letter-spacing:1px;">${emptyText}</p>
                ${rewardCta}
            </div>
        `;
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:12px; padding-bottom:10px;">';
    
    mensagens.forEach(msg => {
        const data = new Date(msg.timestamp);
        const dataTxt = `${data.getDate().toString().padStart(2,'0')}/${(data.getMonth()+1).toString().padStart(2,'0')} ${data.getHours().toString().padStart(2,'0')}:${data.getMinutes().toString().padStart(2,'0')}`;
        
        let icon = '✉️';
        let accentColor = '#4338ca';
        let bgStyle = 'background: rgba(15, 15, 15, 0.9);';
        
        if (msg.tipo === 'market') { icon = '📜'; accentColor = '#ca8a04'; }
        if (msg.tipo === 'clan') { icon = '🏰'; accentColor = '#1d4ed8'; }
        if (msg.tipo === 'system') { icon = '⚙️'; accentColor = '#525252'; }
        if (msg.tipo === 'player') { icon = '👤'; accentColor = '#7c3aed'; }

        const lido = msg.lido || mailboxAbaAtual === 'history';

        html += `
            <div style="${bgStyle} border: 1px solid ${lido ? '#333' : accentColor}; border-radius: 8px; overflow: hidden; position: relative;" onclick="marcarLido('${msg.id}')">
                ${!lido ? `<div style="position:absolute; top:5px; right:5px; width:6px; height:6px; background:${accentColor}; border-radius:50%; box-shadow: 0 0 5px ${accentColor};"></div>` : ''}
                
                <div style="padding: 10px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <div style="font-size: 18px; filter: ${lido ? 'grayscale(1) opacity(0.5)' : 'none'};">${icon}</div>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; font-weight: bold; color: ${lido ? '#aaa' : '#fff'}; font-family: 'Cinzel';">${msg.assunto}</div>
                        <div style="font-size: 9px; color: #666;">${mb('mailbox.fromLabel')} <span style="color:${accentColor};">${msg.remetente}</span> <span style="margin-left:5px; opacity:0.5;">| ${dataTxt}</span></div>
                    </div>
                    <button style="background:none; border:none; color:#444; font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); deletarMensagem('${msg.id}')">🗑️</button>
                </div>
                
                <div style="padding: 12px; font-size: 11px;">
                    ${renderizarConteudoMensagem(msg)}
                </div>
            </div>
        `;
    });

    html += '</div>';
    cont.innerHTML = html;
}

/**
 * Renderiza o corpo detalhado da mensagem
 */
function renderizarConteudoMensagem(msg) {
    const isHistory = mailboxAbaAtual === 'history';
    
    switch(msg.tipo) {
        case 'market': {
            const m = normalizeMailboxDetails(msg.detalhes || {});
            const isParcel = m.marketKind === 'purchase_delivery' || m.market_kind === 'purchase_delivery';
            const snap = (m.itemSnapshot || {}) as Record<string, unknown>;
            const nomeItem = String(snap.nome || mb('market.categoryItemGeneric'));
            const encTxt = (Number(m.enchant) > 0) ? `<span style="color:#38bdf8;">+${m.enchant}</span> ` : '';

            if (isParcel) {
                const moedaLabel = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
                const corMoeda = m.moeda === 'coin' ? '#60a5fa' : '#facc15';
                const img = String(snap.img || snap.icone || 'assets/icons/etc_etc_box_ot_i00.png');
                return `
                    <div style="color:#a8a29e; margin-bottom:12px; line-height:1.55; font-size:10px; border-left:2px solid #ca8a04; padding-left:10px;">
                        <span style="color:#facc15; font-family:'Cinzel',serif; font-weight:bold; letter-spacing:0.08em; display:block; margin-bottom:6px;">${mb('mailbox.parcelTitle')}</span>
                        ${mb('mailbox.parcelBody')}
                    </div>
                    <div style="display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.45); padding:10px; border-radius:8px; border:1px solid #3d2b1f; margin-bottom:10px;">
                        <img src="${img}" style="width:44px;height:44px;object-fit:contain;border-radius:4px;border:1px solid #444;" onerror="this.src='assets/itens/item_generic.png'">
                        <div style="flex:1;">
                            <div style="font-family:'Cinzel',serif; color:#fff; font-weight:bold; font-size:11px;">${encTxt}${nomeItem}${Number(m.qtd) > 1 ? ' <span style="color:#10b981;">×' + m.qtd + '</span>' : ''}</div>
                            <div style="font-size:9px; color:#78716c; margin-top:4px;">${mb('mailbox.seller')} <span style="color:#d6d3d1;">${m.sellerName ? String(m.sellerName) : '—'}</span></div>
                            <div style="font-size:9px; color:${corMoeda}; margin-top:3px;">${mb('mailbox.paid')} <b>${Number(m.paid || 0).toLocaleString()}</b> ${moedaLabel}</div>
                        </div>
                    </div>
                    ${!isHistory
                        ? `<button class="btn-l2" style="width:100%; height:32px; font-size:10px; background:linear-gradient(180deg,#92400e 0%,#78350f 100%); border-color:#ca8a04; font-family:'Cinzel',serif; letter-spacing:0.06em;" onclick="processarAcaoMail('${msg.id}', 'collect_market_delivery')">${mb('mailbox.claimParcel')}</button>`
                        : `<div style="text-align:center; font-size:9px; color:#57534e; font-style:italic;">${mb('mailbox.parcelEmptiedNote')}</div>`
                    }
                `;
            }

            const mv = Number(m.valor) || 0;
            const listedTithe = (typeof m.gross !== 'undefined')
                ? mb('mailbox.listedTithe', { listed: Number(m.gross).toLocaleString(), tax: Number(m.tax || 0).toLocaleString() })
                : '';
            return `
                <div style="color:#a8a29e; margin-bottom:12px; line-height:1.55; font-size:10px; border-left:2px solid #ca8a04; padding-left:10px;">
                    <span style="color:#facc15; font-family:'Cinzel',serif; font-weight:bold; letter-spacing:0.08em; display:block; margin-bottom:6px;">${mb('mailbox.settlementTitle')}</span>
                    ${mb('mailbox.settlementBody')}
                    ${m.buyerName ? `<div style="margin-top:8px; font-size:9px; color:#78716c;">${mb('mailbox.purchaser')} <span style="color:#d6d3d1;">${m.buyerName}</span></div>` : ''}
                    ${listedTithe ? `<div style="margin-top:4px; font-size:9px; color:#57534e;">${listedTithe}</div>` : ''}
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.4); padding:10px; border-radius:6px; border:1px solid #292524;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div class="coin-icon coin-${m.moeda === 'coin' ? 'ancient' : 'adena'}" style="width:16px; height:16px;"></div>
                        <span style="color:${m.moeda === 'coin' ? '#60a5fa' : '#facc15'}; font-weight:bold; font-size:13px; font-family: Tahoma;">${mv.toLocaleString()}</span>
                        <span style="font-size:9px; color:#57534e;">${m.moeda === 'coin' ? 'AC' : mb('mailbox.currencyAdena')}</span>
                    </div>
                    ${!isHistory && mv > 0
                        ? `<button class="btn-l2" style="height:26px; padding: 0 12px; font-size:9px; background:#15803d; border-radius:4px;" onclick="processarAcaoMail('${msg.id}', 'collect_market')">${mb('mailbox.collectFunds')}</button>`
                        : (isHistory ? `<span style="font-size:9px; color:#444; font-style:italic;">${mb('mailbox.settlementReceivedNote')}</span>` : '')
                    }
                </div>
            `;
        }
        
        case 'clan':
            const c = msg.detalhes;
            // "Clan Application Accepted" also contains "Application" — only the pending leader mail must show Accept/Reject.
            if (msg.assunto === 'New Clan Application') {
                const infoBot = c.nivel ? `<div style="font-size: 9px; color: #888; margin-bottom: 5px;">${mb('mailbox.clanInfoBot', { level: c.nivel, className: (c.classe || '').replace('_', ' ') })}</div>` : '';
                return `
                    <div style="color: #bbb; margin-bottom: 5px;">${mb('mailbox.clanApplicant', { name: c.nome })}</div>
                    ${infoBot}
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <button class="btn-l2" style="width:100%; height:26px; font-size:9px; background:#334155;" onclick="verPerfilPeloMail('${c.nome}')">${mb('mailbox.inspectPlayer')}</button>
                        ${!isHistory ? `
                            <div style="display:flex; gap:6px;">
                                <button class="btn-l2" style="flex:1; height:26px; font-size:9px; background:#15803d;" onclick="processarAcaoMail('${msg.id}', 'clan_accept', '${c.nome}')">${mb('mailbox.accept')}</button>
                                <button class="btn-l2" style="flex:1; height:26px; font-size:9px; background:#991b1b;" onclick="processarAcaoMail('${msg.id}', 'clan_decline', '${c.nome}')">${mb('mailbox.reject')}</button>
                            </div>
                        ` : `<div style="text-align:center; font-size:9px; color:#444; font-style:italic; padding:5px; border-top:1px solid #222;">${mb('mailbox.applicationHandled')}</div>`}
                    </div>
                `;
            } else {
                return `
                    <div style="color: #bbb; margin-bottom: 10px;">${mb('mailbox.welcomeClan', { tag: '[' + c.clanSigla + ']', clanName: c.clanNome })}</div>
                    <button class="btn-l2" style="width:100%; height:26px; font-size:9px; background:#1e3a8a;" onclick="irPara('social'); fecharModal('janela-mailbox'); processarAcaoMail('${msg.id}', 'archive')">${mb('mailbox.visitClanHall')}</button>
                `;
            }

        case 'system':
            const sys = msg.detalhes;
            let htmlRec = `<div style="color: #ccc; line-height: 1.5; white-space: pre-wrap; font-size:10px; margin-bottom:10px;">${sys.texto}</div>`;
            
            if (sys.recompensas && sys.recompensas.length > 0) {
                const chips = sys.recompensas.map(r => (
                    window.RewardEngine && typeof window.RewardEngine.renderRewardChipHtml === 'function'
                        ? window.RewardEngine.renderRewardChipHtml({
                            id: r.id != null ? r.id : r.nome,
                            nome: r.nome,
                            qtd: r.qtd,
                            epic: !!r.epic
                        })
                        : `<div style="display:flex;justify-content:space-between;font-size:10px;color:#fff;"><span>${r.nome || r.id}</span><b>x${r.qtd}</b></div>`
                )).join('');
                htmlRec += `<div class="mailbox-system-rewards-wrap"><div class="reward-hub-items-scroll"><div class="reward-item-chip-grid">${chips}</div></div></div>`;
                
                if (mailboxAbaAtual === 'inbox') {
                    htmlRec += `<button class="btn-l2" style="width:100%; height:30px; margin-top:10px; background:#15803d; font-size:10px;" onclick="processarAcaoMail('${msg.id}', 'collect_raid')">${mb('mailbox.collectAllRewards')}</button>`;
                } else {
                    htmlRec += `<div style="text-align:center; color:#555; font-size:9px; margin-top:10px; font-style:italic;">${mb('mailbox.rewardsCollected')}</div>`;
                }
            }
            return htmlRec;

        case 'player':
            const p = msg.detalhes;
            let anexoHtml = '';
            if (p.adena > 0) {
                anexoHtml = `
                    <div style="margin-top:10px; padding:8px; background:rgba(202, 138, 4, 0.1); border:1px solid #854d0e; border-radius:4px; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:5px;">
                            <div class="coin-icon coin-adena"></div>
                            <span style="color:#facc15; font-weight:bold;">${p.adena.toLocaleString()}a</span>
                        </div>
                        ${!isHistory ? `<button class="btn-l2" style="height:22px; padding:0 8px; font-size:8px; background:#854d0e;" onclick="processarAcaoMail('${msg.id}', 'collect_player')">${mb('mailbox.take')}</button>` : ''}
                    </div>
                `;
            }
            return `
                <div style="color: #ccc; line-height: 1.5; white-space: pre-wrap; font-style: italic;">"${p.texto}"</div>
                ${anexoHtml}
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn-l2" style="flex:1; height:24px; font-size:8px; background:#444;" onclick="abrirJanelaComporMail('${msg.remetente}')">${mb('mailbox.reply')}</button>
                </div>
            `;

        default:
            return `<div style="color: #999; line-height: 1.4;">${msg.detalhes.texto || mb('mailbox.noExtraInfo')}</div>`;
    }
}

/**
 * Marca uma mensagem como lida
 */
async function marcarLido(id) {
    if (mailboxAbaAtual === 'history') return;
    const msg = mailboxDados.inbox.find(m => m.id == id);
    if (msg && !msg.lido) {
        msg.lido = true;
        
        // MODO MULTIPLAYER (SUPABASE)
        if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
            await window.SupabaseAPI.updateMailStatus(id, { is_read: true });
        } else {
            salvarMailbox();
        }
        
        renderizarMailbox();
        await atualizarIconeMailbox();
    }
}

/**
 * Processa as ações das mensagens
 */
async function processarAcaoMail(msgId, acao, param = null) {
    const mailKey = String(msgId);
    const msgIndex = mailboxDados.inbox.findIndex(m => String(m.id) === mailKey);
    if (msgIndex === -1) return;
    const msg = mailboxDados.inbox[msgIndex];

    const useCloudCollect = window.SupabaseAPI && window.SupabaseAPI.getUser()
        && ['collect_market', 'collect_market_delivery', 'collect_raid', 'collect_player'].includes(acao);

    // MODO MULTIPLAYER (SUPABASE): sempre RPC ao resgatar (id UUID ou string do PostgREST)
    if (useCloudCollect) {
        try {
            const result = await window.SupabaseAPI.claimMailReward(mailKey);
                
                if (result && result.success) {
                    // Sincroniza estado local baseado no que o servidor deu
                    const addA = Number(result.reward_adena) || 0;
                    const addC = Number(result.reward_ancient) || 0;
                    if (addA > 0) window.adenas = (Number(window.adenas) || 0) + addA;
                    if (addC > 0) window.ancientCoins = (Number(window.ancientCoins) || 0) + addC;
                    if (addA > 0 || addC > 0) {
                        if (typeof window.syncMoedasInventarioComCarteira === 'function') {
                            window.syncMoedasInventarioComCarteira();
                        }
                        window.atualizar?.();
                    }

                    // Nuvem: o RPC credita moedas no JSONB, mas itens (poções, mats) só existem no payload do mail — aplicar à bolsa como no modo offline.
                    if (acao === 'collect_raid') {
                        const sys = normalizeMailboxDetails(msg.detalhes || {});
                        if (sys.recompensas && Array.isArray(sys.recompensas)) {
                            let anyItem = false;
                            sys.recompensas.forEach((row) => {
                                if (isMailboxRewardCurrencyRow(row)) return;
                                aplicarItemRecompensaStackOuEquip(row);
                                anyItem = true;
                            });
                            if (anyItem && typeof window.syncMoedasInventarioComCarteira === 'function') {
                                window.syncMoedasInventarioComCarteira();
                            }
                            if (anyItem) window.atualizar?.();
                        }
                    }

                    // Feedback visual e log
                    if (acao === 'collect_market') {
                        const m = msg.detalhes || {};
                        const coinLbl = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
                        escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketSettlement', { amount: (result.reward_adena || result.reward_ancient).toLocaleString(), currency: coinLbl })}</span>`);
                        window.mostrarAviso(mb('mailbox.avisoFundsCollected'));
                    } else if (acao === 'collect_market_delivery') {
                        let parcelPayload;
                        try {
                            parcelPayload = JSON.parse(JSON.stringify(normalizeMailboxDetails(msg.detalhes)));
                        } catch (e) {
                            parcelPayload = normalizeMailboxDetails(msg.detalhes);
                        }
                        aplicarParcelaMarketCompradorDoCorreio(parcelPayload);
                        window.mostrarAviso(mb('mailbox.avisoParcelClaimed'));
                    } else if (acao === 'collect_raid') {
                        escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logRaidRewardsCollected', { subject: msg.assunto })}</span>`);
                        window.mostrarAviso(mb('mailbox.avisoRewardsCollected'));
                    } else if (acao === 'collect_player') {
                        escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerRewardReceived', { sender: msg.remetente })}</span>`);
                        window.mostrarAviso(mb('mailbox.avisoGoldReceived'));
                    }

                    // Recarrega a mailbox para mover para o histórico
                    await carregarMailbox();
                    renderizarMailbox();
                    await atualizarIconeMailbox();
                    window.atualizar?.();
                    if (typeof window.salvarJogo === 'function') window.salvarJogo();
                    return;
                } else {
                    window.mostrarAviso(mailboxCloudErrorMessage(result ? result.error : 'unknown_error'));
                    return;
                }
        } catch (e) {
            console.error("[Mailbox RPC Exception]", e);
            window.mostrarAviso(mailboxCloudErrorMessage(e));
            return;
        }
    }

    if (acao === 'collect_market') {
        const m = normalizeMailboxDetails(msg.detalhes || {});
        if (m.marketKind === 'purchase_delivery' || m.market_kind === 'purchase_delivery') return;
        const mv = Number(m.valor) || 0;
        if (mv <= 0) return;
        if (m.moeda === 'adena') {
            window.adenas = (Number(window.adenas) || 0) + mv;
        } else {
            window.ancientCoins = (Number(window.ancientCoins) || 0) + mv;
        }
        const coinLbl = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
        escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketSettlement', { amount: mv.toLocaleString(), currency: coinLbl })}</span>`);
        window.mostrarAviso(mb('mailbox.avisoFundsCollected'));
    }
    else if (acao === 'collect_market_delivery') {
        const d = normalizeMailboxDetails(msg.detalhes || {});
        if (d.marketKind !== 'purchase_delivery') return;
        aplicarParcelaMarketCompradorDoCorreio(d);
        window.mostrarAviso(mb('mailbox.avisoParcelClaimed'));
    } 
    else if (acao === 'collect_raid') {
        const sys = msg.detalhes as Record<string, unknown>;
        const recompensas = sys.recompensas;
        if (Array.isArray(recompensas)) {
            recompensas.forEach((r: Record<string, unknown>) => {
                const idLower = String(r.id != null ? r.id : r.nome).toLowerCase();
                if (idLower === 'ancient coin' || idLower === 'ancientcoin' || idLower === 'ancientcoins') {
                    window.ancientCoins = (Number(window.ancientCoins) || 0) + Number(r.qtd);
                } else if (idLower === 'adena' || idLower === 'adenas') {
                    window.adenas = (Number(window.adenas) || 0) + Number(r.qtd);
                } else {
                    aplicarItemRecompensaStackOuEquip(r);
                }
            });
            escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logRaidRewardsCollected', { subject: msg.assunto })}</span>`);
            window.mostrarAviso(mb('mailbox.avisoRewardsCollected'));
        }
    }
    else if (acao === 'collect_player') {
        const p = msg.detalhes as Record<string, unknown>;
        window.adenas = (Number(window.adenas) || 0) + Number(p.adena);
        p.adena = 0;
        window.escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerRewardReceived', { sender: msg.remetente })}</span>`);
        window.mostrarAviso(mb('mailbox.avisoGoldReceived'));
    }
    else if (acao === 'clan_accept' || acao === 'clan_decline') {
        const d = normalizeMailboxDetails(msg.detalhes || {});
        const appId = d.applicationId || d.application_id || null;
        const aceito = acao === 'clan_accept';
        if (typeof window.responderSolicitacao === 'function') {
            await window.responderSolicitacao(String(param ?? ''), aceito, appId as string | null);
        }
    }

    // Move para o histórico após a ação (exceto se for apenas arquivamento)
    const finalMsg = mailboxDados.inbox.splice(msgIndex, 1)[0];
    finalMsg.lido = true;
    mailboxDados.history.unshift(finalMsg);
    
    if (mailboxDados.history.length > 100) mailboxDados.history.pop();

    salvarMailbox();
    renderizarMailbox();
    await atualizarIconeMailbox();
    window.atualizar?.();
    if (typeof window.salvarJogo === 'function') window.salvarJogo();
}

/**
 * Coleta todos os ganhos de mercado de uma vez
 */
async function coletarTudoMarket() {
    if (mailboxCollecting) return;
    const marketMsgs = mailboxDados.inbox.filter(m => {
        if (m.tipo !== 'market') return false;
        const d = m.detalhes || {};
        if (d.marketKind === 'purchase_delivery') return false;
        return Number(d.valor) > 0;
    });
    if (marketMsgs.length === 0) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        mailboxCollecting = true;
        window.mostrarAviso(mb('game.cloud.syncing'));
        let tA = 0;
        let tC = 0;
        let okCount = 0;
        try {
            for (const msg of marketMsgs) {
                const res = await window.SupabaseAPI.claimMailReward(String(msg.id));
                if (res && res.success) {
                    tA += Number(res.reward_adena) || 0;
                    tC += Number(res.reward_ancient) || 0;
                    okCount++;
                }
            }
            if (tA > 0) window.adenas = (Number(window.adenas) || 0) + tA;
            if (tC > 0) window.ancientCoins = (Number(window.ancientCoins) || 0) + tC;
            if (tA > 0 || tC > 0) {
                if (typeof window.syncMoedasInventarioComCarteira === 'function') {
                    window.syncMoedasInventarioComCarteira();
                }
                window.atualizar?.();
            }
            await carregarMailbox();
            renderizarMailbox();
            await atualizarIconeMailbox();
            window.atualizar?.();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
            if (okCount === 0) {
                window.mostrarAviso(mb('mailbox.bulkCollectNone'));
            } else if (okCount < marketMsgs.length) {
                window.mostrarAviso(mb('mailbox.bulkCollectPartial', { ok: okCount, total: marketMsgs.length }));
            } else {
                window.mostrarAviso(mb('mailbox.avisoBulkSettlement'));
            }
        } finally {
            mailboxCollecting = false;
        }
        return;
    }

    let totalAdena = 0;
    let totalCoins = 0;

    // Processa cada mensagem
    marketMsgs.forEach(msg => {
        const m = msg.detalhes || {};
        const v = Number(m.valor) || 0;
        if (m.moeda === 'adena') totalAdena += v;
        else totalCoins += v;

        // Move para o histórico
        const index = mailboxDados.inbox.indexOf(msg);
        const finalMsg = mailboxDados.inbox.splice(index, 1)[0];
        finalMsg.lido = true;
        mailboxDados.history.unshift(finalMsg);
    });

    window.adenas = (Number(window.adenas) || 0) + totalAdena;
    if (typeof window.ancientCoins !== 'undefined') window.ancientCoins = (Number(window.ancientCoins) || 0) + totalCoins;

    if (mailboxDados.history.length > 100) mailboxDados.history.splice(100);

    salvarMailbox();
    renderizarMailbox();
    await atualizarIconeMailbox();
    window.atualizar?.();
    
    const adenaLbl = mb('mailbox.currencyAdena');
    const coinLbl = mb('mailbox.currencyAncient');
    const bulkText = totalCoins > 0
        ? mb('mailbox.logMarketBulkBoth', { adena: totalAdena.toLocaleString(), adenaLabel: adenaLbl, coins: totalCoins.toLocaleString(), coinLabel: coinLbl })
        : mb('mailbox.logMarketBulkAdena', { adena: totalAdena.toLocaleString(), adenaLabel: adenaLbl });
    escreverLog(`<span style="color:#ca8a04;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${bulkText}</span>`);
    window.mostrarAviso(mb('mailbox.avisoBulkSettlement'));
}

/**
 * Abre a interface de composição
 */
function abrirJanelaComporMail(dest = '') {
    setMailInputValue('mail-destinatario', dest);
    setMailInputValue('mail-mensagem', '');
    setMailInputValue('mail-anexo-adena', 0);
    window.abrirModal('janela-mailbox-compor', 2100);
}

/**
 * Lógica para o player enviar mail para outro player
 */
async function enviarMailPlayer() {
    const dest = mailInputValue('mail-destinatario').trim();
    const msg = mailInputValue('mail-mensagem').trim();
    const val = parseInt(mailInputValue('mail-anexo-adena'), 10) || 0;
    const FEE = 500;

    if (!dest) return window.mostrarAviso(mb('mailbox.avisoRecipientRequired'));
    if (dest.toLowerCase() === (window.charName || '').toLowerCase()) return window.mostrarAviso(mb('mailbox.avisoNoSelfMail'));
    if (!msg && val <= 0) return window.mostrarAviso(mb('mailbox.avisoMsgOrGold'));
    if ((window.adenas || 0) < (val + FEE)) return window.mostrarAviso(mb('mailbox.avisoInsufficientAdena'));

    const confirmado = await window.l2Confirm(
        mb('mailbox.sendConfirm', { dest: dest, gold: val.toLocaleString(), fee: FEE }),
        mb('mailbox.titleSendMail')
    );
    if (confirmado) {
        const sucesso = await enviarMail(dest, window.charName || '', mb('mailbox.playerMailSubject'), 'player', {
            texto: msg,
            adena: val
        });

        if (sucesso) {
            window.adenas -= (val + FEE);
            window.fecharModal('janela-mailbox-compor');
            window.mostrarAviso(mb('mailbox.avisoMailSent'));
            escreverLog(`<span style="color:#7c3aed;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerMailSent', { dest: dest, gold: val.toLocaleString() })}</span>`);
            window.atualizar?.();
        } else {
            const code = String(enviarMail.lastError || '');
            if (code === 'recipient_not_found') {
                window.mostrarAviso(mb('mailbox.errorRecipientNotFound'));
            } else if (code === 'cannot_mail_self') {
                window.mostrarAviso(mb('mailbox.avisoNoSelfMail'));
            } else {
                window.mostrarAviso(mb('mailbox.avisoMailFailed'));
            }
        }
    }
}

/**
 * Deleta uma mensagem específica
 */
async function deletarMensagem(id) {
    const target = mailboxAbaAtual === 'inbox' ? mailboxDados.inbox : mailboxDados.history;
    const index = target.findIndex(m => m.id == id);
    
    if (index !== -1) {
        // Se for inbox e tiver item/gold, avisa
        const msg = target[index];
        if (mailboxAbaAtual === 'inbox') {
            const d = msg.detalhes || {};
            const hasUncollectedGold = (msg.tipo === 'market' && d.marketKind !== 'purchase_delivery' && Number(d.valor) > 0)
                || (msg.tipo === 'player' && Number(d.adena) > 0);
            const hasParcel = (msg.tipo === 'market' && d.marketKind === 'purchase_delivery');
            if (hasUncollectedGold || hasParcel) {
                const warn = hasParcel
                    ? mb('mailbox.warnParcelAbandon')
                    : mb('mailbox.warnUncollectedGold');
                const confirmado = await window.l2Confirm(warn, mb('mailbox.titleIronGate'));
                if (!confirmado) return;
            }
        }

        // MODO MULTIPLAYER (SUPABASE)
        if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
            await window.SupabaseAPI.deleteMail(id);
        }

        target.splice(index, 1);
        salvarMailbox();
        renderizarMailbox();
        await atualizarIconeMailbox();
        window.mostrarAviso(mb('mailbox.avisoMsgDeleted'));
    }
}

/**
 * Limpa o histórico
 */
async function limparHistoricoMail() {
    if (mailboxDados.history.length === 0) return;
    const confirmado = await window.l2Confirm(mb('mailbox.confirmPurgeHistory'), mb('mailbox.titlePurgeHistory'));
    if (confirmado) {
        mailboxDados.history = [];
        salvarMailbox();
        renderizarMailbox();
        window.mostrarAviso(mb('mailbox.historyPurgedToast'));
    }
}

/**
 * Helper para ver perfil com z-index correto
 */
function verPerfilPeloMail(nome) {
    if (typeof window.abrirPerfilMembroClan === 'function') {
        window.abrirPerfilMembroClan(nome);
        setTimeout(() => {
            const modal = document.getElementById('modal-perfil-ranking');
            if (modal) {
                modal.style.zIndex = "2500";
                const overlay = document.getElementById('modal-overlay');
                if (overlay) overlay.style.zIndex = "2499";
            }
        }, 50);
    }
}

/**
 * Sincroniza mensagens vindas da nuvem (Offline Rewards)
 */
function syncFromCloud(cloudMessages: MailboxMessage[]): boolean {
    if (!Array.isArray(cloudMessages) || cloudMessages.length === 0) return false;

    carregarMailboxLocalSomente();
    if (!mailboxDados.inbox) mailboxDados.inbox = [];
    if (!mailboxDados.history) mailboxDados.history = [];
    
    let addedCount = 0;
    cloudMessages.forEach(cloudMsg => {
        // Verifica se já temos essa mensagem localmente pelo ID para não duplicar
        const exists = (mailboxDados.inbox && mailboxDados.inbox.some(m => m.id === cloudMsg.id)) || 
                       (mailboxDados.history && mailboxDados.history.some(m => m.id === cloudMsg.id));
        
        if (!exists) {
            if (!mailboxDados.inbox) mailboxDados.inbox = [];
            mailboxDados.inbox.unshift(cloudMsg);
            addedCount++;
            console.log("🎁 Nova mensagem da nuvem adicionada:", cloudMsg.assunto);
        }
    });

    if (addedCount > 0) {
        salvarMailbox();
        void atualizarIconeMailbox();
        if (document.getElementById('janela-mailbox')?.style.display === 'flex') {
            renderizarMailbox();
        }
        return true;
    }
    return false;
}

const MailboxEngine: MailboxEngineApi = {
    syncFromCloud,
};

function registerMailboxHtmlGlobals() {
    registerGlobal('enviarMail', enviarMail);
    registerGlobal('aplicarNotifBadgeVisual', aplicarNotifBadgeVisual);
    registerGlobal('abrirJanelaCorreio', abrirJanelaCorreio);
    registerGlobal('mudarAbaMailbox', mudarAbaMailbox);
    registerGlobal('marcarLido', marcarLido);
    registerGlobal('processarAcaoMail', processarAcaoMail);
    registerGlobal('deletarMensagem', deletarMensagem);
    registerGlobal('abrirJanelaComporMail', abrirJanelaComporMail);
    registerGlobal('enviarMailPlayer', enviarMailPlayer);
    registerGlobal('coletarTudoMarket', coletarTudoMarket);
    registerGlobal('limparHistoricoMail', limparHistoricoMail);
    registerGlobal('verPerfilPeloMail', verPerfilPeloMail);
    registerGlobal('abrirRewardHubFechandoCorreio', abrirRewardHubFechandoCorreio);
    registerGlobal('MailboxEngine', MailboxEngine);
}
registerMailboxHtmlGlobals();

// Inicialização segura
window.addEventListener('load', () => {
  const checkUser = setInterval(() => {
    if (window.charName) {
      clearInterval(checkUser);
      void iniciarMailbox();
    }
  }, 300);
});

export {};
