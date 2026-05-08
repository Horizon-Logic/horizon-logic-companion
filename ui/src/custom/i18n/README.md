# i18n Custom — Tradução build-time (PT-BR)

Sistema de tradução build-time via plugin Vite. **Zero edição em componentes do paperclip oficial** — o plugin transforma o código durante o build, substituindo strings em inglês pelas traduções do dicionário.

## Como funciona

```
.tsx (em inglês)  ─►  Vite plugin (AST transform)  ─►  bundle (em português)
                              ↑
                       pt-BR.json
```

1. O **plugin** ([vite-plugin-i18n.ts](vite-plugin-i18n.ts)) parseia cada `.tsx`/`.ts` durante o build/dev.
2. Substitui:
   - **JSXText** — texto entre tags JSX (`>Texto<`)
   - **JSXAttribute** — valor de atributos whitelistados em [config.ts](config.ts) (`placeholder`, `title`, `aria-label`, `alt`, `label`, etc.)
3. Strings sem tradução no dicionário **passam intactas** (ficam em inglês).
4. Editar `pt-BR.json` dispara reload via HMR.

## Arquivos

```
ui/src/custom/i18n/
├── README.md                # este arquivo
├── config.ts                # extensões, ignores, atributos traduzíveis, filtros
├── extract.ts               # CLI que escaneia .tsx e popula pt-BR.json
├── vite-plugin-i18n.ts      # plugin Vite (transform build-time)
└── pt-BR.json               # dicionário (chave = inglês, valor = português)
```

## Workflow

### 1. Traduzir strings novas

Edite [pt-BR.json](pt-BR.json) e preencha o valor (string em português) das chaves vazias.

```json
{
  "Settings": "Configurações",
  "New issue": "Nova issue",
  "Unsaved changes": ""        ← deixe vazio até traduzir
}
```

Strings com valor vazio passam intactas (ficam em inglês). Útil pra ir traduzindo aos poucos.

### 2. Extrair strings novas (após upstream merge)

```bash
pnpm --filter @paperclipai/ui i18n:extract
```

O comando:
- Varre `ui/src/**/*.{tsx,ts,jsx,js}` (exceto `node_modules/`, `dist/`, `src/custom/`)
- **Mantém traduções existentes** no JSON
- Adiciona chaves novas com valor `""`
- Remove chaves órfãs (strings que não existem mais no código)
- Imprime estatísticas (total / novas / órfãs)

### 3. Atualizar com upstream

```bash
git fetch upstream
git merge upstream/main
pnpm install
pnpm --filter @paperclipai/ui i18n:extract   # detecta strings novas
# revisa pt-BR.json — preencha as novas
pnpm dev                                      # valida
git add . && git commit -m "merge upstream + traduções novas"
git push origin customizations
```

## Limitações conhecidas

| Limitação | Workaround |
|---|---|
| Strings construídas dinamicamente (`"Hello " + name`) não são detectadas | Extrair pra constante e adicionar manualmente no JSON, ou wrappear o componente em `ui/src/custom/components/` |
| Plurais e interpolação não têm sintaxe especial | Para casos com variável (`"3 items"`), o plugin não detecta — refatore o componente em `ui/src/custom/components/` |
| Atributos não-whitelistados (ex: `data-tooltip`) não são traduzidos | Adicione em `TRANSLATABLE_JSX_ATTRS` no [config.ts](config.ts) |
| Strings em arquivos `.tsx` dentro de `node_modules` (libs externas) | Não são traduzidas. Se for `@radix-ui` ou similar, é melhor wrappear |

## Adicionar tradução automática (futuro)

Quando quiser, adicione um script `translate.ts` que chama Claude API:

```ts
// ui/src/custom/i18n/translate.ts (placeholder)
// Lê pt-BR.json, para cada chave com valor "" chama Claude API,
// salva o resultado. Roda após `i18n:extract`.
```

## Arquivos do paperclip oficial tocados

Apenas dois, ambos com 1 linha marcada `// CUSTOM:`:

- [`ui/vite.config.ts`](../../../vite.config.ts) — registra o plugin
- [`ui/package.json`](../../../package.json) — adiciona script `i18n:extract` e devDeps (`@babel/parser`, `@babel/traverse`, `@babel/types`, `magic-string`, `tsx`)

Esses pontos são os únicos que podem dar conflito em merges futuros — geralmente triviais de resolver.
