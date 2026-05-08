/**
 * Ponto de entrada das customizações Horizon Logic.
 *
 * Importado em ui/src/main.tsx (com marca // CUSTOM:) — é o ÚNICO ponto
 * onde o paperclip oficial é tocado. Tudo o mais vive nesta pasta.
 *
 * Para adicionar customizações:
 *   - Estilos/tokens → editar theme.css
 *   - Branding (nome, logo, links) → editar branding.ts
 *   - Componentes wrapper → criar em ./components/ e re-exportar aqui
 */

import "./theme.css";

export { branding } from "./branding";
// i18nPlugin é Node-only e importado direto pelo vite.config.ts;
// re-exportar aqui faria o Vite arrastar @babel/* pro bundle do browser.
