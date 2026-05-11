/**
 * Configuração da camada i18n custom.
 *
 * O plugin de build e o extractor compartilham essa config para garantir
 * que ambos enxergam o mesmo conjunto de strings traduzíveis.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do workspace UI (paperclip/ui). */
export const UI_ROOT = path.resolve(__dirname, "../../..");

/** Caminho do dicionário pt-BR. */
export const DICT_PATH = path.resolve(__dirname, "pt-BR.json");

/** Extensões de arquivo que serão traduzidas. */
export const TRANSLATABLE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

/** Diretórios ignorados (relativos a UI_ROOT). */
export const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "storybook-static",
  ".vite",
  "src/custom", // não traduzir nossas próprias customizações
]);

/**
 * Chaves de objeto cujo valor (StringLiteral) será traduzido.
 * Cobre arrays de config, registries (adapter labels), breadcrumbs,
 * notificações com label/title, e padrões similares em chamadas de função.
 *
 * Ex: setBreadcrumbs([{ label: "Issues" }])
 *     toast({ title: "Saved" })
 *     adapters: [{ label: "Claude Code", description: "..." }]
 */
export const TRANSLATABLE_OBJECT_KEYS = new Set([
  "label",
  "title",
  "description",
  "message",
  "text",
  "subtitle",
  "summary",
  "caption",
  "tooltip",
  "placeholder",
  "name",
  "heading",
  "hint",
  "errorMessage",
  "emptyMessage",
  "helperText",
]);

/**
 * Atributos JSX cujo valor (StringLiteral) será traduzido.
 * Inclui também atributos comuns de acessibilidade e UI.
 */
export const TRANSLATABLE_JSX_ATTRS = new Set([
  "placeholder",
  "title",
  "alt",
  "label",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "tooltip",
  "description",
  "emptyMessage",
  "helperText",
  "errorMessage",
  "subtitle",
  "heading",
  // Props customizadas comuns em componentes do paperclip
  "value",
  "name",
  "summary",
  "caption",
  "prefix",
  "suffix",
  "message",
  "text",
  "hint",
  "header",
  "footer",
  "emptyState",
  "fallback",
]);

/**
 * Filtros para decidir se uma string é candidata a tradução.
 * Evita capturar IDs, paths, classes CSS, identificadores técnicos.
 */
export function isTranslatable(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 2) return false;
  // precisa ter pelo menos uma letra (descarta puramente numérico/símbolo)
  if (!/[A-Za-z]/.test(s)) return false;
  // descarta strings que parecem path / url / identifier técnico
  if (/^[/\\]/.test(s)) return false; // /path
  if (/^https?:\/\//.test(s)) return false;
  if (/^[a-z][a-zA-Z0-9_-]*$/.test(s) && s.length < 16) return false; // camelCase id curto
  if (/^[A-Z_][A-Z0-9_]*$/.test(s)) return false; // CONSTANT_CASE
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false; // cor hex
  if (/^\$\{/.test(s)) return false; // template literal residual
  // Imports de módulo (@/components/X, @scope/pkg/Y)
  if (/^@\/[a-zA-Z]/.test(s)) return false;
  if (/^@[a-z][a-zA-Z-]+\//.test(s)) return false;
  // Blocos JSON / HTML / fragmentos estruturados (não são UI text)
  if (/^\s*[{[<]/.test(s) && /[}\]>]\s*$/.test(s)) return false;
  // Classes CSS/Tailwind — string é toda composta por tokens utility-like.
  // Cobre tokens com hífen, arbitrary values em [...], e bare utilities comuns.
  // Ex: "pt-0.5", "px-4 pb-4", "bg-[var(--x)]", "hover:bg-red-500",
  //     "border border-border rounded-lg", "flex items-center gap-2"
  const TAILWIND_BARE_UTILS = new Set([
    "block", "inline", "flex", "grid", "hidden", "fixed", "absolute",
    "relative", "static", "sticky", "border", "truncate", "italic",
    "underline", "uppercase", "lowercase", "capitalize", "rounded",
    "shadow", "container", "isolate", "overflow", "visible", "invisible",
    "antialiased", "subpixel-antialiased", "items-center", "items-start",
    "items-end", "justify-center", "justify-between", "justify-end",
  ]);
  const variantPrefix = /^(?:[a-z][a-z0-9]*:|@[a-z][a-z0-9-]*:)*/;
  const looksLikeUtility = (t: string): boolean => {
    const stripped = t.replace(/^!/, "").replace(variantPrefix, "");
    if (TAILWIND_BARE_UTILS.has(stripped)) return true;
    // hífenado, opcionalmente com arbitrary value [..] ou fração 1/2
    return /^-?[a-z][a-z0-9]*(?:-[a-z0-9./!%]+|-\[[^\]]+\])+$/.test(stripped);
  };
  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every(looksLikeUtility)) return false;
  return true;
}
