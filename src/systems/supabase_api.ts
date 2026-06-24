/**
 * SUPABASE_API — Fase 2: Integração com Supabase
 * Migrado: js/systems/supabase_api.js — Fase 4: tipos explícitos.
 *
 * Funções para salvar dados, ranking global, Realtime e RPCs na nuvem.
 */

import type { SupabaseApi, SupabaseConfig } from '../types/game';
import { registerGlobal } from '../runtime/register-global';

type RealtimeI18nPayload = {
    mensagem?: unknown;
    msg?: unknown;
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
};

function resolveRealtimeI18nText(
    payload: RealtimeI18nPayload | null | undefined,
    fallbackField: 'mensagem' | 'msg' = 'mensagem',
): string {
    if (!payload) return '';
    if (payload.i18nKey && typeof window.t === 'function') {
        try {
            const text = window.t(payload.i18nKey, payload.i18nParams || {});
            if (text && text !== payload.i18nKey) return text;
        } catch {
            /* noop */
        }
    }
    const fb = payload[fallbackField];
    return fb != null ? String(fb) : '';
}

const SUPABASE_CONFIG: SupabaseConfig = {
    url: 'https://kgjcbujkzsrgcjcowxts.supabase.co', // Sua URL do Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnamNidWprenNyZ2NqY293eHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzk0NzcsImV4cCI6MjA5Mjk1NTQ3N30.s1C3ubMA_ZRrkCmtk1nLC4VjDImk707X1wSTsA9CL9A', // Sua Anon Key do Supabase
    enabled: true // Agora está ativado!
};

const SupabaseAPI = {
    client: null,
    currentUser: null,
    session: null,

    /** URL base para links de confirmação de e-mail e recuperação de senha (Supabase → Authentication → URL Configuration). */
    getAuthRedirectUrl() {
        try {
            const u = new URL(window.location.href);
            u.hash = '';
            u.search = '';
            return u.toString();
        } catch (e) {
            return (typeof window.location !== 'undefined' && window.location.origin)
                ? window.location.origin + '/'
                : '';
        }
    },

    /** Resolve e-mail a partir de username em profiles (para login/recuperação sem expor se existe). */
    async resolveLoginEmail(usernameOrEmail) {
        if (!usernameOrEmail || typeof usernameOrEmail !== 'string') return '';
        const raw = usernameOrEmail.trim();
        if (raw.includes('@')) return raw.toLowerCase();
        if (!this.client) await this.init();
        if (!this.client) return '';
        try {
            const { data, error } = await this.client
                .from('profiles')
                .select('email')
                .ilike('username', raw)
                .maybeSingle();
            if (error || !data || !data.email) return '';
            return String(data.email).trim().toLowerCase();
        } catch (e) {
            return '';
        }
    },
    
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
                        eventsPerSecond: 40
                    }
                }
            });

            this.tabSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Tenta conectar ao servidor Node.js se o script do Socket.io estiver presente
            this.initNodeServer();

            // Listener Profissional de Estado de Autenticação
            this.client.auth.onAuthStateChange(async (event, session) => {
                console.log(`🔐 [Supabase] Evento de Auth: ${event}`);
                this.session = session;
                this.currentUser = session?.user || null;

                if (event === 'PASSWORD_RECOVERY') {
                    console.log("🔑 [Supabase] Sessão de Recuperação detectada!");
                    // Pequeno delay para garantir que o AuthEngine e o DOM estejam prontos
                    const checkAuthEngine = setInterval(() => {
                        if (window.AuthEngine && typeof window.AuthEngine.onPasswordRecoverySession === 'function') {
                            clearInterval(checkAuthEngine);
                            window.AuthEngine.onPasswordRecoverySession(session);
                        }
                    }, 100);
                    // Timeout de segurança após 5 segundos
                    setTimeout(() => clearInterval(checkAuthEngine), 5000);
                    return;
                }

                if (event === 'SIGNED_IN' && session && window.AuthEngine) {
                    const loginScr = document.getElementById('screen-login');
                    const skipRecovery = window.AuthEngine._passwordRecoveryMode === true;
                    const onLogin =
                        !skipRecovery &&
                        loginScr && loginScr.classList.contains('active-screen') &&
                        !window.AuthEngine._manualPasswordLoginInProgress &&
                        typeof window.AuthEngine.onLoginSuccess === 'function';
                    if (onLogin) {
                        const uname =
                            session.user.user_metadata?.username ||
                            session.user.email ||
                            '';
                        if (uname) {
                            window.AuthEngine._fromAuthStateSignedIn = true;
                            window.AuthEngine.onLoginSuccess!(uname);
                            window.AuthEngine._fromAuthStateSignedIn = false;
                        }
                    }
                }

                if (event === 'SIGNED_IN') {
                    console.log("✅ Sessão Cloud Ativa:", this.currentUser && this.currentUser.email);
                    
                    const targetAccount = this.currentUser.email;
                    if (targetAccount) {
                        if (this._multiLoginKickTimer) clearTimeout(this._multiLoginKickTimer);
                        this._multiLoginKickTimer = setTimeout(() => {
                            this._multiLoginKickTimer = null;
                            if (!this.currentUser || !this.tabSessionId) return;
                            console.log("🚀 [Sessão] Avisando outras abas da conta (kick idempotente):", targetAccount);
                            this.broadcastGM('kick_other_sessions', targetAccount, {
                                sessionId: this.tabSessionId,
                                reason: 'multi_login',
                                account: targetAccount
                            });
                        }, 1500);
                    }

                    if (window.mostrarAviso) window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.syncConnected') : "Cloud Sync Connected");
                } else if (event === 'SIGNED_OUT') {
                    console.warn("⚠️ Sessão Cloud Encerrada.");
                    window._l2miniLastCarregarChar = null;
                    if (this._multiLoginKickTimer) {
                        clearTimeout(this._multiLoginKickTimer);
                        this._multiLoginKickTimer = null;
                    }
                    this.currentUser = null;
                    this.unsubscribeClanChat();
                    if (this.presenceChannel) {
                        this.client.removeChannel(this.presenceChannel);
                        this.presenceChannel = null;
                        this._presenceSubscribed = false;
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
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            const me = (typeof window.charName === 'string') ? window.charName.trim().toLowerCase() : '';
            const from = dados && dados.nome != null ? String(dados.nome).trim().toLowerCase() : '';
            if (me && from && from === me) return;
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent('oly_challenge', dados);
        });

        this.nodeSocket.on('oly_match_created', (data) => {
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent('oly_match_created', data);
        });

        this.nodeSocket.on('oly_lobby_left', (data) => {
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent('oly_lobby_left', data);
        });

        this.nodeSocket.on('oly_player_ready_sync', (data) => {
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            if (window.OlympiadEngine) {
                const mine = (typeof window.charName === 'string') ? window.charName.trim().toLowerCase() : '';
                const theirs = data && data.nome != null ? String(data.nome).trim().toLowerCase() : '';
                if (mine && theirs && theirs !== mine) {
                    window.OlympiadEngine.rivalConfirmou = true;
                    window.OlympiadEngine.atualizarStatusConfirmacao();
                }
            }
        });

        this.nodeSocket.on('oly_start_duel_now', (payload) => {
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            if (!window.OlympiadEngine) return;
            const mid = payload && payload.matchId;
            const cur = window.OlympiadEngine.olyPairSessionId;
            if (mid && cur && mid !== cur) return;
            window.OlympiadEngine.entrarNoDuelo();
        });

        this.nodeSocket.on('oly_combat_update', (payload) => {
            if (window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) return;
            if (window.OlympiadEngine) window.OlympiadEngine.handleMultiplayerEvent(payload.evento, payload.dados);
        });
    },

    initCombatChannel() {
        // Obsoleto: Agora usamos o canal unificado em updatePresence
        console.log("⚔️ [Supabase] initCombatChannel obsoleto. Usando canal unificado.");
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
    presenceConnectChain: Promise.resolve(),
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
            if (typeof cur.autor === 'string' && (cur.mensagem != null || cur.i18nKey)) {
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
        const payload = data || {};
        const channelName = 'l2mini-global-v5';
        if (this.presenceChannel && this.presenceChannel.topic === channelName && this._presenceSubscribed) {
            return;
        }

        try {
            this.presenceConnectChain = this.presenceConnectChain.catch(() => {}).then(() =>
                this._connectUnifiedRealtimeChannel(charName, payload)
            );
            await this.presenceConnectChain;
        } catch (e) {
            console.warn('[Supabase] Presence connect chain:', e);
        }
    },

    /** Evita corrida quando vários pontos chamam updatePresence antes do primeiro subscribe terminar */
    async _connectUnifiedRealtimeChannel(charName /* data reservado p/ futuro */) {
        const channelName = 'l2mini-global-v5';
        if (this.presenceChannel && this.presenceChannel.topic === channelName && this._presenceSubscribed) {
            return;
        }

        console.log(`📡 [Supabase] Conectando ao canal unificado: ${channelName}`);

        if (this.presenceChannel) {
            try { await this.client.removeChannel(this.presenceChannel); } catch(e) {}
        }

        this._resetPresenceReadyPromise();
        this.presenceChannel = this.client.channel(channelName, {
            config: {
                broadcast: { ack: true },
                presence: { key: charName }
            }
        });

        const ch = this.presenceChannel;
        ch
            .on('presence', { event: 'sync' }, () => {
                const state = ch.presenceState();
                window.dispatchEvent(new CustomEvent('l2-presence-update', { detail: state }));
                const dot = document.getElementById('multiplayer-dot');
                const text = document.getElementById('multiplayer-text');
                if (dot) dot.style.background = '#22c55e';
                if (text) {
                    text.innerText = (typeof window.t === 'function') ? window.t('game.multiplayer.connectedLabel') : 'ONLINE';
                    text.style.color = '#22c55e';
                }
                this._resolvePresenceReady();
            })
            .on('broadcast', { event: 'chat' }, (envelope) => {
                const inner = this.unwrapRealtimeChatPayload(envelope);
                if (!inner || typeof inner.autor !== 'string') return;
                const displayMsg = resolveRealtimeI18nText(inner, 'mensagem');
                if (!displayMsg) return;
                const myName = typeof window.charName === 'string' ? window.charName.trim().toLowerCase() : '';
                const autorNorm = inner.autor.trim().toLowerCase();

                console.log(`📥 [Chat] Recebido de ${inner.autor}: ${displayMsg}`);

                if (myName && autorNorm === myName && inner.tabSessionId === this.tabSessionId) return;
                if (typeof window.adicionarMensagemChat === 'function') {
                    window.adicionarMensagemChat(inner.autor, displayMsg, inner.tipo || 'papel', inner.canal || 'global', true, null, inner.ascensionTitle || '');
                }
            })
            .on('broadcast', { event: 'combat' }, (payload) => {
                const raw = this.unwrapRealtimeCombatPayload(payload);
                if (!raw) return;
                const sender = raw.dados?.sender || raw.dados?.nome || raw.dados?.attacker;
                const myName = typeof window.charName === 'string' ? window.charName.trim().toLowerCase() : '';
                if (sender && myName && String(sender).toLowerCase() === myName && raw.dados?.tabSessionId === this.tabSessionId) return;
                if (raw.evento && raw.evento.startsWith('oly_') && window.OlympiadEngine) {
                    window.OlympiadEngine.handleMultiplayerEvent(raw.evento, raw.dados);
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
                        if (data?.sessionId === this.tabSessionId) return;
                        window.l2Alert(
                            action === 'kick_other_sessions'
                                ? (typeof window.t === 'function' ? window.t('game.cloud.kickedElsewhere') : 'Your account was signed in on another device.')
                                : (typeof window.t === 'function' ? window.t('game.cloud.kickedByGm') : 'You have been kicked by a GM.')
                        );
                        if (this.client) await this.client.auth.signOut();
                        setTimeout(() => location.reload(), 3000);
                    } else if (action === 'force_update') {
                        const notice = resolveRealtimeI18nText(data, 'msg');
                        if (notice) window.mostrarAviso(notice);
                        if (window.RewardEngine) await window.RewardEngine.checkRewards();
                        if (data && data.reloadSave === true && typeof window.carregarJogo === 'function') {
                            console.log("🔄 [Supabase] Recebido comando de reload de save.");
                            await window.carregarJogo(window.charName, { forceOlympiadReset: false });
                            if (typeof atualizar === 'function') atualizar();
                        }
                    }
                }
            });

        ch.subscribe(async (status) => {
            console.log(`📡 [Supabase] Status do canal unificado: ${status}`);
            if (status === 'SUBSCRIBED') {
                this._presenceSubscribed = true;
                await ch.track({
                    charName: charName,
                    online_at: new Date().toISOString(),
                    tabSessionId: this.tabSessionId
                });
                this._resolvePresenceReady();
            } else {
                this._presenceSubscribed = false;
                const dot = document.getElementById('multiplayer-dot');
                if (dot) dot.style.background = '#ef4444';
            }
        });
    },

    async broadcastChat(autor, mensagem, tipo, canal, ascensionTitle, opts) {
        if (!this.presenceChannel) {
            console.log("📡 [Supabase] Tentando reconectar canal antes de enviar chat...");
            await this.ensureChatConnected(window.charName, {});
        }
        if (!this.presenceChannel) return false;
        
        console.log(`📤 [Chat] Enviando: ${mensagem || (opts && opts.i18nKey) || ''}`);

        const payloadOut: Record<string, unknown> = {
            autor, mensagem, tipo, canal, ascensionTitle: ascensionTitle || '',
            sessionId: this.tabSessionId, tabSessionId: this.tabSessionId
        };
        if (opts && opts.i18nKey) {
            payloadOut.i18nKey = opts.i18nKey;
            payloadOut.i18nParams = opts.i18nParams || {};
        }
        
        const status = await this.presenceChannel.send({
            type: 'broadcast', event: 'chat', payload: payloadOut
        });
        
        console.log(`📡 [Supabase] Status do envio de chat: ${status}`);
        return status === 'ok';
    },

    broadcastCombat(evento, dados) {
        if (evento && String(evento).startsWith('oly_') && window.OlympiadEngine && window.OlympiadEngine.OLY_LOCAL_ONLY) {
            return;
        }
        if (this.nodeSocket && this.nodeSocket.connected) {
            console.log(`📤 [NodeServer] Enviando [${evento}]`);
            if (evento === 'oly_challenge') {
                this.nodeSocket.emit('oly_send_challenge', dados);
            } else if (evento === 'oly_confirm') {
                this.nodeSocket.emit('oly_confirm_ready', {
                    nome: window.charName,
                    matchId: window.OlympiadEngine && window.OlympiadEngine.olyPairSessionId
                });
            } else {
                this.nodeSocket.emit('oly_combat_event', { evento, dados });
            }
            return;
        }

        // UNIFICAÇÃO: Usa o presenceChannel para combate também, garantindo que todos na mesma 'sala' se vejam
        if (!this.presenceChannel) {
            console.warn("📡 [Supabase] Canal de presença não pronto para broadcast de combate.");
            return;
        }

        const payloadDados = dados && typeof dados === 'object' ? { ...dados } : (dados || {});
        payloadDados.sender = window.charName;
        payloadDados.tabSessionId = this.tabSessionId;

        this.presenceChannel.send({
            type: 'broadcast', 
            event: 'combat',
            payload: { evento, dados: payloadDados, timestamp: Date.now() }
        }).then(status => {
            if (status !== 'ok') console.warn(`📡 [Supabase] Falha no broadcast de combate: ${status}`);
        });
    },

    async broadcastGM(action, target, data = {}) {
        if (!this.presenceChannel) return;
        const status = await this.presenceChannel.send({
            type: 'broadcast', event: 'gm_command', payload: { action, target, data }
        });
        return status === 'ok';
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

    async fetchClans() {
        if (!SUPABASE_CONFIG.enabled) return [];
        if (!this.client) await this.init();
        if (!this.client) return [];
        try {
            const { data: rows, error } = await this.client
                .from('clans')
                .select('id, name, tag, logo, leader_name, level, min_level, description')
                .order('name');
            if (error) throw error;
            const { data: memRows, error: e2 } = await this.client
                .from('clan_members')
                .select('clan_id, char_name');
            if (e2) throw e2;
            const byClan = {};
            for (const m of memRows || []) {
                if (!byClan[m.clan_id]) byClan[m.clan_id] = [];
                byClan[m.clan_id].push(m.char_name);
            }
            return (rows || []).map(row => ({
                id: row.id,
                name: row.name,
                tag: row.tag,
                logo: row.logo,
                leader_name: row.leader_name,
                level: row.level,
                min_level: row.min_level,
                description: row.description,
                membros: byClan[row.id] || []
            }));
        } catch (e) {
            console.error('[SupabaseAPI.fetchClans]', e);
            return [];
        }
    },

    async fetchClanApplications(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return [];
        try {
            const { data, error } = await this.client
                .from('clan_applications')
                .select('id, char_name, clan_id, status, created_at')
                .eq('char_name', charName)
                .eq('status', 'pending');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[SupabaseAPI.fetchClanApplications]', e);
            return [];
        }
    },

    _normalizeClanRpcResult(raw) {
        if (raw == null) return { success: false, error: 'empty_response' };
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch (e) {
                return { success: false, error: 'invalid_json' };
            }
        }
        if (typeof raw !== 'object') return { success: false, error: 'invalid_response' };
        return raw;
    },

    clanRpcUserMessage(resultOrCode) {
        const code = typeof resultOrCode === 'string'
            ? resultOrCode
            : (resultOrCode && resultOrCode.error);
        if (!code) return typeof window.t === 'function' ? window.t('game.clan.rpc.unknown') : 'Clan action failed.';
        const key = 'game.clan.rpc.' + String(code).replace(/[^a-z0-9_]/gi, '_');
        if (typeof window.t === 'function') {
            const m = window.t(key);
            if (m && m !== key) return m;
        }
        return String(code);
    },

    async fetchClanPendingApplicationsForClan(clanId) {
        if (!SUPABASE_CONFIG.enabled || clanId == null) return [];
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return [];
        try {
            const { data, error } = await this.client
                .from('clan_applications')
                .select('id, char_name, clan_id, status, created_at')
                .eq('clan_id', clanId)
                .eq('status', 'pending');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[SupabaseAPI.fetchClanPendingApplicationsForClan]', e);
            return [];
        }
    },

    async createClan(_charName, nome, sigla, logo, minLevel) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('create_clan_secure', {
                p_name: nome,
                p_tag: sigla,
                p_logo: logo || '🏰',
                p_min_level: minLevel != null ? minLevel : 1,
                p_description: ''
            });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            if (res.adenas != null && typeof window !== 'undefined') {
                window.adenas = Number(res.adenas);
            }
            return { success: true, clan_id: res.clan_id, adenas: res.adenas };
        } catch (e) {
            console.error('[SupabaseAPI.createClan]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async applyToClan(_charName, clanId) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('apply_to_clan_secure', {
                p_clan_id: clanId,
                p_char_name: _charName || null
            });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            return { success: true };
        } catch (e) {
            console.error('[SupabaseAPI.applyToClan]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async respondClanApplication(_leaderCharName, applicationId, accept) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('respond_clan_application_secure', {
                p_application_id: applicationId,
                p_accept: !!accept
            });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            return { success: true, accepted: !!res.accepted };
        } catch (e) {
            console.error('[SupabaseAPI.respondClanApplication]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async leaveClan(targetCharName, clanId) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('leave_clan_secure', {
                p_clan_id: clanId,
                p_target_char_name: targetCharName
            });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            return { success: true };
        } catch (e) {
            console.error('[SupabaseAPI.leaveClan]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async dissolveClan(clanId) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('dissolve_clan_secure', { p_clan_id: clanId });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            return { success: true };
        } catch (e) {
            console.error('[SupabaseAPI.dissolveClan]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async updateClanSettings(clanId, patch) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('update_clan_settings_secure', {
                p_clan_id: clanId,
                p_patch: patch || {}
            });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res) };
            }
            return { success: true };
        } catch (e) {
            console.error('[SupabaseAPI.updateClanSettings]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    async upgradeClanLevel(clanId) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: this.clanRpcUserMessage('offline') };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: this.clanRpcUserMessage('not_authenticated') };
        try {
            const { data, error } = await this.client.rpc('upgrade_clan_level_secure', { p_clan_id: clanId });
            if (error) throw error;
            const res = this._normalizeClanRpcResult(data);
            if (!res.success) {
                return { success: false, error: this.clanRpcUserMessage(res), need: res.need };
            }
            if (res.adenas != null && typeof window !== 'undefined') {
                window.adenas = Number(res.adenas);
            }
            return { success: true, level: res.level, adenas: res.adenas };
        } catch (e) {
            console.error('[SupabaseAPI.upgradeClanLevel]', e);
            return { success: false, error: e.message || this.clanRpcUserMessage('unknown') };
        }
    },

    /**
     * Resgate semanal Ascensão (elite hunt). Resposta no formato esperado por endgame_pursuits.js: { data, error }.
     */
    async claimWeeklyAscension(_charName, weekKey) {
        if (!SUPABASE_CONFIG.enabled) return { data: null, error: { message: 'offline' } };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { data: null, error: { message: 'not authenticated' } };
        try {
            return await this.client.rpc('claim_weekly_ascension_secure', { p_week_key: String(weekKey || '').trim() });
        } catch (e) {
            console.error('[SupabaseAPI.claimWeeklyAscension]', e);
            return { data: null, error: e };
        }
    },

    /**
     * Registo autoritativo de abate de campeão elite (JSONB endgame). Resposta: { data, error } como claimWeeklyAscension.
     */
    async recordEliteChampionKill(weekKey) {
        if (!SUPABASE_CONFIG.enabled) return { data: null, error: { message: 'offline' } };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { data: null, error: { message: 'not authenticated' } };
        try {
            return await this.client.rpc('register_elite_champion_kill_secure', { p_week_key: String(weekKey || '').trim() });
        } catch (e) {
            console.error('[SupabaseAPI.recordEliteChampionKill]', e);
            return { data: null, error: e };
        }
    },

    /**
     * Até 3 chamadas com backoff leve (0 / 500 / 1200 ms) para falhas transitórias de rede.
     * Não repete quando o servidor devolve { success: false, error } (regra de negócio / RPC válida).
     */
    async recordEliteChampionKillWithRetry(weekKey) {
        const delaysMs = [0, 500, 1200];
        let lastRes = null;
        for (let i = 0; i < delaysMs.length; i++) {
            if (delaysMs[i] > 0) await new Promise((r) => setTimeout(r, delaysMs[i]));
            lastRes = await this.recordEliteChampionKill(weekKey);
            const err = lastRes && lastRes.error;
            const data = lastRes && lastRes.data;
            if (!err && data && data.success) return lastRes;
            if (data && data.success === false) return lastRes;
        }
        return lastRes;
    },

    /**
     * Registo server-side de duelo PvP vs jogador real antes do combate (`create_olympiad_match_secure`).
     * O resolve de MMR para humano exige o UUID devolvido em `match_id`.
     */
    async createOlympiadMatch(attackerName, defenderName) {
        if (!SUPABASE_CONFIG.enabled) return { success: false, error: 'offline' };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { success: false, error: 'not_authenticated' };
        try {
            const { data, error } = await this.client.rpc('create_olympiad_match_secure', {
                p_attacker_name: String(attackerName || '').trim(),
                p_defender_name: String(defenderName || '').trim()
            });
            if (error) {
                console.error('[SupabaseAPI.createOlympiadMatch]', error);
                return { success: false, error: 'rpc_error', rpcMessage: error.message || '' };
            }
            return data && typeof data === 'object' ? data : { success: false, error: 'invalid_response' };
        } catch (e) {
            console.error('[SupabaseAPI.createOlympiadMatch]', e);
            return { success: false, error: 'exception' };
        }
    },

    /**
     * Craft Vesper / épico: debita materiais no JSONB e acrescenta instância em inventarioEquips (`craft_item_secure`).
     * Resposta Supabase: { data, error } — `data.success`, erros de regra em `data.error` (ex.: insufficient_materials).
     */
    async craftItem(_charName, recipeId, choiceIdBase) {
        if (!SUPABASE_CONFIG.enabled) return { data: null, error: { message: 'offline' } };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { data: null, error: { message: 'not authenticated' } };
        try {
            const choice =
                choiceIdBase != null && String(choiceIdBase).trim() !== '' ? String(choiceIdBase).trim() : null;
            return await this.client.rpc('craft_item_secure', {
                p_recipe_id: String(recipeId || '').trim(),
                p_choice_id_base: choice
            });
        } catch (e) {
            console.error('[SupabaseAPI.craftItem]', e);
            return { data: null, error: e };
        }
    },

    /**
     * Augment de arma: custos + RNG no JSONB (`augment_weapon_secure`).
     * Resposta: { data, error } — `data.success`, erros em `data.error`.
     */
    async augmentItem(_charName, itemUid, stoneName) {
        if (!SUPABASE_CONFIG.enabled) return { data: null, error: { message: 'offline' } };
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) return { data: null, error: { message: 'not authenticated' } };
        try {
            return await this.client.rpc('augment_weapon_secure', {
                p_item_uid: String(itemUid || '').trim(),
                p_stone_name: stoneName != null && String(stoneName).trim() !== '' ? String(stoneName).trim() : 'Life Stone'
            });
        } catch (e) {
            console.error('[SupabaseAPI.augmentItem]', e);
            return { data: null, error: e };
        }
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
            // Busca os Top 200 para garantir que players novos (0 MMR) se vejam
            const { data: players, error } = await this.client
                .from('characters')
                .select('char_name, level, char_class, data')
                .limit(200);
            
            if (error) throw error;
            
            return players.map(p => {
                const d = p.data || {};
                return {
                    nome: p.char_name, 
                    olympiadPoints: parseInt(d.olympiadPoints) || 0, 
                    isRealPlayer: true,
                    classe: p.char_class || 'Fighter', 
                    nivel: p.level || 1
                };
            }).sort((a, b) => b.olympiadPoints - a.olympiadPoints); // Ordena no JS para garantir precisão
        } catch (err) { 
            console.error("❌ [SupabaseAPI] Erro ao buscar ranking global:", err);
            return null; 
        }
    },

    /**
     * Busca as mensagens do correio para o personagem atual.
     */
    async fetchMailbox(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('get_mailbox_for_character', {
                p_char_name: charName
            });
            if (!error && Array.isArray(data)) return data;
            if (error) {
                console.warn('[fetchMailbox] RPC failed, falling back to mailbox table', error.message || error);
            }
            const sel = await this.client
                .from('mailbox')
                .select('*')
                .eq('recipient_name', charName)
                .order('created_at', { ascending: false });
            if (sel.error) throw sel.error;
            return sel.data || [];
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
            if (data && typeof data === 'object' && 'success' in data) return data;
            return { success: true };
        } catch (e) {
            console.error('[sendMail RPC Error]', e);
            return { success: false, error: e };
        }
    },

    /**
     * Resgata recompensas de um correio via RPC.
     */
    async claimMailReward(mailId) {
        const mid = mailId != null ? String(mailId).trim() : '';
        if (!SUPABASE_CONFIG.enabled || !mid) return { success: false, error: 'invalid_params' };
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('claim_mail_reward', { p_mail_id: mid });
            if (error) throw error;
            if (data && typeof data === 'object' && 'success' in data) {
                const row = data as { success?: boolean; error?: string };
                if (row.success === false && row.error) {
                    return { success: false, error: row.error };
                }
                return data;
            }
            return { success: true };
        } catch (e) {
            console.error('[claimMailReward RPC Error]', e);
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);
            return { success: false, error: msg || 'rpc_error' };
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
    },

    /**
     * Busca o histórico de batalhas da Olympiada.
     */
    async fetchOlympiadHistory(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client
                .from('olympiad_history')
                .select('*')
                .eq('char_name', charName)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[fetchOlympiadHistory]', e);
            return [];
        }
    },

    /**
     * Grocer / NPC shop: stackable consumíveis e scrolls (RPC autoritativa).
     * Alinha com ui_shop.js (EconomyBalance + catalog ids em db_items.js).
     */
    async npcShopBuyStackable(charName, itemCatalogId, qty) {
        if (!SUPABASE_CONFIG.enabled || !charName || !itemCatalogId) {
            return { data: { ok: false, error: 'offline' }, error: null };
        }
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('npc_shop_buy_stackable', {
                p_char_name: charName,
                p_item_id: String(itemCatalogId),
                p_qty: Math.max(1, Math.min(9999, parseInt(qty, 10) || 1))
            });
            if (error) return { data: null, error };
            return { data, error: null };
        } catch (e) {
            console.error('[npcShopBuyStackable]', e);
            return { data: null, error: e };
        }
    },

    /**
     * Encantamento de equipamento (RPC autoritativa). Ver supabase_enchant_item_secure.sql
     */
    async enchantItem(charName, itemUid, scrollDisplayName) {
        if (!SUPABASE_CONFIG.enabled || !charName || !itemUid || !scrollDisplayName) {
            return { data: { success: false, error: 'invalid_params' }, error: null };
        }
        if (!this.client) await this.init();
        try {
            const { data, error } = await this.client.rpc('enchant_item_secure', {
                p_char_name: String(charName).trim(),
                p_item_uid: String(itemUid).trim(),
                p_scroll_name: String(scrollDisplayName).trim()
            });
            if (error) return { data: null, error };
            return { data, error: null };
        } catch (e) {
            console.error('[enchantItem]', e);
            return { data: null, error: e };
        }
    },

    /**
     * Loot de mob (floresta): RPC opcional validate_mob_loot_secure no Supabase.
     * Se a RPC não existir ou falhar, combat.js mantém só o loot já calculado no cliente.
     */
    async validateMobLoot(charName, mobInstanceId, zoneName, isChampion, spoilDebuff, mobLevel) {
        if (!SUPABASE_CONFIG.enabled || !charName) {
            return { data: null, error: null };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: null };
        }
        try {
            const { data, error } = await this.client.rpc('validate_mob_loot_secure', {
                p_char_name: String(charName).trim(),
                p_mob_instance_id: mobInstanceId != null ? String(mobInstanceId) : '',
                p_zone_name: zoneName != null ? String(zoneName) : '',
                p_is_champion: !!isChampion,
                p_spoil: !!spoilDebuff,
                p_mob_level: Math.max(1, Number(mobLevel) || 1)
            });
            if (error) return { data: null, error };
            return { data, error: null };
        } catch (e) {
            console.warn('[validateMobLoot]', e);
            return { data: null, error: e };
        }
    }
};

if (typeof window !== 'undefined') {
    registerGlobal('SupabaseAPI', SupabaseAPI as SupabaseApi);
    registerGlobal('SUPABASE_CONFIG', SUPABASE_CONFIG);
    void SupabaseAPI.init();
}

export {};
