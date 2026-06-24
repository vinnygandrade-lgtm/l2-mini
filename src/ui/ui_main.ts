/**
 * UI — login, criação de personagem, navegação e modais
 * Migrado: js/ui_main.js
 */
import type { MergedRankingEntry } from '../types/game';
import { registerGlobalFn } from '../runtime/register-global';

type SeasonRewardEntry = {
    adena?: number;
    coins?: number;
    items?: Array<{ qtd?: number; id?: string; nome?: string }>;
};

// O Dicionário! Para adicionar raças no futuro, é só adicionar aqui.
const radarDeRacas = {
    "Human": {
        imgDestaque: "assets/chars/homem.png",
        imgHomem: "assets/chars/homem.png", 
        imgMulher: "assets/chars/mulher.png",      
        classesBase: ["Fighter", "Mage"],
        desc: "Balanced stats and great versatility. Capable of following any path."
    },
    "Dark Elf": {
        imgDestaque: "assets/chars/de_homem.png", 
        imgHomem: "assets/chars/de_homem.png",
        imgMulher: "assets/chars/de_mulher.png",
        classesBase: ["Dark_Fighter", "Dark_Mage"],
        desc: "High offense and speed, but lower health. Masters of dark arts and critical hits."
    },
    "Elf": {
        imgDestaque: "assets/chars/elf_homem.png",
        imgHomem: "assets/chars/elf_homem.png",   
        imgMulher: "assets/chars/elf_mulher.png", 
        classesBase: ["Elf_Fighter", "Elf_Mage"],
        desc: "Extremely fast and agile. Experts in archery and supportive white magic."
    },
    "Orc": {
        imgDestaque: "assets/chars/orc_homem.png", 
        imgHomem: "assets/chars/orc_homem.png",    
        imgMulher: "assets/chars/orc_mulher.png",  
        classesBase: ["Orc_Fighter", "Orc_Mage"],
        desc: "Incredible strength and highest vitality. They crush enemies with raw power."
    },
    "Dwarf": {
        imgDestaque: "assets/chars/dwarf_homem.png", 
        imgHomem: "assets/chars/dwarf_homem.png",    
        imgMulher: "assets/chars/dwarf_mulher.png",  
        classesBase: ["Dwarven Fighter"],
        desc: "Masters of crafting and resource gathering. Extremely sturdy and rich."
    }
};

// NOVO: Impedir criação se já houver personagem (Garantia de 1 char por conta)
function verificarLimitePersonagem() {
    if (window.AuthEngine && window.AuthEngine.availableCharacters.length >= 1) {
        window.l2Alert(typeof window.t === 'function' ? window.t('auth.charLimitReached') : "You already have a character on this account.");
        mudarTela('screen-char-select');
        return false;
    }
    return true;
}

let etapaAtual: 'RACE' | 'GENDER' | 'CLASS' | 'NAME' = 'RACE';
window.indexSelecao = 0;

type OpcoesCriacao = {
    RACE: string[];
    GENDER: string[];
    CLASS: string[];
    NAME: string[];
};

let opcoes: OpcoesCriacao = {
    RACE: Object.keys(radarDeRacas), 
    GENDER: ["Male", "Female"],
    CLASS: [],
    NAME: []
};

function validarLogin() { 
    // Agora gerenciado pelo window.AuthEngine.js
    console.log("Login redirecionado para AuthEngine");
} 

function navegarSelecao(direcao) { 
    window.indexSelecao = (window.indexSelecao + direcao + opcoes[etapaAtual].length) % opcoes[etapaAtual].length; 
    
    // Feedback visual de transição se for imagem
    const img = document.querySelector('.creation-display-mobile img') as HTMLElement | null;
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

function setGender(sexo: string) {
    window.charGender = sexo; 
    atualizarPreview(); 
}

let criacaoEmAndamento = false;
async function proximaEtapa() { 
    if (criacaoEmAndamento) return;

    if (etapaAtual === "RACE") { 
        // NOVO: Verifica limite de personagem logo no início da criação
        if (window.AuthEngine && window.AuthEngine.availableCharacters.length >= 1) {
            window.l2Alert(typeof window.t === 'function' ? window.t('auth.charLimitReached') : "Character limit reached (1 per account).");
            mudarTela('screen-char-select');
            return;
        }
        window.charRace = opcoes.RACE[window.indexSelecao]; 
        etapaAtual = "GENDER"; 
        window.indexSelecao = 0; 
        document.getElementById('btn-voltar-criacao').style.display = "block"; 
    } else if (etapaAtual === "GENDER") { 
        etapaAtual = "CLASS"; 
        window.indexSelecao = 0; 
        opcoes.CLASS = radarDeRacas[window.charRace].classesBase;
    } else if (etapaAtual === "CLASS") { 
        window.charClass = opcoes.CLASS[window.indexSelecao]; 
        etapaAtual = "NAME";
        window.indexSelecao = 0;
    } else if (etapaAtual === "NAME") {
        const inputName = document.getElementById('input-new-char-name');
        const desiredName = inputName ? (inputName as HTMLInputElement).value.trim() : "";

        const _msg = typeof window.t === 'function' ? window.t : function (k) { return k; };
        if (!desiredName || desiredName.length < 3) {
            return window.l2Alert(_msg('character.nameTooShort'));
        }

        if (desiredName.length > 16) {
            return window.l2Alert(_msg('character.nameTooLong'));
        }

        if (window.AuthEngine) {
            if (!window.AuthEngine.isValidName(desiredName)) {
                return window.l2Alert(_msg('character.nameInvalid'));
            }
            
            const nameTaken = await window.AuthEngine.isNameTaken(desiredName);
            if (nameTaken) {
                return window.l2Alert(_msg('character.nameTaken'));
            }
        }

        criacaoEmAndamento = true;
        window.charName = desiredName;
        
        if (window.AuthEngine) {
            window.AuthEngine.showLoading(typeof window.t === 'function' ? window.t('loading.summoningHero') : 'Summoning Hero...');
        }

        // Link char to current account before starting
        if (window.AuthEngine) {
            await window.AuthEngine.linkCharacterToAccount(window.charName);
        }
        
        // Simula delay para efeito de "criação" no banco
        setTimeout(() => {
            window.iniciarJogo(); 
            criacaoEmAndamento = false;
            if (window.AuthEngine) window.AuthEngine.hideLoading();
        }, 1500);
        return;
    } 
    atualizarPreview(); 
}

function voltarEtapa() { 
    if (etapaAtual === "GENDER") { 
        etapaAtual = "RACE"; 
        window.indexSelecao = opcoes.RACE.indexOf(window.charRace); 
        document.getElementById('btn-voltar-criacao').style.display = "none"; 
    } else if (etapaAtual === "CLASS") { 
        etapaAtual = "GENDER"; 
        window.indexSelecao = window.charGender === "Male" ? 0 : 1; 
    } else if (etapaAtual === "NAME") {
        etapaAtual = "CLASS";
        window.indexSelecao = opcoes.CLASS.indexOf(window.charClass);
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
        const raca = (radarDeRacas && radarDeRacas[opcoes.RACE[window.indexSelecao]]) ? opcoes.RACE[window.indexSelecao] : "Human";
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
        const cl = opcoes.CLASS[window.indexSelecao];
        infoName.innerText = cl.replace("_", " ");
        
        const isMage = cl.toLowerCase().includes('mage') || cl.toLowerCase().includes('shaman') || cl.toLowerCase().includes('oracle') || cl.toLowerCase().includes('wizard');
        infoDesc.innerText = isMage ? tt('creation.classDescMage') : tt('creation.classDescWarrior');
        btnConfirm.innerText = tt('creation.nextIdentity');

        let classCards = opcoes.CLASS.map((c, i) => {
            const isMageItem = c.toLowerCase().includes('mage') || c.toLowerCase().includes('shaman') || c.toLowerCase().includes('oracle') || c.toLowerCase().includes('wizard');
            const icon = isMageItem ? "🔮" : "⚔️";
            return `
                <div class="class-card ${window.indexSelecao === i ? 'selected' : ''}" onclick="window.indexSelecao=${i}; atualizarPreview();">
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
                    <input type="text" id="input-new-char-name" class="login-field" placeholder="${tt('creation.namePlaceholder')}" maxlength="16" style="text-align: center; font-size: 1.1em; letter-spacing: 2px; border-color: #ca8a04; background: rgba(20,15,10,0.9); margin-bottom: 0;" oninput="this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');">
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

function mudarTela(id: string) { 
    const currentActive = document.querySelector('.screen.active-screen') as HTMLElement | null;
    const target = document.getElementById(id) as HTMLElement | null;
    
    if (currentActive && currentActive.id === id) return;

    // Salva a tela atual para persistência (exceto telas de transição/login)
    if (id === 'screen-game') {
        localStorage.setItem('l2mini_last_main_screen', id);
    }

    // Se houver uma tela ativa, aplica animação de saída
    if (currentActive) {
        currentActive.classList.add('screen-transition-exit');
        setTimeout(() => {
            currentActive.classList.remove('active-screen', 'screen-transition-exit');
            currentActive.style.setProperty('display', 'none', 'important');
            
            // Ativa a nova tela
            if (target) {
                ativarNovaTela(target, id);
            }
        }, 150); // Metade do tempo da animação para suavidade
    } else {
        if (target) {
            ativarNovaTela(target, id);
        }
    }
}

function ativarNovaTela(target: HTMLElement, id: string) {
    // Esconde absolutamente todas as outras telas primeiro (Garantia de Ouro)
    document.querySelectorAll('.screen').forEach((s) => {
        const screen = s as HTMLElement;
        if (screen !== target) {
            screen.classList.remove('active-screen', 'screen-transition-enter', 'screen-transition-exit');
            screen.style.setProperty('display', 'none', 'important');
            screen.style.zIndex = '10';
        }
    });

    const gameRoot = document.querySelector('.game-container');
    if (gameRoot) {
        if (id === 'screen-game') gameRoot.classList.add('game-ingame');
        else gameRoot.classList.remove('game-ingame');
    }

    target.classList.add('active-screen', 'screen-transition-enter');
    target.style.setProperty('display', 'flex', 'important'); 
    target.style.zIndex = "100";

    // Limpa classe de animação após terminar
    setTimeout(() => {
        target.classList.remove('screen-transition-enter');
    }, 300);

    // Controle de visibilidade da barra de atalhos
    const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
    if (barraGlobal) {
        if (id !== 'screen-game') {
            barraGlobal.style.setProperty('display', 'none', 'important');
        }
    }

    // Garante que os conteúdos internos do jogo sumam se a tela principal for trocada
    if (id !== 'screen-game') {
        if (typeof fecharTodosModaisBackdropStack === 'function') fecharTodosModaisBackdropStack();
        document.querySelectorAll('.screen-content').forEach((sc) => {
            (sc as HTMLElement).style.display = 'none';
        });
    }
}

// --- SISTEMA DE MODAIS E TRAVAS DE INTERAÇÃO ---
let modaisAtivos = [];

/** Modais que só fecham pelos botões internos (clique no véu não dispensa). */
const MODAL_NO_BACKDROP_DISMISS = {
    'janela-vitoria': true
};

function toggleModalBackdrop(id, show, zIndex = 1500) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    if (show) {
        if (!modaisAtivos.includes(id)) modaisAtivos.push(id);
        overlay.style.display = 'block';
        overlay.style.zIndex = String(zIndex - 1);
    } else {
        modaisAtivos = modaisAtivos.filter(m => m !== id);
        if (modaisAtivos.length === 0) {
            overlay.style.display = 'none';
        } else {
            // Se ainda houver modais, ajusta o z-index para o anterior
            const prevModal = document.getElementById(modaisAtivos[modaisAtivos.length - 1]);
            if (prevModal && prevModal.style.zIndex) {
                overlay.style.zIndex = String(parseInt(prevModal.style.zIndex, 10) - 1);
            } else {
                overlay.style.zIndex = '1499';
            }
        }
    }
}

function abrirModal(id: string, zIndex = 1500) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Se já estiver visível, apenas ajusta o z-index e o overlay
    if (el.style.display === 'flex') {
        el.style.zIndex = String(zIndex);
        toggleModalBackdrop(id, true, zIndex);
        return;
    }

    el.style.display = 'flex';
    el.style.zIndex = String(zIndex);
    toggleModalBackdrop(id, true, zIndex);
}

function fecharModal(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    toggleModalBackdrop(id, false);
}

function fecharTopModal() {
    if (modaisAtivos.length === 0) return;
    const topModalId = modaisAtivos[modaisAtivos.length - 1];

    if (MODAL_NO_BACKDROP_DISMISS[topModalId]) return;

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
    else if (topModalId === 'janela-raid-lobby') { if(typeof window.fecharLobbyRaid === 'function') window.fecharLobbyRaid(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-raid-loot') { if(typeof recolherLootRaid === 'function') recolherLootRaid(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-classes') { if(typeof fecharMenuClasses === 'function') fecharMenuClasses(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-bloqueio-grade') { if(typeof fecharJanelaBloqueioGrade === 'function') fecharJanelaBloqueioGrade(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-spellbook') { if(typeof fecharSpellbook === 'function') fecharSpellbook(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-missoes-diarias') { if(typeof fecharMissoesDiarias === 'function') fecharMissoesDiarias(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-daily-boss') { if(typeof window.fecharJanelaDailyBoss === 'function') window.fecharJanelaDailyBoss(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-status-detalhado') { if(typeof fecharStatusDetalhado === 'function') fecharStatusDetalhado(); else fecharModal(topModalId); }
    else if (topModalId === 'janela-game-settings') { if(typeof fecharGameSettings === 'function') fecharGameSettings(); else fecharModal(topModalId); }
    else if (topModalId === 'modal-perfil-ranking') {
        const modalPerfil = document.getElementById('modal-perfil-ranking');
        if (modalPerfil) modalPerfil.style.display = 'none';
        toggleModalBackdrop('modal-perfil-ranking', false);
    }
    else if (topModalId === 'janela-mailbox') { fecharModal(topModalId); }
    else if (topModalId === 'janela-seletor-atalho-global') { if(typeof fecharSeletorGlobal === 'function') fecharSeletorGlobal(); else fecharModal(topModalId); }
    else {
        fecharModal(topModalId);
    }
}

/** Fecha todos os modais que usam #modal-overlay (stack modaisAtivos). Use ao sair da tela ou navegar para evitar véu escuro órfão. */
function fecharTodosModaisBackdropStack() {
    try {
        if (window.cacadaResumoVitoriaAtivo) {
            window.cacadaResumoVitoriaAtivo = false;
            var florestaReset = document.getElementById('tela-floresta');
            if (florestaReset) florestaReset.classList.remove('forest-hunt-summary-open');
            var vitoriaEl = document.getElementById('janela-vitoria');
            if (vitoriaEl) vitoriaEl.style.display = 'none';
            modaisAtivos = modaisAtivos.filter(function (m) { return m !== 'janela-vitoria'; });
        }
        for (let i = 0; i < 48 && modaisAtivos.length > 0; i++) {
            fecharTopModal();
        }
    } catch (e) { /* noop */ }
    if (modaisAtivos.length) modaisAtivos.length = 0;
    var mo = document.getElementById('modal-overlay');
    if (mo) mo.style.display = 'none';
}
window.fecharTodosModaisBackdropStack = fecharTodosModaisBackdropStack;

function abrirNpc(npcId: string) { 
    localStorage.setItem('l2mini_last_npc', npcId);
    const praca = document.getElementById('praca-cidade');
    if (praca) praca.style.display = 'none'; 
    document.querySelectorAll('.npc-menu').forEach((menu) => { (menu as HTMLElement).style.display = 'none'; }); 
    const menuEl = document.getElementById('menu-' + npcId);
    if (menuEl) menuEl.style.display = 'flex'; 
    if (npcId === 'clans' && typeof window.renderizarClans === 'function') {
        if (typeof window.iniciarSistemaClans === 'function') {
            void Promise.resolve(window.iniciarSistemaClans()).then(() => window.renderizarClans()).catch(e => { console.error(e); window.renderizarClans(); });
        } else {
            window.renderizarClans();
        }
    }
}
function fecharNpc() { 
    localStorage.removeItem('l2mini_last_npc');
    document.querySelectorAll('.npc-menu').forEach((menu) => { (menu as HTMLElement).style.display = 'none'; }); 
    const praca = document.getElementById('praca-cidade');
    if (praca) praca.style.display = 'block'; 
}

function abrirMenuSocial(menuId: string) {
    if (menuId === 'ranking') {
        localStorage.removeItem('l2mini_last_social_menu');
        fecharNpcSocial();
        return;
    }
    localStorage.setItem('l2mini_last_social_menu', menuId);
    document.querySelectorAll('.npc-menu').forEach((menu) => { (menu as HTMLElement).style.display = 'none'; }); 

    const pracaSocial = document.getElementById('praca-social');
    if (pracaSocial) pracaSocial.style.display = 'none';
    const subMenu = document.getElementById('menu-social-' + menuId);
    if (subMenu) subMenu.style.display = 'flex';
    if (menuId === 'market') {
        mudarAbaMarket('buy');
    } else if (menuId === 'clans') {
        const go = () => { if (typeof window.renderizarClans === 'function') window.renderizarClans(); };
        if (typeof window.iniciarSistemaClans === 'function') {
            void Promise.resolve(window.iniciarSistemaClans()).then(go).catch(err => { console.error(err); go(); });
        } else {
            go();
        }
    }
}

function fecharNpcSocial() {
    localStorage.removeItem('l2mini_last_social_menu');
    let pracaSocial = document.getElementById('praca-social');
    if (pracaSocial) pracaSocial.style.display = 'block';
    if (document.getElementById('menu-social-market')) document.getElementById('menu-social-market').style.display = 'none';
    if (document.getElementById('menu-social-clans')) document.getElementById('menu-social-clans').style.display = 'none';
}

function irPara(lugar) {
    let telaVitoria = document.getElementById('janela-vitoria');
    if (telaVitoria && telaVitoria.style.display === 'flex') return; 

    const deathBlock = document.getElementById('forest-death-overlay');
    if (deathBlock && deathBlock.dataset.active === '1' && lugar !== 'cidade') {
        return;
    }

    const fleeOkBlock = document.getElementById('forest-flee-success-overlay');
    if (fleeOkBlock && fleeOkBlock.dataset.active === '1' && lugar !== 'cidade') {
        return;
    }

    // Salva o lugar atual para persistência mobile
    localStorage.setItem('l2mini_last_location', lugar);

    if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.ativo) {
        window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in an Olympiad duel! Finish or leave the arena.</span>`);
        return;
    }

    if (typeof window.RaidEngine !== 'undefined' && window.RaidEngine.ativo) {
        window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in the Boss arena! Use FLEE or finish the fight.</span>`);
        return;
    }

    if (lugar !== 'floresta') {
        const telaFloresta = document.getElementById('tela-floresta');
        if (telaFloresta && telaFloresta.style.display === 'flex' && window.monstrosAtivos && window.monstrosAtivos.length > 0) {
        window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">⚠️ You are in combat! Defeat the monster or use the FLEE button!</span>`);
        return; 
        }
    }

    // Identifica a tela atual para animação de saída
    const currentSubScreen = document.querySelector('.screen-content[style*="display: flex"]') || 
                           document.querySelector('.screen-content[style*="display: block"]');
    
    const targetId = `tela-${lugar === 'cidade' ? 'cidade' : lugar === 'world' ? 'world' : lugar === 'floresta' ? 'floresta' : lugar === 'inventario' ? 'inventario' : lugar === 'perfil' ? 'perfil' : lugar === 'social' ? 'social' : lugar === 'olympiad-arena' ? 'olympiad-arena' : (lugar === 'clanwar' || lugar === 'clan-war') ? 'clan-war' : lugar === 'raid-arena' ? 'raid-arena' : ''}`;
    
    if (currentSubScreen && currentSubScreen.id === targetId) return;

    if (currentSubScreen) {
        const leaving = currentSubScreen as HTMLElement;
        leaving.classList.add('screen-transition-exit');
        setTimeout(() => {
            leaving.style.display = 'none';
            leaving.classList.remove('screen-transition-exit');
            executarTrocaSubScreen(lugar);
        }, 150);
    } else {
        executarTrocaSubScreen(lugar);
    }
}

function executarTrocaSubScreen(lugar) {
    if (typeof fecharTodosModaisBackdropStack === 'function') fecharTodosModaisBackdropStack();

    const forestDeathOv = document.getElementById('forest-death-overlay');
    if (forestDeathOv) {
        forestDeathOv.classList.remove('forest-death-overlay--visible');
        forestDeathOv.setAttribute('aria-hidden', 'true');
        delete forestDeathOv.dataset.active;
    }

    const forestFleeOkOv = document.getElementById('forest-flee-success-overlay');
    if (forestFleeOkOv) {
        forestFleeOkOv.classList.remove('forest-flee-success-overlay--visible');
        forestFleeOkOv.setAttribute('aria-hidden', 'true');
        delete forestFleeOkOv.dataset.active;
    }

    // 1. Esconder Todas as Telas
    fecharNpc();
    fecharNpcSocial();
    document.querySelectorAll('.screen-content').forEach((sc) => {
        (sc as HTMLElement).style.display = 'none';
        sc.classList.remove('screen-transition-enter', 'screen-transition-exit');
    });

    if (typeof OlympiadEngine !== 'undefined' && !OlympiadEngine.ativo &&
        typeof OlympiadEngine.softNavAway === 'function') {
        OlympiadEngine.softNavAway();
    }
    
    // Controle de Visibilidade da Barra de Atalhos Global
    const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
    if (barraGlobal) {
        const telasComAtalho = ['floresta', 'inventario', 'clanwar', 'raid-arena', 'olympiad-arena'];
        if (telasComAtalho.includes(lugar)) {
            if (lugar === 'olympiad-arena') {
                barraGlobal.style.setProperty('display', 'none', 'important');
            } else {
                barraGlobal.style.setProperty('display', 'grid', 'important');
            }
        } else {
            barraGlobal.style.setProperty('display', 'none', 'important');
        }
    }
    
    // 2. Mostrar a Tela Solicitada e Configurar Estado
    const targetId = `tela-${lugar === 'cidade' ? 'cidade' : lugar === 'world' ? 'world' : lugar === 'floresta' ? 'floresta' : lugar === 'inventario' ? 'inventario' : lugar === 'perfil' ? 'perfil' : lugar === 'social' ? 'social' : lugar === 'olympiad-arena' ? 'olympiad-arena' : (lugar === 'clanwar' || lugar === 'clan-war') ? 'clan-war' : lugar === 'raid-arena' ? 'raid-arena' : ''}`;
    const target = document.getElementById(targetId) as HTMLElement | null;

    if (target) {
        target.style.display = (lugar === 'world') ? 'block' : 'flex';
        target.classList.add('screen-transition-enter');
        setTimeout(() => target.classList.remove('screen-transition-enter'), 300);
    }

    if (lugar === 'cidade') { 
        fecharNpc(); 
        pararAtaqueMonstro(); 
        if (window.SupabaseAPI && window.charName) {
            window.SupabaseAPI.updatePresence(window.charName, {});
        }
    }
    
    if (lugar === 'world') { 
        if(target) {
            const container = target.querySelector('.world-container');
            if (container) container.scrollTop = 0;
        }
        pararAtaqueMonstro(); 
        if (typeof window.atualizarWorldDailyBossUI === 'function') window.atualizarWorldDailyBossUI();

        // NOVO: Controle de visibilidade do card de Clan War (Apenas para o Líder)
        const cardClanWar = document.getElementById('card-clan-war-world');
        if (cardClanWar) {
            const isLider = Array.isArray(window.clans) && window.playerClanId && window.clans.find(c => c.id === window.playerClanId)?.lider === window.charName;
            cardClanWar.style.display = isLider ? 'flex' : 'none';
        }
    }
    
    if (lugar === 'floresta') { 
        if(typeof prepararTelaCacada === 'function') prepararTelaCacada(); 
        if(typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); 
    }
    
    if (lugar === 'inventario') { 
        if(typeof renderizarInventario === 'function') renderizarInventario(); 
        if(typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); 
    }

    if (lugar === 'perfil') {
        var _psp = document.querySelector('#tela-perfil .profile-scroll-pane');
        if (_psp) _psp.scrollTop = 0;
        if(typeof renderizarPerfil === 'function') renderizarPerfil(); 
        if(typeof window.atualizarVisualPaperdoll === 'function') window.atualizarVisualPaperdoll(); 
        if (typeof window.schedulePaperdollFootShadowSyncWithRetries === 'function') {
            requestAnimationFrame(function () {
                window.schedulePaperdollFootShadowSyncWithRetries();
            });
        }
        pararAtaqueMonstro(); 
        requestAnimationFrame(function () {
            var p2 = document.querySelector('#tela-perfil .profile-scroll-pane');
            if (p2) p2.scrollTop = 0;
        });
    }

    if (lugar === 'social') {
        pararAtaqueMonstro();
        if (typeof renderizarSocial === 'function') renderizarSocial();
    }

    if (lugar === 'clanwar') {
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
        pararAtaqueMonstro();
    }

    if (lugar === 'olympiad-arena') {
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) barraGlobal.style.setProperty('display', 'grid', 'important');
    }

    // 3. Atualizar Botões do Menu Inferior
    document.querySelectorAll('.btn-travel').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-tab-${lugar}`) btn.classList.add('active');
    });

    try {
        if (typeof window.TutorialEngine !== 'undefined' && typeof window.TutorialEngine.onNav === 'function') {
            window.TutorialEngine.onNav(lugar);
        }
    } catch (eTut) { /* ignore */ }
}

function renderizarSocial() {
    if (typeof getOlympiadRank !== 'function') return;
    
    // Inicia sistema de mercado se ainda não foi (Garante persistência)
    if (typeof iniciarSistemaMercado === 'function') iniciarSistemaMercado();

    const oly = window.OlympiadEngine;
    const currentRank = getOlympiadRank(window.olympiadPoints || 0);
    
    // Define qual rank mostrar (o atual ou o que o usuário está navegando)
    let viewedRankName = currentRank.nomeCompleto;
    if (oly && oly.viewedRankIndex !== -1 && Array.isArray(oly.allRanks)) {
        viewedRankName = String(oly.allRanks[oly.viewedRankIndex ?? 0] ?? currentRank.nomeCompleto);
    } else if (oly && Array.isArray(oly.allRanks)) {
        // Inicializa o index na primeira vez
        oly.viewedRankIndex = oly.allRanks.indexOf(currentRank.nomeCompleto);
        if (oly.viewedRankIndex === -1) oly.viewedRankIndex = 0;
    }

    // IDs atualizados para a nova interface profissional
    const tierNameEl = document.getElementById('social-tier-name');
    const mmrPointsEl = document.getElementById('social-mmr-points');
    const tierProgressEl = document.getElementById('social-tier-progress');
    const tierProgressTextEl = document.getElementById('social-tier-progress-text');
    const nextTierEl = document.getElementById('social-next-tier');
    const winsEl = document.getElementById('social-wins');
    const lossesEl = document.getElementById('social-losses');
    const rankStatusEl = document.getElementById('viewed-rank-status');

    // Dados do Rank Visualizado (para o nome e ícone)
    const viewedTier = viewedRankName.split(' ')[0];
    
    if (tierNameEl) tierNameEl.innerText = viewedRankName;
    if (mmrPointsEl) mmrPointsEl.innerText = String(window.olympiadPoints || 0);
    
    if (rankStatusEl) {
        if (viewedRankName === currentRank.nomeCompleto) {
            rankStatusEl.innerText = (typeof window.t === 'function') ? window.t('olympiad.rankCurrent') : 'Current Rank';
            rankStatusEl.style.color = "#a78bfa";
        } else {
            // Verifica se já passou ou se é futuro
            const currentIndex = oly.allRanks.indexOf(currentRank.nomeCompleto);
            const viewedIndex = oly.viewedRankIndex;
            if (viewedIndex < currentIndex) {
                rankStatusEl.innerText = (typeof window.t === 'function') ? window.t('olympiad.rankAchieved') : 'Rank Achieved';
                rankStatusEl.style.color = "#22c55e";
            } else {
                rankStatusEl.innerText = (typeof window.t === 'function') ? window.t('olympiad.rankFuture') : 'Future Rank';
                rankStatusEl.style.color = "#facc15";
            }
        }
    }

    // Progresso sempre mostra o progresso do rank ATUAL
    let pct = currentRank.porcentagem || 0;
    if (tierProgressEl) tierProgressEl.style.width = pct + '%';
    
    if (currentRank.tier === "Mythic") {
        if (tierProgressTextEl) tierProgressTextEl.innerText = (typeof window.t === 'function') ? window.t('game.social.tierMax') : 'MAX';
        if (nextTierEl) nextTierEl.innerText = (typeof window.t === 'function') ? window.t('game.social.tierNone') : 'None';
    } else {
        if (tierProgressTextEl) tierProgressTextEl.innerText = `${String(currentRank.progressoAtual ?? 0)} / ${String(currentRank.maxDivisao ?? '')}`;
        if (nextTierEl) nextTierEl.innerText = currentRank.nextTier || ((typeof window.t === 'function') ? window.t('olympiad.nextRankLabel') : 'Next Rank');
    }
    
    if (winsEl) winsEl.innerText = String(window.olympiadWins || 0);
    if (lossesEl) lossesEl.innerText = String(window.olympiadLosses || 0);
    
    // Muda a cor e o ícone baseados no Tier VISUALIZADO
    let color = "#e9d5ff";
    let icon = "🏆";
    
    switch(viewedTier) {
        case "Unranked": color = "#94a3b8"; icon = "🥚"; break;
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
    
    if (tierNameEl) tierNameEl.style.color = color;
    const olyIconEl = document.getElementById('oly-my-tier-icon');
    if (olyIconEl) {
        olyIconEl.innerText = icon;
        if (viewedTier === "Legendary" || viewedTier === "Mythic") {
            olyIconEl.style.animation = "pulseGlow 2s infinite";
        } else {
            olyIconEl.style.animation = "none";
        }
    }

    // --- RENDERIZAÇÃO DE RECOMPENSAS NO CARD ---
    const rewardContentEl = document.getElementById('viewed-rank-reward-content');
    const rewardButtonAreaEl = document.getElementById('viewed-rank-reward-button-area');
    
    if (rewardContentEl && oly && oly.rankRewards?.[viewedRankName]) {
        const reward = oly.rankRewards[viewedRankName] as { adena?: number; items?: Array<{ qtd?: number; id?: string }> };
        let rewardHtml = `<div style="display:flex; align-items:center; gap:15px;">`;
        
        // Adena
        rewardHtml += `
            <div style="display:flex; align-items:center; gap:5px;">
                <div class="coin-icon coin-adena" style="width:16px; height:16px;"></div>
                <span style="color:#facc15; font-size:0.8em; font-weight:bold;">${(reward.adena ?? 0).toLocaleString()}</span>
            </div>
        `;
        
        // Itens
        (reward.items ?? []).forEach(it => {
            rewardHtml += `
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="color:#a78bfa; font-size:0.8em; font-weight:bold;">${it.qtd}x</span>
                    <span style="color:#ddd; font-size:0.75em;">${it.id}</span>
                </div>
            `;
        });
        rewardHtml += `</div>`;
        rewardContentEl.innerHTML = rewardHtml;

        // Botão de Claim
        if (rewardButtonAreaEl) {
            const isClaimed = oly.rewardsClaimed.includes(viewedRankName);
            const currentIndex = oly.allRanks.indexOf(currentRank.nomeCompleto);
            const viewedIndex = oly.viewedRankIndex;
            const reached = viewedIndex <= currentIndex;

            if (isClaimed) {
                rewardButtonAreaEl.innerHTML = `<span style="color:#22c55e; font-size:0.7em; font-weight:bold;">${(typeof window.t === 'function') ? window.t('olympiad.rewardClaimedTag') : 'REWARD CLAIMED ✓'}</span>`;
            } else if (reached) {
                rewardButtonAreaEl.innerHTML = `<button class="btn-l2 btn-claim-reward" style="padding:4px 20px; font-size:0.7em; color:#fff;" onclick="OlympiadEngine.recolherPremio('${viewedRankName}')">${(typeof window.t === 'function') ? window.t('olympiad.claimNow') : 'CLAIM NOW'}</button>`;
            } else {
                rewardButtonAreaEl.innerHTML = `<span style="color:#666; font-size:0.7em; font-weight:bold;">${(typeof window.t === 'function') ? window.t('olympiad.reachRankToClaim') : 'REACH THIS RANK TO CLAIM'}</span>`;
            }
        }
    }

    // ATUALIZAÇÃO: Informações da Temporada
    atualizarRelogioSeason();
}

function atualizarRelogioSeason() {
    if (typeof RankingSeasons !== 'undefined' && RankingSeasons.getTimeLeft) {
        const now = new Date();
        const seasonName = `${now.toLocaleString('en-US', { month: 'long' })} / ${now.getFullYear()}`;
        const timeLeft = RankingSeasons.getTimeLeft();
        
        const nameEl = document.getElementById('oly-season-name-display');
        const timerEl = document.getElementById('oly-season-timer-display');
        
        if (nameEl) nameEl.innerText = seasonName;
        if (timerEl) {
            if (timeLeft.days === 0 && timeLeft.hours === 0) {
                timerEl.innerText = (typeof window.t === 'function') ? window.t('olympiad.seasonEndingSoon') : 'Ending soon!';
            } else {
                timerEl.innerText = `${timeLeft.days}d ${timeLeft.hours}h`;
            }
        }
    }
}

// Atualiza o relógio a cada minuto automaticamente
setInterval(atualizarRelogioSeason, 60000);

function mudarAbaSocial(aba) {
    const tabMeu = document.getElementById('social-tab-meu');
    if (!tabMeu) return;
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
    const listCont = document.getElementById('oly-season-rewards-list');
    if (!listCont) return;
    
    if (typeof RankingSeasons === 'undefined' || !RankingSeasons.SEASON_REWARDS) {
        listCont.innerHTML = `<div style="color:#aaa; text-align:center; padding:20px;">${(typeof window.t === 'function') ? window.t('olympiad.loadingSeasonData') : 'Loading season data...'}</div>`;
        return;
    }

    let html = '';

    // --- SEÇÃO: RECOMPENSA PENDENTE DA TEMPORADA ANTERIOR ---
    const localSaveKey = 'l2mini_save_' + (window.charName ? window.charName.toLowerCase() : '');
    const localSave = JSON.parse(localStorage.getItem(localSaveKey) || '{}');
    const seasonData = localSave.lastSeasonData;

    if (seasonData && !seasonData.claimed) {
        const rew = (RankingSeasons.SEASON_REWARDS[seasonData.tierReached] || RankingSeasons.SEASON_REWARDS["Paper"]) as SeasonRewardEntry;
        html += `
            <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); border: 2px solid #facc15; border-radius: 10px; padding: 15px; margin-bottom: 20px; box-shadow: 0 0 20px rgba(250, 204, 21, 0.3); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; right: -10px; font-size: 4em; opacity: 0.1; transform: rotate(15deg);">🎁</div>
                <div style="color: #facc15; font-family: 'Cinzel'; font-weight: bold; font-size: 1.1em; margin-bottom: 5px;">${(typeof window.t === 'function') ? window.t('olympiad.seasonRewardAvailable') : 'SEASON REWARD AVAILABLE!'}</div>
                <div style="color: #fff; font-size: 0.8em; margin-bottom: 12px;">${(typeof window.t === 'function') ? window.t('olympiad.seasonFinishedAs', { season: seasonData.seasonKey, rank: seasonData.rankReached }) : `You finished season ${seasonData.seasonKey} as ${seasonData.rankReached}.`}</div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div class="coin-icon coin-adena" style="width:14px; height:14px;"></div>
                        <span style="color:#facc15; font-weight:bold; font-size:0.9em;">${(rew.adena ?? 0).toLocaleString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div class="coin-icon coin-ancient" style="width:14px; height:14px;"></div>
                        <span style="color:#60a5fa; font-weight:bold; font-size:0.9em;">${(rew.coins ?? 0).toLocaleString()}</span>
                    </div>
                    ${(rew.items ?? []).map(it => `
                        <div style="display:flex; align-items:center; gap:4px; font-size:0.8em; color:#fff;">
                            <span style="color:#a78bfa; font-weight:bold;">${it.qtd}x</span> <span>${it.nome || it.id}</span>
                        </div>
                    `).join('')}
                </div>

                <button class="btn-l2 btn-claim-reward" style="width: 100%; padding: 10px; font-weight: bold; color: #fff;" onclick="RankingSeasons.claimSeasonReward()">
                    ${(typeof window.t === 'function') ? window.t('olympiad.claimSeasonRewards') : 'CLAIM SEASON REWARDS'}
                </button>
            </div>
        `;
    }

    // --- SEÇÃO: LISTA DE RECOMPENSAS DA TEMPORADA ATUAL ---
    html += `<div style="font-family: 'Cinzel'; color: #aaa; font-size: 0.75em; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">${(typeof window.t === 'function') ? window.t('olympiad.monthlyRewardsByRank') : 'Monthly Rewards by Rank'}</div>`;
    
    const tiers = Object.keys(RankingSeasons.SEASON_REWARDS);
    
    // Inverte para mostrar do maior para o menor
    [...tiers].reverse().forEach(tier => {
        const rew = RankingSeasons.SEASON_REWARDS[tier] as SeasonRewardEntry;
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

        let itemsHtml = (rew.items ?? []).map(it => `
            <div style="display:flex; align-items:center; gap:4px; font-size:9px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                <span style="color:#fff;">${it.nome || it.id}</span>
                <b style="color:#facc15;">x${it.qtd}</b>
            </div>
        `).join('');

        html += `
            <div style="background: rgba(15,15,20,0.8); border: 1px solid ${color}33; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2em;">${icon}</span>
                        <span style="font-family: 'Cinzel'; color: ${color}; font-weight: bold; font-size: 0.9em;">${tier}</span>
                    </div>
                </div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="coin-icon coin-adena" style="width:12px; height:12px;"></div>
                        <span style="color:#facc15; font-size:11px; font-weight:bold; font-family:Tahoma;">${(rew.adena ?? 0).toLocaleString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="coin-icon coin-ancient" style="width:12px; height:12px;"></div>
                        <span style="color:#60a5fa; font-size:11px; font-weight:bold; font-family:Tahoma;">${(rew.coins ?? 0).toLocaleString()}</span>
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
    let listaHTML = document.getElementById('global-ranking-list') || document.getElementById('oly-global-ranking-list');
    if (!listaHTML) return;
    
    // Mostra um loading rápido se estiver buscando
    if (!RankingManager.realPlayers.length && typeof buscarRankingGlobalReal === 'function') {
        listaHTML.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">' + ((typeof window.t === 'function') ? window.t('game.ladder.loadingWorld') : 'Loading world ladder...') + '</div>';
    }

    // 1. Obter a lista combinada (Bots + Player Atual + Real Players)
    let todosJogadores: MergedRankingEntry[] = await RankingManager.getMergedRanking();
    
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
        
        let rankData = getOlympiadRank(Number(jog.olympiadPoints) || 0);
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

        let isLocal = (jog.nome === window.charName);
        let corNome = isLocal ? "#22c55e" : (jog.isRealPlayer ? "#60a5fa" : "#e2e8f0");
        let glowPlayer = isLocal ? "box-shadow: inset 0 0 10px rgba(34, 197, 94, 0.2); border: 1px solid #22c55e;" : (jog.isRealPlayer ? "border: 1px solid #3b82f6;" : "");

        let ascSub = '';
        if (!jog.isBot && (jog.ascensionTitle || typeof jog.renown === 'number')) {
            const ren = typeof jog.renown === 'number' ? jog.renown : 0;
            const lineRaw =
                typeof window.t === 'function'
                    ? window.t('game.endgame.ladderAscension', { title: String(jog.ascensionTitle || ''), renown: ren })
                    : (jog.ascensionTitle || '') + ' · Renown ' + ren;
            ascSub = `<div style="color:#a78bfa;font-size:0.68em;margin-top:3px;line-height:1.2;">${escapeHtmlLite(lineRaw)}</div>`;
        }

        const clsDisplay = (typeof window.formatClassDisplayName === 'function')
            ? window.formatClassDisplayName(jog.classe || '')
            : String(jog.classe || '').replace(/_/g, ' ');

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
                    <div style="color: #71717a; font-size: 0.7em;">${escapeHtmlLite(clsDisplay)}</div>
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
    if (!isBot && nome === window.charName) {
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
            botData = baseRanking.find((b) => {
                const row = b as Record<string, unknown>;
                return (row.nome || row.farmBot1) === nome;
            });
        }
        if (!botData) {
            if (!isBot && typeof window.abrirPerfilChat === 'function' && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && window.SupabaseAPI) {
                window.abrirPerfilChat(nome, 'Paper');
                return;
            }
            return;
        }

        bot = (typeof window.OlympiadBots !== 'undefined' && window.OlympiadBots.gerarBotCompleto)
            ? window.OlympiadBots.gerarBotCompleto(botData)
            : null;
    }

    if (!bot) return;

    window.botAtualVisualizado = bot;

    abrirModal('modal-perfil-ranking', 1600);

    let rankData = typeof getOlympiadRank === 'function' ? getOlympiadRank(bot.olympiadPoints) : { nomeCompleto: 'Unranked' };

    let ascHtml = '';
    if (bot.isCloudPlayerInspection || bot.ascensionTitle) {
        const tit = bot.ascensionTitle || '';
        const ren = typeof bot.renown === 'number' ? bot.renown : 0;
        const line =
            typeof window.t === 'function'
                ? window.t('game.endgame.inspectModalLine', { title: tit, renown: ren })
                : tit + (tit ? ' · ' : '') + 'Renown ' + ren;
        ascHtml = `<div style="color:#e9d5ff;font-size:0.74em;margin-top:5px;font-weight:600;font-family:'Cinzel',serif;letter-spacing:0.03em;">${line}</div>`;
    }

    let htmlEquips = '';
    if (bot.equipamentos) {
        let arma = bot.equipamentos.arma;
        let armadura = bot.equipamentos.armadura;
        let enchant = bot.equipamentos.enchant || 0;
        
        // Se for um player real, os dados de equipamentos podem estar em outro formato
        // Normaliza para exibição
        const getImg = (it) => it?.img || it?.base?.img || 'assets/itens/item_generic.png';
        const getNome = (it) => it?.nome || it?.base?.nome || 'Unknown Item';

        let armaHtml = arma ? `<div onclick="window.abrirAcaoItemBot('arma')" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; padding:6px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.background='rgba(0,0,0,0.4)'; this.style.borderColor='#333'"><img src="${getImg(arma)}" style="width:34px; height:34px; border:1px solid #555; background:#111; border-radius:4px;"> <div style="display:flex; flex-direction:column;"><span style="color:#fde047; font-size:0.9em; font-weight:bold;">${enchant > 0 ? '+'+enchant+' ' : ''}${getNome(arma)}</span><span style="color:#666; font-size:0.7em; text-transform:uppercase;">Weapon</span></div></div>` : '<div style="color:#777; padding:5px;">Sem Arma</div>';
        let armaduraHtml = armadura ? `<div onclick="window.abrirAcaoItemBot('armadura')" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; padding:6px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.background='rgba(0,0,0,0.4)'; this.style.borderColor='#333'"><img src="${getImg(armadura)}" style="width:34px; height:34px; border:1px solid #555; background:#111; border-radius:4px;"> <div style="display:flex; flex-direction:column;"><span style="color:#cbd5e1; font-size:0.9em; font-weight:bold;">${enchant > 0 ? '+'+enchant+' ' : ''}${getNome(armadura)}</span><span style="color:#666; font-size:0.7em; text-transform:uppercase;">Armor</span></div></div>` : '<div style="color:#777; padding:5px;">Sem Armadura</div>';
        
        let joiasHtml = '';
        if (bot.equipamentos.joias && bot.equipamentos.joias.length > 0) {
            joiasHtml = `<div style="display:flex; gap:8px; margin-top:10px; padding:5px; background:rgba(0,0,0,0.2); border-radius:6px; justify-content:center;">`;
            bot.equipamentos.joias.forEach((j, idx) => {
                joiasHtml += `<img src="${getImg(j)}" onclick="window.abrirAcaoItemBot('joia', ${idx})" title="${enchant > 0 ? '+'+enchant+' ' : ''}${getNome(j)}" style="width:32px; height:32px; border:1px solid #555; background:#111; border-radius:4px; cursor:pointer; transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#ca8a04'" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#555'">`;
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
    const raceForImg = bot.raca || bot.charRace || 'Human';
    if (typeof window.AuthEngine !== 'undefined' && typeof window.AuthEngine.getAvatarForClass === 'function'
        && (bot.charGender === 'Male' || bot.charGender === 'Female')) {
        imgBot = window.AuthEngine.getAvatarForClass(bot._classKey || bot.classe, raceForImg, bot.charGender);
    } else if (typeof radarDeRacas !== 'undefined' && radarDeRacas[raceForImg]) {
        // Legado: bots sem charGender — variante antiga (mago = arte “feminina” no radar)
        imgBot = bot.isMage ? radarDeRacas[raceForImg].imgMulher : radarDeRacas[raceForImg].imgHomem;
    }

    const clsSubtitle = (typeof window.formatClassDisplayName === 'function')
        ? window.formatClassDisplayName(bot.classe || '')
        : String(bot.classe || '').replace(/_/g, ' ');
    const genderLabel = (bot.charGender === 'Female' || bot.charGender === 'Male') && typeof window.t === 'function'
        ? window.t(bot.charGender === 'Female' ? 'creation.genderFemale' : 'creation.genderMale')
        : '';
    const inspectSubParts = [`Lv.${bot.nivel}`, raceForImg, genderLabel, clsSubtitle].filter(function (p) { return p && String(p).trim() !== ''; });
    const inspectSubtitle = inspectSubParts.join(' · ');
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
                    <div style="color: #a1a1aa; font-size: 0.85em;">${inspectSubtitle}</div>
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

window.abrirAcaoItemBot = function abrirAcaoItemBot(tipo: string, index = 0) {
    const bot = window.botAtualVisualizado as Record<string, unknown> | null | undefined;
    if (!bot || !bot.equipamentos) return;
    
    const equips = bot.equipamentos as Record<string, unknown>;
    let itemRaw: Record<string, unknown> | null = null;
    let enc = Number(equips.enchant) || 0;
    let aug = false;
    let tipoBruto = 'misc';

    if (tipo === 'arma') {
        itemRaw = equips.arma as Record<string, unknown> | null;
        if (itemRaw) {
            tipoBruto = String(itemRaw.tipoItem || itemRaw.tipo || 'weapon');
            const base = itemRaw.base as Record<string, unknown> | undefined;
            aug = !!(itemRaw.augmented || (base && base.augmented));
            if (typeof itemRaw.enchant === 'number') enc = itemRaw.enchant;
        }
    } else if (tipo === 'armadura') {
        itemRaw = equips.armadura as Record<string, unknown> | null;
        if (itemRaw) {
            tipoBruto = String(itemRaw.tipoItem || itemRaw.tipo || 'armor');
            if (typeof itemRaw.enchantArmor === 'number') enc = itemRaw.enchantArmor;
            else if (typeof itemRaw.enchant === 'number') enc = itemRaw.enchant;
        }
    } else if (tipo === 'joia') {
        itemRaw = ((equips.joias as unknown[])?.[index] ?? null) as Record<string, unknown> | null;
        if (itemRaw) {
            tipoBruto = String(itemRaw.tipoItem || itemRaw.tipo || 'jewel');
            if (typeof itemRaw.enchantJewel === 'number') enc = itemRaw.enchantJewel;
            else if (typeof itemRaw.enchant === 'number') enc = itemRaw.enchant;
        }
    }

    if (!itemRaw) return;

    let catalogBase: Record<string, unknown> = (itemRaw.base && typeof itemRaw.base === 'object')
        ? (itemRaw.base as Record<string, unknown>)
        : itemRaw;
    if (!catalogBase || typeof catalogBase !== 'object') return;

    if (!catalogBase.nome) {
        catalogBase = Object.assign({}, catalogBase);
        catalogBase.nome = catalogBase.id || ((typeof window.t === 'function') ? window.t('game.inventoryUi.unknownItem') : 'Unknown item');
    }
    if (!catalogBase.grade) catalogBase.grade = 'NG';

    abrirModal('janela-item-acao', 2100); 
    
    document.getElementById('acao-titulo').innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO'; 
    let imgCandidate = catalogBase.img || itemRaw.img;
    let imgSrc = (imgCandidate && String(imgCandidate).trim())
        ? imgCandidate
        : (catalogBase.id ? 'assets/itens/' + catalogBase.id + '.png' : 'assets/itens/item_generic.png');
    document.getElementById('acao-img') && ((document.getElementById('acao-img') as HTMLImageElement).src = String(imgSrc)); 
    
    let info = typeof formatarTooltipEquipamento === 'function'
        ? formatarTooltipEquipamento(catalogBase, enc, aug, tipoBruto, itemRaw)
        : ((typeof window.t === 'function') ? window.t('game.social.inspectDetailsUnavailable') : 'Details unavailable.');
    let descContainer = document.getElementById('acao-desc'); 
    descContainer.innerHTML = info; 
    descContainer.style.width = "100%";
    
    let btnAcao = document.getElementById('btn-acao-item'); 
    btnAcao.style.display = 'none'; // Esconde o botão de ação (pois é de outro jogador)
}

const ZONE_GRADE_I18N: Record<string, string> = {
    'No-Grade': 'ng',
    D: 'd',
    C: 'c',
    B: 'b',
    A: 'a',
    S: 's',
};

const ZONE_TOWN_GRADE_KEY: Record<string, string> = {
    'No-Grade': 'game.town.gradeNg',
    D: 'game.town.gradeD',
    C: 'game.town.gradeC',
    B: 'game.town.gradeB',
    A: 'game.town.gradeA',
    S: 'game.town.gradeS',
};

function zoneCatalogText(grade: string, field: 'name' | 'desc'): string {
    const sfx = ZONE_GRADE_I18N[grade];
    const catalog = typeof catalogoZonas !== 'undefined' ? catalogoZonas[grade] : null;
    if (sfx && typeof window.t === 'function') {
        const key = `game.zones.${sfx}.${field}`;
        const localized = window.t(key);
        if (localized && localized !== key) return localized;
    }
    if (!catalog) return grade;
    return field === 'name' ? catalog.nome : catalog.descricao;
}

function zoneDisplayName(grade: string | null | undefined): string {
    const g = grade || 'No-Grade';
    return zoneCatalogText(g, 'name');
}

function zoneGradeLabel(grade: string): string {
    const gradeKey = ZONE_TOWN_GRADE_KEY[grade];
    if (gradeKey && typeof window.t === 'function') {
        const localized = window.t(gradeKey);
        if (localized && localized !== gradeKey) return localized;
    }
    return grade;
}

function refreshHuntZoneHud(): void {
    const el = document.getElementById('hud-zona-nome');
    if (!el || !window.zonaAtual) return;
    el.innerText = zoneDisplayName(window.zonaAtual.id);
}

function abrirDetalhesZona(grade) {
    const dados = catalogoZonas[grade];
    if (!dados) return;
    const tFn = typeof window.t === 'function' ? window.t : null;

    document.getElementById('zona-detalhe-titulo').innerText = zoneDisplayName(grade);
    document.getElementById('zona-detalhe-grade').innerText = zoneGradeLabel(grade);
    document.getElementById('zona-detalhe-grade').style.backgroundColor = dados.cor;
    document.getElementById('zona-detalhe-nivel').innerText = tFn
        ? tFn('game.zones.levelRange', { range: dados.nivelSugerido })
        : `Lv. ${dados.nivelSugerido}`;
    document.getElementById('zona-detalhe-custo').innerText =
        dados.custo === 0
            ? tFn
                ? tFn('game.zones.costFree')
                : 'FREE'
            : tFn
              ? tFn('game.zones.costAdena', { amount: dados.custo.toLocaleString() })
              : `${dados.custo.toLocaleString()} Adena`;
    document.getElementById('zona-detalhe-descricao').innerText = zoneCatalogText(grade, 'desc');

    const monstrosCont = document.getElementById('zona-detalhe-monstros');
    monstrosCont.innerHTML = dados.monstros.map(m => `<span class="zone-tag">${m}</span>`).join('');

    const recompensasCont = document.getElementById('zona-detalhe-recompensas');
    recompensasCont.innerHTML = dados.recompensas.map(r => `<span class="zone-tag" style="border-color: #ca8a04; color: #facc15;">${r}</span>`).join('');

    const btnViajar = document.getElementById('btn-confirmar-viagem');
    if (btnViajar) {
        btnViajar.innerText = tFn ? tFn('game.zones.teleportBtn') : 'TELEPORT NOW';
        btnViajar.onclick = () => {
            fecharModal('janela-detalhes-zona');
            teleportarParaZona(grade);
        };
    }

    abrirModal('janela-detalhes-zona');
}

function teleportarParaZona(grade) {
    let zonaDestino = zonasDeCaca[grade];
    const zoneName = zoneDisplayName(grade);
    if (window.adenas >= zonaDestino.custo) {
        fecharNpc(); 
        if (zonaDestino.custo > 0) { 
            window.adenas -= zonaDestino.custo; 
            window.escreverLog(`<span style="color:#ffcc00">` + (typeof window.t === 'function' ? window.t('game.travel.paidTravel', { cost: zonaDestino.custo, name: zoneName }) : `You paid ${zonaDestino.custo}a and traveled to ${zoneName}.`) + `</span>`); 
        } else { 
            window.escreverLog(`<span style="color:#ffcc00">` + (typeof window.t === 'function' ? window.t('game.travel.freeTravel', { name: zoneName }) : `You traveled to ${zoneName} for free.`) + `</span>`); 
        }
        window.zonaAtual = zonaDestino; 
        document.getElementById('hud-zona-nome').innerText = zoneName; 
        window.monstrosAtivos.length = 0;
        window.atualizar(); 
        irPara('floresta'); 
    } else { 
        window.mostrarAviso(typeof window.t === 'function' ? window.t('game.travel.needAdena', { amount: zonaDestino.custo }) : `You need ${zonaDestino.custo} Adena!`); 
    }
}

function recolherLootRaid() {
    fecharModal('janela-raid-loot');
    document.getElementById('tela-raid-arena').style.display = 'none';
    
    // Garante que tudo (HP, Adenas, Coins) esteja atualizado na volta
    if (typeof atualizar === 'function') window.atualizar();
    
    irPara('world');
    if (typeof window.atualizarWorldDailyBossUI === 'function') window.atualizarWorldDailyBossUI();
    window.mostrarAviso(typeof window.t === 'function' ? window.t('game.travel.warSpoilsCollected') : 'War spoils collected!');
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

        if (!overlay || !body) return resolve(undefined);

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
            resolve(undefined);
        };
    });
};

window.l2Confirm = function(mensagem, titulo) {
    return new Promise<boolean>((resolve) => {
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

// --- Globals (HTML onclick + scripts legados) ---
window.radarDeRacas = radarDeRacas;
window.indexSelecao = window.indexSelecao ?? 0;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.fecharTopModal = fecharTopModal;
window.mudarTela = mudarTela;
window.irPara = irPara;
window.abrirNpc = abrirNpc;
window.fecharNpc = fecharNpc;
window.abrirMenuSocial = abrirMenuSocial;
window.fecharNpcSocial = fecharNpcSocial;
window.navegarSelecao = navegarSelecao;
window.setGender = setGender;
window.proximaEtapa = proximaEtapa;
window.voltarEtapa = voltarEtapa;
window.atualizarPreview = atualizarPreview;
window.validarLogin = validarLogin;
window.verificarLimitePersonagem = verificarLimitePersonagem;
window.abrirDetalhesZona = abrirDetalhesZona;
window.teleportarParaZona = teleportarParaZona;
window.zoneDisplayName = zoneDisplayName;
window.refreshHuntZoneHud = refreshHuntZoneHud;
window.recolherLootRaid = recolherLootRaid;
window.abrirPerfilJogadorRanking = abrirPerfilJogadorRanking;
window.renderizarSocial = renderizarSocial;
window.mudarAbaSocial = mudarAbaSocial;
window.renderizarRankingMundial = renderizarRankingMundial;
window.renderizarPremiosRanking = renderizarPremiosRanking;
registerGlobalFn('renderizarPremiosRanking', renderizarPremiosRanking);

export {};
