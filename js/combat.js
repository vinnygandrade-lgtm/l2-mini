// ==========================================
// SISTEMA DE COMBATE E CAÇADA (MOTOR E FLUXO)
// ==========================================

let podeAtacar = true;
let loopAtaqueMonstro = null;
let timeoutCacada = null;
let monstrosAtivos = [];
let lootTurno = { adenas: 0, xp: 0, drops: {} };

// --- VARIÁVEIS DO MOTOR AVANÇADO ---
let cooldownsAtivos = {};
let globalCooldownAtivo = 0;
let motorPet = null;
let motorBuffsEspeciais = { critMult: 2.0, esquiva: 0 };

function prepararTelaCacada() {
    pararAtaqueMonstro();
    monstrosAtivos = [];
    document.getElementById('area-cacada').style.display = 'flex';
    document.getElementById('btn-iniciar-caca').style.display = 'block';
    document.getElementById('texto-procurando').style.display = 'none';
    document.getElementById('mobs-container').style.display = 'none';
    document.getElementById('botoes-combate').style.display = 'none';

    let containerBuffs = document.getElementById('player-combat-buffs');
    if(containerBuffs) containerBuffs.innerHTML = '';
}

function procurarMonstros() {
    document.getElementById('btn-iniciar-caca').style.display = 'none';
    let texto = document.getElementById('texto-procurando');
    texto.style.display = 'block';
    texto.innerText = (typeof window.t === 'function') ? window.t('game.combat.searchingTracks') : 'Searching for tracks in the zone...';

    lootTurno = { adenas: 0, xp: 0, drops: {} };
    let tempoSuspense = 1500 + (Math.random() * 1500);

    if (timeoutCacada) clearTimeout(timeoutCacada);

    timeoutCacada = setTimeout(() => {
        timeoutCacada = null;
        let telaFloresta = document.getElementById('tela-floresta');
        if(telaFloresta && telaFloresta.style.display === 'flex') {
            document.getElementById('area-cacada').style.display = 'none';
            document.getElementById('mobs-container').style.display = 'flex';
            document.getElementById('botoes-combate').style.display = 'flex';

            spawnMonstros();
            iniciarAtaqueMonstro();
        }
    }, tempoSuspense);
}

function sortearMob(zona) {
    if (!zona.mobs) return { nome: 'ERROR', hpMax: 1, atk: 1, def: 1, dropAd: 0, xp: 0, idImg: 'spider', atkSpd: 2000 };
    let roll = Math.random() * 100;
    let acc = 0;
    for (let mob of zona.mobs) {
        acc += mob.chance;
        if (roll <= acc) return mob;
    }
    return zona.mobs[0];
}

function spawnMonstros() {
    let maxMobs = 1;
    let zonaID = zonaAtual.id || 'No-Grade';

    switch(zonaID) {
        case 'No-Grade': maxMobs = 3; break;
        case 'D': maxMobs = 4; break;
        case 'C': maxMobs = 5; break;
        case 'B': maxMobs = 7; break;
        case 'A': maxMobs = 8; break;
        case 'S': maxMobs = 10; break;
    }

    let qtd = Math.floor(Math.random() * maxMobs) + 1;
    monstrosAtivos = [];
    let nomesSorteados = [];

    for (let i = 0; i < qtd; i++) {
        let mobEscolhido = sortearMob(zonaAtual);
        
        // --- ADICIONADO: LÓGICA DE CHAMPION (5% de chance) ---
        let isChampion = Math.random() < 0.05; 
        let multHP = isChampion ? 10 : 1;
        let multAtk = isChampion ? 1.5 : 1;
        const champLabel = (typeof window.t === 'function') ? window.t('game.combat.championTag') : 'CHAMPION';
        let nomeFinal = isChampion ? `<span style="color:gold; text-shadow: 0 0 5px orange;">[${champLabel}]</span> ${mobEscolhido.nome}` : mobEscolhido.nome;

        nomesSorteados.push(isChampion ? `${champLabel} ${mobEscolhido.nome}` : mobEscolhido.nome);
        
        monstrosAtivos.push({
            idUnico: 'mob_' + Math.random().toString(36).substr(2, 9), 
            nome: nomeFinal,
            hp: mobEscolhido.hpMax * multHP,
            maxHp: mobEscolhido.hpMax * multHP,
            atk: mobEscolhido.atk * multAtk,
            def: mobEscolhido.def,
            dropAd: mobEscolhido.dropAd,
            xp: mobEscolhido.xp,
            idImg: mobEscolhido.idImg,
            atkSpd: mobEscolhido.atkSpd || 2000,
            progresso: 0, 
            isChampion: isChampion, // Identificador para loot e visual
            debuffs: {}
        });
    }

    let resumoNomes = nomesSorteados.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {});
    let msgNomes = Object.entries(resumoNomes).map(([n, q]) => `${q}x ${n}`).join(', ');

    const ambushLine = (typeof window.t === 'function') ? window.t('game.combat.ambush', { list: msgNomes }) : (`AMBUSH! ${msgNomes} appeared!`);
    escreverLog(`<span style="color:#ef4444; font-weight:bold;">${ambushLine}</span>`);
    renderizarMonstros();
}

function renderizarMonstros() {
    const container = document.getElementById('mobs-container');
    if(!container) return;
    container.innerHTML = '';

    monstrosAtivos.forEach((mob, index) => {
        let hpPorcento = (mob.hp / mob.maxHp) * 100; if (hpPorcento < 0) hpPorcento = 0;

        let imgSrc = `assets/mobs/${mob.idImg}_idle.png`;
        let transform = 'translateY(0)';
        if (hpPorcento < 50 && hpPorcento > 0) { transform = 'translateY(5px) rotate(3deg)'; }

        let marker = (index === 0 && monstrosAtivos.length > 1) ? '<span style="color:#ef4444; margin-left:2px;">▼</span>' : '';
        let exibicaoHp = Math.max(0, Math.floor(mob.hp));

        // --- ADICIONADO: FILTRO VISUAL PARA CHAMPION ---
        let filtroVisual = mob.isChampion ? 
            'filter: sepia(1) saturate(8) hue-rotate(-50deg) drop-shadow(0 0 8px gold);' : 
            'filter: drop-shadow(0 0 5px rgba(255,0,0,0.5));';

        container.innerHTML += `
        <div id="mob-card-${mob.idUnico}" style="display:flex; flex-direction:column; align-items:center; flex: 1 1 18%; min-width: 60px; max-width: 90px;">
            <div style="width: 100%; margin-bottom: 5px; text-align:center;">
                <div style="color: #ffcc00; font-size: 0.55em; font-weight: bold; text-shadow: 1px 1px 0 #000; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${mob.nome}${marker}</div>
                <div style="width: 100%; background: #222; height: 3px; border-radius: 2px; overflow: hidden; border: 1px solid #444;">
                    <div id="mob-cd-fill-${mob.idUnico}" style="background: #ef4444; width: ${mob.progresso}%; height: 100%;"></div>
                </div>
            </div>
            <img id="monster-img-${mob.idUnico}" src="${imgSrc}" style="width:100%; object-fit:contain; ${filtroVisual} transition: transform 0.1s ease-out; transform: ${transform}; opacity: ${mob.hp > 0 ? 1 : 0};">
            <div class="hp-bar" style="margin-top: 5px; margin-bottom: 5px; width:100%;">
                <div id="mob-hp-fill-${mob.idUnico}" class="hp-fill" style="width: ${hpPorcento}%;"></div>
                <small id="mob-hp-text-${mob.idUnico}" style="position:absolute; width:100%; left:0; top:0; color:white; font-size:8px;">${exibicaoHp}</small>
            </div>
            <div id="mob-debuffs-${mob.idUnico}" style="display:flex; gap:3px; justify-content:center; margin-top:2px; height:20px;"></div>
        </div>`;
    });
}

function iniciarAtaqueMonstro() {
    if (loopAtaqueMonstro) clearInterval(loopAtaqueMonstro);

    loopAtaqueMonstro = setInterval(() => {
        if (monstrosAtivos.length === 0 || playerHP <= 0) return;

        monstrosAtivos.forEach((mob) => {
            let velocidadeMonstro = mob.atkSpd;
            if (mob.debuffs && mob.debuffs.preso) velocidadeMonstro *= 1.5;

            mob.progresso += (50 / velocidadeMonstro) * 100;

            if (mob.progresso >= 100) {
                mob.progresso = 0; 

                let mobImg = document.getElementById(`monster-img-${mob.idUnico}`);
                if (mobImg) {
                    mobImg.src = `assets/mobs/${mob.idImg}_atk.png`;
                    setTimeout(() => {
                        let mAtual = document.getElementById(`monster-img-${mob.idUnico}`);
                        if(mAtual && mAtual.src.includes('_atk')) mAtual.src = `assets/mobs/${mob.idImg}_idle.png`;
                    }, 300);
                }

                executarDanoDeUmMonstro(mob);
            }

            let fill = document.getElementById(`mob-cd-fill-${mob.idUnico}`);
            if (fill) fill.style.width = mob.progresso + '%';
        });
    }, 50);
}

function pararAtaqueMonstro() {
    if (loopAtaqueMonstro) { clearInterval(loopAtaqueMonstro); loopAtaqueMonstro = null; }
    if (timeoutCacada) { clearTimeout(timeoutCacada); timeoutCacada = null; }
    if (motorPet) { clearInterval(motorPet); motorPet = null; }
}

window.dispararAnimacaoCooldown = function(nome, tempoMs) {
    if (typeof cooldownsAtivos !== 'undefined') cooldownsAtivos[nome] = Date.now() + tempoMs;
};

function processarMorteMonstro(index) {
    if(typeof tocarSom === 'function') tocarSom('adenas');

    let mobMorto = monstrosAtivos[index];
    
    // --- MULTIPLICADORES DE RECOMPENSA (CHAMPION & SPOIL) ---
    let multiplicadorChampion = mobMorto.isChampion ? 5 : 1;
    
    // A MÁGICA DO SPOIL: Se o monstro morrer com o debuff do Spoil, dobra o loot!
    let multiplicadorSpoil = (mobMorto.debuffs && mobMorto.debuffs.spoil) ? 2 : 1; 
    let msgSpoil = multiplicadorSpoil > 1 ? `<span style="color:#facc15; font-weight:bold;"> ${(typeof window.t === 'function') ? window.t('game.combat.spoiled') : '[SPOILED]'}</span>` : "";
    
    // O Anão passivo já ganha 1.5x de Adena. Com Spoil ele ganha o dobro disso!
    let baseAdena = (charRace === "Dwarf") ? (mobMorto.dropAd * 1.5) : mobMorto.dropAd;
    let progMult = 1;
    if (typeof window.EconomyBalance !== 'undefined' && typeof EconomyBalance.adenaLootMult === 'function') {
        const zid = (typeof zonaAtual !== 'undefined' && zonaAtual && zonaAtual.id) ? zonaAtual.id : 'No-Grade';
        progMult = EconomyBalance.adenaLootMult(typeof nivel !== 'undefined' ? nivel : 1, zid);
    }
    let ganhoAdena = Math.floor(baseAdena * multiplicadorChampion * multiplicadorSpoil * progMult);
    let ganhoCoinsDoMob = 0;
    
    let chanceDrop = (charRace === "Dwarf") ? 100 : 80;

    lootTurno.adenas += ganhoAdena;
    lootTurno.xp += (mobMorto.xp * multiplicadorChampion); // XP não dobra com Spoil, só o loot!

    // --- 1. DROP NORMAL (Materiais) ---
    if (Math.random() * 100 <= chanceDrop) {
        const itensPossiveis = ["Animal Skin", "Animal Bone", "Coal", "Charcoal", "Iron Ore"];
        let drop = itensPossiveis[Math.floor(Math.random() * itensPossiveis.length)];
        
        // Champions dropam mais materiais, e o Spoil dobra a quantidade final!
        let qtdDrop = mobMorto.isChampion ? 3 : 1;
        qtdDrop = qtdDrop * multiplicadorSpoil; 
        
        lootTurno.drops[drop] = (lootTurno.drops[drop] || 0) + qtdDrop;
    }

    // Variável de zona usada para Moedas e Receitas
    let nomeDaZona = typeof zonaAtual !== 'undefined' && zonaAtual.nome ? zonaAtual.nome : "";

    // --- 2. Ancient Coin — moeda premium (propositalmente rara) ---
    let levelDoMob = mobMorto.lvl || mobMorto.nivel || 1; 
    let antiAbuso = (nivel - levelDoMob >= 20);

    // Se estiver logado na nuvem, a RPC decide o loot crítico (Coins e Recipes)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName && !antiAbuso) {
        // Chamada assíncrona para a nuvem (não bloqueia o fluxo visual de morte)
        window.SupabaseAPI.validateMobLoot(
            window.charName, 
            mobMorto.idUnico, 
            nomeDaZona, 
            mobMorto.isChampion, 
            !!(mobMorto.debuffs && mobMorto.debuffs.spoil),
            levelDoMob
        ).then(({ data, error }) => {
            if (error) {
                console.warn('[Loot RPC Error]', error);
                return;
            }
            if (data && data.success) {
                // Sincroniza a Adena com o valor calculado pelo servidor (Autoridade Máxima)
                if (data.adena_reward !== undefined) {
                    // Ajusta o ganho de adena do turno para o valor real do servidor
                    const diff = data.adena_reward - ganhoAdena;
                    lootTurno.adenas += diff;
                    console.log(`💰 [Authority] Adena ajustada pelo servidor: ${data.adena_reward}`);
                }

                // Se o servidor deu Ancient Coins
                if (data.ancient_coins > 0) {
                    let qtd = data.ancient_coins;
                    lootTurno.drops["Ancient Coin"] = (lootTurno.drops["Ancient Coin"] || 0) + qtd;
                    if(typeof escreverLog === 'function') {
                        escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.combat.rareDrop', { qty: qtd, item: "Ancient Coin" }) : ('💎 RARE DROP! You found ' + qtd + '× Ancient Coin!')}</span>`);
                    }
                    if(typeof tocarSom === 'function') tocarSom('enchant');
                }
                // Se o servidor deu uma Receita
                if (data.recipe_dropped) {
                    let rec = data.recipe_dropped;
                    lootTurno.drops[rec] = (lootTurno.drops[rec] || 0) + 1;
                    if(typeof escreverLog === 'function') {
                        escreverLog(`<span style="color:#f97316; font-weight:bold; text-shadow: 1px 1px 2px #000;">${(typeof window.t === 'function') ? window.t('game.combat.legendaryDrop', { item: rec }) : ('🔥 LEGENDARY DROP: ' + rec + '!')}</span>`);
                    }
                    if(typeof tocarSom === 'function') tocarSom('lvlup');
                }
            }
        }).catch(err => console.error('[Loot RPC Exception]', err));
    } else {
        // MODO LOCAL (Offline ou Anti-Abuso)
        let chanceMoeda = (mobMorto.debuffs && mobMorto.debuffs.spoil) ? 7 : 3.5;
        if (antiAbuso) { chanceMoeda = 0; }

        if (Math.random() * 100 <= chanceMoeda) {
            let baseCoins = 1; 
            if (nomeDaZona.includes("Ruins")) baseCoins = 2;              
            else if (nomeDaZona.includes("Death Pass")) baseCoins = 5;    
            else if (nomeDaZona.includes("Dragon Valley")) baseCoins = 10;
            else if (nomeDaZona.includes("Insolence")) baseCoins = 22;    
            else if (nomeDaZona.includes("Imperial")) baseCoins = 52;     
            
            let qtdMoeda = mobMorto.isChampion ? (baseCoins * 2) : baseCoins; 
            lootTurno.drops["Ancient Coin"] = (lootTurno.drops["Ancient Coin"] || 0) + qtdMoeda;
            
            if(typeof escreverLog === 'function') escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.combat.rareDrop', { qty: qtdMoeda, item: "Ancient Coin" }) : ('💎 RARE DROP! You found ' + qtdMoeda + '× Ancient Coin!')}</span>`);
            if(typeof tocarSom === 'function') tocarSom('enchant'); 
        }

        // --- 3. DROP LENDÁRIO LOCAL ---
        if (nomeDaZona.includes("Imperial") || nomeDaZona.includes("Dragon")) {
            let chanceRecipe = mobMorto.isChampion ? 0.5 : 0.1;
            if (Math.random() * 100 <= chanceRecipe) {
                let listaRecs = ['Recipe: Vesper Noble Heavy', 'Recipe: Vesper Noble Light', 'Recipe: Vesper Noble Robe', 'Recipe: Vesper Weapon', 'Recipe: Vesper Jewel'];
                let recSorteada = listaRecs[Math.floor(Math.random() * listaRecs.length)];
                lootTurno.drops[recSorteada] = (lootTurno.drops[recSorteada] || 0) + 1;
                if(typeof escreverLog === 'function') escreverLog(`<span style="color:#f97316; font-weight:bold; text-shadow: 1px 1px 2px #000;">${(typeof window.t === 'function') ? window.t('game.combat.legendaryDrop', { item: recSorteada }) : ('🔥 LEGENDARY DROP: ' + recSorteada + '!')}</span>`);
                if(typeof tocarSom === 'function') tocarSom('lvlup');
            }
        }
    }
    // ----------------------------------------

    let mobImg = document.getElementById(`monster-img-${mobMorto.idUnico}`);
    if (mobImg) {
        mobImg.src = `assets/mobs/${mobMorto.idImg}_die.png`;
        mobImg.classList.remove('tomando-dano');
        void mobImg.offsetWidth;
        mobImg.classList.add('mob-desintegrando');
    }

    // Aviso no log se o monstro foi farmado com Spoil
    const defeatedLine = (typeof window.t === 'function') ? window.t('game.combat.monsterDefeated') : 'The monster was defeated!';
    if(typeof escreverLog === 'function') escreverLog(`<span style="color:#aaa;">${defeatedLine}${msgSpoil}</span>`);

    if (typeof registrarProgressoMissaoDiaria === 'function') {
        registrarProgressoMissaoDiaria('matar_monstros', 1);
        if (mobMorto.isChampion) registrarProgressoMissaoDiaria('matar_champions', 1);
        if (ganhoAdena > 0) registrarProgressoMissaoDiaria('ganhar_adena', ganhoAdena);
        if (ganhoCoinsDoMob > 0) registrarProgressoMissaoDiaria('coletar_coins', ganhoCoinsDoMob);
    }
    if (mobMorto.isChampion && typeof window.EndgamePursuits !== 'undefined' && typeof window.EndgamePursuits.onChampionKill === 'function') {
        window.EndgamePursuits.onChampionKill();
    }

    monstrosAtivos.splice(index, 1);

    if (monstrosAtivos.length === 0) {
        pararAtaqueMonstro();
        setTimeout(() => {
            let mobsContainer = document.getElementById('mobs-container');
            if (mobsContainer) mobsContainer.innerHTML = '';
            adenas += lootTurno.adenas;
            xpAtual += lootTurno.xp;
            for (let itemDrop in lootTurno.drops) {
                if (itemDrop === 'Ancient Coin') {
                    window.ancientCoins = (Number(window.ancientCoins) || 0) + lootTurno.drops[itemDrop];
                    continue;
                }
                if(inventario[itemDrop]) inventario[itemDrop] += lootTurno.drops[itemDrop];
                else inventario[itemDrop] = lootTurno.drops[itemDrop];
            }
            if(typeof calcularXpNecessario === 'function' && xpAtual >= xpNecessario) {
                while(xpAtual >= xpNecessario) {
                    nivel++; xpAtual -= xpNecessario; xpNecessario = calcularXpNecessario(nivel);
                }
                calcularStatusGlobais(); playerHP = playerStats.maxHp; playerMP = playerStats.maxMp;
                if(typeof tocarSom === 'function') tocarSom('lvlup');
                if(typeof escreverLog === 'function') escreverLog(`<span style="color:#ffcc00; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.combat.levelUp', { level: nivel }) : ('LEVEL UP! Level ' + nivel + '!')}</span>`);
                
                if (nivel === 20 || nivel === 40 || nivel === 76) {
                    if(typeof escreverLog === 'function') escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.combat.classTransferHint') : '✨ You can class transfer! Visit the Grand Master in town.'}</span>`);
                }
            }
            
            if(typeof atualizar === 'function') atualizar(); 
            if(typeof salvarJogo === 'function') salvarJogo();
            mostrarResumoVitoria();
        }, 800);
    } else {
        setTimeout(() => { if (monstrosAtivos.length > 0) renderizarMonstros(); }, 700);
    }
}

// ==========================================
// SISTEMA VISUAL DE BUFFS/DEBUFFS
// ==========================================
function atualizarIconesBuffPlayer(nome, duracaoMs, iconeHtml) {
    const container = document.getElementById('player-combat-buffs');
    if (!container) return;
    let idIcone = `buff-${nome.replace(/\s+/g, '-')}`;
    if (document.getElementById(idIcone)) {
        let divAntiga = document.getElementById(idIcone);
        let overlay = divAntiga.querySelector('.buff-timer-overlay');
        if(overlay) { overlay.style.animation = 'none'; void overlay.offsetWidth; overlay.style.animation = `drain-buff ${duracaoMs}ms linear forwards`; }
        return;
    }
    let div = document.createElement('div'); div.id = idIcone; div.className = 'mini-icon-buff';
    div.innerHTML = `${iconeHtml}<div class="buff-timer-overlay" style="animation: drain-buff ${duracaoMs}ms linear forwards;"></div>`;
    container.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, duracaoMs);
}

function atualizarIconesDebuffMonstro(indexMonstro, nome, duracaoMs, iconeHtml) {
    let monstro = monstrosAtivos[indexMonstro];
    if(!monstro) return;
    const container = document.getElementById(`mob-debuffs-${monstro.idUnico}`);
    if (!container) return;
    let idIcone = `debuff-${nome.replace(/\s+/g, '-')}-mob-${monstro.idUnico}`;
    if (document.getElementById(idIcone)) return;
    let div = document.createElement('div'); div.id = idIcone; div.className = 'mini-icon-buff'; div.style.width = '16px'; div.style.height = '16px';
    div.innerHTML = `${iconeHtml}<div class="buff-timer-overlay" style="animation: drain-buff ${duracaoMs}ms linear forwards;"></div>`;
    container.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, duracaoMs);
}

function mostrarResumoVitoria() {
    let containerLoot = document.getElementById('vitoria-loot');
    const labAdena = (typeof window.t === 'function') ? window.t('game.combat.victoryAdena') : 'Adena:';
    const labXp = (typeof window.t === 'function') ? window.t('game.combat.victoryXp') : 'XP:';
    const labDrops = (typeof window.t === 'function') ? window.t('game.combat.victoryDrops') : 'Drops:';
    let htmlLoot = `<div style="display:flex; justify-content:space-between;"><span>${labAdena}</span> <b style="color:#ffcc00;">+${lootTurno.adenas}</b></div><div style="display:flex; justify-content:space-between;"><span>${labXp}</span> <b style="color:#10b981;">+${lootTurno.xp}</b></div><hr style="border:0.5px solid #444; margin:5px 0;"><div style="color:#a855f7; font-weight:bold;">${labDrops}</div>`;
    for (let item in lootTurno.drops) { htmlLoot += `<div style="display:flex; justify-content:space-between;"><span>${item}:</span> <b>x${lootTurno.drops[item]}</b></div>`; }
    containerLoot.innerHTML = htmlLoot;
    abrirModal('janela-vitoria', 1500);
}

function fecharVitoriaEProcurar() { fecharModal('janela-vitoria'); prepararTelaCacada(); procurarMonstros(); }
function fecharVitoriaEVoltar() { fecharModal('janela-vitoria'); irPara('cidade'); }

function tentarFugir() {
    if (!podeAtacar || monstrosAtivos.length === 0) return;
    podeAtacar = false;
    escreverLog(`<span style="color:#fcd34d;">${(typeof window.t === 'function') ? window.t('game.combat.fleeing') : 'Trying to escape...'}</span>`);
    setTimeout(() => {
        if (Math.random() * 100 <= 50) {
            escreverLog(`<span style="color:#10b981;">${(typeof window.t === 'function') ? window.t('game.combat.escaped') : 'You got away safely!'}</span>`);
            pararAtaqueMonstro(); 
            prepararTelaCacada(); 
            irPara('cidade');
        } else { 
            escreverLog(`<span style="color:#ef4444;">${(typeof window.t === 'function') ? window.t('game.combat.escapeFailed') : 'Escape failed!'}</span>`); 
        }
        podeAtacar = true;
    }, 800);
}