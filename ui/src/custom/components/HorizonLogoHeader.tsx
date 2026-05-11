import { branding } from "../branding";

/**
 * Faixa com o logo da Horizon Logic no topo da sidebar.
 * Injetada via 1 linha marcada // CUSTOM: em ui/src/components/Sidebar.tsx.
 *
 * O arquivo do logo deve estar em ui/public/custom/horizon-logic.svg
 * (ou .png — basta atualizar `logoLight` em ui/src/custom/branding.ts).
 */
export function HorizonLogoHeader() {
  return (
    <div className="flex items-center justify-center px-6 py-6 shrink-0 border-b border-gray-800">
      <img
        src={branding.logoLight}
        alt={branding.appName}
        className="h-6 w-auto object-contain"
        draggable={false}
      />
    </div>
  );
}
