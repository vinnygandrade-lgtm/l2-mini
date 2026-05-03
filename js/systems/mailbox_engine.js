/**
 * MAILBOX_ENGINE.JS
 * Correio, notificações e recompensas (estilo MMORPG).
 * v2.0
 */

let mailboxAbaAtual = 'inbox';
let mailboxDados = { inbox: [], history: [] };

function mb(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

/**
 * Inicializa o sistema de Mailbox
 */
function iniciarMailbox() {
    console.log("[Mailbox] Sistema Profissional inicializado.");
    carregarMailbox();
    atualizarIconeMailbox();
    
    // Intervalo de verificação de novas mensagens (simula recebimento de rede)
    setInterval(atualizarIconeMailbox, 20000);
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
            detalhes: m.details,
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
async function enviarMail(destinatario, remetente, assunto, tipo, detalhes = {}) {
    if (!destinatario || destinatario.trim() === "") return false;
    
    const destKey = destinatario.toLowerCase().trim();
    const remetenteNome = remetente || 'System';

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const result = await window.SupabaseAPI.sendMail(destinatario, assunto, tipo, detalhes);
        if (result && result.success) {
            // Se enviou para si mesmo, recarrega a inbox
            if (window.charName && destKey === window.charName.toLowerCase()) {
                await carregarMailbox();
                atualizarIconeMailbox();
            }
            return true;
        }
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
            atualizarIconeMailbox();
            if (document.getElementById('janela-mailbox')?.style.display === 'flex') {
                renderizarMailbox();
            }
        }
        return true;
    } catch (e) {
        console.error("[Mailbox] Erro ao enviar mail:", e);
        return false;
    }
}
window.enviarMail = enviarMail; // Expõe globalmente

/**
 * Atualiza o badge e animação do ícone de mail no HUD
 */
function atualizarIconeMailbox() {
    const btn = document.getElementById('btn-sistema-notificacoes');
    const badge = document.getElementById('notif-badge');
    if (!btn) return;

    carregarMailbox();
    const unreadCount = mailboxDados.inbox.filter(m => !m.lido).length;

    if (unreadCount > 0) {
        btn.classList.add('notif-icon-flashing');
        if (badge) {
            badge.style.display = 'block';
            badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        }
    } else {
        btn.classList.remove('notif-icon-flashing');
        if (badge) badge.style.display = 'none';
    }
}

/**
 * Abre a janela de Mailbox
 */
function abrirJanelaCorreio() {
    mailboxAbaAtual = 'inbox';
    carregarMailbox();
    
    // Reset visual dos botões
    mudarAbaMailbox('inbox');
    abrirModal('janela-mailbox', 2000);
    atualizarIconeMailbox();
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
        cont.innerHTML = `
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#555;">
                <span style="font-size:3.5em; margin-bottom:15px; opacity:0.2;">✉️</span>
                <p style="font-family:'Cinzel'; font-size:11px; letter-spacing:1px;">${emptyText}</p>
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
            const m = msg.detalhes || {};
            const isParcel = m.marketKind === 'purchase_delivery';
            const snap = m.itemSnapshot || m.item_snapshot || {};
            const nomeItem = snap.nome || mb('market.categoryItemGeneric');
            const encTxt = (m.enchant > 0) ? `<span style="color:#38bdf8;">+${m.enchant}</span> ` : '';

            if (isParcel) {
                const moedaLabel = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
                const corMoeda = m.moeda === 'coin' ? '#60a5fa' : '#facc15';
                const img = snap.img || snap.icone || 'assets/icons/etc_etc_box_ot_i00.png';
                return `
                    <div style="color:#a8a29e; margin-bottom:12px; line-height:1.55; font-size:10px; border-left:2px solid #ca8a04; padding-left:10px;">
                        <span style="color:#facc15; font-family:'Cinzel',serif; font-weight:bold; letter-spacing:0.08em; display:block; margin-bottom:6px;">${mb('mailbox.parcelTitle')}</span>
                        ${mb('mailbox.parcelBody')}
                    </div>
                    <div style="display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.45); padding:10px; border-radius:8px; border:1px solid #3d2b1f; margin-bottom:10px;">
                        <img src="${img}" style="width:44px;height:44px;object-fit:contain;border-radius:4px;border:1px solid #444;" onerror="this.src='assets/itens/item_generic.png'">
                        <div style="flex:1;">
                            <div style="font-family:'Cinzel',serif; color:#fff; font-weight:bold; font-size:11px;">${encTxt}${nomeItem}${Number(m.qtd) > 1 ? ' <span style="color:#10b981;">×' + m.qtd + '</span>' : ''}</div>
                            <div style="font-size:9px; color:#78716c; margin-top:4px;">${mb('mailbox.seller')} <span style="color:#d6d3d1;">${m.sellerName || '—'}</span></div>
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
            if (msg.assunto.includes('Application')) {
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
                htmlRec += `<div style="display:grid; grid-template-columns: 1fr; gap:4px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; border:1px solid #333;">`;
                sys.recompensas.forEach(r => {
                    let cor = r.epic ? '#c084fc' : '#fff';
                    let nomeExibicao = r.nome || r.id;
                    htmlRec += `<div style="display:flex; justify-content:space-between; font-size:10px; color:${cor};"><span>${nomeExibicao}</span> <b>x${r.qtd}</b></div>`;
                });
                htmlRec += `</div>`;
                
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
        atualizarIconeMailbox();
    }
}

/**
 * Processa as ações das mensagens
 */
async function processarAcaoMail(msgId, acao, param = null) {
    const msgIndex = mailboxDados.inbox.findIndex(m => m.id == msgId);
    if (msgIndex === -1) return;
    const msg = mailboxDados.inbox[msgIndex];

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && typeof msgId === 'string' && msgId.length > 20) {
        try {
            if (['collect_market', 'collect_market_delivery', 'collect_raid', 'collect_player'].includes(acao)) {
                const result = await window.SupabaseAPI.claimMailReward(msgId);
                
                if (result && result.success) {
                    // Sincroniza estado local baseado no que o servidor deu
                    if (result.reward_adena > 0) window.adenas = (Number(window.adenas) || 0) + result.reward_adena;
                    if (result.reward_ancient > 0) window.ancientCoins = (Number(window.ancientCoins) || 0) + result.reward_ancient;
                    
                    // Feedback visual e log
                    if (acao === 'collect_market') {
                        const m = msg.detalhes || {};
                        const coinLbl = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
                        escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketSettlement', { amount: (result.reward_adena || result.reward_ancient).toLocaleString(), currency: coinLbl })}</span>`);
                        mostrarAviso(mb('mailbox.avisoFundsCollected'));
                    } else if (acao === 'collect_market_delivery') {
                        mostrarAviso(mb('mailbox.avisoParcelClaimed'));
                    } else if (acao === 'collect_raid') {
                        escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logRaidRewardsCollected', { subject: msg.assunto })}</span>`);
                        mostrarAviso(mb('mailbox.avisoRewardsCollected'));
                    } else if (acao === 'collect_player') {
                        escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerRewardReceived', { sender: msg.remetente })}</span>`);
                        mostrarAviso(mb('mailbox.avisoGoldReceived'));
                    }

                    // Recarrega a mailbox para mover para o histórico
                    await carregarMailbox();
                    renderizarMailbox();
                    atualizarIconeMailbox();
                    if (typeof atualizar === 'function') atualizar();
                    return;
                } else {
                    const errMsg = result ? result.error : 'unknown_error';
                    mostrarAviso(mb('game.cloud.error') + ': ' + errMsg);
                    return;
                }
            }
        } catch (e) {
            console.error("[Mailbox RPC Exception]", e);
            return;
        }
    }

    if (acao === 'collect_market') {
        const m = msg.detalhes || {};
        if (m.marketKind === 'purchase_delivery') return;
        const mv = Number(m.valor) || 0;
        if (mv <= 0) return;
        if (m.moeda === 'adena') {
            window.adenas = (Number(window.adenas) || 0) + mv;
        } else {
            window.ancientCoins = (Number(window.ancientCoins) || 0) + mv;
        }
        const coinLbl = m.moeda === 'coin' ? mb('mailbox.currencyAncient') : mb('mailbox.currencyAdena');
        escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketSettlement', { amount: mv.toLocaleString(), currency: coinLbl })}</span>`);
        mostrarAviso(mb('mailbox.avisoFundsCollected'));
    }
    else if (acao === 'collect_market_delivery') {
        const d = msg.detalhes || {};
        if (d.marketKind !== 'purchase_delivery') return;
        const snap = d.itemSnapshot || d.item_snapshot || {};
        const qtd = Math.max(1, Number(d.qtd) || 1);

        if (d.categoria === 'equips') {
            let novoItem = d.fullItem;
            if (novoItem && typeof ItemSecurity !== 'undefined' && ItemSecurity.isValidInstance(novoItem)) {
                novoItem.owner = charName;
                novoItem.origin = 'IronGate';
            } else if (typeof ItemSecurity !== 'undefined') {
                const tipo = (novoItem && novoItem.tipo) || snap.tipoItem || snap.tipo || 'armor';
                const base = (novoItem && novoItem.base) ? novoItem.base : snap;
                novoItem = ItemSecurity.createInstance(tipo, base, {
                    enchant: d.enchant != null ? d.enchant : 0,
                    origin: 'IronGate'
                });
            } else {
                novoItem = {
                    tipo: snap.tipoItem || snap.tipo || 'armor',
                    base: snap,
                    enchant: d.enchant || 0
                };
            }
            if (typeof InventoryManager !== 'undefined') {
                InventoryManager.adicionarEquipamento(novoItem);
            }
            escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketParcelEquip', { name: snap.nome || mb('mailbox.fallbackParcelEquip') })}</span>`);
        } else {
            const nomeMat = snap.nome || d.itemNome;
            if (nomeMat) {
                if (!window.inventario) window.inventario = {};
                window.inventario[nomeMat] = (Number(window.inventario[nomeMat]) || 0) + qtd;
            }
            escreverLog(`<span style="color:#facc15;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${mb('mailbox.logMarketParcelMats', { qty: qtd, name: nomeMat || mb('mailbox.fallbackParcelGoods') })}</span>`);
        }
        mostrarAviso(mb('mailbox.avisoParcelClaimed'));
    } 
    else if (acao === 'collect_raid') {
        const sys = msg.detalhes;
        if (sys.recompensas) {
            sys.recompensas.forEach(r => {
                const idLower = String(r.id).toLowerCase();
                if (idLower === 'ancient coin' || idLower === 'ancientcoin' || idLower === 'ancientcoins') {
                    window.ancientCoins = (Number(window.ancientCoins) || 0) + Number(r.qtd);
                } else if (idLower === 'adena' || idLower === 'adenas') {
                    window.adenas = (Number(window.adenas) || 0) + Number(r.qtd);
                } else {
                    // 🛡️ LÓGICA BLINDADA: Tenta adicionar como equipamento primeiro, se falhar vai pro inventário comum
                    const itemData = window.RankingSeasons?.findItemData(r.id);
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
                        if (!window.inventario) window.inventario = {};
                        window.inventario[r.id] = (Number(window.inventario[r.id]) || 0) + Number(r.qtd);
                    }
                }
            });
            escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logRaidRewardsCollected', { subject: msg.assunto })}</span>`);
            mostrarAviso(mb('mailbox.avisoRewardsCollected'));
        }
    }
    else if (acao === 'collect_player') {
        const p = msg.detalhes;
        window.adenas = (Number(window.adenas) || 0) + Number(p.adena);
        p.adena = 0; // Evita coletar de novo se a mensagem ficar na inbox
        escreverLog(`<span style="color:#10b981;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerRewardReceived', { sender: msg.remetente })}</span>`);
        mostrarAviso(mb('mailbox.avisoGoldReceived'));
    }
    else if (acao === 'clan_accept') {
        if (typeof responderSolicitacao === 'function') responderSolicitacao(param, true);
    }
    else if (acao === 'clan_decline') {
        if (typeof responderSolicitacao === 'function') responderSolicitacao(param, false);
    }

    // Move para o histórico após a ação (exceto se for apenas arquivamento)
    const finalMsg = mailboxDados.inbox.splice(msgIndex, 1)[0];
    finalMsg.lido = true;
    mailboxDados.history.unshift(finalMsg);
    
    if (mailboxDados.history.length > 100) mailboxDados.history.pop();

    salvarMailbox();
    renderizarMailbox();
    atualizarIconeMailbox();
    if (typeof atualizar === 'function') atualizar();
    if (typeof salvarJogo === 'function') salvarJogo();
}

/**
 * Coleta todos os ganhos de mercado de uma vez
 */
async function coletarTudoMarket() {
    const marketMsgs = mailboxDados.inbox.filter(m => {
        if (m.tipo !== 'market') return false;
        const d = m.detalhes || {};
        if (d.marketKind === 'purchase_delivery') return false;
        return Number(d.valor) > 0;
    });
    if (marketMsgs.length === 0) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        mostrarAviso(mb('game.cloud.syncing'));
        for (const msg of marketMsgs) {
            await window.SupabaseAPI.claimMailReward(msg.id);
        }
        await carregarMailbox();
        renderizarMailbox();
        atualizarIconeMailbox();
        if (typeof atualizar === 'function') atualizar();
        mostrarAviso(mb('mailbox.avisoBulkSettlement'));
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
    atualizarIconeMailbox();
    if (typeof atualizar === 'function') atualizar();
    
    const adenaLbl = mb('mailbox.currencyAdena');
    const coinLbl = mb('mailbox.currencyAncient');
    const bulkText = totalCoins > 0
        ? mb('mailbox.logMarketBulkBoth', { adena: totalAdena.toLocaleString(), adenaLabel: adenaLbl, coins: totalCoins.toLocaleString(), coinLabel: coinLbl })
        : mb('mailbox.logMarketBulkAdena', { adena: totalAdena.toLocaleString(), adenaLabel: adenaLbl });
    escreverLog(`<span style="color:#ca8a04;">${mb('market.mailLogPrefix')}</span> <span style="color:#10b981;">${bulkText}</span>`);
    mostrarAviso(mb('mailbox.avisoBulkSettlement'));
}

/**
 * Abre a interface de composição
 */
function abrirJanelaComporMail(dest = '') {
    document.getElementById('mail-destinatario').value = dest;
    document.getElementById('mail-mensagem').value = '';
    document.getElementById('mail-anexo-adena').value = 0;
    abrirModal('janela-mailbox-compor', 2100);
}

/**
 * Lógica para o player enviar mail para outro player
 */
async function enviarMailPlayer() {
    const dest = document.getElementById('mail-destinatario').value.trim();
    const msg = document.getElementById('mail-mensagem').value.trim();
    const val = parseInt(document.getElementById('mail-anexo-adena').value) || 0;
    const FEE = 500;

    if (!dest) return mostrarAviso(mb('mailbox.avisoRecipientRequired'));
    if (dest.toLowerCase() === charName.toLowerCase()) return mostrarAviso(mb('mailbox.avisoNoSelfMail'));
    if (!msg && val <= 0) return mostrarAviso(mb('mailbox.avisoMsgOrGold'));
    if (adenas < (val + FEE)) return mostrarAviso(mb('mailbox.avisoInsufficientAdena'));

    const confirmado = await l2Confirm(
        mb('mailbox.sendConfirm', { dest: dest, gold: val.toLocaleString(), fee: FEE }),
        mb('mailbox.titleSendMail')
    );
    if (confirmado) {
        const sucesso = await enviarMail(dest, charName, mb('mailbox.playerMailSubject'), 'player', {
            texto: msg,
            adena: val
        });

        if (sucesso) {
            adenas -= (val + FEE);
            fecharModal('janela-mailbox-compor');
            mostrarAviso(mb('mailbox.avisoMailSent'));
            escreverLog(`<span style="color:#7c3aed;">${mb('mailbox.mailLogTag')} ${mb('mailbox.logPlayerMailSent', { dest: dest, gold: val.toLocaleString() })}</span>`);
            if (typeof atualizar === 'function') atualizar();
        } else {
            mostrarAviso(mb('mailbox.avisoMailFailed'));
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
                || (msg.tipo === 'player' && d.adena > 0);
            const hasParcel = (msg.tipo === 'market' && d.marketKind === 'purchase_delivery');
            if (hasUncollectedGold || hasParcel) {
                const warn = hasParcel
                    ? mb('mailbox.warnParcelAbandon')
                    : mb('mailbox.warnUncollectedGold');
                const confirmado = await l2Confirm(warn, mb('mailbox.titleIronGate'));
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
        atualizarIconeMailbox();
        mostrarAviso(mb('mailbox.avisoMsgDeleted'));
    }
}

/**
 * Limpa o histórico
 */
async function limparHistoricoMail() {
    if (mailboxDados.history.length === 0) return;
    const confirmado = await l2Confirm(mb('mailbox.confirmPurgeHistory'), mb('mailbox.titlePurgeHistory'));
    if (confirmado) {
        mailboxDados.history = [];
        salvarMailbox();
        renderizarMailbox();
        mostrarAviso(mb('mailbox.historyPurgedToast'));
    }
}

/**
 * Helper para ver perfil com z-index correto
 */
function verPerfilPeloMail(nome) {
    if (typeof abrirPerfilMembroClan === 'function') {
        abrirPerfilMembroClan(nome);
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
function syncFromCloud(cloudMessages) {
    if (!Array.isArray(cloudMessages) || cloudMessages.length === 0) return false;
    
    // IMPORTANTE: Carrega o que já existe no localStorage primeiro!
    carregarMailbox();
    
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
        atualizarIconeMailbox();
        if (document.getElementById('janela-mailbox')?.style.display === 'flex') {
            renderizarMailbox();
        }
        return true;
    }
    return false;
}

window.MailboxEngine = {
    syncFromCloud: syncFromCloud
};

// Inicialização segura
window.addEventListener('load', () => {
    const checkUser = setInterval(() => {
        if (typeof charName !== 'undefined' && charName) {
            clearInterval(checkUser);
            iniciarMailbox();
        }
    }, 300);
});
