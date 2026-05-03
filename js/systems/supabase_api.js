/**
 * SUPABASE_API.JS - Fase 2: Integração com Supabase
 * 
 * Este arquivo fornece as funções para salvar dados e ler o ranking global.
 * Para usar, preencha as credenciais no objeto SUPABASE_CONFIG.
 */

const SUPABASE_CONFIG = {
    url: 'https://kgjcbujkzsrgcjcowxts.supabase.co', // Sua URL do Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnamNidWprenNyZ2NqY293eHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzk0NzcsImV4cCI6MjA5Mjk1NTQ3N30.s1C3ubMA_ZRrkCmtk1nLC4VjDImk707X1wSTsA9CL9A', // Sua Anon Key do Supabase
    enabled: true // Agora está ativado!
};

const SupabaseAPI = {
    client: null,
    currentUser: null,
    session: null,
    
    /**
     * Canal de combate dedicado (público) para evitar restrições de presença
     */
    combatChannel: null,
    _combatSubscribed: false,

    // --- NOVO: CONEXÃO COM SERVIDOR NODE.JS (ARENA) ---
    nodeSocket: null,
    nodeServerUrl: 'https://l2mini-arena.onrender.com', // URL do Render configurada!

    async init() {
        if (typeof window.supabase !== 'undefined' && !this.client) {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce'
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            this.tabSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Inicializa o canal de combate global (Fallback Supabase)
            this.initCombatChannel();
            
            // Tenta conectar ao servidor Node.js se o script do Socket.io estiver presente
            this.initNodeServer();

            // Listener Profissional de Estado de Autenticação
            this.client.auth.onAuthStateChange(async (event, session) => {
                console.log(`🔐 [Supabase] Evento de Auth: ${event}`);
                this.session = session;
                this.currentUser = session?.user || null;

                if (event === 'SIGNED_IN') {
                    console.log("✅ Sessão Cloud Ativa:", this.currentUser.email);
                    this.initCombatChannel(); // Garante canal ao logar
                    
                    // SEGURANÇA MÁXIMA: Ao logar, aguarda o canal de presença estar pronto e envia o kick
                    const targetAccount = this.currentUser.email;
                    const sendKick = () => {
                        console.log("🚀 [Sessão] Enviando sinal de encerramento para outras abas da conta:", targetAccount);
                        this.broadcastGM('kick_other_sessions', targetAccount, { 
                            sessionId: this.tabSessionId,
                            reason: 'multi_login',
                            account: targetAccount
                        });
                    };
                    setTimeout(sendKick, 1000);
                    setTimeout(sendKick, 3000);
                    setTimeout(sendKick, 6000);

                    if (window.mostrarAviso) window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.syncConnected') : "Cloud Sync Connected");
                } else if (event === 'SIGNED_OUT') {
                    console.warn("⚠️ Sessão Cloud Encerrada.");
                    this.currentUser = null;
                    this.unsubscribeClanChat();
                    if (this.combatChannel) {
                        this.client.removeChannel(this.combatChannel);
                        this.combatChannel = null;
                        this._combatSubscribed = false;
                    }
                }
            });

            // Aba em background: o WS pode cair; 
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    const n = typeof window.charName === 'string' ? window.charName : '';
                    if (n && this.client) {
                        if (!this.presenceChannel || this.presenceChannel.state === 'closed') {
                            console.log("🔌 [Supabase] Reativando conexão após suspensão da aba...");
                            this.updatePresence(n, {}).catch((e) => console.warn('Erro ao reativar presença:', e));
                        }
                    }
                }
            });

            // Carrega sessão inicial com trava de tempo (Timeout)
            try {
                const sessionPromise = this.client.auth.getSession();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
                const { data } = await Promise.race([sessionPromise, timeoutPromise]);
                this.session = data.session;
                this.currentUser = data.session?.user || null;
                console.log("🔐 [Supabase] Sessão inicial carregada.");
            } catch (e) {
                console.warn("⚠️ Supabase demorou a responder ou está offline. Iniciando em modo local.");
            }
        }
    },

    initNodeServer() {
        if (typeof io === 'undefined') {
            console.warn("⚠️ Socket.io não carregado. Usando Supabase como motor de combate.");
            return;
        }

        console.log("🔌 [NodeServer] Tentando conectar em:", this.nodeServerUrl);

        this.nodeSocket = io(this.nodeServerUrl, {
            reconnectionAttempts: 10,
            timeout: 20000,
            transports: ['websocket', 'polling'], // Tenta WebSocket primeiro, depois polling
            forceNew: true
        });

        this.nodeSocket.on('connect', () => {
            console.log("🚀 [NodeServer] Conectado à Arena Dedicada!");
            const dot = document.getElementById('multiplayer-dot');
            if (dot) dot.style.boxShadow = '0 0 10px #3b82f6'; // Brilho azul para indicar Node.js
        });

        this.nodeSocket.on('oly_challenge_received', (dados) => {
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent('oly_challenge', dados);
        });

        this.nodeSocket.on('oly_player_ready_sync', (data) => {
            if (window.OlympiadEngine) {
                if (data.nome !== window.charName) {
                    window.OlympiadEngine.rivalConfirmou = true;
                    window.OlympiadEngine.atualizarStatusConfirmacao();
                }
            }
        });

        this.nodeSocket.on('oly_start_duel_now', () => {
            if (window.OlympiadEngine) window.OlympiadEngine.entrarNoDuelo();
        });

        this.nodeSocket.on('oly_combat_update', (payload) => {
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent(payload.evento, payload.dados);
        });
    },

    initCombatChannel() {
        if (this._combatSubscribed && this.combatChannel && this.combatChannel.state === 'joined') return;

        console.log("⚔️ [Supabase] Inicializando canal de combate persistente...");
        if (this.combatChannel) {
            this.client.removeChannel(this.combatChannel);
        }

        this.combatChannel = this.client.channel('l2mini-combat-v4', {
            config: { 
                broadcast: { ack: true },
                presence: { key: window.charName || 'guest' }
            }
        });

        this.combatChannel
            .on('broadcast', { event: 'combat' }, (payload) => {
                const raw = this.unwrapRealtimeCombatPayload(payload);
                if (!raw) return;
                const sender = raw.dados?.sender || raw.dados?.nome || raw.dados?.attacker;
                const meuNome = window.charName;
                if (sender && meuNome && String(sender).toLowerCase() === String(meuNome).toLowerCase()) return;
                if (raw.evento && raw.evento.startsWith('oly_') && window.OlympiadEngine) {
                    window.OlympiadEngine.handleMultiplayerEvent(raw.evento, raw.dados);
                }
            })
            .subscribe((status) => {
                console.log("⚔️ [Realtime Combat] Status:", status);
                if (status === 'SUBSCRIBED') {
                    this._combatSubscribed = true;
                    const dot = document.getElementById('multiplayer-dot');
                    if (dot) dot.style.background = '#22c55e';
                }
            });
    },

    getUser() {
        return this.currentUser;
    },

    async savePlayer(charName, data) {
        if (!SUPABASE_CONFIG.enabled || !charName) return;
        if (!this.client) await this.init();

        const user = this.getUser();
        if (!user) return;

        const agora = Date.now();
        if (this._lastSaveTime && agora - this._lastSaveTime < 2000) return;
        this._lastSaveTime = agora;

        try {
            const { error } = await this.client
                .from('characters')
                .upsert({
                    char_name: charName,
                    user_id: user.id,
                    char_class: data.charClass || 'Fighter',
                    level: data.nivel || 1,
                    data: data,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'char_name' });

            if (error) throw error;
            console.log(`☁️ [${charName}] salvo.`);
        } catch (err) {
            console.error("❌ Erro ao salvar:", err.message);
        }
    },

    presenceChannel: null,
    _presenceSubscribed: false,
    _presenceReadyPromise: null,
    _presenceReadyResolve: null,

    _resetPresenceReadyPromise() {
        this._presenceSubscribed = false;
        this._presenceReadyPromise = new Promise((resolve) => {
            this._presenceReadyResolve = resolve;
        });
    },

    _resolvePresenceReady() {
        this._presenceSubscribed = true;
        if (typeof this._presenceReadyResolve === 'function') {
            this._presenceReadyResolve();
            this._presenceReadyResolve = null;
        }
    },

    unwrapRealtimeChatPayload(envelope) {
        let cur = envelope;
        for (let depth = 0; depth < 8 && cur != null && typeof cur === 'object'; depth++) {
            if (typeof cur.autor === 'string' && cur.mensagem != null && String(cur.mensagem).length >= 0) {
                return cur;
            }
            const next = cur.payload;
            if (next && typeof next === 'object') {
                cur = next;
                continue;
            }
            break;
        }
        return null;
    },

    unwrapRealtimeCombatPayload(envelope) {
        if (!envelope) return null;
        if (envelope.evento && envelope.dados) return envelope;
        if (envelope.payload && envelope.payload.evento && envelope.payload.dados) {
            return envelope.payload;
        }
        let cur = envelope;
        for (let i = 0; i < 3; i++) {
            if (cur.evento && cur.dados) return cur;
            if (cur.payload && typeof cur.payload === 'object') {
                cur = cur.payload;
            } else {
                break;
            }
        }
        return null;
    },

    async ensureChatConnected(charName, data = {}) {
        if (!SUPABASE_CONFIG.enabled || !charName) return;
        if (!this.client) await this.init();
        if (!this.client) return;
        await this.updatePresence(charName, data);
        if (this._presenceReadyPromise) {
            await Promise.race([
                this._presenceReadyPromise,
                new Promise((resolve) => setTimeout(resolve, 12000))
            ]);
        }
    },

    async updatePresence(charName, data) {
        if (!this.client || !charName) return;
        data = data || {};

        if (this.presenceChannel) {
            const currentKey = this.presenceChannel.options?.config?.presence?.key;
            if (currentKey && currentKey !== charName) {
                console.log(`🔄 [Supabase] Personagem mudou. Reiniciando...`);
                if (this.combatChannel) {
                    try { await this.client.removeChannel(this.combatChannel); this.combatChannel = null; } catch (e) {}
                }
                try {
                    const oldChannel = this.presenceChannel;
                    this.presenceChannel = null;
                    this._presenceSubscribed = false;
                    this._resetPresenceReadyPromise();
                    await this.client.removeChannel(oldChannel);
                } catch (e) {}
            } else {
                if (this._presenceSubscribed && this.presenceChannel.state === 'joined') {
                    return;
                }
            }
        }

        if (!this.combatChannel) {
            this.initCombatChannel();
        }

        if (!this.presenceChannel) {
            this._resetPresenceReadyPromise();
            const channelName = 'online-players-v2'; 
            this.presenceChannel = this.client.channel(channelName, {
                config: {
                    broadcast: { ack: false },
                    presence: { key: charName }
                }
            });

            this.presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.presenceChannel.presenceState();
                    window.dispatchEvent(new CustomEvent('l2-presence-update', { detail: state }));
                    const dot = document.getElementById('multiplayer-dot');
                    const text = document.getElementById('multiplayer-text');
                    if (dot) dot.style.background = '#22c55e';
                    if (text) {
                        text.innerText = (typeof window.t === 'function') ? window.t('game.multiplayer.connectedLabel') : 'MULTIPLAYER ONLINE';
                        text.style.color = '#22c55e';
                    }
                    this._resolvePresenceReady();
                })
                .on('broadcast', { event: 'chat' }, (envelope) => {
                    const inner = this.unwrapRealtimeChatPayload(envelope);
                    if (!inner || typeof inner.autor !== 'string' || inner.mensagem == null) return;
                    const texto = typeof inner.mensagem === 'string' ? inner.mensagem : String(inner.mensagem);
                    if (!texto.length) return;
                    const myName = typeof window.charName === 'string' ? window.charName.trim().toLowerCase() : '';
                    const autorNorm = inner.autor.trim().toLowerCase();
                    const isSameTabEcho = myName && autorNorm === myName &&
                        typeof inner.sessionId === 'string' && inner.sessionId === this.tabSessionId;
                    if (isSameTabEcho) return;
                    if (typeof adicionarMensagemChat === 'function') {
                        adicionarMensagemChat(inner.autor, texto, inner.tipo || 'papel', inner.canal || 'global', true, null, inner.ascensionTitle || '');
                    }
                })
                .on('broadcast', { event: 'combat' }, (payload) => {
                    const raw = this.unwrapRealtimeCombatPayload(payload);
                    if (!raw) return;
                    const evento = raw.evento;
                    const dados = raw.dados;
                    const sender = dados?.sender || dados?.nome || dados?.attacker;
                    const selfEcho = sender && window.charName &&
                        String(sender).trim().toLowerCase() === String(window.charName).trim().toLowerCase();
                    if (selfEcho) return;
                    if (evento.startsWith('oly_') && window.OlympiadEngine) {
                        window.OlympiadEngine.handleMultiplayerEvent(evento, dados);
                    }
                })
                .on('broadcast', { event: 'gm_command' }, async (payload) => {
                    const raw = payload.payload || payload;
                    if (!raw) return;
                    const { action, target, data } = raw;
                    const isTarget = (target && window.charName && target.toLowerCase() === window.charName.toLowerCase()) || 
                                   (data?.account && this.currentUser?.email && data.account.toLowerCase() === this.currentUser.email.toLowerCase());
                    if (isTarget) {
                        if (action === 'kick' || action === 'kick_other_sessions') {
                            if (action === 'kick_other_sessions' && data?.sessionId === this.tabSessionId) return;
                            if (data?.newChar && data?.sessionId === this.tabSessionId) return;
                            window.l2Alert(action === 'kick_other_sessions' ? "Sua conta foi conectada em outro local." : "You have been kicked by a GM.");
                            if (this.client) await this.client.auth.signOut();
                            setTimeout(() => location.reload(), 3000);
                        } else if (action === 'force_update') {
                            if (data && data.msg) window.mostrarAviso(data.msg);
                            if (window.RewardEngine) await window.RewardEngine.checkRewards();
                            if (data && data.reloadSave === true && typeof window.carregarJogo === 'function') await window.carregarJogo(window.charName);
                        }
                    }
                });

            this.presenceChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    this._presenceSubscribed = true;
                    await this.presenceChannel.track({
                        charName: charName,
                        online_at: new Date().toISOString()
                    });
                    this._resolvePresenceReady();
                } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                    this._presenceSubscribed = false;
                    const dot = document.getElementById('multiplayer-dot');
                    if (dot) dot.style.background = '#ef4444';
                }
            });
        } else {
            if (this.presenceChannel.state === 'joined' && !this._presenceSubscribed) {
                await this.presenceChannel.track({
                    charName: charName,
                    online_at: new Date().toISOString()
                });
            }
        }
    },

    async broadcastChat(autor, mensagem, tipo, canal, ascensionTitle) {
        if (!this.presenceChannel) {
            console.log("📡 [Supabase] Tentando reconectar canal antes de enviar chat...");
            await this.ensureChatConnected(window.charName, {});
        }
        if (!this.presenceChannel) return false;
        const payloadOut = {
            autor, mensagem, tipo, canal, ascensionTitle: ascensionTitle || '',
            sessionId: this.tabSessionId, tabSessionId: this.tabSessionId
        };
        const { error } = await this.presenceChannel.send({
            type: 'broadcast', event: 'chat', payload: payloadOut
        });
        return !error;
    },

    broadcastCombat(evento, dados) {
        if (this.nodeSocket && this.nodeSocket.connected) {
            console.log(`📤 [NodeServer] Enviando [${evento}]`);
            if (evento === 'oly_challenge') {
                this.nodeSocket.emit('oly_send_challenge', dados);
            } else if (evento === 'oly_confirm') {
                this.nodeSocket.emit('oly_confirm_ready', { nome: window.charName });
            } else {
                this.nodeSocket.emit('oly_combat_event', { evento, dados });
            }
            return;
        }

        if (!this.combatChannel) return;
        const payloadDados = dados && typeof dados === 'object' ? { ...dados } : (dados || {});
        payloadDados.sender = window.charName;
        this.combatChannel.send({
            type: 'broadcast', event: 'combat',
            payload: { evento, dados: payloadDados, timestamp: Date.now() }
        });
    },

    async broadcastGM(action, target, data = {}) {
        if (!this.presenceChannel) return;
        await this.presenceChannel.send({
            type: 'broadcast', event: 'gm_command', payload: { action, target, data }
        });
    },

    clanChatChannel: null,
    _clanChatSubscribedClanId: null,

    unsubscribeClanChat() {
        if (!this.client || !this.clanChatChannel) {
            this.clanChatChannel = null;
            this._clanChatSubscribedClanId = null;
            return;
        }
        const ch = this.clanChatChannel;
        this.clanChatChannel = null;
        this._clanChatSubscribedClanId = null;
        try { this.client.removeChannel(ch); } catch (e) {}
    },

    async fetchClanChatHistory(clanId, limit = 50) {
        if (!SUPABASE_CONFIG.enabled || clanId == null) return [];
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return [];
        const { data, error } = await this.client
            .from('clan_chat_messages')
            .select('id, char_name, body, tier, ascension_title, created_at')
            .eq('clan_id', clanId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return (data || []).reverse();
    },

    subscribeClanChat(clanId, onInsert) {
        if (!SUPABASE_CONFIG.enabled || clanId == null) return;
        if (!this.client) {
            this.init().then(() => this._subscribeClanChatAfterInit(clanId, onInsert));
            return;
        }
        this._subscribeClanChatAfterInit(clanId, onInsert);
    },

    _subscribeClanChatAfterInit(clanId, onInsert) {
        if (!this.client || !this.getUser() || clanId == null) return;
        if (this._clanChatSubscribedClanId === clanId && this.clanChatChannel) return;
        this.unsubscribeClanChat();
        const idNum = typeof clanId === 'string' ? parseInt(clanId, 10) : Number(clanId);
        const filterVal = Number.isFinite(idNum) ? idNum : clanId;
        this._clanChatSubscribedClanId = clanId;
        this.clanChatChannel = this.client
            .channel(`clan-chat-pg:${clanId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clan_chat_messages', filter: `clan_id=eq.${filterVal}` }, (payload) => {
                if (payload && payload.new && typeof onInsert === 'function') onInsert(payload.new);
            })
            .subscribe();
    },

    async insertClanChatMessage(clanId, body, tier, ascensionTitle) {
        if (!SUPABASE_CONFIG.enabled || clanId == null) return { data: null, error: new Error('offline') };
        if (!this.client) await this.init();
        const { data, error } = await this.client.rpc('insert_clan_chat_secure', {
            p_clan_id: clanId, p_body: body, p_tier: tier || 'Paper',
            p_ascension_title: (ascensionTitle && String(ascensionTitle).trim()) ? String(ascensionTitle).trim().slice(0, 48) : ''
        });
        return { data, error };
    },

    async getGlobalRanking() {
        if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !this.client) return null;
        try {
            const { data: players, error } = await this.client
                .from('characters')
                .select('char_name, level, char_class, data')
                .order('level', { ascending: false }).limit(50);
            if (error) throw error;
            return players.map(p => {
                const d = p.data || {};
                return {
                    nome: p.char_name, olympiadPoints: d.olympiadPoints || 0, isRealPlayer: true,
                    classe: p.char_class || 'Fighter', nivel: p.level || 1
                };
            });
        } catch (err) { return null; }
    },

    /**
     * Busca as mensagens do correio para o personagem atual.
     */
    async fetchMailbox(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client
                .from('mailbox')
                .select('*')
                .eq('recipient_name', charName)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[fetchMailbox]', e);
            return [];
        }
    },

    /**
     * Envia um correio de forma segura via RPC.
     */
    async sendMail(recipient, subject, type, details) {
        if (!SUPABASE_CONFIG.enabled || !recipient) return { success: false };
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('send_mail_secure', {
                p_recipient_name: recipient, p_subject: subject, p_type: type, p_details: details
            });
            if (error) throw error;
            return data || { success: true };
        } catch (e) {
            console.error('[sendMail RPC Error]', e);
            return { success: false, error: e };
        }
    },

    /**
     * Resgata recompensas de um correio via RPC.
     */
    async claimMailReward(mailId) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return { success: false };
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('claim_mail_reward', { p_mail_id: mailId });
            if (error) throw error;
            return data || { success: true };
        } catch (e) {
            console.error('[claimMailReward RPC Error]', e);
            return { success: false, error: e };
        }
    },

    /**
     * Marca uma mensagem como lida ou deleta.
     */
    async updateMailStatus(mailId, updates) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return;
        if (!this.client) await this.init();
        try {
            await this.client.from('mailbox').update(updates).eq('id', mailId);
        } catch (e) { console.warn('[updateMailStatus]', e); }
    },

    async deleteMail(mailId) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return;
        if (!this.client) await this.init();
        try {
            await this.client.from('mailbox').delete().eq('id', mailId);
        } catch (e) { console.warn('[deleteMail]', e); }
    },

    /**
     * Busca os status autoritativos de um jogador (recalculados no servidor).
     */
    async getPlayerStatsAutoritativo(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('get_player_stats_autoritativo', {
                p_target_char_name: charName
            });
            if (error) throw error;
            return data || { success: true };
        } catch (e) {
            console.error('[getPlayerStatsAutoritativo RPC Error]', e);
            return { success: false, error: e };
        }
    }
};

if (typeof window !== 'undefined') {
    window.SupabaseAPI = SupabaseAPI;
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    SupabaseAPI.init();
}
