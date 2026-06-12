#!/bin/bash
set -euo pipefail

# Identidade do git — evita commits "Unverified" e o ciclo de amend/non-fast-forward
# (ver CLAUDE.md, seção Deploy). Roda em qualquer ambiente.
git config user.email noreply@anthropic.com
git config user.name Claude
git config commit.gpgsign false

# Preview visual (tools/preview.js): navegador headless para o fluxo padrão de
# decisões estéticas por screenshot. Só faz sentido no ambiente web remoto.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR/tools"
npm install --no-audit --no-fund
npx playwright install chromium
