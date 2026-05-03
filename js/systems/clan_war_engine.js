/**
 * CLAN_WAR_ENGINE.JS
 * Motor de Combate para Guerra de Clãs (Multiplayer Simulado)
 * Versão Pro: Batalhas Persistentes, Mercenários e IA Avançada
 */

const ClanWarEngine = {
    ativo: false,
    emLobby: false,
    aliados: [],
    inimigos: [],
    targetAtual: null,
    intervaloProcessamento: null,
    meuClan: null,
    clanInimigo: null,
    clanInimigoForcado: null,
    contextoSiege: null, 
    timerTrocaTarget: 0,
    cooldownTroca: 5000, 
    autoAtaqueAtivo: false,
    pvpMultiplier: 0.35,
    eventosGuerra: [],

    abrirLobby() {
        if (!playerClanId) {
            mostrarAviso(typeof window.t === 'function' ? window.t('game.war.needClan') : "You need a clan to join clan war!");
            return;
        }

        if (this.ativo) {
            irPara('clanwar');
            document.getElementById('clan-war-lobby').style.display = 'none';
            this.renderizarArena(true);
            return;
        }

        if (typeof window.autoAtaqueAtivo !== 'undefined') window.autoAtaqueAtivo = false;
        this.autoAtaqueAtivo = false;

        this.meuClan = clans.find(c => c.id === playerClanId);
        if (!this.meuClan) return;

        irPara('clanwar');
        
        if (this.contextoSiege) {
            this.prepararGuerra();
        } else {
            this.mostrarDominação();
        }
    },

    mostrarDominação() {
        document.getElementById('clan-war-domination-view').style.display = 'flex';
        document.getElementById('clan-war-preparation-view').style.display = 'none';
        
        if (typeof CastleEngine !== 'undefined') {
            CastleEngine.renderizarNoLobby(document.getElementById('clan-war-castle-list'));
        }
    },

    prepararGuerra() {
        if (this.clanInimigoForcado) {
            this.clanInimigo = this.clanInimigoForcado;
        } else {
            const clansInimigos = clans.filter(c => c.id !== playerClanId);
            if (clansInimigos.length === 0) {
                mostrarAviso(typeof window.t === 'function' ? window.t('game.war.noRivalClans') : "No rival clans are available for war!");
                this.mostrarDominação();
                return;
            }
            this.clanInimigo = clansInimigos[Math.floor(Math.random() * clansInimigos.length)];
        }

        this.emLobby = true;
        this.ativo = false;
        
        this.aliados = this.gerarTime(this.meuClan, true);
        this.inimigos = this.gerarTime(this.clanInimigo, false);

        document.getElementById('clan-war-domination-view').style.display = 'none';
        document.getElementById('clan-war-preparation-view').style.display = 'flex';
        document.getElementById('clan-war-lobby').style.display = 'flex';
        
        const vsLabel = this.contextoSiege ? (typeof window.t === 'function' ? window.t('game.war.labelSiege', { castleName: this.contextoSiege.castleName }) : `SIEGE: ${this.contextoSiege.castleName}`) : (typeof window.t === 'function' ? window.t('game.war.labelClanWar') : "CLAN WAR");
        document.getElementById('war-clans-vs').innerText = vsLabel;
        
        this.renderizarLobby();
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    },

    voltarParaSelecaoCastelo() {
        this.contextoSiege = null;
        this.clanInimigoForcado = null;
        this.mostrarDominação();
    },

    iniciar() {
        this.emLobby = false;
        this.ativo = true;
        this.targetAtual = this.inimigos.find(i => i.hp > 0);
        this.timerTrocaTarget = 0;
        this.autoAtaqueAtivo = false; 
        this.eventosGuerra = []; 

        document.getElementById('clan-war-lobby').style.display = 'none';
        
        this.renderizarArena(true); 
        this.iniciarProcessamento();
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
        
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const msg = this.contextoSiege
            ? (tFn ? tFn('game.war.siegeBegan', { castleName: this.contextoSiege.castleName }) : (`The Siege for ${this.contextoSiege.castleName} has begun!`))
            : (tFn ? tFn('game.war.clanWarBegan') : 'The Clan War has started!');
        escreverLog(`<span style="color:#ef4444; font-weight:bold;">[WAR] ${msg.toUpperCase()}</span>`);
    },

    gerarTime(clan, isAliado) {
        let time = [];
        let membrosBase = [...clan.membros];
        
        if (membrosBase.length < 12) {
            const numMercs = 12 - membrosBase.length;
            const botsDisponiveis = (typeof dbBotsRanking !== 'undefined') ? dbBotsRanking.filter(b => !clan.membros.includes(b.nome || b.farmBot1)) : [];
            const mercs = botsDisponiveis.sort(() => 0.5 - Math.random()).slice(0, numMercs);
            
            mercs.forEach(m => {
                const nomeMerc = (m.nome || m.farmBot1);
                membrosBase.push(`[M] ${nomeMerc}`);
            });
        }

        const isSiege = !!this.contextoSiege;
        if (isSiege && !isAliado) {
            const artName = (typeof window.t === 'function') ? window.t('game.war.holyArtifactName') : 'HOLY ARTIFACT';
            time.push({
                nome: artName,
                idUnico: "castle_crystal",
                hp: 50000 + (nivel * 2000),
                maxHp: 50000 + (nivel * 2000),
                mp: 0, maxMp: 0, cp: 0, maxCp: 0,
                pDef: 150 + (nivel * 5),
                mDef: 150 + (nivel * 5),
                nivel: 85,
                classe: "Structure",
                isStructure: true,
                time: 'inimigo',
                progresso: 0,
                atkSpd: 0,
                debuffs: {},
                expiracaoDebuffs: {},
                cooldowns: {}
            });
        }

        membrosBase.forEach(membro => {
            const isMercenario = membro.startsWith('[M] ');
            const nomeLimpo = isMercenario ? membro.replace('[M] ', '') : membro;
            const isPlayer = (membro === charName);
            
            let botData = null;
            let completo = null;

            if (isPlayer) {
                completo = {
                    nome: charName,
                    nivel: nivel,
                    classe: charClass,
                    maxHp: playerStats.maxHp,
                    maxMp: playerStats.maxMp,
                    maxCp: playerStats.maxCp,
                    pAtk: playerStats.pAtk,
                    mAtk: playerStats.mAtk,
                    pDef: playerStats.pDef,
                    mDef: playerStats.mDef,
                    critRate: playerStats.critRate,
                    atkSpd: playerStats.atkSpeed,
                    isMage: typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false,
                    skills: []
                };
            } else {
                botData = (typeof dbBotsRanking !== 'undefined') ? dbBotsRanking.find(b => (b.nome || b.farmBot1) === nomeLimpo) : null;
                if (!botData) botData = { nome: nomeLimpo, nivel: clan.nivelMin || 1, olympiadPoints: 500, classe: "Warrior" };

                if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.gerarBotCompleto) {
                    completo = OlympiadEngine.gerarBotCompleto(botData);
                } else {
                    completo = { ...botData, maxHp: 1000, maxMp: 500, pAtk: 50, mAtk: 50, pDef: 50, mDef: 50, critRate: 5, atkSpd: 500 };
                }
            }

            let char = {
                ...completo,
                nome: membro,
                idUnico: isPlayer ? 'player' : 'war_' + Math.random().toString(36).substr(2, 9),
                hp: isPlayer ? playerHP : completo.maxHp,
                mp: isPlayer ? playerMP : completo.maxMp,
                cp: isPlayer ? playerCP : (completo.maxHp * (completo.isMage ? 0.4 : 0.6)), 
                maxHp: completo.maxHp,
                maxMp: completo.maxMp,
                maxCp: isPlayer ? playerStats.maxCp : (completo.maxHp * (completo.isMage ? 0.4 : 0.6)),
                isPlayer: isPlayer,
                time: isAliado ? 'aliado' : 'inimigo',
                progresso: Math.random() * 50,
                debuffs: {},
                expiracaoDebuffs: {},
                isMercenario: isMercenario,
                isClanMember: !isMercenario && !isPlayer,
                cooldowns: {}
            };

            time.push(char);
        });

        return time.slice(0, isSiege && !isAliado ? 13 : 12);
    },

    iniciarProcessamento() {
        if (this.intervaloProcessamento) clearInterval(this.intervaloProcessamento);
        
        this.intervaloProcessamento = setInterval(() => {
            if (!this.ativo) return;

            const agora = Date.now();

            [...this.aliados, ...this.inimigos].forEach(unit => {
                if (unit.hp <= 0) return;
                
                if (unit.debuffs && (unit.debuffs.bleed || unit.debuffs.poison)) {
                    if (!unit.ultimoTickDano || agora - unit.ultimoTickDano >= 3000) {
                        const danoTick = Math.floor(unit.maxHp * 0.03); 
                        unit.hp = Math.max(1, unit.hp - danoTick);
                        unit.ultimoTickDano = agora;
                        this.exibirDanoVisual(unit, danoTick, "DOT", "#ef4444");
                    }
                }

                for (let tipo in unit.expiracaoDebuffs) {
                    if (agora >= unit.expiracaoDebuffs[tipo]) {
                        delete unit.debuffs[tipo];
                        delete unit.expiracaoDebuffs[tipo];
                    }
                }
            });

            this.aliados.forEach(a => { if (!a.isPlayer && a.hp > 0) this.processarIA(a, this.inimigos); });
            this.inimigos.forEach(i => { if (i.hp > 0) this.processarIA(i, this.aliados); });

            if (this.autoAtaqueAtivo && playerHP > 0 && this.targetAtual) {
                if (this.targetAtual.hp <= 0) {
                    this.procurarNovoAlvo();
                } else {
                    if (!cooldownsAtivos['Attack'] || agora >= cooldownsAtivos['Attack']) {
                        this.realizarAtaqueBasicoPlayer();
                    }
                }
            }

            this.atualizarUI();
            this.verificarFimGuerra();
        }, 100);
    },

    procurarNovoAlvo() {
        const vivos = this.inimigos.filter(i => i.hp > 0);
        if (vivos.length > 0) {
            this.targetAtual = vivos[0];
            if (document.getElementById('tela-clan-war').style.display === 'flex') {
                this.renderizarArena(true);
            }
        }
    },

    realizarAtaqueBasicoPlayer() {
        if (!this.targetAtual || this.targetAtual.hp <= 0) return;
        const playerRef = this.aliados.find(a => a.isPlayer);
        const isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
        this.aplicarDano(playerRef, this.targetAtual, 1.0, isMage);

        const speed = playerStats.atkSpeed || 500;
        cooldownsAtivos['Attack'] = Date.now() + speed;
        if (typeof dispararAnimacaoCooldown === 'function') dispararAnimacaoCooldown('Attack', speed);
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    },

    processarIA(bot, alvos) {
        if (bot.debuffs && bot.debuffs.stun) return;
        const agora = Date.now();
        let speedMult = bot.debuffs && bot.debuffs.atkSpdMult ? bot.debuffs.atkSpdMult : 1.0;
        const incremento = (100 / (bot.atkSpd / speedMult)) * 100;
        bot.progresso += incremento;

        if (bot.progresso >= 100) {
            bot.progresso = 0;
            const alvosVivos = alvos.filter(a => a.hp > 0);
            if (alvosVivos.length === 0) return;

            let alvo = alvosVivos.find(a => a.isPlayer && a.hp < a.maxHp * 0.4);
            if (!alvo) alvo = alvosVivos[Math.floor(Math.random() * alvosVivos.length)];
            
            let skillUsada = null;

            if (bot.skills && bot.skills.length > 0 && Math.random() < 0.7) {
                const skillsProntas = bot.skills.filter(s => {
                    return (!bot.cooldowns[s.idNome] || agora >= bot.cooldowns[s.idNome]) && bot.mp >= (s.mp || 0);
                });

                if (skillsProntas.length > 0) {
                    const skillsCura = skillsProntas.filter(s => s.tipo === 'cura' || s.idNome.includes('Heal'));
                    if (bot.hp < bot.maxHp * 0.5 && skillsCura.length > 0) {
                        skillUsada = skillsCura[Math.floor(Math.random() * skillsCura.length)];
                    } else {
                        const skillsDano = skillsProntas.filter(s => s.tipo === 'ataque' || s.poder > 1.2);
                        skillUsada = skillsDano.length > 0 ? skillsDano[Math.floor(Math.random() * skillsDano.length)] : skillsProntas[0];
                    }
                }
            }

            if (skillUsada) {
                this.executarSkill(bot, alvo, skillUsada, alvosVivos);
            } else {
                this.aplicarDano(bot, alvo, 1.0, bot.isMage);
            }
        }
    },

    executarSkill(atacante, defensor, skill, todosInimigos) {
        const agora = Date.now();
        const tFn = (typeof window.t === 'function') ? window.t : null;
        if (!atacante.isPlayer) {
            atacante.cooldowns[skill.idNome] = agora + skill.cd;
            atacante.mp -= (skill.mp || 0);
        }

        const power = skill.poder || 1.2;
        const tipo = skill.tipo || 'ataque';

        if (tipo === 'cura') {
            const cura = Math.floor(atacante.maxHp * power * 0.5);
            atacante.hp = Math.min(atacante.maxHp, atacante.hp + cura);
            this.exibirDanoVisual(atacante, `+${cura}`, atacante.nome, "#22c55e");
            this.registrarEventoGuerra(tFn ? tFn('game.war.eventHealed', { name: atacante.nome }) : (`<span style="color:#22c55e;">${atacante.nome}</span> healed!`));
        } else if (tipo === 'ataque_area') {
            const atingidos = todosInimigos.sort(() => 0.5 - Math.random()).slice(0, 3);
            atingidos.forEach(a => this.aplicarDano(atacante, a, power, atacante.isMage));
            this.registrarEventoGuerra(tFn ? tFn('game.war.eventAoe', { name: atacante.nome }) : (`<span style="color:#facc15;">${atacante.nome}</span> used AOE!`));
        } else if (tipo === 'debuff') {
            if (skill.idNome.includes("Stun")) {
                defensor.debuffs.stun = true;
                defensor.expiracaoDebuffs.stun = agora + 3000;
                this.registrarEventoGuerra(tFn ? tFn('game.war.eventStunned', { name: defensor.nome }) : (`<span style="color:#a855f7;">${defensor.nome}</span> STUNNED!`));
            }
            this.aplicarDano(atacante, defensor, power * 0.4, atacante.isMage);
        } else {
            this.aplicarDano(atacante, defensor, power, atacante.isMage);
        }
    },

    aplicarDano(atacante, defensor, multiplicador = 1.0, isMage = false) {
        let atk = isMage ? atacante.mAtk : atacante.pAtk;
        let def = isMage ? defensor.mDef : defensor.pDef;

        if (defensor.debuffs && defensor.debuffs.defMult) def = Math.floor(def * defensor.debuffs.defMult);

        let danoBase = (atk * 1100) / (350 + def);
        let danoMinimo = Math.floor(atk * 0.08);
        if (danoBase < danoMinimo) danoBase = danoMinimo;

        let danoFinal = danoBase * multiplicador * (0.9 + Math.random() * 0.2);
        
        if (!isMage && atacante.critRate && (Math.random() * 100) < atacante.critRate) {
            danoFinal *= 2.0;
        }

        danoFinal = Math.floor(danoFinal * this.pvpMultiplier); 
        if (danoFinal < 1) danoFinal = 1;

        // --- ANIMAÇÕES DE COMBATE 2.0 ---
        const cardAtacante = document.querySelector(`[data-war-id="${atacante.idUnico}"]`);
        const cardDefensor = document.querySelector(`[data-war-id="${defensor.idUnico}"]`);
        
        if (cardAtacante) {
            const jumpClass = atacante.time === 'aliado' ? 'attack-jump-aliado' : 'attack-jump-inimigo';
            cardAtacante.classList.remove(jumpClass);
            void cardAtacante.offsetWidth;
            cardAtacante.classList.add(jumpClass);
            setTimeout(() => cardAtacante.classList.remove(jumpClass), 400);
        }

        if (cardDefensor) {
            setTimeout(() => {
                cardDefensor.classList.remove('impact-shake');
                void cardDefensor.offsetWidth;
                cardDefensor.classList.add('impact-shake');
                setTimeout(() => cardDefensor.classList.remove('impact-shake'), 400);
            }, 150);
        }

        if (defensor.cp > 0) {
            if (defensor.cp >= danoFinal) defensor.cp -= danoFinal;
            else { let sobra = danoFinal - defensor.cp; defensor.cp = 0; defensor.hp -= sobra; }
        } else defensor.hp -= danoFinal;

        if (defensor.hp < 0) defensor.hp = 0;
        if (defensor.isPlayer) {
            playerHP = defensor.hp; playerCP = defensor.cp;
            if (typeof atualizar === 'function') atualizar();
        }

        this.exibirDanoVisual(defensor, Math.floor(danoFinal), atacante.nome);

        if (defensor.hp <= 0) {
            if (atacante.isPlayer) this.autoAtaqueAtivo = false;
            const tFn = (typeof window.t === 'function') ? window.t : null;
            this.registrarEventoGuerra(tFn ? tFn('game.war.eventKilled', { name: defensor.nome }) : (`<span style="color:#ef4444;">${defensor.nome}</span> was killed!`));
            if (this.targetAtual === defensor) this.fugir();
            if (cardDefensor) cardDefensor.classList.add('unit-dead');
        }
    },

    usarSkillPlayer(nomeSkill) {
        if (!this.ativo || playerHP <= 0) return;
        if (nomeSkill === 'Attack') {
            this.autoAtaqueAtivo = !this.autoAtaqueAtivo;
            if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
            return;
        }

        const skill = bancoDeSkills[nomeSkill];
        if (!skill || playerMP < skill.mp) return;

        const agora = Date.now();
        if (cooldownsAtivos[nomeSkill] && agora < cooldownsAtivos[nomeSkill]) return;

        if (!this.targetAtual || this.targetAtual.hp <= 0) this.procurarNovoAlvo();
        if (!this.targetAtual) return;

        playerMP -= skill.mp;
        if (typeof dispararAnimacaoCooldown === 'function') dispararAnimacaoCooldown(nomeSkill, skill.cd);
        
        const playerRef = this.aliados.find(a => a.isPlayer);
        this.executarSkill(playerRef, this.targetAtual, skill, this.inimigos);
        if (typeof atualizar === 'function') atualizar();
    },

    fugir() {
        const agora = Date.now();
        if (agora < this.timerTrocaTarget) return;
        const vivos = this.inimigos.filter(i => i.hp > 0);
        if (vivos.length > 0) {
            this.targetAtual = vivos[Math.floor(Math.random() * vivos.length)];
            this.timerTrocaTarget = agora + this.cooldownTroca;
            if (document.getElementById('tela-clan-war').style.display === 'flex') {
                this.renderizarArena(true);
            }
        }
    },

    sairDaGuerra() {
        this.emLobby = false;
        irPara('world');
    },

    encerrarSessaoGuerra() {
        this.ativo = false;
        this.emLobby = false;
        this.clanInimigoForcado = null;
        this.contextoSiege = null;
        if (this.intervaloProcessamento) clearInterval(this.intervaloProcessamento);
    },

    verificarFimGuerra() {
        const tFn = (typeof window.t === 'function') ? window.t : null;
        if (this.contextoSiege) {
            const cristal = this.inimigos.find(i => i.idUnico === "castle_crystal");
            if (cristal && cristal.hp <= 0) {
                this.registrarEventoGuerra(tFn ? tFn('game.war.eventArtifactDestroyed') : '<span style="color:#facc15;">ARTIFACT DESTROYED!</span>');
                this.finalizar(true);
                return;
            }
        }

        const inimigosVivos = this.inimigos.some(i => i.hp > 0 && !i.isStructure);
        const aliadosVivos = this.aliados.some(a => a.hp > 0);
        
        if (!inimigosVivos) {
            this.registrarEventoGuerra(tFn ? tFn('game.war.eventEnemyWiped') : '<span style="color:#22c55e;">ENEMY WIPED!</span>');
            this.finalizar(true);
        } else if (!aliadosVivos) {
            this.registrarEventoGuerra(tFn ? tFn('game.war.eventAlliesFallen') : '<span style="color:#ef4444;">ALLIES FALLEN!</span>');
            this.finalizar(false);
        }
    },

    registrarEventoGuerra(msg) {
        this.eventosGuerra.unshift(msg);
        if (this.eventosGuerra.length > 5) this.eventosGuerra.pop();

        const container = document.getElementById('war-live-events-content');
        if (container) {
            container.innerHTML = this.eventosGuerra.map(ev => `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 2px solid var(--war-border-bronze); padding-left: 6px; animation: fadeIn 0.3s forwards;">${ev}</div>`).join('');
        }
    },

    finalizar(vitoria) {
        this.ativo = false;
        if (this.intervaloProcessamento) clearInterval(this.intervaloProcessamento);
        setTimeout(() => this.recolherPremios(vitoria), 1000);
    },

    async recolherPremios(vitoria) {
        if (vitoria && this.contextoSiege && this.contextoSiege.casteloId) {
            const casteloId = this.contextoSiege.casteloId;
            if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
                try {
                    const res = await window.SupabaseAPI.claimCastleVictory(window.charName, casteloId);
                    if (res && res.success) {
                        const tFn = (typeof window.t === 'function') ? window.t : null;
                        const msgVitoria = tFn ? tFn('game.war.logSiegeConquer', { castleName: res.castle_name }) : (`[SIEGE] Your clan conquered ${res.castle_name}!`);
                        escreverLog(`<span style="color:#facc15; font-weight:bold;">${msgVitoria}</span>`);
                        this.registrarEventoGuerra(tFn ? tFn('game.war.eventCastleConquered') : '<span style="color:#facc15;">CASTLE CONQUERED!</span>');
                        if (window.CastleEngine) await window.CastleEngine.carregar();
                    }
                } catch (e) { console.error("[WAR] Erro na RPC de vitória:", e); }
            } else {
                if (typeof CastleEngine !== 'undefined') {
                    const castelo = CastleEngine.castelos.find(c => c.id === casteloId);
                    if (castelo && playerClanId) {
                        castelo.ownerClanId = playerClanId;
                        castelo.lastSiege = Date.now();
                        CastleEngine.salvar();
                        const tFn = (typeof window.t === 'function') ? window.t : null;
                        escreverLog(`<span style="color:#facc15; font-weight:bold;">${tFn ? tFn('game.war.logSiegeConquer', { castleName: castelo.nome }) : `[SIEGE] Your clan conquered ${castelo.nome}!`}</span>`);
                    }
                }
            }
        }

        if (vitoria) {
            const adenasG = 25000 + (nivel * 1000);
            const expG = Math.floor(xpNecessario * 0.25);
            xpAtual += expG; 
            if (typeof enviarMail === 'function') {
                const tituloMail = this.contextoSiege ? (typeof window.t === 'function' ? window.t('game.war.mailSubjectSiege', { castle: this.contextoSiege.castleName }) : `Siege Victory: ${this.contextoSiege.castleName}`) : (typeof window.t === 'function' ? window.t('game.war.mailSubjectWar') : 'War Combat Victory');
                enviarMail(charName, 'War Council', tituloMail, 'system', { texto: 'Victory rewards.', recompensas: [{ id: 'Adena', qtd: adenasG }] });
            }
            if (document.getElementById('tela-clan-war').style.display === 'flex') {
                await l2Alert(typeof window.t === 'function' ? window.t('game.war.alertVictory') : `VICTORY!`, "WAR");
            }
        } else {
            if (document.getElementById('tela-clan-war').style.display === 'flex') {
                await l2Alert(typeof window.t === 'function' ? window.t('game.war.alertDefeat') : `DEFEAT!`, "WAR");
            }
        }

        this.encerrarSessaoGuerra();
        irPara('world');
        if (typeof atualizar === 'function') atualizar();
        if (typeof salvarJogo === 'function') salvarJogo();
        if (typeof renderizarClans === 'function' && document.getElementById('tela-social')?.style.display === 'flex') renderizarClans('meu');
    },

    renderizarLobby() {
        const alliesArea = document.getElementById('war-lobby-allies-list');
        const enemiesArea = document.getElementById('war-lobby-enemies-list');
        if (!alliesArea || !enemiesArea) return;
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const tagYou = tFn ? tFn('game.war.lobbyTagYou') : '[YOU]';
        const tagMerc = tFn ? tFn('game.war.lobbyTagMerc') : '[MERC]';
        const tagClan = tFn ? tFn('game.war.lobbyTagClan') : '[CLAN]';
        const tagObj = tFn ? tFn('game.war.lobbyTagObjective') : '[OBJ]';
        
        alliesArea.innerHTML = this.aliados.map(a => {
            let label = a.isPlayer ? `<span style="color:#22c55e; font-size:9px;">${tagYou}</span>` : (a.isMercenario ? `<span style="color:#888; font-size:9px;">${tagMerc}</span>` : `<span style="color:#ca8a04; font-size:9px;">${tagClan}</span>`);
            return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7em; background:rgba(34,197,94,0.1); padding:4px 8px; border-radius:4px; margin-bottom:2px; border:1px solid rgba(34,197,94,0.2);"><div style="display:flex; flex-direction:column;"><span style="color:#eee; font-weight:bold;">${a.nome}</span>${label}</div><span style="color:#22c55e; font-weight:bold;">Lv.${a.nivel}</span></div>`;
        }).join('');
        
        enemiesArea.innerHTML = this.inimigos.map(e => {
            let label = e.isStructure ? `<span style="color:#facc15; font-size:9px;">${tagObj}</span>` : (e.isMercenario ? `<span style="color:#888; font-size:9px;">${tagMerc}</span>` : `<span style="color:#ef4444; font-size:9px;">${tagClan}</span>`);
            return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7em; background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:4px; margin-bottom:2px; border:1px solid rgba(239,68,68,0.2);"><div style="display:flex; flex-direction:column;"><span style="color:#eee; font-weight:bold;">${e.nome}</span>${label}</div><span style="color:#ef4444; font-weight:bold;">Lv.${e.nivel}</span></div>`;
        }).join('');
    },

    renderizarArena(force = false) {
        const container = document.getElementById('clan-war-arena');
        if (!container) return;
        const alliesAlive = this.aliados.filter(a => a.hp > 0).length;
        const enemiesAlive = this.inimigos.filter(i => i.hp > 0).length;
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const battleLive = tFn ? tFn('game.war.battleLive') : 'BATTLE LIVE';
        const alliesStr = tFn ? tFn('game.war.countAllies', { n: alliesAlive }) : (`ALLIES: ${alliesAlive}/12`);
        const enemiesStr = tFn ? tFn('game.war.countEnemies', { n: enemiesAlive }) : (`ENEMIES: ${enemiesAlive}/12`);
        const noEnemies = tFn ? tFn('game.war.noEnemiesLeft') : 'No enemies left.';

        if (force || !container.querySelector(`[data-war-id="${this.targetAtual ? this.targetAtual.idUnico : ''}"]`)) {
            container.innerHTML = `
                <div id="war-live-events-v2" style="position: absolute; top: 15px; right: 15px; width: 140px; z-index: 20; display: flex; flex-direction: column; gap: 4px;">
                    <div style="font-size: 9px; color: var(--war-accent-gold); font-weight: bold; border-bottom: 1px solid var(--war-border-bronze); padding-bottom: 4px; margin-bottom: 4px; font-family: 'Cinzel';">${battleLive}</div>
                    <div id="war-live-events-content" style="display: flex; flex-direction: column; gap: 4px;">
                        ${this.eventosGuerra.map(ev => `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 2px solid var(--war-border-bronze); padding-left: 6px; animation: fadeIn 0.3s forwards;">${ev}</div>`).join('')}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 20px; position:relative;">
                    <div style="position:absolute; top:10px; left:50%; transform:translateX(-50%); width:250px; background:rgba(0,0,0,0.85); border:1px solid var(--war-border-bronze); padding:8px 20px; border-radius:30px; display:flex; justify-content:space-around; z-index:10; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <div id="war-count-allies" style="color:var(--war-accent-green); font-size:10px; font-weight:bold; font-family: 'Cinzel';">${alliesStr}</div>
                        <div style="color:#555;">|</div>
                        <div id="war-count-enemies" style="color:var(--war-accent-red); font-size:10px; font-weight:bold; font-family: 'Cinzel';">${enemiesStr}</div>
                    </div>
                    <div id="war-target-slot" style="text-align:center; margin-top:40px; display:flex; justify-content:center;">
                        ${this.targetAtual ? this.gerarHtmlParticipanteV2(this.targetAtual, 'inimigo') : `<div style="color:#888; font-family:'Cinzel';">${noEnemies}</div>`}
                    </div>
                    <div id="war-player-slot" style="text-align:center; display:flex; justify-content:center;">
                        ${this.gerarHtmlParticipanteV2(this.aliados.find(a => a.isPlayer), 'aliado')}
                    </div>
                </div>
            `;
        } else {
            const elA = document.getElementById('war-count-allies');
            const elE = document.getElementById('war-count-enemies');
            if (elA) elA.innerText = alliesStr;
            if (elE) elE.innerText = enemiesStr;
        }
        this.atualizarBotaoTroca();
    },

    gerarHtmlParticipanteV2(p, time) {
        if (!p) return '';
        const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
        const cpPct = Math.max(0, (p.cp / p.maxCp) * 100);
        const color = time === 'aliado' ? 'var(--war-accent-green)' : 'var(--war-accent-red)';
        const isTarget = this.targetAtual && this.targetAtual.idUnico === p.idUnico;
        const isDead = p.hp <= 0;
        let imgSrc = p.isStructure ? 'assets/npcs/crystal.png' : 'assets/chars/base_fighter.png';
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const objectiveLbl = tFn ? tFn('game.war.objectiveLabel') : 'OBJECTIVE';
        const subtipo = p.isStructure ? objectiveLbl : (tFn ? tFn('game.war.unitLevelClass', { level: p.nivel, className: p.classe }) : (`LVL ${p.nivel} ${p.classe}`));
        return `
            <div class="war-unit-card-v2 ${isTarget ? 'target-active' : ''} ${isDead ? 'unit-dead' : ''}" data-war-id="${p.idUnico}">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="war-avatar-wrapper">
                         <img src="${imgSrc}" class="war-avatar-img" style="${p.isStructure ? 'width:100%; margin-left:0;' : ''}">
                    </div>
                    <div style="flex: 1; text-align: left;">
                        <div style="color:#fff; font-size:11px; font-weight:bold; font-family:'Cinzel';">${p.nome}</div>
                        <div style="color:${color}; font-size:8px; font-weight:bold; letter-spacing:0.5px;">${subtipo}</div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
                    <div class="war-bar-container" style="height:4px;"><div class="war-bar-fill war-cp-fill" style="width:${cpPct}%;"></div></div>
                    <div class="war-bar-container"><div class="war-bar-fill war-hp-fill" style="width:${hpPct}%;"></div></div>
                </div>
                ${isTarget && !isDead ? `<div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); color:var(--war-accent-gold); font-size:14px; filter:drop-shadow(0 0 5px gold);">▼</div>` : ''}
                ${isDead ? `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-15deg); color:rgba(239, 68, 68, 0.6); font-weight:900; font-size:24px; font-family:'Cinzel'; pointer-events:none; border: 2px solid rgba(239, 68, 68, 0.4); padding: 2px 10px; border-radius: 4px;">FALLEN</div>` : ''}
            </div>
        `;
    },

    atualizarBotaoTroca() {
        const btn = document.querySelector('button[onclick*="ClanWarEngine.fugir()"]');
        if (!btn) return;
        const rest = Math.ceil((this.timerTrocaTarget - Date.now()) / 1000);
        const tFn = (typeof window.t === 'function') ? window.t : null;
        if (rest > 0) { btn.disabled = true; btn.innerText = tFn ? tFn('game.war.waitCooldown', { seconds: rest }) : (`WAIT ${rest}S`); }
        else { btn.disabled = false; btn.innerText = tFn ? tFn('game.war.switchTarget') : 'SWITCH TARGET'; }
    },

    atualizarUI() {
        if (!this.ativo) return;
        if (document.getElementById('tela-clan-war').style.display === 'flex') {
            [...this.aliados, ...this.inimigos].forEach(p => {
                const card = document.querySelector(`[data-war-id="${p.idUnico}"]`);
                if (card) {
                    const cpFill = card.querySelector('.war-cp-fill');
                    const hpFill = card.querySelector('.war-hp-fill');
                    if (cpFill) cpFill.style.width = Math.max(0, (p.cp / p.maxCp) * 100) + "%";
                    if (hpFill) hpFill.style.width = Math.max(0, (p.hp / p.maxHp) * 100) + "%";
                }
            });
            this.atualizarBotaoTroca();
            const elA = document.getElementById('war-count-allies');
            const elE = document.getElementById('war-count-enemies');
            const tFn = (typeof window.t === 'function') ? window.t : null;
            const na = this.aliados.filter(a => a.hp > 0).length;
            const ne = this.inimigos.filter(i => i.hp > 0).length;
            if (elA) elA.innerText = tFn ? tFn('game.war.countAllies', { n: na }) : (`ALLIES: ${na}/12`);
            if (elE) elE.innerText = tFn ? tFn('game.war.countEnemies', { n: ne }) : (`ENEMIES: ${ne}/12`);
        }
        if (this.targetAtual && this.targetAtual.hp <= 0) this.procurarNovoAlvo();
    },

    exibirDanoVisual(alvo, dano, autor, corOverride) {
        if (document.getElementById('tela-clan-war').style.display !== 'flex') return;
        const card = document.querySelector(`[data-war-id="${alvo.idUnico}"]`);
        if (!card) return;
        const d = document.createElement('div');
        d.className = 'war-damage-v2';
        let cor = corOverride;
        if (!cor) {
            cor = (alvo.time === 'aliado') ? 'var(--war-accent-red)' : '#fff';
            if (alvo.isStructure) cor = 'var(--war-accent-gold)';
        }
        const randomX = Math.floor(Math.random() * 40) - 20;
        d.style.left = `calc(50% + ${randomX}px)`;
        d.style.top = '20%';
        d.style.color = cor;
        d.style.fontSize = (typeof dano === 'number' && dano > 500) ? '20px' : '14px';
        d.innerText = dano;
        card.appendChild(d);
        setTimeout(() => d.remove(), 1000);
    }
};

window.ClanWarEngine = ClanWarEngine;
