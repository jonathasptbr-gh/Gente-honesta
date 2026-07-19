---
description: Tela de cadastro (#view-onboarding) — layout de barras fixas, seção Detalhes profissionais, padrão de serviço, pagamento, perfil público e o card do Índice de Confiança.
paths:
  - "js/onboarding/**"
  - "css/onboarding/**"
---

# Cadastro (`#view-onboarding`)

## Fundo verde escuro + estratégia de contraste

Fundo `--bg-canvas` (verde escuro, escopado em `#view-onboarding.screen`). A estratégia: quase todos
os campos já têm fundo claro/branco (foto `--bg-input`, inputs/localização `--bg-white`) → se
destacam sozinhos sobre o verde, e o conteúdo DENTRO deles segue com as cores escuras normais. Só
mudam os elementos DIRETAMENTE sobre o verde: cabeçalho (título → `--t-light`, subtítulo →
`--p-green-light`, `#btn-onboarding-cancel` → padrão de FECHAR: fill `--on-green-soft` + texto claro)
e o botão final `#btn-finish-onboarding` (`btn--accent` amarelo, não `btn--primary`).
**Ao adicionar um elemento novo:** direto no verde (fora de card claro) → dê cor clara; dentro de um
card claro → cores normais valem. Exceção: o card do IC (`.ic-card`) é verde escuro em degradê (ver
abaixo).

## Layout: barras fixas + scroll interno

`#view-onboarding.screen` NÃO rola (`overflow:hidden; padding:0`) — sanduíche de 3 camadas:
- **TOPO fixo** `.onboarding-topbar` (header só com o título, fundo `--p-green`, carrega a safe-area
  superior).
- **MEIO** `.onboarding-scroll` (`js-scroll-shadows`, `flex:1; min-height:0; overflow-y:auto`) —
  contém SÓ o `<form>` e tem APENAS padding lateral; o respiro vertical é padding do próprio form
  (padding vertical no container de scroll deslocaria as shades sticky).
- **BASE fixa** `.onboarding-footer` (verde `--p-green`) com `#btn-finish-onboarding` sempre visível
  (usa `form="form-onboarding"` p/ manter o submit).

`.screen__header-nav` (título + Cancelar) é `display:flex`; o título usa `flex:1; text-align:left`
(empurra o botão p/ a direita), `--fs-11` (não `--fs-12`, senão "Complete seu Perfil" quebraria em 2
linhas). `#btn-onboarding-cancel` ("Cancelar", pílula-retângulo de fechar) — **no CADASTRO** encerra a
sessão (`customConfirm` → `auth.signOut()` → `resetAuthFlow`), não navega para um passo anterior. **Em
MODO EDIÇÃO** (ver "Modo edição") NÃO desloga: volta para a gaveta de perfil descartando as mudanças.

## Seção "Detalhes profissionais" — colapsável animado + obrigatoriedade condicional

O painel `#panel-prodetails` abre/fecha com animação de altura (`setProDetailsOpen(open, animate)`,
function hoistada): mede `scrollHeight` e anima `height` 0↔conteúdo (abre 1s easeOut, fecha 0.5s
easeIn — curvas espelhadas; SÓ altura, sem fade). Durações em `PRODETAILS_OPEN_MS`/`PRODETAILS_CLOSE_MS`
(fonte única — o atraso do scroll em `highlightMissingProFields` deriva de `PRODETAILS_OPEN_MS`).
`aria-expanded` é sincronizado no botão. `u-hidden` mantém o estado fechado final. O cap reto do
gatilho vem de `collapsible--connected` (distinta de `collapsible--open`, que só gira o chevron):
vive do início da abertura ao FIM do fechamento, sem transição de raio/borda (evita o "rasgo" verde
nos cantos durante a animação).

**Obrigatoriedade condicional:** a seção é OPCIONAL, mas se o usuário preencher QUALQUER item que se
digita — área/profissão (tags) OU habilidades (bio) — os DOIS passam a ser exigidos
(`allProFilled = tags && bio`). **Padrão de Serviço e Pagamento são ISENTOS** (têm defaults, não
disparam a seção). Se ficou pela metade, `finishRegistration` mostra `customConfirm` ("Dados
profissionais incompletos") → concluir só o básico (segue) OU completar (`setProDetailsOpen(true)` +
`highlightMissingProFields` marca `input-text--error` em área/bio e rola até o primeiro). Os destaques
limpam ao preencher e no reset.

Subseções sem cards/fundos individuais ("O que você faz?", "Suas Habilidades", "Padrão de Serviços"
= `.form-group` simples; a última usa `.form-group__header`). O rótulo `(opcional)`
(`.form-group__optional`) aparece só uma vez, no gatilho `#btn-toggle-prodetails`.

## Padrão de Serviços — seleção por card + display de barras

`#container-service-choice` = GRADE 2×2 (`.service-choice`) de 4 cards compactos
(`data-service` = `padrao`/`premium`/`rapido`/`economico`), cada um com `data-q`/`data-a`/`data-v`
(0-10). As barras ficam num único `.service-choice-display` abaixo (mesmo componente `.qav` dos cards
do feed; largura = valor×10%), com `#svc-fill-quality/agility/value` atualizados em
`updateServiceDisplay` (a largura ANIMA via `transition: width` escopada). Combinações: Padrão 5/5/5,
Premium 8/5/7, Rápido 5/8/6, Custo-benefício 4/4/3 — **máximo de qualquer barra = 8 (80%)**. Seleção
ÚNICA estilo RÁDIO (`applyServiceCard`/`setServiceCardActive`): **sempre há um card ativo** ("Padrão"
já vem selecionado + default `serviceProfile {5,5,5}` em `core/app.js`); tocar no ativo não faz nada.
`resetOnboardingForm` volta ao "Padrão".

## Métodos de pagamento

"Métodos de pagamento aceitos" reproduz as opções do rodapé do card de profissional
(`proFooterHTML()` em `feed/index.js`), como pílulas `.chip.chip--payment` (mesmo casco `.chip`; o seletor de
2 classes `.chip.chip--payment` vence o `.chip` base de `feed/historico.css`). O contexto "aceito" fica só no
título → as pílulas trazem só o nome ("Dinheiro", "Pix"). **Cartão é grupo à parte**
(`#container-payment-card`, subtítulo "Cartão") de **seleção única** — `pro.pay.card` é sempre um valor
único (`0`/`'debit'`/número de parcelas), nunca combinação: tocar em Débito/Crédito à vista/até 6x/até
12x desativa as outras; tocar na ativa desmarca (volta a `card: 0`). **"Emito nota fiscal"**
(`#container-payment-nf`) fica num `.form-group` separado (NF não é método de pagamento). Cada pílula
sinaliza a seleção com `.chip__check` à direita (`radio_button_unchecked`↔`check_circle`,
`setPaymentChipActive()`). Estado ativo usa o "tint preenchido" azul (fundo `--info-blue-light` + texto
`--info-blue`, sem borda), igual às `.tag-pill`. Estado em `window.appState.paymentMethods`
(`{cash, pix, card, nf}`; `cash` nasce `true`), resetado em `resetOnboardingForm`.

## Modo edição (reaproveita o formulário)

O botão "Editar" da gaveta de perfil (`#profile-sheet`, em `feed/index.js`) reabre ESTE formulário em
**modo edição** via `window.enterProfileEdit()` (`onboarding/onboarding.js`): liga o modo
(`setOnboardingEditMode(true)` → título "Editar Perfil" + botão "Salvar alterações" +
`appState.editingProfile=true`), reflete o estado nos campos (`populateOnboardingFromState` — nome/
sobrenome do `displayName`, foto, tags, localização, padrão de serviço, pagamento, perfil público),
tira um **snapshot** e abre `#view-onboarding` com **animação** (modal que sobe + fade: classes
`.view-edit-in`/`.view-edit-out`, keyframes em `onboarding/form.css`). Como perfil e cadastro
compartilham o MESMO `appState`, "levar os dados" é sobretudo refletir o estado nos widgets. Tanto
**Cancelar** quanto **Salvar** VOLTAM PARA A GAVETA DE PERFIL (`window.openProfileSheet`, exposto pelo
feed), não para o feed nu: **Cancelar** (`exitOnboardingEdit(true)`) DESFAZ as mudanças (restaura o
snapshot) e NÃO faz logout; **Salvar** (`finishRegistration` → `exitOnboardingEdit(false)`) faz
`updateProfile` e mantém as mudanças (sem a tela-guia de instalação). O `exitOnboardingEdit` toca a
animação de saída e SÓ ENTÃO troca de tela (`finish` idempotente com fallback). Limitação do período
de testes: foto/tags/bio/localização não persistem (sem Firestore), então após um reload só o
`displayName` sobrevive — editar depois de recarregar pede repreencher o restante.

## Check "perfil público"

Ao final do painel, `#chk-profile-public` (`.profile-public-check`, botão-card `card card--shadow` com
`.check-box` que marca em AZUL): "Tornar meu perfil público para buscas e indicações na minha região".
**Vem DESMARCADO por padrão** (o usuário básico não tem cadastro profissional). Estado em
`window.appState.profilePublic` (default `false`), togglado por `aria-pressed`. **Amarrado aos dados
profissionais completos** em `finishRegistration`: marcado sem área+habilidades → `customConfirm`
("Perfil público incompleto") oferece completar agora (abre a seção + `highlightMissingProFields`) ou
concluir SEM perfil público (o check é desmarcado automaticamente). Essa checagem roda ANTES do aviso
de "dados profissionais incompletos" (regra mais específica primeiro).

---

# Card do Índice de Confiança (`.ic-card`) — o "selo de reputação"

Card VERDE ESCURO em degradê (`linear-gradient(145deg, --p-green, --p-green-dark)`) com `--shadow-lg`,
sobre o `--bg-canvas` do cadastro — é o card ESCURO da tela. SEM borda. Elementos CLAROS: ícone do
cabeçalho `--a-gold`, título `--t-light`, nota/rodapé `--p-green-light`, destaque `--a-gold`. No
medidor, a zona morta (<25%) é PRETA (`#000`); dourado usa `--a-gold` cheio.

**Regras de texto (invioláveis):**
- Nunca abreviar "IC" em texto visível: sempre "Índice de Confiança" (vale para `helpTexts['btn-ic-info']`
  em `onboarding/onboarding.js`, que diz "70%", nunca "100 pontos").
- Nos textos visíveis do card NUNCA usar travessão "—": usar vírgula, ponto e vírgula ou dois-pontos.

**Estrutura (topo → base; seções irmãs num flex column com `justify-content: space-between`):**
1. **Cabeçalho `.ic-card__head`** — padrão dos títulos do cadastro: ícone `verified_user` verde 1.5rem
   + "Sua reputação na plataforma" (`--fs-7`, 800, `--p-green-dark`).
2. **Hero `.ic-card__intro`** — NÃO é card/moldura; itens soltos sobre o card verde. Contém `.ic-hero`:
   - **Subtítulo `.ic-hero__title`** "Índice de Confiança" — `.eyebrow` mas DOURADO (`--a-gold`) +
     frase `.ic-hero__text` em branco, bloco à esquerda (`flex: 0 1 62%`).
   - **Número 70** em degradê dourado (`background-clip: text`), SEM "%", dentro de uma moldura em
     escudo `.ic-hero__badge` (SVG inline `.ic-hero__badge-shield`, só o contorno `stroke:--a-gold`).
     O 70 é absoluto, `translate(-50%, -55%)`. A moldura centraliza na zona à direita do texto
     (`flex: 1; text-align: center`).
3. **Medidor `.ic-meter`:** zonas `.ic-meter__zones` ACIMA da barra (os mesmos escudos do app
   `gpp_bad`/`gpp_maybe`/`shield_question`/`gpp_good`, faixa <25% PRETA; zona atual `.ic-zone--current`
   acende, demais `opacity:0.78`) + barra segmentada nas 4 faixas + pino "CONFIANÇA ATUAL" pulsante
   (`icPinPulse`) ABAIXO da barra em `left:70%`.
4. **`.ic-factors`** — SÓ a nota `.ic-factors__note` (itálica, centralizada): "Todas as suas ações,
   boas ou ruins, afetam esse índice". (Não recriar a antiga tabela "Faz descer/subir".)
5. **Rodapé `.ic-card__footer`** — lema, com o destaque `--p-green-dark` em linha própria.

**Layout de altura:** `.form-group--ic-fill` = `flex: 1 0 auto`. **Adaptativo** (`@media (max-height)`):
≤823px esconde o rodapé; ≤780px esconde a nota e aperta o padding; ≤755px compacta (some a frase do
hero, encolhem cabeçalho/moldura/escudos). **O hero (70) e o medidor com os 4 escudos ficam SEMPRE.**
