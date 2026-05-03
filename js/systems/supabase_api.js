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
    
    async init() {
        if (typeof window.supabase !== 'undefined' && !this.client) {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce' // Mais seguro para links externos
                }
            });

            // Gerar um ID de sessão único para esta aba/dispositivo
            this.tabSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            // Listener Profissional de Estado de Autenticação
            this.client.auth.onAuthStateChange(async (event, session) => {
                console.log(`🔐 [Supabase] Evento de Auth: ${event}`);
                this.session = session;
                this.currentUser = session?.user || null;

                if (event === 'SIGNED_IN') {
                    console.log("✅ Sessão Cloud Ativa:", this.currentUser.email);
                    
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

                    // Envia o kick imediatamente e reforça depois para garantir que o canal está ouvindo
                    setTimeout(sendKick, 1000);
                    setTimeout(sendKick, 3000);
                    setTimeout(sendKick, 6000); // Reforço extra para conexões lentas

                    if (window.mostrarAviso) window.mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.syncConnected') : "Cloud Sync Connected");
                } else if (event === 'SIGNED_OUT') {
                    console.warn("⚠️ Sessão Cloud Encerrada.");
                    this.currentUser = null;
                    this.unsubscribeClanChat();
                }
            });

            // Aba em background: o WS pode cair; NÃO chamar .subscribe() de novo no mesmo canal
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    console.log("☀️ Jogador voltou para a aba. Revalidando presença...");
                    const n = typeof window.charName === 'string' ? window.charName : '';
                    if (n && this.client) {
                        this.updatePresence(n, {}).catch((e) => console.warn('updatePresence pós-visibilidade:', e));
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

    /**
     * Retorna o usuário logado de forma ultra-rápida (cacheada)
     */
    getUser() {
        return this.currentUser;
    },

    /**
     * Envia os dados do jogador para a tabela 'characters' com travas de segurança
     */
    async savePlayer(charName, data) {
        if (!SUPABASE_CONFIG.enabled || !charName) return;
        if (!this.client) await this.init();

        const user = this.getUser();
        if (!user) {
            console.log("ℹ️ Cloud Sync: Modo Offline (Sem usuário logado).");
            return;
        }

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
            console.log(`☁️ [${charName}] salvo na nuvem.`);
            this.updatePresence(charName, data);
        } catch (err) {
            console.error("❌ Erro ao salvar na nuvem:", err.message);
        }
    },

    /**
     * Gerencia a presença em tempo real
     */
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

    /**
     * Garante canal Realtime em estado SUBSCRIBED antes de broadcast (mensagens fiáveis entre jogadores).
     */
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

        // SEGURANÇA: Se o canal já existe mas o personagem mudou, precisamos recriar o canal
        if (this.presenceChannel) {
            const currentKey = this.presenceChannel.options?.config?.presence?.key;
            if (currentKey && currentKey !== charName) {
                console.log(`🔄 [Supabase] Personagem mudou de ${currentKey} para ${charName}. Reiniciando canal...`);
                
                const targetAccount = this.currentUser?.email;
                this.broadcastGM('kick_other_sessions', targetAccount, { 
                    sessionId: this.tabSessionId,
                    newChar: charName,
                    account: targetAccount
                });

                try {
                    const oldChannel = this.presenceChannel;
                    this.presenceChannel = null;
                    this._presenceSubscribed = false;
                    this._resetPresenceReadyPromise();
                    await this.client.removeChannel(oldChannel);
                } catch (e) { console.warn("Erro ao remover canal antigo:", e); }
            }
        }

        if (!this.presenceChannel) {
            this._resetPresenceReadyPromise();
            
            // MUDANÇA RADICAL: Canal dinâmico por SESSÃO para evitar cache e fantasmas
            // Cada vez que você dá F5 ou loga, você entra num "túnel" limpo.
            const channelName = 'online-players-v2'; 
            
            console.log(`🔗 [Supabase] Conectando ao canal global [${channelName}] como: ${charName}`);
            
            this.presenceChannel = this.client.channel(channelName, {
                config: {
                    broadcast: { ack: false },
                    presence: { key: charName }
                }
            });

            this.presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.presenceChannel.presenceState();
                    console.log('📡 [Supabase] Presença Sincronizada:', state);
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
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('👤 [Supabase] Entrou:', key);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('🚪 [Supabase] Saiu:', key);
                })
                .on('broadcast', { event: 'chat' }, (envelope) => {
                    console.log('💬 [Supabase] Chat recebido:', envelope);
                    const inner = envelope.payload || envelope;
                    if (!inner || !inner.autor || !inner.mensagem) return;
                    if (typeof adicionarMensagemChat === 'function') {
                        adicionarMensagemChat(inner.autor, inner.mensagem, inner.tipo || 'papel', inner.canal || 'global', true, null, inner.ascensionTitle || '');
                    }
                })
                .on('broadcast', { event: 'combat' }, (payload) => {
                    console.log('⚔️ [Supabase] Combate recebido:', payload);
                    const raw = payload.payload || payload;
                    if (!raw || typeof raw.evento !== 'string') return;
                    const sender = raw.dados?.sender || raw.dados?.nome || raw.dados?.attacker;
                    
                    // SEGURANÇA MÁXIMA: Ignora mensagens de si mesmo E de sessões antigas do mesmo personagem
                    if (sender === window.charName) {
                        if (raw.dados?.sessionId && raw.dados.sessionId !== this.tabSessionId) {
                            console.log("🚫 [Supabase] Ignorando fantasma de sessão antiga detectado.");
                        }
                        return;
                    }
                    if (raw.evento.startsWith('oly_') && window.OlympiadEngine) {
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
                            if (action === 'kick_other_sessions' && data?.sessionId === this.tabSessionId) return;
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

            // CRÍTICO: Chamar subscribe() e aguardar o status
            this.presenceChannel.subscribe(async (status) => {
                console.log("📡 [Supabase] Status da conexão:", status);
                if (status === 'SUBSCRIBED') {
                    this._presenceSubscribed = true;
                    await this.presenceChannel.track({
                        charName: charName,
                        online_at: new Date().toISOString()
                    });
                } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                    this._presenceSubscribed = false;
                    const dot = document.getElementById('multiplayer-dot');
                    if (dot) dot.style.background = '#ef4444';
                }
            });
        } else {
            await this.presenceChannel.track({
                charName: charName,
                online_at: new Date().toISOString()
            });
        }
    },

    /**
     * Envia uma mensagem via Broadcast para todos os jogadores
     */
    async broadcastChat(autor, mensagem, tipo, canal, ascensionTitle) {
        if (!this.presenceChannel) {
            console.log("📡 [Supabase] Tentando reconectar canal antes de enviar chat...");
            await this.ensureChatConnected(window.charName, {});
        }
        if (!this.presenceChannel) return false;

        console.log('📤 [Supabase] Enviando chat via broadcast:', mensagem);
        const { error } = await this.presenceChannel.send({
            type: 'broadcast',
            event: 'chat',
            payload: { 
                autor, 
                mensagem, 
                tipo, 
                canal, 
                ascensionTitle: ascensionTitle || '',
                sessionId: this.tabSessionId // Identificador de sessão para filtro
            }
        });
        
        if (error) {
            console.warn('[broadcastChat] Erro ao enviar:', error);
            return false;
        }
        return true;
    },

    async broadcastCombat(evento, dados) {
        if (!this.presenceChannel) {
            if (window.charName) {
                console.log("📡 [Supabase] Tentando reconectar canal antes de broadcast...");
                await this.ensureChatConnected(window.charName, {});
            }
        }
        
        if (!this.presenceChannel) {
            console.warn("⚠️ [Supabase] Falha ao enviar broadcast: Canal não inicializado.");
            return;
        }

        if (dados && typeof dados === 'object') {
            dados.sender = window.charName;
            dados.sessionId = this.tabSessionId; // Identificador de sessão para filtro de fantasmas
        }
        
        console.log(`📤 [Supabase] Enviando combate [${evento}]:`, dados);
        
        // SEGURANÇA: Garante que o envio seja feito via Realtime se possível, ou via HTTP se necessário
        try {
            // Tenta enviar via Realtime (WebSocket)
            const { error } = await this.presenceChannel.send({
                type: 'broadcast',
                event: 'combat',
                payload: { evento, dados, timestamp: Date.now() }
            });

            if (error) {
                console.warn("⚠️ [Supabase] Erro no envio Realtime, tentando fallback HTTP:", error.message);
                
                // Se o erro for de canal fechado ou rate limit, tenta forçar um reset
                if (error.message?.includes('closed') || error.message?.includes('rate limit')) {
                    this.presenceChannel = null;
                    this._presenceSubscribed = false;
                }
            }
        } catch (e) {
            console.error("❌ [Supabase] Exceção ao enviar broadcast:", e);
        }
    },

    async broadcastGM(action, target, data = {}) {
        if (!this.presenceChannel) return;
        
        await this.presenceChannel.send({
            type: 'broadcast',
            event: 'gm_command',
            payload: { action, target, data }
        });
    },

    /** Canal postgres_changes para mensagens de clã (não usar broadcast público). */
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
        try {
            this.client.removeChannel(ch);
        } catch (e) {
            console.warn('unsubscribeClanChat:', e);
        }
    },

    /**
     * Histórico recente do clã (RLS limita ao(s) clã(s) da conta).
     * @returns {Promise<Array<{id:string,char_name:string,body:string,tier:string,created_at:string}>>}
     */
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

        if (error) {
            console.warn('[fetchClanChatHistory]', error);
            return [];
        }
        return (data || []).reverse();
    },

    /**
     * Escuta INSERT na tabela para o clan_id atual (Realtime).
     * @param {number|string} clanId
     * @param {(row: object) => void} onInsert
     */
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
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'clan_chat_messages',
                    filter: `clan_id=eq.${filterVal}`
                },
                (payload) => {
                    if (payload && payload.new && typeof onInsert === 'function') {
                        onInsert(payload.new);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[subscribeClanChat]', status);
                }
            });
    },

    /**
     * Grava mensagem de clã de forma segura via RPC.
     */
    async insertClanChatMessage(clanId, body, tier, ascensionTitle) {
        if (!SUPABASE_CONFIG.enabled || clanId == null) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        
        const { data, error } = await this.client.rpc('insert_clan_chat_secure', {
            p_clan_id: clanId,
            p_body: body,
            p_tier: tier || 'Paper',
            p_ascension_title: (ascensionTitle && String(ascensionTitle).trim()) ? String(ascensionTitle).trim().slice(0, 48) : ''
        });

        if (error) console.warn('[insertClanChatMessage RPC]', error);
        return { data, error };
    },

    /**
     * Compra NPC Grocer (consumíveis / scrolls): preço autoritativo em npc_shop_stackables.
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async npcShopBuyStackable(charName, shopItemId, qty) {
        if (!SUPABASE_CONFIG.enabled || !charName || !shopItemId) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('npc_shop_buy_stackable', {
            p_char_name: charName,
            p_shop_item_id: shopItemId,
            p_qty: qty
        });
        return { data, error };
    },

    /**
     * Resgate semanal de Ascensão (Elite Hunt): valida no servidor.
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async claimWeeklyAscension(charName, weekKey) {
        if (!SUPABASE_CONFIG.enabled || !charName || !weekKey) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('claim_weekly_ascension', {
            p_char_name: charName,
            p_week_key: weekKey
        });
        return { data, error };
    },

    /**
     * Valida loot de mob no servidor (Ancient Coins e Receitas).
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async validateMobLoot(charName, mobId, zoneName, isChampion, isSpoiled, mobLevel) {
        if (!SUPABASE_CONFIG.enabled || !charName) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('validate_mob_loot', {
            p_char_name: charName,
            p_mob_id: mobId,
            p_zone_name: zoneName,
            p_is_champion: !!isChampion,
            p_is_spoiled: !!isSpoiled,
            p_mob_level: parseInt(mobLevel, 10) || 1
        });
        return { data, error };
    },

    /**
     * Encanta um item no servidor.
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async enchantItem(charName, itemUid, scrollName) {
        if (!SUPABASE_CONFIG.enabled || !charName || !itemUid || !scrollName) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('enchant_item', {
            p_char_name: charName,
            p_item_uid: itemUid,
            p_scroll_name: scrollName
        });
        return { data, error };
    },

    /**
     * Augmenta um item no servidor.
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async augmentItem(charName, itemUid, stoneName) {
        if (!SUPABASE_CONFIG.enabled || !charName || !itemUid || !stoneName) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('augment_item', {
            p_char_name: charName,
            p_item_uid: itemUid,
            p_stone_name: stoneName
        });
        return { data, error };
    },

    /**
     * Crafta um item no servidor.
     * @returns {Promise<{ data: object | null, error: Error | null }>}
     */
    async craftItem(charName, recipeId, choiceIdBase = null) {
        if (!SUPABASE_CONFIG.enabled || !charName || !recipeId) {
            return { data: null, error: new Error('offline_or_invalid') };
        }
        if (!this.client) await this.init();
        if (!this.client || !this.getUser()) {
            return { data: null, error: new Error('not_authenticated') };
        }
        const { data, error } = await this.client.rpc('craft_item', {
            p_char_name: charName,
            p_recipe_id: recipeId,
            p_choice_id_base: choiceIdBase
        });
        return { data, error };
    },

    /**
     * Busca as mensagens do correio para o personagem atual.
     */
    async fetchMailbox(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();
        
        const { data, error } = await this.client
            .from('mailbox')
            .select('*')
            .eq('recipient_name', charName)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('[fetchMailbox]', error);
            return [];
        }
        return data || [];
    },

    /**
     * Envia um correio de forma segura via RPC.
     */
    async sendMail(recipient, subject, type, details) {
        if (!SUPABASE_CONFIG.enabled || !recipient) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('send_mail_secure', {
            p_recipient_name: recipient,
            p_subject: subject,
            p_type: type,
            p_details: details
        });

        if (error) {
            console.error('[sendMail RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    /**
     * Resgata recompensas de um correio via RPC.
     */
    async claimMailReward(mailId) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('claim_mail_reward', {
            p_mail_id: mailId
        });

        if (error) {
            console.error('[claimMailReward RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    /**
     * Marca uma mensagem como lida ou deleta.
     */
    async updateMailStatus(mailId, updates) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return;
        if (!this.client) await this.init();

        const { error } = await this.client
            .from('mailbox')
            .update(updates)
            .eq('id', mailId);

        if (error) console.warn('[updateMailStatus]', error);
    },

    async deleteMail(mailId) {
        if (!SUPABASE_CONFIG.enabled || !mailId) return;
        if (!this.client) await this.init();

        const { error } = await this.client
            .from('mailbox')
            .delete()
            .eq('id', mailId);

        if (error) console.warn('[deleteMail]', error);
    },

    /**
     * Busca os status autoritativos de um jogador (recalculados no servidor).
     */
    async getPlayerStatsAutoritativo(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('get_player_stats_autoritativo', {
            p_target_char_name: charName
        });

        if (error) {
            console.error('[getPlayerStatsAutoritativo RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    /**
     * Busca todos os clãs e seus membros.
     */
    async fetchClans() {
        if (!SUPABASE_CONFIG.enabled) return [];
        if (!this.client) await this.init();

        const { data: clans, error: clanErr } = await this.client
            .from('clans')
            .select('*');

        if (clanErr) {
            console.warn('[fetchClans]', clanErr);
            return [];
        }

        const { data: members, error: memErr } = await this.client
            .from('clan_members')
            .select('*');

        if (memErr) {
            console.warn('[fetchClanMembers]', memErr);
            return clans.map(c => ({ ...c, membros: [] }));
        }

        return clans.map(c => ({
            ...c,
            membros: members.filter(m => m.clan_id === c.id).map(m => m.char_name)
        }));
    },

    async createClan(charName, clanName, tag, logo, minLevel) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('create_clan_secure', {
            p_char_name: charName,
            p_clan_name: clanName,
            p_clan_tag: tag,
            p_logo: logo,
            p_min_level: minLevel
        });

        if (error) {
            console.error('[createClan RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    async applyToClan(charName, clanId) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('apply_to_clan', {
            p_char_name: charName,
            p_clan_id: clanId
        });

        if (error) {
            console.error('[applyToClan RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    async fetchClanApplications(charName) {
        if (!SUPABASE_CONFIG.enabled || !charName) return [];
        if (!this.client) await this.init();

        const { data, error } = await this.client
            .from('clan_applications')
            .select('*, clans(name, tag, leader_name)')
            .or(`char_name.eq.${charName},clan_id.in.(select id from clans where leader_name.eq.${charName})`);

        if (error) {
            console.warn('[fetchClanApplications]', error);
            return [];
        }
        return data || [];
    },

    async respondClanApplication(leaderCharName, applicationId, accept) {
        if (!SUPABASE_CONFIG.enabled || !leaderCharName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('respond_clan_application', {
            p_leader_char_name: leaderCharName,
            p_application_id: applicationId,
            p_accept: accept
        });

        if (error) {
            console.error('[respondClanApplication RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    async leaveClan(charName, clanId) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { error } = await this.client
            .from('clan_members')
            .delete()
            .eq('char_name', charName)
            .eq('clan_id', clanId);

        if (error) {
            console.error('[leaveClan Error]', error);
            return { success: false, error };
        }
        return { success: true };
    },

    /**
     * Busca os status de todos os castelos na nuvem.
     */
    async fetchCastles() {
        if (!SUPABASE_CONFIG.enabled) return [];
        if (!this.client) await this.init();

        const { data, error } = await this.client
            .from('castles')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.warn('[fetchCastles]', error);
            return [];
        }
        return data || [];
    },

    async claimCastleVictory(charName, castleId) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('claim_castle_victory', {
            p_char_name: charName,
            p_castle_id: castleId
        });

        if (error) {
            console.error('[claimCastleVictory RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    async withdrawCastleTreasury(charName, castleId) {
        if (!SUPABASE_CONFIG.enabled || !charName) return { success: false };
        if (!this.client) await this.init();

        const { data, error } = await this.client.rpc('withdraw_castle_treasury', {
            p_char_name: charName,
            p_castle_id: castleId
        });

        if (error) {
            console.error('[withdrawCastleTreasury RPC Error]', error);
            return { success: false, error };
        }
        return data;
    },

    /**
     * Busca o Top 50 do ranking global
     */
    async getGlobalRanking() {
        if (!SUPABASE_CONFIG.enabled || !SUPABASE_CONFIG.url || !this.client) return null;

        try {
            const { data: players, error } = await this.client
                .from('characters')
                .select('char_name, level, char_class, data')
                .order('level', { ascending: false })
                .limit(50);

            if (error) throw error;
            return players.map(p => {
                const d = p.data && typeof p.data === 'object' ? p.data : {};
                const r =
                    d.endgame && typeof d.endgame === 'object' && typeof d.endgame.renown === 'number'
                        ? d.endgame.renown
                        : 0;
                let asc = '';
                if (window.EndgamePursuits && typeof window.EndgamePursuits.getAscensionTitleForRenown === 'function') {
                    asc = window.EndgamePursuits.getAscensionTitleForRenown(r);
                } else if (r >= 200) asc = 'Paragon';
                else if (r >= 100) asc = 'Warlord';
                else if (r >= 40) asc = 'Veteran';
                else asc = 'Ascendant';
                return {
                    nome: p.char_name,
                    olympiadPoints: d.olympiadPoints || 0,
                    isRealPlayer: true,
                    classe: p.char_class || 'Fighter',
                    nivel: p.level || 1,
                    renown: r,
                    ascensionTitle: asc
                };
            });
        } catch (err) {
            console.error("Erro ao buscar ranking global:", err);
            return null;
        }
    }
};

// Hook para o cloud_sync.js ou core.js usar
if (typeof window !== 'undefined') {
    window.SupabaseAPI = SupabaseAPI;
    window.SUPABASE_CONFIG = SUPABASE_CONFIG; // Expõe a config globalmente
    // Inicialização proativa para detectar sessões existentes
    SupabaseAPI.init();
}
