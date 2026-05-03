/* ========================================== */
/* I18N — runtime locale, t(), persistence    */
/* Single source of truth: character save      */
/* (uiLocale) when logged in; device fallback  */
/* via localStorage when pre-character.        */
/* ========================================== */

(function () {
    'use strict';

    var DEVICE_KEY = 'l2mini_locale';
    var FALLBACK = 'en';
/** @type {string[]} */
    var SUPPORTED = ['en', 'pt-BR'];

    function normalizeLocale(code) {
        if (!code || typeof code !== 'string') return FALLBACK;
        var c = code.trim().replace(/_/g, '-');
        if (c.toLowerCase() === 'pt-br' || c.toLowerCase() === 'ptbr') return 'pt-BR';
        if (c.toLowerCase() === 'en') return 'en';
        if (SUPPORTED.indexOf(c) >= 0) return c;
        return FALLBACK;
    }

    function getNested(obj, path) {
        try {
            if (!obj || !path || typeof path !== 'string') return undefined;
            var parts = path.split('.');
            var cur = obj;
            for (var i = 0; i < parts.length; i++) {
                if (cur == null || typeof cur !== 'object') return undefined;
                cur = cur[parts[i]];
            }
            return cur;
        } catch (e) {
            return undefined;
        }
    }

    function interpolate(str, params) {
        if (!params || typeof str !== 'string') return str;
        try {
            return str.replace(/\{(\w+)\}/g, function (_, k) {
                try {
                    return params[k] != null ? String(params[k]) : '{' + k + '}';
                } catch (eP) {
                    return '{' + k + '}';
                }
            });
        } catch (e) {
            return str;
        }
    }

    /** @type {Record<string, Record<string, unknown>>} */
    var bundles = {};

    function register(locale, tree) {
        try {
            var L = normalizeLocale(locale);
            bundles[L] = tree && typeof tree === 'object' ? tree : {};
        } catch (e) { /* ignore bad pack */ }
    }

    function loadFromWindowPacks() {
        try {
            if (typeof window.I18N_LOCALES !== 'object' || !window.I18N_LOCALES) return;
            for (var k in window.I18N_LOCALES) {
                if (Object.prototype.hasOwnProperty.call(window.I18N_LOCALES, k)) {
                    register(k, window.I18N_LOCALES[k]);
                }
            }
        } catch (e) { /* ignore corrupt I18N_LOCALES */ }
    }

    var current = FALLBACK;

    function getLocale() {
        return current;
    }

    function readDeviceLocale() {
        try {
            var raw = localStorage.getItem(DEVICE_KEY);
            return normalizeLocale(raw || FALLBACK);
        } catch (e) {
            return FALLBACK;
        }
    }

    function writeDeviceLocale(code) {
        try {
            localStorage.setItem(DEVICE_KEY, normalizeLocale(code));
        } catch (e) { /* ignore */ }
    }

    /**
     * @param {string} code
     * @param {{ persistDevice?: boolean, persistCharacter?: boolean }} [opts]
     */
    function setLocale(code, opts) {
        var L = normalizeLocale(code);
        current = L;
        try {
            document.documentElement.setAttribute('lang', L === 'pt-BR' ? 'pt-BR' : 'en');
        } catch (e) { /* ignore */ }

        var persistDevice = !opts || opts.persistDevice !== false;
        var persistChar = !opts || opts.persistCharacter !== false;

        if (persistDevice) writeDeviceLocale(L);

        if (persistChar && window.charName && typeof window.salvarJogo === 'function') {
            try {
                window.salvarJogo();
            } catch (e2) { /* ignore */ }
        }

        try {
            refreshDom();
        } catch (eRdom) { /* ignore */ }
        if (typeof window.refreshMarketUiI18n === 'function') {
            try {
                window.refreshMarketUiI18n();
            } catch (eMk) { /* ignore */ }
        }
        if (typeof window.AuthEngine !== 'undefined' && typeof window.AuthEngine.renderCharacterList === 'function') {
            try {
                var sel = document.getElementById('screen-char-select');
                if (sel && sel.classList.contains('active-screen')) window.AuthEngine.renderCharacterList();
            } catch (eR) { /* ignore */ }
        }
        if (typeof window.renderizarMailbox === 'function') {
            try {
                var mbWin = document.getElementById('janela-mailbox');
                if (mbWin && mbWin.style.display === 'flex') window.renderizarMailbox();
            } catch (eM) { /* ignore */ }
        }
        if (typeof window.RewardEngine !== 'undefined' && typeof window.RewardEngine.render === 'function') {
            try {
                var rHub = document.getElementById('janela-reward-hub');
                if (rHub && rHub.style.display === 'flex') window.RewardEngine.render();
            } catch (eRw) { /* ignore */ }
        }
        if (typeof window.atualizarPreview === 'function') {
            try {
                var criacao = document.getElementById('screen-criacao');
                if (criacao && criacao.classList.contains('active-screen')) window.atualizarPreview();
            } catch (eC) { /* ignore */ }
        }
        if (typeof window.renderizarMissoesDiarias === 'function') {
            try {
                var dm = document.getElementById('janela-missoes-diarias');
                if (dm && dm.style.display === 'flex') window.renderizarMissoesDiarias();
            } catch (eD) { /* ignore */ }
        }
        if (typeof window.atualizarWorldDailyBossUI === 'function') {
            try {
                window.atualizarWorldDailyBossUI();
            } catch (eDb) { /* ignore */ }
        }
        if (typeof window.atualizar === 'function') {
            try {
                window.atualizar();
            } catch (e3) { /* ignore */ }
        }
    }

    function cycleLocale() {
        var next = current === 'pt-BR' ? 'en' : 'pt-BR';
        setLocale(next);
    }

    /**
     * Call after loading save: prefer character uiLocale; sync device.
     * @param {string|null|undefined} fromSave
     */
    function applyFromSave(fromSave) {
        if (fromSave) {
            setLocale(fromSave, { persistDevice: true, persistCharacter: false });
        }
    }

    function init() {
        try {
            loadFromWindowPacks();
        } catch (e) { /* ignore */ }
        current = readDeviceLocale();
        try {
            document.documentElement.setAttribute('lang', current === 'pt-BR' ? 'pt-BR' : 'en');
        } catch (e) { /* ignore */ }
        try {
            refreshDom();
        } catch (e) { /* ignore */ }
    }

    /**
     * @param {string} key dot path e.g. "login.enter"
     * @param {Record<string, string|number>} [params]
     */
    function t(key, params) {
        var keyStr = typeof key === 'string' ? key : (key != null ? String(key) : '');
        if (!keyStr) return '';
        try {
            var primary = getNested(bundles[current], keyStr);
            var fb = getNested(bundles[FALLBACK], keyStr);
            var raw = primary != null ? primary : (fb != null ? fb : keyStr);
            if (typeof raw !== 'string') return keyStr;
            return interpolate(raw, params);
        } catch (e) {
            return keyStr;
        }
    }

    function applyToElement(el, keyAttr) {
        if (!el || typeof el.getAttribute !== 'function') return;
        try {
            var key = el.getAttribute(keyAttr || 'data-i18n');
            if (!key) return;
            var val = t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('data-i18n-placeholder')) {
                    var pkey = el.getAttribute('data-i18n-placeholder');
                    el.placeholder = pkey ? t(pkey) : val;
                } else {
                    el.placeholder = val;
                }
            } else if (el.hasAttribute('data-i18n-html')) {
                el.innerHTML = val;
            } else {
                el.textContent = val;
            }
        } catch (e) { /* one bad node must not break refresh */ }
    }

    function getArray(key) {
        var keyStr = typeof key === 'string' ? key : (key != null ? String(key) : '');
        if (!keyStr) return [];
        try {
            var primary = getNested(bundles[current], keyStr);
            if (Array.isArray(primary) && primary.length) return primary;
            var fb = getNested(bundles[FALLBACK], keyStr);
            return (Array.isArray(fb) && fb.length) ? fb : [];
        } catch (e) {
            return [];
        }
    }

    function refreshDom(root) {
        try {
            var base = root && root.querySelectorAll ? root : document;
            if (!base || typeof base.querySelectorAll !== 'function') return;
            var list = base.querySelectorAll('[data-i18n]');
            for (var i = 0; i < list.length; i++) {
                applyToElement(list[i], 'data-i18n');
            }
            var ph = base.querySelectorAll('[data-i18n-placeholder]');
            for (var j = 0; j < ph.length; j++) {
                var el = ph[j];
                if (!el) continue;
                var pk = el.getAttribute('data-i18n-placeholder');
                if (pk) {
                    try {
                        el.placeholder = t(pk);
                    } catch (ePh) { /* ignore */ }
                }
            }
            var titles = base.querySelectorAll('[data-i18n-title]');
            for (var k = 0; k < titles.length; k++) {
                var te = titles[k];
                if (!te) continue;
                var tk = te.getAttribute('data-i18n-title');
                if (tk) {
                    try {
                        te.setAttribute('title', t(tk));
                    } catch (eT) { /* ignore */ }
                }
            }
        } catch (e) { /* ignore broken DOM */ }
    }

    window.I18n = {
        DEVICE_KEY: DEVICE_KEY,
        FALLBACK_LOCALE: FALLBACK,
        SUPPORTED: SUPPORTED,
        register: register,
        init: init,
        getLocale: getLocale,
        setLocale: setLocale,
        cycleLocale: cycleLocale,
        applyFromSave: applyFromSave,
        t: t,
        getArray: getArray,
        refreshDom: refreshDom,
        normalizeLocale: normalizeLocale
    };

    window.t = t;
})();
