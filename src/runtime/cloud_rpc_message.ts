/**
 * Maps stable RPC / cloud error codes to localized player messages.
 */

import { registerGlobal } from './register-global';

function normalizeRpcErrorCode(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err.trim();
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (err instanceof Error && err.message) return err.message.trim();
  }
  return String(err).trim();
}

/** "Mail not found" → mail_not_found; "Already claimed" → already_claimed */
export function slugRpcErrorCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export type CloudRpcMessageOptions = {
  prefix?: string;
  fallbackKey?: string;
};

/**
 * Resolves `prefix.error_<slug>` with fallback to `prefix.error` or `fallbackKey`.
 */
export function cloudRpcMessage(code: unknown, options?: CloudRpcMessageOptions): string {
  const prefix = options?.prefix ?? 'game.cloud';
  const fallbackKey = options?.fallbackKey ?? `${prefix}.error`;
  const raw = normalizeRpcErrorCode(code);
  const slug = slugRpcErrorCode(raw);

  if (typeof window.t !== 'function') {
    return raw || 'Error';
  }

  if (slug) {
    const specificKey = `${prefix}.error_${slug}`;
    const specific = window.t(specificKey);
    if (specific !== specificKey) return specific;
  }

  const fb = window.t(fallbackKey);
  if (fb !== fallbackKey) return fb;
  const unknown = window.t('game.cloud.error_unknown');
  return unknown !== 'game.cloud.error_unknown' ? unknown : raw || 'Error';
}

registerGlobal('cloudRpcMessage', cloudRpcMessage);
registerGlobal('slugRpcErrorCode', slugRpcErrorCode);
