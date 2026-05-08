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
  return true;
}
