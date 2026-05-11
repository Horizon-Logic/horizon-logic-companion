/**
 * Horizon Logic — Branding centralizado
 *
 * Use estas constantes em wrappers de componentes (ui/src/custom/components/)
 * em vez de editar componentes originais do paperclip.
 */

export const branding = {
  appName: "Horizon Logic Companion",
  shortName: "HL Companion",
  tagline: "Orquestração de agentes para sua empresa",

  // Caminhos de assets — coloque os arquivos em ui/public/custom/
  // (servidos via Vite a partir de paperclip/ui/public/)
  logoLight: "/custom/horizon-logic.png",
  logoDark: "/custom/horizon-logic.png",
  favicon: "/custom/favicon.ico",

  // Links institucionais
  website: "https://horizonlogic.com.br",
  supportEmail: "contato@horizonlogic.com.br",
} as const;

export type Branding = typeof branding;
