/**
 * AUTH_ENGINE — Sistema de Contas e Seleção de Personagens
 * Migrado: js/systems/auth_engine.js — Fase 4: tipos explícitos.
 */

import type { AuthEngineApi } from '../types/game';
import { registerGlobal } from '../runtime/register-global';

function authT(key: string, params?: Record<string, string | number>): string {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

function authInputValue(id: string): string {
    const el = document.getElementById(id);
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : '';
}

function authSetInputValue(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = value;
    }
}

const AuthEngine = {
    currentAccount: null,
    availableCharacters: [],
    loading: false, // Trava de segurança contra cliques múltiplos
    /** Evita login duplo (form + onAuthStateChange) durante signInWithPassword */
    _manualPasswordLoginInProgress: false,
    /** Fluxo do link de recuperação de senha no e-mail */
    _passwordRecoveryMode: false,
    /** Chave da conta localStorage durante reset offline */
    _offlinePasswordResetKey: null as string | null,
    _fromAuthStateSignedIn: false,

    tips: [
        "Use Soulshots to significantly increase your damage. They are essential for tough battles.",
        "Join a Clan to participate in Castle Sieges and gain exclusive bonuses.",
        "The Olympiad is the ultimate test of skill. Become a Hero of Aden!",
        "Level up your skills at the Master NPCs found in every major city.",
        "Keep your equipment updated. Better armor and weapons are the key to survival.",
        "Trade with other players to acquire rare items and accumulate Adena.",
        "Watch out for PKs (Player Killers) in open fields. Safety in numbers!",
        "Each class has unique strengths. Find the one that fits your playstyle best."
    ],
    
    init() {
        console.log("🛡️ AuthEngine iniciado.");
        
        // 1. VERIFICAÇÃO DE EMERGÊNCIA (URL)
        const isRecovery = window.location.href.includes('type=recovery') || 
                          window.location.hash.includes('type=recovery') ||
                          window.location.search.includes('type=recovery');

        if (isRecovery) {
            console.log("🔑 [Auth] Link de recuperação detectado! Travando interface...");
            this._passwordRecoveryMode = true;
            
            // Força a exibição do formulário de recuperação e esconde o resto via CSS agressivo
            const style = document.createElement('style');
            style.innerHTML = `
                #login-form, #register-form, #recover-form { display: none !important; }
                #password-recovery-form { display: block !important; }
            `;
            document.head.appendChild(style);
            
            setTimeout(() => this.showPasswordRecoveryForm(), 50);
        }

        // Se já houver uma conta logada (apenas se não estiver em recuperação)
        const savedAccount = localStorage.getItem('l2mini_active_account');
        if (savedAccount && !this._passwordRecoveryMode) {
            this.currentAccount = savedAccount;
        }

        // 2. ESCUTA O SUPABASE
        if (typeof window.SupabaseAPI !== 'undefined') {
            window.SupabaseAPI.init().then(() => {
                window.SupabaseAPI.client.auth.onAuthStateChange((event, session) => {
                    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecovery)) {
                        console.log("🔄 [Auth] Sessão de recuperação ativa.");
                        this.onPasswordRecoverySession(session);
                    }
                });
            });
        }
    },

    showLoading(text) {
        if (typeof window.showLoadingOverlay === 'function') {
            const line = (text !== undefined && text !== null && text !== '')
                ? text
                : authT('loading.default');
            window.showLoadingOverlay(line);
            const tip = document.getElementById('loading-tip');
            if (tip) {
                let tipList = (typeof window.I18n !== 'undefined' && window.I18n.getArray)
                    ? window.I18n.getArray('auth.tips')
                    : [];
                if (!tipList || !tipList.length) tipList = this.tips;
                const randomTip = tipList[Math.floor(Math.random() * tipList.length)];
                tip.innerText = '"' + randomTip + '"';
            }
            return;
        }

        const overlay = document.getElementById('loading-overlay');
        const status = document.getElementById('loading-status');
        const tip = document.getElementById('loading-tip');
        const fill = document.getElementById('loading-bar-fill');
        
        if (overlay && status && tip) {
            const line = (text !== undefined && text !== null && text !== '')
                ? text
                : authT('loading.default');
            status.innerText = line;
            
            let tipList = (typeof window.I18n !== 'undefined' && window.I18n.getArray)
                ? window.I18n.getArray('auth.tips')
                : [];
            if (!tipList || !tipList.length) tipList = this.tips;
            const randomTip = tipList[Math.floor(Math.random() * tipList.length)];
            tip.innerText = '"' + randomTip + '"';
            
            overlay.classList.remove('loading-overlay--boot');
            if (fill) {
                fill.style.width = '';
                fill.classList.remove('loading-bar-fill--determinate');
                fill.classList.add('loading-bar-fill--indeterminate');
            }
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            overlay.setAttribute('aria-hidden', 'false');
        }
    },

    hideLoading() {
        if (typeof window.hideLoadingOverlay === 'function') {
            window.hideLoadingOverlay();
            return;
        }

        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.pointerEvents = 'none';
            overlay.style.opacity = '0';
            overlay.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto';
            }, 300);
        }
    },

    /**
     * Tenta realizar o login na conta
     */
    async login(username, password) {
        if (this.loading) return; // Trava contra cliques múltiplos

        if (!window.__L2MINI_BOOT_READY) {
            window.l2Alert(authT('loading.connecting'));
            return;
        }

        if (!username || !password) {
            window.l2Alert(authT('auth.loginEmpty'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.authenticating'));

        // Garante que o Supabase está inicializado antes de tentar login
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled) {
            try {
                await window.SupabaseAPI.init();
                
                let email = String(username).trim();
                if (!email.includes('@')) {
                    const resolved = await window.SupabaseAPI.resolveLoginEmail(email);
                    if (!resolved) {
                        this.loading = false;
                        this.hideLoading();
                        window.l2Alert(authT('auth.invalidCredentials'));
                        return;
                    }
                    email = resolved;
                } else {
                    email = email.toLowerCase();
                }

                console.log("☁️ Tentando Autenticação...");
                this._manualPasswordLoginInProgress = true;
                const { data, error } = await window.SupabaseAPI.client.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    this._manualPasswordLoginInProgress = false;
                    this.loading = false;
                    this.hideLoading();
                    console.error("❌ Erro de Auth:", error.message);
                    const msg = (error.message || '').toLowerCase();
                    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
                        window.l2Alert(authT('auth.invalidCredentials'));
                    } else if (msg.includes('email not confirmed')) {
                        window.l2Alert(authT('auth.emailNotConfirmed'));
                    } else {
                        window.l2Alert(authT('auth.loginError', { message: error.message }));
                    }
                    return;
                }

                if (data.user) {
                    // Verifica se o e-mail foi confirmado (Segurança de MMORPG)
                    if (!data.user.email_confirmed_at) {
                        console.warn("⚠️ Tentativa de login com e-mail não confirmado.");
                        await window.SupabaseAPI.client.auth.signOut();
                        this._manualPasswordLoginInProgress = false;
                        this.loading = false;
                        this.hideLoading();
                        window.l2Alert(authT('auth.emailNotConfirmed'));
                        return;
                    }

                    console.log("✅ Autenticado com sucesso!");
                    const displayAccount =
                        data.user.user_metadata?.username ||
                        (String(username).includes('@') ? email : String(username).trim()) ||
                        email;
                    this.onLoginSuccess(displayAccount);
                    setTimeout(() => {
                        this._manualPasswordLoginInProgress = false;
                    }, 800);
                    this.loading = false;
                    return;
                }
                this._manualPasswordLoginInProgress = false;
            } catch (err) {
                console.error("Erro crítico de login:", err);
                this._manualPasswordLoginInProgress = false;
                this.loading = false;
                this.hideLoading();
                window.l2Alert(authT('auth.loginError', { message: String(err && err.message ? err.message : err) }));
            }
        }

        // Fallback para LocalStorage se a nuvem falhar
        if (this.loading) {
            console.log("⚠️ Supabase falhou ou offline, tentando LocalStorage...");
            const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
            const userKey = username.toLowerCase();
            
            if (accounts[userKey]) {
                if (accounts[userKey].password === password) {
                    this.onLoginSuccess(username);
                } else {
                    window.l2Alert(authT('auth.invalidPassword'));
                }
            } else {
                window.l2Alert(authT('auth.accountNotFound'));
            }
            this.loading = false;
            this.hideLoading();
        }
    },

    /**
     * Registra uma nova conta
     */
    async register(username, password, confirmPassword, email, emailConfirm) {
        if (this.loading) return;

        if (!username || !password || !confirmPassword || !email || !emailConfirm) {
            window.l2Alert(authT('auth.registerFields'));
            return;
        }

        if (email.toLowerCase().trim() !== emailConfirm.toLowerCase().trim()) {
            window.l2Alert(authT('auth.emailMismatch'));
            return;
        }

        if (password !== confirmPassword) {
            window.l2Alert(authT('auth.passwordMismatch'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.creatingAccount'));

        // Registro via Supabase (perfil: trigger em auth.users → public.profiles — ver supabase_auth_profile_trigger.sql)
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled) {
            try {
                await window.SupabaseAPI.init();
                if (!window.SupabaseAPI.client) throw new Error('no client');

                const uName = String(username).trim();
                const mail = String(email).trim().toLowerCase();

                // Validação Profissional de Formato de Usuário
                if (!/^[a-zA-Z0-9]+$/.test(uName)) {
                    this.loading = false;
                    this.hideLoading();
                    window.l2Alert(authT('auth.invalidUsernameFormat'));
                    return;
                }

                if (password.length < 6) {
                    this.loading = false;
                    this.hideLoading();
                    window.l2Alert(authT('auth.passwordTooShort'));
                    return;
                }

                const { data: taken } = await window.SupabaseAPI.client
                    .from('profiles')
                    .select('id')
                    .ilike('username', uName)
                    .maybeSingle();

                if (taken) {
                    this.loading = false;
                    this.hideLoading();
                    window.l2Alert(authT('auth.usernameExists'));
                    return;
                }

                const redirectTo =
                    typeof window.SupabaseAPI.getAuthRedirectUrl === 'function'
                        ? window.SupabaseAPI.getAuthRedirectUrl()
                        : '';

                const { data, error } = await window.SupabaseAPI.client.auth.signUp({
                    email: mail,
                    password: password,
                    options: {
                        emailRedirectTo: redirectTo || undefined,
                        data: { username: uName }
                    }
                });

                if (error) {
                    this.loading = false;
                    this.hideLoading();
                    const em = (error.message || '').toLowerCase();
                    if (em.includes('already registered') || em.includes('user already')) {
                        window.l2Alert(authT('auth.emailAlreadyRegistered'));
                    } else {
                        window.l2Alert(authT('auth.registerError', { message: error.message }));
                    }
                    return;
                }

                if (data.user) {
                    this.loading = false;
                    this.hideLoading();
                    const hasSession = !!data.session;
                    window.l2Alert(
                        hasSession
                            ? authT('auth.registerSuccessWithSession')
                            : authT('auth.registerConfirmEmail'),
                        () => {
                            this.showLogin();
                        }
                    );
                    return;
                }

                this.loading = false;
                this.hideLoading();
                window.l2Alert(authT('auth.registerUnexpected'));
                return;
            } catch (err) {
                console.error("Erro no registro Supabase:", err);
                this.loading = false;
                this.hideLoading();
            }
        }

        // Fallback Local
        const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
        const userKey = username.toLowerCase();

        if (accounts[userKey]) {
            this.loading = false;
            this.hideLoading();
            window.l2Alert(authT('auth.usernameExists'));
            return;
        }

        accounts[userKey] = { 
            username: username, 
            password: password, 
            email: email,
            characters: [],
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('l2mini_accounts', JSON.stringify(accounts));
        this.loading = false;
        this.hideLoading();

        window.l2Alert(authT('auth.registerOfflineSuccess'), () => {
            this.showLogin();
        });
    },

    /**
     * Pedido de link de recuperação (Supabase) ou fluxo legado local.
     */
    async recoverPassword(usernameOrEmail) {
        if (this.loading) return;
        if (!usernameOrEmail) {
            window.l2Alert(authT('auth.recoveryUserEmpty'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.sendingResetEmail'));

        const raw = String(usernameOrEmail).trim();

        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled) {
            try {
                await window.SupabaseAPI.init();
                if (window.SupabaseAPI.client) {
                    let mail = raw.toLowerCase();
                    if (!raw.includes('@')) {
                        const resolved = await window.SupabaseAPI.resolveLoginEmail(raw);
                        if (!resolved) {
                            this.loading = false;
                            this.hideLoading();
                            window.l2Alert(authT('auth.resetEmailGeneric'));
                            return;
                        }
                        mail = resolved;
                    }

                    const redirectTo =
                        typeof window.SupabaseAPI.getAuthRedirectUrl === 'function'
                            ? window.SupabaseAPI.getAuthRedirectUrl()
                            : '';

                    const { error } = await window.SupabaseAPI.client.auth.resetPasswordForEmail(mail, {
                        redirectTo: redirectTo || undefined
                    });

                    this.loading = false;
                    this.hideLoading();

                    if (error) {
                        window.l2Alert(authT('auth.resetRequestError', { message: error.message }));
                    } else {
                        window.l2Alert(authT('auth.resetEmailSent'));
                    }
                    return;
                }
            } catch (e) {
                console.error('[recoverPassword]', e);
                this.loading = false;
                this.hideLoading();
            }
        }

        this.loading = false;
        this.hideLoading();

        const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
        let foundUser = null;
        for (let key in accounts) {
            if (key === raw.toLowerCase() || accounts[key].email === raw) {
                foundUser = key;
                break;
            }
        }

        if (foundUser) {
            const em = accounts[foundUser].email;
            const hiddenEmail = em.substring(0, 3) + '****' + em.substring(em.indexOf('@'));
            const confirmed = await window.l2Confirm(
                authT('auth.recoveryConfirm', { email: hiddenEmail }),
                authT('auth.recoveryConfirmTitle')
            );
            if (confirmed) {
                this.showOfflinePasswordResetForm(foundUser, hiddenEmail);
            }
        } else {
            window.l2Alert(authT('auth.accountNotFoundRecovery'));
        }
    },

    /**
     * Chamado quando o jogador abre o link do e-mail de recuperação (recovery session).
     */
    onPasswordRecoverySession(session) {
        console.log("🛠️ [Auth] Preparando tela de nova senha...");
        this._passwordRecoveryMode = true;
        
        // Exibe o nome da conta para o usuário saber o que está recuperando
        const display = document.getElementById('recovery-account-display');
        if (display && session?.user) {
            const uname = session.user.user_metadata?.username || session.user.email;
            display.innerText = uname ? uname.toUpperCase() : "";
        }

        // Limpa qualquer estado de carregamento ou modais
        if (typeof window.fecharTodosModaisBackdropStack === 'function') {
            window.fecharTodosModaisBackdropStack();
        }
        
        // Garante que estamos na tela de login
        if (typeof mudarTela === 'function') {
            window.mudarTela('screen-login');
        }
        
        this.hideLoading();
        this.loading = false;
        
        // Força a exibição do formulário de nova senha
        this.showPasswordRecoveryForm();
    },

    showPasswordRecoveryForm() {
        const pr = document.getElementById('password-recovery-form');
        if (!pr) return;
        
        // Esconde todos os outros
        const forms = ['login-form', 'register-form', 'recover-form'];
        forms.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.setProperty('display', 'none', 'important');
        });

        // Mostra o de recuperação
        pr.style.setProperty('display', 'block', 'important');
        
        const a = document.getElementById('recovery-new-password');
        const b = document.getElementById('recovery-new-password-confirm');
        if (a instanceof HTMLInputElement) a.value = '';
        if (b instanceof HTMLInputElement) b.value = '';
        
        console.log("✅ [Auth] Formulário de nova senha exibido.");
    },

    showOfflinePasswordResetForm(accountKey: string, maskedEmail: string) {
        this._offlinePasswordResetKey = accountKey;
        this._passwordRecoveryMode = false;

        const forms = ['login-form', 'register-form', 'recover-form', 'recover-login-form', 'password-recovery-form'];
        forms.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.setProperty('display', 'none', 'important');
        });

        const offline = document.getElementById('offline-password-reset-form');
        if (offline) offline.style.setProperty('display', 'block', 'important');

        const display = document.getElementById('offline-reset-account-display');
        if (display) display.innerText = maskedEmail ? maskedEmail.toUpperCase() : accountKey.toUpperCase();

        const a = document.getElementById('offline-reset-new-password');
        const b = document.getElementById('offline-reset-new-password-confirm');
        if (a instanceof HTMLInputElement) a.value = '';
        if (b instanceof HTMLInputElement) b.value = '';
    },

    submitOfflinePasswordReset() {
        if (this.loading) return;
        const accountKey = this._offlinePasswordResetKey;
        if (!accountKey) {
            window.l2Alert(authT('auth.accountNotFoundRecovery'));
            return;
        }

        const a = document.getElementById('offline-reset-new-password');
        const b = document.getElementById('offline-reset-new-password-confirm');
        const p1 = a instanceof HTMLInputElement ? a.value : '';
        const p2 = b instanceof HTMLInputElement ? b.value : '';

        if (!p1 || !p2) {
            window.l2Alert(authT('auth.registerFields'));
            return;
        }
        if (p1 !== p2) {
            window.l2Alert(authT('auth.passwordMismatch'));
            return;
        }
        if (p1.length < 6) {
            window.l2Alert(authT('auth.passwordTooShort'));
            return;
        }

        const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
        if (!accounts[accountKey]) {
            window.l2Alert(authT('auth.accountNotFoundRecovery'));
            this._offlinePasswordResetKey = null;
            this.showLogin();
            return;
        }

        accounts[accountKey].password = p1;
        localStorage.setItem('l2mini_accounts', JSON.stringify(accounts));
        this._offlinePasswordResetKey = null;
        window.l2Alert(authT('auth.passwordUpdated'), () => {
            this.showLogin();
        });
    },

    async submitPasswordRecovery() {
        if (this.loading) return;
        const a = document.getElementById('recovery-new-password');
        const b = document.getElementById('recovery-new-password-confirm');
        const p1 = a instanceof HTMLInputElement ? a.value : '';
        const p2 = b instanceof HTMLInputElement ? b.value : '';
        if (!p1 || !p2) {
            window.l2Alert(authT('auth.registerFields'));
            return;
        }
        if (p1 !== p2) {
            window.l2Alert(authT('auth.passwordMismatch'));
            return;
        }
        if (p1.length < 6) {
            window.l2Alert(authT('auth.passwordTooShort'));
            return;
        }

        if (typeof window.SupabaseAPI === 'undefined' || !window.SUPABASE_CONFIG.enabled || !window.SupabaseAPI.client) {
            window.l2Alert(authT('auth.resetRequestError', { message: 'Offline' }));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.updatingPassword'));

        try {
            const { error } = await window.SupabaseAPI.client.auth.updateUser({ password: p1 });
            if (error) {
                window.l2Alert(authT('auth.resetRequestError', { message: error.message }));
                return;
            }
            await window.SupabaseAPI.client.auth.signOut();
            this._passwordRecoveryMode = false;
            window.l2Alert(authT('auth.passwordUpdatedRecoveryDone'), () => {
                this.showLogin();
            });
        } catch (e) {
            console.error('[submitPasswordRecovery]', e);
            window.l2Alert(authT('auth.resetRequestError', { message: String(e.message || e) }));
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    },

    showRegister() {
        this._passwordRecoveryMode = false;
        this._offlinePasswordResetKey = null;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('recover-form').style.display = 'none';
        document.getElementById('recover-login-form').style.display = 'none';
        const pr = document.getElementById('password-recovery-form');
        if (pr) pr.style.display = 'none';
        const offline = document.getElementById('offline-password-reset-form');
        if (offline) offline.style.display = 'none';
    },

    showLogin() {
        this._passwordRecoveryMode = false;
        this._offlinePasswordResetKey = null;
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('recover-form').style.display = 'none';
        document.getElementById('recover-login-form').style.display = 'none';
        const pr = document.getElementById('password-recovery-form');
        if (pr) pr.style.display = 'none';
        const offline = document.getElementById('offline-password-reset-form');
        if (offline) offline.style.display = 'none';
    },

    showRecover() {
        this._passwordRecoveryMode = false;
        this._offlinePasswordResetKey = null;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('recover-form').style.display = 'block';
        document.getElementById('recover-login-form').style.display = 'none';
        const pr = document.getElementById('password-recovery-form');
        if (pr) pr.style.display = 'none';
        const offline = document.getElementById('offline-password-reset-form');
        if (offline) offline.style.display = 'none';
    },

    showRecoverLogin() {
        this._passwordRecoveryMode = false;
        this._offlinePasswordResetKey = null;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('recover-form').style.display = 'none';
        document.getElementById('recover-login-form').style.display = 'block';
        const pr = document.getElementById('password-recovery-form');
        if (pr) pr.style.display = 'none';
        const offline = document.getElementById('offline-password-reset-form');
        if (offline) offline.style.display = 'none';
    },

    async recoverUsername(email) {
        if (this.loading) return;
        if (!email || !email.includes('@')) {
            window.l2Alert(authT('auth.invalidEmail'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.checkingEmail'));

        // Profissional: Mesmo que o e-mail não exista, damos a mesma resposta para evitar "pesquisa de e-mails" por hackers
        setTimeout(() => {
            this.loading = false;
            this.hideLoading();
            window.l2Alert(authT('auth.recoverLoginSent'), () => {
                this.showLogin();
            });
            
            // Na prática, como o Supabase não envia e-mail de "Username", 
            // a melhor instrução para o jogador é usar o e-mail para logar.
            // Se você quiser que ele receba um e-mail real, o ideal é ele usar a Recuperação de Senha.
        }, 1500);
    },

    onLoginSuccess(username) {
        this.currentAccount = username;
        localStorage.setItem('l2mini_active_account', username);
        
        // Limpa estado de personagem anterior para evitar bugs de persistência visual
        window.charName = "";
        window._l2miniLastCarregarChar = null; 
        
        this.loadCharacterList().then(() => {
            this.hideLoading();
            window.window.mudarTela('screen-char-select');

            // Tenta inicializar modo GM se o usuário tiver acesso
            if (window.GMEngine?.init) {
                void window.GMEngine.init();
            }
        }).catch((err) => {
            console.error('Erro ao carregar lista de personagens:', err);
            this.hideLoading();
            window.l2Alert(authT('auth.loginError', { message: String(err && err.message ? err.message : err) }));
        });
    },

    /**
     * Busca a lista de personagens vinculados à conta
     */
    async loadCharacterList() {
        this.availableCharacters = [];
        const seenNames = new Set(); // Trava de segurança para evitar duplicados na UI

        // 1. Tenta carregar do Supabase primeiro
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.client) {
            try {
                const { data: { user } } = await window.SupabaseAPI.client.auth.getUser();
                if (user) {
                    const { data: chars, error } = await (window.SupabaseAPI.client
                        .from('characters') as unknown as {
                            select: (cols: string) => {
                                eq: (col: string, val: string) => Promise<{
                                    data: Array<{ char_name: string; data: Record<string, unknown> }> | null;
                                    error: { message: string } | null;
                                }>;
                            };
                        })
                        .select('char_name, data')
                        .eq('user_id', user.id ?? '');
                    
                    if (chars && chars.length > 0) {
                        chars.forEach(c => {
                            if (seenNames.has(c.char_name.toLowerCase())) return;
                            
                            const parsed = c.data || {};
                            parsed.charName = c.char_name;
                            this.availableCharacters.push(parsed);
                            seenNames.add(c.char_name.toLowerCase());
                        });
                        console.log("☁️ Personagens carregados da nuvem.");
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar personagens do Supabase:", err);
            }
        }

        // 2. Redundância LocalStorage (Apenas se o Supabase estiver desativado ou offline)
        const isCloudEnabled = typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled;
        const hasCloudSession = isCloudEnabled && window.SupabaseAPI.getUser();

        // Se estiver usando nuvem, NÃO buscamos redundância local para evitar "ressuscitar" chars deletados
        if (!hasCloudSession && this.availableCharacters.length === 0) {
            console.log("ℹ️ Cloud offline ou sem sessão. Buscando personagens locais...");
            const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
            const charNames = accounts[this.currentAccount]?.characters || [];
            
            charNames.forEach(name => {
                if (seenNames.has(name.toLowerCase())) return;

                const charData = localStorage.getItem('l2mini_save_' + name.toLowerCase());
                if (charData) {
                    const parsed = JSON.parse(charData);
                    parsed.charName = name; 
                    this.availableCharacters.push(parsed);
                    seenNames.add(name.toLowerCase());
                }
            });
        }

        this.renderCharacterList();
    },

    _charSelectPaperdollBlankSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    _buildCharSelectPaperdollHtml() {
        const blank = this._charSelectPaperdollBlankSrc;
        return `
            <div class="char-hero-paperdoll-host">
                <div class="l2-paperdoll l2-paperdoll--char-select char-select-paperdoll" role="img" aria-hidden="true">
                    <div class="paperdoll-character-stack">
                        <div class="paperdoll-foot-shadow" aria-hidden="true"></div>
                        <img data-pd-layer="base" id="char-select-base-layer" class="char-layer char-base-layer" src="${blank}" alt="" hidden>
                        <img data-pd-layer="armor" id="char-select-armor-layer" class="char-layer" src="${blank}" alt="" hidden>
                        <img data-pd-layer="weapon" id="char-select-weapon-layer" class="char-layer" src="${blank}" alt="" hidden>
                        <img data-pd-layer="weaponGrip" id="char-select-weapon-grip-layer" class="char-layer char-weapon-grip-layer" src="${blank}" alt="" hidden>
                        <img data-pd-layer="weaponGlow" id="char-select-weapon-glow" class="char-layer" src="${blank}" alt="" hidden>
                        <img data-pd-layer="hands" id="char-select-hands-layer" class="char-layer char-hands-layer" src="${blank}" alt="" hidden>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza a UI de seleção de personagens
     */
    renderCharacterList() {
        const container = document.getElementById('char-list-container');
        if (!container) return;

        const accountEl = document.getElementById('char-select-account');
        if (accountEl) {
            const account = this.currentAccount || '';
            if (account) {
                accountEl.textContent = authT('charSelect.accountLine', { account });
                accountEl.hidden = false;
            } else {
                accountEl.textContent = '';
                accountEl.hidden = true;
            }
        }

        let html = '';
        const delTitle = authT('charSelect.deleteTitle').replace(/"/g, '&quot;');
        const delAction = authT('charSelect.deleteAction');

        this.availableCharacters.forEach((char) => {
            const safeName = String(char.charName || '').replace(/'/g, "\\'");
            const lvlLabel = authT('charSelect.levelTag', { level: char.nivel || 1 });
            const classLabel = String(char.charClass || '').replace(/_/g, ' ');
            const raceLabel = char.charRace || '';
            const genderLabel = char.charGender || '';
            const metaParts = [raceLabel, genderLabel].filter(Boolean).join(' · ');

            html += `
                <article class="char-hero-showcase" data-char-name="${char.charName}">
                    ${this._buildCharSelectPaperdollHtml()}
                    <div class="char-hero-plaque">
                        <h2 class="char-hero-name">${char.charName}</h2>
                        <div class="char-hero-badges">
                            <span class="char-hero-level">${lvlLabel}</span>
                            <span class="char-hero-class">${classLabel}</span>
                        </div>
                        ${metaParts ? `<p class="char-hero-meta">${metaParts}</p>` : ''}
                    </div>
                    <button type="button" class="auth-flow-btn-primary btn-char-enter" onclick="AuthEngine.selectCharacter('${safeName}')">${authT('charSelect.enterWorld')}</button>
                    <div class="btn-char-delete-wrap">
                        <button type="button" class="btn-char-delete-text" onclick="AuthEngine.deleteCharacter('${safeName}')" title="${delTitle}">${delAction}</button>
                    </div>
                </article>
            `;
        });

        if (this.availableCharacters.length === 0) {
            html += `
                <div class="char-hero-empty">
                    <div class="char-hero-pedestal char-hero-pedestal--empty">
                        <div class="char-hero-glow" aria-hidden="true"></div>
                        <div class="char-hero-silhouette" aria-hidden="true">+</div>
                        <div class="char-hero-platform" aria-hidden="true"></div>
                    </div>
                    <h2 class="char-hero-empty-title">${authT('charSelect.emptyTitle')}</h2>
                    <p class="char-hero-empty-hint">${authT('charSelect.emptyHint')}</p>
                    <button type="button" class="auth-flow-btn-primary btn-char-enter" onclick="AuthEngine.startNewCharacter()">${authT('charSelect.createNew')}</button>
                </div>
            `;

            const btnNewHero = document.getElementById('btn-new-hero');
            if (btnNewHero) btnNewHero.style.display = 'none';
        } else {
            const btnNewHero = document.getElementById('btn-new-hero');
            if (btnNewHero) btnNewHero.style.display = 'none';
        }

        container.innerHTML = html;

        if (this.availableCharacters.length > 0) {
            const previewChar = this.availableCharacters[0];
            const paintPaperdoll = () => {
                if (typeof window.atualizarPaperdollCharSelect === 'function') {
                    window.atualizarPaperdollCharSelect(previewChar);
                }
            };
            if (typeof window.requestAnimationFrame === 'function') {
                requestAnimationFrame(paintPaperdoll);
            } else {
                setTimeout(paintPaperdoll, 0);
            }
        }
    },

    getAvatarForClass(className, race, gender) {
        const g = gender === 'Female' ? 'Female' : 'Male';
        const mage =
            typeof window.isClasseMagica === 'function' && className
                ? window.isClasseMagica(className)
                : false;
        if (race === 'Human' && mage)
            return g === 'Female' ? 'assets/chars/mulher.png' : 'assets/chars/mago_m.png';

        // Mapeamento básico de avatares baseado na raça e gênero (usando assets existentes)
        const raceMap = {
            'Human': { 'Male': 'assets/chars/homem.png', 'Female': 'assets/chars/mulher.png' },
            'Dark Elf': { 'Male': 'assets/chars/de_homem.png', 'Female': 'assets/chars/de_mulher.png' },
            'Elf': { 'Male': 'assets/chars/elf_homem.png', 'Female': 'assets/chars/elf_mulher.png' },
            'Orc': { 'Male': 'assets/chars/orc_homem.png', 'Female': 'assets/chars/orc_mulher.png' },
            'Dwarf': { 'Male': 'assets/chars/dwarf_homem.png', 'Female': 'assets/chars/dwarf_mulher.png' }
        };

        try {
            return raceMap[race][g] || 'assets/chars/base_fighter.png';
        } catch(e) {
            return 'assets/chars/base_fighter.png';
        }
    },

    selectCharacter(name) {
        if (this.loading) return;
        this.loading = true;
        this.showLoading(authT('loading.enteringWorld'));

        // Destacar o card (UI)
        document.querySelectorAll('.char-hero-showcase').forEach((card) => {
            const nameElement = card.querySelector('.char-hero-name');
            if (nameElement && nameElement.textContent === name) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Simula um pequeno delay de carregamento para o efeito visual de MMORPG
        setTimeout(async () => {
            let success = false;
            try {
                success = typeof window.carregarJogo === 'function' ? await window.carregarJogo(name) : false;
            } catch (e) {
                console.error('[selectCharacter] carregarJogo', e);
                success = false;
            }

            if (success) {
                window.charName = name;
                window.mudarTela('screen-game');
                
                // Inicializa sistemas que dependem do charName
                if (typeof RankingSeasons !== 'undefined' && RankingSeasons.init) RankingSeasons.init();
                
                const initialDest = (window.tutorialProgress && window.tutorialProgress.active) ? 'inventario' : 'perfil';
                if (typeof irPara === 'function') irPara(initialDest);

                if (typeof escreverLog === 'function') {
                    const safe = String(name).replace(/[<>&]/g, '');
                    escreverLog(`<span style="color:#facc15; font-weight:bold;">${authT('auth.welcomeBack', { name: safe })}</span>`);
                }
                if (typeof atualizar === 'function') atualizar();
                
                // Conexão com Multiplayer
                if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled) {
                    window.SupabaseAPI.updatePresence(name, {});
                    void window.SupabaseAPI.ensureChatConnected(name, {});
                }

                setTimeout(() => {
                    this.loading = false;
                    this.hideLoading();
                }, 500);
            } else {
                this.loading = false;
                this.hideLoading();
                window.l2Alert(authT('auth.loadCharacterFailed'));
            }
        }, 1200);
    },

    async deleteCharacter(name) {
        const safeName = String(name).replace(/[<>&]/g, '');
        const confirmed = await window.l2Confirm(
            authT('auth.deleteConfirm', { name: safeName }),
            authT('auth.deleteCharacterTitle')
        );
        if (!confirmed) return;

        // Remove do localStorage do personagem
        localStorage.removeItem('l2mini_save_' + name.toLowerCase());

        // Remove da lista da conta
        const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
        const userKey = this.currentAccount.toLowerCase();
        if (accounts[userKey]) {
            accounts[userKey].characters = accounts[userKey].characters.filter(c => c !== name);
            localStorage.setItem('l2mini_accounts', JSON.stringify(accounts));
        }

        // Nuvem: apaga o registo (sem isto, o personagem volta na próxima lista)
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.client) {
            try {
                const { data: { user } } = await window.SupabaseAPI.client.auth.getUser();
                if (user) {
                    const { error } = await (window.SupabaseAPI.client
                        .from('characters') as unknown as {
                            delete: () => {
                                eq: (col: string, val: string) => {
                                    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
                                };
                            };
                        })
                        .delete()
                        .eq('char_name', name)
                        .eq('user_id', user.id ?? '');
                    if (error) console.error('[deleteCharacter] Supabase:', error);
                }
            } catch (e) {
                console.error('[deleteCharacter]', e);
            }
        }

        await this.loadCharacterList();
        if (window.mostrarAviso) window.mostrarAviso(authT('auth.characterDeleted'));
    },

    startNewCharacter() {
        // NOVO: Verifica limite de 1 personagem
        if (this.availableCharacters.length >= 1) {
            window.l2Alert(authT('auth.charLimitReached') || "Character limit reached (1 per account).");
            return;
        }

        // Redireciona para a tela de criação
        window.window.mudarTela('screen-criacao');
        
        // Limpa estado global de personagem para nova criação
        window.charName = ""; 
        
        if (window.etapaAtual !== undefined) {
            window.etapaAtual = "RACE";
            window.indexSelecao = 0;
            if (typeof window.atualizarPreview === 'function') window.atualizarPreview();
        }
    },

    /**
     * Vincula um novo personagem à conta atual
     */
    async linkCharacterToAccount(name) {
        if (!this.currentAccount) return;
        
        // 1. Vincula na Nuvem (Supabase)
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.client) {
            try {
                const { data: { user } } = await window.SupabaseAPI.client.auth.getUser();
                if (user) {
                    // Prepara os dados completos para evitar "undefined"
                    const initialData = { 
                        charName: name, 
                        charClass: window.charClass || 'Fighter', 
                        charRace: window.charRace || 'Human',
                        charGender: window.charGender || 'Male',
                        nivel: 1,
                        playerStats: window.playerStats || {},
                        barraAtalhos: ['Attack', null, 'HP Potion', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        tutorial: { v: 1, active: true, step: 0, completed: false, skipped: false }
                    };

                    // Usa UPSERT com onConflict para nunca duplicar o mesmo nome
                    await window.SupabaseAPI.client.from('characters').upsert({ 
                        user_id: user.id, 
                        char_name: name, 
                        char_class: initialData.charClass, 
                        level: 1, 
                        data: initialData,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'char_name' });
                    
                    console.log("☁️ Personagem vinculado e protegido na nuvem.");
                }
            } catch (err) {
                console.error("Erro ao vincular personagem no Supabase:", err);
            }
        }

        // 2. Vincula Local (Legado/Redundância)
        const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
        const userKey = this.currentAccount.toLowerCase();
        if (accounts[userKey]) {
            if (!accounts[userKey].characters) accounts[userKey].characters = [];
            if (!accounts[userKey].characters.includes(name)) {
                accounts[userKey].characters.push(name);
                localStorage.setItem('l2mini_accounts', JSON.stringify(accounts));
            }
        }
    },

    /**
     * Verifica se um nome de personagem já existe no servidor
     */
    async isNameTaken(name) {
        if (!name) return true;
        const nameLower = name.toLowerCase();

        // 1. Checa no Supabase (Autoridade Máxima)
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.client) {
            try {
                const { data, error } = await window.SupabaseAPI.client
                    .from('characters')
                    .select('char_name')
                    .eq('char_name', name)
                    .maybeSingle();
                
                if (data) return true; // Nome já existe na nuvem
            } catch (err) {
                console.error("Erro ao verificar nome na nuvem:", err);
            }
        }

        // 2. Checa Local (Apenas como fallback se não estiver usando nuvem)
        const isCloudActive = typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.getUser();
        if (!isCloudActive) {
            return localStorage.getItem('l2mini_save_' + nameLower) !== null;
        }

        return false;
    },

    /**
     * Valida se o nome contém apenas caracteres permitidos (A-Z, 0-9)
     */
    isValidName(name) {
        const regex = /^[a-zA-Z0-9]+$/;
        return regex.test(name);
    },

    logout() {
        this._passwordRecoveryMode = false;
        if (typeof window.SupabaseAPI !== 'undefined' && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.client) {
            window.SupabaseAPI.client.auth.signOut();
        }
        this.currentAccount = null;
        localStorage.removeItem('l2mini_active_account');
        window.mudarTela('screen-login');
    }
};

window.validarLogin = function() {
    const user = authInputValue('input-username');
    const pass = authInputValue('input-password');
    AuthEngine.login(user, pass);
};

registerGlobal('AuthEngine', AuthEngine as AuthEngineApi);
registerGlobal('validarLogin', window.validarLogin);

function initAuthEngineOnDomReady() {
    AuthEngine.init();

    const btnEn = document.getElementById('i18n-btn-en');
    const btnPt = document.getElementById('i18n-btn-pt');
    if (btnEn) btnEn.onclick = () => window.I18n.setLocale('en');
    if (btnPt) btnPt.onclick = () => window.I18n.setLocale('pt-BR');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthEngineOnDomReady);
} else {
    initAuthEngineOnDomReady();
}

export {};
