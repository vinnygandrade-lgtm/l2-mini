/**
 * UI_CHAT.JS
 * Centraliza toda a funcionalidade do Chat Global (Simulado) e Abas de Log.
 */

function chatT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

const frasesBotsChat = [
    "Anyone know where Animal Bone drops?",
    "Selling [Sword of Damascus] +4 /pm me!!",
    "Dragon Valley farm party?",
    "These enchant rates are killing me...",
    "Used 50 scrolls, still no +6. I'm done.",
    "Recruiting for clan lvl 5! PM me.",
    "How long until Antharas spawns?",
    "Solo'd by a mob in TOI, shameful lol",
    "Olympiad is spicy today!",
    "Buying Ancient Coins, good pay!",
    "Anyone with Fighter buff in Giran?",
    "That TitanX is cracked ngl.",
    "Raid? Need a healer!",
    "L2 Mini is way too addictive...",
    "Finally hit level 80! #Hype",
    "Who wins? Spellsinger or Sorcerer?",
    "GK lag or is it just me?",
    "Buying Grade A augment stones.",
    "Soulshots cheap / Black Friday prices!",
    "Where is NPC Reorin?",
    "Anyone for 1v1 in the arena?",
    "Gladi is the best pvp class, change my mind.",
    "Just dropped a Top Grade Life Stone! GZ",
    "Went for +16 and shattered the weap... F",
    "Any GM online?"
];

let chatIniciado = false;

/** IDs já mostrados (evita duplicar INSERT local + postgres_changes). */
let clanChatSeenMessageIds = new Set();

function isCloudChatUser() {
    return !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled &&
        window.SupabaseAPI && typeof window.SupabaseAPI.getUser === 'function' && window.SupabaseAPI.getUser());
}

function aplicarMensagemClanCloudRow(row) {
    if (!row || !row.id) return;
    if (clanChatSeenMessageIds.has(row.id)) return;
    clanChatSeenMessageIds.add(row.id);
    if (clanChatSeenMessageIds.size > 400) {
        clanChatSeenMessageIds = new Set(Array.from(clanChatSeenMessageIds).slice(-200));
    }
    const ts = row.created_at ? new Date(row.created_at).getTime() : Date.now();
    adicionarMensagemChat(row.char_name, row.body, row.tier || 'Paper', 'clan', true, ts, row.ascension_title || '');
}

/**
 * Abre subscrição + histórico do chat de clã na nuvem (RLS).
 */
async function sincronizarAbaClanChatCloud() {
    if (!isCloudChatUser() || !window.SupabaseAPI) return;
    if (typeof playerClanId === 'undefined' || playerClanId == null) return;

    const el = document.getElementById('chat-clan');
    if (!el) return;

    el.innerHTML = '';
    clanChatSeenMessageIds.clear();

    const rows = await window.SupabaseAPI.fetchClanChatHistory(playerClanId);
    rows.forEach((row) => aplicarMensagemClanCloudRow(row));

    window.SupabaseAPI.subscribeClanChat(playerClanId, (row) => aplicarMensagemClanCloudRow(row));
}

/**
 * Alterna entre as abas de LOG (Combat/System), CHAT (Global) e CLAN
 */
function switchLogTab(tab) {
    if (tab !== 'clan' && window.SupabaseAPI && typeof window.SupabaseAPI.unsubscribeClanChat === 'function') {
        window.SupabaseAPI.unsubscribeClanChat();
    }

    // Esconde todos os conteúdos primeiro
    const log = document.getElementById('log');
    const chatGlobal = document.getElementById('chat-global');
    const chatClan = document.getElementById('chat-clan');
    const chatInput = document.getElementById('chat-input-container');

    if (log) log.classList.remove('active');
    if (chatGlobal) chatGlobal.classList.remove('active');
    if (chatClan) chatClan.classList.remove('active');
    if (chatInput) chatInput.style.display = 'none';

    // Remove active class from all buttons
    document.querySelectorAll('.log-tab').forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'combat') {
        const btnCombat = document.getElementById('btn-tab-combat');
        if (btnCombat) btnCombat.classList.add('active');
        if (log) log.classList.add('active');
    } else if (tab === 'chat') {
        const btnChat = document.getElementById('btn-tab-chat');
        if (btnChat) btnChat.classList.add('active');
        if (chatGlobal) chatGlobal.classList.add('active');
        if (chatInput) chatInput.style.display = 'flex';
    } else if (tab === 'clan') {
        // Verifica se o jogador está em um clã
        if (typeof playerClanId === 'undefined' || !playerClanId) {
            if (typeof mostrarAviso === 'function') mostrarAviso(chatT('chat.clanOnly'));
            // Volta para a aba global se tentar entrar sem clã
            switchLogTab('chat');
            return;
        }
        const btnClan = document.getElementById('btn-tab-clan');
        if (btnClan) btnClan.classList.add('active');
        if (chatClan) chatClan.classList.add('active');
        if (chatInput) chatInput.style.display = 'flex';
        if (isCloudChatUser()) {
            void sincronizarAbaClanChatCloud();
        }
    }
}

/**
 * Escapa caracteres HTML para evitar ataques XSS
 */
function escaparHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

let lastMessageTime = 0;
const SPAM_COOLDOWN = 1000; // 1 segundo entre mensagens
const CHAT_HISTORY_LIMIT_DAYS = 3;

/**
 * Adiciona uma mensagem visual ao container de chat (global ou clan)
 */
function adicionarMensagemChat(autor, mensagem, tipo = 'papel', canal = 'global', pularPersistencia = false, forcedTimestamp = null, ascensionTitle = '') {
    const containerId = canal === 'clan' ? 'chat-clan' : 'chat-global';
    const chatContainer = document.getElementById(containerId);
    if (!chatContainer) return;

    // Sanitização de segurança
    const autorLimpo = escaparHTML(autor);
    const mensagemLimpa = escaparHTML(mensagem);

    // Determina se a mensagem é do jogador ATUAL (para ficar verde)
    const ehOMeuPersonagem = (typeof charName !== 'undefined' && autor === charName);
    
    // Normaliza o tipo para as classes CSS (remove acentos e deixa minusculo)
    let classeCor = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Tratamento especial para anúncios de GM
    let isAnnouncement = (tipo === 'GM_ANNOUNCEMENT');
    if (isAnnouncement) {
        classeCor = "announcement";
    }

    // Se for o personagem que está logado AGORA, aplica a cor verde especial, 
    // independente de como a mensagem foi salva originalmente.
    if (ehOMeuPersonagem && !isAnnouncement) {
        classeCor = "player";
    }

    // Busca tag de clã (se houver e não for chat de clã)
    let clanTag = "";
    if (canal !== 'clan' && typeof clans !== 'undefined' && !isAnnouncement) {
        const clan = clans.find(c => c.membros.includes(autor));
        if (clan) {
            clanTag = `<span style="color: #ca8a04; font-size: 0.85em; margin-right: 4px; font-weight: bold;">[${clan.sigla}]</span>`;
        }
    }

    let ascensionBadge = '';
    if (!isAnnouncement) {
        let effectiveAsc = typeof ascensionTitle === 'string' ? ascensionTitle.trim() : '';
        if (!effectiveAsc && ehOMeuPersonagem && window.EndgamePursuits && typeof window.EndgamePursuits.getRenownTitle === 'function') {
            effectiveAsc = window.EndgamePursuits.getRenownTitle() || '';
        }
        if (effectiveAsc) {
            ascensionBadge = `<span style="color:#c084fc;font-size:0.82em;font-weight:700;margin-right:5px;font-family:'Cinzel',serif;">[${escaparHTML(effectiveAsc)}]</span>`;
        }
    }

    const dataMsg = forcedTimestamp ? new Date(forcedTimestamp) : new Date();
    const hora = dataMsg.getHours().toString().padStart(2, '0');
    const minuto = dataMsg.getMinutes().toString().padStart(2, '0');
    const timestampHtml = `<span style="color: #555; font-size: 0.9em; margin-right: 5px;">[${hora}:${minuto}]</span>`;

    // Persistência local (Simulando Multiplayer)
    if (!pularPersistencia) {
        const hist = { autor, mensagem, tipo, timestamp: Date.now() };
        const trimmedAsc = typeof ascensionTitle === 'string' ? ascensionTitle.trim() : '';
        if (trimmedAsc) hist.ascensionTitle = trimmedAsc;
        salvarMensagemNoHistorico(canal, hist);
    }

    // Usamos aspas duplas no onclick e escapamos aspas simples no nome para evitar quebra de JS
    const autorParaJS = autorLimpo.replace(/'/g, "\\'");

    // Prefixo do canal para o chat de clã
    const prefixoCanal = canal === 'clan' ? `<span style="color: #ca8a04; font-weight: bold; margin-right: 5px;">[CLAN]</span>` : "";

    let msgHtml = "";
    if (isAnnouncement) {
        msgHtml = `
            <div class="chat-msg announcement-msg" style="background: rgba(153, 27, 27, 0.2); border: 1px solid #ef4444; border-radius: 4px; padding: 5px 10px; margin: 5px 0;">
                <span style="color: #ef4444; font-weight: bold; font-family: 'Cinzel';">[ANNOUNCEMENT]</span>
                <span class="chat-text" style="color: #fff; font-weight: bold;">${mensagemLimpa}</span>
            </div>
        `;
    } else {
        msgHtml = `
            <div class="chat-msg">
                ${timestampHtml}
                ${prefixoCanal}
                ${clanTag}
                ${ascensionBadge}
                <span class="chat-author ${classeCor}" onclick="abrirPerfilChat('${autorParaJS}', '${tipo}')">${autorLimpo}:</span>
                <span class="chat-text" style="color: #e5dacc;">${mensagemLimpa}</span>
            </div>
        `;
    }

    // No chat global/clan, as mensagens novas aparecem em baixo agora por causa do flex-direction: column-reverse
    chatContainer.insertAdjacentHTML('afterbegin', msgHtml);
    
    // Limita o número de mensagens visíveis para não pesar
    if (chatContainer.children.length > 50) {
        chatContainer.removeChild(chatContainer.lastElementChild);
    }
}

/**
 * Salva a mensagem no LocalStorage e remove mensagens com mais de 3 dias
 */
function salvarMensagemNoHistorico(canal, msgObj) {
    const key = canal === 'clan' ? 'l2mini_chat_clan_history' : 'l2mini_chat_global_history';
    let history = [];
    
    try {
        const saved = localStorage.getItem(key);
        if (saved) history = JSON.parse(saved);
    } catch (e) { history = []; }

    history.push(msgObj);

    // Limpeza: Mantém apenas os últimos 3 dias
    const tresDiasAtras = Date.now() - (CHAT_HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000);
    history = history.filter(m => m.timestamp > tresDiasAtras);

    // Limite de segurança para não explodir o localStorage (ex: 200 mensagens)
    if (history.length > 200) history = history.slice(-200);

    localStorage.setItem(key, JSON.stringify(history));
}

/**
 * Carrega o histórico de mensagens salvas
 */
function carregarHistoricoChat() {
    const canais = ['global', 'clan'];
    const cloud = isCloudChatUser();

    canais.forEach(canal => {
        if (canal === 'clan' && cloud) return;

        const key = canal === 'clan' ? 'l2mini_chat_clan_history' : 'l2mini_chat_global_history';
        try {
            const saved = localStorage.getItem(key);
            if (!saved) return;
            
            let history = JSON.parse(saved);
            const tresDiasAtras = Date.now() - (CHAT_HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000);
            
            // Filtra e ordena por timestamp (antigas primeiro para o insertAdjacentHTML funcionar)
            history = history
                .filter(m => m.timestamp > tresDiasAtras)
                .sort((a, b) => a.timestamp - b.timestamp);

            history.forEach(m => {
                adicionarMensagemChat(m.autor, m.mensagem, m.tipo, canal, true, m.timestamp, m.ascensionTitle || '');
            });
        } catch (e) { console.error(`Erro ao carregar histórico de chat (${canal}):`, e); }
    });
}

/**
 * Sistema de Cache para Inspeção (Evita lag de rede em cliques repetidos)
 */
const inspectionCache = new Map();
const CACHE_DURATION = 120000; // 2 minutos

/**
 * Abre o perfil de um jogador do chat (bot ou player)
 */
function abrirPerfilChat(nome, tipo) {
    // Se clicar no próprio nome, abre o perfil do jogador
    if (typeof window.charName !== 'undefined' && nome === window.charName) {
        if (typeof irPara === 'function') irPara('perfil');
        return;
    }

    // MULTIPLAYER: Tenta buscar dados do jogador real na nuvem
    if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled) {
        
        // Verifica se temos os dados no cache e se não expiraram
        const cached = inspectionCache.get(nome);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log("⚡ [Cache] Usando dados locais para:", nome);
            window.botAtualVisualizado = cached.data;
            if (typeof abrirPerfilJogadorRanking === 'function') {
                abrirPerfilJogadorRanking(nome, true);
            }
            return;
        }

        // Se não tem cache, busca na nuvem
        if (window.mostrarAviso) window.mostrarAviso(chatT('chat.inspecting', { name: String(nome).replace(/[<>&]/g, '') }));
        
        console.log("🔍 Buscando dados cloud autoritativos para inspeção:", nome);
        
        // Primeiro busca os dados básicos e o JSONB
        window.SupabaseAPI.client
            .from('characters')
            .select('char_name, char_class, level, data')
            .eq('char_name', nome)
            .maybeSingle() 
            .then(async ({ data, error }) => {
                if (error) {
                    console.error("Erro na busca de inspeção:", error);
                    tentarAbrirPerfilLegado(nome);
                    return;
                }

                if (data && data.data) {
                    const realData = data.data;
                    
                    // AGORA A MÁGICA: Busca os status autoritativos (recalculados no servidor)
                    let authoritativeStats = realData.playerStats;
                    try {
                        const authRes = await window.SupabaseAPI.getPlayerStatsAutoritativo(nome);
                        if (authRes && authRes.success) {
                            console.log("🛡️ [Authority] Status recalculados pelo servidor:", authRes.stats);
                            authoritativeStats = authRes.stats;
                        }
                    } catch (e) {
                        console.warn("Falha ao obter status autoritativos, usando JSONB:", e);
                    }

                    const egR =
                        realData.endgame && typeof realData.endgame.renown === 'number'
                            ? realData.endgame.renown
                            : 0;
                    const ascTitleInspect =
                        window.EndgamePursuits && typeof window.EndgamePursuits.getAscensionTitleForRenown === 'function'
                            ? window.EndgamePursuits.getAscensionTitleForRenown(egR)
                            : '';

                    const profileData = {
                        nome: data.char_name,
                        classe: data.char_class || realData.charClass || 'Fighter',
                        nivel: data.level || realData.nivel || 1,
                        olympiadPoints: realData.olympiadPoints || 0,
                        raca: realData.charRace || 'Human',
                        isMage: window.isClasseMagica ? window.isClasseMagica(data.char_class || realData.charClass) : false,
                        maxHp: authoritativeStats.maxHp || 1000,
                        maxMp: authoritativeStats.maxMp || 500,
                        pAtk: authoritativeStats.pAtk || 100,
                        mAtk: authoritativeStats.mAtk || 100,
                        pDef: authoritativeStats.pDef || 100,
                        mDef: authoritativeStats.mDef || 100,
                        atkSpd: authoritativeStats.atkSpeed || 500,
                        critRate: authoritativeStats.critRate || 5,
                        renown: egR,
                        ascensionTitle: ascTitleInspect,
                        isCloudPlayerInspection: true,
                        equipamentos: {
                            arma: realData.armaEquipadaBase ? (realData.armaEquipadaBase.base || realData.armaEquipadaBase) : null,
                            armadura: realData.armaduraEquipada ? (realData.armaduraEquipada.base || realData.armaduraEquipada) : null,
                            joias: [
                                realData.colarEquipado, realData.brincoEquipado1, realData.brincoEquipado2,
                                realData.anelEquipado1, realData.anelEquipado2
                            ].filter(j => j).map(j => j.base || j),
                            enchant: realData.enchant || 0
                        }
                    };

                    // Salva no Cache
                    inspectionCache.set(nome, {
                        data: profileData,
                        timestamp: Date.now()
                    });

                    window.botAtualVisualizado = profileData;
                    
                    if (typeof abrirPerfilJogadorRanking === 'function') {
                        abrirPerfilJogadorRanking(data.char_name, true);
                    }
                } else {
                    window.l2Alert(chatT('chat.playerNotFoundCloud'));
                    tentarAbrirPerfilLegado(nome);
                }
            });
        return;
    }

    tentarAbrirPerfilLegado(nome);
}

function tentarAbrirPerfilLegado(nome) {
    // Tenta carregar como outro jogador salvo localmente ou bot
    if (typeof abrirPerfilMembroClan === 'function') {
        abrirPerfilMembroClan(nome);
    } else if (typeof dbBotsRanking !== 'undefined') {
        const botData = dbBotsRanking.find(b => (b.nome || b.farmBot1) === nome);
        if (botData && typeof abrirPerfilJogadorRanking === 'function') {
            abrirPerfilJogadorRanking(nome, true);
        }
    }
}

/**
 * Envia a mensagem digitada pelo jogador
 */
function enviarMensagemPlayer() {
    const input = document.getElementById('input-chat-msg');
    if (!input) return;
    
    const msg = input.value.trim();
    
    if (msg.length === 0) return;

    // Detecta o canal atual baseado na aba ativa
    const btnClan = document.getElementById('btn-tab-clan');
    const canalAtual = (btnClan && btnClan.classList.contains('active')) ? 'clan' : 'global';

    // Controle de Spam
    const agora = Date.now();
    if (agora - lastMessageTime < SPAM_COOLDOWN) {
        if (typeof mostrarAviso === 'function') mostrarAviso(chatT('chat.spamWait'));
        return;
    }
    lastMessageTime = agora;

    if (msg.length > 100) {
        if (typeof mostrarAviso === 'function') mostrarAviso(chatT('chat.msgTooLong'));
        return;
    }

    // Pega o rank atual do player para salvar no histórico (caso mude de conta, mostra o rank antigo)
    let rankData = (typeof getOlympiadRank === 'function') ? getOlympiadRank(olympiadPoints) : { tier: 'Paper' };
    
    const meuNome = typeof charName !== 'undefined' ? charName : "Player";
    const ascTitle =
        (window.EndgamePursuits && typeof window.EndgamePursuits.getRenownTitle === 'function')
            ? (window.EndgamePursuits.getRenownTitle() || '')
            : '';

    const cloudUser = isCloudChatUser();
    const isClanCloud = canalAtual === 'clan' && cloudUser;

    if (!isClanCloud) {
        adicionarMensagemChat(meuNome, msg, rankData.tier, canalAtual, false, null, ascTitle);
    }
    input.value = '';

    if (cloudUser && canalAtual === 'global') {
        void (async () => {
            try {
                await window.SupabaseAPI.ensureChatConnected(meuNome, {});
                const sent = await window.SupabaseAPI.broadcastChat(meuNome, msg, rankData.tier, canalAtual, ascTitle);
                if (!sent && typeof window.mostrarAviso === 'function') {
                    window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.chatSendFailed') : 'Could not send chat to other players. Check your connection.');
                }
            } catch (e) {
                console.warn('Chat cloud:', e);
                if (typeof window.mostrarAviso === 'function') {
                    window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.chatSendFailed') : 'Could not send chat to other players. Check your connection.');
                }
            }
        })();
    }

    if (isClanCloud) {
        void (async () => {
            try {
                if (typeof playerClanId === 'undefined' || playerClanId == null) return;
                const r = await window.SupabaseAPI.insertClanChatMessage(playerClanId, msg, rankData.tier, ascTitle);
                if (r.error) {
                    if (typeof window.mostrarAviso === 'function') {
                        window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.clanChatSendFailed') : 'Clan message could not be sent. Sync your character or check membership.');
                    }
                    return;
                }
                // A mensagem será adicionada via Realtime (subscribeClanChat)
            } catch (e) {
                console.warn('Clan chat cloud:', e);
                if (typeof window.mostrarAviso === 'function') {
                    window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.clanChatSendFailed') : 'Clan message could not be sent.');
                }
            }
        })();
    }

    // Simulação de Multiplayer (Canal Global) - Só sem sessão cloud (evita bots falsos / ruído)
    if (canalAtual === 'global' && !cloudUser) {
        // Pequena chance de um bot responder a você (interação simulada)
        if (Math.random() > 0.7) {
            setTimeout(() => {
                const respostas = [
                    "kkkkk concordo",
                    "boa!",
                    "?",
                    "fala mais sobre isso ae",
                    "quem?",
                    "bora pvp então",
                    "isso aí!",
                    "pior que é verdade kkk"
                ];
                
                if (typeof dbBotsRanking !== 'undefined' && dbBotsRanking.length > 0) {
                    const bot = dbBotsRanking[Math.floor(Math.random() * dbBotsRanking.length)];
                    const nomeBot = bot.nome || bot.farmBot1 || "Adventurer";
                    const frase = respostas[Math.floor(Math.random() * respostas.length)];
                    
                    // Pega o rank do bot que respondeu
                    let rankBot = (typeof getOlympiadRank === 'function') ? getOlympiadRank(bot.olympiadPoints) : { tier: 'Paper' };
                    adicionarMensagemChat(nomeBot, frase, rankBot.tier, 'global');
                }
            }, 2000);
        }
    } 
    // Simulação local (clã) — não misturar com broadcast real
    else if (canalAtual === 'clan' && !cloudUser) {
        setTimeout(() => {
            const meuClan = clans.find(c => c.id === playerClanId);
            if (meuClan && meuClan.membros.length > 1) {
                // Filtra para pegar um membro que não seja o player
                const outrosMembros = meuClan.membros.filter(m => m !== meuNome);
                if (outrosMembros.length > 0) {
                    const membro = outrosMembros[Math.floor(Math.random() * outrosMembros.length)];
                    const respostasClan = [
                        "Opa, fala!",
                        "Bora farmar depois?",
                        "Alguém on pra Raid?",
                        "Amanhã tem Siege hein",
                        "Salve clã!",
                        "Tamo junto"
                    ];
                    const frase = respostasClan[Math.floor(Math.random() * respostasClan.length)];
                    
                    // Busca dados do bot/membro para pegar o rank
                    let rankMembro = { tier: 'Paper' };
                    if (typeof dbBotsRanking !== 'undefined') {
                        const botData = dbBotsRanking.find(b => (b.nome || b.farmBot1) === membro);
                        if (botData) rankMembro = getOlympiadRank(botData.olympiadPoints);
                    }
                    
                    adicionarMensagemChat(membro, frase, rankMembro.tier, 'clan');
                }
            }
        }, 1500);
    }
}

/**
 * Inicia o loop de mensagens automáticas dos bots
 */
function iniciarChatAutomatico() {
    if (chatIniciado) return;
    chatIniciado = true;

    carregarHistoricoChat();

    const cloudUser = isCloudChatUser();
    if (cloudUser) {
        return;
    }

    // Função para gerar uma mensagem aleatória de um bot
    function gerarMensagemAleatoria() {
        if (typeof dbBotsRanking === 'undefined' || dbBotsRanking.length === 0) {
            // Se o DB de bots ainda não carregou, tenta novamente em breve
            setTimeout(gerarMensagemAleatoria, 2000);
            return;
        }

        // Escolhe um bot aleatório
        const bot = dbBotsRanking[Math.floor(Math.random() * dbBotsRanking.length)];
        const nomeBot = bot.nome || bot.farmBot1 || "Adventurer";
        
        // Escolhe uma frase aleatória
        const frase = frasesBotsChat[Math.floor(Math.random() * frasesBotsChat.length)];
        
        // Pega o rank real do bot baseado nos pontos dele
        let rankBot = (typeof getOlympiadRank === 'function') ? getOlympiadRank(bot.olympiadPoints) : { tier: 'Paper' };

        adicionarMensagemChat(nomeBot, frase, rankBot.tier);

        // Define o próximo intervalo (entre 5 a 15 segundos)
        const proximoIntervalo = Math.floor(Math.random() * 10000) + 5000;
        setTimeout(gerarMensagemAleatoria, proximoIntervalo);
    }

    // Inicia o loop
    setTimeout(gerarMensagemAleatoria, 3000);
}

// Ouvinte para o Enter no chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const inputChat = document.getElementById('input-chat-msg');
        const containerChat = document.getElementById('chat-input-container');
        
        if (!inputChat || !containerChat) return;

        // Se o chat estiver visível e focado, envia
        if (containerChat.style.display === 'flex' && document.activeElement === inputChat) {
            enviarMensagemPlayer();
        } 
        // Se o chat estiver visível mas não focado, foca nele
        else if (containerChat.style.display === 'flex') {
            inputChat.focus();
        }
    }
});
