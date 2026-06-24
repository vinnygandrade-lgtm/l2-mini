/**
 * Migrado: js/i18n/i18n.js
 */

import type { I18nLocaleTree, I18nParams, I18nSetLocaleOptions, UiLocale } from '../types/game';

/* ========================================== */
/* I18N — runtime locale, t(), persistence    */
/* Single source of truth: character save      */
/* (uiLocale) when logged in; device fallback  */
/* via localStorage when pre-character.        */
/* ========================================== */

(function () {
  'use strict';

  const DEVICE_KEY = 'l2mini_locale';
  const FALLBACK: UiLocale = 'en';
  const SUPPORTED: UiLocale[] = ['en', 'pt-BR'];

  function normalizeLocale(code: unknown): UiLocale {
    if (!code || typeof code !== 'string') return FALLBACK;
    const c = code.trim().replace(/_/g, '-');
    if (c.toLowerCase() === 'pt-br' || c.toLowerCase() === 'ptbr') return 'pt-BR';
    if (c.toLowerCase() === 'en') return 'en';
    if ((SUPPORTED as string[]).indexOf(c) >= 0) return c as UiLocale;
    return FALLBACK;
  }

  function getNested(obj: unknown, path: string): unknown {
    try {
      if (!obj || !path || typeof path !== 'string') return undefined;
      const parts = path.split('.');
      let cur: unknown = obj;
      for (let i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[parts[i]!];
      }
      return cur;
    } catch {
      return undefined;
    }
  }

  function interpolate(str: string, params?: I18nParams): string {
    if (!params || typeof str !== 'string') return str;
    try {
      return str.replace(/\{(\w+)\}/g, (_, k: string) => {
        try {
          return params[k] != null ? String(params[k]) : '{' + k + '}';
        } catch {
          return '{' + k + '}';
        }
      });
    } catch {
      return str;
    }
  }

  const bundles: Record<string, I18nLocaleTree> = {};

  function register(locale: string, tree: I18nLocaleTree): void {
    try {
      const L = normalizeLocale(locale);
      bundles[L] = tree && typeof tree === 'object' ? tree : {};
    } catch {
      /* ignore bad pack */
    }
  }

  function loadFromWindowPacks(): void {
    try {
      if (typeof window.I18N_LOCALES !== 'object' || !window.I18N_LOCALES) return;
      for (const k in window.I18N_LOCALES) {
        if (Object.prototype.hasOwnProperty.call(window.I18N_LOCALES, k)) {
          register(k, window.I18N_LOCALES[k] as I18nLocaleTree);
        }
      }
    } catch {
      /* ignore corrupt I18N_LOCALES */
    }
  }

  let current: UiLocale = FALLBACK;

  function getLocale(): UiLocale {
    return current;
  }

  function readDeviceLocale(): UiLocale {
    try {
      const raw = localStorage.getItem(DEVICE_KEY);
      return normalizeLocale(raw || FALLBACK);
    } catch {
      return FALLBACK;
    }
  }

  function writeDeviceLocale(code: string): void {
    try {
      localStorage.setItem(DEVICE_KEY, normalizeLocale(code));
    } catch {
      /* ignore */
    }
  }

  function setLocale(code: string, opts?: I18nSetLocaleOptions): void {
    const L = normalizeLocale(code);
    current = L;
    try {
      document.documentElement.setAttribute('lang', L === 'pt-BR' ? 'pt-BR' : 'en');
    } catch {
      /* ignore */
    }

    const persistDevice = !opts || opts.persistDevice !== false;
    const persistChar = !opts || opts.persistCharacter !== false;

    if (persistDevice) writeDeviceLocale(L);

    if (persistChar && window.charName && typeof window.salvarJogo === 'function') {
      try {
        window.salvarJogo();
      } catch {
        /* ignore */
      }
    }

    try {
      refreshDom();
    } catch {
      /* ignore */
    }
    if (typeof window.refreshMarketUiI18n === 'function') {
      try {
        window.refreshMarketUiI18n();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.AuthEngine !== 'undefined' && typeof window.AuthEngine.renderCharacterList === 'function') {
      try {
        const sel = document.getElementById('screen-char-select');
        if (sel && sel.classList.contains('active-screen')) window.AuthEngine.renderCharacterList();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.renderizarMailbox === 'function') {
      try {
        const mbWin = document.getElementById('janela-mailbox');
        if (mbWin && mbWin.style.display === 'flex') window.renderizarMailbox();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.RewardEngine !== 'undefined' && typeof window.RewardEngine.render === 'function') {
      try {
        const rHub = document.getElementById('janela-reward-hub');
        if (rHub && rHub.style.display === 'flex') window.RewardEngine.render();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.atualizarPreview === 'function') {
      try {
        const criacao = document.getElementById('screen-criacao');
        if (criacao && criacao.classList.contains('active-screen')) window.atualizarPreview();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.renderizarMissoesDiarias === 'function') {
      try {
        const dm = document.getElementById('janela-missoes-diarias');
        if (dm && dm.style.display === 'flex') window.renderizarMissoesDiarias();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.atualizarWorldDailyBossUI === 'function') {
      try {
        window.atualizarWorldDailyBossUI();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.refreshHuntZoneHud === 'function') {
      try {
        window.refreshHuntZoneHud();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.TutorialEngine !== 'undefined' && typeof window.TutorialEngine.render === 'function') {
      try {
        window.TutorialEngine.render();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.atualizar === 'function') {
      try {
        window.atualizar();
      } catch {
        /* ignore */
      }
    }
    if (typeof window.refreshGameSettingsUi === 'function') {
      try {
        window.refreshGameSettingsUi();
      } catch {
        /* ignore */
      }
    }
  }

  function cycleLocale(): void {
    const next: UiLocale = current === 'pt-BR' ? 'en' : 'pt-BR';
    setLocale(next);
  }

  function applyFromSave(fromSave?: string | null): void {
    if (fromSave) {
      setLocale(fromSave, { persistDevice: true, persistCharacter: false });
    }
  }

  function init(): void {
    try {
      loadFromWindowPacks();
    } catch {
      /* ignore */
    }
    current = readDeviceLocale();
    try {
      document.documentElement.setAttribute('lang', current === 'pt-BR' ? 'pt-BR' : 'en');
    } catch {
      /* ignore */
    }
    try {
      refreshDom();
    } catch {
      /* ignore */
    }
    if (typeof window.refreshHuntZoneHud === 'function') {
      try {
        window.refreshHuntZoneHud();
      } catch {
        /* ignore */
      }
    }
  }

  function t(key: string, params?: I18nParams): string {
    const keyStr = typeof key === 'string' ? key : key != null ? String(key) : '';
    if (!keyStr) return '';
    try {
      const primary = getNested(bundles[current], keyStr);
      const fb = getNested(bundles[FALLBACK], keyStr);
      const raw = primary != null ? primary : fb != null ? fb : keyStr;
      if (typeof raw !== 'string') return keyStr;
      return interpolate(raw, params);
    } catch {
      return keyStr;
    }
  }

  function applyToElement(el: Element, keyAttr?: string): void {
    if (!el || typeof (el as HTMLElement).getAttribute !== 'function') return;
    try {
      const htmlEl = el as HTMLElement;
      const key = htmlEl.getAttribute(keyAttr || 'data-i18n');
      if (!key) return;
      const val = t(key);
      if (htmlEl instanceof HTMLInputElement || htmlEl instanceof HTMLTextAreaElement) {
        if (htmlEl.hasAttribute('data-i18n-placeholder')) {
          const pkey = htmlEl.getAttribute('data-i18n-placeholder');
          htmlEl.placeholder = pkey ? t(pkey) : val;
        } else {
          htmlEl.placeholder = val;
        }
      } else if (htmlEl.hasAttribute('data-i18n-html')) {
        htmlEl.innerHTML = val;
      } else {
        htmlEl.textContent = val;
      }
    } catch {
      /* one bad node must not break refresh */
    }
  }

  function getArray(key: string): unknown[] {
    const keyStr = typeof key === 'string' ? key : key != null ? String(key) : '';
    if (!keyStr) return [];
    try {
      const primary = getNested(bundles[current], keyStr);
      if (Array.isArray(primary) && primary.length) return primary;
      const fb = getNested(bundles[FALLBACK], keyStr);
      return Array.isArray(fb) && fb.length ? fb : [];
    } catch {
      return [];
    }
  }

  function refreshDom(root?: ParentNode | Document | null): void {
    try {
      const base =
        root && 'querySelectorAll' in root && typeof root.querySelectorAll === 'function'
          ? root
          : document;
      if (!base || typeof base.querySelectorAll !== 'function') return;
      const list = base.querySelectorAll('[data-i18n]');
      for (let i = 0; i < list.length; i++) {
        applyToElement(list[i]!, 'data-i18n');
      }
      const ph = base.querySelectorAll('[data-i18n-placeholder]');
      for (let j = 0; j < ph.length; j++) {
        const el = ph[j];
        if (!el) continue;
        const pk = el.getAttribute('data-i18n-placeholder');
        if (pk) {
          try {
            (el as HTMLInputElement).placeholder = t(pk);
          } catch {
            /* ignore */
          }
        }
      }
      const titles = base.querySelectorAll('[data-i18n-title]');
      for (let k = 0; k < titles.length; k++) {
        const te = titles[k];
        if (!te) continue;
        const tk = te.getAttribute('data-i18n-title');
        if (tk) {
          try {
            te.setAttribute('title', t(tk));
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore broken DOM */
    }
  }

  window.I18n = {
    DEVICE_KEY,
    FALLBACK_LOCALE: FALLBACK,
    SUPPORTED,
    register,
    init,
    getLocale,
    setLocale,
    cycleLocale,
    applyFromSave,
    t,
    getArray,
    refreshDom,
    normalizeLocale,
  };

  window.t = t;
})();

export {};
