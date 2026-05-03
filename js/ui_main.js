// ==========================================
// UI - MAIN (LOGIN, CRIAÇÃO E NAVEGAÇÃO)
// ==========================================

// O Dicionário! Para adicionar raças no futuro, é só adicionar aqui.
const radarDeRacas = {
    "Human": {
        imgDestaque: "assets/chars/casal.png",
        imgHomem: "assets/chars/base_fighter.png", 
        imgMulher: "assets/chars/mulher.png",      
        classesBase: ["Fighter", "Mage"],
        desc: "Balanced stats and great versatility. Capable of following any path."
    },
    "Dark Elf": {
        imgDestaque: "assets/chars/casal_de.png", 
        imgHomem: "assets/chars/de_homem.png",
        imgMulher: "assets/chars/de_mulher.png",
        classesBase: ["Dark_Fighter", "Dark_Mage"],
        desc: "High offense and speed, but lower health. Masters of dark arts and critical hits."
    },
    "Elf": {
        imgDestaque: "assets/chars/casal_elf.png",
        imgHomem: "assets/chars/elf_homem.png",   
        imgMulher: "assets/chars/elf_mulher.png", 
        classesBase: ["Elf_Fighter", "Elf_Mage"],
        desc: "Extremely fast and agile. Experts in archery and supportive white magic."
    },
    "Orc": {
        imgDestaque: "assets/chars/casal_orc.png", 
        imgHomem: "assets/chars/orc_homem.png",    
        imgMulher: "assets/chars/orc_mulher.png",  
        classesBase: ["Orc_Fighter", "Orc_Mage"],
        desc: "Incredible strength and highest vitality. They crush enemies with raw power."
    },
    "Dwarf": {
        imgDestaque: "assets/chars/casal_dwarf.png", 
        imgHomem: "assets/chars/dwarf_homem.png",    
        imgMulher: "assets/chars/dwarf_mulher.png",  
        classesBase: ["Dwarven Fighter"],
        desc: "Masters of crafting and resource gathering. Extremely sturdy and rich."
    }
};

let etapaAtual = "RACE"; // Etapas: RACE, GENDER, CLASS, NAME
let indexSelecao = 0;

let opcoes = {
    RACE: Object.keys(radarDeRacas), 
    GENDER: ["Male", "Female"],
    CLASS: [],
    NAME: []
};

function validarLogin() { 
    // Agora gerenciado pelo AuthEngine.js
    console.log("Login redirecionado para AuthEngine");
} 

function navegarSelecao(direcao) { 
    indexSelecao = (indexSelecao + direcao + opcoes[etapaAtual].length) % opcoes[etapaAtual].length; 
    
    // Feedback visual de transição se for imagem
    const img = document.querySelector('.creation-display-mobile img');
    if (img) {
        img.style.transform = `translateX(${direcao * -20}px) scale(0.95)`;
        img.style.opacity = '0.5';
        setTimeout(() => {
            atualizarPreview();
        }, 150);
    } else {
        atualizarPreview();
    }
}

function setGender(sexo) { 
    charGender = sexo; 
    atualizarPreview(); 
}

let criacaoEmAndamento = false;
async function proximaEtapa() { 
    if (criacaoEmAndamento) return;

    if (etapaAtual === "RACE") { 
        window.charRace = opcoes.RACE[indexSelecao]; 
        etapaAtual = "GENDER"; 
        indexSelecao = 0; 
        document.getElementById('btn-voltar-criacao').style.display = "block"; 
    } else if (etapaAtual === "GENDER") { 
        etapaAtual = "CLASS"; 
        indexSelecao = 0; 
        opcoes.CLASS = radarDeRacas[window.charRace].classesBase;
    } else if (etapaAtual === "CLASS") { 
        window.charClass = opcoes.CLASS[indexSelecao]; 
        etapaAtual = "NAME";
        indexSelecao = 0;
    } else if (etapaAtual === "NAME") {
        const inputName = document.getElementById('input-new-char-name');
        const desiredName = inputName ? inputName.value.trim() : "";

        const _msg = typeof window.t === 'function' ? window.t : function (k) { return k; };
        if (!desiredName || desiredName.length < 3) {
            return window.l2Alert(_msg('character.nameTooShort'));
        }

        if (desiredName.length > 16) {
            return window.l2Alert(_msg('character.nameTooLong'));
        }

        if (window.AuthEngine) {
            if (!AuthEngine.isValidName(desiredName)) {
                return window.l2Alert(_msg('character.nameInvalid'));
            }
            
            const nameTaken = await AuthEngine.isNameTaken(desiredName);
            if (nameTaken) {
                return window.l2Alert(_msg('character.nameTaken'));
            }
        }

        criacaoEmAndamento = true;
        window.charName = desiredName;
        
        if (window.AuthEngine) {
            AuthEngine.showLoading(typeof window.t === 'function' ? window.t('loading.summoningHero') : 'Summoning Hero...');
        }

        // Link char to current account before starting
        if (window.AuthEngine) {
            await AuthEngine.linkCharacterToAccount(window.charName);
        }
        
        // Simula delay para efeito de "criação" no banco
        setTimeout(() => {
            iniciarJogo(); 
            criacaoEmAndamento = false;
            if (window.AuthEngine) AuthEngine.hideLoading();
        }, 1500);
        return;
    } 
    atualizarPreview(); 
}

function voltarEtapa() { 
    if (etapaAtual === "GENDER") { 
        etapaAtual = "RACE"; 
        indexSelecao = opcoes.RACE.indexOf(window.charRace); 
        document.getElementById('btn-voltar-criacao').style.display = "none"; 
    } else if (etapaAtual === "CLASS") { 
        etapaAtual = "GENDER"; 
        indexSelecao = window.charGender === "Male" ? 0 : 1; 
    } else if (etapaAtual === "NAME") {
        etapaAtual = "CLASS";
        indexSelecao = opcoes.CLASS.indexOf(window.charClass);
    }
    atualizarPreview(); 
}

function atualizarPreview() {
    const tt = typeof window.t === 'function' ? window.t : function (k) { return k; };
    const container = document.getElementById('selection-container'); 
    const stepTitle = document.getElementById('creation-step-title');
    const infoName = document.getElementById('creation-info-name');
    const infoDesc = document.getElementById('creation-info-desc');
    const btnConfirm = document.getElementById('btn-confirmar-criacao');
    
    // Atualiza os pontos de progresso
    document.querySelectorAll('.step-dot').forEach((dot, idx) => {
        const stepNum = idx + 1;
        dot.classList.remove('active', 'completed');
        
        let currentStepNum = 1;
        if (etapaAtual === "GENDER") currentStepNum = 2;
        if (etapaAtual === "CLASS") currentStepNum = 3;
        if (etapaAtual === "NAME") currentStepNum = 4;
        
        if (stepNum === currentStepNum) dot.classList.add('active');
        if (stepNum < currentStepNum) dot.classList.add('completed');
    });

    container.innerHTML = '';
    
    if (etapaAtual === "RACE") {
        stepTitle.innerText = tt('creation.stepRace');
        const raca = (radarDeRacas && radarDeRacas[opcoes.RACE[indexSelecao]]) ? opcoes.RACE[indexSelecao] : "Human";
        const dados = radarDeRacas[raca];
        infoName.innerText = raca;
        infoDesc.innerText = dados.desc;
        btnConfirm.innerText = tt('creation.confirmRace');

        container.innerHTML = `
            <div class="creation-display-mobile">
                <div class="nav-arrow left" onclick="navegarSelecao(-1)">❮</div>
                <img src="${dados.imgDestaque}" style="opacity: 1; transform: translateY(20px);">
                <div class="nav-arrow right" onclick="navegarSelecao(1)">❯</div>
            </div>
        `;
    } 
    else if (etapaAtual === "GENDER") {
        stepTitle.innerText = tt('creation.stepGender');
        infoName.innerText = window.charRace;
        infoDesc.innerText = tt('creation.genderBlurb');
        btnConfirm.innerText = tt('creation.confirmGender');

        const dados = radarDeRacas[window.charRace];
        container.innerHTML = `
            <div class="gender-grid">
                <div class="gender-option ${window.charGender === 'Male' ? 'selected' : ''}" onclick="window.charGender='Male'; atualizarPreview();">
                    <img src="${dados.imgHomem}">
                    <div class="class-name">${tt('creation.genderMale')}</div>
                </div>
                <div class="gender-option ${window.charGender === 'Female' ? 'selected' : ''}" onclick="window.charGender='Female'; atualizarPreview();">
                    <img src="${dados.imgMulher}">
                    <div class="class-name">${tt('creation.genderFemale')}</div>
                </div>
            </div>
        `;
    } 
    else if (etapaAtual === "CLASS") {
        stepTitle.innerText = tt('creation.stepClass');
        const cl = opcoes.CLASS[indexSelecao];
        infoName.innerText = cl.replace("_", " ");
        
        const isMage = cl.toLowerCase().includes('mage') || cl.toLowerCase().includes('shaman') || cl.toLowerCase().includes('oracle') || cl.toLowerCase().includes('wizard');
        infoDesc.innerText = isMage ? tt('creation.classDescMage') : tt('creation.classDescWarrior');
        btnConfirm.innerText = tt('creation.nextIdentity');

        let classCards = opcoes.CLASS.map((c, i) => {
            const isMageItem = c.toLowerCase().includes('mage') || c.toLowerCase().includes('shaman') || c.toLowerCase().includes('oracle') || c.toLowerCase().includes('wizard');
            const icon = isMageItem ? "🔮" : "⚔️";
            return `
                <div class="class-card ${indexSelecao === i ? 'selected' : ''}" onclick="indexSelecao=${i}; atualizarPreview();">
                    <div class="class-icon-circle">${icon}</div>
                    <div style="flex: 1;">
                        <div class="class-name" style="font-size: 0.9em;">${c.replace("_", " ")}</div>
                        <div style="color: #666; font-size: 0.65em; text-transform: uppercase;">${isMageItem ? tt('creation.pathMystic') : tt('creation.pathWarrior')}</div>
                    </div>
                </div>
            `;
        }).join('');

        const dados = radarDeRacas[window.charRace];
        const previewImg = (window.charGender === "Male") ? dados.imgHomem : dados.imgMulher;

        container.innerHTML = `
            <div class="creation-display-mobile" style="height: 160px; margin-bottom: 5px;">
                <img src="${previewImg}" style="height: 140%; transform: translateY(15px);">
            </div>
            <div class="class-selector">
                ${classCards}
            </div>
        `;
    }
    else if (etapaAtual === "NAME") {
        stepTitle.innerText = tt('creation.stepName');
        infoName.innerText = tt('creation.heroIdentity');
        infoDesc.innerText = tt('creation.nameBlurb');
        btnConfirm.innerText = tt('creation.createCharacter');

        const dados = radarDeRacas[window.charRace];
        const previewImg = (window.charGender === "Male") ? dados.imgHomem : dados.imgMulher;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 10px;">
                <div class="creation-display-mobile" style="height: 140px; margin-bottom: 0;">
                    <img src="${previewImg}" style="height: 140%; transform: translateY(10px);">
                </div>
                
                <div style="width: 100%; max-width: 280px; background: rgba(0,0,0,0.4); border: 1px solid #3d2b1f; padding: 10px; border-radius: 6px; box-shadow: inset 0 0 15px rgba(0,0,0,0.5);">
                    <div style="color: #88745c; font-size: 0.6em; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #3d2b1f; padding-bottom: 3px; letter-spacing: 1px;">${tt('creation.summaryTitle')}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75em; margin-bottom: 4px;">
                        <span style="color: #666;">${tt('creation.summaryRaceGender')}</span>
                        <span style="color: #fff; font-family: 'Cinzel';">${window.charRace} ${window.charGender}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75em;">
                        <span style="color: #666;">${tt('creation.summaryPath')}</span>
                        <span style="color: #facc15; font-family: 'Cinzel';">${window.charClass.replace('_', ' ')}</span>
                    </div>
                </div>

                <div style="width: 100%; max-width: 280px; margin-top: 5px;">
                    <input type="text" id="input-new-char-name" class="login-field" placeholder="${tt('creation.namePlaceholder')}" maxlength="16" style="text-align: center; font-size: 1.1em; letter-spacing: 2px; border-color: #ca8a04; background: rgba(20,15,10,0.9); margin-bottom: 0;">
                    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 5px; opacity: 0.7;">
                        <p style="color: #88745c; font-size: 0.6em; font-weight: bold;">${tt('creation.nameHintAz')}</p>
                        <p style="color: #88745c; font-size: 0.6em; font-weight: bold;">${tt('creation.nameHintLen')}</p>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const input = document.getElementById('input-new-char-name');
            if (input) input.focus();
        }, 100);
    }
}

function mudarTela(id) { 
    // Esconde absolutamente todas as telas principais primeiro (Garantia de Ouro)
    // Usamos display: none !important para evitar qualquer conflito com outras classes
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active-screen');
        s.style.setProperty('display', 'none', 'important');
        s.style.zIndex = "10";
    });

    const gameRoot = document.querySelector('.game-container');
    if (gameRoot) {
        if (id === 'screen-game') gameRoot.classList.add('game-ingame');
        else gameRoot.classList.remove('game-ingame');
    }
    
    // Mostra apenas a tela solicitada
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active-screen');
        target.style.setProperty('display', 'flex', 'important'); 
        target.style.zIndex = "100"; // Traz para a frente de tudo

        // Chat/log: visível só com .game-container.game-ingame (ver style.css)

        // Garante que os conteúdos internos do jogo (como perfil) 
        // também sumam se a tela principal for trocada para login ou criação.
        if (id !== 'screen-game') {
            if (typeof fecharTodosModaisBackdropStack === 'function') fecharTodosModaisBackdropStack();
            document.querySelectorAll('.screen-content').forEach(sc => {
                sc.style.display = 'none';
            });
        }
    }
}

// --- SISTEMA DE MODAIS E TRAVAS DE INTERAÇÃO ---
let modaisAtivos = [];

function toggleModalBackdrop(id, show, zIndex = 1500) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    if (show) {
        if (!modaisAtivos.includes(id)) modaisAtivos.push(id);
        overlay.style.display = 'block';
        overlay.style.zIndex = zIndex - 1;
    } else {
        modaisAtivos = modaisAtivos.filter(m => m !== id);
        if (modaisAtivos.length === 0) {
            overlay.style.display = 'none';
        } else {
            // Se ainda houver modais, ajusta o z-index para o anterior
            const prevModal = document.getElementById(modaisAtivos[modaisAtivos.length - 1]);
            if (prevModal && prevModal.style.zIndex) {
                overlay.style.zIndex = parseInt(prevModal.style.zIndex) - 1;
            } else {
                overlay.style.zIndex = 1499;
            }
        }
    }
}

window.abrirModal = function(id, zIndex = 1500) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Se já estiver visível, apenas ajusta o z-index e o overlay
    if (el.style.display === 'flex') {
        el.style.zIndex = zIndex;
        toggleModalBackdrop(id, true, zIndex);
        return;
    }

    el.style.display = 'flex';
    el.style.zIndex = zIndex;
    toggleModalBackdrop(id, true, zIndex);
}

window.fecharModal = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    toggleModalBackdrop(id, false);
}

window.fecharTopModal = function() {
    if (modaisAtivos.length === 0) return;
    const topModalId = modaisAtivos[modaisAtivos.length - 1];
    
    // Lista de funções de fechar específicas para garantir que limpam o estado
    if (topModalId === 'janela-item-acao') { if(typeof fecharJanelaAcao === 'function') fecharJanelaAcao(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-market-registrar') { if(typeof fecharModalRegistrarMercado === 'function') fecharModalRegistrarMercado(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-market-seletor') { if(typeof fecharSeletorItemMarket === 'function') fecharSeletorItemMarket(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-venda') { if(typeof fecharVenda === 'function') fecharVenda(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-loja') { if(typeof fecharLoja === 'function') fecharLoja(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-enchant') { if(typeof fecharEnchant === 'function') fecharEnchant(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-augment') { if(typeof fecharAugment === 'function') fecharAugment(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-augment-acao') { if(typeof fecharAugmentAcao === 'function') fecharAugmentAcao(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-augment-resultado') { if(typeof fecharAugmentResultado === 'function') fecharAugmentResultado(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-craft') { if(typeof fecharJanelaCraft === 'function') fecharJanelaCraft(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-craft-resultado') { if(typeof fecharCraftResultado === 'function') fecharCraftResultado(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-raid-lobby') { if(typeof fecharLobbyRaid === 'function') fecharLobbyRaid(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-raid-loot') { if(typeof recolherLootRaid === 'function') recolherLootRaid(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-classes') { if(typeof fecharMenuClasses === 'function') fecharMenuClasses(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-bloqueio-grade') { if(typeof fecharJanelaBloqueioGrade === 'function') fecharJanelaBloqueioGrade(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-spellbook') { if(typeof fecharSpellbook === 'function') fecharSpellbook(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-missoes-diarias') { if(typeof fecharMissoesDiarias === 'function') fecharMissoesDiarias(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-daily-boss') { if(typeof fecharJanelaDailyBoss === 'function') fecharJanelaDailyBoss(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-status-detalhado') { if(typeof fecharStatusDetalhado === 'function') fecharStatusDetalhado(); else fecharModal(topModalId); }
    else if (topModalId === 'modal-perfil-ranking') { document.getElementById('modal-perfil-ranking').style.display='none'; toggleModalBackdrop('modal-perfil-ranking', false); }
    else if (topModalId === 'janela-mailbox') { fecharModal(topModalId); }
    else if (topModalId === 'janela-seletor-atalho-global') { if(typeof fecharSeletorGlobal === 'function') fecharSeletorGlobal(); else fecharModal(topModalId); }
    else {
        fecharModal(topModalId);
    }
}

/** Fecha todos os modais que usam #modal-overlay (stack modaisAtivos). Use ao sair da tela ou navegar para evitar véu escuro órfão. */
function fecharTodosModaisBackdropStack() {
    try {
        for (let i = 0; i < 48 && modaisAtivos.length > 0; i++) {
            fecharTopModal();
        }
    } catch (e) { /* noop */ }
    if (modaisAtivos.length) modaisAtivos.length = 0;
    var mo = document.getElementById('modal-overlay');
    if (mo) mo.style.display = 'none';
}
window.fecharTodosModaisBackdropStack = fecharTodosModaisBackdropStack;

function abrirNpc(npcId) { 
    document.getElementById('praca-cidade').style.display = 'none'; 
    document.querySelectorAll('.npc-menu').forEach(menu => menu.style.display = 'none'); 
    document.getElementById('menu-' + npcId).style.display = 'flex'; 
    if (npcId === 'clans' && typeof renderizarClans === 'function') renderizarClans();
}
function fecharNpc() { document.querySelectorAll('.npc-menu').forEach(menu => menu.style.display = 'none'); document.getElementById('praca-cidade').style.display = 'block'; }

function abrirMenuSocial(menuId) {
    // Esconde absolutamente todos os sub-menus antes de abrir o novo
    document.querySelectorAll('.npc-menu').forEach(menu => menu.style.display = 'none'); 

    document.getElementById('praca-social').style.display = 'none';
    if (document.getElementById('menu-social-' + menuId)) {
        document.getElementById('menu-social-' + menuId).style.display = 'flex';
    }
    if (menuId === 'market') {
        mudarAbaMarket('buy');
    } else if (menuId === 'clans') {
        if (typeof renderizarClans === 'function') renderizarClans();
    }
}

function fecharNpcSocial() {
    let pracaSocial = document.getElementById('praca-social');
    if (pracaSocial) pracaSocial.style.display = 'block';
    if (document.getElementById('menu-social-ranking')) document.getElementById('menu-social-ranking').style.display = 'none';
    if (document.getElementById('menu-social-market')) document.getElementById('menu-social-market').style.display = 'none';
    if (document.getElementById('menu-social-clans')) document.getElementById('menu-social-clans').style.display = 'none';
}

function irPara(lugar) {
    let telaVitoria = document.getElementById('janela-vitoria');
    if (telaVitoria && telaVitoria.style.display === 'flex') return; 

    if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.ativo) {
        escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in an Olympiad duel! Finish or leave the arena.</span>`);
        return;
    }

    if (typeof RaidEngine !== 'undefined' && RaidEngine.ativo) {
        escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in the Boss arena! Use FLEE or finish the fight.</span>`);
        return;
    }

    if (lugar !== 'floresta' && document.getElementById('tela-floresta').style.display === 'flex' && monstrosAtivos.length > 0) {
        escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in combat! Defeat the monster or use the FLEE button!</span>`);
        return; 
    }

    if (typeof fecharTodosModaisBackdropStack === 'function') fecharTodosModaisBackdropStack();

    // 1. Esconder Todas as Telas
    fecharNpc();
    fecharNpcSocial();
    document.getElementById('tela-cidade').style.display = 'none'; 
    document.getElementById('tela-floresta').style.display = 'none'; 
    document.getElementById('tela-inventario').style.display = 'none'; 
    document.getElementById('tela-perfil').style.display = 'none'; 
    if (document.getElementById('tela-world')) document.getElementById('tela-world').style.display = 'none'; 
    if (document.getElementById('tela-social')) document.getElementById('tela-social').style.display = 'none';
    if (document.getElementById('tela-olympiad-arena')) document.getElementById('tela-olympiad-arena').style.display = 'none';
    if (document.getElementById('tela-clan-war')) document.getElementById('tela-clan-war').style.display = 'none';
    if (document.getElementById('tela-raid-arena')) document.getElementById('tela-raid-arena').style.display = 'none';
    
    // Controle de Visibilidade da Barra de Atalhos Global
    const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
    if (barraGlobal) {
        const telasComAtalho = ['floresta', 'inventario', 'clanwar'];
        barraGlobal.style.display = telasComAtalho.includes(lugar) ? 'grid' : 'none';
    }
    
    // 2. Mostrar a Tela Solicitada e Configurar Estado
    if (lugar === 'cidade') { 
        document.getElementById('tela-cidade').style.display = 'flex'; 
        fecharNpc(); 
        pararAtaqueMonstro(); 
        // Força atualização de presença ao entrar na cidade
        if (window.SupabaseAPI && window.charName) {
            window.SupabaseAPI.updatePresence(window.charName, {});
        }
    }
    
    if (lugar === 'world') { 
        const tw = document.getElementById('tela-world');
        if(tw) {
            tw.style.display = 'block';
            const container = tw.querySelector('.world-container');
            if (container) container.scrollTop = 0;
        }
        pararAtaqueMonstro(); 
        if (typeof atualizarWorldDailyBossUI === 'function') atualizarWorldDailyBossUI();
    }
    
    if (lugar === 'floresta') { 
        document.getElementById('tela-floresta').style.display = 'flex'; 
        if(typeof prepararTelaCacada === 'function') prepararTelaCacada(); 
        // CORREÇÃO: Força renderização para garantir que a barra seja movida para o body
        if(typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); 
    }
    
    if (lugar === 'inventario') { 
        document.getElementById('tela-inventario').style.display = 'flex'; 
        if(typeof renderizarInventario === 'function') renderizarInventario(); 
        pararAtaqueMonstro(); 
        // CORREÇÃO: Força renderização para garantir que a barra seja movida para o body
        if(typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); 
    }
    
    if (lugar === 'perfil') { 
        document.getElementById('tela-perfil').style.display = 'flex';
        var _psp = document.querySelector('#tela-perfil .profile-scroll-pane');
        if (_psp) _psp.scrollTop = 0;
        if(typeof renderizarPerfil === 'function') renderizarPerfil(); 
        atualizarVisualPaperdoll(); 
        pararAtaqueMonstro(); 
        requestAnimationFrame(function () {
            var p2 = document.querySelector('#tela-perfil .profile-scroll-pane');
            if (p2) p2.scrollTop = 0;
        });
    }
    
    if (lugar === 'social') {
        document.getElementById('tela-social').style.display = 'block';
        fecharNpcSocial(); // Retorna sempre ao hub principal
        if(typeof renderizarSocial === 'function') renderizarSocial();
        pararAtaqueMonstro();
    }

    if (lugar === 'clanwar') {
        const tela = document.getElementById('tela-clan-war');
        if (tela) {
            tela.style.display = 'flex';
            // CORREÇÃO: Força renderização para garantir que a barra seja movida para o hook da arena se necessário
            if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
            pararAtaqueMonstro();
        }
    }
    
    // 3. Atualizar Botões do Menu Inferior
    let btnPerfil = document.getElementById('btn-tab-perfil'); if(btnPerfil) btnPerfil.classList.toggle('active', lugar === 'perfil');
    let btnCidade = document.getElementById('btn-tab-cidade'); if(btnCidade) btnCidade.classList.toggle('active', lugar === 'cidade'); 
    let btnInv = document.getElementById('btn-tab-inventario'); if(btnInv) btnInv.classList.toggle('active', lugar === 'inventario');
    let btnWorld = document.getElementById('btn-tab-world'); if(btnWorld) btnWorld.classList.toggle('active', lugar === 'world');
    let btnSocial = document.getElementById('btn-tab-social'); if(btnSocial) btnSocial.classList.toggle('active', lugar === 'social');
}

function renderizarSocial() {
    if (typeof getOlympiadRank !== 'function') return;
    
    // Inicia sistema de mercado se ainda não foi (Garante persistência)
    if (typeof iniciarSistemaMercado === 'function') iniciarSistemaMercado();

    let rankData = getOlympiadRank(olympiadPoints);
    
    document.getElementById('social-tier-name').innerText = rankData.nomeCompleto || rankData.tier;
    document.getElementById('social-mmr-points').innerText = rankData.pontosTotais;
    
    let pct = rankData.porcentagem;
    document.getElementById('social-tier-progress').style.width = pct + '%';
    
    if (rankData.tier === "Mythic") {
        document.getElementById('social-tier-progress-text').innerText = (typeof window.t === 'function') ? window.t('game.social.tierMax') : 'MAX';
        document.getElementById('social-next-tier').innerText = (typeof window.t === 'function') ? window.t('game.social.tierNone') : 'None';
    } else {
        document.getElementById('social-tier-progress-text').innerText = `${rankData.progressoAtual} / ${rankData.maxDivisao}`;
        document.getElementById('social-next-tier').innerText = rankData.nextTier;
    }
    
    document.getElementById('social-wins').innerText = olympiadWins || 0;
    document.getElementById('social-losses').innerText = olympiadLosses || 0;
    
    // Muda a cor e o ícone baseados no Tier
    let color = "#e9d5ff";
    let icon = "🏆";
    let glow = "rgba(126,34,206,0.35)";
    
    switch(rankData.tier) {
        case "Paper": color = "#e5e7eb"; icon = "📄"; glow = "rgba(229,231,235,0.2)"; break;
        case "Wood": color = "#b45309"; icon = "🪵"; glow = "rgba(180,83,9,0.3)"; break;
        case "Copper": color = "#d97706"; icon = "🥉"; glow = "rgba(217,119,6,0.4)"; break;
        case "Silver": color = "#9ca3af"; icon = "🥈"; glow = "rgba(156,163,175,0.5)"; break;
        case "Gold": color = "#facc15"; icon = "🥇"; glow = "rgba(250,204,21,0.6)"; break;
        case "Platinum": color = "#38bdf8"; icon = "💎"; glow = "rgba(56,189,248,0.6)"; break;
        case "Diamond": color = "#818cf8"; icon = "💠"; glow = "rgba(129,140,248,0.7)"; break;
        case "Legendary": color = "#f43f5e"; icon = "👹"; glow = "rgba(244,63,94,0.8)"; break;
        case "Mythic": color = "#a855f7"; icon = "👑"; glow = "rgba(168,85,247,0.9)"; break;
    }
    
    document.getElementById('social-tier-name').style.color = color;
    const emojiContainer = document.getElementById('social-tier-name').parentElement.previousElementSibling;
    if (emojiContainer) emojiContainer.innerText = icon; // Atualiza o emoji grande

    // ATUALIZAÇÃO: Informações da Temporada
    if (typeof RankingSeasons !== 'undefined') {
        const now = new Date();
        const seasonName = `${now.toLocaleString('en-US', { month: 'long' })} / ${now.getFullYear()}`;
        const timeLeft = RankingSeasons.getTimeLeft();
        
        const nameEl = document.getElementById('season-name-display');
        const timerEl = document.getElementById('season-timer-display');
        
        if (nameEl) nameEl.innerText = seasonName;
        if (timerEl) timerEl.innerText = `${timeLeft.days}d ${timeLeft.hours}h`;
    }
}

function mudarAbaSocial(aba) {
    // Esconde todas as abas sociais
    document.getElementById('social-tab-meu').style.display = 'none';
    document.getElementById('social-tab-mundial').style.display = 'none';
    const tabPremios = document.getElementById('social-tab-premios');
    if (tabPremios) tabPremios.style.display = 'none';

    // Reseta estilo dos botões
    const btnMeu = document.getElementById('btn-social-meu');
    const btnMundial = document.getElementById('btn-social-mundial');
    const btnPremios = document.getElementById('btn-social-premios');

    if (btnMeu) { btnMeu.style.background = '#444'; btnMeu.style.color = '#aaa'; }
    if (btnMundial) { btnMundial.style.background = '#444'; btnMundial.style.color = '#aaa'; }
    if (btnPremios) { btnPremios.style.background = '#444'; btnPremios.style.color = '#aaa'; }

    if (aba === 'meu') {
        if (btnMeu) { btnMeu.style.background = '#7e22ce'; btnMeu.style.color = '#fff'; }
        document.getElementById('social-tab-meu').style.display = 'flex';
        renderizarSocial();
    } else if (aba === 'mundial') {
        if (btnMundial) { btnMundial.style.background = '#3b82f6'; btnMundial.style.color = '#fff'; }
        document.getElementById('social-tab-mundial').style.display = 'flex';
        renderizarRankingMundial();
    } else if (aba === 'premios') {
        if (btnPremios) { btnPremios.style.background = '#ca8a04'; btnPremios.style.color = '#fff'; }
        if (tabPremios) tabPremios.style.display = 'flex';
        renderizarPremiosRanking();
    }
}

function renderizarPremiosRanking() {
    const listCont = document.getElementById('season-rewards-list');
    if (!listCont || typeof RankingSeasons === 'undefined') return;

    let html = '';
    const tiers = Object.keys(RankingSeasons.SEASON_REWARDS);
    
    // Inverte para mostrar do maior para o menor
    [...tiers].reverse().forEach(tier => {
        const rew = RankingSeasons.SEASON_REWARDS[tier];
        let color = "#fff";
        let icon = "🏆";
        
        switch(tier) {
            case "Paper": color = "#e5e7eb"; icon = "📄"; break;
            case "Wood": color = "#b45309"; icon = "🪵"; break;
            case "Copper": color = "#d97706"; icon = "🥉"; break;
            case "Silver": color = "#9ca3af"; icon = "🥈"; break;
            case "Gold": color = "#facc15"; icon = "🥇"; break;
            case "Platinum": color = "#38bdf8"; icon = "💎"; break;
            case "Diamond": color = "#818cf8"; icon = "💠"; break;
            case "Legendary": color = "#f43f5e"; icon = "👹"; break;
            case "Mythic": color = "#a855f7"; icon = "👑"; break;
        }

        let itemsHtml = rew.items.map(it => `
            <div style="display:flex; align-items:center; gap:4px; font-size:9px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                <span style="color:#fff;">${it.nome}</span>
                <b style="color:#facc15;">x${it.qtd}</b>
            </div>
        `).join('');

        html += `
            <div style="background: rgba(15,15,20,0.8); border: 1px solid ${color}33; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2em;">${icon}</span>
                        <span style="font-family: 'Cinzel'; color: ${color}; font-weight: bold; font-size: 0.9em;">${tier}</span>
                    </div>
                    <div style="font-size: 0.7em; color: #88745c; font-weight: bold;">MONTHLY REWARD</div>
                </div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="coin-icon coin-adena" style="width:12px; height:12px;"></div>
                        <span style="color:#facc15; font-size:11px; font-weight:bold; font-family:Tahoma;">${rew.adena.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="coin-icon coin-ancient" style="width:12px; height:12px;"></div>
                        <span style="color:#60a5fa; font-size:11px; font-weight:bold; font-family:Tahoma;">${rew.coins.toLocaleString()}</span>
                    </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });

    listCont.innerHTML = html;
}

async function renderizarRankingMundial() {
    let listaHTML = document.getElementById('global-ranking-list');
    if (!listaHTML) return;
    
    // Mostra um loading rápido se estiver buscando
    if (!RankingManager.realPlayers.length && typeof buscarRankingGlobalReal === 'function') {
        listaHTML.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">' + ((typeof window.t === 'function') ? window.t('game.ladder.loadingWorld') : 'Loading world ladder...') + '</div>';
    }

    // 1. Obter a lista combinada (Bots + Player Atual + Real Players)
    let todosJogadores = await RankingManager.getMergedRanking();
    
    function escapeHtmlLite(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 3. Renderizar o HTML
    let html = '';
    todosJogadores.forEach((jog, index) => {
        let posicao = index + 1;
        let corPosicao = "#a1a1aa"; // Cinza padrão
        let fundoPosicao = "#27272a";
        
        if (posicao === 1) { corPosicao = "#000"; fundoPosicao = "#facc15"; } // Ouro
        else if (posicao === 2) { corPosicao = "#000"; fundoPosicao = "#9ca3af"; } // Prata
        else if (posicao === 3) { corPosicao = "#000"; fundoPosicao = "#b45309"; } // Bronze
        
        let rankData = getOlympiadRank(jog.olympiadPoints);
        let iconeTier = "📄";
        switch(rankData.tier) {
            case "Paper": iconeTier = "📄"; break;
            case "Wood": iconeTier = "🪵"; break;
            case "Copper": iconeTier = "🥉"; break;
            case "Silver": iconeTier = "🥈"; break;
            case "Gold": iconeTier = "🥇"; break;
            case "Platinum": iconeTier = "💎"; break;
            case "Diamond": iconeTier = "💠"; break;
            case "Legendary": iconeTier = "👹"; break;
            case "Mythic": iconeTier = "👑"; break;
        }

        let isLocal = (jog.nome === charName);
        let corNome = isLocal ? "#22c55e" : (jog.isRealPlayer ? "#60a5fa" : "#e2e8f0");
        let glowPlayer = isLocal ? "box-shadow: inset 0 0 10px rgba(34, 197, 94, 0.2); border: 1px solid #22c55e;" : (jog.isRealPlayer ? "border: 1px solid #3b82f6;" : "");

        let ascSub = '';
        if (!jog.isBot && (jog.ascensionTitle || typeof jog.renown === 'number')) {
            const ren = typeof jog.renown === 'number' ? jog.renown : 0;
            const lineRaw =
                typeof window.t === 'function'
                    ? window.t('game.endgame.ladderAscension', { title: jog.ascensionTitle || '', renown: ren })
                    : (jog.ascensionTitle || '') + ' · Renown ' + ren;
            ascSub = `<div style="color:#a78bfa;font-size:0.68em;margin-top:3px;line-height:1.2;">${escapeHtmlLite(lineRaw)}</div>`;
        }

        html += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: #18181b; padding: 8px 10px; border-radius: 6px; margin-bottom: 4px; cursor: pointer; transition: background 0.2s; ${glowPlayer}" onclick="abrirPerfilJogadorRanking('${jog.nome}', ${jog.isBot})" onmouseover="this.style.background='#27272a'" onmouseout="this.style.background='#18181b'">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${fundoPosicao}; color: ${corPosicao}; display: flex; align-items: center; justify-content: center; font-size: 0.7em; font-weight: bold;">
                    ${posicao}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <div style="color: ${corNome}; font-weight: bold; font-size: 0.9em; display: flex; align-items: center; gap: 5px;">
                        ${jog.nome} <span style="font-size: 0.75em; color: #a1a1aa; font-weight: normal;">(Lv.${jog.nivel})</span>
                    </div>
                    <div style="color: #71717a; font-size: 0.7em;">${jog.classe}</div>
                    ${ascSub}
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <div style="color: #c084fc; font-weight: bold; font-size: 0.85em;">${jog.olympiadPoints} MMR</div>
                <div style="font-size: 0.8em;">${iconeTier} <span style="color:#a1a1aa; font-size:0.85em;">${rankData.nomeCompleto || rankData.tier}</span></div>
            </div>
        </div>
        `;
    });
    
    listaHTML.innerHTML = html;
}

function abrirPerfilJogadorRanking(nome, isBot) {
    if (!isBot && nome === charName) {
        irPara('perfil');
        return;
    }

    let bot = null;

    // Se já foi definido externamente (como no caso de outro jogador real)
    if (window.botAtualVisualizado && window.botAtualVisualizado.nome === nome) {
        bot = window.botAtualVisualizado;
    } else {
        let botData = null;
        let baseRanking = (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.dbRanking && OlympiadEngine.dbRanking.length > 0) 
            ? OlympiadEngine.dbRanking 
            : (typeof dbBotsRanking !== 'undefined' ? dbBotsRanking : []);

        if (baseRanking.length > 0) {
            botData = baseRanking.find(b => (b.nome || b.farmBot1) === nome);
        }
        if (!botData) {
            if (!isBot && typeof abrirPerfilChat === 'function' && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI) {
                abrirPerfilChat(nome, 'Paper');
                return;
            }
            return;
        }

        bot = typeof OlympiadEngine !== 'undefined' && OlympiadEngine.gerarBotCompleto ? OlympiadEngine.gerarBotCompleto(botData) : null;
    }

    if (!bot) return;

    window.botAtualVisualizado = bot;

    abrirModal('modal-perfil-ranking', 1600);

    let rankData = typeof getOlympiadRank === 'function' ? getOlympiadRank(bot.olympiadPoints) : { nomeCompleto: 'Unranked' };

    let ascHtml = '';
    if (bot.isCloudPlayerInspection) {
        const tit = bot.ascensionTitle || '';
        const ren = typeof bot.renown === 'number' ? bot.renown : 0;
        const line =
            typeof window.t === 'function'
                ? window.t('game.endgame.inspectModalLine', { title: tit, renown: ren })
                : tit + ' · Renown ' + ren;
        ascHtml = `<div style="color:#e9d5ff;font-size:0.74em;margin-top:5px;font-weight:600;font-family:'Cinzel',serif;letter-spacing:0.03em;">${line}</div>`;
    }

    let htmlEquips = '';
    if (bot.equipamentos) {
        let arma = bot.equipamentos.arma;
        let armadura = bot.equipamentos.armadura;
        let enchant = bot.equipamentos.enchant;
        
        let armaHtml = arma ? `<div onclick="window.abrirAcaoItemBot('arma')" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; padding:6px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.background='rgba(0,0,0,0.4)'; this.style.borderColor='#333'"><img src="${arma.img}" style="width:34px; height:34px; border:1px solid #555; background:#111; border-radius:4px;"> <div style="display:flex; flex-direction:column;"><span style="color:#fde047; font-size:0.9em; font-weight:bold;">${enchant > 0 ? '+'+enchant+' ' : ''}${arma.nome}</span><span style="color:#666; font-size:0.7em; text-transform:uppercase;">Weapon</span></div></div>` : '<div style="color:#777; padding:5px;">Sem Arma</div>';
        let armaduraHtml = armadura ? `<div onclick="window.abrirAcaoItemBot('armadura')" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; padding:6px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.background='rgba(0,0,0,0.4)'; this.style.borderColor='#333'"><img src="${armadura.img}" style="width:34px; height:34px; border:1px solid #555; background:#111; border-radius:4px;"> <div style="display:flex; flex-direction:column;"><span style="color:#cbd5e1; font-size:0.9em; font-weight:bold;">${enchant > 0 ? '+'+enchant+' ' : ''}${armadura.nome}</span><span style="color:#666; font-size:0.7em; text-transform:uppercase;">Armor</span></div></div>` : '<div style="color:#777; padding:5px;">Sem Armadura</div>';
        
        let joiasHtml = '';
        if (bot.equipamentos.joias && bot.equipamentos.joias.length > 0) {
            joiasHtml = `<div style="display:flex; gap:8px; margin-top:10px; padding:5px; background:rgba(0,0,0,0.2); border-radius:6px; justify-content:center;">`;
            bot.equipamentos.joias.forEach((j, idx) => {
                joiasHtml += `<img src="${j.img}" onclick="window.abrirAcaoItemBot('joia', ${idx})" title="${enchant > 0 ? '+'+enchant+' ' : ''}${j.nome}" style="width:32px; height:32px; border:1px solid #555; background:#111; border-radius:4px; cursor:pointer; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#555'">`;
            });
            joiasHtml += `</div>`;
        }
        
        htmlEquips = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <h4 style="color:#a78bfa; margin:0 0 10px 0; font-size:0.9em;">EQUIPAMENTOS ATUAIS</h4>
                ${armaHtml}
                ${armaduraHtml}
                ${joiasHtml}
            </div>
        `;
    }

    let imgBot = "assets/chars/base_fighter.png";
    if (typeof radarDeRacas !== 'undefined' && radarDeRacas[bot.raca]) {
        // Usa a imagem masculina como padrão para o bot, ou a feminina se for mago (só para variar)
        imgBot = bot.isMage ? radarDeRacas[bot.raca].imgMulher : radarDeRacas[bot.raca].imgHomem;
    }

    let modalPerfil = document.getElementById('modal-perfil-ranking');
    if (!modalPerfil) return;

    modalPerfil.innerHTML = `
        <div class="l2-modal" style="width: 90%; max-width: 350px; padding: 20px; position: relative;">
            <button onclick="fecharTopModal()" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #aaa; font-size: 1.5em; cursor: pointer;">&times;</button>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #27272a; border: 2px solid ${bot.isMage ? '#3b82f6' : '#ef4444'}; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${imgBot}" style="width: 150%; object-fit: cover;">
                </div>
                <div>
                    <h2 style="margin: 0; color: #22c55e; font-size: 1.2em;">${bot.nome}</h2>
                    <div style="color: #a1a1aa; font-size: 0.85em;">Lv.${bot.nivel} ${bot.classe}</div>
                    <div style="color: #c084fc; font-size: 0.8em; font-weight: bold; margin-top: 2px;">${bot.olympiadPoints} MMR (${rankData.nomeCompleto})</div>
                    ${ascHtml}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85em; background: #111; padding: 10px; border-radius: 5px; border: 1px solid #333;">
                <div style="color:#ef4444;">❤️ HP: <span style="color:#fff;">${bot.maxHp}</span></div>
                <div style="color:#3b82f6;">💧 MP: <span style="color:#fff;">${bot.maxMp}</span></div>
                <div style="color:#facc15;">⚔️ P.Atk: <span style="color:#fff;">${bot.pAtk}</span></div>
                <div style="color:#c084fc;">🔮 M.Atk: <span style="color:#fff;">${bot.mAtk}</span></div>
                <div style="color:#94a3b8;">🛡️ P.Def: <span style="color:#fff;">${bot.pDef}</span></div>
                <div style="color:#818cf8;">✨ M.Def: <span style="color:#fff;">${bot.mDef}</span></div>
                <div style="color:#4ade80;">⚡ Atk.Spd: <span style="color:#fff;">${bot.atkSpd}</span></div>
                <div style="color:#fb923c;">🎯 Crit: <span style="color:#fff;">${bot.critRate}%</span></div>
            </div>
            
            ${htmlEquips}
            
            <div style="margin-top: 15px; text-align: center;">
                <button class="btn-l2" style="width: 100%; background: #3b82f6; color: white;" onclick="fecharTopModal()">FECHAR</button>
            </div>
        </div>
    `;

    modalPerfil.style.display = 'flex';
}

window.abrirAcaoItemBot = function(tipo, index = 0) {
    if (!window.botAtualVisualizado || !window.botAtualVisualizado.equipamentos) return;
    
    let bot = window.botAtualVisualizado;
    let itemBase = null;
    let enc = bot.equipamentos.enchant || 0;
    let aug = false;
    let tipoBruto = 'misc';

    if (tipo === 'arma') {
        itemBase = bot.equipamentos.arma;
        tipoBruto = itemBase.tipoItem || itemBase.tipo || 'weapon';
        aug = itemBase.augmented || false;
    } else if (tipo === 'armadura') {
        itemBase = bot.equipamentos.armadura;
        tipoBruto = itemBase.tipoItem || itemBase.tipo || 'armor';
    } else if (tipo === 'joia') {
        itemBase = bot.equipamentos.joias[index];
        tipoBruto = itemBase.tipoItem || itemBase.tipo || 'jewel';
    }

    if (!itemBase) return;

    abrirModal('janela-item-acao', 2100); 
    
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO'; 
    document.getElementById('acao-img').src = itemBase.img; 
    
    let info = typeof formatarTooltipEquipamento === 'function' ? formatarTooltipEquipamento(itemBase, enc, aug, tipoBruto) : ((typeof window.t === 'function') ? window.t('game.social.inspectDetailsUnavailable') : 'Details unavailable.');
    let descContainer = document.getElementById('acao-desc'); 
    descContainer.innerHTML = info; 
    descContainer.style.width = "100%";
    
    let btnAcao = document.getElementById('btn-acao-item'); 
    btnAcao.style.display = 'none'; // Esconde o botão de ação (pois é de outro jogador)
}

function abrirDetalhesZona(grade) {
    const dados = catalogoZonas[grade];
    if (!dados) return;

    document.getElementById('zona-detalhe-titulo').innerText = dados.nome;
    document.getElementById('zona-detalhe-grade').innerText = grade;
    document.getElementById('zona-detalhe-grade').style.backgroundColor = dados.cor;
    document.getElementById('zona-detalhe-nivel').innerText = `Lv. ${dados.nivelSugerido}`;
    document.getElementById('zona-detalhe-custo').innerText = dados.custo === 0 ? "FREE" : `${dados.custo.toLocaleString()} Adena`;
    document.getElementById('zona-detalhe-descricao').innerText = dados.descricao;

    const monstrosCont = document.getElementById('zona-detalhe-monstros');
    monstrosCont.innerHTML = dados.monstros.map(m => `<span class="zone-tag">${m}</span>`).join('');

    const recompensasCont = document.getElementById('zona-detalhe-recompensas');
    recompensasCont.innerHTML = dados.recompensas.map(r => `<span class="zone-tag" style="border-color: #ca8a04; color: #facc15;">${r}</span>`).join('');

    const btnViajar = document.getElementById('btn-confirmar-viagem');
    btnViajar.onclick = () => {
        fecharModal('janela-detalhes-zona');
        teleportarParaZona(grade);
    };

    abrirModal('janela-detalhes-zona');
}

function teleportarParaZona(grade) {
    let zonaDestino = zonasDeCaca[grade];
    if (adenas >= zonaDestino.custo) {
        fecharNpc(); 
        if (zonaDestino.custo > 0) { 
            adenas -= zonaDestino.custo; 
            escreverLog(`<span style="color:#ffcc00">` + (typeof window.t === 'function' ? window.t('game.travel.paidTravel', { cost: zonaDestino.custo, name: zonaDestino.nome }) : `You paid ${zonaDestino.custo}a and traveled to ${zonaDestino.nome}.`) + `</span>`); 
        } else { 
            escreverLog(`<span style="color:#ffcc00">` + (typeof window.t === 'function' ? window.t('game.travel.freeTravel', { name: zonaDestino.nome }) : `You traveled to ${zonaDestino.nome} for free.`) + `</span>`); 
        }
        zonaAtual = zonaDestino; 
        document.getElementById('hud-zona-nome').innerText = zonaAtual.nome; 
        monstrosAtivos = []; 
        atualizar(); 
        irPara('floresta'); 
    } else { 
        mostrarAviso(typeof window.t === 'function' ? window.t('game.travel.needAdena', { amount: zonaDestino.custo }) : `You need ${zonaDestino.custo} Adena!`); 
    }
}

function recolherLootRaid() {
    fecharModal('janela-raid-loot');
    document.getElementById('tela-raid-arena').style.display = 'none';
    
    // Garante que tudo (HP, Adenas, Coins) esteja atualizado na volta
    if (typeof atualizar === 'function') atualizar();
    
    irPara('world');
    if (typeof atualizarWorldDailyBossUI === 'function') atualizarWorldDailyBossUI();
    mostrarAviso(typeof window.t === 'function' ? window.t('game.travel.warSpoilsCollected') : 'War spoils collected!');
}

// ==========================================
// NOVO SISTEMA DE MODAIS PROFISSIONAIS (L2)
// ==========================================
window.l2Alert = function(mensagem, tituloOrOnClose, maybeOnClose) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('l2-modal-overlay');
        const body = document.getElementById('l2-modal-body');
        const title = document.getElementById('l2-modal-title');
        const footer = document.getElementById('l2-modal-footer');
        const tFn = typeof window.t === 'function' ? window.t : null;

        if (!overlay || !body) return resolve();

        let titulo = tFn ? tFn('modal.titleMessage') : 'MESSAGE';
        let onClose = null;
        if (typeof tituloOrOnClose === 'function') {
            onClose = tituloOrOnClose;
        } else if (typeof tituloOrOnClose === 'string' && tituloOrOnClose !== '') {
            titulo = tituloOrOnClose;
            if (typeof maybeOnClose === 'function') onClose = maybeOnClose;
        }

        title.innerText = titulo;
        body.innerHTML = String(mensagem).replace(/\n/g, '<br>');
        const okLabel = tFn ? tFn('modal.ok') : 'OK';
        footer.innerHTML = `<button class="btn-modal btn-modal-confirm" id="btn-l2-alert-ok">${okLabel}</button>`;

        overlay.style.display = 'flex';

        document.getElementById('btn-l2-alert-ok').onclick = () => {
            overlay.style.display = 'none';
            if (onClose) {
                try { onClose(); } catch (e) { /* ignore */ }
            }
            resolve();
        };
    });
};

window.l2Confirm = function(mensagem, titulo) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('l2-modal-overlay');
        const body = document.getElementById('l2-modal-body');
        const title = document.getElementById('l2-modal-title');
        const footer = document.getElementById('l2-modal-footer');
        const tFn = typeof window.t === 'function' ? window.t : null;

        if (!overlay || !body) return resolve(false);

        const tit = titulo ? String(titulo) : (tFn ? tFn('modal.titleConfirmation') : 'CONFIRMATION');
        title.innerText = tit;
        body.innerHTML = String(mensagem).replace(/\n/g, '<br>');
        const cancelLabel = tFn ? tFn('modal.cancel') : 'CANCEL';
        const confirmLabel = tFn ? tFn('modal.confirm') : 'CONFIRM';
        footer.innerHTML = `
            <button class="btn-modal btn-modal-cancel" id="btn-l2-confirm-no">${cancelLabel}</button>
            <button class="btn-modal btn-modal-confirm" id="btn-l2-confirm-yes">${confirmLabel}</button>
        `;

        overlay.style.display = 'flex';

        document.getElementById('btn-l2-confirm-no').onclick = () => {
            overlay.style.display = 'none';
            resolve(false);
        };

        document.getElementById('btn-l2-confirm-yes').onclick = () => {
            overlay.style.display = 'none';
            resolve(true);
        };
    });
};
