/**
 * RAID_ENGINE.JS - V3.0 (GLOBAL SERVER SIMULATION)
 * Sistema de Raid Mundial com Sincronização entre Abas e Bots Funcionais
 */

const RaidEngine = {
    ativo: false,
    modoDiario: false,
    master: false, // Se esta aba é a que processa os cálculos (Servidor)
    raidId: null,
    bossData: null,
    bossHpAtual: 0,
    ultimoAtaquePlayer: 0,
    
    // Dados da Raid (Sincronizados via LocalStorage)
    state: {
        bossHp: 0,
        participants: [], // { nome, hp, hpMax, isBot, isPlayer, classe, dps, ultimoUpdate }
        logs: [],
        lastTick: 0,
        bossStatus: 'alive' // 'alive', 'dead'
    },

    STORAGE_KEY: 'l2mini_global_raid',

    resolverBossDoCatalogo: function(bossId) {
        if (typeof catalogoBosses !== 'undefined' && catalogoBosses[bossId]) return catalogoBosses[bossId];
        if (typeof catalogoBossesDiarios !== 'undefined' && catalogoBossesDiarios[bossId]) return catalogoBossesDiarios[bossId];
        return null;
    },

    /**
     * Inicia ou entra em uma Raid
     */
    iniciar: function(bossId, opcoesExtra) {
        opcoesExtra = opcoesExtra || {};
        let dadosBoss = this.resolverBossDoCatalogo(bossId);
        if (!dadosBoss) return;

        this.bossData = dadosBoss;
        this.modoDiario = !!opcoesExtra.modoDiario;
        this.raidId = this.modoDiario ? `daily_${charName}_${new Date().toDateString()}` : `world_${bossId}_${Math.floor(Date.now() / 3600000)}`; // Uma raid nova por hora
        
        this.ativo = true;
        this.carregarEstadoGlobal();

    // Se a raid não existe ou o boss morreu há muito tempo, ou se o HP máximo mudou (balanceamento)
    if (!this.state || this.state.bossStatus === 'dead' || (Date.now() - this.state.lastTick > 10000) || this.state.bossMaxHp !== this.bossData.hpMax) {
        this.criarNovaRaid();
    } else {
        // Se a raid já existia, garante que o HP atual não é maior que o novo HP máximo balanceado
        if (this.state.bossHp > this.bossData.hpMax) {
            this.state.bossHp = this.bossData.hpMax;
            this.state.bossMaxHp = this.bossData.hpMax;
            this.salvarEstadoGlobal();
        }
    }

        // Adiciona este player aos participantes
        this.entrarNaRaid();

        // Configura UI
        this.prepararArena();
        
        // Inicia Loops
        this.iniciarLoops();
    },

    prepararArena: function() {
        document.getElementById('janela-raid-lobby').style.display = 'none';
        document.querySelectorAll('.screen-content').forEach(s => s.style.display = 'none');
        document.getElementById('tela-raid-arena').style.display = 'flex';

        const tagDaily = document.getElementById('raid-daily-tag');
        if (tagDaily) tagDaily.style.display = this.modoDiario ? 'inline' : 'none';
        
        // Puxa a barra de atalhos
        const barraAtalhosFarm = document.getElementById('barra-de-atalhos-dinamica');
        if (barraAtalhosFarm) barraAtalhosFarm.style.display = 'grid';

        document.getElementById('raid-boss-nome').innerText = this.bossData.nome;
        document.getElementById('raid-boss-img').src = this.bossData.img;
        document.getElementById('raid-combat-log').innerHTML = ""; 
        
        const enterMsg = (typeof window.t === 'function') ? window.t('game.raid.enterBattle', { boss: this.bossData.nome }) : ('You entered battle against ' + this.bossData.nome + '!');
        this.escreverLogRaid(`<span style="color:#ef4444; font-weight:bold;">${enterMsg}</span>`);
    },

    criarNovaRaid: function() {
        console.log("[Raid] Criando nova instância de Raid Global...");
        this.state = {
            id: this.raidId,
            bossHp: this.bossData.hpMax,
            bossMaxHp: this.bossData.hpMax,
            participants: [],
            logs: [],
            lastTick: Date.now(),
            bossStatus: 'alive'
        };

        // Adiciona bots iniciais (somente em World Boss)
        if (!this.modoDiario) {
            this.gerarBotsIniciais();
        }

        this.salvarEstadoGlobal();
        this.master = true;
    },

    gerarBotsIniciais: function() {
        if (typeof dbBotsRanking === 'undefined' || typeof OlympiadEngine === 'undefined') return;
        
        // Sorteia 10-15 bots do ranking para ajudar
        const qtd = 10 + Math.floor(Math.random() * 5);
        const embaralhado = [...dbBotsRanking].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < qtd; i++) {
            const botData = embaralhado[i];
            const botCompleto = OlympiadEngine.gerarBotCompleto(botData);
            
            this.state.participants.push({
                nome: botCompleto.nome,
                hp: botCompleto.maxHp,
                hpMax: botCompleto.maxHp,
                pAtk: botCompleto.pAtk,
                mAtk: botCompleto.mAtk,
                pDef: botCompleto.pDef,
                mDef: botCompleto.mDef,
                atkSpd: botCompleto.atkSpd,
                classe: botCompleto.classe,
                skills: botCompleto.skills,
                isBot: true,
                isPlayer: false,
                ultimoUpdate: Date.now(),
                morto: false,
                dps: 0
            });
        }
    },

    entrarNaRaid: function() {
        // Remove se já existir (mesmo nome) para atualizar stats
        this.state.participants = this.state.participants.filter(p => p.nome !== charName);
        
        this.state.participants.push({
            nome: charName,
            hp: playerHP,
            hpMax: playerStats.maxHp,
            pAtk: playerStats.pAtk,
            mAtk: playerStats.mAtk,
            pDef: playerStats.pDef,
            mDef: playerStats.mDef,
            atkSpd: playerStats.atkSpeed,
            classe: charClass,
            isBot: false,
            isPlayer: true,
            ultimoUpdate: Date.now(),
            morto: playerHP <= 0,
            dps: 0
        });
        this.salvarEstadoGlobal();
    },

    iniciarLoops: function() {
        if (this.loopSync) clearInterval(this.loopSync);
        
        // Loop de Sincronização e Render (Rápido: 100ms)
        this.loopSync = setInterval(() => {
            this.carregarEstadoGlobal();
            this.atualizarUI();
            
            // Verifica se precisamos assumir o Master (se o anterior sumiu)
            if (Date.now() - this.state.lastTick > 2500) {
                this.master = true;
            }

            if (this.state.bossStatus === 'dead') {
                this.vitoriaRaid();
            }
        }, 200);

        // Loop de Lógica (Servidor) - Somente se for Master
        if (this.loopServer) clearInterval(this.loopServer);
        this.loopServer = setInterval(() => {
            if (this.master && this.ativo) {
                this.processarTickServidor();
            }
            // Update local do player (sempre enviamos nosso estado)
            this.syncEstadoPlayer();
        }, 1000);
    },

    processarTickServidor: function() {
        if (this.state.bossStatus === 'dead') return;

        let totalDanoNesteSegundo = 0;
        const agora = Date.now();

        // 1. Processa Bots
        this.state.participants.forEach(p => {
            if (p.isBot && !p.morto) {
                // Bots atacam a cada tick (simulado via atkSpd)
                if (Math.random() < 0.7) {
                    let dano = 0;
                    let msgSkill = "";
                    
                    // Chance de usar skill real
                    if (p.skills && p.skills.length > 0 && Math.random() < 0.3) {
                        const skill = p.skills[Math.floor(Math.random() * p.skills.length)];
                        dano = Math.floor((p.pAtk + p.mAtk) * (skill.poder || 1.5) * 0.08);
                        msgSkill = `<span style="color:${skill.cor || '#fff'};">[${skill.idNome}]</span> `;
                    } else {
                        dano = Math.floor((p.pAtk + p.mAtk) * 0.05 * (0.8 + Math.random() * 0.4));
                    }

                    p.dps += dano;
                    totalDanoNesteSegundo += dano;

                    // --- NOVO: Dano dos Bots sobe na tela (Simulação Multiplayer) ---
                    if (Math.random() < 0.3) { // Não mostra todos para não poluir demais
                        this.mostrarDanoVisual(dano, false, p.nome);
                    }

                    if (msgSkill && Math.random() < 0.1) {
                        this.state.logs.unshift(`<span style="color:#aaa;">[${new Date().toLocaleTimeString()}]</span> <b style="color:#eee;">${p.nome}</b> usou ${msgSkill}`);
                    }
                }
            }
            
            // Limpa participantes inativos (mais de 10s sem sinal)
            if (Date.now() - p.ultimoUpdate > 10000 && !p.isBot) {
                p.remover = true;
            }
        });
        
        this.state.participants = this.state.participants.filter(p => !p.remover);

        // 2. Boss Ataca Alguém Aleatório
        if (Math.random() < 0.6 && this.state.participants.length > 0) {
            const vivos = this.state.participants.filter(p => !p.morto);
            if (vivos.length > 0) {
                const alvo = vivos[Math.floor(Math.random() * vivos.length)];
                this.bossAtaca(alvo);
            }
        }

        // 3. Boss usa Habilidade de Área (AoE)
        if (Math.random() < 0.2) {
            this.bossAtacaArea();
        }

        // 4. Atualiza HP do Boss
        this.state.bossHp -= totalDanoNesteSegundo;
        if (this.state.bossHp <= 0) {
            this.state.bossHp = 0;
            this.state.bossStatus = 'dead';
        }

        this.state.lastTick = Date.now();
        this.salvarEstadoGlobal();
    },

    bossAtacaArea: function() {
        const skills = this.bossData.skills;
        if (!skills.habilidade_area) return;

        const msg = `<span style="color:#ef4444; font-weight:bold;">🔥 [AOE] ${skills.habilidade_area.nome}: ${skills.habilidade_area.msg}</span>`;
        this.state.logs.unshift(`<span style="color:#aaa;">[${new Date().toLocaleTimeString()}]</span> ${msg}`);
        
        // Treme a tela forte no AOE
        const arena = document.getElementById('raid-arena-center');
        if (arena) {
            arena.style.transform = `translate(${Math.random()*30-15}px, ${Math.random()*30-15}px)`;
            setTimeout(() => { arena.style.transform = 'translate(0,0)'; }, 150);
        }

        this.state.participants.forEach(p => {
            if (!p.morto) {
                this.aplicarDanoNoAlvo(p, this.bossData.mAtk * 1.5, 'mágico');
            }
        });
    },

    bossAtaca: function(alvo) {
        let danoBase = this.bossData.pAtk;
        let msg = `${this.bossData.nome} ataca ${alvo.nome}!`;
        this.aplicarDanoNoAlvo(alvo, danoBase, 'físico');

        // Adiciona ao log global
        this.state.logs.unshift(`<span style="color:#aaa;">[${new Date().toLocaleTimeString()}]</span> ${msg}`);
        if (this.state.logs.length > 5) this.state.logs.pop();
    },

    aplicarDanoNoAlvo: function(alvo, danoBruto, tipo) {
        const def = tipo === 'mágico' ? alvo.mDef : alvo.pDef;
        const multiplicador = 1000 / (1000 + def);
        let danoFinal = Math.floor(danoBruto * multiplicador * (0.9 + Math.random() * 0.2));
        
        alvo.hp -= danoFinal;
        if (alvo.hp <= 0 && !alvo.morto) {
            alvo.hp = 0;
            alvo.morto = true;
            
            // --- LOG DE MORTE NO RAID CHAT ---
            const corMorte = alvo.isPlayer ? "#ef4444" : "#f87171";
            const iconeMorte = alvo.isPlayer ? "💀" : "☠️";
            this.state.logs.unshift(`<span style="color:#aaa;">[${new Date().toLocaleTimeString()}]</span> <span style="color:${corMorte}; font-weight:bold;">${iconeMorte} ${alvo.nome} foi abatido pelo Boss!</span>`);
            if (this.state.logs.length > 8) this.state.logs.pop();
        }

        // Se o alvo for o player desta aba, atualiza o HP real
        if (alvo.nome === charName) {
            playerHP = alvo.hp;
            if (playerHP <= 0) {
                playerHP = 0;
                this.derrotaRaid();
            }
            if (typeof atualizar === 'function') atualizar();
        }
    },

    syncEstadoPlayer: function() {
        if (!this.ativo) return;
        const pIndex = this.state.participants.findIndex(p => p.nome === charName);
        if (pIndex !== -1) {
            const p = this.state.participants[pIndex];
            p.hp = playerHP;
            p.hpMax = playerStats.maxHp;
            p.morto = playerHP <= 0;
            p.ultimoUpdate = Date.now();
            this.salvarEstadoGlobal();
        }
    },

    playerAtaca: function() {
        if (!this.ativo || playerHP <= 0 || this.state.bossStatus === 'dead') return;

        let agora = Date.now();
        let delay = playerStats.atkSpeed || 1000;
        if (agora - this.ultimoAtaquePlayer < delay) return; 
        this.ultimoAtaquePlayer = agora;

        if (typeof dispararAnimacaoCooldown === 'function') {
            dispararAnimacaoCooldown('Attack', delay);
        }

        let isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(charClass) : false;
        let danoBruto = isMage ? playerStats.mAtk : playerStats.pAtk; 
        let defDoBoss = isMage ? this.bossData.mDef : this.bossData.pDef;
        let multDef = 1000 / (1000 + defDoBoss);
        let danoFinal = Math.floor(danoBruto * multDef);
        
        if (Math.random() * 100 <= playerStats.critRate) {
            danoFinal *= isMage ? 1.5 : 2; 
            this.mostrarDanoVisual(danoFinal, true);
        } else {
            this.mostrarDanoVisual(danoFinal, false);
        }

        this.receberDanoBoss(danoFinal, true);
    },

    receberDanoBoss: function(dano, doPlayer = false) {
        if (this.state.bossStatus === 'dead') return;

        // Subtrai direto do estado e salva
        this.state.bossHp -= dano;
        if (this.state.bossHp <= 0) {
            this.state.bossHp = 0;
            this.state.bossStatus = 'dead';
        }

        if (doPlayer) {
            // Atualiza nosso DPS no state
            const p = this.state.participants.find(p => p.nome === charName);
            if (p) p.dps = (p.dps || 0) + dano;

            // Treme a tela
            const arena = document.getElementById('raid-arena-center');
            if (arena) {
                arena.style.transform = `translate(${Math.random()*15-7.5}px, ${Math.random()*15-7.5}px)`;
                setTimeout(() => { arena.style.transform = 'translate(0,0)'; }, 50);
            }
        }

        this.salvarEstadoGlobal();
    },

    mostrarDanoVisual: function(dano, critico = false, autor = null) {
        const center = document.getElementById('raid-arena-center');
        if (!center) return;

        const isMe = autor === null || autor === charName;
        const dmgEl = document.createElement('div');
        dmgEl.className = 'floating-damage';
        
        let prefixo = critico ? "CRITICAL! " : "";
        let textoFinal = prefixo + dano.toLocaleString();
        if (!isMe && autor) textoFinal = `<small style="font-size:10px; color:#aaa; display:block; text-align:center;">${autor}</small>` + textoFinal;
        
        dmgEl.innerHTML = textoFinal;
        
        // Estilo dinâmico para o dano
        dmgEl.style.position = 'absolute';
        dmgEl.style.top = (45 + (Math.random() * 10 - 5)) + '%';
        dmgEl.style.left = (50 + (Math.random() * 20 - 10)) + '%';
        dmgEl.style.transform = 'translate(-50%, -50%)';
        
        // Cores: Player (Branco/Vermelho), Outros (Amarelado/Cinza)
        if (isMe) {
            dmgEl.style.color = critico ? '#ff3333' : '#fff';
            dmgEl.style.fontSize = critico ? '2.8em' : '2em';
            dmgEl.style.zIndex = '200';
        } else {
            dmgEl.style.color = critico ? '#facc15' : '#e5e7eb';
            dmgEl.style.fontSize = critico ? '1.5em' : '1.2em';
            dmgEl.style.zIndex = '150';
            dmgEl.style.opacity = '0.8';
        }

        dmgEl.style.fontWeight = '900';
        dmgEl.style.textShadow = '2px 2px 0 #000, 0 0 10px ' + (critico ? 'red' : 'rgba(0,0,0,0.5)');
        dmgEl.style.pointerEvents = 'none';
        dmgEl.style.fontFamily = "'Cinzel', serif";
        dmgEl.style.whiteSpace = 'nowrap';
        
        document.getElementById('tela-raid-arena').appendChild(dmgEl);

        // Animação manual via JS
        let pos = parseFloat(dmgEl.style.top);
        let opacity = isMe ? 1 : 0.8;
        let scale = 1;
        const speed = isMe ? 0.5 : 0.3;
        const drift = (Math.random() - 0.5) * 4;
        let leftPos = parseFloat(dmgEl.style.left);

        const anim = setInterval(() => {
            pos -= speed;
            opacity -= 0.02;
            scale += 0.005;
            leftPos += drift;
            
            dmgEl.style.top = pos + '%';
            dmgEl.style.left = leftPos + '%';
            dmgEl.style.opacity = opacity;
            dmgEl.style.transform = `translate(-50%, -50%) scale(${scale})`;

            if (opacity <= 0) {
                clearInterval(anim);
                if (dmgEl.parentNode) dmgEl.parentNode.removeChild(dmgEl);
            }
        }, 20);
    },

    carregarEstadoGlobal: function() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const newState = JSON.parse(raw);
                if (newState.id === this.raidId) {
                    this.state = newState;
                    // Garante que logs existe
                    if (!this.state.logs) this.state.logs = [];
                }
            }
        } catch(e) { console.error("Erro ao carregar raid global:", e); }
    },

    salvarEstadoGlobal: function() {
        if (!this.raidId) return;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },

    atualizarUI: function() {
        // 1. HP do Boss
        let hpFill = document.getElementById('raid-boss-hp-fill');
        let hpText = document.getElementById('raid-boss-hp-text');
        let pct = (this.state.bossHp / this.state.bossMaxHp) * 100;
        if (hpFill) hpFill.style.width = Math.max(0, pct) + '%';
        if (hpText) hpText.innerText = `${Math.floor(this.state.bossHp).toLocaleString()} / ${this.state.bossMaxHp.toLocaleString()}`;

        // 2. Contador de Vivos
        const vivos = this.state.participants.filter(p => !p.morto).length;
        const countEl = document.getElementById('raid-vivos-count');
        if (countEl) countEl.innerText = vivos;

        // 3. Status do Player (Centro da Tela)
        const me = this.state.participants.find(p => p.nome === charName);
        if (me) {
            const hpPct = (me.hp / me.hpMax) * 100;
            const hpFillPlayer = document.getElementById('raid-player-hp-fill');
            const hpTextPlayer = document.getElementById('raid-player-hp-text');
            if (hpFillPlayer) hpFillPlayer.style.width = Math.max(0, hpPct) + '%';
            if (hpTextPlayer) hpTextPlayer.innerText = `${Math.floor(me.hp)} / ${me.hpMax}`;
            
            // MP (Usamos a global do player)
            const mpPct = (playerMP / playerStats.maxMp) * 100;
            const mpFillPlayer = document.getElementById('raid-player-mp-fill');
            if (mpFillPlayer) mpFillPlayer.style.width = Math.max(0, mpPct) + '%';
            
            const lvlEl = document.getElementById('raid-player-lvl');
            if (lvlEl) lvlEl.innerText = nivel;

            // Atualiza DPS Visível
            const dpsEl = document.getElementById('raid-player-dps-val');
            if (dpsEl) dpsEl.innerText = (me.dps || 0).toLocaleString();
        }

        // 4. Participantes (Overlay Esquerda)
        const listCont = document.getElementById('raid-participants-list');
        if (listCont) {
            // Ordena por DPS
            const ordenados = [...this.state.participants].sort((a,b) => b.dps - a.dps).slice(0, 8);
            listCont.innerHTML = ordenados.map(p => {
                const hpPct = (p.hp / p.hpMax) * 100;
                const isMe = p.nome === charName;
                return `
                    <div style="display:flex; flex-direction:column; gap:1px; padding:3px 6px; background:rgba(0,0,0,0.7); border-radius:4px; border:1px solid ${isMe ? '#10b981' : '#333'}; opacity: ${p.morto ? 0.4 : 1}; width: 100%; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                        <div style="display:flex; justify-content:space-between; font-size:8px; gap: 4px; align-items:center;">
                            <span style="color:${isMe ? '#10b981' : (p.morto ? '#ef4444' : '#eee')}; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.isPlayer ? '👤' : ''}${p.nome}</span>
                            <span style="color:#facc15; font-weight:900; font-size:7px;">${p.dps > 1000 ? (p.dps/1000).toFixed(1)+'k' : p.dps}</span>
                        </div>
                        <div style="width:100%; height:3px; background:#111; border-radius:1px; overflow:hidden; margin-top:2px; border:1px solid rgba(255,255,255,0.05);">
                            <div style="width:${hpPct}%; height:100%; background:${p.morto ? '#222' : 'linear-gradient(90deg, #7f1d1d, #ef4444)'}; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

    // 5. Logs
    const logCont = document.getElementById('raid-combat-log');
    if (logCont && this.state.logs) {
        // Mudança: Invertemos a ordem para flex-direction: column (mais novo em cima)
        const newContent = this.state.logs.map(l => `<div style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:2px;">${l}</div>`).join('');
        if (logCont.innerHTML !== newContent) {
            logCont.innerHTML = newContent;
            // No mobile com flex-direction column, o scroll deve ir para o topo
            logCont.scrollTop = 0;
        }
    }
        
        // 6. Cooldown do Boss (visual)
        this.atualizarBarraCooldownBoss();
    },

    atualizarBarraCooldownBoss: function() {
        let el = document.getElementById('raid-boss-cd-fill');
        if (!el) return;
        let delay = this.bossData?.skills?.ataque_basico?.delay || 2000;
        let elapsed = (Date.now() - this.state.lastTick) % delay;
        let pct = (elapsed / delay) * 100;
        el.style.width = (100 - pct) + '%';
    },

    escreverLogRaid: function(texto) {
        if (this.master) {
            this.state.logs.unshift(`<span style="color:#aaa;">[${new Date().toLocaleTimeString()}]</span> ${texto}`);
            if (this.state.logs.length > 5) this.state.logs.pop();
            this.salvarEstadoGlobal();
        }
    },

    vitoriaRaid: function() {
        const bossNome = this.bossData.nome;
        this.limparRaid();
        const tagDaily = document.getElementById('raid-daily-tag');
        if (tagDaily) tagDaily.style.display = 'none';
        
        if (typeof registrarProgressoMissaoDiaria === 'function' && this.modoDiario) {
            registrarProgressoMissaoDiaria('derrotar_daily_boss', 1);
        }

        const tFn = (typeof window.t === 'function') ? window.t : null;
        const bossDefeatedText = tFn
            ? tFn('game.raid.bossDefeated', { name: bossNome })
            : (`${bossNome} defeated!`);
        document.getElementById('loot-boss-nome').innerText = bossDefeatedText;
        let container = document.getElementById('raid-loot-container');
        container.innerHTML = '';
        
        // Drops (Enviados para o Mailbox)
        let dropsGanhos = [];
        this.bossData.drops.forEach(drop => {
            if (Math.random() * 100 <= drop.chance) {
                let qtd = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                dropsGanhos.push({ id: drop.id, qtd: qtd, epic: drop.epic });
            }
        });

        if (dropsGanhos.length === 0) {
            const emptyLoot = (typeof window.t === 'function') ? window.t('game.raid.noLootThisTime') : 'You fought well, but this boss left no loot this time.';
            container.innerHTML = '<div style="color:#888; text-align:center; padding: 20px;">' + emptyLoot + '</div>';
        } else {
            let todosOsItens = [...(typeof catalogoMateriais !== 'undefined' ? catalogoMateriais : []), ...(typeof catalogoScrolls !== 'undefined' ? catalogoScrolls : [])];
            let adenaTotal = 0;
            let recompensasFormatadas = [];
            let itensTexto = [];

            dropsGanhos.forEach(d => {
                let itemBanco = todosOsItens.find(i => i.id === d.id);
                let nomeBonito = itemBanco ? itemBanco.nome : d.id;
                let corNome = d.epic ? '#c084fc' : '#fff'; 
                
                container.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:8px 12px; margin-bottom:4px; border-left:3px solid ${corNome}; border-radius:4px;">
                        <span style="color:${corNome}; font-size:12px; font-weight:bold;">${nomeBonito}</span>
                        <b style="color:#10b981;">x${d.qtd.toLocaleString()}</b>
                    </div>
                `;

                if (d.id === 'Adena') adenaTotal += d.qtd;
                
                recompensasFormatadas.push({
                    id: d.id,
                    nome: nomeBonito,
                    qtd: d.qtd,
                    epic: d.epic
                });
                
                if (d.id !== 'Adena') {
                    itensTexto.push(`${d.qtd}x ${nomeBonito}`);
                }
            });

            // Envia para o Mailbox
            if (typeof enviarMail === 'function') {
                const tFn = (typeof window.t === 'function') ? window.t : null;
                const assunto = tFn ? tFn('game.raid.mailSubjectRewards', { name: bossNome }) : (`Raid Rewards: ${bossNome}`);
                const itemsList = itensTexto.length > 0 ? itensTexto.join(', ') : (tFn ? tFn('game.raid.mailNoItems') : 'No physical items');
                const corpo = tFn
                    ? tFn('game.raid.mailBodyRewards', { boss: bossNome, items: itemsList })
                    : (`Congratulations! You participated in the defeat of ${bossNome}.\n\nItems found: ${itemsList}.`);
                
                enviarMail(charName, 'Raid System', assunto, 'system', {
                    texto: corpo,
                    recompensas: recompensasFormatadas, // Enviando com nomes bonitos
                    valor: adenaTotal,
                    moeda: 'adena'
                });
            }

            const tFn2 = (typeof window.t === 'function') ? window.t : null;
            const mbTitle = tFn2 ? tFn2('game.raid.rewardsMailboxTitle') : 'Rewards sent to Mailbox';
            const mbHint = tFn2 ? tFn2('game.raid.rewardsMailboxHint') : 'Check your inbox to collect your items.';
            container.innerHTML += `
                <div style="margin-top:15px; padding:10px; background:rgba(67, 56, 202, 0.2); border:1px dashed #4338ca; border-radius:6px; text-align:center;">
                    <div style="font-size:10px; color:#a5b4fc; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">${mbTitle}</div>
                    <div style="font-size:9px; color:#818cf8; margin-top:2px;">${mbHint}</div>
                </div>
            `;

            if(typeof salvarJogo === 'function') salvarJogo(); 
            if(typeof atualizar === 'function') atualizar();
        }

        setTimeout(() => { abrirModal('janela-raid-loot', 2200); }, 1000); 
    },

    derrotaRaid: async function() {
        this.limparRaid();
        await l2Alert(typeof window.t === 'function' ? window.t('game.raid.youDied') : "YOU DIED! The boss won the battle.", typeof window.t === 'function' ? window.t('game.raid.defeatTitle') : "RAID DEFEAT");
        irPara(this.modoDiario ? 'world' : 'cidade');
    },

    fugir: function() {
        this.limparRaid();
        irPara('world');
    },

    limparRaid: function() {
        this.ativo = false;
        clearInterval(this.loopSync);
        clearInterval(this.loopServer);
        
        const barraAtalhosFarm = document.getElementById('barra-de-atalhos-dinamica');
        if (barraAtalhosFarm) barraAtalhosFarm.style.display = 'none';

        document.getElementById('tela-raid-arena').style.display = 'none';

        document.getElementById('tela-raid-arena').style.display = 'none';

        // Remove a gente da lista global ao sair
        this.carregarEstadoGlobal();
        this.state.participants = this.state.participants.filter(p => p.nome !== charName);
        this.salvarEstadoGlobal();
    },

    // === RAID LOBBY LOGIC ===
    lobbyState: {
        inscrito: false,
        playersCount: 0,
        maxPlayers: 50,
        loopInscricoes: null
    },

    abrirLobby: function(bossId = 'boss_antharas') {
        let boss = this.resolverBossDoCatalogo(bossId);
        if (!boss) return;

        let agora = new Date();
        let diaDaSemana = agora.getDay();
        let horaAtual = agora.getHours();
        let diaLiberado = boss.spawn.dias.includes(diaDaSemana);
        let horaLiberada = (horaAtual >= boss.spawn.horaInicio && horaAtual < boss.spawn.horaFim);

        if (!diaLiberado || !horaLiberada) {
            const wd = (typeof window.I18n !== 'undefined' && window.I18n.getArray) ? window.I18n.getArray('game.raid.weekdayShort') : [];
            const fallbackDias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let diasTexto = boss.spawn.dias.map(d => (wd[d] != null ? wd[d] : fallbackDias[d])).join(', ');
            const closedMsg = (typeof window.t === 'function')
                ? window.t('game.raid.closedBoss', {
                    name: boss.nome,
                    days: diasTexto,
                    start: boss.spawn.horaInicio,
                    end: boss.spawn.horaFim
                })
                : boss.spawn.msgFechado;
            const statusTitle = (typeof window.t === 'function') ? window.t('game.raid.statusTitle') : 'RAID STATUS';
            if (typeof l2Alert === 'function') l2Alert(closedMsg, statusTitle);
            return;
        }

        let infoContainer = document.getElementById('raid-lobby-info');
        if (infoContainer) {
            const wd = (typeof window.I18n !== 'undefined' && window.I18n.getArray) ? window.I18n.getArray('game.raid.weekdayShort') : [];
            const fallbackDias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let diasTexto = boss.spawn.dias.map(d => (wd[d] != null ? wd[d] : fallbackDias[d])).join(', ');
            const lobbySpawn = (typeof window.t === 'function') ? window.t('game.raid.lobbySpawnLabel') : 'Spawn schedule:';
            const lobbyRewards = (typeof window.t === 'function') ? window.t('game.raid.lobbyRewardsLabel') : 'Possible rewards:';
            const hoursRange = (typeof window.t === 'function')
                ? window.t('game.raid.lobbyHoursRange', { start: boss.spawn.horaInicio, end: boss.spawn.horaFim })
                : `${boss.spawn.horaInicio}h–${boss.spawn.horaFim}h`;
            let htmlInfo = `
                <div style="background: rgba(0,0,0,0.6); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #444; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
                    <div style="color: #facc15; font-size: 0.9em; margin-bottom: 10px; border-bottom: 1px solid #555; padding-bottom: 5px;">
                        🕒 <b>${lobbySpawn}</b> ${diasTexto} | ${hoursRange}
                    </div>
                    <div style="color: #a855f7; font-size: 0.9em; margin-bottom: 8px;">💎 <b>${lobbyRewards}</b></div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
            `;
            let items = [...(typeof catalogoMateriais !== 'undefined' ? catalogoMateriais : []), ...(typeof catalogoScrolls !== 'undefined' ? catalogoScrolls : [])];
            boss.drops.forEach(drop => {
                let item = items.find(i => i.id === drop.id);
                let nomeBonito = item ? item.nome : drop.id;
                let corNome = drop.epic ? '#c084fc' : (drop.id === 'Ancient Coin' ? '#60a5fa' : (drop.id.includes('sc_') ? '#facc15' : '#ccc'));
                let icone = drop.epic ? '💎' : (drop.id === 'Ancient Coin' ? '🪙' : (drop.id.includes('sc_') ? '📜' : '📦'));
                htmlInfo += `<div style="font-size: 0.85em; color: ${corNome}; border-left: 3px solid ${corNome}; padding-left: 8px; background: rgba(255,255,255,0.05); border-radius: 0 3px 3px 0;">${icone} ${nomeBonito} <span style="float:right; color:#888;">(${drop.chance}%)</span></div>`;
            });
            infoContainer.innerHTML = htmlInfo + `</div></div>`;
        }

        document.getElementById('janela-raid-lobby').style.display = 'flex';
        if (!this.lobbyState.inscrito) {
            this.lobbyState.playersCount = Math.floor(Math.random() * 10) + 5;
            this.atualizarUILobby();
        }
    },

    fecharLobby: function() {
        document.getElementById('janela-raid-lobby').style.display = 'none';
    },

    inscrever: function() {
        if (this.lobbyState.inscrito) return;
        this.lobbyState.inscrito = true;
        this.lobbyState.playersCount++;
        document.getElementById('btn-inscrever-raid').style.display = 'none';
        document.getElementById('raid-status-texto').innerText = (typeof window.t === 'function') ? window.t('game.raid.lobbySignedUp') : 'SIGNED UP! Waiting for the raid to fill...';
        document.getElementById('raid-status-texto').style.color = "#10b981";
        this.atualizarUILobby();
        if (typeof escreverLog === 'function') {
            var signedMsg = (typeof window.t === 'function') ? window.t('game.raid.logSignedUp') : '[Raid] You signed up to face the raid boss!';
            escreverLog(`<span style="color:#fca5a5; font-weight:bold;">${signedMsg}</span>`);
        }

        if (this.lobbyState.loopInscricoes) clearInterval(this.lobbyState.loopInscricoes);
        this.lobbyState.loopInscricoes = setInterval(() => {
            this.lobbyState.playersCount += Math.floor(Math.random() * 3) + 1;
            if (this.lobbyState.playersCount >= this.lobbyState.maxPlayers) {
                this.lobbyState.playersCount = this.lobbyState.maxPlayers;
                clearInterval(this.lobbyState.loopInscricoes);
                this.prepararEntrada();
            }
            this.atualizarUILobby();
        }, 1500);
    },

    atualizarUILobby: function() {
        document.getElementById('raid-count-players').innerText = this.lobbyState.playersCount;
        let pct = (this.lobbyState.playersCount / this.lobbyState.maxPlayers) * 100;
        document.getElementById('raid-bar-players').style.width = pct + '%';
    },

    prepararEntrada: function() {
        document.getElementById('raid-status-texto').innerText = (typeof window.t === 'function') ? window.t('game.raid.lobbyFullAwake') : 'THE ROOM IS FULL! THE BOSS HAS AWOKEN!';
        document.getElementById('raid-status-texto').style.color = "#ef4444";
        document.getElementById('btn-inscrever-raid').style.display = 'none';
        document.getElementById('btn-entrar-raid').style.display = 'block';
        if (typeof escreverLog === 'function') {
            var battleMsg = (typeof window.t === 'function') ? window.t('game.raid.logBattleBegins', { boss: 'Antharas' }) : '[Raid] The ground shakes... The battle against Antharas begins!';
            escreverLog(`<span style="color:#ef4444; font-weight:bold;">${battleMsg}</span>`);
        }
    },

    entrar: function() {
        document.getElementById('janela-raid-lobby').style.display = 'none';
        this.iniciar('boss_antharas');
    }
};

// Hooks globais para manter compatibilidade com index.html
window.abrirLobbyRaid = (id) => RaidEngine.abrirLobby(id);
window.fecharLobbyRaid = () => RaidEngine.fecharLobby();
window.inscreverRaid = () => RaidEngine.inscrever();
window.entrarNaBatalhaRaid = () => RaidEngine.entrar();

// Interceptador de ataque
setTimeout(() => {
    if (typeof bancoDeSkills !== 'undefined' && bancoDeSkills['Attack']) {
        let original = bancoDeSkills['Attack'].executar;
        bancoDeSkills['Attack'].executar = function() {
            if (RaidEngine.ativo) RaidEngine.playerAtaca(); 
            else if (typeof original === 'function') original();
        };
    }
}, 1000);
