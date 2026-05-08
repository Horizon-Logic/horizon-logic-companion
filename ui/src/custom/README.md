# Customizações Horizon Logic

Esta pasta isola todas as personalizações do fork. **Nada aqui existe no paperclip oficial**, então `git merge upstream/main` nunca gera conflito nestes arquivos.

## Estrutura

```
ui/src/custom/
├── index.ts         # ponto de entrada — importado em main.tsx
├── theme.css        # overrides de CSS variables (cores, radius, etc)
├── branding.ts      # nome, logo, links institucionais
├── components/      # wrappers de componentes do paperclip
└── README.md        # este arquivo
```

## Como funciona

1. `ui/src/main.tsx` tem **uma única linha customizada** (marcada com `// CUSTOM:`) que importa `./custom`.
2. `custom/index.ts` carrega `theme.css` **depois** do `index.css` original — por cascata CSS, suas variáveis sobrescrevem as do upstream sem editar o arquivo original.
3. Tokens não declarados em `theme.css` continuam vindo do paperclip e atualizam automaticamente em merges.

## Como customizar

### Cores e tema
Edite `theme.css`. Use [oklch.com](https://oklch.com) para escolher cores no mesmo formato do paperclip.

### Branding (nome do app, logo, links)
Edite `branding.ts`. Coloque imagens em `ui/public/custom/`.

Para usar em componentes, importe e crie wrappers em `components/`:

```tsx
// ui/src/custom/components/CustomLogo.tsx
import { branding } from "../branding";
export const CustomLogo = () => <img src={branding.logoLight} alt={branding.appName} />;
```

### Componentes do paperclip
**Não edite arquivos originais.** Crie um wrapper em `components/` que importa o original e modifica o que precisar. Se for inevitável editar um original, marque a linha com `// CUSTOM:` para facilitar resolver merges futuros.

## Atualizando com upstream

```bash
cd paperclip
git fetch upstream
git checkout customizations
git merge upstream/main      # ou: git rebase upstream/main
pnpm install
pnpm dev                     # validar
git push origin customizations
```

Conflitos só acontecem se o upstream mexer:
- `ui/src/main.tsx` perto do nosso import (improvável; é uma linha)
- Arquivos que você editou diretamente (evite isso — use wrappers)
