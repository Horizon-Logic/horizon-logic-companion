/**
 * Plugin Vite de tradução build-time.
 *
 * Estratégia:
 *  1. Para cada arquivo .tsx/.ts do workspace ui, parsear AST.
 *  2. Visitar JSXText e atributos JSX whitelistados.
 *  3. Se a string existir no dicionário e tiver tradução não-vazia, substituir.
 *  4. Strings sem tradução passam intactas (ficam em inglês até serem traduzidas).
 *
 * Lê o dicionário do disco em cada chamada de transform com cache invalidado
 * por mtime — isso permite editar pt-BR.json e ver o resultado via HMR sem
 * reiniciar o dev server.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import MagicString from "magic-string";
import type { Plugin } from "vite";
import {
  DICT_PATH,
  TRANSLATABLE_JSX_ATTRS,
  TRANSLATABLE_OBJECT_KEYS,
  isTranslatable,
} from "./config";

// @babel/traverse exporta default em CJS; lidar com ambos
const traverse = (
  (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse
) as typeof _traverse;

type Dict = Record<string, string>;

let cachedDict: Dict = {};
let cachedMtime = 0;

function loadDict(): Dict {
  try {
    const stat = fs.statSync(DICT_PATH);
    if (stat.mtimeMs !== cachedMtime) {
      const raw = fs.readFileSync(DICT_PATH, "utf8");
      cachedDict = JSON.parse(raw);
      cachedMtime = stat.mtimeMs;
    }
  } catch {
    cachedDict = {};
  }
  return cachedDict;
}

function shouldProcess(id: string): boolean {
  // Vite às vezes passa o id com query string (?v=, ?import, etc.) — descartar
  const cleanId = id.split("?")[0];
  if (!/\.(tsx|ts|jsx|js)$/.test(cleanId)) return false;
  if (cleanId.includes("/node_modules/")) return false;
  if (cleanId.includes("/src/custom/")) return false;
  return true;
}

/** Decodifica entidades HTML básicas que aparecem em JSXText cru. */
function decodeJsxText(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Re-codifica string traduzida pra inserir como JSXText. */
function encodeJsxText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function i18nPlugin(): Plugin {
  return {
    name: "horizon-logic-i18n",
    enforce: "pre",
    transform(code, id) {
      if (!shouldProcess(id)) return null;

      const dict = loadDict();
      // optimization: skip arquivo se nenhuma string do dict aparece no código
      // (varredura textual rápida antes de gastar AST)
      const hasAnyKey = Object.keys(dict).some(
        (k) => dict[k] && code.includes(k.split("\n")[0]?.trim().slice(0, 12))
      );
      if (!hasAnyKey) return null;

      let ast;
      try {
        ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx", "decorators-legacy"],
          errorRecovery: true,
        });
      } catch {
        return null;
      }

      const ms = new MagicString(code);
      let changed = false;

      const replaceStringLiteral = (node: {
        start?: number | null;
        end?: number | null;
        value: string;
      }) => {
        if (!isTranslatable(node.value)) return;
        const translation = dict[node.value];
        if (!translation) return;
        const start = node.start ?? 0;
        const end = node.end ?? 0;
        const quote = code[start] === "'" ? "'" : '"';
        const escaped = translation.replace(
          new RegExp(quote, "g"),
          `\\${quote}`
        );
        ms.overwrite(start, end, `${quote}${escaped}${quote}`);
        changed = true;
      };

      traverse(ast, {
        JSXText(p) {
          const raw = p.node.value;
          const trimmed = decodeJsxText(raw).trim();
          if (!isTranslatable(trimmed)) return;
          const translation = dict[trimmed];
          if (!translation) return;

          // preservar whitespace ao redor (significativo em JSX)
          const start = p.node.start ?? 0;
          const end = p.node.end ?? 0;
          const leading = raw.match(/^\s*/)?.[0] ?? "";
          const trailing = raw.match(/\s*$/)?.[0] ?? "";
          ms.overwrite(
            start,
            end,
            leading + encodeJsxText(translation) + trailing
          );
          changed = true;
        },
        // Captura StringLiterals em ternários/lógicos em qualquer contexto.
        // Cobre tanto JSX (`{x ? "a" : "b"}`) quanto atribuições a variáveis
        // (`const label = x ? "a" : "b"`) que depois são renderizadas em JSX.
        // O filtro isTranslatable + lookup no dict protegem contra falsos positivos.
        ConditionalExpression(c) {
          if (c.node.consequent.type === "StringLiteral")
            replaceStringLiteral(c.node.consequent);
          if (c.node.alternate.type === "StringLiteral")
            replaceStringLiteral(c.node.alternate);
        },
        LogicalExpression(l) {
          if (l.node.right.type === "StringLiteral")
            replaceStringLiteral(l.node.right);
        },
        // {"texto direto"} — StringLiteral filho direto de expressão JSX
        JSXExpressionContainer(p) {
          if (p.node.expression.type === "StringLiteral") {
            replaceStringLiteral(p.node.expression);
          }
        },
        JSXAttribute(p) {
          const nameNode = p.node.name;
          const attrName =
            nameNode.type === "JSXIdentifier"
              ? nameNode.name
              : nameNode.type === "JSXNamespacedName"
                ? `${nameNode.namespace.name}:${nameNode.name.name}`
                : null;
          if (!attrName || !TRANSLATABLE_JSX_ATTRS.has(attrName)) return;
          const value = p.node.value;
          if (!value || value.type !== "StringLiteral") return;
          const text = value.value;
          if (!isTranslatable(text)) return;
          const translation = dict[text];
          if (!translation) return;

          const start = value.start ?? 0;
          const end = value.end ?? 0;
          const quote = code[start] === "'" ? "'" : '"';
          const escaped = translation.replace(
            new RegExp(quote, "g"),
            `\\${quote}`
          );
          ms.overwrite(start, end, `${quote}${escaped}${quote}`);
          changed = true;
        },
        // Object literal properties com chave whitelistada e valor StringLiteral.
        // Cobre: setBreadcrumbs([{ label: "X" }]), toast({ title: "Y" }),
        // arrays de config (registries de adapters, ações), etc.
        ObjectProperty(p) {
          const key = p.node.key;
          const keyName =
            key.type === "Identifier"
              ? key.name
              : key.type === "StringLiteral"
                ? key.value
                : null;
          if (!keyName || !TRANSLATABLE_OBJECT_KEYS.has(keyName)) return;
          const value = p.node.value;
          if (value.type !== "StringLiteral") return;
          replaceStringLiteral(value);
        },
      });

      if (!changed) return null;
      return {
        code: ms.toString(),
        map: ms.generateMap({ hires: true, source: id }),
      };
    },
    handleHotUpdate(ctx) {
      // ao salvar pt-BR.json, força reload de tudo que depende
      if (path.resolve(ctx.file) === DICT_PATH) {
        cachedMtime = 0; // invalida cache na próxima transform
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      }
      return undefined;
    },
  };
}
