/**
 * UI — enchant e augment
 * Migrado: js/ui_enchant.js — Fase 4: tipos explícitos.
 */

import type {
  AugmentArmaSelection,
  AugmentIndexArma,
  AugmentItemRpcResult,
  AugmentStatPayload,
  EnchantItemRpcResult,
  EnchantScrollCatalogEntry,
  EnchantScrollMeta,
  EnchantTargetEquip,
  EquipInstance,
  ItemCatalogBase,
  ShopCatalogItem,
} from '../types/game';

let targetEquipObj: EnchantTargetEquip | null = null;
let targetScroll: string | null = null;
let listaItensEnchant: EnchantTargetEquip[] = [];
let _enchantInProgress = false;

function enchantT(key: string, params?: Record<string, string | number>): string {
  return typeof window.t === 'function' ? window.t(key, params) : key;
}

function _rpcErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || error);
  }
  return String(error);
}

function _invNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Catálogo de scrolls (db_items.js expõe em window após boot). */
function scrollCatalog(): EnchantScrollCatalogEntry[] {
  return (window.catalogoScrolls || []) as EnchantScrollCatalogEntry[];
}

/** Catálogo da arma no fluxo augment (equipada = EquipInstance com `.base`). */
type AugmentCatalogView = AugmentArmaSelection & ItemCatalogBase;

function _resolveAugmentCatalog(equip: AugmentArmaSelection): AugmentCatalogView {
  const raw = equip.base;
  if (raw && typeof raw === 'object' && 'base' in raw && (raw as EquipInstance).base) {
    const cat = (raw as EquipInstance).base;
    return Object.assign({}, cat, equip, { base: cat }) as AugmentCatalogView;
  }
  const cat = raw as ItemCatalogBase;
  return Object.assign({}, cat, equip, { base: cat }) as AugmentCatalogView;
}

interface AugmentRollStat {
  prop: 'augPAtk' | 'augMAtk' | 'augPDef' | 'augMDef' | 'augSpd' | 'augCrit';
  txt: string;
  val: number;
}

/** Nível real do equipamento (refOriginal manda; targetEquipObj.lvl pode ficar stale). */
function getEnchantLevelForTarget(equipObj: EnchantTargetEquip | null | undefined): number {
    if (!equipObj) return 0;
    if (equipObj.refOriginal && equipObj.refOriginal.enchant != null) {
        return Math.max(0, parseInt(String(equipObj.refOriginal.enchant), 10) || 0);
    }
    return Math.max(0, parseInt(String(equipObj.lvl), 10) || 0);
}

function syncTargetEquipEnchantLevel(novoLvl: number | string): void {
    if (!targetEquipObj) return;
    var lvl = Math.max(0, parseInt(String(novoLvl), 10) || 0);
    targetEquipObj.lvl = lvl;
    if (targetEquipObj.refOriginal) {
        targetEquipObj.refOriginal.enchant = lvl;
        if (targetEquipObj.refOriginal.base) {
            targetEquipObj.refOriginal.base.enchant = lvl;
        }
    }
}

/** Re-liga targetEquipObj à lista fresca após atualizarInterfaceEnchant. */
function refreshTargetEquipObjSelection(): void {
    if (!targetEquipObj) return;
    var match = listaItensEnchant.find(function (i) {
        if (targetEquipObj.uid && i.uid) return i.uid === targetEquipObj.uid;
        return i.idUnico === targetEquipObj.idUnico;
    });
    if (match) {
        targetEquipObj = match;
    } else if (targetEquipObj.refOriginal) {
        targetEquipObj.lvl = getEnchantLevelForTarget(targetEquipObj);
    }
}

function extrairMetaScroll(scroll: EnchantScrollCatalogEntry | null | undefined): EnchantScrollMeta {
    if (!scroll) return { tipo: null, grade: null, abencoado: false };
    const nome = (scroll.nome || '').toUpperCase();
    const id = (scroll.id || '').toLowerCase();
    const tipo = scroll.tipo || (nome.includes('WEAPON') ? 'weapon' : (nome.includes('ARMOR') ? 'armor' : null));
    const grade = scroll.grade
        || (nome.includes('(NG)') ? 'No-Grade'
            : nome.includes('(D)') ? 'D'
            : nome.includes('(C)') ? 'C'
            : nome.includes('(B)') ? 'B'
            : nome.includes('(A)') ? 'A'
            : nome.includes('(S)') ? 'S'
            : null);
    const abencoado = (typeof scroll.abencoado === 'boolean') ? scroll.abencoado : (nome.includes('BLESSED') || id.includes('sc_b'));
    return { tipo, grade, abencoado };
}

function scrollCompativelComTipo(scrollTipo: string | null, tipoEquip: string | null | undefined): boolean {
    if (!scrollTipo || !tipoEquip) return false;
    if (scrollTipo === tipoEquip) return true;
    // Regra L2 do projeto: joias usam scroll de armadura
    if (scrollTipo === 'armor' && tipoEquip === 'jewel') return true;
    return false;
}

/** Mesma curva que o modo offline e a RPC `enchant_item_secure` (antes da tentativa). */
function calcularChanceEnchant(lvlAtual: number | string): number {
    const lvl = Math.max(0, parseInt(String(lvlAtual), 10) || 0);
    if (lvl < 3) return 100;
    const curvaDeChances = [66, 63, 60, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 8, 4, 1];
    const i = lvl - 3;
    return curvaDeChances[i] != null ? curvaDeChances[i] : 1;
}

const ENCHANT_TENSION_MS = 1500;

function aguardarTensaoEnchant(inicioMs: number): Promise<void> {
    const restante = Math.max(0, ENCHANT_TENSION_MS - (Date.now() - inicioMs));
    return new Promise(function (resolve) { setTimeout(resolve, restante); });
}

/** Botão do pop-up pós-tentativa — evita herdar "SELECT FOR ENCHANT" de modais anteriores. */
function configurarBotaoFecharResultadoEnchant(btnBg: string): void {
    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!btnAcao) return;
    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.continue') : 'CONTINUE';
    btnAcao.style.background = btnBg || '#444';
    btnAcao.onclick = function () {
        if (typeof window.fecharJanelaAcao === 'function') window.fecharJanelaAcao();
    };
}

function abrirJanelaEnchant(): void { 
    targetEquipObj = null; 
    targetScroll = null; 
    atualizarInterfaceEnchant(); 
    window.abrirModal('janela-enchant', 1500); 
}

function fecharEnchant(): void { 
    window.fecharModal('janela-enchant'); 
}

function selecionarScrollEnchant(tipo: string): void { 
    targetScroll = tipo; 
    atualizarInterfaceEnchant(); 
}

// Abre a janela de confirmação do item antes de jogar no slot
window.abrirInfoEquipEnchantFromGrid = function (el: HTMLElement | null): void {
    var raw = el && el.getAttribute ? el.getAttribute('data-enchant-equip') : '';
    if (!raw) return;
    try {
        abrirInfoEquipEnchant(decodeURIComponent(raw));
    } catch (e) {
        abrirInfoEquipEnchant(raw);
    }
};

window.abrirInfoScrollEnchantFromGrid = function (el: HTMLElement | null): void {
    var raw = el && el.getAttribute ? el.getAttribute('data-enchant-scroll') : '';
    if (!raw) return;
    try {
        abrirInfoScrollEnchant(decodeURIComponent(raw));
    } catch (e) {
        abrirInfoScrollEnchant(raw);
    }
};

function abrirInfoEquipEnchant(idUnico: string): void {
    const item = listaItensEnchant.find((i) => i.idUnico === idUnico);
    if (!item) return;

    window.abrirModal('janela-item-acao', 2100);
    const titulo = document.getElementById('acao-titulo');
    const img = document.getElementById('acao-img') as HTMLImageElement | null;
    const desc = document.getElementById('acao-desc');
    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!titulo || !img || !desc || !btnAcao) return;

    titulo.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectGear') : 'SELECT GEAR';
    img.src = item.base.img || '';

    const info = typeof window.formatarTooltipEquipamento === 'function'
        ? window.formatarTooltipEquipamento(item.base, item.lvl, item.isAugment, item.tipo, item.refOriginal)
        : '';
    const locText = item.local === 'equipado'
        ? '<br><b style="color:#10b981;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.equippedNow') : '[EQUIPPED]') + '</b>'
        : '<br><b style="color:#aaa;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.inBag') : '[IN BAG]') + '</b>';

    desc.innerHTML = info + locText;

    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectForEnchant') : 'SELECT FOR ENCHANT';
    btnAcao.style.background = '#ca8a04';
    btnAcao.onclick = function () {
        targetEquipObj = item;
        atualizarInterfaceEnchant();
        window.fecharJanelaAcao();
    };
}

function abrirInfoScrollEnchant(nomeItem: string): void {
    const infoScroll = scrollCatalog().find((s) => s.nome === nomeItem);
    if (!infoScroll) return;
    const meta = extrairMetaScroll(infoScroll);
    window.abrirModal('janela-item-acao', 2100);

    const titulo = document.getElementById('acao-titulo');
    const img = document.getElementById('acao-img') as HTMLImageElement | null;
    const desc = document.getElementById('acao-desc');
    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!titulo || !img || !desc || !btnAcao) return;

    titulo.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectScroll') : 'SELECT SCROLL';
    img.src = infoScroll.img || 'assets/npcs/grocer.png';

    const ownLbl = (typeof window.t === 'function') ? window.t('game.shop.ownedLabel') : 'Owned:';
    const owned = _invNum(window.inventario[nomeItem]);
    desc.innerHTML = `<b style="color:${meta.abencoado ? '#fde047' : '#8b5cf6'}">${nomeItem}</b><br><br>${infoScroll.desc || ''}<br><br><span style="color:#aaa;">${ownLbl} ${owned}</span>`;

    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.selectScroll') : 'SELECT SCROLL';
    btnAcao.style.background = meta.abencoado ? '#ca8a04' : '#8b5cf6';
    btnAcao.onclick = function () {
        selecionarScrollEnchant(nomeItem);
        window.fecharJanelaAcao();
    };
}

function atualizarInterfaceEnchant(): void {
    // 1. FAZ A VARREDURA E CRIA A LISTA DE ITENS ENCANTÁVEIS
    listaItensEnchant = [];
    
    // Itens Equipados
    if (window.armaEquipadaBase && window.armaEquipadaBase.base) {
        listaItensEnchant.push({ 
            idUnico: 'eq_wpn', 
            local: 'equipado', 
            tipo: 'weapon', 
            base: window.armaEquipadaBase.base, 
            lvl: window.armaEquipadaBase.enchant || 0, 
            isAugment: window.armaEquipadaBase.augmented || false,
            uid: window.armaEquipadaBase.uid,
            refOriginal: window.armaEquipadaBase // Referência direta para alteração!
        });
    }
    if (window.armaduraEquipada && window.armaduraEquipada.base) {
        listaItensEnchant.push({ 
            idUnico: 'eq_arm', 
            local: 'equipado', 
            tipo: 'armor', 
            base: window.armaduraEquipada.base, 
            lvl: window.armaduraEquipada.enchant || 0, 
            isAugment: false,
            uid: window.armaduraEquipada.uid,
            refOriginal: window.armaduraEquipada
        });
    }

    const slotsJoias = [
        { id: 'eq_neck', item: window.colarEquipado, tipo: 'jewel' },
        { id: 'eq_ear1', item: window.brincoEquipado1, tipo: 'jewel' },
        { id: 'eq_ear2', item: window.brincoEquipado2, tipo: 'jewel' },
        { id: 'eq_ring1', item: window.anelEquipado1, tipo: 'jewel' },
        { id: 'eq_ring2', item: window.anelEquipado2, tipo: 'jewel' }
    ];

    slotsJoias.forEach(slot => {
        if (slot.item && slot.item.base) {
            listaItensEnchant.push({
                idUnico: slot.id,
                local: 'equipado',
                tipo: slot.tipo,
                base: slot.item.base,
                lvl: slot.item.enchant || 0,
                isAugment: false,
                uid: slot.item.uid,
                refOriginal: slot.item
            });
        }
    });

    // Itens na Bolsa (window.inventarioEquips)
    window.inventarioEquips.forEach((equip, idx) => {
        if (!equip || !equip.base) return;
        listaItensEnchant.push({ 
            idUnico: 'bolsa_' + (equip.uid || idx), 
            local: 'bolsa', 
            index: idx, 
            tipo: equip.tipo || equip.base.tipoItem || equip.base.tipo, 
            base: equip.base, 
            lvl: equip.enchant || 0, 
            isAugment: equip.augmented || false,
            uid: equip.uid,
            refOriginal: equip
        });
    });

    // 2. DESENHA A GRID DE EQUIPAMENTOS
    const gridEquip = document.getElementById('enchant-equip-grid');
    const gridScroll = document.getElementById('enchant-scroll-grid');
    const slotTargetEquip = document.getElementById('slot-target-equip');
    const slotTargetScroll = document.getElementById('slot-target-scroll');
    const btn = document.getElementById('btn-executar-enchant') as HTMLButtonElement | null;
    const aviso = document.getElementById('enchant-warning') as HTMLElement | null;
    if (!gridEquip || !gridScroll || !slotTargetEquip || !slotTargetScroll || !btn || !aviso) return;

    let htmlEquip = ''; 
    listaItensEnchant.forEach(item => {
        let bordaAtiva = (targetEquipObj && targetEquipObj.idUnico === item.idUnico) ? 'glow-yellow' : '';
        let marcaEquipado = item.local === 'equipado'
            ? `<span class="enchant-equip-badge">${(typeof window.t === 'function') ? window.t('game.enchantUi.markEquipped') : '[E]'}</span>`
            : '';
        var equipEnc = encodeURIComponent(item.idUnico);
        htmlEquip += `<div class="store-item-slot enchant-equip-cell ${bordaAtiva}" data-enchant-equip="${equipEnc}" onclick="abrirInfoEquipEnchantFromGrid(this)">
            ${marcaEquipado}
            <img src="${item.base.img}" class="inv-img" alt="">
            ${item.lvl > 0 ? `<div class="inv-qtd">+${item.lvl}</div>` : ''}
        </div>`;
    });
    gridEquip.innerHTML = htmlEquip.length > 0 ? htmlEquip : `<span style="font-size:8px; color:#aaa; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noEquipment') : 'No equipment.'}</span>`;

    // 3. DESENHA A GRID DE SCROLLS
    let htmlScroll = ''; 
    let temScroll = false;
    Object.keys(window.inventario).forEach(nomeItem => {
        let infoScroll = scrollCatalog().find(s => s.nome === nomeItem);
        if (infoScroll) {
            temScroll = true;
            let meta = extrairMetaScroll(infoScroll);
            let bordaAtiva = targetScroll === nomeItem ? 'glow-yellow' : '';
            var scrollEnc = encodeURIComponent(nomeItem);
            var blessedCls = meta.abencoado ? 'enchant-scroll-cell--blessed' : 'enchant-scroll-cell--normal';
            var tip = nomeItem.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            htmlScroll += `
                <div class="store-item-slot enchant-scroll-cell ${blessedCls} ${bordaAtiva}" data-enchant-scroll="${scrollEnc}" onclick="abrirInfoScrollEnchantFromGrid(this)" title="${tip}">
                    <img src="${infoScroll.img}" class="inv-img enchant-scroll-cell__icon" alt="" loading="lazy">
                    <span class="inv-qtd">${window.inventario[nomeItem]}</span>
                </div>`;
        }
    });
    gridScroll.innerHTML = temScroll ? htmlScroll : `<span style="font-size:8px; color:#aaa; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noScrolls') : 'No scrolls.'}</span>`;

    // 4. DESENHA O PREVIEW DO MEIO
    let previewEquip = targetEquipObj ? `<img src="${targetEquipObj.base.img}" class="inv-img" alt="">` : '?';
    let infoScrollAlvo = scrollCatalog().find(s => s.nome === targetScroll);
    let previewScroll = infoScrollAlvo ? `<img src="${infoScrollAlvo.img}" class="inv-img" alt="">` : '?';

    slotTargetEquip.innerHTML = previewEquip;
    slotTargetScroll.innerHTML = previewScroll;

    // 5. VALIDAÇÕES FINAIS (Travar botão se errado)
    aviso.style.display = 'none';
    btn.disabled = true;
    
    if (targetEquipObj && targetScroll && infoScrollAlvo) { 
        let gradeEquip = targetEquipObj.base.grade || 'No-Grade';
        let lvlAtual = getEnchantLevelForTarget(targetEquipObj);
        
        let metaScroll = extrairMetaScroll(infoScrollAlvo);
        if (metaScroll.grade !== gradeEquip || !scrollCompativelComTipo(metaScroll.tipo, targetEquipObj.tipo)) {
            aviso.innerText = (typeof window.t === 'function')
                ? window.t('game.enchantUi.scrollIncompatible', { grade: gradeEquip, type: targetEquipObj.tipo.toUpperCase() })
                : (`INCOMPATIBLE SCROLL! Requires [${gradeEquip}] for ${targetEquipObj.tipo.toUpperCase()} (jewels use armor scroll).`);
            aviso.style.color = "#ef4444"; aviso.style.display = 'block'; return;
        }
        if (lvlAtual >= 25) { aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.maxPlus25') : 'Maximum reached (+25).'; aviso.style.color = "#3b82f6"; aviso.style.display = 'block'; return; }
        
        btn.disabled = false;
        const successPct = calcularChanceEnchant(lvlAtual);
        const failPct = Math.max(0, 100 - successPct);
        if (!metaScroll.abencoado) {
            if (successPct < 100) {
                aviso.innerText = (typeof window.t === 'function')
                    ? window.t('game.enchantUi.breakRiskWithChance', { successPct, failPct })
                    : ('⚠️ ~' + failPct + '% failure — item can crystallize! (~' + successPct + '% success).');
                aviso.style.color = '#ef4444';
                aviso.style.display = 'block';
            } else {
                aviso.style.display = 'none';
            }
        } else if (successPct < 100) {
            aviso.innerText = (typeof window.t === 'function')
                ? window.t('game.enchantUi.safeBlessedWithChance', { successPct, failPct })
                : ('✨ Blessed: safe on fail. ~' + successPct + '% success.');
            aviso.style.color = '#fde047';
            aviso.style.display = 'block';
        } else {
            aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.safeBlessed') : '✨ SAFE ENCHANT (BLESSED) ✨';
            aviso.style.color = '#fde047';
            aviso.style.display = 'block';
        }
    }

    refreshTargetEquipObjSelection();
}

async function executarEnchant(): Promise<void> {
    if (!targetEquipObj || !targetScroll) return;
    if (_enchantInProgress) return;
    if (!window.inventario[targetScroll] || window.inventario[targetScroll] <= 0) return; 
    
    let infoScrollAlvo = scrollCatalog().find(s => s.nome === targetScroll);
    let lvlAtual = getEnchantLevelForTarget(targetEquipObj);
    let nomeEquip = targetEquipObj.base.nome;
    let gradeEquip = targetEquipObj.base.grade || 'No-Grade';
    let tipoItem = targetEquipObj.tipo;
    
    let metaScroll = extrairMetaScroll(infoScrollAlvo);
    if (metaScroll.grade !== gradeEquip || !scrollCompativelComTipo(metaScroll.tipo, tipoItem) || lvlAtual >= 25) { return; }

    let btnAcaoEnchant = document.getElementById('btn-executar-enchant') as HTMLButtonElement | null;
    if (!btnAcaoEnchant) return;
    btnAcaoEnchant.disabled = true;
    _enchantInProgress = true;
    btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchanting') : 'ENCHANTING...';
    btnAcaoEnchant.style.background = "#ca8a04";

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName && targetEquipObj.uid) {
        const tEnchantStart = Date.now();
        const chanceExibida = calcularChanceEnchant(lvlAtual);
        try {
            const { data, error } = await window.SupabaseAPI.enchantItem(window.charName, targetEquipObj.uid, targetScroll);
            const rpcData = data as EnchantItemRpcResult | null;
            
            if (error) {
                console.error('[Enchant RPC Error]', error);
                if (typeof window.l2Alert === 'function') {
                    const msg = typeof window.cloudRpcMessage === 'function'
                        ? window.cloudRpcMessage(error)
                        : _rpcErrorMessage(error);
                    window.l2Alert(msg);
                }
                btnAcaoEnchant.disabled = false;
                _enchantInProgress = false;
                btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
                btnAcaoEnchant.style.background = '#15803d';
                return;
            }

            if (rpcData && rpcData.success) {
                await aguardarTensaoEnchant(tEnchantStart);
                // Sincroniza inventário local (remover scroll)
                window.inventario[targetScroll]--; 
                if (window.inventario[targetScroll] <= 0) delete window.inventario[targetScroll];

                if (rpcData.enchant_success) {
                    if (typeof window.tocarSom === 'function') window.tocarSom('enchant');
                    let novoLvl = _invNum(rpcData.new_level);
                    syncTargetEquipEnchantLevel(novoLvl);

                    let mensagemLog = `<span style="color:#00ff00; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSuccess', { item: nomeEquip, level: novoLvl, chance: chanceExibida }) : ('✨ SUCCESS! Your ' + nomeEquip + ' is now +' + novoLvl + '! (' + chanceExibida + '% chance)')}</span>`;
                    if (novoLvl === 15) mensagemLog += `<br><span style="color:#fde047; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal15', { item: nomeEquip }) : ('🌟 [WORLD] Legendary! A ' + nomeEquip + ' +15!')}</span>`;
                    if (novoLvl === 20) mensagemLog += `<br><span style="color:#f97316; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal20', { item: nomeEquip }) : ('🔥 [WORLD] Epic! A ' + nomeEquip + ' +20!')}</span>`;
                    if (novoLvl === 25) mensagemLog += `<br><span style="color:#ef4444; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal25') : '⚡ [WORLD] Divine! +25 cap reached!'}</span>`;
                    if (typeof window.escreverLog === 'function') window.escreverLog(mensagemLog);

                    // Pop-up de Sucesso
                    window.abrirModal('janela-item-acao', 2100);
                    document.getElementById('acao-titulo').innerHTML = '<span style="color:#10b981; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantSuccess') : 'ENCHANT SUCCESS!') + '</span>';
                    const acaoImgOk = document.getElementById('acao-img') as HTMLImageElement | null;
                    if (acaoImgOk) acaoImgOk.src = targetEquipObj.base.img || '';
                    document.getElementById('acao-desc')!.innerHTML = typeof window.formatarTooltipEquipamento === 'function'
                        ? window.formatarTooltipEquipamento(targetEquipObj.base, novoLvl, targetEquipObj.isAugment, tipoItem, targetEquipObj.refOriginal)
                        : '';
                    
                    configurarBotaoFecharResultadoEnchant('#15803d');
                    targetScroll = null;
                } else {
                    if (rpcData.crystallized) {
                        if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logFatalFail', { item: nomeEquip, level: lvlAtual }) : ('💥 FAIL! Your ' + nomeEquip + ' +' + lvlAtual + ' crystallized! 💥')}</span>`);
                        let ganhoCristais = _invNum(rpcData.crystals_gained);
                        if(window.inventario['Crystals']) window.inventario['Crystals'] += ganhoCristais; else window.inventario['Crystals'] = ganhoCristais;
                        if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#60a5fa">${(typeof window.t === 'function') ? window.t('game.enchantUi.logReceivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</span>`);
                        if (window.ItemSecurity && targetEquipObj.refOriginal) {
                            window.ItemSecurity.registerDestruction(targetEquipObj.refOriginal);
                        }
                        if (typeof window.InventoryManager !== 'undefined' && typeof window.InventoryManager.removerEquipamentoPorUid === 'function') {
                            window.InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                        }

                        // Pop-up de Cristalização
                        window.abrirModal('janela-item-acao', 2100);
                        document.getElementById('acao-titulo').innerHTML = '<span style="color:#ef4444; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.crystallized') : 'CRYSTALLIZED!') + '</span>';
                        const acaoImgCry = document.getElementById('acao-img') as HTMLImageElement | null;
                        if (acaoImgCry) acaoImgCry.src = 'assets/npcs/grocer.png'; 
                        document.getElementById('acao-desc').innerHTML = `<b style="color:#ef4444">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.equipDestroyed') : 'Your equipment was destroyed.'}</span><br><br><b style="color:#60a5fa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.receivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</b>`;
                        configurarBotaoFecharResultadoEnchant('#444');
                        targetEquipObj = null; 
                        targetScroll = null;
                    } else {
                        // Safe Fail (Blessed)
                        if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#fde047; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSafeFail', { chance: chanceExibida, item: nomeEquip, level: lvlAtual }) : ('🛡️ SAFE FAIL! (' + chanceExibida + '%). Scroll gone; ' + nomeEquip + ' stays +' + lvlAtual + '.')}</span>`);
                        window.abrirModal('janela-item-acao', 2100);
                        document.getElementById('acao-titulo').innerHTML = '<span style="color:#fde047; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantFailed') : 'ENCHANT FAILED') + '</span>';
                        const acaoImgOk = document.getElementById('acao-img') as HTMLImageElement | null;
                    if (acaoImgOk) acaoImgOk.src = targetEquipObj.base.img || '';
                        document.getElementById('acao-desc').innerHTML = `<b style="color:white">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.enchantScrollSafe', { level: lvlAtual }) : ('The scroll was destroyed, but your equipment is safe. It stays +' + lvlAtual + '.')}</span>`;
                        configurarBotaoFecharResultadoEnchant('#444');
                        targetScroll = null;
                    }
                }
                
                btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
                btnAcaoEnchant.style.background = "#15803d";
                btnAcaoEnchant.disabled = false;
                _enchantInProgress = false;
                if (typeof window.InventoryManager !== 'undefined' && window.InventoryManager.sincronizarStatus) window.InventoryManager.sincronizarStatus();
                atualizarInterfaceEnchant();
            } else {
                const msg = (rpcData && rpcData.error) ? String(rpcData.error) : '';
                if (typeof window.l2Alert === 'function') {
                    window.l2Alert(typeof window.cloudRpcMessage === 'function'
                        ? window.cloudRpcMessage(msg || 'unknown')
                        : ('Cloud error' + (msg ? ': ' + msg : '')));
                }
                btnAcaoEnchant.disabled = false;
                _enchantInProgress = false;
                btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
                btnAcaoEnchant.style.background = '#15803d';
            }
        } catch (err) {
            console.error('[Enchant RPC Exception]', err);
            btnAcaoEnchant.disabled = false;
            _enchantInProgress = false;
            btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
            btnAcaoEnchant.style.background = '#15803d';
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    // Remove o pergaminho imediatamente
    window.inventario[targetScroll]--; 
    if (window.inventario[targetScroll] <= 0) delete window.inventario[targetScroll];
    
    let isBlessed = metaScroll.abencoado;
    let chance = calcularChanceEnchant(lvlAtual);

    // Espera 1.5 segundos (1500 ms) antes de revelar o resultado!
    setTimeout(() => {
        if (Math.random() * 100 <= chance) { 
            if (typeof window.tocarSom === 'function') window.tocarSom('enchant'); 
            let novoLvl = lvlAtual + 1; 
            syncTargetEquipEnchantLevel(novoLvl);

            // Sincroniza via window.InventoryManager (isso cuidará de tudo)
            if (typeof window.InventoryManager !== 'undefined' && window.InventoryManager.sincronizarStatus) {
                window.InventoryManager.sincronizarStatus();
            }
            
            let mensagemLog = `<span style="color:#00ff00; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSuccess', { item: nomeEquip, level: novoLvl, chance }) : ('✨ SUCCESS! Your ' + nomeEquip + ' is now +' + novoLvl + '! (' + chance + '% chance)')}</span>`;
            if (novoLvl === 15) mensagemLog += `<br><span style="color:#fde047; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal15', { item: nomeEquip }) : ('🌟 [WORLD] Legendary! A ' + nomeEquip + ' +15!')}</span>`;
            if (novoLvl === 20) mensagemLog += `<br><span style="color:#f97316; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal20', { item: nomeEquip }) : ('🔥 [WORLD] Epic! A ' + nomeEquip + ' +20!')}</span>`;
            if (novoLvl === 25) mensagemLog += `<br><span style="color:#ef4444; text-shadow:1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logGlobal25') : '⚡ [WORLD] Divine! +25 cap reached!'}</span>`;
            if (typeof window.escreverLog === 'function') window.escreverLog(mensagemLog);
            
            // Pop-up de Sucesso
            window.abrirModal('janela-item-acao', 2100);
            document.getElementById('acao-titulo').innerHTML = '<span style="color:#10b981; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantSuccess') : 'ENCHANT SUCCESS!') + '</span>';
            const acaoImgOff = document.getElementById('acao-img') as HTMLImageElement | null;
            if (acaoImgOff && targetEquipObj) acaoImgOff.src = targetEquipObj.base.img || '';
            document.getElementById('acao-desc')!.innerHTML = typeof window.formatarTooltipEquipamento === 'function'
                ? window.formatarTooltipEquipamento(targetEquipObj!.base, novoLvl, targetEquipObj!.isAugment, tipoItem, targetEquipObj!.refOriginal)
                : '';
            
            configurarBotaoFecharResultadoEnchant('#15803d');

            targetScroll = null; 
            
        } else { 
            if (isBlessed) {
                if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#fde047; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logSafeFail', { chance, item: nomeEquip, level: lvlAtual }) : ('🛡️ SAFE FAIL! (' + chance + '%). Scroll gone; ' + nomeEquip + ' stays +' + lvlAtual + '.')}</span>`);
                window.abrirModal('janela-item-acao', 2100);
                document.getElementById('acao-titulo').innerHTML = '<span style="color:#fde047; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.enchantFailed') : 'ENCHANT FAILED') + '</span>';
                const acaoImgOff = document.getElementById('acao-img') as HTMLImageElement | null;
            if (acaoImgOff && targetEquipObj) acaoImgOff.src = targetEquipObj.base.img || '';
                document.getElementById('acao-desc').innerHTML = `<b style="color:white">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.enchantScrollSafe', { level: lvlAtual }) : ('The scroll was destroyed, but your equipment is safe. It stays +' + lvlAtual + '.')}</span>`;
                
            } else {
                if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">${(typeof window.t === 'function') ? window.t('game.enchantUi.logFatalFail', { item: nomeEquip, level: lvlAtual }) : ('💥 FAIL! Your ' + nomeEquip + ' +' + lvlAtual + ' crystallized! 💥')}</span>`);
                let ganhoCristais = (lvlAtual * 10) + 50;
                if(window.inventario['Crystals']) window.inventario['Crystals'] += ganhoCristais; else window.inventario['Crystals'] = ganhoCristais;
                if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:#60a5fa">${(typeof window.t === 'function') ? window.t('game.enchantUi.logReceivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</span>`);

                if (window.ItemSecurity && targetEquipObj?.refOriginal) {
                    window.ItemSecurity.registerDestruction(targetEquipObj.refOriginal);
                }

                // DESTRÓI O ITEM NO LOCAL CORRETO
                if (targetEquipObj.local === 'equipado') {
                    const slotAlvo = targetEquipObj.idUnico.replace('eq_', '');
                    // Força desequipe (o item vai para a bolsa)
                    window.InventoryManager.desequiparGarantido(slotAlvo);
                    // Agora remove da bolsa (UID check)
                    window.InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                } else {
                    // Remove da bolsa por UID
                    window.InventoryManager.removerEquipamentoPorUid(targetEquipObj.uid);
                }
                
                // Pop-up de Cristalização
                window.abrirModal('janela-item-acao', 2100);
                document.getElementById('acao-titulo').innerHTML = '<span style="color:#ef4444; text-shadow: 1px 1px 0 #000;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.crystallized') : 'CRYSTALLIZED!') + '</span>';
                const acaoImgOffCry = document.getElementById('acao-img') as HTMLImageElement | null;
                if (acaoImgOffCry) acaoImgOffCry.src = 'assets/npcs/grocer.png'; 
                document.getElementById('acao-desc').innerHTML = `<b style="color:#ef4444">${nomeEquip}</b><br><br><span style="color:#aaa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.equipDestroyed') : 'Your equipment was destroyed.'}</span><br><br><b style="color:#60a5fa;">${(typeof window.t === 'function') ? window.t('game.enchantUi.receivedCrystals', { n: ganhoCristais }) : ('Received ' + ganhoCristais + ' Crystals.')}</b>`;
                
                targetEquipObj = null; 
                targetScroll = null;
            }
            
            configurarBotaoFecharResultadoEnchant('#444');
        } 
        
        btnAcaoEnchant.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.enchant') : 'ENCHANT';
        btnAcaoEnchant.style.background = "#15803d";
        btnAcaoEnchant.disabled = false;
        _enchantInProgress = false;
        
        if (typeof window.InventoryManager !== 'undefined' && window.InventoryManager.sincronizarStatus) {
            window.InventoryManager.sincronizarStatus();
        }
        atualizarInterfaceEnchant(); 
        
    }, 1500); 
}

// ==========================================
// ESQUELETO DO SISTEMA DE AUGMENT
// ==========================================

// ==========================================
// ESQUELETO DO SISTEMA DE AUGMENT
// ==========================================

// ==========================================
// SISTEMA DE AUGMENT (FORJA)
// ==========================================
// ==========================================
// SISTEMA DE AUGMENT (FORJA) - COMPLETO
// ==========================================
// ==========================================
// SISTEMA DE AUGMENT (FORJA) - COMPLETO E FINAL
// ==========================================
let augmentArmaSelecionada: AugmentArmaSelection | null = null;
let augmentStoneSelecionada: string | null = null;
let augmentIndexArma: AugmentIndexArma = null;

function abrirJanelaAugment(): void {
    if (typeof window.fecharNpc === 'function') window.fecharNpc();
    window.abrirModal('janela-augment', 1500);
    resetarAugment();
    renderizarAugmentGrids();
}

function fecharAugment(): void {
    window.fecharModal('janela-augment');
}

function resetarAugment(): void {
    augmentArmaSelecionada = null;
    augmentStoneSelecionada = null;
    augmentIndexArma = null;
    const slotEquip = document.getElementById('slot-target-augment-equip');
    const slotStone = document.getElementById('slot-target-augment-stone');
    if (slotEquip) slotEquip.innerHTML = '?';
    if (slotStone) slotStone.innerHTML = '?';
    const btn = document.getElementById('btn-executar-augment') as HTMLButtonElement | null;
    if(btn) {
        btn.disabled = true;
        btn.style.background = '#444';
    }
    const aviso = document.getElementById('augment-warning') as HTMLElement | null;
    if (aviso) aviso.style.display = 'none';
}

function criarBadgeAugment(isAug: boolean, equip: ItemCatalogBase | { augLevel?: number }): string {
    if (!isAug) return '';
    let lvl = _invNum((equip as ItemCatalogBase).augLevel) || 1;
    let cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
    let cor = cores[lvl - 1] || '#a855f7';
    let txt = lvl === 5 ? 'MAX' : `LV${lvl}`;
    return `<div style="position:absolute; background:rgba(0,0,0,0.8); width:100%; height:100%; top:0; left:0; display:flex; flex-direction:column; justify-content:center; align-items:center; font-size:10px; color:${cor}; font-weight:bold; z-index:5; text-shadow: 0 0 5px ${cor}; box-sizing:border-box;"><span>AUG</span><span style="font-size:8px;">${txt}</span></div>`;
}

// ... Substitua a sua função renderizarAugmentGrids INTEIRA por esta: ...
function renderizarAugmentGrids(): void {
    const gridEquip = document.getElementById('augment-equip-grid');
    const gridStone = document.getElementById('augment-stone-grid');
    if(!gridEquip || !gridStone) return;
    gridEquip.innerHTML = ''; gridStone.innerHTML = '';

    let temArma = false;

    if (window.armaEquipadaBase && window.armaEquipadaBase.base) {
        temArma = true;
        let isAug = !!window.isAugmented;
        let encLevel = window.enchant || 0;
        const _abi = window.armaEquipadaBase.base;
        
        let labelPlus = (encLevel > 0) ? `<div class="inv-qtd">+${encLevel}</div>` : '';
        let badgeE = `<div style="position:absolute; top:2px; left:2px; color:#10b981; font-size:9px; font-weight:bold; text-shadow:1px 1px 0 #000; z-index:10;">[E]</div>`;
        let blockAugment = criarBadgeAugment(isAug, window.armaEquipadaBase.base);

        gridEquip.innerHTML += `
            <div class="store-item-slot" onclick="${isAug ? '' : `abrirAugmentAcao('equipped')`}">
                <img src="${_abi.img}" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                ${badgeE} ${labelPlus} ${blockAugment}
            </div>`;
    }

    if(typeof window.inventarioEquips !== 'undefined') {
        window.inventarioEquips.forEach((equip, index) => {
            if (equip.tipo === 'weapon' && equip.base) {
                temArma = true;
                let labelPlus = (equip.enchant > 0) ? `<div class="inv-qtd">+${equip.enchant}</div>` : '';
                let blockAugment = criarBadgeAugment(equip.augmented, equip.base);

                gridEquip.innerHTML += `
                    <div class="store-item-slot" onclick="${equip.augmented ? '' : `abrirAugmentAcao(${index})`}">
                        <img src="${equip.base.img}" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                        ${labelPlus} ${blockAugment}
                    </div>`;
            }
        });
    }

    if (!temArma) gridEquip.innerHTML = `<span style="font-size:10px; color:#555; grid-column:span 3; text-align:center;">${(typeof window.t === 'function') ? window.t('game.enchantUi.noWeaponsAugment') : 'No weapons.'}</span>`;

    let qtdStones = (window.inventario && window.inventario["Life Stone"]) ? window.inventario["Life Stone"] : 0;
    if (qtdStones > 0) {
         gridStone.innerHTML += `
            <div class="store-item-slot" onclick="selecionarAugmentStone()">
                <img src="assets/itens/life_stone.png" class="inv-img" onerror="this.src='assets/armas/espada_inicial.png'">
                <div class="inv-qtd">${qtdStones}</div>
            </div>`;
    } else {
         gridStone.innerHTML = '<span style="font-size:10px; color:#555; grid-column:span 3; text-align:center;">' + ((typeof window.t === 'function') ? window.t('game.enchantUi.noStones') : 'No stones.') + '</span>';
    }
}

// ==========================================
// JANELA DE CONFIRMAÇÃO DO AUGMENT (INTELIGENTE)
// ==========================================
function fecharAugmentAcao(): void {
    window.fecharModal('janela-augment-acao');
}

function abrirAugmentAcao(indexInventario: number | 'equipped'): void {
    let equip: AugmentArmaSelection;
    let isEquipped = false;

    if (indexInventario === 'equipped') {
        equip = { base: window.armaEquipadaBase as EquipInstance, enchant: window.enchant, augmented: !!window.isAugmented };
        isEquipped = true;
    } else {
        const bagEquip = window.inventarioEquips[indexInventario];
        if (!bagEquip) return;
        equip = bagEquip;
        const cat = _resolveAugmentCatalog(equip);
        if (window.armaEquipadaBase && window.armaEquipadaBase.base?.nome === cat.nome && (equip.enchant || 0) === window.enchant && (equip.augmented || false) === !!window.isAugmented) {
            isEquipped = true;
        }
    }

    const catalog = _resolveAugmentCatalog(equip);
    window.abrirModal('janela-augment-acao', 1700);
    const imgEl = document.getElementById('augment-acao-img') as HTMLImageElement | null;
    const descEl = document.getElementById('augment-acao-desc');
    const btnConfirmar = document.getElementById('btn-augment-confirmar-selecao') as HTMLButtonElement | null;
    if (!imgEl || !descEl || !btnConfirmar) return;

    imgEl.src = catalog.img || '';

    const getGradeColor = (g: string | undefined): string => ({ D: '#60a5fa', C: '#93c5fd', B: '#fca5a5', A: '#fde047', S: '#c084fc' }[g || ''] || '#fff');

    const corGrade = getGradeColor(catalog.grade);
    const encLevel = equip.enchant || 0;
    const nomeItem = catalog.nome || '';
    const nomeDisplay = encLevel > 0 ? `+${encLevel} ${nomeItem}` : nomeItem;

    const pAtkBase = _invNum(catalog.atk);
    const pAtkEnchant = Math.floor(pAtkBase * 0.10 * encLevel);
    const pAtkTotal = pAtkBase + pAtkEnchant + (equip.augmented ? 15 : 0);

    const mAtkBase = _invNum(catalog['matk']);
    const mAtkEnchant = Math.floor(mAtkBase * 0.10 * encLevel);
    const mAtkTotal = mAtkBase + mAtkEnchant + (equip.augmented ? 15 : 0);
    const gradeLabel = catalog.grade || '';

    let infoHtml = `
        <div style="font-size: 1.1em; font-weight: bold; color: white; margin-bottom: 5px;">
            ${nomeDisplay} <span style="color:${corGrade}; font-size:0.8em;">[${gradeLabel}]</span>
        </div>
        <hr style="border: 0.5px solid #444; margin: 8px 10%; width: 80%;">
        
        <div style="text-align: left; padding: 0 15%; width: 100%; box-sizing: border-box;">
            
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                <span style="color:#ccc;">P. Atk (Total):</span> <b style="color:#ffcc00; font-size:1.1em;">${pAtkTotal}</b>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Base:</span> <span style="color: #aaa;">${pAtkBase}</span>
            </div>
            ${encLevel > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Encante (+${encLevel}):</span> <span style="color: #3b82f6;">+${pAtkEnchant}</span>
            </div>` : ''}

            ${mAtkBase > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; margin-top: 10px;">
                <span style="color:#ccc;">M. Atk (Total):</span> <b style="color:#3b82f6; font-size:1.1em;">${mAtkTotal}</b>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Base:</span> <span style="color: #aaa;">${mAtkBase}</span>
            </div>
            ${encLevel > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
                <span style="color: #888;">➥ Encante (+${encLevel}):</span> <span style="color: #3b82f6;">+${mAtkEnchant}</span>
            </div>` : ''}
            ` : ''}

        </div>
    `;

    if (isEquipped) {
        infoHtml += `<div style="color: #10b981; font-weight: bold; margin-top: 15px; font-size: 0.9em;">[EQUIPADO ATUALMENTE]</div>`;
    }

    descEl.innerHTML = infoHtml;

    btnConfirmar.onclick = function () {
        selecionarAugmentArma(indexInventario);
        fecharAugmentAcao();
    };
}

// ==========================================
// LÓGICA DE SELEÇÃO E MOTOR
// ==========================================
function selecionarAugmentArma(indexInventario: number | 'equipped'): void {
    if (indexInventario === 'equipped') {
        augmentIndexArma = 'equipped';
        augmentArmaSelecionada = { base: window.armaEquipadaBase as EquipInstance, enchant: window.enchant, augmented: !!window.isAugmented, uid: window.armaEquipadaBase?.uid };
    } else {
        augmentIndexArma = indexInventario;
        augmentArmaSelecionada = window.inventarioEquips[indexInventario] || null;
    }
    if (!augmentArmaSelecionada) return;

    const catalog = _resolveAugmentCatalog(augmentArmaSelecionada);
    const enc = augmentArmaSelecionada.enchant || 0;
    const labelPlus = enc > 0 ? `<div style="color:#fff; font-weight:bold; position:absolute; bottom:2px; left:2px; text-shadow:1px 1px 0 #000;">+${enc}</div>` : '';
    const slotEquip = document.getElementById('slot-target-augment-equip');
    if (!slotEquip) return;
    slotEquip.innerHTML = `
        <div style="position:relative; width:100%; height:100%; border: 1px solid #444;">
            <img src="${catalog.img || ''}" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='assets/armas/espada_inicial.png'">
            ${labelPlus}
        </div>`;
    checarProntidaoAugment();
}

function selecionarAugmentStone(): void {
    augmentStoneSelecionada = "Life Stone";
    const slotStone = document.getElementById('slot-target-augment-stone');
    if (slotStone) {
        slotStone.innerHTML = `<img src="assets/itens/life_stone.png" style="width:100%; height:100%; object-fit:contain; border: 1px solid #444;" onerror="this.src='assets/armas/espada_inicial.png'">`;
    }
    checarProntidaoAugment();
}

function checarProntidaoAugment(): void {
    const btn = document.getElementById('btn-executar-augment') as HTMLButtonElement | null;
    const aviso = document.getElementById('augment-warning') as HTMLElement | null;
    if (!btn || !aviso) return;

    if (augmentArmaSelecionada && augmentStoneSelecionada) {
        btn.disabled = false;
        btn.style.background = '#a855f7'; 
        aviso.style.display = 'block';
        aviso.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentFeeLine') : 'Fee: 5,000 Adena';
    }
}

// ==========================================
// MOTOR RNG DO AUGMENT
// ==========================================
async function executarAugment(): Promise<void> {
    if (!augmentArmaSelecionada || !augmentStoneSelecionada) return;

    let custoAdena = 5000; let custoLifeStone = 1; let custoAncientCoin = 5;
    let qtdStone = window.inventario['Life Stone'] || 0;
    let qtdCoin = window.ancientCoins || 0;

    if (window.adenas < custoAdena || qtdStone < custoLifeStone || qtdCoin < custoAncientCoin) {
        if (typeof window.mostrarAviso === 'function') window.mostrarAviso(typeof window.t === 'function' ? window.t('game.enchant.augmentRequirement', { adena: custoAdena, lifeStone: custoLifeStone, ancientCoin: custoAncientCoin }) : `Requisito: ${custoAdena}a, ${custoLifeStone}x Life Stone e ${custoAncientCoin}x Ancient Coin.`);
        return;
    }

    const btn = document.getElementById('btn-executar-augment') as HTMLButtonElement | null;
    if (!btn) return;
    btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.forging') : 'FORGING...';
    btn.disabled = true;
    if (typeof window.tocarSom === 'function') window.tocarSom('enchant');

    let augmentUid = augmentArmaSelecionada.uid;
    if (!augmentUid && augmentIndexArma === 'equipped' && window.armaEquipadaBase && window.armaEquipadaBase.uid) {
        augmentUid = window.armaEquipadaBase.uid;
    }

    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
        if (!augmentUid) {
            if (typeof window.l2Alert === 'function') {
                window.l2Alert(typeof window.t === 'function' ? window.t('game.enchant.augmentNeedUid') : 'Weapon needs a cloud id. Re-equip or use a bag weapon.');
            }
            btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
            btn.disabled = false;
            return;
        }
        try {
            const { data, error } = await window.SupabaseAPI.augmentItem(window.charName, augmentUid, augmentStoneSelecionada);
            const rpcData = data as AugmentItemRpcResult | null;

            if (error) {
                console.error('[Augment RPC Error]', error);
                if (typeof window.l2Alert === 'function') {
                    const msg = typeof window.cloudRpcMessage === 'function'
                        ? window.cloudRpcMessage(error)
                        : _rpcErrorMessage(error);
                    window.l2Alert(msg);
                }
                btn.disabled = false;
                btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
                return;
            }

            if (rpcData && rpcData.success) {
                window.adenas = Math.max(0, Math.floor(Number(rpcData.adenas)));
                window.ancientCoins = Math.max(0, Math.floor(Number(rpcData.ancientCoins)));
                if (rpcData.inventario && typeof rpcData.inventario === 'object' && !Array.isArray(rpcData.inventario)) {
                    window.inventario = Object.assign({}, rpcData.inventario);
                }
                let rawEq = rpcData.inventarioEquips;
                if (typeof rawEq === 'string') {
                    try {
                        rawEq = JSON.parse(rawEq);
                    } catch (_) {
                        rawEq = [];
                    }
                }
                window.inventarioEquips =
                    typeof window.normalizarInventarioEquipsParaInstancias === 'function'
                        ? window.normalizarInventarioEquipsParaInstancias(Array.isArray(rawEq) ? rawEq : [])
                        : Array.isArray(rawEq)
                          ? rawEq
                          : [];

                let armas = rpcData.armaEquipadaBase;
                if (armas != null && typeof armas === 'object' && !Array.isArray(armas) && Object.keys(armas).length > 0) {
                    const norm = typeof window.normalizarInventarioEquipsParaInstancias === 'function'
                        ? window.normalizarInventarioEquipsParaInstancias([armas as EquipInstance])
                        : [armas as EquipInstance];
                    if (norm && norm[0]) {
                        window.armaEquipadaBase = norm[0] as EquipInstance;
                        window.isAugmented = !!(window.armaEquipadaBase && window.armaEquipadaBase.augmented);
                        window.enchant =
                            window.armaEquipadaBase && window.armaEquipadaBase.enchant != null
                                ? window.armaEquipadaBase.enchant
                                : window.enchant;
                    }
                }

                if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();

                let stat1Raw: AugmentStatPayload | string | null | undefined = rpcData.stat1;
                let stat2Raw: AugmentStatPayload | string | null | undefined = rpcData.stat2;
                let stat1: AugmentStatPayload | null = null;
                let stat2: AugmentStatPayload | null = null;
                if (stat1Raw && typeof stat1Raw === 'string') {
                    try {
                        stat1 = JSON.parse(stat1Raw) as AugmentStatPayload;
                    } catch (_) {
                        stat1 = null;
                    }
                } else if (stat1Raw && typeof stat1Raw === 'object') {
                    stat1 = stat1Raw;
                }
                if (stat2Raw && typeof stat2Raw === 'string') {
                    try {
                        stat2 = JSON.parse(stat2Raw) as AugmentStatPayload;
                    } catch (_) {
                        stat2 = null;
                    }
                } else if (stat2Raw && typeof stat2Raw === 'object') {
                    stat2 = stat2Raw;
                }

                let rawItem = rpcData.item_updated;
                if (typeof rawItem === 'string') {
                    try {
                        rawItem = JSON.parse(rawItem);
                    } catch (_) {
                        rawItem = null;
                    }
                }
                let itemUpdated: EquipInstance | null =
                    rawItem && typeof rawItem === 'object'
                        ? (typeof window.normalizarInventarioEquipsParaInstancias === 'function'
                            ? window.normalizarInventarioEquipsParaInstancias([rawItem as EquipInstance])[0]
                            : (rawItem as EquipInstance))
                        : null;

                if (augmentIndexArma === 'equipped' && itemUpdated) {
                    window.armaEquipadaBase = itemUpdated;
                    window.isAugmented = !!itemUpdated.augmented;
                    if (itemUpdated.enchant != null) window.enchant = itemUpdated.enchant;
                }

                if (typeof window.tocarSom === 'function') window.tocarSom('enchant_success');
                let augLevel = _invNum(rpcData.aug_level) || 1;
                let cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
                let corMsg = cores[augLevel - 1] || '#a855f7';

                let t1 = stat1 && stat1.txt != null ? String(stat1.txt) : '';
                let v1 = stat1 && stat1.val != null ? Number(stat1.val) : 0;
                let t2 = stat2 && stat2.txt != null ? String(stat2.txt) : '';
                let v2 = stat2 && stat2.val != null ? Number(stat2.val) : 0;

                let augIntroRaw =
                    (typeof window.t === 'function') ? window.t('game.enchantUi.logAugmentIntro', { level: augLevel }) : (`✨ AUGMENT LVL ${augLevel}! Hidden powers awakened:`);
                if (typeof window.escreverLog === 'function') {
                    window.escreverLog(
                        `<span style="color:${corMsg}; font-weight:bold; text-shadow:1px 1px 0 #000;">${augIntroRaw}</span><br><span style="color:#fff;">↳ ${t1} +${v1}</span><br><span style="color:#fff;">↳ ${t2} +${v2}</span>`
                    );
                }

                btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
                if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
                if (typeof window.atualizar === 'function') window.atualizar();
                if (typeof window.salvarJogo === 'function') window.salvarJogo();

                if (typeof fecharAugment === 'function') fecharAugment();
                if (itemUpdated) {
                    const baseShow: AugmentArmaSelection = Object.assign(
                        {},
                        itemUpdated.base || {},
                        {
                            base: itemUpdated.base,
                            uid: itemUpdated.uid,
                            augmented: itemUpdated.augmented,
                            enchant: itemUpdated.enchant,
                        }
                    );
                    (['augLevel', 'augPAtk', 'augMAtk', 'augPDef', 'augMDef', 'augSpd', 'augCrit'] as const).forEach(function (k) {
                        const v = (itemUpdated as unknown as Record<string, unknown>)[k];
                        if (v != null && (baseShow[k] == null || baseShow[k] === 0)) baseShow[k] = v as number;
                    });
                    mostrarResultadoAugment(baseShow);
                }
            } else {
                const code = rpcData && rpcData.error ? String(rpcData.error) : 'unknown';
                const errKey = 'game.enchant.augmentError.' + code;
                let msg = typeof window.t === 'function' ? window.t(errKey) : code;
                if (msg === errKey && typeof window.t === 'function') msg = window.t('game.enchant.augmentErrorGeneric', { code });
                if (typeof window.l2Alert === 'function') window.l2Alert(msg);
                btn.disabled = false;
                btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
            }
        } catch (err) {
            console.error('[Augment RPC Exception]', err);
            btn.disabled = false;
            btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    window.adenas -= custoAdena; window.inventario['Life Stone'] -= custoLifeStone;
    window.ancientCoins = (Number(window.ancientCoins) || 0) - custoAncientCoin;
    if (window.inventario['Life Stone'] <= 0) delete window.inventario['Life Stone'];

    setTimeout(() => {
        // ... (resto da lógica offline mantida)
        // --- A ROLETA DE NÍVEL (RNG) ---
        let chanceNivel = Math.random() * 100;
        let augLevel = 1;
        if (chanceNivel <= 50) augLevel = 1;      // 50% chance Lvl 1 (Cinza)
        else if (chanceNivel <= 80) augLevel = 2; // 30% chance Lvl 2 (Verde)
        else if (chanceNivel <= 93) augLevel = 3; // 13% chance Lvl 3 (Azul)
        else if (chanceNivel <= 98) augLevel = 4; // 5% chance Lvl 4 (Vermelho)
        else augLevel = 5;                        // 2% chance Lvl 5 (Dourado/Max)

        // --- A ROLETA DE STATUS ---
        let mult = augLevel; // Níveis altos dão multiplicadores gigantes
        let pool: AugmentRollStat[] = [
            { prop: 'augPAtk', txt: 'P. Atk',   val: Math.floor(Math.random() * (15 * mult)) + (5 * mult) },
            { prop: 'augMAtk', txt: 'M. Atk',   val: Math.floor(Math.random() * (15 * mult)) + (5 * mult) },
            { prop: 'augPDef', txt: 'P. Def',   val: Math.floor(Math.random() * (10 * mult)) + (5 * mult) },
            { prop: 'augMDef', txt: 'M. Def',   val: Math.floor(Math.random() * (10 * mult)) + (5 * mult) },
            { prop: 'augSpd',  txt: 'Speed',    val: Math.floor(Math.random() * (20 * mult)) + (10 * mult) },
            { prop: 'augCrit', txt: 'Crit Rate',val: Math.floor(Math.random() * (2 * mult)) + (1 * mult) }
        ];
        pool.sort(() => Math.random() - 0.5);
        const stat1 = pool[0];
        const stat2 = pool[1];

        let equipAlvo: AugmentArmaSelection;
        if (augmentIndexArma === 'equipped') {
            window.armaEquipadaBase = JSON.parse(JSON.stringify(window.armaEquipadaBase)) as EquipInstance;
            equipAlvo = window.armaEquipadaBase as unknown as AugmentArmaSelection;
            window.isAugmented = true;
        } else if (typeof augmentIndexArma === 'number') {
            window.inventarioEquips[augmentIndexArma].base = JSON.parse(JSON.stringify(window.inventarioEquips[augmentIndexArma].base)) as ItemCatalogBase;
            equipAlvo = window.inventarioEquips[augmentIndexArma].base as unknown as AugmentArmaSelection;
            window.inventarioEquips[augmentIndexArma].augmented = true;
        } else {
            return;
        }

        // Zera tudo antes para garantir que não fique lixo de outro nível
        equipAlvo.augLevel = augLevel;
        equipAlvo.augPAtk = 0; equipAlvo.augMAtk = 0; equipAlvo.augPDef = 0; equipAlvo.augMDef = 0; equipAlvo.augSpd = 0; equipAlvo.augCrit = 0;
        
        // Aplica os dois poderes sorteados
        equipAlvo[stat1.prop] = stat1.val;
        equipAlvo[stat2.prop] = stat2.val;

        if (typeof window.tocarSom === 'function') window.tocarSom('enchant_success');
        const cores = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15'];
        const corMsg = cores[augLevel - 1];

        const augIntroRaw = (typeof window.t === 'function') ? window.t('game.enchantUi.logAugmentIntro', { level: augLevel }) : (`✨ AUGMENT LVL ${augLevel}! Hidden powers awakened:`);
        if (typeof window.escreverLog === 'function') window.escreverLog(`<span style="color:${corMsg}; font-weight:bold; text-shadow:1px 1px 0 #000;">${augIntroRaw}</span><br><span style="color:#fff;">↳ ${stat1.txt} +${stat1.val}</span><br><span style="color:#fff;">↳ ${stat2.txt} +${stat2.val}</span>`);

        btn.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentBtn') : 'AUGMENT';
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        if (typeof window.atualizar === 'function') window.atualizar();
        if (typeof window.salvarJogo === 'function') window.salvarJogo();
        
        // ==========================================
        // MÁGICA VISUAL: FECHA A FORJA E MOSTRA O RESULTADO!
        // ==========================================
        if(typeof fecharAugment === 'function') fecharAugment(); 
        mostrarResultadoAugment(equipAlvo); 

    }, 1500); 
}

// Função para fechar a tela de resultado
function fecharAugmentResultado(): void {
    window.fecharModal('janela-augment-resultado');
    if (typeof window.atualizar === 'function') window.atualizar();
}

function mostrarResultadoAugment(armaNova: AugmentArmaSelection): void {
    const nivel = armaNova.augLevel || 1;

    const cores: Record<number, string> = {
        1: '#9ca3af', // Cinza     (Comum)
        2: '#10b981', // Verde     (Incomum)
        3: '#3b82f6', // Azul      (Raro)
        4: '#ef4444', // Vermelho  (Épico)
        5: '#facc15'  // Dourado   (Lendário)
    };
    const corTema = cores[nivel] || '#a855f7';

    const janela = document.getElementById('janela-augment-resultado') as HTMLElement | null;
    const header = document.getElementById('aug-res-header');
    const titleText = document.getElementById('aug-res-title-text');
    const imgSlot = document.getElementById('aug-res-img-slot') as HTMLElement | null;
    const subtitle = document.getElementById('aug-res-subtitle');
    const box = document.getElementById('aug-res-box');
    const btnRes = document.getElementById('aug-res-btn') as HTMLButtonElement | null;
    const img = document.getElementById('aug-res-img') as HTMLImageElement | null;
    const nomeEl = document.getElementById('aug-res-nome');
    const statusEl = document.getElementById('aug-res-status');
    if (!janela || !header || !titleText || !imgSlot || !subtitle || !box || !btnRes || !img || !nomeEl || !statusEl) return;

    janela.style.boxShadow = `0 0 30px ${corTema}80`;
    janela.style.border = `2px solid ${corTema}`;

    header.style.background = `linear-gradient(90deg, transparent, ${corTema}, transparent)`;
    titleText.innerText = (typeof window.t === 'function') ? window.t('game.enchantUi.augmentResultTitle', { level: nivel }) : (`✦ AUGMENT LVL ${nivel} ✦`);

    imgSlot.style.border = `2px solid ${corTema}`;
    imgSlot.style.boxShadow = `inset 0 0 20px ${corTema}60`;

    subtitle.style.color = corTema;
    box.style.border = `1px dashed ${corTema}`;

    btnRes.style.background = corTema;
    btnRes.style.border = `1px solid ${corTema}`;
    btnRes.style.color = (nivel === 5) ? '#000' : '#fff';

    img.src = armaNova.img || (typeof armaNova.base === 'object' && armaNova.base && 'img' in armaNova.base ? String(armaNova.base.img || '') : '') || 'assets/itens/item_generic.png';
    nomeEl.innerText = armaNova.nome || (typeof armaNova.base === 'object' && armaNova.base && 'nome' in armaNova.base ? String(armaNova.base.nome || '') : '');
    
    let statsHtml = '';
    
    if (armaNova.augPAtk) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">P. Atk:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augPAtk}</span></div>`;
    if (armaNova.augMAtk) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">M. Atk:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augMAtk}</span></div>`;
    if (armaNova.augPDef) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">P. Def:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augPDef}</span></div>`;
    if (armaNova.augMDef) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">M. Def:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augMDef}</span></div>`;
    if (armaNova.augSpd)  statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">Atk. Speed:</span> <span style="color:${corTema}; font-weight:bold;">Fast +${armaNova.augSpd}</span></div>`;
    if (armaNova.augCrit) statsHtml += `<div style="display:flex; justify-content:space-between;"><span style="color:#ccc;">Crit Rate:</span> <span style="color:${corTema}; font-weight:bold;">+${armaNova.augCrit}%</span></div>`;

    statusEl.innerHTML = statsHtml;

    if (typeof window.tocarSom === 'function') window.tocarSom('lvlup');
    
    window.abrirModal('janela-augment-resultado', 1800);
}

window.abrirJanelaEnchant = abrirJanelaEnchant;
window.fecharEnchant = fecharEnchant;
window.executarEnchant = executarEnchant;
window.abrirJanelaAugment = abrirJanelaAugment;
window.fecharAugment = fecharAugment;
window.executarAugment = executarAugment;
window.abrirAugmentAcao = abrirAugmentAcao;
window.selecionarAugmentStone = selecionarAugmentStone;
window.fecharAugmentAcao = fecharAugmentAcao;
window.fecharAugmentResultado = fecharAugmentResultado;

export {};
