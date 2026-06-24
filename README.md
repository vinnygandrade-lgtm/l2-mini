# Iron Gate Mini

Browser MMORPG (TypeScript + Vite). Cliente em `src/`, deploy via pasta `dist/`.

## Requisitos

- [Node.js](https://nodejs.org/) 20+ (LTS recomendado)
- [Git](https://git-scm.com/) (opcional, para histórico e backup no GitHub)

## Instalação

```bash
npm install
npx playwright install chromium
```

## Desenvolvimento

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). **Não** abras `index.html` directo no browser — o jogo usa Vite.

## Validar antes de merge / entrega

```bash
npm run validate
```

Corre: `typecheck` → sintaxe do bundle i18n → `build`.

Com regressão automatizada (mais lento):

```bash
npm run test:ci
```

`test:ci` = typecheck + build + smoke Playwright (o mesmo fluxo que corre no GitHub Actions).

## Outros comandos

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Gera `dist/` para produção |
| `npm run preview` | Serve `dist/` localmente |
| `npm run typecheck` | TypeScript sem emitir ficheiros |
| `npm run check:i18n` | Valida parse de `locales_bundle.ts` |
| `npm run test:smoke` | Testes E2E (dev server porta 4173) |

## Deploy

```bash
npm run build
```

Publica o conteúdo de **`dist/`** (GitHub Pages, Netlify, etc.).

## Documentação

| Doc | Conteúdo |
|-----|----------|
| `.cursor/rules/l2mini-project-rules.mdc` | GDD e regras oficiais (§14 = toolchain) |
| `docs/new-feature-checklist.md` | Checklist antes de feature nova |
| `docs/typescript-migration-phase0.md` | Smoke tests e histórico da migração TS |

## Supabase

Scripts SQL na raiz (`supabase_MASTER_SETUP.sql`, `supabase_*.sql`). Aplicar manualmente no SQL Editor do projecto — o remoto não segue o Git automaticamente.
