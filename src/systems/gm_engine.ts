/**
 * GM Engine — Game Master administration system.
 * Migrado: js/systems/gm_engine.js — Fase 4: tipos explícitos.
 */

import type {
  CloudCharacterAdminRow,
  GmEngineApi,
  GmPanelTab,
  GmSetLevelRpcResult,
  SupabaseClientLite,
} from '../types/game';
import { registerGlobal } from '../runtime/register-global';

function gmInput(id: string): HTMLInputElement | null {
    const el = document.getElementById(id);
    return el instanceof HTMLInputElement ? el : null;
}

function gmSelect(id: string): HTMLSelectElement | null {
    const el = document.getElementById(id);
    return el instanceof HTMLSelectElement ? el : null;
}

function gmTextArea(id: string): HTMLTextAreaElement | null {
    const el = document.getElementById(id);
    return el instanceof HTMLTextAreaElement ? el : null;
}

function gmErrMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return String(err);
}

function gmRewardsInsert(client: SupabaseClientLite) {
    return client.from('rewards') as unknown as {
        insert: (rows: Array<Record<string, unknown>>) => Promise<{ error: { message?: string } | null }>;
    };
}

function gmCharactersList(client: SupabaseClientLite) {
    return client.from('characters') as unknown as {
        select: (cols: string) => {
            order: (
                col: string,
                opts: { ascending: boolean },
            ) => Promise<{ data: CloudCharacterAdminRow[] | null; error: { message?: string } | null }>;
        };
    };
}

function gmCharactersPatch(client: SupabaseClientLite) {
    return client.from('characters') as unknown as {
        update: (patch: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: { message?: string } | null }>;
        };
    };
}

const GMEngine: GmEngineApi = {
    accessLevel: 0,
    activeTab: 'players' as GmPanelTab,

    /**
     * Initialize GM engine and verify permissions (non-blocking retries via openPanel).
     */
    async init() {
        console.log('🛡️ GM Engine: Checking access...');
        if (typeof window.SupabaseAPI === 'undefined' || !window.SupabaseAPI.client) {
            console.warn('GM Engine: Supabase not initialized.');
            return;
        }
        await this.refreshGmAccessFromProfile();
    },

    gmT(key, params) {
        if (typeof window.t !== 'function') return '';
        try {
            return window.t('game.gmPanel.' + key, params || {});
        } catch (e) {
            return '';
        }
    },

    escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    encodeGmAttr(s) {
        return encodeURIComponent(String(s || ''));
    },

    decodeGmAttr(s) {
        try {
            return decodeURIComponent(String(s || ''));
        } catch (e) {
            return String(s || '');
        }
    },

    /** Re-read GM flag from profiles (handles late auth / refreshed session). */
    async refreshGmAccessFromProfile() {
        this.accessLevel = 0;
        if (typeof window.SupabaseAPI === 'undefined' || !window.SupabaseAPI.client) return 0;

        try {
            const { data: sessionData } = await window.SupabaseAPI.client.auth.getUser();
            const user = sessionData && sessionData.user;
            if (!user) {
                console.warn('GM Engine: No user logged in to Supabase.');
                return 0;
            }

            const { data: profile, error } = await window.SupabaseAPI.client
                .from('profiles')
                .select('access_level')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('❌ GM Engine: Error fetching profile:', error.message || error);
                return 0;
            }

            const accessLevel = (profile as { access_level?: number }).access_level ?? 0;
            if (accessLevel > 0) {
                this.accessLevel = accessLevel;
                console.log(`✅ GM access level ${this.accessLevel} granted to:`, user.email);
                this.renderGMButton();
                const badge = document.getElementById('gm-level-badge');
                if (badge) badge.innerText = String(this.accessLevel);
                return this.accessLevel;
            }
            console.warn('🚫 GM Engine: User has no GM access (access_level = 0).');
        } catch (e) {
            console.error('❌ GM Engine: Critical init error:', e);
        }
        return 0;
    },

    renderGMButton() {
        let container = document.getElementById('hud-top-bar');
        
        if (!container) {
            console.log("⚠️ HUD not found; attaching GM button to document body.");
            container = document.body;
        }

        if (!document.getElementById('btn-open-gm')) {
            const btn = document.createElement('button');
            btn.id = 'btn-open-gm';
            btn.innerHTML = 'GM';
            
            // Fixed style so the button stays visible on any layout
            btn.style.cssText = `
                position: fixed;
                top: 45px;
                right: 15px;
                background: #991b1b;
                color: #fff;
                border: 1px solid #ef4444;
                border-radius: 4px;
                font-size: 10px;
                padding: 4px 10px;
                cursor: pointer;
                font-weight: bold;
                z-index: 2000;
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
                text-shadow: 1px 1px 1px #000;
            `;
            btn.onclick = () => void this.openPanel();
            container.appendChild(btn);
            console.log("💎 GM button injected successfully.");
        }
    },

    async openPanel() {
        await this.refreshGmAccessFromProfile();
        if (this.accessLevel < 1) {
            const msg =
                this.gmT('openDenied') ||
                'GM panel is unavailable: not authenticated, no GM access on your profile, or Supabase offline.';
            if (typeof window.l2Alert === 'function') window.l2Alert(msg);
            else alert(msg);
            return;
        }
        if (typeof window.abrirModal === 'function') {
            window.abrirModal('janela-gm-panel', 2000);
            this.loadTabContent();
        }
    },

    switchTab(tab: GmPanelTab, btn: HTMLElement) {
        this.activeTab = tab;
        document.querySelectorAll('.gm-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadTabContent();
    },

    async loadTabContent() {
        const content = document.getElementById('gm-content');
        if (!content) return;

        content.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${(typeof window.t === 'function') ? window.t('game.gmPanel.loadingData') : 'Loading data...'}</div>`;

        if (this.activeTab === 'players') {
            await this.renderPlayersTab(content);
        } else if (this.activeTab === 'resources') {
            this.renderResourcesTab(content);
        } else if (this.activeTab === 'broadcast') {
            this.renderBroadcastTab(content);
        } else if (this.activeTab === 'server') {
            this.renderServerTab(content);
        }
    },

    renderResourcesTab(container) {
        const esc = (s: string) => this.escapeHtml(s);
        const lbl = (k: string) => esc(this.gmT(k));
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">${lbl('giveResourcesTitle')}</h4>
                
                <div class="gm-input-group">
                    <label style="color:#888; font-size:0.7em;">${lbl('targetPlayerLabel')}</label>
                    <input id="gm-give-target" class="gm-input" type="text" placeholder="${lbl('targetPlayerPlaceholder')}">
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div class="gm-input-group">
                        <label style="color:#888; font-size:0.7em;">${lbl('adenaAmountLabel')}</label>
                        <input id="gm-give-adena" class="gm-input" type="number" placeholder="0">
                        <button class="gm-btn-action gm-btn-edit" style="margin-top:5px; background:#ca8a04;" onclick="GMEngine.giveCurrency('adena')">${lbl('giveAdenaBtn')}</button>
                    </div>
                    <div class="gm-input-group">
                        <label style="color:#888; font-size:0.7em;">${lbl('ancientCoinsLabel')}</label>
                        <input id="gm-give-coins" class="gm-input" type="number" placeholder="0">
                        <button class="gm-btn-action gm-btn-edit" style="margin-top:5px; background:#1e40af;" onclick="GMEngine.giveCurrency('ancient')">${lbl('giveCoinsBtn')}</button>
                    </div>
                </div>

                <div class="divider"></div>

                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">${lbl('giveSpecialItemsTitle')}</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <select id="gm-give-item-select" class="gm-input">
                        <option value="">${lbl('selectItemOptionDefault')}</option>
                        <optgroup label="${lbl('optgroupMaterials')}">
                            <option value="Animal Skin">Animal Skin</option>
                            <option value="Steel">Steel</option>
                            <option value="Ancient Coin">Ancient Coin (Item)</option>
                        </optgroup>
                        <optgroup label="${lbl('optgroupSWeapons')}">
                            <option value="wpn_s_vesper_cutter">Vesper Cutter</option>
                            <option value="wpn_s_vesper_shaper">Vesper Shaper</option>
                            <option value="wpn_s_vesper_thrower">Vesper Thrower</option>
                        </optgroup>
                        <optgroup label="${lbl('optgroupSArmor')}">
                            <option value="arm_s_vesper_heavy">Vesper Noble Heavy</option>
                            <option value="arm_s_vesper_light">Vesper Noble Light</option>
                            <option value="arm_s_vesper_robe">Vesper Noble Robe</option>
                        </optgroup>
                    </select>
                    <input id="gm-give-item-qty" class="gm-input" type="number" value="1" placeholder="${lbl('quantityPlaceholder')}">
                    <button class="btn-l2" style="background:linear-gradient(180deg, #15803d, #14532d); height:40px;" onclick="GMEngine.giveItem()">${lbl('giveItemBtn')}</button>
                </div>
            </div>
        `;
    },

    async _gmConfirm(message: string, title: string): Promise<boolean> {
        if (typeof window.l2Confirm === 'function') {
            return !!(await window.l2Confirm(message, title));
        }
        return window.confirm(message);
    },

    _gmNotify(message: string) {
        if (typeof window.l2Alert === 'function') {
            void window.l2Alert(message);
        } else if (typeof window.mostrarAviso === 'function') {
            window.mostrarAviso(message);
        } else {
            alert(message);
        }
    },

    async giveCurrency(type: 'adena' | 'ancient') {
        const targetEl = gmInput('gm-give-target');
        const amountInput = gmInput(type === 'adena' ? 'gm-give-adena' : 'gm-give-coins');
        const targetInput = targetEl?.value.trim() ?? '';
        const amount = parseInt(amountInput?.value ?? '', 10);

        if (!targetInput || isNaN(amount) || amount <= 0) {
            this._gmNotify(this.gmT('invalidTargetAmount') || 'Enter a valid target and amount.');
            return;
        }
        if (!window.SupabaseAPI?.client) {
            this._gmNotify(this.gmT('supabaseOffline') || 'Supabase offline.');
            return;
        }

        const coinName = type === 'adena' ? 'Adena' : 'Ancient Coin';
        const prettyAmount = amount.toLocaleString();
        const ok = await this._gmConfirm(
            this.gmT('confirmGiveCurrency', { amount: prettyAmount, currency: coinName, name: targetInput }) ||
                `Send ${prettyAmount} ${coinName} to ${targetInput}?`,
            this.gmT('giveResourcesTitle') || 'Give resources',
        );
        if (!ok) return;

        try {
                const { data: char } = await window.SupabaseAPI.client
                    .from('characters')
                    .select('char_name')
                    .ilike('char_name', targetInput)
                    .maybeSingle();

                const targetName = (char as { char_name?: string } | null)?.char_name ?? targetInput;

                const { error } = await gmRewardsInsert(window.SupabaseAPI.client!).insert([{
                    char_name: targetName,
                    sender: 'Game Master',
                    message: this.gmT('giftMailCurrency', { prettyAmount, coinName }) ||
                        `Hello, champion of Aden.\n\nThe GM team prepared ${prettyAmount} ${coinName} for you.\n\nGM Team`,
                    items: [{ id: coinName, qtd: amount, tipo: 'currency' }]
                }]);

                if (error) throw error;
                
                this._gmNotify(
                    this.gmT('giveSuccessCurrency', { amount: prettyAmount, currency: coinName, name: targetName }) ||
                        `${prettyAmount} ${coinName} sent to ${targetName}!`,
                );
                if (amountInput) amountInput.value = '';

                await window.SupabaseAPI.broadcastChat?.(
                    'SYSTEM',
                    '',
                    'GM_ANNOUNCEMENT',
                    'global',
                    '',
                    {
                        i18nKey: 'game.gm.chatGiftCurrency',
                        i18nParams: { name: targetName, amount: prettyAmount, currency: coinName },
                    },
                );

                await window.SupabaseAPI.broadcastGM?.('force_update', targetName, {
                    i18nKey: 'game.gm.forceUpdateGiftCurrency',
                    i18nParams: { amount: prettyAmount, currency: coinName },
                });
            } catch (err) {
                this._gmNotify(
                    this.gmT('giveFailed', { detail: gmErrMessage(err) }) || 'Send failed: ' + gmErrMessage(err),
                );
            }
    },

    async giveItem() {
        const targetEl = gmInput('gm-give-target');
        const itemSelect = gmSelect('gm-give-item-select');
        const qtyInput = gmInput('gm-give-item-qty');
        const targetInput = targetEl?.value.trim() ?? '';
        const itemKey = itemSelect?.value ?? '';
        const qty = parseInt(qtyInput?.value ?? '', 10);

        if (!targetInput || !itemKey || isNaN(qty) || qty <= 0) {
            this._gmNotify(this.gmT('invalidTargetAmount') || 'Select player, item, and quantity.');
            return;
        }
        if (!window.SupabaseAPI?.client) {
            this._gmNotify(this.gmT('supabaseOffline') || 'Supabase offline.');
            return;
        }

        const ok = await this._gmConfirm(
            this.gmT('confirmGiveItem', { qty, item: itemKey, name: targetInput }) ||
                `Send ${qty}x ${itemKey} to ${targetInput}?`,
            this.gmT('giveSpecialItemsTitle') || 'Give special items',
        );
        if (!ok) return;

        try {
                const { data: char } = await window.SupabaseAPI.client
                    .from('characters')
                    .select('char_name')
                    .ilike('char_name', targetInput)
                    .maybeSingle();

                const targetName = (char as { char_name?: string } | null)?.char_name ?? targetInput;

                let itemNomeBonito: string | null = null;
                if (typeof window.RewardEngine !== 'undefined' && typeof window.RewardEngine.resolveCatalogEntry === 'function') {
                    const c = window.RewardEngine.resolveCatalogEntry(itemKey);
                    if (c && c.nome) itemNomeBonito = c.nome;
                }

                const { error } = await gmRewardsInsert(window.SupabaseAPI.client!).insert([{
                    char_name: targetName,
                    sender: 'Game Master',
                    message: this.gmT('giftMailItem', { qty, item: itemNomeBonito || itemKey }) ||
                        `Adventurer,\n\nThe team prepared ${qty}x ${itemNomeBonito || itemKey} for you.\n\nGM Team`,
                    items: [{ id: itemKey, qtd: qty, tipo: 'item', nome: itemNomeBonito || undefined }]
                }]);

                if (error) throw error;
                
                this._gmNotify(
                    this.gmT('giveSuccessItem', { qty, item: itemKey, name: targetName }) ||
                        `${qty}x ${itemKey} sent to ${targetName}!`,
                );
                if (qtyInput) qtyInput.value = '1';

                await window.SupabaseAPI.broadcastChat?.(
                    'SYSTEM',
                    '',
                    'GM_ANNOUNCEMENT',
                    'global',
                    '',
                    {
                        i18nKey: 'game.gm.chatGiftItem',
                        i18nParams: { name: targetName, qty, item: itemNomeBonito || itemKey },
                    },
                );

                await window.SupabaseAPI.broadcastGM?.('force_update', targetName, {
                    i18nKey: 'game.gm.forceUpdateGiftItem',
                    i18nParams: { qty, item: itemNomeBonito || itemKey },
                });
            } catch (err) {
                this._gmNotify(
                    this.gmT('giveFailed', { detail: gmErrMessage(err) }) || 'Send failed: ' + gmErrMessage(err),
                );
            }
    },

    _attachGmPlayerListHandlers(container) {
        if (!container) return;
        const bindBtn = (sel, handler) => {
            container.querySelectorAll(sel).forEach((btn) => {
                const enc = btn.getAttribute('data-gm-player');
                const name = this.decodeGmAttr(enc);
                btn.onclick = () => {
                    try {
                        handler(name);
                    } catch (e) {
                        console.warn('GM panel action:', e);
                    }
                };
            });
        };
        bindBtn('.gm-btn-edit[data-gm-player]', (n) => void this.editPlayer(n));
        bindBtn('.gm-btn-kick[data-gm-player]', (n) => void this.kickPlayer(n));
        bindBtn('.gm-btn-ban[data-gm-player]', (n) => void this.banPlayer(n));
    },

    async _invokeGmSetLevelRpc(canonicalHint: string, levelNum: number) {
        if (!window.SupabaseAPI?.client) {
            return { ok: false, rpcError: { message: 'no_client' }, rpcPayload: null };
        }
        const { data, error } = await window.SupabaseAPI.client.rpc('gm_set_character_level', {
            p_char_name: canonicalHint.trim(),
            p_level: Math.floor(levelNum),
        });

        if (error) {
            return { ok: false, rpcError: error, rpcPayload: null };
        }
        let payload: GmSetLevelRpcResult = typeof data === 'object' && data ? (data as GmSetLevelRpcResult) : {};
        if (typeof data === 'string') {
            try {
                payload = JSON.parse(data) as GmSetLevelRpcResult;
            } catch {
                return { ok: false, rpcError: null, rpcPayload: null, parseFail: true };
            }
        }
        if (payload && payload.ok === true) {
            return { ok: true, rpcPayload: payload };
        }
        const reason = payload && payload.error ? String(payload.error) : 'rpc_rejected';
        return { ok: false, rpcError: null, rpcPayload: payload, rpcReason: reason };
    },

    async _fallbackOwnerMergedLevelUpdate(charNameRaw: string, levelNum: number) {
        if (!window.SupabaseAPI?.client) throw new Error('no_client');
        const { data: sessionData } = await window.SupabaseAPI.client.auth.getUser();
        const user = sessionData?.user;
        if (!user) throw new Error('not_authenticated');

        const { data: row, error: selErr } = await window.SupabaseAPI.client
            .from('characters')
            .select('user_id, char_name, data')
            .ilike('char_name', charNameRaw.trim())
            .maybeSingle();

        if (selErr) throw selErr;
        const charRow = row as { user_id?: string; char_name?: string; data?: Record<string, unknown> } | null;
        if (!charRow?.char_name) throw new Error('character_not_found');
        if (charRow.user_id !== user.id) throw new Error('not_owner_rpc_required');

        const base = charRow.data && typeof charRow.data === 'object' ? charRow.data : {};
        const newData = Object.assign({}, base, { nivel: levelNum, xpAtual: 0 });

        const { error: updErr } = await gmCharactersPatch(window.SupabaseAPI.client)
            .update({
                level: levelNum,
                data: newData,
                updated_at: new Date().toISOString(),
            })
            .eq('char_name', charRow.char_name);

        if (updErr) throw updErr;
        return { char_name: charRow.char_name };
    },

    _applyLevelToLocalSessionIfAffected(canonicalName: string, levelNum: number, resetXp: boolean) {
        const cn = typeof window.charName === 'string' ? window.charName : '';
        if (!cn || canonicalName.toLowerCase() !== cn.toLowerCase()) return;
        window.nivel = Math.floor(levelNum);
        if (resetXp) window.xpAtual = 0;
        try {
            if (typeof window.calcularXpNecessario === 'function') {
                window.xpNecessario = window.calcularXpNecessario(window.nivel);
            }
        } catch (e) {
            /* noop */
        }
        try {
            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        } catch (e) {
            /* noop */
        }
        try {
            if (typeof window.atualizar === 'function') window.atualizar();
        } catch (e) {
            /* noop */
        }
        try {
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } catch (e) {
            console.warn('GM nivel local persist:', e);
        }
    },

    async renderPlayersTab(container) {
        try {
            const { data: chars, error } = await gmCharactersList(window.SupabaseAPI.client!)
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            if (!chars || !chars.length) {
                container.innerHTML =
                    `<div style="color:#888; text-align:center; padding:20px;">${this.gmT('playersEmpty') || 'No registered characters.'}</div>`;
                return;
            }

            let html = `<h4 style="color:#ef4444; margin-bottom:15px; font-size:0.8em;">${this.escapeHtml(this.gmT('registeredPlayers', { count: chars.length }))}</h4>`;

            chars.forEach((char) => {
                const isOnline = this.checkIfOnline(char.char_name);
                const safeNameHtml = this.escapeHtml(char.char_name);
                const enc = this.encodeGmAttr(char.char_name);
                const uid = char.user_id ? String(char.user_id) : '';
                const uidShort = uid ? uid.substring(0, 8) : '—';
                const lvl = char.level != null ? char.level : '—';
                const statusLabel = isOnline ? this.gmT('statusOnline') : this.gmT('statusOffline');

                html += `
                    <div class="gm-player-card">
                        <div class="gm-player-header">
                            <div>
                                <span class="gm-player-name">${safeNameHtml}</span>
                                <span style="font-size:0.7em; color:#666; margin-left:10px;">ID: ${this.escapeHtml(uidShort)}...</span>
                            </div>
                            <span style="font-size:0.7em; color:${isOnline ? '#22c55e' : '#666'}; font-weight:bold;">
                                ${this.escapeHtml(statusLabel)}
                            </span>
                        </div>
                        <div style="display:flex; gap:15px; font-size:0.75em; color:#aaa;">
                            <span>LVL: <b style="color:#fff;">${this.escapeHtml(String(lvl))}</b></span>
                            <span>CLASS: <b style="color:#fff;">${this.escapeHtml(char.char_class || '—')}</b></span>
                        </div>
                        <div class="gm-player-actions">
                            <button type="button" class="gm-btn-action gm-btn-edit" data-gm-player="${enc}">${this.escapeHtml(this.gmT('btnSetLevel'))}</button>
                            <button type="button" class="gm-btn-action gm-btn-kick" data-gm-player="${enc}">${this.escapeHtml(this.gmT('btnKick'))}</button>
                            <button type="button" class="gm-btn-action gm-btn-ban" data-gm-player="${enc}">${this.escapeHtml(this.gmT('btnBan'))}</button>
                        </div>
                    </div>
                `;
            });

            html += `<p style="color:#64748b; font-size:0.62em; margin-top:12px; line-height:1.35;">${this.escapeHtml(this.gmT('hintLevelRpc'))}</p>`;
            container.innerHTML = html;
            this._attachGmPlayerListHandlers(container);
        } catch (err) {
            const msg =
                typeof window.t === 'function'
                    ? window.t('game.gmPanel.errorLoadingPlayers', { message: gmErrMessage(err) })
                    : 'Error loading players: ' + gmErrMessage(err);
            container.innerHTML = `<div style="color:#ef4444;">${msg}</div>`;
        }
    },

    renderBroadcastTab(container) {
        const esc = (s: string) => this.escapeHtml(s);
        const lbl = (k: string) => esc(this.gmT(k));
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">${lbl('broadcastTitle')}</h4>
                <p style="color:#888; font-size:0.75em;">${lbl('broadcastHint')}</p>
                <textarea id="gm-broadcast-msg" class="gm-input" style="height:100px; resize:none;" placeholder="${lbl('broadcastPlaceholder')}"></textarea>
                <button class="btn-l2" style="background:linear-gradient(180deg, #991b1b, #450a0a); height:45px;" onclick="GMEngine.sendBroadcast()">${lbl('sendBroadcastBtn')}</button>
            </div>
        `;
    },

    renderServerTab(container) {
        const esc = (s: string) => this.escapeHtml(s);
        const lbl = (k: string) => esc(this.gmT(k));
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px; font-size:0.85em; color:#aaa;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">${lbl('serverInfoTitle')}</h4>
                <div style="background:#111; padding:15px; border-radius:6px; border:1px solid #333; display:flex; flex-direction:column; gap:10px;">
                    <div>${lbl('serverProjectId')}: <b style="color:#fff;">kgjcbujkzsrgcjcowxts</b></div>
                    <div>${lbl('serverDbStatus')}: <b style="color:#22c55e;">${lbl('dbConnected')}</b></div>
                    <div>${lbl('serverRealtime')}: <b style="color:#22c55e;">${lbl('serverRealtimeActive')}</b></div>
                    <div>${lbl('serverPersistence')}: <b style="color:#fff;">${lbl('serverPersistenceEnabled')}</b></div>
                </div>
                <button class="btn-l2" style="background:#333; height:40px; margin-top:10px;" onclick="location.reload()">${lbl('reloadServerBtn')}</button>
            </div>
        `;
    },

    checkIfOnline(charName: string) {
        if (!window.SupabaseAPI?.presenceChannel) return false;
        const state = window.SupabaseAPI.presenceChannel.presenceState();
        return state[charName] !== undefined;
    },

    async sendBroadcast() {
        const msgEl = gmTextArea('gm-broadcast-msg');
        const msg = msgEl?.value.trim() ?? '';
        if (!msg) return;

        const ok = await this._gmConfirm(
            `${this.gmT('broadcastConfirm')}\n\n"${msg}"`,
            this.gmT('broadcastTitle') || 'Global broadcast',
        );
        if (!ok) return;

        if (window.SupabaseAPI?.broadcastChat) {
            await window.SupabaseAPI.broadcastChat('SYSTEM', msg, 'GM_ANNOUNCEMENT', 'global');
            if (msgEl) msgEl.value = '';
            if (typeof window.mostrarAviso === 'function') {
                window.mostrarAviso(typeof window.t === 'function' ? window.t('game.gm.announcementSent') : 'Announcement sent!');
            }
        }
    },

    async kickPlayer(charName) {
        if (!window.SupabaseAPI || !window.SupabaseAPI.client) return;
        const decoded = typeof charName === 'string' ? charName.trim() : '';
        if (!decoded) return;

        let okKick = false;
        if (typeof window.l2Confirm === 'function') {
            okKick = await window.l2Confirm(
                this.gmT('kickConfirm', { name: decoded }) || `Kick player ${decoded}?`,
                this.gmT('kickTitle') || 'Kick'
            );
        } else {
            okKick = window.confirm(`Kick player ${decoded}?`);
        }

        if (okKick) {
            await window.SupabaseAPI.broadcastGM('kick', decoded);
            const msg =
                typeof window.t === 'function'
                    ? window.t('game.gm.kickCommandSent', { name: decoded })
                    : `Command sent to kick ${decoded}`;
            if (window.mostrarAviso) window.mostrarAviso(msg);
        }
    },

    _rpcLooksMissing(fnErr) {
        if (!fnErr) return false;
        const c = String(fnErr.code || '');
        const msg = String(fnErr.message || fnErr.details || '').toLowerCase();
        return (
            c === '42883' ||
            c === 'pgrst301' ||
            msg.includes('could not find the function') ||
            msg.includes('does not exist') ||
            msg.includes('schema cache')
        );
    },

    async editPlayer(charName) {
        if (!charName || typeof window.SupabaseAPI === 'undefined' || !window.SupabaseAPI.client) {
            const msg = this.gmT('offlineOrNoSupabase') || 'Supabase is offline or unavailable.';
            if (typeof window.l2Alert === 'function') window.l2Alert(msg);
            else alert(msg);
            return;
        }

        const target = String(charName).trim();
        const raw =
            typeof window.prompt === 'function'
                ? window.prompt(
                      this.gmT('promptSetLevel', { name: target }) || `New level for ${target} (1–999):`,
                      '76'
                  )
                : '';

        if (raw == null || String(raw).trim() === '') return;

        const levelNum = parseInt(raw, 10);
        if (!Number.isFinite(levelNum) || levelNum < 1 || levelNum > 999) {
            const warn =
                this.gmT('invalidLevelRange') || 'Enter a whole number between 1 and 999.';
            if (typeof window.l2Alert === 'function') window.l2Alert(warn);
            else alert(warn);
            return;
        }

        const confirmBody =
            this.gmT('confirmSetLevelBody', { name: target, level: levelNum }) ||
            `Apply level ${levelNum} to "${target}"? This updates cloud level + save JSON (data.nivel).`;

        let okConfirm = false;
        if (typeof window.l2Confirm === 'function') {
            okConfirm = await window.l2Confirm(
                confirmBody,
                this.gmT('confirmSetLevelTitle') || 'Confirm level change'
            );
        } else {
            okConfirm = window.confirm(confirmBody);
        }
        if (!okConfirm) return;

        let canonicalName = target;
        let completedViaRpc = false;

        try {
            const rpc = await this._invokeGmSetLevelRpc(target, levelNum);

            if (rpc.ok && rpc.rpcPayload && rpc.rpcPayload.char_name) {
                canonicalName = String(rpc.rpcPayload.char_name);
                completedViaRpc = true;
            } else if (rpc.rpcPayload && rpc.rpcPayload.error === 'forbidden_not_gm') {
                const deny = this.gmT('rpcForbiddenGm') || 'Forbidden: GM access missing on your profile.';
                if (typeof window.l2Alert === 'function') window.l2Alert(deny);
                else alert(deny);
                return;
            } else if (rpc.rpcPayload && rpc.rpcPayload.error === 'not_found') {
                const nf = this.gmT('characterNotFoundShort') || 'Character not found.';
                if (typeof window.l2Alert === 'function') window.l2Alert(nf);
                else alert(nf);
                return;
            } else if (rpc.rpcPayload && rpc.rpcPayload.error === 'invalid_level') {
                const wl = this.gmT('invalidLevelRange') || 'Invalid level.';
                if (typeof window.l2Alert === 'function') window.l2Alert(wl);
                else alert(wl);
                return;
            }

            const missingFn = rpc.rpcError && this._rpcLooksMissing(rpc.rpcError);

            if (!completedViaRpc) {
                try {
                    const fb = await this._fallbackOwnerMergedLevelUpdate(target, levelNum);
                    canonicalName = String(fb.char_name);
                    if (missingFn) {
                        console.warn(
                            'GM nivel: RPC gm_set_character_level unavailable; merged level via owner UPDATE (JSON + column). Deploy SQL for other accounts.'
                        );
                    }
                } catch (fe) {
                    const code = fe && fe.message ? String(fe.message) : 'unknown';

                    if (code === 'not_owner_rpc_required') {
                        const guide =
                            this.gmT('rpcDeployHint') ||
                            'Run supabase_gm_set_character_level.sql on your Supabase project. With RLS, the browser cannot PATCH other players.';
                        if (typeof window.l2Alert === 'function') window.l2Alert(guide);
                        else alert(guide);
                        console.error('[GM nivel] Need RPC or own character:', rpc, fe);
                        return;
                    }
                    if (code === 'not_authenticated') {
                        const nl =
                            this.gmT('notLoggedCloud') || 'Sign in to the cloud to use GM tools.';
                        if (typeof window.l2Alert === 'function') window.l2Alert(nl);
                        else alert(nl);
                        return;
                    }
                    if (code === 'character_not_found') {
                        const nf = this.gmT('characterNotFoundShort') || 'Character not found.';
                        if (typeof window.l2Alert === 'function') window.l2Alert(nf);
                        else alert(nf);
                        return;
                    }

                    const tech =
                        this.gmT('levelSetUnexpected', {
                            detail: String(fe && fe.message ? fe.message : fe)
                        }) || `Could not save level (${fe && fe.message ? fe.message : fe}).`;
                    if (typeof window.l2Alert === 'function') window.l2Alert(tech);
                    else alert(tech);
                    console.error('[GM nivel]', rpc, fe);
                    return;
                }
            }

            await window.SupabaseAPI.broadcastGM('set_level', canonicalName, {
                level: levelNum,
                msg: this.gmT('levelSetGmToast', { level: levelNum }) || ''
            });

            this._applyLevelToLocalSessionIfAffected(canonicalName, levelNum, true);

            const success =
                this.gmT('levelSetSaved', { name: canonicalName, level: levelNum }) ||
                `Saved ${canonicalName} → level ${levelNum}.`;

            if (typeof window.mostrarAviso === 'function') window.mostrarAviso(success);
            else if (typeof window.l2Alert === 'function') window.l2Alert(success);
            else alert(success);

            await this.loadTabContent();
        } catch (err) {
            const fallbackMsg =
                this.gmT('levelSetFailed', {
                    detail: String(err && err.message ? err.message : err || 'unknown')
                }) || `Level update failed: ${String(err && err.message ? err.message : err)}`;
            if (typeof window.l2Alert === 'function') window.l2Alert(fallbackMsg);
            else alert(fallbackMsg);
            console.error('[GM nivel] unexpected', err);
        }
    },

    async banPlayer(_charName) {
        const msg =
            this.gmT('banNotImplemented') ||
            'Ban is not wired yet — add a `banned` flag (or equivalent) plus RLS, then plug it here.';
        if (typeof window.l2Alert === 'function') window.l2Alert(msg);
        else alert(msg);
    }
};

registerGlobal('GMEngine', GMEngine);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => void GMEngine.init(), 2000);
});

export {};
