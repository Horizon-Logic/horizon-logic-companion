/**
 * Extrator de strings traduzíveis.
 *
 * Uso: pnpm --filter @paperclipai/ui i18n:extract
 *
 * - Varre ui/src/**\/*.{tsx,ts,jsx,js} (exceto custom/, node_modules/, dist/)
 * - Coleta JSXText e atributos JSX whitelistados
 * - Mescla com pt-BR.json existente, preservando traduções já feitas
 * - Marca chaves órfãs (existentes no JSON mas não mais no código) ao final
 *
 * Imprime estatísticas: total / novas / órfãs.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import {
  DICT_PATH,
  IGNORED_DIRS,
  TRANSLATABLE_EXTENSIONS,
  TRANSLATABLE_JSX_ATTRS,
  TRANSLATABLE_OBJECT_KEYS,
  UI_ROOT,
  isTranslatable,
} from "./config";

const traverse = (
  (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse
) as typeof _traverse;

function* walk(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(UI_ROOT, full);
    if (IGNORED_DIRS.has(rel) || IGNORED_DIRS.has(e.name)) continue;
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (
      e.isFile() &&
      TRANSLATABLE_EXTENSIONS.includes(path.extname(e.name))
    ) {
      yield full;
    }
  }
}

function decodeJsxText(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractFromFile(file: string): Set<string> {
  const code = fs.readFileSync(file, "utf8");
  const found = new Set<string>();
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });
  } catch {
    return found;
  }

  traverse(ast, {
    JSXText(p) {
      const t = decodeJsxText(p.node.value).trim();
      if (isTranslatable(t)) found.add(t);
    },
    // Strings em ternários/lógicos em qualquer contexto (JSX ou atribuições a variáveis)
    ConditionalExpression(c) {
      if (c.node.consequent.type === "StringLiteral" && isTranslatable(c.node.consequent.value)) {
        found.add(c.node.consequent.value);
      }
      if (c.node.alternate.type === "StringLiteral" && isTranslatable(c.node.alternate.value)) {
        found.add(c.node.alternate.value);
      }
    },
    LogicalExpression(l) {
      if (l.node.right.type === "StringLiteral" && isTranslatable(l.node.right.value)) {
        found.add(l.node.right.value);
      }
    },
    JSXExpressionContainer(p) {
      if (p.node.expression.type === "StringLiteral" && isTranslatable(p.node.expression.value)) {
        found.add(p.node.expression.value);
      }
    },
    JSXAttribute(p) {
      const n = p.node.name;
      const attrName =
        n.type === "JSXIdentifier"
          ? n.name
          : n.type === "JSXNamespacedName"
            ? `${n.namespace.name}:${n.name.name}`
            : null;
      if (!attrName || !TRANSLATABLE_JSX_ATTRS.has(attrName)) return;
      const v = p.node.value;
      if (v?.type === "StringLiteral" && isTranslatable(v.value)) {
        found.add(v.value);
      }
    },
    // Object literal properties com chave whitelistada e valor StringLiteral.
    ObjectProperty(p) {
      const key = p.node.key;
      const keyName =
        key.type === "Identifier"
          ? key.name
          : key.type === "StringLiteral"
            ? key.value
            : null;
      if (!keyName || !TRANSLATABLE_OBJECT_KEYS.has(keyName)) return;
      const v = p.node.value;
      if (v.type === "StringLiteral" && isTranslatable(v.value)) {
        found.add(v.value);
      }
    },
  });

  return found;
}

function loadExisting(): Record<string, string> {
  if (!fs.existsSync(DICT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DICT_PATH, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  const srcDir = path.join(UI_ROOT, "src");
  const allKeys = new Set<string>();
  let fileCount = 0;
  for (const f of walk(srcDir)) {
    fileCount++;
    for (const k of extractFromFile(f)) allKeys.add(k);
  }

  const existing = loadExisting();
  let kept = 0;
  let added = 0;

  // Separa preenchidas vs vazias e ordena alfabeticamente dentro de cada grupo.
  // No arquivo final: traduzidas primeiro, depois as que ainda faltam.
  const filled: string[] = [];
  const empty: string[] = [];
  for (const k of allKeys) {
    const value = k in existing ? existing[k] : "";
    if (value) {
      filled.push(k);
      kept++;
    } else {
      empty.push(k);
      if (!(k in existing)) added++;
    }
  }
  filled.sort((a, b) => a.localeCompare(b));
  empty.sort((a, b) => a.localeCompare(b));

  const merged: Record<string, string> = {};
  for (const k of filled) merged[k] = existing[k];
  for (const k of empty) merged[k] = "";

  // detectar órfãs (existiam no JSON mas não estão mais no código)
  const orphans = Object.keys(existing).filter((k) => !allKeys.has(k));

  fs.writeFileSync(DICT_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");

  const untranslated = Object.values(merged).filter((v) => !v).length;
  console.log(`📝 i18n extract`);
  console.log(`   Arquivos varridos:   ${fileCount}`);
  console.log(`   Total de chaves:     ${filled.length + empty.length}`);
  console.log(`   Mantidas:            ${kept}`);
  console.log(`   Novas (vazias):      ${added}`);
  console.log(`   Órfãs (removidas):   ${orphans.length}`);
  console.log(`   Sem tradução agora:  ${untranslated}`);
  if (orphans.length > 0) {
    console.log(
      `\n   Removidas do dicionário:\n${orphans
        .slice(0, 10)
        .map((s) => `     - ${s.slice(0, 80)}`)
        .join("\n")}${orphans.length > 10 ? `\n     ...e mais ${orphans.length - 10}` : ""}`
    );
  }
  console.log(`\n   Dicionário: ${path.relative(process.cwd(), DICT_PATH)}`);
}

main();
