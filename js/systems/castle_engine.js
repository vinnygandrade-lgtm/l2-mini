/**
 * CASTLE_ENGINE.JS
 * Sistema de Castelos, Sieges e Propriedade de Territórios (Versão Pro)
 */

const CastleEngine = {
    castelos: [],
    saveKey: 'l2mini_castles',
    cicloTreasury: 60000 * 10, // A cada 10 minutos ganha Adena

    init() {
        this.carregar();
        this.iniciarCicloVida();
        this.iniciarCicloTreasury();
        
        // Inicialização: Se nenhum castelo estiver ocupado, distribui alguns entre os clãs bots
        if (this.castelos.every(c => !c.ownerClanId) && clans.length > 1) {
            console.log("[CastleEngine] Distribuindo castelos iniciais para clãs bots...");
            this.castelos.forEach(c => {
                if (Math.random() < 0.7) { // 70% de chance de começar ocupado
                    const botsClans = clans.filter(cl => cl.id !== playerClanId);
                    if (botsClans.length > 0) {
                        const sorteado = botsClans[Math.floor(Math.random() * botsClans.length)];
                        c.ownerClanId = sorteado.id;
                        c.lastSiege = Date.now();
                    }
                }
            });
            this.salvar();
        }
    },

    async carregar() {
        // MODO MULTIPLAYER (SUPABASE)
        if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
            const cloudCastles = await window.SupabaseAPI.fetchCastles();
            if (cloudCastles && cloudCastles.length > 0) {
                this.castelos = cloudCastles.map(c => ({
                    id: c.id,
                    nome: c.name,
                    ownerClanId: c.owner_clan_id,
                    treasury: parseInt(c.treasury),
                    lastSiege: c.last_siege_at ? new Date(c.last_siege_at).getTime() : null,
                    minLevel: this.getMinLevelForCastle(c.id), // Helper para manter níveis de grade
                    taxRate: c.tax_rate,
                    baseIncome: this.getBaseIncomeForCastle(c.id)
                }));
                return;
            }
        }

        // MODO LOCAL (OFFLINE)
        const salvos = localStorage.getItem(this.saveKey);
        if (salvos) {
            this.castelos = JSON.parse(salvos);
            // Sincroniza com DB e limpa possíveis duplicatas ou campos faltando
            dbCastles.forEach(dbC => {
                let inst = this.castelos.find(c => c.id === dbC.id);
                if (!inst) {
                    this.castelos.push({
                        ...dbC,
                        ownerClanId: null,
                        lastSiege: null,
                        treasury: 0,
                        lastTaxUpdate: Date.now()
                    });
                } else {
                    // Atualiza metadados estáticos do DB (lvl, taxRate, etc) preservando estado dinâmico
                    Object.assign(inst, {
                        nome: dbC.nome,
                        descricao: dbC.descricao,
                        minLevel: dbC.minLevel,
                        taxRate: dbC.taxRate,
                        baseIncome: dbC.baseIncome
                    });
                    if (inst.treasury === undefined) inst.treasury = 0;
                }
            });
            this.salvar();
        } else {
            this.castelos = dbCastles.map(c => ({
                ...c,
                ownerClanId: null,
                lastSiege: null,
                treasury: 0,
                lastTaxUpdate: Date.now()
            }));
            this.salvar();
        }
    },

    salvar() {
        localStorage.setItem(this.saveKey, JSON.stringify(this.castelos));
    },

    iniciarCicloTreasury() {
        setInterval(() => {
            this.castelos.forEach(c => {
                if (c.ownerClanId) {
                    const income = c.baseIncome || 5000;
                    c.treasury = (c.treasury || 0) + income;
                    
                    // Se o dono for o player, notifica no log ocasionalmente
                    if (c.ownerClanId === playerClanId && Math.random() < 0.2) {
                        escreverLog(`<span style="color:#22c55e;">[CASTLE] ${c.nome} collected taxes: +${income.toLocaleString()}a</span>`);
                    }
                }
            });
            this.salvar();
        }, this.cicloTreasury);
    },

    iniciarCicloVida() {
        setInterval(() => {
            if (typeof clans === 'undefined' || clans.length === 0) return;
            const r = Math.random();
            // Aumentada frequência de disputas entre bots (30% de chance a cada 3 minutos)
            if (r < 0.30) { 
                this.processarEventoAleatorio();
            }
        }, 60000 * 3);
    },

    processarEventoAleatorio() {
        const casteloSorteado = this.castelos[Math.floor(Math.random() * this.castelos.length)];
        
        // SEGURANÇA: Se o player estiver em guerra ou siege agora, não processa evento bot para esse castelo
        if (typeof ClanWarEngine !== 'undefined' && ClanWarEngine.ativo) {
            if (ClanWarEngine.contextoSiege && ClanWarEngine.contextoSiege.casteloId === casteloSorteado.id) {
                console.log(`[CASTLE] Pulando evento bot para ${casteloSorteado.nome} pois o player está em siege aqui.`);
                return;
            }
        }

        if (!casteloSorteado.ownerClanId) {
            const botsClans = clans.filter(c => c.id !== playerClanId);
            if (botsClans.length >= 2) {
                const c1 = botsClans[Math.floor(Math.random() * botsClans.length)];
                let c2 = botsClans[Math.floor(Math.random() * botsClans.length)];
                while(c1.id === c2.id) c2 = botsClans[Math.floor(Math.random() * botsClans.length)];
                this.resolverSiegeBotVsBot(casteloSorteado, c1, c2);
            }
        } else {
            const botsClans = clans.filter(c => c.id !== playerClanId && c.id !== casteloSorteado.ownerClanId);
            if (botsClans.length > 0) {
                const atacante = botsClans[Math.floor(Math.random() * botsClans.length)];
                const defensor = clans.find(c => c.id === casteloSorteado.ownerClanId);
                if (defensor) {
                    this.resolverSiegeBotVsBot(casteloSorteado, atacante, defensor);
                }
            }
        }
    },

    resolverSiegeBotVsBot(castelo, c1, c2) {
        const power1 = (c1.level * 10) + c1.membros.length;
        const power2 = (c2.level * 10) + c2.membros.length;
        const total = power1 + power2;
        const roll = Math.random() * total;
        const vencedor = roll < power1 ? c1 : c2;
        
        castelo.ownerClanId = vencedor.id;
        castelo.lastSiege = Date.now();
        this.salvar();
    },

    desafiarCastelo(casteloId, clanId) {
        const castelo = this.castelos.find(c => c.id === casteloId);
        if (!castelo) return;
        const meuClan = clans.find(c => c.id === clanId);
        if (!meuClan) return;

        if (nivel < castelo.minLevel) {
            mostrarAviso(typeof window.t === 'function' ? window.t('game.castle.levelTooLow', { min: castelo.minLevel }) : `Your level is too low for this castle! (Requires ${castelo.minLevel})`);
            return;
        }

        if (castelo.ownerClanId === clanId) {
            this.abrirMenuLiderCastelo(castelo);
            return;
        }

        if (typeof ClanWarEngine !== 'undefined') {
            ClanWarEngine.contextoSiege = {
                casteloId: castelo.id,
                isAtacante: true,
                castleName: castelo.nome
            };
            
            if (castelo.ownerClanId) {
                const dono = clans.find(c => c.id === castelo.ownerClanId);
                ClanWarEngine.clanInimigoForcado = dono;
            } else {
                const botsClans = clans.filter(c => c.id !== clanId);
                ClanWarEngine.clanInimigoForcado = botsClans[Math.floor(Math.random() * botsClans.length)];
            }
            
            ClanWarEngine.prepararGuerra();
        }
    },

    abrirMenuLiderCastelo(castelo) {
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const header = tFn ? tFn('game.castle.managementTitle') : 'CASTLE MANAGEMENT';
        const lord = tFn ? tFn('game.castle.lordOf', { name: castelo.nome }) : (`Lord of ${castelo.nome}`);
        const blurb = tFn ? tFn('game.castle.manageBlurb') : 'Protect your fortress and manage your wealth.';
        const treasLbl = tFn ? tFn('game.castle.treasuryLabel') : 'Castle Treasury';
        const amt = (castelo.treasury || 0).toLocaleString();
        const treasAmt = tFn ? tFn('game.castle.treasuryAmount', { amount: amt }) : (`${amt} Adena`);
        const btnW = tFn ? tFn('game.castle.btnWithdrawTreasury') : 'WITHDRAW TREASURY';
        const btnClose = tFn ? tFn('mailbox.close') : 'CLOSE';

        const modal = document.createElement('div');
        modal.id = 'castle-leader-menu';
        modal.className = 'store-window';
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:400px; z-index:2000; background:rgba(10,5,5,0.98); border:2px solid #22c55e; border-radius:10px; padding:15px; box-shadow:0 0 50px #000;';
        
        modal.innerHTML = `
            <div class="store-header" style="background: linear-gradient(180deg, #166534 0%, #064e3b 100%); border-bottom:1px solid #22c55e;">
                <span style="color:#fff; font-family:'Cinzel', serif; letter-spacing:2px;">${header}</span>
            </div>
            <div style="padding:15px; text-align:center;">
                <div style="font-size:3em; margin-bottom:10px;">👑</div>
                <h3 style="color:#facc15; margin:0 0 5px 0;">${lord}</h3>
                <p style="color:#aaa; font-size:0.8em; margin-bottom:20px;">${blurb}</p>
                
                <div style="background:rgba(0,0,0,0.5); padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:20px;">
                    <div style="color:#888; font-size:0.7em; text-transform:uppercase;">${treasLbl}</div>
                    <div style="color:#facc15; font-size:1.5em; font-weight:bold; font-family:'Tahoma';">${treasAmt}</div>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-l2" style="background:linear-gradient(180deg, #ca8a04, #92400e); height:45px;" onclick="CastleEngine.coletarTesouro('${castelo.id}')">${btnW}</button>
                    <button class="btn-l2" style="background:#444; height:40px;" onclick="document.getElementById('castle-leader-menu').remove()">${btnClose}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async coletarTesouro(casteloId) {
        const castelo = this.castelos.find(c => c.id === casteloId);
        if (!castelo) return;

        // MODO MULTIPLAYER (SUPABASE)
        if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
            try {
                const res = await window.SupabaseAPI.withdrawCastleTreasury(window.charName, casteloId);
                if (res && res.success) {
                    const valor = res.amount_withdrawn;
                    window.adenas = (Number(window.adenas) || 0) + valor;
                    mostrarAviso(typeof window.t === 'function' ? window.t('game.castle.treasuryWithdrawn', { amount: valor.toLocaleString(), castleName: castelo.nome }) : `Retirados ${valor.toLocaleString()}a do tesouro de ${castelo.nome}!`);
                    await this.carregar();
                    if (typeof atualizar === 'function') atualizar();
                    if (document.getElementById('castle-leader-menu')) document.getElementById('castle-leader-menu').remove();
                } else {
                    mostrarAviso(typeof window.t === 'function' ? window.t('game.cloud.error') + ': ' + res.error : 'Error: ' + res.error);
                }
            } catch (e) {
                console.error("[Castle] Erro ao sacar tesouro cloud:", e);
            }
            return;
        }

        // MODO LOCAL (OFFLINE)
        if (castelo.ownerClanId !== playerClanId) return;
        // ... (resto da lógica offline)

    /**
     * RENDERIZAR NO LOBBY DA CLAN WAR
     */
    renderizarNoLobby(target) {
        if (!target) return;
        
        const tFn = (typeof window.t === 'function') ? window.t : null;
        let castlesHtml = this.castelos.map(castle => {
            const owner = clans.find(c => c.id === castle.ownerClanId);
            const isOwner = playerClanId && castle.ownerClanId === playerClanId;
            const canChallenge = playerClanId && castle.ownerClanId !== playerClanId;

            let statusText = owner
                ? (tFn ? tFn('game.castle.lobbyRuledBy', { clanName: owner.nome.toUpperCase() }) : (`RULED BY ${owner.nome.toUpperCase()}`))
                : (tFn ? tFn('game.castle.lobbyUnoccupied') : 'UNOCCUPIED');
            let statusColor = owner ? "#facc15" : "#888";
            let borderColor = isOwner ? "#22c55e" : (owner ? "#ca8a04" : "#3d2b1f");
            let bgOpacity = isOwner ? "0.2" : "0.1";

            const reqLbl = tFn ? tFn('game.castle.lobbyReqLvl') : 'REQ LVL';
            const yoursLbl = tFn ? tFn('game.castle.lobbyYours') : 'YOURS';

            return `
                <div class="castle-lobby-card" 
                     style="background: rgba(0,0,0,0.7); border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 15px; transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden;" 
                     onclick="CastleEngine.selecionarParaSiege('${castle.id}')"
                     onmouseover="this.style.background='rgba(50,30,20,0.8)'"
                     onmouseout="this.style.background='rgba(0,0,0,0.7)'">
                    
                    <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${borderColor};"></div>
                    
                    <div style="font-size: 1.8em; background: rgba(0,0,0,0.5); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid ${borderColor}44; box-shadow: inset 0 0 10px #000;">
                        ${isOwner ? '👑' : '🏰'}
                    </div>
                    
                    <div style="flex: 1;">
                        <div style="color: #fff; font-size: 1em; font-weight: bold; font-family: 'Cinzel', serif; letter-spacing: 0.5px;">${castle.nome}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            ${owner ? `<span style="font-size:0.8em; filter:grayscale(0.5);">${owner.logo}</span>` : ''}
                            <span style="color: ${statusColor}; font-size: 0.65em; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">${statusText}</span>
                        </div>
                    </div>
                    
                    <div style="text-align: right; min-width: 60px;">
                        <div style="color: #88745c; font-size: 0.6em; font-weight: bold;">${reqLbl}</div>
                        <div style="color: ${nivel >= castle.minLevel ? '#22c55e' : '#ef4444'}; font-size: 1.1em; font-weight: bold; font-family: 'Tahoma';">${castle.minLevel}</div>
                    </div>

                    ${isOwner ? `
                        <div style="position:absolute; top:5px; right:5px; background:#15803d; color:#fff; font-size:6px; padding:2px 5px; border-radius:3px; font-weight:bold;">${yoursLbl}</div>
                    ` : ''}
                </div>
            `;
        }).join('');

        target.innerHTML = castlesHtml;
    },

    selecionarParaSiege(castleId) {
        const castelo = this.castelos.find(c => c.id === castleId);
        if (!castelo) return;
        this.desafiarCastelo(castleId, playerClanId);
    },

    finalizarTemporada() {
        console.log("[CastleEngine] Finalizando temporada...");
        this.castelos.forEach(c => {
            if (c.ownerClanId) {
                // Recompensa de clã por manter o castelo no fim do mês?
                // Talvez fama de clã no futuro.
            }
        });
        this.salvar();
    },

    getMinLevelForCastle(id) {
        const dbC = dbCastles.find(c => c.id === id);
        return dbC ? dbC.minLevel : 1;
    },

    getBaseIncomeForCastle(id) {
        const dbC = dbCastles.find(c => c.id === id);
        return dbC ? dbC.baseIncome : 5000;
    },

    // Retorna os buffs de castelo se o jogador pertencer a um clã que domina um
    getCastleBuffs() {
        if (!playerClanId) return null;
        const dominios = this.castelos.filter(c => c.ownerClanId === playerClanId);
        if (dominios.length === 0) return null;

        // Cada castelo dá um pequeno bônus cumulativo
        return {
            pDefMult: 1 + (dominios.length * 0.01), // 1% def por castelo
            pAtkMult: 1 + (dominios.length * 0.01),
            mDefMult: 1 + (dominios.length * 0.01),
            mAtkMult: 1 + (dominios.length * 0.01),
            count: dominios.length
        };
    }
};

window.CastleEngine = CastleEngine;
