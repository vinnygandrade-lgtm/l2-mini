/**
 * GM_ENGINE.JS
 * Game Master administration system for L2 Mini.
 * Manage players, send global messages, and grant items/currency.
 */

const GMEngine = {
    accessLevel: 0,
    activeTab: 'players',

    /**
     * Initialize GM engine and verify permissions (non-blocking retries via openPanel).
     */
    async init() {
        console.log('🛡️ GM Engine: Checking access...');
        if (typeof SupabaseAPI === 'undefined' || !SupabaseAPI.client) {
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
        if (typeof SupabaseAPI === 'undefined' || !SupabaseAPI.client) return 0;

        try {
            const { data: sessionData } = await SupabaseAPI.client.auth.getUser();
            const user = sessionData && sessionData.user;
            if (!user) {
                console.warn('GM Engine: No user logged in to Supabase.');
                return 0;
            }

            const { data: profile, error } = await SupabaseAPI.client
                .from('profiles')
                .select('access_level')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('❌ GM Engine: Error fetching profile:', error.message || error);
                return 0;
            }

            if (profile && profile.access_level > 0) {
                this.accessLevel = profile.access_level;
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

    switchTab(tab, btn) {
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
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">GIVE RESOURCES TO PLAYER</h4>
                
                <div class="gm-input-group">
                    <label style="color:#888; font-size:0.7em;">TARGET PLAYER NAME</label>
                    <input id="gm-give-target" class="gm-input" type="text" placeholder="Character Name">
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div class="gm-input-group">
                        <label style="color:#888; font-size:0.7em;">ADENA AMOUNT</label>
                        <input id="gm-give-adena" class="gm-input" type="number" placeholder="0">
                        <button class="gm-btn-action gm-btn-edit" style="margin-top:5px; background:#ca8a04;" onclick="GMEngine.giveCurrency('adena')">GIVE ADENA</button>
                    </div>
                    <div class="gm-input-group">
                        <label style="color:#888; font-size:0.7em;">ANCIENT COINS</label>
                        <input id="gm-give-coins" class="gm-input" type="number" placeholder="0">
                        <button class="gm-btn-action gm-btn-edit" style="margin-top:5px; background:#1e40af;" onclick="GMEngine.giveCurrency('ancient')">GIVE COINS</button>
                    </div>
                </div>

                <div class="divider"></div>

                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">GIVE SPECIAL ITEMS</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <select id="gm-give-item-select" class="gm-input">
                        <option value="">-- SELECT ITEM --</option>
                        <optgroup label="Materials">
                            <option value="Animal Skin">Animal Skin</option>
                            <option value="Steel">Steel</option>
                            <option value="Ancient Coin">Ancient Coin (Item)</option>
                        </optgroup>
                        <optgroup label="S-Grade Weapons">
                            <option value="wpn_s_vesper_cutter">Vesper Cutter</option>
                            <option value="wpn_s_vesper_shaper">Vesper Shaper</option>
                            <option value="wpn_s_vesper_thrower">Vesper Thrower</option>
                        </optgroup>
                        <optgroup label="S-Grade Armor">
                            <option value="arm_s_vesper_heavy">Vesper Noble Heavy</option>
                            <option value="arm_s_vesper_light">Vesper Noble Light</option>
                            <option value="arm_s_vesper_robe">Vesper Noble Robe</option>
                        </optgroup>
                    </select>
                    <input id="gm-give-item-qty" class="gm-input" type="number" value="1" placeholder="Quantity">
                    <button class="btn-l2" style="background:linear-gradient(180deg, #15803d, #14532d); height:40px;" onclick="GMEngine.giveItem()">GIVE ITEM</button>
                </div>
            </div>
        `;
    },

    async giveCurrency(type) {
        let targetInput = document.getElementById('gm-give-target').value.trim();
        const amountInput = document.getElementById(type === 'adena' ? 'gm-give-adena' : 'gm-give-coins');
        const amount = parseInt(amountInput.value);

        if (!targetInput || isNaN(amount) || amount <= 0) return alert("Enter a valid target and amount.");

        if (confirm(`Send ${amount.toLocaleString()} ${type.toUpperCase()} to ${targetInput}?`)) {
            try {
                const { data: char } = await SupabaseAPI.client
                    .from('characters')
                    .select('char_name')
                    .ilike('char_name', targetInput)
                    .maybeSingle();
                
                const targetName = char ? char.char_name : targetInput;
                const coinName = type === 'adena' ? 'Adena' : 'Ancient Coin';

                const prettyAmount = amount.toLocaleString();
                const { error } = await SupabaseAPI.client.from('rewards').insert([{
                    char_name: targetName,
                    sender: 'Game Master',
                    message: `Hello, champion of Aden.

That little reward we save for people who make the server shine? This is it. ✨

The GM team prepared ${prettyAmount} ${coinName} for you. May every coin help in memorable battles, dream crafts, or that “I did it” moment. You’ve earned it.

With respect and a digital hug,
GM Team`,
                    items: [{ id: coinName, qtd: amount, tipo: 'currency' }]
                }]);

                if (error) throw error;
                
                alert(`✅ ${amount.toLocaleString()} ${coinName} sent to ${targetName}!`);
                amountInput.value = '';
                
                await SupabaseAPI.broadcastChat('SYSTEM', `✦ [GM] A special gift was sent to ${targetName}: ${prettyAmount} ${coinName}. Safe travels in Aden!`, 'GM_ANNOUNCEMENT', 'global');
                
                await SupabaseAPI.broadcastGM('force_update', targetName, {
                    msg: `✨ A GM gift is waiting for you! Open the 🎁 in the corner — ${prettyAmount} ${coinName} from the team.`
                });
                
            } catch (err) {
                alert("Send failed: " + err.message);
            }
        }
    },

    async giveItem() {
        let targetInput = document.getElementById('gm-give-target').value.trim();
        const itemKey = document.getElementById('gm-give-item-select').value;
        const qtyInput = document.getElementById('gm-give-item-qty');
        const qty = parseInt(qtyInput.value);

        if (!targetInput || !itemKey || isNaN(qty) || qty <= 0) return alert("Select player, item, and quantity.");

        if (confirm(`Send ${qty}x ${itemKey} to ${targetInput}?`)) {
            try {
                const { data: char } = await SupabaseAPI.client
                    .from('characters')
                    .select('char_name')
                    .ilike('char_name', targetInput)
                    .maybeSingle();
                
                const targetName = char ? char.char_name : targetInput;

                const { error } = await SupabaseAPI.client.from('rewards').insert([{
                    char_name: targetName,
                    sender: 'Game Master',
                    message: `Adventurer,

Sometimes fate — or a generous GM — puts exactly what you needed in your hands. ⚔️

The team picked and wrapped this for you: ${qty}x ${itemKey}. We hope it makes a difference on your next step in Aden.

Shine out there, and thanks for playing with us.
GM Team`,
                    items: [{ id: itemKey, qtd: qty, tipo: 'item' }]
                }]);

                if (error) throw error;
                
                alert(`✅ ${qty}x ${itemKey} sent to ${targetName}!`);
                qtyInput.value = '1';

                await SupabaseAPI.broadcastChat('SYSTEM', `✦ [GM] ${targetName} received a team gift: ${qty}x ${itemKey}. May it serve you well in Aden!`, 'GM_ANNOUNCEMENT', 'global');
                
                await SupabaseAPI.broadcastGM('force_update', targetName, {
                    msg: `✨ The GM left a gift in the Reward Hub: ${qty}x ${itemKey}. Open the 🎁 — it was prepared for you.`
                });

            } catch (err) {
                alert("Send failed: " + err.message);
            }
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

    async _invokeGmSetLevelRpc(canonicalHint, levelNum) {
        const { data, error } = await SupabaseAPI.client.rpc('gm_set_character_level', {
            p_char_name: canonicalHint.trim(),
            p_level: Math.floor(levelNum)
        });

        if (error) {
            return { ok: false, rpcError: error, rpcPayload: null };
        }
        let payload = data;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                return { ok: false, rpcError: null, rpcPayload: null, parseFail: true };
            }
        }
        if (payload && payload.ok === true) {
            return { ok: true, rpcPayload: payload };
        }
        const reason = payload && payload.error ? String(payload.error) : 'rpc_rejected';
        return { ok: false, rpcError: null, rpcPayload: payload, rpcReason: reason };
    },

    async _fallbackOwnerMergedLevelUpdate(charNameRaw, levelNum) {
        const { data: sessionData } = await SupabaseAPI.client.auth.getUser();
        const user = sessionData && sessionData.user;
        if (!user) throw new Error('not_authenticated');

        const { data: row, error: selErr } = await SupabaseAPI.client
            .from('characters')
            .select('user_id, char_name, data')
            .ilike('char_name', charNameRaw.trim())
            .maybeSingle();

        if (selErr) throw selErr;
        if (!row || !row.char_name) throw new Error('character_not_found');
        if (row.user_id !== user.id) throw new Error('not_owner_rpc_required');

        const base = row.data && typeof row.data === 'object' ? row.data : {};
        const newData = Object.assign({}, base, { nivel: levelNum, xpAtual: 0 });

        const { error: updErr } = await SupabaseAPI.client
            .from('characters')
            .update({
                level: levelNum,
                data: newData,
                updated_at: new Date().toISOString()
            })
            .eq('char_name', row.char_name);

        if (updErr) throw updErr;
        return { char_name: row.char_name };
    },

    _applyLevelToLocalSessionIfAffected(canonicalName, levelNum, resetXp) {
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
            const { data: chars, error } = await SupabaseAPI.client
                .from('characters')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            if (!chars || !chars.length) {
                container.innerHTML =
                    `<div style="color:#888; text-align:center; padding:20px;">${this.gmT('playersEmpty') || 'No registered characters.'}</div>`;
                return;
            }

            let html = `<h4 style="color:#ef4444; margin-bottom:15px; font-size:0.8em;">REGISTERED PLAYERS (${chars.length})</h4>`;

            chars.forEach((char) => {
                const isOnline = this.checkIfOnline(char.char_name);
                const safeNameHtml = this.escapeHtml(char.char_name);
                const enc = this.encodeGmAttr(char.char_name);
                const uid = char.user_id ? String(char.user_id) : '';
                const uidShort = uid ? uid.substring(0, 8) : '—';
                const lvl = char.level != null ? char.level : '—';

                html += `
                    <div class="gm-player-card">
                        <div class="gm-player-header">
                            <div>
                                <span class="gm-player-name">${safeNameHtml}</span>
                                <span style="font-size:0.7em; color:#666; margin-left:10px;">ID: ${this.escapeHtml(uidShort)}...</span>
                            </div>
                            <span style="font-size:0.7em; color:${isOnline ? '#22c55e' : '#666'}; font-weight:bold;">
                                ${isOnline ? '● ONLINE' : '○ OFFLINE'}
                            </span>
                        </div>
                        <div style="display:flex; gap:15px; font-size:0.75em; color:#aaa;">
                            <span>LVL: <b style="color:#fff;">${this.escapeHtml(String(lvl))}</b></span>
                            <span>CLASS: <b style="color:#fff;">${this.escapeHtml(char.char_class || '—')}</b></span>
                        </div>
                        <div class="gm-player-actions">
                            <button type="button" class="gm-btn-action gm-btn-edit" data-gm-player="${enc}">${this.gmT('btnSetLevel') || 'SET LEVEL'}</button>
                            <button type="button" class="gm-btn-action gm-btn-kick" data-gm-player="${enc}">KICK</button>
                            <button type="button" class="gm-btn-action gm-btn-ban" data-gm-player="${enc}">BAN</button>
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
                    ? window.t('game.gmPanel.errorLoadingPlayers', { message: err.message })
                    : 'Error loading players: ' + err.message;
            container.innerHTML = `<div style="color:#ef4444;">${msg}</div>`;
        }
    },

    renderBroadcastTab(container) {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">GLOBAL ANNOUNCEMENT</h4>
                <p style="color:#888; font-size:0.75em;">This message will be sent to all online players in real-time.</p>
                <textarea id="gm-broadcast-msg" class="gm-input" style="height:100px; resize:none;" placeholder="Type your announcement here..."></textarea>
                <button class="btn-l2" style="background:linear-gradient(180deg, #991b1b, #450a0a); height:45px;" onclick="GMEngine.sendBroadcast()">SEND ANNOUNCEMENT</button>
            </div>
        `;
    },

    renderServerTab(container) {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px; font-size:0.85em; color:#aaa;">
                <h4 style="color:#ef4444; margin-bottom:5px; font-size:0.8em;">SERVER INFORMATION</h4>
                <div style="background:#111; padding:15px; border-radius:6px; border:1px solid #333; display:flex; flex-direction:column; gap:10px;">
                    <div>Project ID: <b style="color:#fff;">kgjcbujkzsrgcjcowxts</b></div>
                    <div>Database Status: <b style="color:#22c55e;">CONNECTED</b></div>
                    <div>Realtime Engine: <b style="color:#22c55e;">ACTIVE</b></div>
                    <div>Session Persistence: <b style="color:#fff;">ENABLED</b></div>
                </div>
                <button class="btn-l2" style="background:#333; height:40px; margin-top:10px;" onclick="location.reload()">RELOAD SERVER</button>
            </div>
        `;
    },

    checkIfOnline(charName) {
        if (typeof SupabaseAPI === 'undefined' || !SupabaseAPI.presenceChannel) return false;
        const state = SupabaseAPI.presenceChannel.presenceState();
        return state[charName] !== undefined;
    },

    async sendBroadcast() {
        const msg = document.getElementById('gm-broadcast-msg').value;
        if (!msg) return;

        if (confirm(`Send this global message?\n\n"${msg}"`)) {
            if (typeof SupabaseAPI !== 'undefined') {
                await SupabaseAPI.broadcastChat('SYSTEM', msg, 'GM_ANNOUNCEMENT', 'global');
                document.getElementById('gm-broadcast-msg').value = '';
                if (window.mostrarAviso) window.mostrarAviso(typeof window.t === 'function' ? window.t('game.gm.announcementSent') : "Announcement sent!");
            }
        }
    },

    async kickPlayer(charName) {
        if (!SupabaseAPI || !SupabaseAPI.client) return;
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
            await SupabaseAPI.broadcastGM('kick', decoded);
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
        if (!charName || typeof SupabaseAPI === 'undefined' || !SupabaseAPI.client) {
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

            await SupabaseAPI.broadcastGM('set_level', canonicalName, {
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

window.GMEngine = GMEngine;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => GMEngine.init(), 2000);
});
