/**
 * AUTH_ENGINE.JS - Sistema de Contas e Seleção de Personagens
 * Inspirado em MMORPGs clássicos.
 */

function authT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

const AuthEngine = {
    currentAccount: null,
    availableCharacters: [],
    loading: false, // Trava de segurança contra cliques múltiplos

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
        // Se já houver uma conta logada (persistência de sessão)
        const savedAccount = localStorage.getItem('l2mini_active_account');
        if (savedAccount) {
            this.currentAccount = savedAccount;
        }
    },

    showLoading(text) {
        const overlay = document.getElementById('loading-overlay');
        const status = document.getElementById('loading-status');
        const tip = document.getElementById('loading-tip');
        
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
            
            overlay.style.display = 'flex';
        }
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
            }, 300);
        }
    },

    /**
     * Tenta realizar o login na conta
     */
    async login(username, password) {
        if (this.loading) return; // Trava contra cliques múltiplos

        if (!username || !password) {
            window.l2Alert(authT('auth.loginEmpty'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.authenticating'));

        // Garante que o Supabase está inicializado antes de tentar login
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled) {
            try {
                await SupabaseAPI.init();
                
                let email = username;
                
                // Busca e-mail por username de forma profissional
                if (!username.includes('@')) {
                    const { data: profile } = await SupabaseAPI.client
                        .from('profiles')
                        .select('email')
                        .eq('username', username)
                        .maybeSingle();
                    
                    if (profile) email = profile.email;
                }

                console.log("☁️ Tentando Autenticação...");
                const { data, error } = await SupabaseAPI.client.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    this.loading = false;
                    this.hideLoading();
                    console.error("❌ Erro de Auth:", error.message);
                    if (error.message.includes("Invalid login credentials")) {
                        window.l2Alert(authT('auth.invalidCredentials'));
                    } else if (error.message.includes("Email not confirmed")) {
                        window.l2Alert(authT('auth.emailNotConfirmed'));
                    } else {
                        window.l2Alert(authT('auth.loginError', { message: error.message }));
                    }
                    return;
                }

                if (data.user) {
                    console.log("✅ Autenticado com sucesso!");
                    this.onLoginSuccess(username);
                    this.loading = false;
                    return;
                }
            } catch (err) {
                console.error("Erro crítico de login:", err);
                this.loading = false;
                this.hideLoading();
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
    async register(username, password, confirmPassword, email) {
        if (this.loading) return;

        if (!username || !password || !confirmPassword || !email) {
            window.l2Alert(authT('auth.registerFields'));
            return;
        }

        if (password !== confirmPassword) {
            window.l2Alert(authT('auth.passwordMismatch'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.creatingAccount'));

        // Registro via Supabase
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
            try {
                const { data, error } = await SupabaseAPI.client.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { username: username }
                    }
                });

                if (error) {
                    this.loading = false;
                    this.hideLoading();
                    window.l2Alert(authT('auth.registerError', { message: error.message }));
                    return;
                }

                if (data.user) {
                    console.log("☁️ Conta criada no Auth, criando perfil...");
                    // Cria o perfil na tabela profiles
                    const { error: profileError } = await SupabaseAPI.client.from('profiles').upsert([
                        { id: data.user.id, username: username, email: email, access_level: 0 }
                    ], { onConflict: 'id' });

                    this.loading = false;
                    this.hideLoading();

                    if (profileError) {
                        console.error("Erro ao criar perfil:", profileError.message);
                        window.l2Alert(authT('auth.profileCreateFailed', { message: profileError.message }));
                        return;
                    }
                    
                    window.l2Alert(authT('auth.registerSuccess'), () => {
                        this.showLogin();
                    });
                    return;
                }
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
     * Sistema de recuperação de senha (Simulado)
     */
    async recoverPassword(usernameOrEmail) {
        if (this.loading) return;
        if (!usernameOrEmail) {
            window.l2Alert(authT('auth.recoveryUserEmpty'));
            return;
        }

        this.loading = true;
        this.showLoading(authT('loading.processingRecovery'));
        
        // Simula delay de rede
        setTimeout(async () => {
            this.loading = false;
            this.hideLoading();
            
            const accounts = JSON.parse(localStorage.getItem('l2mini_accounts') || '{}');
            let foundUser = null;

            // Procura por username ou email
            for (let key in accounts) {
                if (key === usernameOrEmail.toLowerCase() || accounts[key].email === usernameOrEmail) {
                    foundUser = key;
                    break;
                }
            }

            if (foundUser) {
                const email = accounts[foundUser].email;
                const hiddenEmail = email.substring(0, 3) + "****" + email.substring(email.indexOf('@'));
                
                const confirmed = await window.l2Confirm(
                    authT('auth.recoveryConfirm', { email: hiddenEmail }),
                    authT('auth.recoveryConfirmTitle')
                );
                if (confirmed) {
                    const newPass = prompt(authT('auth.recoveryPromptPass'));
                    if (newPass && newPass.length >= 6) {
                        accounts[foundUser].password = newPass;
                        localStorage.setItem('l2mini_accounts', JSON.stringify(accounts));
                        window.l2Alert(authT('auth.passwordUpdated'));
                    } else if (newPass) {
                        window.l2Alert(authT('auth.passwordTooShort'));
                    }
                }
            } else {
                window.l2Alert(authT('auth.accountNotFoundRecovery'));
            }
        }, 1500);
    },

    showRegister() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('recover-form').style.display = 'none';
    },

    showLogin() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('recover-form').style.display = 'none';
    },

    showRecover() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('recover-form').style.display = 'block';
    },

    onLoginSuccess(username) {
        this.currentAccount = username;
        localStorage.setItem('l2mini_active_account', username);
        
        // Limpa estado de personagem anterior para evitar bugs de persistência visual
        window.charName = ""; 
        
        this.loadCharacterList().then(() => {
            this.hideLoading();
            mudarTela('screen-char-select');
            
            // Tenta inicializar modo GM se o usuário tiver acesso
            if (window.GMEngine) window.GMEngine.init();
        });
    },

    /**
     * Busca a lista de personagens vinculados à conta
     */
    async loadCharacterList() {
        this.availableCharacters = [];
        const seenNames = new Set(); // Trava de segurança para evitar duplicados na UI

        // 1. Tenta carregar do Supabase primeiro
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
            try {
                const { data: { user } } = await SupabaseAPI.client.auth.getUser();
                if (user) {
                    const { data: chars, error } = await SupabaseAPI.client
                        .from('characters')
                        .select('char_name, data')
                        .eq('user_id', user.id);
                    
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
        const isCloudEnabled = typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled;
        const hasCloudSession = isCloudEnabled && SupabaseAPI.getUser();

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

    /**
     * Renderiza a UI de seleção de personagens
     */
    renderCharacterList() {
        const container = document.getElementById('char-list-container');
        if (!container) return;

        let html = '';
        const delTitle = authT('charSelect.deleteTitle').replace(/"/g, '&quot;');
        
        // Slots ocupados
        this.availableCharacters.forEach((char, index) => {
            const avatarImg = this.getAvatarForClass(char.charClass, char.charRace, char.charGender);
            const lvlLabel = authT('charSelect.levelTag', { level: char.nivel });
            html += `
                <div class="char-card" onclick="AuthEngine.selectCharacter('${char.charName}')">
                    <div class="char-avatar-container">
                        <img src="${avatarImg}" class="char-avatar">
                    </div>
                    <div class="char-info">
                        <div class="char-name-row">
                            <span class="char-name">${char.charName}</span>
                            <span class="char-lvl">${lvlLabel}</span>
                        </div>
                        <div class="char-details-row">
                            <span class="char-class">${char.charClass.replace('_', ' ')}</span>
                            <span class="char-race">${char.charRace}</span>
                        </div>
                    </div>
                    <button class="btn-char-delete" onclick="event.stopPropagation(); AuthEngine.deleteCharacter('${char.charName}')" title="${delTitle}">
                        &times;
                    </button>
                </div>
            `;
        });

        // Slots vazios (até 3)
        const createNew = authT('charSelect.createNew');
        for (let i = this.availableCharacters.length; i < 3; i++) {
            html += `
                <div class="char-empty-slot" onclick="AuthEngine.startNewCharacter()">
                    <div class="plus-icon">+</div>
                    <span>${createNew}</span>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    getAvatarForClass(className, race, gender) {
        // Mapeamento básico de avatares baseado na raça e gênero (usando assets existentes)
        const raceMap = {
            'Human': { 'Male': 'assets/chars/homem.png', 'Female': 'assets/chars/mulher.png' },
            'Dark Elf': { 'Male': 'assets/chars/de_homem.png', 'Female': 'assets/chars/de_mulher.png' },
            'Elf': { 'Male': 'assets/chars/elf_homem.png', 'Female': 'assets/chars/elf_mulher.png' },
            'Orc': { 'Male': 'assets/chars/orc_homem.png', 'Female': 'assets/chars/orc_mulher.png' },
            'Dwarf': { 'Male': 'assets/chars/dwarf_homem.png', 'Female': 'assets/chars/dwarf_mulher.png' }
        };

        try {
            return raceMap[race][gender] || 'assets/chars/base_fighter.png';
        } catch(e) {
            return 'assets/chars/base_fighter.png';
        }
    },

    selectCharacter(name) {
        if (this.loading) return;
        this.loading = true;
        this.showLoading(authT('loading.enteringWorld'));

        // Destacar o card (UI)
        document.querySelectorAll('.char-card').forEach(card => {
            const nameElement = card.querySelector('.char-name');
            if (nameElement && nameElement.innerText === name) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Simula um pequeno delay de carregamento para o efeito visual de MMORPG
        setTimeout(async () => {
            // Carregar o jogo
            const success = typeof window.carregarJogo === 'function' ? await window.carregarJogo(name) : false;
            
            if (success) {
                window.charName = name;
                mudarTela('screen-game');
                
                if (typeof irPara === 'function') irPara('perfil');
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

        // Recarrega e renderiza
        this.loadCharacterList();
        this.renderCharacterList();
        if (window.mostrarAviso) window.mostrarAviso(authT('auth.characterDeleted'));
    },

    startNewCharacter() {
        // Redireciona para a tela de criação
        mudarTela('screen-criacao');
        
        // Limpa estado global de personagem para nova criação
        window.charName = ""; 
        
        if (typeof etapaAtual !== 'undefined') {
            etapaAtual = "RACE";
            indexSelecao = 0;
            if (typeof atualizarPreview === 'function') atualizarPreview();
        }
    },

    /**
     * Vincula um novo personagem à conta atual
     */
    async linkCharacterToAccount(name) {
        if (!this.currentAccount) return;
        
        // 1. Vincula na Nuvem (Supabase)
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
            try {
                const { data: { user } } = await SupabaseAPI.client.auth.getUser();
                if (user) {
                    // Prepara os dados completos para evitar "undefined"
                    const initialData = { 
                        charName: name, 
                        charClass: window.charClass || 'Fighter', 
                        charRace: window.charRace || 'Human',
                        charGender: window.charGender || 'Male',
                        nivel: 1,
                        playerStats: window.playerStats || {}
                    };

                    // Usa UPSERT com onConflict para nunca duplicar o mesmo nome
                    await SupabaseAPI.client.from('characters').upsert({ 
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
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
            try {
                const { data, error } = await SupabaseAPI.client
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
        const isCloudActive = typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.getUser();
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
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
            SupabaseAPI.client.auth.signOut();
        }
        this.currentAccount = null;
        localStorage.removeItem('l2mini_active_account');
        mudarTela('screen-login');
    }
};

window.AuthEngine = AuthEngine;

// Inicializa o motor de auth quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    AuthEngine.init();
    
    // Se quiser auto-login (opcional)
    // if (AuthEngine.currentAccount) AuthEngine.onLoginSuccess(AuthEngine.currentAccount);
});

// Sobrescrever a função original de login para usar o AuthEngine
window.validarLogin = function() {
    const user = document.getElementById('input-username').value;
    const pass = document.getElementById('input-password').value;
    AuthEngine.login(user, pass);
};
