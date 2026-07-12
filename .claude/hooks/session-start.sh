#!/bin/bash
set -euo pipefail

# Identidade do git — evita commits "Unverified" e o ciclo de amend/non-fast-forward
# (ver CLAUDE.md, seção Deploy). Roda em qualquer ambiente.
git config user.email noreply@anthropic.com
git config user.name Claude
git config commit.gpgsign false
