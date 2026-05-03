// ==========================================
// OLYMPIAD ENGINE - SIMULADOR X1
// ==========================================
window.OlympiadEngine = {
    ativo: false,
    multiplayer: false, // Indica se é contra um player real
    lobbyAtivo: false,
    resumoAtivo: false,
    playerConfirmou: false,
    rivalConfirmou: false,
    timerConfirmRival: null,
    inimigo: null,
    loopInimigo: null,
    danoCausado: 0,
    danoRecebido: 0,
    ultimoPremioAdena: 0,
    ultimoPremioCoins: 0,
    ultimaVitoria: false,
    recarregarNaProximaLuta: false,
    multDanoPlayer: 0.28,
    multDanoRival: 0.25,
    multHpRival: 2.10,
    capHitPlayerPct: 0.06,
    capHitRivalPct: 0.05,
    dbRanking: [], 
    
    // --- MULTIPLAYER CORE ---
    reset() {
        this.ativo = false;
        this.multiplayer = false;
        this.lobbyAtivo = false;
        this.resumoAtivo = false;
        this.playerConfirmou = false;
        this.rivalConfirmou = false;
        this.inimigo = null;
        this.danoCausado = 0;
        this.danoRecebido = 0;
        this.pararLoopInimigo();
        if (this.timerConfirmRival) clearTimeout(this.timerConfirmRival);
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (this.challengeInterval) clearInterval(this.challengeInterval);
    },

    handleMultiplayerEvent(evento, dados) {
        // Validação de Segurança: Ignora eventos inválidos
        if (!dados || typeof dados !== 'object') return;
        
        const remetente = dados.nome || dados.sender || dados.attacker;
        
        // SEGURANÇA: Ignora mensagens de si mesmo (evita fantasmas de troca de char na mesma aba)
        // Mas permite se for uma resposta a um desafio (para garantir que o pareamento feche)
        if (remetente === window.charName && evento !== 'oly_challenge_response') return; 

        // Log para debug de eventos recebidos
        console.log(`📡 Evento Multi Oly: ${evento} de ${remetente} (Eu: ${window.charName})`);

        switch(evento) {
            case 'oly_challenge':
                // Alguém está procurando luta
                if (this.lobbyAtivo && !this.inimigo && !this.ativo) {
                    this.aceitarDesafio(dados);
                }
                break;
            case 'oly_challenge_response':
                // Alguém respondeu ao MEU desafio
                if (this.lobbyAtivo && !this.inimigo && !this.ativo && dados.sessionId === this.currentOlySessionId) {
                    console.log("⚔️ Oponente respondeu ao meu desafio:", dados.nome);
                    this.multiplayer = true;
                    this.inimigo = dados;
                    this.inimigo.hp = dados.maxHp;
                    this.inimigo.cp = dados.maxCp;
                    this.inimigo.mp = dados.maxMp;
                    this.setupPaperdolls();
                    this.renderizarUI();
                    this.escreverLog(`<span style="color:#facc15;">[Multiplayer] Oponente conectado: ${this.inimigo.nome}!</span>`);
                    
                    // Se ele respondeu ao meu desafio, eu paro de enviar o desafio
                    if (this.challengeInterval) {
                        clearInterval(this.challengeInterval);
                        this.challengeInterval = null;
                    }
                }
                break;
            case 'oly_confirm':
                if (this.inimigo && remetente === this.inimigo.nome) {
                    this.rivalConfirmou = true;
                    this.atualizarStatusConfirmacao();
                }
                break;
            case 'oly_hit':
                if (this.inimigo && remetente === this.inimigo.nome) {
                    this.receberDanoMultiplayer(dados.damage, dados.isCrit, dados.skillName);
                }
                break;
            case 'oly_skill_effect':
                if (this.inimigo && remetente === this.inimigo.nome) {
                    this.processarEfeitoMultiplayer(dados);
                }
                break;
            case 'oly_sync_hp':
                if (this.inimigo && remetente === this.inimigo.nome) {
                    this.inimigo.hp = dados.hp;
                    this.inimigo.cp = dados.cp;
                    this.renderizarUI();
                }
                break;
            case 'oly_end':
                // Se recebi o sinal de fim e o vencedor sou EU, eu ganhei!
                if (dados.winner === window.charName) {
                    console.log("🏆 Vitória recebida via sinal cloud!");
                    this.finalizar(true);
                } else if (this.inimigo && dados.winner === this.inimigo.nome) {
                    // Se o vencedor é o outro, eu perdi (redundância)
                    this.finalizar(false);
                }
                break;
        }
    },

    processarEfeitoMultiplayer(dados) {
        const { skillName, tipo, poder, icone, cor } = dados;
        
        if (tipo === "cura") {
            this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + Math.floor(this.inimigo.maxHp * poder));
            this.escreverLog(`<span style="color:#10b981;">[${skillName}] ${this.inimigo.nome} healed!</span>`);
        } 
        else if (tipo === "debuff") {
            this.escreverLog(`<span style="color:${cor || '#fca5a5'}; font-weight:bold;">[${skillName}] ${this.inimigo.nome} cursed you!</span>`);
            this.aplicarMeuDebuff(skillName, poder || 0.7);
        }
        else if (tipo.startsWith("buff")) {
            this.escreverLog(`<span style="color:${cor || '#ddd'};">[${skillName}] ${this.inimigo.nome} ativou um buff!</span>`);
        }
        else if (tipo === "stun") {
            this.escreverLog(`<span style="color:#facc15; font-weight:bold;">[${skillName}] ${this.inimigo.nome} te ATORDOOU!</span>`);
            this.aplicarMeuStun(dados.duracao || 3000);
        }

        this.renderizarUI();
    },

    aplicarMeuDebuff(nome, mult) {
        if (!window.meusDebuffsOly) window.meusDebuffsOly = {};
        window.meusDebuffsOly[nome] = true;
        
        // Aplica efeito temporário nos status globais
        const originalPDef = window.playerStats.pDef;
        const originalMDef = window.playerStats.mDef;
        
        if (nome.includes("Hex") || nome.includes("Gloom") || nome.includes("Surrender")) {
            window.playerStats.pDef = Math.floor(window.playerStats.pDef * mult);
            window.playerStats.mDef = Math.floor(window.playerStats.mDef * mult);
        }

        if (typeof window.atualizar === 'function') window.atualizar();

        setTimeout(() => {
            delete window.meusDebuffsOly[nome];
            window.playerStats.pDef = originalPDef;
            window.playerStats.mDef = originalMDef;
            this.escreverLog(`<span style="color:#aaa;">O efeito de ${nome} expirou.</span>`);
            if (typeof window.atualizar === 'function') window.atualizar();
        }, 15000);
    },

    aplicarMeuStun(ms) {
        window.isStunnedOly = true;
        if (window.mostrarAviso) window.mostrarAviso(typeof window.t === 'function' ? window.t('game.olympiad.stunned') : 'STUNNED!');
        
        // Bloqueia comandos (simulado via flag)
        const btnAtaque = document.getElementById('btn-oly-ataque');
        if (btnAtaque) btnAtaque.disabled = true;

        setTimeout(() => {
            window.isStunnedOly = false;
            if (btnAtaque) btnAtaque.disabled = false;
            this.escreverLog(`<span style="color:#aaa;">You recovered from stun.</span>`);
        }, ms);
    },

    atualizarStatusConfirmacao() {
        const statusRival = document.getElementById('oly-status-rival');
        if (statusRival && this.rivalConfirmou) {
            statusRival.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.confirmed') : 'CONFIRMED';
            statusRival.style.color = "#22c55e";
        }
        if (this.playerConfirmou && this.rivalConfirmou) {
            this.escreverLog(`<span style="color:#22c55e;">[Multiplayer] Both players ready! The duel is starting...</span>`);
            setTimeout(() => this.entrarNoDuelo(), 1000);
        }
    },

    aceitarDesafio(dadosOponente) {
        // SEGURANÇA: Se eu já tenho um inimigo ou não estou no lobby, ignoro
        if (!this.lobbyAtivo || this.inimigo || this.ativo) return;
        
        // SEGURANÇA: Não aceitar desafio de si mesmo (mesmo nome)
        if (dadosOponente.nome === window.charName) return;

        // SEGURANÇA: Só aceita se for um player real (evita bots fantasmas)
        if (!dadosOponente.isRealPlayer) return;

        console.log("⚔️ Desafio Recebido de:", dadosOponente.nome, "Session:", dadosOponente.sessionId);
        
        // Se eu aceitei o desafio dele, eu respondo com os meus dados e o MESMO sessionId para fechar o par
        const meusDados = this.gerarMeusDadosParaOponente();
        meusDados.sessionId = dadosOponente.sessionId;
        meusDados.isResponse = true;

        // Agora eu me conecto a ele ANTES de enviar a resposta para garantir que estou pronto para receber o oly_confirm
        this.multiplayer = true;
        this.inimigo = dadosOponente;
        this.inimigo.hp = dadosOponente.maxHp;
        this.inimigo.cp = dadosOponente.maxCp;
        this.inimigo.mp = dadosOponente.maxMp;
        
        this.setupPaperdolls();
        this.renderizarUI();
        this.escreverLog(`<span style="color:#facc15;">[Multiplayer] Oponente encontrado: ${this.inimigo.nome}!</span>`);

        // Agora sim enviamos a resposta
        window.SupabaseAPI.broadcastCombat('oly_challenge_response', meusDados);
    },

    gerarMeusDadosParaOponente() {
        return {
            nome: window.charName,
            classe: window.charClass,
            raca: window.charRace,
            nivel: window.nivel,
            maxHp: window.playerStats.maxHp,
            maxMp: window.playerStats.maxMp,
            maxCp: window.playerStats.maxCp,
            pAtk: window.playerStats.pAtk,
            mAtk: window.playerStats.mAtk,
            pDef: window.playerStats.pDef,
            mDef: window.playerStats.mDef,
            critRate: window.playerStats.critRate,
            atkSpd: window.playerStats.atkSpeed,
            isRealPlayer: true,
            visual: {
                raca: window.charRace,
                isFem: window.charGender === "Female",
                armorId: window.armaduraEquipada ? window.armaduraEquipada.id : null,
                weaponId: window.armaEquipadaBase ? window.armaEquipadaBase.id : null
            }
        };
    },

    receberDanoMultiplayer(dano, isCrit, skillName) {
        // Aplica o multiplicador global de PvP para players reais (0.35 conforme GDD §6)
        // Isso evita que um player dê "one-shot" no outro instantaneamente, permitindo estratégia.
        const danoAjustado = Math.max(1, Math.floor(dano * 0.35));
        
        this.danoRecebido += danoAjustado;
        
        if (window.playerCP > 0) {
            if (window.playerCP >= danoAjustado) window.playerCP -= danoAjustado;
            else {
                let sobra = danoAjustado - window.playerCP;
                window.playerCP = 0;
                window.playerHP -= sobra;
            }
        } else {
            window.playerHP -= danoAjustado;
        }

        if (window.playerHP < 0) window.playerHP = 0;

        const msg = skillName ? `[${skillName}] ${this.inimigo.nome} causou ${danoAjustado}` : `${this.inimigo.nome} causou ${danoAjustado}`;
        this.escreverLog(`<span style="color:#fca5a5;">${msg}${isCrit ? ' (CRITICAL!)' : ''}</span>`);
        
        this.renderizarUI();
        if (typeof atualizar === 'function') atualizar();

        if (window.playerHP <= 0) {
            window.playerHP = 0;
            // Avisa a rede quem é o herói vencedor
            if (window.SupabaseAPI) {
                window.SupabaseAPI.broadcastCombat('oly_end', { winner: this.inimigo.nome });
            }
            this.finalizar(false);
        }
    },

    initRanking() {
        const savedRanking = localStorage.getItem('l2mini_olympiad_ranking');
        if (savedRanking) {
            try {
                this.dbRanking = JSON.parse(savedRanking);
            } catch (e) {
                this.dbRanking = [...dbBotsRanking];
            }
        } else {
            this.dbRanking = [...dbBotsRanking];
        }
        
        // Inicia a rotatividade se não houver um loop ativo
        if (!this.loopMundoAtivo) {
            this.iniciarMundoRanking();
        }
    },

    salvarRanking() {
        localStorage.setItem('l2mini_olympiad_ranking', JSON.stringify(this.dbRanking));
    },

    iniciarMundoRanking() {
        if (this.loopMundoAtivo) clearInterval(this.loopMundoAtivo);
        this.loopMundoAtivo = setInterval(() => {
            this.simularBatalhasMundiais();
        }, 45000); // A cada 45 segundos o mundo gira
    },

    simularBatalhasMundiais() {
        // Simula batalhas aleatórias entre bots para o ranking ser vivo
        for (let i = 0; i < 3; i++) {
            let idx1 = Math.floor(Math.random() * this.dbRanking.length);
            let idx2 = Math.floor(Math.random() * this.dbRanking.length);
            if (idx1 === idx2) continue;

            let bot1 = this.dbRanking[idx1];
            let bot2 = this.dbRanking[idx2];

            // Chance de vitória baseada no MMR
            let chance1 = 0.5 + (bot1.olympiadPoints - bot2.olympiadPoints) / 2000;
            chance1 = Math.max(0.2, Math.min(0.8, chance1));

            if (Math.random() < chance1) {
                bot1.olympiadPoints += 10 + Math.floor(Math.random() * 5);
                bot1.vitorias = (bot1.vitorias || 0) + 1;
                bot2.olympiadPoints -= 8 + Math.floor(Math.random() * 5);
                bot2.derrotas = (bot2.derrotas || 0) + 1;
            } else {
                bot2.olympiadPoints += 10 + Math.floor(Math.random() * 5);
                bot2.vitorias = (bot2.vitorias || 0) + 1;
                bot1.olympiadPoints -= 8 + Math.floor(Math.random() * 5);
                bot1.derrotas = (bot1.derrotas || 0) + 1;
            }
            if (bot1.olympiadPoints < 0) bot1.olympiadPoints = 0;
            if (bot2.olympiadPoints < 0) bot2.olympiadPoints = 0;
        }
        this.salvarRanking();
    },

    salvarProgressoOlympiad() {
        try {
            if (typeof salvarJogo === 'function') salvarJogo();
        } catch (e) {
            console.error("Falha ao salvar progresso da Olympiad:", e);
        }
    },

    iniciarLobby() {
        if (!window.charName) {
            console.error("❌ Erro: Tentativa de iniciar lobby sem nome de personagem.");
            return;
        }
        
        // Limpa estado anterior completamente para evitar "fantasmas"
        this.reset();
        this.lobbyAtivo = true;
        
        console.log(`⚔️ Iniciando Lobby Olympiad para: ${window.charName}`);
        
        this.pararLoopInimigo();
        if (this.timerConfirmRival) clearTimeout(this.timerConfirmRival);

        if (typeof window.autoAtaqueAtivo !== 'undefined') window.autoAtaqueAtivo = false;
        this.prepararTelaLobby();

        // --- BUSCA MULTIPLAYER REAL (SEM BOTS) ---
        this.escreverLog(`<span style="color:#60a5fa; font-weight:bold;">[Multiplayer] Aguardando desafiante real...</span>`);
        
        // Envia sinal de que estou buscando luta para todos
        if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled) {
            // Adicionamos um ID de sessão único para esta busca de luta
            this.currentOlySessionId = 'oly_sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const dadosDesafio = this.gerarMeusDadosParaOponente();
            dadosDesafio.sessionId = this.currentOlySessionId;
            
            // Log para debug
            console.log("📡 Enviando oly_challenge com sessionId:", this.currentOlySessionId);
            
            // Força uma reconexão limpa antes de começar os desafios
            window.SupabaseAPI.ensureChatConnected(window.charName, {}).then(() => {
                window.SupabaseAPI.broadcastCombat('oly_challenge', dadosDesafio);
                
                // Inicia um intervalo de re-broadcast para garantir que novos jogadores vejam o lobby
                this.challengeInterval = setInterval(() => {
                    if (this.lobbyAtivo && !this.inimigo && !this.ativo) {
                        window.SupabaseAPI.broadcastCombat('oly_challenge', dadosDesafio);
                    } else {
                        clearInterval(this.challengeInterval);
                    }
                }, 4000); // Reduzi para 4s para ser mais responsivo
            });
        }

        // CORREÇÃO: Garante que a barra de atalhos apareça e seja renderizada no lobby
        const barra = document.getElementById('barra-de-atalhos-dinamica');
        if (barra) barra.style.display = 'grid';
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    },

    setupPaperdolls() {
        const pBase = document.getElementById('oly-player-base');
        const pArmor = document.getElementById('oly-player-armor');
        const pWeapon = document.getElementById('oly-player-weapon');
        const pGlow = document.getElementById('oly-player-glow');

        if (pBase) {
            let baseSrc = 'assets/chars/base_fighter.png';
            let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
            
            if (charRace === "Human" && !isMage) {
                baseSrc = 'assets/chars/base_fighter.png'; 
            } else {
                let prefixo = "";
                if (charRace === "Dark Elf") prefixo = "de_";
                else if (charRace === "Elf") prefixo = "elf_";
                else if (charRace === "Orc") prefixo = "orc_";
                else if (charRace === "Dwarf") prefixo = "dwarf_";

                let sulfixo = charGender === "Female" ? "mulher" : "homem";
                baseSrc = `assets/chars/${prefixo}${sulfixo}.png`; 
            }
            pBase.src = baseSrc;
        }

        if (pArmor && typeof armaduraEquipada !== 'undefined' && armaduraEquipada && armaduraEquipada.id) {
            pArmor.src = `assets/equips/${armaduraEquipada.id}.png`; 
            pArmor.style.display = 'block';
        } else if (pArmor) {
            pArmor.style.display = 'none';
        }

        if (pWeapon && typeof armaEquipadaBase !== 'undefined' && armaEquipadaBase && armaEquipadaBase.id && armaEquipadaBase.nome !== 'Treining Sword') {
            pWeapon.src = `assets/equips/${armaEquipadaBase.id}.png`; 
            pWeapon.style.display = 'block';
            if (pGlow) {
                pGlow.src = `assets/equips/${armaEquipadaBase.id}.png`; 
                pGlow.style.display = 'block';
                if (typeof enchant !== 'undefined' && enchant >= 4) {
                    let lvl = enchant;
                    let color = '#00008b';
                    if (lvl >= 7 && lvl <= 10)  color = '#ef4444'; 
                    else if (lvl >= 11 && lvl <= 15) color = '#22c55e';
                    else if (lvl >= 16 && lvl <= 19) color = '#eab308';
                    else if (lvl === 20) color = '#f97316';
                    else if (lvl >= 21) color = '#a855f7';
                    pGlow.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 12px ${color}) drop-shadow(0 0 15px ${color}) opacity(0.85) saturate(2) brightness(1.5)`;
                    pGlow.style.animation = 'pulsateWeaponGlow 2s infinite alternate';
                } else {
                    pGlow.style.filter = 'none';
                    pGlow.style.animation = 'none';
                }
            }
        } else {
            if (pWeapon) pWeapon.style.display = 'none';
            if (pGlow) pGlow.style.display = 'none';
        }

        // Rival Paperdoll
        const rBase = document.getElementById('oly-rival-base');
        const rArmor = document.getElementById('oly-rival-armor');
        const rWeapon = document.getElementById('oly-rival-weapon');

        if (rBase && this.inimigo && this.inimigo.visual) {
            const visual = this.inimigo.visual;
            const racaRival = visual.raca;
            const isFem = visual.isFem;

            let baseRivalSrc = 'assets/chars/base_fighter.png';
            if (racaRival === "Human" && !this.inimigo.isMage) {
                baseRivalSrc = 'assets/chars/base_fighter.png'; 
            } else {
                let pR = "";
                if (racaRival === "Dark Elf") pR = "de_";
                else if (racaRival === "Elf") pR = "elf_";
                else if (racaRival === "Orc") pR = "orc_";

                let sR = isFem ? "mulher" : "homem";
                baseRivalSrc = `assets/chars/${pR}${sR}.png`; 
            }
            rBase.src = baseRivalSrc;
        }

        if (rArmor && this.inimigo && this.inimigo.visual && this.inimigo.visual.armorId) {
            rArmor.src = `assets/equips/${this.inimigo.visual.armorId}.png`;
            rArmor.style.display = 'block';
        } else if (rArmor) {
            rArmor.style.display = 'none';
        }

        if (rWeapon && this.inimigo && this.inimigo.visual && this.inimigo.visual.weaponId) {
            rWeapon.src = `assets/equips/${this.inimigo.visual.weaponId}.png`;
            rWeapon.style.display = 'block';
        } else if (rWeapon) {
            rWeapon.style.display = 'none';
        }
    },

    iniciar() {
        this.ativo = true;
        this.lobbyAtivo = false;
        this.renderizarUI();
        const Tol = (typeof window.t === 'function') ? window.t : null;
        const duelMsg = Tol ? Tol('game.olympiad.logDuelStarted', { name: this.inimigo.nome }) : (`[Olympiad] Duel started vs ${this.inimigo.nome}.`);
        this.escreverLog(`<span style="color:#facc15; font-weight:bold;">${duelMsg}</span>`);
        
        // Só inicia o loop de ataque se o inimigo for um Bot
        if (!this.multiplayer) {
            this.iniciarLoopInimigo();
        } else {
            // Em multiplayer, inicia um loop silencioso de sincronização de HP para evitar desync
            this.syncInterval = setInterval(() => {
                if (this.ativo) {
                    window.SupabaseAPI.broadcastCombat('oly_sync_hp', { 
                        sender: window.charName, 
                        hp: window.playerHP, 
                        cp: window.playerCP 
                    });
                } else {
                    clearInterval(this.syncInterval);
                }
            }, 2000);
        }

        // CORREÇÃO: Garante que a barra de atalhos esteja visível e renderizada ao iniciar o duelo
        const barra = document.getElementById('barra-de-atalhos-dinamica');
        if (barra) barra.style.display = 'grid';
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    },

    prepararTelaLobby() {
        const lobby = document.getElementById('olympiad-lobby');
        const resultado = document.getElementById('olympiad-resultado');
        const statusPlayer = document.getElementById('oly-status-player');
        const statusRival = document.getElementById('oly-status-rival');
        const msg = document.getElementById('oly-lobby-msg');
        const btn = document.getElementById('btn-oly-confirmar');

        if (lobby) lobby.style.display = 'flex';
        if (resultado) resultado.style.display = 'none';
        if (statusPlayer) {
            statusPlayer.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.waiting') : 'WAITING';
            statusPlayer.style.color = "#f59e0b";
        }
        if (statusRival) {
            statusRival.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.waiting') : 'WAITING';
            statusRival.style.color = "#f59e0b";
        }
        if (msg) msg.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.lobbyHintConfirm') : 'Click Confirm and wait for your opponent.';
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.confirmBtn') : 'CONFIRM';
        }
    },

    confirmarPlayer() {
        if (!this.lobbyAtivo || this.playerConfirmou) return;
        this.playerConfirmou = true;

        const statusPlayer = document.getElementById('oly-status-player');
        const msg = document.getElementById('oly-lobby-msg');
        const btn = document.getElementById('btn-oly-confirmar');

        if (statusPlayer) {
            statusPlayer.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.confirmed') : 'CONFIRMED';
            statusPlayer.style.color = "#22c55e";
        }
        if (msg) msg.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.lobbyWaitOpponent') : 'Waiting for opponent confirmation...';
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.confirmed') : 'CONFIRMED';
        }

        if (this.multiplayer) {
            // MULTIPLAYER: Comunica confirmação via Supabase
            if (window.SupabaseAPI) {
                window.SupabaseAPI.broadcastCombat('oly_confirm', { sender: window.charName });
                this.atualizarStatusConfirmacao();
            }
        } else {
            // SEGURANÇA: Em modo online, não permitimos confirmação de bots
            if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.getUser()) {
                console.log("ℹ️ Modo Online: Aguardando confirmação de jogador real...");
                return;
            }

            // BOT (Apenas offline): Simula confirmação aleatória
            const atraso = 1200 + Math.floor(Math.random() * 2500);
            if (this.isRevanche && Math.random() < 0.3) {
                this.timerConfirmRival = setTimeout(() => this.recusarRevanche(), atraso);
            } else {
                this.timerConfirmRival = setTimeout(() => this.confirmarRival(), atraso);
            }
        }
    },

    recusarRevanche() {
        if (!this.lobbyAtivo) return;
        const statusRival = document.getElementById('oly-status-rival');
        const msg = document.getElementById('oly-lobby-msg');
        if (statusRival) {
            statusRival.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.declined') : 'DECLINED';
            statusRival.style.color = "#ef4444";
        }
        if (msg) msg.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.lobbyRematchDeclined') : 'Your opponent declined the rematch. Finding a new fighter...';

        const Tol = (typeof window.t === 'function') ? window.t : null;
        const declineMsg = Tol ? Tol('game.olympiad.logDeclinedRematch', { name: this.inimigo.nome }) : (`[Olympiad] ${this.inimigo.nome} declined the rematch and left!`);
        this.escreverLog(`<span style="color:#ef4444;">${declineMsg}</span>`);
        
        // Limpa o inimigo da revanche e procura um novo após um pequeno delay
        this.inimigoRevanche = null;
        setTimeout(() => {
            this.iniciarLobby();
        }, 2500);
    },

    confirmarRival() {
        if (!this.lobbyAtivo) return;
        
        // SEGURANÇA: Em modo online, NUNCA confirmar rival se ele não for um player real
        if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.getUser()) {
            if (!this.inimigo || !this.inimigo.isRealPlayer) {
                console.warn("⚠️ Tentativa de confirmar rival inválido em modo online. Abortando.");
                return;
            }
        }

        this.rivalConfirmou = true;
        const statusRival = document.getElementById('oly-status-rival');
        const msg = document.getElementById('oly-lobby-msg');
        if (statusRival) {
            statusRival.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.confirmed') : 'CONFIRMED';
            statusRival.style.color = "#22c55e";
        }
        if (msg) msg.innerText = (typeof window.t === 'function') ? window.t('game.olympiadUi.lobbyBothReady') : 'Both confirmed. Starting duel...';

        const Tol = (typeof window.t === 'function') ? window.t : null;
        const readyMsg = Tol ? Tol('game.olympiad.logBothReady') : '[Olympiad] Both duelists are ready.';
        this.escreverLog(`<span style="color:#22c55e;">${readyMsg}</span>`);
        setTimeout(() => this.entrarNoDuelo(), 900);
    },

    entrarNoDuelo() {
        if (!this.lobbyAtivo) return;
        this.lobbyAtivo = false;
        const lobby = document.getElementById('olympiad-lobby');
        if (lobby) lobby.style.display = 'none';

        // Regra anti-trapaça:
        // só recupera HP/MP quando a revanche for confirmada e o duelo realmente começar.
        if (this.recarregarNaProximaLuta) {
            playerHP = playerStats.maxHp;
            playerMP = playerStats.maxMp;
            playerCP = playerStats.maxCp; // Restaura CP na revanche
            this.recarregarNaProximaLuta = false;
            if (typeof atualizar === 'function') atualizar();
            const Tol = (typeof window.t === 'function') ? window.t : null;
            const remMsg = Tol ? Tol('game.olympiad.logRematchStarted') : '[Olympiad] Rematch started—HP/MP/CP restored.';
            this.escreverLog(`<span style="color:#22c55e;">${remMsg}</span>`);
        }

        this.iniciar();
    },

    obterSkillsBot(classeBot, nivelBot) {
        let skillsDoBot = [];
        let linhagem = (typeof linhagemClasses !== 'undefined') ? linhagemClasses[classeBot] : null;
        if (!linhagem) return [];
        
        linhagem.forEach(cls => {
            if (typeof arvoreDeSkills !== 'undefined' && arvoreDeSkills[cls]) {
                arvoreDeSkills[cls].forEach(habilidade => {
                    if (nivelBot >= habilidade.lvl) {
                        let dadosSkill = (typeof bancoDeSkills !== 'undefined') ? bancoDeSkills[habilidade.nome] : null;
                        if (dadosSkill && habilidade.nome !== "Attack") {
                            skillsDoBot.push({ idNome: habilidade.nome, ...dadosSkill });
                        }
                    }
                });
            }
        });
        return skillsDoBot;
    },

    gerarBotCompleto(botData) {
        // Se o bot já tem propriedades visuais fixas, usa elas (para revanche ser idêntica)
        let visualRival = botData.visual || {
            raca: null,
            isFem: Math.random() > 0.5,
            armorId: null,
            weaponId: null
        };

        let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(botData.classe) : false;
        let nivelBot = botData.nivel || 1;
        let mmr = botData.olympiadPoints || 0;

        // 1. Descobrir a Raça
        let racaBot = visualRival.raca;
        if (!racaBot) {
            if (typeof linhagemClasses !== 'undefined' && linhagemClasses[botData.classe]) {
                let baseClass = linhagemClasses[botData.classe][0];
                if (baseClass.includes("Dark")) racaBot = "Dark Elf";
                else if (baseClass.includes("Elf")) racaBot = "Elf";
                else if (baseClass.includes("Orc")) racaBot = "Orc";
                else if (baseClass.includes("Dwarf")) racaBot = "Dwarf";
                else racaBot = "Human";
            } else {
                racaBot = "Human";
            }
        }
        visualRival.raca = racaBot;

        // 2. Status Base da Raça e Modificadores
        let base = typeof statusIniciais !== 'undefined' ? statusIniciais[racaBot] : { hpFighter: 100, mpFighter: 50, hpMage: 80, mpMage: 100, danoFighter: 10, danoMage: 10, atkSpeedFighter: 500, atkSpeedMage: 600, critico: 5 };
        let mod = (typeof classModifiers !== 'undefined' && classModifiers[botData.classe]) ? classModifiers[botData.classe] : { hp: 1.0, mp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 0 };

    // [PRO ENGINE] Ajuste de Curva de Nível: O bot não pode ganhar mais status por level que o jogador
        // Player ganha: P.Atk +3, MAtk +4, P.Def +3.5, MDef +3.0 por level (conforme core_stats.js)
        const bonusAtkLvl = (nivelBot - 1) * 3;
        const bonusMAtkLvl = (nivelBot - 1) * 4;
        const bonusDefLvl = (nivelBot - 1) * 3.5;
        const bonusMDefLvl = (nivelBot - 1) * 3.0;

        // 3. Escolher Equipamentos baseados no Nível
        let gradeBot = 'NO-GRADE';
        if (nivelBot >= 76) gradeBot = 'S';
        else if (nivelBot >= 61) gradeBot = 'A';
        else if (nivelBot >= 52) gradeBot = 'B';
        else if (nivelBot >= 40) gradeBot = 'C';
        else if (nivelBot >= 20) gradeBot = 'D';

        let armaBot = null;
        let armaduraBot = null;
        let joiasBot = [];

        if (typeof catalogoArmas !== 'undefined' && !visualRival.weaponId) {
            let armasValidas = catalogoArmas.filter(a => a.grade === gradeBot && (isMage ? a.tipo === 'Magic Sword' || a.tipo === 'Mace' : a.tipo !== 'Magic Sword'));
            // Se for S-Grade, tenta pegar uma arma Vesper (Elite) para bots de alto nível
            if (gradeBot === 'S' && nivelBot >= 77) {
                let vesper = armasValidas.filter(a => a.nome.includes('Vesper'));
                if (vesper.length > 0) armasValidas = vesper;
            }
            if (armasValidas.length > 0) {
                armaBot = armasValidas[Math.floor(Math.random() * armasValidas.length)];
                visualRival.weaponId = armaBot.id;
            }
        } else if (visualRival.weaponId) {
            armaBot = catalogoArmas.find(a => a.id === visualRival.weaponId) || null;
        }

        if (typeof catalogoArmaduras !== 'undefined' && !visualRival.armorId) {
            let tipoArmadura = isMage ? 'Robe' : (Math.random() > 0.5 ? 'Heavy' : 'Light');
            if (botData.classe.includes("Knight") || botData.classe.includes("Paladin") || botData.classe.includes("Avenger")) tipoArmadura = 'Heavy';
            if (botData.classe.includes("Rogue") || botData.classe.includes("Ranger") || botData.classe.includes("Assassin")) tipoArmadura = 'Light';
            
            let armadurasValidas = catalogoArmaduras.filter(a => a.grade === gradeBot && a.tipo === tipoArmadura);
            // Se for S-Grade, tenta pegar uma armadura Vesper (Elite)
            if (gradeBot === 'S' && nivelBot >= 77) {
                let vesper = armadurasValidas.filter(a => a.nome.includes('Vesper'));
                if (vesper.length > 0) armadurasValidas = vesper;
            }
            if (armadurasValidas.length > 0) {
                armaduraBot = armadurasValidas[Math.floor(Math.random() * armadurasValidas.length)];
                visualRival.armorId = armaduraBot.id;
            }
        } else if (visualRival.armorId) {
            armaduraBot = catalogoArmaduras.find(a => a.id === visualRival.armorId) || null;
        }

        if (typeof catalogoJoias !== 'undefined') {
            let joiasGrade = catalogoJoias.filter(j => j.grade === gradeBot && !j.id.includes('epic'));
            let neck = joiasGrade.find(j => j.tipoItem === 'neck');
            let ear = joiasGrade.find(j => j.tipoItem === 'ear');
            let ring = joiasGrade.find(j => j.tipoItem === 'ring');
            if (neck) joiasBot.push(neck);
            if (ear) { joiasBot.push(ear); joiasBot.push(ear); } // 2 brincos
            if (ring) { joiasBot.push(ring); joiasBot.push(ring); } // 2 anéis
        }

        // 4. Calcular Encantamentos Baseados no MMR
        let enchantBot = Math.floor(mmr / 200); // Ex: 1000 MMR = +5
        enchantBot = Math.max(0, Math.min(25, enchantBot)); // Cap de +25

        // 5. Aplicar Matemática de Status
        let multEnchant = 1 + (enchantBot * 0.10);

        let armaduraBonusHp = armaduraBot ? Math.floor((armaduraBot.bonusHp || 0) * multEnchant) : 0;
        let armaduraBonusMp = armaduraBot ? Math.floor((armaduraBot.bonusMp || 0) * multEnchant) : 0;
        let armaduraBonusSpd = armaduraBot ? Math.floor((armaduraBot.bonusSpd || 0) * multEnchant) : 0;
        let armaduraBonusCrit = armaduraBot ? Math.floor((armaduraBot.bonusCrit || 0) * multEnchant) : 0;
        let armaduraBonusMDef = armaduraBot ? Math.floor((armaduraBot.bonusMDef || 0) * multEnchant) : 0;
        let atkArmadura = armaduraBot ? Math.floor((armaduraBot.pAtk || 0) * multEnchant) : 0;
        let matkArmadura = armaduraBot ? Math.floor((armaduraBot.mAtk || 0) * multEnchant) : 0;
        let defArmaduraTotal = armaduraBot ? Math.floor((armaduraBot.pDef || armaduraBot.def || 0) * multEnchant) : 0;

        let armaBonusHp = armaBot ? (armaBot.bonusHp || 0) : 0;
        let armaBonusMp = armaBot ? (armaBot.bonusMp || 0) : 0;
        let armaBonusSpd = armaBot ? (armaBot.bonusSpd || 0) : 0;
        let armaBonusCrit = armaBot ? (armaBot.bonusCrit || 0) : 0;

        let joiasMDef = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.mDef || 0) * multEnchant), 0));
        let joiasBonusHp = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.bonusHp || 0) * multEnchant), 0));
        let joiasBonusMp = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.bonusMp || 0) * multEnchant), 0));
        let joiasBonusCrit = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.bonusCrit || 0) * multEnchant), 0));
        let joiasBonusSpd = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.bonusSpd || 0) * multEnchant), 0));
        let joiasPAtk = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.pAtk || 0) * multEnchant), 0));
        let joiasMAtk = Math.floor(joiasBot.reduce((soma, j) => soma + ((j.mAtk || 0) * multEnchant), 0));

        let baseHp = isMage ? base.hpMage : base.hpFighter;
        let baseMp = isMage ? base.mpMage : base.mpFighter;

        let hpMax = Math.floor((baseHp + ((nivelBot - 1) * 20)) * mod.hp) + armaduraBonusHp + armaBonusHp + joiasBonusHp;
        let mpMax = Math.floor((baseMp + ((nivelBot - 1) * 5)) * mod.mp) + armaduraBonusMp + armaBonusMp + joiasBonusMp;

        let atkFisicoBase = isMage ? (base.danoFighter / 2) : base.danoFighter;
        let atkArma = armaBot ? armaBot.atk : 5;
        let bonusEnchantWpnPAtk = Math.floor(atkArma * 0.10 * enchantBot);
        let pAtk = Math.floor((atkFisicoBase + atkArma + bonusEnchantWpnPAtk + bonusAtkLvl) * mod.atk) + atkArmadura + joiasPAtk;

        let atkMagicoBase = isMage ? base.danoMage : (base.danoMage / 2);
        let matkArma = armaBot && armaBot.matk ? armaBot.matk : 5;
        let bonusEnchantWpnMAtk = Math.floor(matkArma * 0.10 * enchantBot);
        let mAtk = Math.floor((atkMagicoBase + matkArma + bonusEnchantWpnMAtk + bonusMAtkLvl) * mod.atk) + matkArmadura + joiasMAtk;

        let pDef = Math.floor((25 + defArmaduraTotal + bonusDefLvl + 20) * mod.def);
        let mDef = Math.floor((15 + joiasMDef + bonusMDefLvl + armaduraBonusMDef) * mod.def);

        let critRate = Math.floor(base.critico + mod.crit + armaduraBonusCrit + armaBonusCrit + joiasBonusCrit);

        // CP do Bot: Mesma lógica do Player (Guerreiro 60%, Mago 40%)
        let cpMax = Math.floor(hpMax * (isMage ? 0.4 : 0.6));
        
        let spdBase = isMage ? base.atkSpeedMage : base.atkSpeedFighter;
        // Ajuste Profissional: atkSpd em milissegundos. Quanto menor, mais rápido.
        // O jogador ganha redução de delay por nível. Bot deve seguir o mesmo.
        let spdTotal = (spdBase - ((nivelBot - 1) * 2)) * mod.spd;
        spdTotal -= armaduraBonusSpd;
        spdTotal -= armaBonusSpd;
        spdTotal -= joiasBonusSpd;
        let atkSpd = Math.max(300, Math.floor(spdTotal)); // Cap mínimo de 300ms

        let skillsDisponiveis = this.obterSkillsBot(botData.classe, nivelBot);

        return {
            nome: botData.nome || botData.farmBot1 || "Bot",
            classe: botData.classe,
            raca: racaBot,
            isMage: isMage,
            nivel: nivelBot,
            olympiadPoints: mmr,
            hp: hpMax,
            maxHp: Math.max(1, hpMax),
            cp: cpMax,
            maxCp: Math.max(1, cpMax),
            mp: mpMax,
            maxMp: Math.max(1, mpMax),
            pAtk: Math.max(1, pAtk),
            mAtk: Math.max(1, mAtk),
            pDef: Math.max(1, pDef),
            mDef: Math.max(1, mDef),
            critRate: critRate,
            atkSpd: atkSpd,
            skills: skillsDisponiveis,
            cooldowns: {},
            visual: visualRival,
            equipamentos: {
                arma: armaBot,
                armadura: armaduraBot,
                joias: joiasBot,
                enchant: enchantBot
            }
        };
    },

    criarOponente() {
        // SEGURANÇA: Se estiver online, NÃO criar bots automaticamente
        if (window.SupabaseAPI && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI.getUser()) {
            console.log("ℹ️ Modo Online: Aguardando jogadores reais. Bots desativados.");
            return null;
        }

        // Garante que o ranking esteja inicializado
        if (this.dbRanking.length === 0) this.initRanking();

        // Encontrar bots próximos em MMR (margem de +/- 400 pontos para variar o desafio)
        let oponentesProximos = this.dbRanking.filter(b => Math.abs(b.olympiadPoints - olympiadPoints) <= 400);
        
        if (oponentesProximos.length === 0) {
            // Se não achar, pega os 3 mais próximos absolutos
            let botsOrdenados = [...this.dbRanking].sort((a, b) => Math.abs(a.olympiadPoints - olympiadPoints) - Math.abs(b.olympiadPoints - olympiadPoints));
            oponentesProximos = botsOrdenados.slice(0, 3);
        }
        
        let botEscolhido = oponentesProximos[Math.floor(Math.random() * oponentesProximos.length)];
        
        // Clona o bot para o combate
        let clone = this.gerarBotCompleto(botEscolhido);
        return clone;
    },

    iniciarLoopInimigo() {
        this.pararLoopInimigo();
        this.loopInimigo = setInterval(() => {
            if (!this.ativo || !this.inimigo || playerHP <= 0 || this.inimigo.hp <= 0) return;
            this.inimigoAtaca();
        }, this.inimigo.atkSpd);
    },

    pararLoopInimigo() {
        if (this.loopInimigo) {
            clearInterval(this.loopInimigo);
            this.loopInimigo = null;
        }
    },

    inimigoAtaca() {
        const agora = Date.now();
        let skillUsada = null;

        if (this.inimigo.skills && this.inimigo.skills.length > 0) {
            // Tenta usar uma skill (60% de chance)
            if (Math.random() < 0.60) {
                // Filtra skills que não estão em cooldown
                let skillsProntas = this.inimigo.skills.filter(s => !this.inimigo.cooldowns[s.idNome] || this.inimigo.cooldowns[s.idNome] <= agora);
                
                if (skillsProntas.length > 0) {
                    // Se HP < 50%, prioriza cura se tiver
                    let skillsDeCura = skillsProntas.filter(s => s.tipo && s.tipo === "cura");
                    if (this.inimigo.hp < this.inimigo.maxHp * 0.5 && skillsDeCura.length > 0) {
                        skillUsada = skillsDeCura[Math.floor(Math.random() * skillsDeCura.length)];
                    } else {
                        skillUsada = skillsProntas[Math.floor(Math.random() * skillsProntas.length)];
                    }
                }
            }
        }

        if (skillUsada) {
            this.inimigoUsaSkill(skillUsada, agora);
        } else {
            const usaMagia = this.inimigo.isMage;
            const atkBase = usaMagia ? this.inimigo.mAtk : this.inimigo.pAtk;
            const defAlvo = usaMagia ? playerStats.mDef : playerStats.pDef;
            
            // 1. FÓRMULA REAL E CRUEL
            let dano = (atkBase * 1100) / (350 + defAlvo);
            
            // 2. DIFERENÇA DE NÍVEL (Inimigo atacando Player)
            const diffLvl = this.inimigo.nivel - nivel;
            if (diffLvl > 0) {
                dano *= (1 + (diffLvl * 0.05));
            } else if (diffLvl < 0) {
                dano *= Math.max(0.05, (1 + (diffLvl * 0.10)));
            }

            // 3. REMOÇÃO DE CAPS
            dano = Math.max(1, Math.floor(dano * (0.90 + Math.random() * 0.25)));
            dano = Math.floor(dano * 0.75); // Bots batem ligeiramente menos que players reais

            this.danoRecebido += dano;
            
            // LÓGICA DE CP EM PVP (OLYMPIAD)
            if (playerCP > 0) {
                if (playerCP >= dano) {
                    playerCP -= dano;
                } else {
                    let sobra = dano - playerCP;
                    playerCP = 0;
                    playerHP -= sobra;
                }
            } else {
                playerHP -= dano;
            }

            if (playerHP < 0) playerHP = 0;

            this.escreverLog(`<span style="color:#fca5a5;">${this.inimigo.nome} causou ${dano} de dano.</span>`);
            this.renderizarUI();
            if (typeof atualizar === 'function') atualizar();

            if (playerHP <= 0) this.finalizar(false);
        }
    },

    inimigoUsaSkill(skill, agora) {
        // Coloca em cooldown
        this.inimigo.cooldowns[skill.idNome] = agora + skill.cd;

        const usaMagia = this.inimigo.isMage;
        const tipo = skill.tipo || "ataque";
        
        if (tipo === "cura") {
            const cura = Math.floor(this.inimigo.maxHp * (skill.poder || 0.3));
            this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + Math.max(1, cura));
            this.escreverLog(`<span style="color:#10b981;">[${skill.idNome}] ${this.inimigo.nome} healed +${Math.max(1, cura)} HP.</span>`);
            this.renderizarUI();
            if (typeof atualizar === 'function') atualizar();
            return;
        }

        if (tipo === "cura_mp") {
            this.escreverLog(`<span style="color:#60a5fa;">[${skill.idNome}] ${this.inimigo.nome} restaurou energia.</span>`);
            return;
        }

        if (tipo === "buff_atk" || tipo === "buff_def" || tipo === "buff_spd") {
            this.escreverLog(`<span style="color:${skill.cor || '#ddd'};">[${skill.idNome}] ${this.inimigo.nome} usou um buff!</span>`);
            if (tipo === "buff_atk") {
                this.inimigo.pAtk = Math.floor(this.inimigo.pAtk * (skill.poder || 1.2));
                this.inimigo.mAtk = Math.floor(this.inimigo.mAtk * (skill.poder || 1.2));
            } else if (tipo === "buff_def") {
                this.inimigo.pDef = Math.floor(this.inimigo.pDef * (skill.poder || 1.2));
                this.inimigo.mDef = Math.floor(this.inimigo.mDef * (skill.poder || 1.2));
            } else if (tipo === "buff_spd") {
                this.inimigo.atkSpd = Math.max(400, Math.floor(this.inimigo.atkSpd / (skill.poder || 1.2)));
                this.iniciarLoopInimigo(); 
            }
            return;
        }
        
        if (tipo === "utilidade" || tipo === "pet" || tipo === "debuff_spoil") {
            this.escreverLog(`<span style="color:${skill.cor || '#ddd'};">[${skill.idNome}] ${this.inimigo.nome} ativou uma habilidade especial!</span>`);
            return;
        }

        // Ataque ou Debuff
        const atkBase = usaMagia ? this.inimigo.mAtk : this.inimigo.pAtk;
        const defAlvo = usaMagia ? playerStats.mDef : playerStats.pDef;
        const poder = skill.poder || 1.4;
        
        // 1. FÓRMULA REAL E CRUEL
        let dano = ((atkBase * poder) * 1100) / (350 + defAlvo);
        
        // 2. DIFERENÇA DE NÍVEL
        const diffLvl = this.inimigo.nivel - nivel;
        if (diffLvl > 0) {
            dano *= (1 + (diffLvl * 0.05));
        } else if (diffLvl < 0) {
            dano *= Math.max(0.05, (1 + (diffLvl * 0.10)));
        }

        // 3. REMOÇÃO DE CAPS
        dano = Math.max(1, Math.floor(dano * 0.70)); 

        if (tipo === "debuff") {
            dano = Math.floor(dano * 0.3); // Debuffs dão menos dano direto
            this.escreverLog(`<span style="color:${skill.cor || '#fca5a5'};">[${skill.idNome}] ${this.inimigo.nome} weakened you and dealt ${dano} damage!</span>`);
        } else {
            this.escreverLog(`<span style="color:${skill.cor || '#fca5a5'}; font-weight:bold;">[${skill.idNome}] ${this.inimigo.nome} causou ${dano} de dano!</span>`);
        }

        this.danoRecebido += dano;
        
        // LÓGICA DE CP EM PVP (OLYMPIAD SKILL)
        if (playerCP > 0) {
            if (playerCP >= dano) {
                playerCP -= dano;
            } else {
                let sobra = dano - playerCP;
                playerCP = 0;
                playerHP -= sobra;
            }
        } else {
            playerHP -= dano;
        }

        if (playerHP < 0) playerHP = 0;

        if (tipo === "ataque_cura" || tipo === "ataque_dreno") {
            const cura = Math.floor(dano * (tipo === "ataque_dreno" ? 0.5 : 0.35));
            this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + Math.max(1, cura));
            this.escreverLog(`<span style="color:#10b981;">[Drain] ${this.inimigo.nome} healed +${Math.max(1, cura)} HP.</span>`);
        }

        this.renderizarUI();
        if (typeof atualizar === 'function') atualizar();

        if (playerHP <= 0) this.finalizar(false);
    },

    playerAtaca() {
        if (!this.ativo || !this.inimigo || playerHP <= 0) return;

        const agora = Date.now();
        if (typeof cooldownsAtivos !== 'undefined' && cooldownsAtivos['Attack'] && cooldownsAtivos['Attack'] > agora) return;

        const isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
        const atkUsado = isMage ? playerStats.mAtk : playerStats.pAtk;
        const defAlvo = isMage ? this.inimigo.mDef : this.inimigo.pDef;
        
        // 1. FÓRMULA REAL E CRUEL (Padrão 1100 / 350)
        let dano = (atkUsado * 1100) / (350 + defAlvo);
        
        // 2. DIFERENÇA DE NÍVEL (Bônus para o mais forte, Penalidade para o mais fraco)
        const diffLvl = nivel - this.inimigo.nivel;
        if (diffLvl > 0) {
            // Bônus de 5% por nível de diferença
            dano *= (1 + (diffLvl * 0.05));
        } else if (diffLvl < 0) {
            // Penalidade severa: -10% por nível de diferença (mínimo 5% do dano original)
            dano *= Math.max(0.05, (1 + (diffLvl * 0.10)));
        }

        // 3. REMOÇÃO DE CAPS (Sem limites artificiais baseados no HP do alvo)
        dano = Math.max(1, Math.floor(dano * (0.90 + Math.random() * 0.20)));
        
        // Multiplicador global de PvP (Aumentado para ser mais "cruel")
        dano = Math.floor(dano * 0.80); 

        if (!isMage && Math.random() * 100 < playerStats.critRate) {
            dano = Math.floor(dano * (motorBuffsEspeciais?.critMult || 2.0));
            this.escreverLog(`<span style="color:#ef4444; font-weight:bold;">CRITICAL HIT! ${dano}</span>`);
        } else {
            this.escreverLog(`You dealt <span style="color:#fff;">${dano}</span> damage.`);
        }

        this.danoCausado += dano;

        if (this.multiplayer) {
            // MULTIPLAYER: Envia o dano para o oponente
            window.SupabaseAPI.broadcastCombat('oly_hit', { 
                attacker: window.charName, 
                damage: dano, 
                isCrit: true,
                target: this.inimigo.nome 
            });
        } else {
            this.receberDano(dano);
        }

        if (typeof dispararAnimacaoGCD === 'function') dispararAnimacaoGCD(playerStats.atkSpeed, 'Attack');
    },

    playerUsaSkill(nomeSkill) {
        if (!this.ativo || !this.inimigo || window.playerHP <= 0 || window.isStunnedOly) return;
        const skill = (typeof bancoDeSkills !== 'undefined') ? bancoDeSkills[nomeSkill] : null;
        if (!skill) return;

        const agora = Date.now();
        if (typeof cooldownsAtivos !== 'undefined' && cooldownsAtivos[nomeSkill] && cooldownsAtivos[nomeSkill] > agora) return;
        if (window.playerMP < skill.mp) {
            this.escreverLog(`<span style="color:#3b82f6;">Not enough MP for ${nomeSkill}.</span>`);
            return;
        }

        window.playerMP -= skill.mp;
        if (typeof dispararAnimacaoCooldown === 'function') dispararAnimacaoCooldown(nomeSkill, skill.cd);
        if (typeof atualizar === 'function') atualizar();

        const isMagico = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(window.charClass) : false;
        const tipo = skill.tipo || "ataque";

        // --- LÓGICA DE CURA E BUFFS (AFETA VOCÊ) ---
        if (tipo === "cura") {
            const cura = Math.floor(window.playerStats.maxHp * (skill.poder || 0.3));
            window.playerHP = Math.min(window.playerStats.maxHp, window.playerHP + Math.max(1, cura));
            this.escreverLog(`<span style="color:#10b981;">${nomeSkill}: +${Math.max(1, cura)} HP.</span>`);
            if (this.multiplayer) {
                window.SupabaseAPI.broadcastCombat('oly_skill_effect', { 
                    sender: window.charName, skillName: nomeSkill, tipo: "cura", poder: skill.poder || 0.3 
                });
            }
            this.renderizarUI();
            if (typeof atualizar === 'function') atualizar();
            return;
        }

        if (tipo === "cura_mp") {
            const curaMp = Math.floor(window.playerStats.maxMp * (skill.poder || 0.3));
            window.playerMP = Math.min(window.playerStats.maxMp, window.playerMP + Math.max(1, curaMp));
            this.escreverLog(`<span style="color:#60a5fa;">${nomeSkill}: +${Math.max(1, curaMp)} MP.</span>`);
            this.renderizarUI();
            if (typeof atualizar === 'function') atualizar();
            return;
        }

        if (tipo.startsWith("buff")) {
            this.escreverLog(`<span style="color:${skill.cor || '#ddd'};">${nomeSkill} ativada!</span>`);
            // Aplica efeito local temporário
            const statKey = tipo === "buff_atk" ? "pAtk" : (tipo === "buff_def" ? "pDef" : "atkSpeed");
            const originalVal = window.playerStats[statKey];
            window.playerStats[statKey] = Math.floor(window.playerStats[statKey] * (skill.poder || 1.2));
            
            if (this.multiplayer) {
                window.SupabaseAPI.broadcastCombat('oly_skill_effect', { 
                    sender: window.charName, skillName: nomeSkill, tipo: tipo, cor: skill.cor 
                });
            }

            setTimeout(() => {
                window.playerStats[statKey] = originalVal;
                this.escreverLog(`<span style="color:#aaa;">O efeito de ${nomeSkill} acabou.</span>`);
                if (typeof window.atualizar === 'function') window.atualizar();
            }, 30000);
            
            if (typeof atualizar === 'function') atualizar();
            return;
        }

        // --- LÓGICA DE ATAQUE E DEBUFFS (AFETA O RIVAL) ---
        const atkBase = isMagico ? window.playerStats.mAtk : window.playerStats.pAtk;
        const defAlvo = isMagico ? this.inimigo.mDef : this.inimigo.pDef;
        const poder = skill.poder || 1.4;
        
        // 1. FÓRMULA REAL E CRUEL
        let dano = ((atkBase * poder) * 1100) / (350 + defAlvo);
        
        // 2. DIFERENÇA DE NÍVEL
        const diffLvl = nivel - this.inimigo.nivel;
        if (diffLvl > 0) {
            dano *= (1 + (diffLvl * 0.05));
        } else if (diffLvl < 0) {
            dano *= Math.max(0.05, (1 + (diffLvl * 0.10)));
        }

        // 3. REMOÇÃO DE CAPS E AJUSTE FINAL
        dano = Math.max(1, Math.floor(dano * 0.85)); 

        if (tipo === "debuff") {
            dano = Math.floor(dano * 0.2); // Debuffs dão pouco dano
            if (this.multiplayer) {
                window.SupabaseAPI.broadcastCombat('oly_skill_effect', { 
                    sender: window.charName, 
                    skillName: nomeSkill, 
                    tipo: "debuff", 
                    poder: 0.7, 
                    cor: skill.cor 
                });
            }
        }

        // Special Effects: STUN
        if (nomeSkill.includes("Stun") || nomeSkill.includes("Hammer Crush")) {
            if (Math.random() < 0.5) { // 50% chance de stun no PvP
                if (this.multiplayer) {
                    window.SupabaseAPI.broadcastCombat('oly_skill_effect', { 
                        sender: window.charName, skillName: nomeSkill, tipo: "stun", duracao: 3000 
                    });
                }
            }
        }

        this.escreverLog(`<span style="color:${skill.cor || '#ddd'};">${nomeSkill} causou ${dano} de dano.</span>`);
        this.danoCausado += dano;

        if (this.multiplayer) {
            window.SupabaseAPI.broadcastCombat('oly_hit', { 
                attacker: window.charName, 
                damage: dano, 
                isCrit: false, 
                skillName: nomeSkill,
                target: this.inimigo.nome 
            });
        } else {
            this.receberDano(dano);
        }

        if (tipo === "ataque_cura" || tipo === "ataque_dreno") {
            const cura = Math.floor(dano * (tipo === "ataque_dreno" ? 0.5 : 0.35));
            window.playerHP = Math.min(window.playerStats.maxHp, window.playerHP + Math.max(1, cura));
            this.escreverLog(`<span style="color:#10b981;">Dreno: +${Math.max(1, cura)} HP.</span>`);
            if (typeof atualizar === 'function') atualizar();
        }
    },

    receberDano(dano) {
        // Futuro Multiplayer: O dano causado pelo player será enviado ao servidor aqui
        // Lógica de CP para o Rival (X1 / Futuro Multiplayer)
        if (this.inimigo.cp > 0) {
            if (this.inimigo.cp >= dano) {
                this.inimigo.cp -= dano;
            } else {
                let sobra = dano - this.inimigo.cp;
                this.inimigo.cp = 0;
                this.inimigo.hp -= sobra;
            }
        } else {
            this.inimigo.hp -= dano;
        }

        if (this.inimigo.hp < 0) this.inimigo.hp = 0;
        this.renderizarUI();
        if (this.inimigo.hp <= 0) this.finalizar(true);
    },

    finalizar(vitoria) {
        if (!this.ativo) return;

        this.ativo = false;
        this.resumoAtivo = true;
        this.pararLoopInimigo();
        this.ultimaVitoria = !!vitoria;

        if (vitoria) {
            let multGrade = 1.0;
            if (typeof obterModificadorGrade === 'function' && typeof obterGradeAtualPorNivel === 'function') {
                multGrade = obterModificadorGrade(obterGradeAtualPorNivel());
            } else {
                if (nivel >= 76) multGrade = 6.0;
                else if (nivel >= 61) multGrade = 4.3;
                else if (nivel >= 52) multGrade = 3.0;
                else if (nivel >= 40) multGrade = 2.1;
                else if (nivel >= 20) multGrade = 1.45;
            }

            const premioAdena = Math.floor((150 + Math.floor(Math.random() * 250)) * multGrade);
            const premioCoins = Math.max(1, Math.floor((1 + Math.floor(Math.random() * 2)) * multGrade));
            adenas += premioAdena;
            ancientCoins += premioCoins;
            
            // Lógica MMR
            olympiadWins++;
            
            // Calcula pontos ganhos com base na diferença de MMR do inimigo
            let botMMR = this.inimigo ? this.inimigo.olympiadPoints : window.olympiadPoints;
            let diferencaMMR = botMMR - window.olympiadPoints;
            
            // Vitória Base: 15 pontos. Vencer mais fortes = mais pontos
            let mmrGanhoCalc = 15 + Math.floor(diferencaMMR / 50); 
            mmrGanhoCalc = Math.max(5, Math.min(35, mmrGanhoCalc)); // Limita entre 5 e 35
            
            this.mmrGained = mmrGanhoCalc + Math.floor(Math.random() * 4); // Variância
            window.olympiadPoints += this.mmrGained;

            // Atualiza o ranking mundial (Se for bot) ou Cloud (Se for player)
            if (this.multiplayer) {
                console.log("☁️ Atualizando MMR Cloud após vitória PvP.");
                if (window.SupabaseAPI) window.SupabaseAPI.savePlayer(window.charName, { 
                    ...JSON.parse(localStorage.getItem('l2mini_save_' + window.charName.toLowerCase())),
                    olympiadPoints: window.olympiadPoints,
                    olympiadWins: window.olympiadWins
                });
            } else {
                let botReal = this.dbRanking.find(b => (b.nome || b.farmBot1) === this.inimigo.nome);
                if (botReal) {
                    botReal.olympiadPoints = Math.max(0, botReal.olympiadPoints - Math.floor(this.mmrGained * 0.8));
                    botReal.derrotas = (botReal.derrotas || 0) + 1;
                    this.salvarRanking();
                }
            }

            if (typeof registrarProgressoMissaoDiaria === 'function') {
                registrarProgressoMissaoDiaria('vencer_olympiad', 1);
                registrarProgressoMissaoDiaria('ganhar_adena', premioAdena);
                registrarProgressoMissaoDiaria('coletar_coins', premioCoins);
            }
            this.ultimoPremioAdena = premioAdena;
            this.ultimoPremioCoins = premioCoins;
            const Tol = (typeof window.t === 'function') ? window.t : null;
            const vicMsg = Tol ? Tol('game.olympiad.logVictoryRewards', { adena: premioAdena, coins: premioCoins, pts: this.mmrGained }) : (`[Olympiad] Victory! +${premioAdena}a, +${premioCoins} Coins, +${this.mmrGained} pts.`);
            this.escreverLog(`<span style="color:#10b981; font-weight:bold;">${vicMsg}</span>`);
            if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.olympiad.victory') : "Olympiad victory!");
        } else {
            playerHP = Math.max(1, Math.floor(playerStats.maxHp * 0.2));
            this.ultimoPremioAdena = 0;
            this.ultimoPremioCoins = 0;
            
            // Lógica MMR (Derrota perde pontos, mas não fica negativo)
            olympiadLosses++;
            
            let botMMR = this.inimigo ? this.inimigo.olympiadPoints : window.olympiadPoints;
            let diferencaMMR = window.olympiadPoints - botMMR; // Se player for MAIOR, perde MAIS
            
            // Derrota Base: 10 pontos. Perder para mais fracos = perde MUITO. Perder para mais fortes = perde POUCO.
            let mmrPerdaCalc = 10 + Math.floor(diferencaMMR / 50);
            mmrPerdaCalc = Math.max(2, Math.min(25, mmrPerdaCalc)); // Limita entre 2 e 25
            
            this.mmrGained = -(mmrPerdaCalc + Math.floor(Math.random() * 3)); // Variância
            window.olympiadPoints += this.mmrGained;
            if(window.olympiadPoints < 0) window.olympiadPoints = 0;

            // Atualiza o ranking (Bot ou Cloud)
            if (this.multiplayer) {
                console.log("☁️ Atualizando MMR Cloud após derrota PvP.");
                if (window.SupabaseAPI) window.SupabaseAPI.savePlayer(window.charName, { 
                    ...JSON.parse(localStorage.getItem('l2mini_save_' + window.charName.toLowerCase())),
                    olympiadPoints: window.olympiadPoints,
                    olympiadLosses: window.olympiadLosses
                });
            } else {
                let botReal = this.dbRanking.find(b => (b.nome || b.farmBot1) === this.inimigo.nome);
                if (botReal) {
                    botReal.olympiadPoints += Math.floor(Math.abs(this.mmrGained) * 1.2);
                    botReal.vitorias = (botReal.vitorias || 0) + 1;
                    this.salvarRanking();
                }
            }

            const Tol = (typeof window.t === 'function') ? window.t : null;
            const defMsg = Tol ? Tol('game.olympiad.logDefeatPts', { pts: Math.abs(this.mmrGained) }) : (`[Olympiad] Defeat in 1v1. Lost ${Math.abs(this.mmrGained)} pts.`);
            this.escreverLog(`<span style="color:#ef4444; font-weight:bold;">${defMsg}</span>`);
            if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.olympiad.defeat') : "Olympiad defeat.");
        }

        if (typeof atualizar === 'function') atualizar();
        this.salvarProgressoOlympiad();
        this.mostrarPainelResultado();
    },

    fugir() {
        if (!this.ativo && !this.lobbyAtivo && !this.resumoAtivo) return;

        const Tol = (typeof window.t === 'function') ? window.t : null;
        
        // Se fugir no meio do duelo ativo, é considerado derrota e perde MMR
        if (this.ativo) {
            const fleeMsg = Tol ? Tol('game.olympiad.logFledMidFight') : '[Olympiad] You fled the arena mid-fight!';
            this.escreverLog(`<span style="color:#ef4444; font-weight:bold;">${fleeMsg}</span>`);
            if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.olympiad.fledLostPoints') : "You fled and lost Olympiad points!");
            
            olympiadLosses++;
            let botMMR = this.inimigo ? this.inimigo.olympiadPoints : olympiadPoints;
            let diferencaMMR = olympiadPoints - botMMR;
            
            // Penalidade por fugir é um pouco maior (+5 pontos extras de perda)
            let mmrPerdaCalc = 15 + Math.floor(diferencaMMR / 50);
            mmrPerdaCalc = Math.max(5, Math.min(30, mmrPerdaCalc));
            
            let mmrPerdido = -(mmrPerdaCalc + Math.floor(Math.random() * 3));
            olympiadPoints += mmrPerdido;
            if(olympiadPoints < 0) olympiadPoints = 0;
            
            // O Bot ganha por W.O.
            let botReal = this.dbRanking.find(b => (b.nome || b.farmBot1) === this.inimigo.nome);
            if (botReal) {
                botReal.olympiadPoints += 15;
                botReal.vitorias = (botReal.vitorias || 0) + 1;
                this.salvarRanking();
            }

            const penMsg = Tol ? Tol('game.olympiad.logFleePenalty', { pts: Math.abs(mmrPerdido) }) : (`Penalidade por fuga: Perdeu ${Math.abs(mmrPerdido)} Pts.`);
            this.escreverLog(`<span style="color:#ef4444;">${penMsg}</span>`);
        } else {
            const leftMsg = Tol ? Tol('game.olympiad.logLeftArena') : '[Olympiad] You left the arena.';
            this.escreverLog(`<span style="color:#fcd34d;">${leftMsg}</span>`);
        }
        
        this.ativo = false;
        this.lobbyAtivo = false;
        this.resumoAtivo = false;
        this.inimigoRevanche = null; // Limpa ao fugir
        this.pararLoopInimigo();
        if (this.timerConfirmRival) clearTimeout(this.timerConfirmRival);
        this.salvarProgressoOlympiad();
        if (typeof atualizar === 'function') atualizar();
        sairOlympiad(true);
    },

    cancelarLobby() {
        if (!this.lobbyAtivo) return;
        const Tol = (typeof window.t === 'function') ? window.t : null;
        const cancelMsg = Tol ? Tol('game.olympiad.logLobbyCancelled') : '[Olympiad] Lobby cancelled.';
        this.escreverLog(`<span style="color:#fcd34d;">${cancelMsg}</span>`);
        this.lobbyAtivo = false;
        this.inimigoRevanche = null; // Limpa ao cancelar
        if (this.timerConfirmRival) clearTimeout(this.timerConfirmRival);
        this.salvarProgressoOlympiad();
        sairOlympiad(true);
    },

    mostrarPainelResultado() {
        const painel = document.getElementById('olympiad-resultado');
        if (!painel) return;

        const titulo = document.getElementById('oly-res-titulo');
        const subtitulo = document.getElementById('oly-res-subtitulo');
        const rival = document.getElementById('oly-res-rival');
        const danoCausado = document.getElementById('oly-res-dano-causado');
        const danoRecebido = document.getElementById('oly-res-dano-recebido');
        const premioAdena = document.getElementById('oly-res-adena');
        const premioCoin = document.getElementById('oly-res-coin');

        // Novos elementos de MMR
        const mmrGainedEl = document.getElementById('oly-res-mmr-gained');
        const mmrTotalEl = document.getElementById('oly-res-mmr-total');
        const mmrTierEl = document.getElementById('oly-res-mmr-tier');

        const Toly = typeof window.t === 'function' ? window.t : null;
        let msgSubtitulo = this.ultimaVitoria
            ? (Toly ? Toly('game.olympiadUi.victorySubtitle') : 'Well fought! You dominated the duel.')
            : (Toly ? Toly('game.olympiadUi.defeatSubtitle') : 'Your opponent won this time. Try a rematch.');
        let subtone = this.ultimaVitoria ? 'win' : 'loss';
        
        // Lógica de Promoção / Rebaixamento de MMR
        if (typeof getOlympiadRank === 'function' && typeof olympiadPoints !== 'undefined') {
            let ptsAtuais = olympiadPoints;
            let ptsAnteriores = Math.max(0, ptsAtuais - (this.mmrGained || 0));
            
            let rankAnterior = getOlympiadRank(ptsAnteriores);
            let rankAtual = getOlympiadRank(ptsAtuais);
            
            if (mmrGainedEl) {
                if (this.mmrGained > 0) {
                    mmrGainedEl.innerText = `+${this.mmrGained}`;
                    mmrGainedEl.style.color = "#22c55e"; // Verde
                } else if (this.mmrGained < 0) {
                    mmrGainedEl.innerText = `${this.mmrGained}`;
                    mmrGainedEl.style.color = "#ef4444"; // Vermelho
                } else {
                    mmrGainedEl.innerText = `0`;
                    mmrGainedEl.style.color = "#a1a1aa"; // Cinza
                }
            }
            
            if (mmrTotalEl) mmrTotalEl.innerText = ptsAtuais;
            
            if (mmrTierEl) {
                mmrTierEl.innerText = rankAtual.nomeCompleto || rankAtual.tier;
                if (rankAtual.tier !== rankAnterior.tier || rankAtual.divisao !== rankAnterior.divisao) {
                    const rankNome = rankAtual.nomeCompleto || rankAtual.tier;
                    if (ptsAtuais > ptsAnteriores) {
                        msgSubtitulo = Toly ? Toly('game.olympiadUi.rankUp', { rank: rankNome }) : ('🏆 RANK UP! Promoted to ' + rankNome + '!');
                        subtone = 'promo';
                        const ptag = Toly ? Toly('game.olympiadUi.promotedTag') : '(PROMOTED)';
                        mmrTierEl.innerHTML = `${rankNome} <span style="color:#22c55e; font-size: 0.8em;">${ptag}</span>`;
                    } else {
                        msgSubtitulo = Toly ? Toly('game.olympiadUi.rankDown', { rank: rankNome }) : ('💔 DEMOTED... Dropped to ' + rankNome + '.');
                        subtone = 'demote';
                        const dtag = Toly ? Toly('game.olympiadUi.demotedTag') : '(DEMOTED)';
                        mmrTierEl.innerHTML = `${rankNome} <span style="color:#ef4444; font-size: 0.8em;">${dtag}</span>`;
                    }
                } else {
                    mmrTierEl.innerText = rankAtual.nomeCompleto || rankAtual.tier;
                }
            }
        }

        if (titulo) titulo.innerText = this.ultimaVitoria
            ? (Toly ? Toly('game.olympiadUi.victoryTitle') : 'OLYMPIAD VICTORY')
            : (Toly ? Toly('game.olympiadUi.defeatTitle') : 'OLYMPIAD DEFEAT');
        if (subtitulo) {
            subtitulo.innerText = msgSubtitulo;
            let col = '#bbb';
            if (subtone === 'promo' || subtone === 'win') col = '#22c55e';
            else if (subtone === 'demote') col = '#ef4444';
            subtitulo.style.color = col;
        }
        
        if (rival) rival.innerText = this.inimigo ? this.inimigo.nome : "-";
        if (danoCausado) danoCausado.innerText = `${Math.floor(this.danoCausado)}`;
        if (danoRecebido) danoRecebido.innerText = `${Math.floor(this.danoRecebido)}`;
        if (premioAdena) premioAdena.innerText = `+${this.ultimoPremioAdena}`;
        if (premioCoin) premioCoin.innerText = `+${this.ultimoPremioCoins}`;

        painel.style.display = 'flex';
    },

    revanche() {
        if (!this.resumoAtivo) return;
        const Tol = (typeof window.t === 'function') ? window.t : null;
        const rmMsg = Tol ? Tol('game.olympiad.logRematchRequested') : '[Olympiad] Rematch requested.';
        this.escreverLog(`<span style="color:#a78bfa;">${rmMsg}</span>`);
        this.recarregarNaProximaLuta = true;
        this.salvarProgressoOlympiad();
        
        // Mantém o inimigo atual para a revanche (cópia limpa sem o HP zerado)
        this.inimigoRevanche = JSON.parse(JSON.stringify(this.inimigo));
        
        this.iniciarLobby();
    },

    sairPosPartida() {
        const Tol = (typeof window.t === 'function') ? window.t : null;
        const sessMsg = Tol ? Tol('game.olympiad.logLeavingSession') : '[Olympiad] Leaving the arena session.';
        this.escreverLog(`<span style="color:#fcd34d;">${sessMsg}</span>`);
        this.ativo = false;
        this.lobbyAtivo = false;
        this.resumoAtivo = false;
        this.recarregarNaProximaLuta = false;
        this.inimigoRevanche = null; // Limpa ao sair
        this.pararLoopInimigo();
        this.salvarProgressoOlympiad();
        sairOlympiad(true);
    },

    renderizarUI() {
        const hpFill = document.getElementById('oly-inimigo-hp-fill');
        const hpText = document.getElementById('oly-inimigo-hp-text');
        const nome = document.getElementById('oly-inimigo-nome');
        const nivelTxt = document.getElementById('oly-inimigo-lvl');
        
        const playerHpFill = document.getElementById('oly-player-hp-fill');
        const playerMpFill = document.getElementById('oly-player-mp-fill');
        const playerCpFill = document.getElementById('oly-player-cp-fill');
        const playerHpTxt = document.getElementById('oly-player-hp-text');
        const playerMpTxt = document.getElementById('oly-player-mp-text');
        const playerCpTxt = document.getElementById('oly-player-cp-text');
        const playerLvl = document.getElementById('oly-player-lvl');

        if (!this.inimigo) return;

        const cpFill = document.getElementById('oly-inimigo-cp-fill');
        const cpText = document.getElementById('oly-inimigo-cp-text');

        if (cpFill && cpText) {
            const pctCp = (this.inimigo.cp / this.inimigo.maxCp) * 100;
            cpFill.style.width = `${Math.max(0, pctCp)}%`;
            cpText.innerText = `${Math.floor(this.inimigo.cp)} / ${this.inimigo.maxCp}`;
        }

        if (playerCpFill && playerCpTxt) {
            const pctCp = (playerCP / playerStats.maxCp) * 100;
            playerCpFill.style.width = `${Math.max(0, pctCp)}%`;
            playerCpTxt.innerText = `${Math.floor(playerCP)} / ${playerStats.maxCp}`;
        }

        if (hpFill && hpText) {
            const pct = (this.inimigo.hp / this.inimigo.maxHp) * 100;
            hpFill.style.width = `${Math.max(0, pct)}%`;
            hpText.innerText = `${Math.floor(this.inimigo.hp)} / ${this.inimigo.maxHp}`;
        }
        
        if (nome) nome.innerText = this.inimigo.nome;
        if (nivelTxt) nivelTxt.innerText = this.inimigo.nivel;
        
        if (playerHpFill && playerHpTxt) {
            const pctHp = (playerHP / playerStats.maxHp) * 100;
            playerHpFill.style.width = `${Math.max(0, pctHp)}%`;
            playerHpTxt.innerText = `${Math.floor(playerHP)} / ${playerStats.maxHp}`;
        }
        
        if (playerMpFill && playerMpTxt) {
            const pctMp = (playerMP / playerStats.maxMp) * 100;
            playerMpFill.style.width = `${Math.max(0, pctMp)}%`;
            playerMpTxt.innerText = `${Math.floor(playerMP)} / ${playerStats.maxMp}`;
        }
        
        if (playerLvl) playerLvl.innerText = nivel;
    },

    escreverLog(msg) {
        const log = document.getElementById('olympiad-log');
        if (!log) return;
        log.innerHTML = `${msg}<br>${log.innerHTML}`;
    },

    getRank(points) {
        if (points < 0) points = 0;
        const tiers = [{nome: "Paper", req: 0},{nome: "Wood", req: 250},{nome: "Copper", req: 500},{nome: "Silver", req: 750},{nome: "Gold", req: 1000},{nome: "Platinum", req: 1250},{nome: "Diamond", req: 1500},{nome: "Legendary", req: 1750},{nome: "Mythic", req: 2000}];
        let currentTier = tiers[0]; let nextTier = tiers[1];
        for (let i = 0; i < tiers.length; i++) { if (points >= tiers[i].req) { currentTier = tiers[i]; nextTier = tiers[i+1] || null; } }
        if (currentTier.nome === "Mythic") return { tier: "Mythic", divisao: "", pontosTotais: points, progresso: 100, max: 2000 };
        let pontosNoTier = points - currentTier.req; let divisaoIndex = Math.floor(pontosNoTier / 50);
        let divisaoNumero = 5 - divisaoIndex; let progressoDivisao = pontosNoTier % 50;
        let nextTierName = divisaoNumero > 1 ? `${currentTier.nome} ${divisaoNumero - 1}` : (nextTier ? `${nextTier.nome} 5` : "Mythic");
        return { tier: currentTier.nome, divisao: divisaoNumero.toString(), nomeCompleto: `${currentTier.nome} ${divisaoNumero}`, pontosTotais: points, progressoAtual: progressoDivisao, maxDivisao: 50, porcentagem: Math.floor((progressoDivisao / 50) * 100), nextTier: nextTierName };
    }
};

// Hook global para compatibilidade
window.getOlympiadRank = (pts) => window.OlympiadEngine.getRank(pts);

window.abrirOlympiad = function() {
    document.querySelectorAll('.screen-content').forEach(s => s.style.display = 'none');
    document.getElementById('tela-olympiad-arena').style.display = 'flex';
    
    const barra = document.getElementById('barra-de-atalhos-dinamica');
    if (barra) barra.style.display = 'grid';

    document.getElementById('olympiad-log').innerHTML = '';
    const painelResultado = document.getElementById('olympiad-resultado');
    if (painelResultado) painelResultado.style.display = 'none';

    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    OlympiadEngine.initRanking(); // Inicializa ranking persistente e rotatividade
    OlympiadEngine.iniciarLobby();
};

window.sairOlympiad = function(forcarSaida = false) {
    if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.resumoAtivo && !forcarSaida) return;
    const tela = document.getElementById('tela-olympiad-arena');
    if (tela) tela.style.display = 'none';
    
    // CORREÇÃO: Força a renderização para mover a barra de volta para o body
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();

    if (typeof irPara === 'function') irPara('world');
};
