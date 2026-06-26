/**
 * ONBOARDING — tutorial guiado (contas novas)
 * Migrado: js/tutorial_engine.js
 */
import type { TutorialProgress } from '../types/game';

const DONE_STEP = 11;
let _renderScheduled = false;
window.tutorialFirstAttackDone = false;

function tn(key: string, params?: Record<string, string | number>): string {
        try {
            return typeof window.t === 'function' ? window.t(key, params) : key;
        } catch (e) {
            return key;
        }
    }

    function defaultProgress(): TutorialProgress {
        return { v: 1, active: false, step: 99, completed: true, skipped: false };
    }

    function getProg(): TutorialProgress {
        if (!window.tutorialProgress || typeof window.tutorialProgress !== 'object') {
            window.tutorialProgress = defaultProgress();
        }
        return window.tutorialProgress;
    }

    function isRunning() {
        var p = getProg();
        return !!(p.active && !p.completed && !p.skipped && p.step >= 0 && p.step < DONE_STEP);
    }

    function persistSilent() {
        try {
            if (typeof window.salvarJogo === 'function') window.salvarJogo({ silent: true });
        } catch (e) { /* ignore */ }
    }

    function clearHighlights() {
        try {
            var elements = document.querySelectorAll('.tutorial-highlight, .tutorial-lock');
            elements.forEach(function (el) {
                el.classList.remove('tutorial-highlight');
                el.classList.remove('tutorial-lock');
            });
            // Reset da barra de atalhos se foi forçada
            if (!isRunning() || ![1, 4, 8, 9].includes(getProg().step)) {
                var bar = document.getElementById('barra-de-atalhos-dinamica');
                if (bar) {
                    var lastLoc = localStorage.getItem('l2mini_last_location') || 'cidade';
                    var allowed = ['floresta', 'inventario', 'clanwar', 'raid-arena', 'olympiad-arena'];
                    if (!allowed.includes(lastLoc)) {
                        bar.style.display = 'none';
                    } else {
                        bar.style.display = 'grid';
                    }
                    bar.style.zIndex = '';
                }
            }
        } catch (e) { /* ignore */ }
    }

    function isTravelTabActive(lugar: string): boolean {
        try {
            var btn = document.getElementById('btn-tab-' + lugar);
            return !!(btn && btn.classList.contains('active'));
        } catch (e) {
            return false;
        }
    }

    function isSpellbookModalOpen() {
        try {
            var jw = document.getElementById('janela-spellbook');
            if (!jw) return false;
            var d = window.getComputedStyle(jw).display;
            return d !== 'none' && d !== '';
        } catch (e) {
            return false;
        }
    }

    function isFlorestaScreenVisible() {
        try {
            var el = document.getElementById('tela-floresta');
            if (!el) return false;
            var d = el.style.display;
            if (d === 'flex' || d === 'block') return true;
            var c = window.getComputedStyle(el).display;
            return c === 'flex' || c === 'block';
        } catch (e2) {
            return false;
        }
    }

    function hidePanel() {
        try {
            var panel = document.getElementById('tutorial-coach-panel');
            if (panel) {
                var ae = document.activeElement as HTMLElement | null;
                if (ae && panel.contains(ae) && typeof ae.blur === 'function') ae.blur();
                panel.classList.add('tutorial-coach--hidden');
                panel.setAttribute('aria-hidden', 'true');
            }
            var arrow = document.getElementById('tutorial-arrow');
            if (arrow) arrow.classList.add('tutorial-arrow--hidden');
        } catch (e) { /* ignore */ }
        clearHighlights();
    }

    function updateArrow(target: HTMLElement | null): void {
        var arrow = document.getElementById('tutorial-arrow');
        if (!arrow) return;

        if (!target || target.offsetParent === null) {
            arrow.classList.add('tutorial-arrow--hidden');
            return;
        }

        var rect = target.getBoundingClientRect();
        if (rect.top === 0 && rect.left === 0) {
            arrow.classList.add('tutorial-arrow--hidden');
            return;
        }

        var x = rect.left + (rect.width / 2) - 20;
        var y = rect.top - 45;

        // Se o elemento estiver muito no topo, inverte a seta
        if (y < 100) {
            y = rect.bottom + 10;
            arrow.classList.add('tutorial-arrow--top');
        } else {
            arrow.classList.remove('tutorial-arrow--top');
        }

        arrow.style.left = x + 'px';
        arrow.style.top = y + 'px';
        arrow.classList.remove('tutorial-arrow--hidden');
    }

    function updatePanelPosition(target) {
        var panel = document.getElementById('tutorial-coach-panel');
        if (!panel) return;

        if (!target || target.offsetParent === null) {
            // Posição padrão (centro da tela) se não houver alvo
            panel.style.left = '50%';
            panel.style.top = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.classList.remove('tutorial-coach--bottom');
            // Esconde o ponteiro quando centralizado
            var card = panel.querySelector('.tutorial-coach__card') as HTMLElement | null;
            if (card) card.style.setProperty('--pointer-display', 'none');
            return;
        }

        // Mostra o ponteiro quando seguindo alvo
        var card = panel.querySelector('.tutorial-coach__card') as HTMLElement | null;
        if (card) card.style.setProperty('--pointer-display', 'block');

        var rect = target.getBoundingClientRect();
        var panelWidth = panel.offsetWidth || 280;
        var panelHeight = panel.offsetHeight || 180;

        // Tenta posicionar o painel próximo ao alvo, mas sem cobrir a seta
        var x = rect.left + (rect.width / 2) - (panelWidth / 2);
        var y = rect.top - panelHeight - 80; // Espaço para a seta

        // Ajustes de borda da tela (Horizontal)
        if (x < 10) x = 10;
        if (x + panelWidth > window.innerWidth - 10) x = window.innerWidth - panelWidth - 10;

        // Se não houver espaço no topo, coloca embaixo do alvo
        if (y < 10) {
            y = rect.bottom + 80;
            panel.classList.add('tutorial-coach--bottom');
        } else {
            panel.classList.remove('tutorial-coach--bottom');
        }

        // Se ainda assim sair da tela (embaixo), tenta colocar na lateral
        if (y + panelHeight > window.innerHeight - 10) {
            y = rect.top + (rect.height / 2) - (panelHeight / 2);
            // Decide se coloca na esquerda ou direita do alvo
            if (rect.left > panelWidth + 20) {
                x = rect.left - panelWidth - 20;
            } else {
                x = rect.right + 20;
            }
        }

        // Garantia final de visibilidade (Safe Zone)
        if (y < 10) y = 10;
        if (y + panelHeight > window.innerHeight - 10) y = window.innerHeight - panelHeight - 10;
        if (x < 10) x = 10;
        if (x + panelWidth > window.innerWidth - 10) x = window.innerWidth - panelWidth - 10;

        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.transform = 'none';
    }

    function applyHighlights(step) {
        clearHighlights();
        try {
            // Bloqueia botões de navegação global durante o tutorial
            var navButtons = ['btn-tab-perfil', 'btn-tab-cidade', 'btn-tab-world', 'btn-tab-inventario', 'btn-tab-social'];
            navButtons.forEach(function(id) {
                var btn = document.getElementById(id);
                if (btn) btn.classList.add('tutorial-lock');
            });

            var target = null;
            var forceScreen = null;

            if (step === 0 || step === 1) {
                forceScreen = 'inventario';
                // Força a barra a aparecer no início para o jogador ver que ela existe
                var bar = document.getElementById('barra-de-atalhos-dinamica');
                if (bar) {
                    bar.style.setProperty('display', 'grid', 'important');
                    bar.style.zIndex = '2001';
                }
                if (step === 1) target = bar;
            } else if (step === 2) {
                target = document.getElementById('btn-tab-perfil');
                if (target) target.classList.remove('tutorial-lock'); // Desbloqueia se for o alvo
            } else if (step === 3) {
                forceScreen = 'perfil';
                if (isTravelTabActive('perfil')) {
                    target = document.querySelector('.btn-profile-spellbook');
                } else {
                    target = document.getElementById('btn-tab-perfil');
                    if (target) target.classList.remove('tutorial-lock');
                }
            } else if (step === 4) {
                // IMPORTANTE: Para equipar, precisamos ver a barra!
                var bar = document.getElementById('barra-de-atalhos-dinamica');
                if (bar) {
                    bar.style.setProperty('display', 'grid', 'important');
                    bar.style.zIndex = '2001';
                }
                // Destacar o primeiro slot vazio (que limpamos no iniciarJogo)
                var slots = document.querySelectorAll('.atalho-slot');
                if (slots && slots.length > 1) target = slots[1]; // O slot 2 está vazio agora
            } else if (step === 5) {
                target = document.getElementById('btn-tab-world');
                if (target) target.classList.remove('tutorial-lock');
            } else if (step === 6) {
                forceScreen = 'world';
                if (isTravelTabActive('world')) {
                    // Destaque para o card de zona No-Grade
                    target = document.querySelector('.adv-card');
                } else {
                    target = document.getElementById('btn-tab-world');
                    if (target) target.classList.remove('tutorial-lock');
                }
            } else if (step === 7) {
                forceScreen = 'floresta';
                target = document.getElementById('btn-iniciar-caca');
            } else if (step === 8) {
                forceScreen = 'floresta';
                // Destacar o botão de ataque na barra
                var bar = document.getElementById('barra-de-atalhos-dinamica');
                if (bar) {
                    bar.style.setProperty('display', 'grid', 'important');
                    bar.style.zIndex = '2001';
                }
                var slots = document.querySelectorAll('.atalho-slot');
                if (slots && slots.length > 0) target = slots[0]; // O slot 1 é o Attack
            } else if (step === 9) {
                forceScreen = 'floresta';
                // Destacar a poção de HP
                var bar = document.getElementById('barra-de-atalhos-dinamica');
                if (bar) {
                    bar.style.setProperty('display', 'grid', 'important');
                    bar.style.zIndex = '2001';
                }
                var slots = document.querySelectorAll('.atalho-slot');
                if (slots && slots.length > 2) target = slots[2]; // O slot 3 é a HP Potion
            } else if (step === 10) {
                forceScreen = 'floresta';
            }

            // Auto-navegação defensiva
            if (forceScreen && !isTravelTabActive(forceScreen) && typeof window.irPara === 'function') {
                if (step !== 4) window.irPara(forceScreen);
            }

            if (target) {
                target.classList.add('tutorial-highlight');
                // Se o alvo for um botão de nav, garante que ele está desbloqueado
                if (navButtons.indexOf(target.id) !== -1) {
                    target.classList.remove('tutorial-lock');
                }
                // Garante que o elemento está visível antes de apontar a seta e o painel
                setTimeout(function() {
                    if (target.offsetParent !== null) {
                        updateArrow(target);
                        updatePanelPosition(target);
                    }
                }, 100);
            } else {
                updateArrow(null);
                updatePanelPosition(null);
            }
        } catch (e) { /* ignore */ }
    }

    function celebrate() {
        try {
            if (typeof window.escreverLog === 'function') {
                window.escreverLog('<span style="color:#34d399;font-weight:bold;">' + tn('game.tutorial.celebrate') + '</span>');
            }
            // Efeito visual de celebração
            var overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.zIndex = '9999';
            overlay.style.pointerEvents = 'none';
            overlay.style.background = 'radial-gradient(circle, rgba(250, 204, 21, 0.2) 0%, transparent 70%)';
            overlay.style.animation = 'tutorial-celebrate 1.5s ease-out forwards';
            document.body.appendChild(overlay);
            setTimeout(function() { overlay.remove(); }, 1600);
        } catch (e) { /* ignore */ }
    }

    function setStep(n) {
        var p = getProg();
        p.step = Math.max(0, Math.min(DONE_STEP, n));
        if (p.step >= DONE_STEP) {
            p.active = false;
            p.completed = true;
            p.skipped = false;
            persistSilent();
            hidePanel();
            celebrate();
            // Garante que o painel suma imediatamente ao concluir
            setTimeout(hidePanel, 100);
            return;
        }
        persistSilent();
        render();
    }

    function stepContent(step) {
        var s = (step === undefined || step === null) ? 0 : step;
        var c = {
            title: tn('game.tutorial.s' + s + 'Title'),
            body: tn('game.tutorial.s' + s + 'Body')
        };
        if (s === 4) c.body += ' ' + tn('game.tutorial.hintSlot');
        return c;
    }

    function primaryActionForStep(step) {
        var s = (step === undefined || step === null) ? 0 : step;
        if (s <= 1) {
            return { label: tn('game.tutorial.next'), fn: function () { setStep(s + 1); } };
        }
        if (s === 2) {
            return {
                label: tn('game.tutorial.openProfile'),
                fn: function () {
                    if (isTravelTabActive('perfil')) {
                        setStep(3);
                        return;
                    }
                    if (typeof window.irPara === 'function') window.irPara('perfil');
                }
            };
        }
        if (s === 3) {
            return {
                label: tn('game.tutorial.openSpellbook'),
                fn: function () {
                    if (isSpellbookModalOpen()) {
                        if (getProg().step === 3) setStep(4);
                        return;
                    }
                    if (typeof window.abrirSpellbook === 'function') window.abrirSpellbook();
                }
            };
        }
        if (s === 4) {
            return { label: tn('game.tutorial.waitAssign'), fn: function () {} };
        }
        if (s === 5) {
            return {
                label: tn('game.tutorial.openWorld'),
                fn: function () {
                    if (isTravelTabActive('world')) {
                        setStep(6);
                        return;
                    }
                    if (typeof window.irPara === 'function') window.irPara('world');
                }
            };
        }
        if (s === 6) {
            return {
                label: tn('game.tutorial.openHunt'),
                fn: function () {
                    if (isFlorestaScreenVisible()) {
                        setStep(7);
                        return;
                    }
                    if (typeof window.irPara === 'function') window.irPara('floresta');
                }
            };
        }
        if (s === 7) {
            return {
                label: tn('game.tutorial.searchHintBtn'),
                fn: function () {
                    try {
                        if (typeof window.escreverLog === 'function') {
                            window.escreverLog('<span style="color:#facc15;">' + tn('game.tutorial.tapSearchRemind') + '</span>');
                        }
                    } catch (e) { /* ignore */ }
                }
            };
        }
        if (s === 8) {
            return { label: tn('game.tutorial.waitAttack'), fn: function () {} };
        }
        if (s === 9) {
            return { label: tn('game.tutorial.next'), fn: function () { setStep(10); } };
        }
        return { label: tn('game.tutorial.done'), fn: function () { setStep(DONE_STEP); } };
    }

    function render() {
        try {
            if (!isRunning()) {
                hidePanel();
                return;
            }
            var step = getProg().step;
            var panel = document.getElementById('tutorial-coach-panel');
            if (!panel) return;

            var content = stepContent(step);
            var titleEl = document.getElementById('tutorial-coach-title');
            var bodyEl = document.getElementById('tutorial-coach-body');
            var nextBtn = document.getElementById('tutorial-coach-next');
            var backBtn = document.getElementById('tutorial-coach-back');
            var skipBtn = document.getElementById('tutorial-coach-skip');
            var progressFill = document.getElementById('tutorial-coach-progress-bar');

            if (titleEl) titleEl.textContent = content.title || tn('game.tutorial.badge');
            if (bodyEl) bodyEl.textContent = content.body;

            if (progressFill) {
                var pct = Math.round((step / DONE_STEP) * 100);
                progressFill.style.width = Math.max(5, pct) + '%'; // Mínimo de 5% para visibilidade
            }

            var prim = primaryActionForStep(step);
            if (nextBtn) {
                nextBtn.textContent = prim.label;
                nextBtn.onclick = function () {
                    try {
                        prim.fn();
                    } catch (e) {
                        console.warn('[Tutorial]', e);
                    }
                };
                nextBtn.style.display = (step === 4 || step === 8) ? 'none' : 'inline-flex';
            }

            if (backBtn) {
                backBtn.style.display = (step > 0 && step !== 4) ? 'inline-flex' : 'none';
                backBtn.textContent = tn('game.tutorial.back');
                backBtn.onclick = function () {
                    setStep(step - 1);
                };
            }
            if (skipBtn) {
                skipBtn.style.display = 'inline-flex'; // Garante visibilidade
                skipBtn.textContent = tn('game.tutorial.skip');
                skipBtn.onclick = function () {
                    try {
                        if (typeof window.l2Confirm === 'function') {
                            window.l2Confirm(tn('game.tutorial.skipConfirmBody'), tn('game.tutorial.skipConfirmTitle')).then(function (ok) {
                                if (ok) skipTutorial();
                            });
                        } else {
                            skipTutorial();
                        }
                    } catch (e) {
                        skipTutorial();
                    }
                };
            }

            panel.classList.remove('tutorial-coach--hidden');
            panel.setAttribute('aria-hidden', 'false');
            
            // Força um reflow para pegar as dimensões reais do painel antes de posicionar
            void panel.offsetWidth;
            
            applyHighlights(step);

            try {
                if (typeof window.I18n !== 'undefined' && window.I18n.refreshDom) {
                    window.I18n.refreshDom(panel);
                }
            } catch (eI) { /* ignore */ }
        } catch (e) {
            console.warn('[Tutorial] render', e);
        }
    }

    function scheduleRender() {
        if (_renderScheduled) return;
        _renderScheduled = true;
        setTimeout(function () {
            _renderScheduled = false;
            render();
        }, 450);
    }

    // Garante que a seta e o highlight acompanhem o scroll ou redimensionamento
    window.addEventListener('resize', function() {
        if (isRunning()) render();
    });
    window.addEventListener('scroll', function() {
        if (isRunning()) render();
    }, true);

    function skipTutorial() {
        console.log("⏭️ [Tutorial] Jogador optou por pular o tour.");
        var p = getProg();
        p.active = false;
        p.completed = true;
        p.skipped = true;
        p.step = DONE_STEP;
        persistSilent();
        hidePanel();
        
        // Garante que todos os bloqueios sumam
        clearHighlights();
        
        // Se pular o tutorial, leva para a tela de profile conforme solicitado
        if (typeof window.irPara === 'function') {
            window.irPara('perfil');
        }
    }

    window.TutorialEngine = {
        bootstrapNewCharacter: function () {
            window.tutorialFirstAttackDone = false;
            window.tutorialProgress = {
                v: 1,
                active: true,
                step: 0,
                completed: false,
                skipped: false
            };
        },

        afterCharacterLoad: function () {
            if (!isRunning()) {
                hidePanel();
                return;
            }
            // Se o tutorial estiver no início (passo < 5) e a barra tiver a skill inicial, limpa para o tutorial
            if (getProg().step < 5 && window.barraAtalhos) {
                var initialSkill = window.isClasseMagica(window.charClass) ? 'Wind Strike' : 'Power Strike';
                if (window.barraAtalhos[1] === initialSkill) {
                    console.log("🎓 [Tutorial] Limpando slot 2 para o passo de equipar skill.");
                    window.barraAtalhos[1] = null;
                }
            }
            try {
                render();
            } catch (e0) { /* ignore */ }
            scheduleRender();
        },

        onNav: function (lugar) {
            if (!isRunning()) return;
            var s = getProg().step;
            try {
                if (lugar === 'perfil' && s === 2) {
                    setStep(3);
                    return;
                }
                if (lugar === 'world' && s === 5) {
                    setStep(6);
                    return;
                }
                if (lugar === 'floresta' && s === 5) {
                    setStep(6);
                    return;
                }
                if (lugar === 'floresta' && s === 6) {
                    setStep(7);
                    return;
                }
            } catch (e) { /* ignore */ }
        },

        notifySpellbookOpened: function () {
            if (!isRunning()) return;
            if (getProg().step === 3) setStep(4);
        },

        notifySkillAssignedFromSpellbook: function () {
            if (!isRunning()) return;
            if (getProg().step === 4) setStep(5);
        },

        notifyHuntSearch: function () {
            if (!isRunning()) return;
            if (getProg().step === 7) setStep(8);
        },

        notifyFirstAttack: function () {
            if (!isRunning()) return;
            if (getProg().step === 8) {
                window.tutorialFirstAttackDone = true;
                setTimeout(function() {
                    setStep(9);
                }, 1500);
            }
        },

        skipTutorial: skipTutorial,
        render: render,
        isRunning: isRunning
    };

export {};
