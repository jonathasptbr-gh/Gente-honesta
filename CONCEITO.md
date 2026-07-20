# Gente Honesta — Conceito, Visão e Roadmap

> **Registro vivo de PRODUTO.** Este arquivo é o "porquê" e o "para onde" do Gente Honesta —
> complementar ao `CLAUDE.md` (que é o "como" técnico) e ao `CONVENTIONS.md` (o "com quais nomes/formas").
> Aqui não se descreve código; descreve-se a INTENÇÃO. É para ser editado, discutido e expandido a cada
> decisão de rumo.
>
> **Como usar:**
> - Blocos marcados **`[DECISÃO]`** são bifurcações que dependem de uma escolha do dono do produto —
>   estão consolidados na seção 9. Enquanto não decididos, o roadmap assume o padrão sugerido em cada um.
> - Ao fechar uma decisão, mova-a para o corpo do texto como afirmação e registre a data na seção 10.
> - Este documento NÃO exige bump de versão (é doc, não app).

---

## 1. A tese — o conceito em uma frase

**Encontrar um prestador de serviço por INDICAÇÃO de quem já confia nele, com a CONFIANÇA medida,
visível e difícil de falsificar (o Índice de Confiança).**

Os três slides de boas-vindas já são o pitch inteiro, nesta ordem:

1. **Gente Honesta** — a marca/promessa: aqui a régua é a honestidade.
2. **Indicações** — o método de descoberta: você chega ao profissional por recomendação, não por busca fria.
3. **Confiança** — a moeda: cada pessoa carrega um Índice de Confiança (IC) que resume seu histórico.

### O problema que resolve
Hoje, achar um bom autônomo de bairro é um processo informal e frágil: grupos de WhatsApp, "você conhece
alguém que…?", indicação que se perde, e do outro lado marketplaces genéricos onde não há confiança real
(perfil sem história, avaliação comprável, medo de golpe). O bom profissional depende do boca a boca e não
tem como PROVAR sua reputação para um cliente novo; o cliente não tem como distinguir quem é bom de quem
tem só um anúncio bonito.

### A proposta de valor (o diferencial)
- **Descoberta social, não catálogo:** o eixo é a indicação — de outro usuário, de um vizinho, da rede.
- **Confiança auditável:** o IC é um número com história por trás, que sobe com trabalho bem-feito e cai
  com falha — não um selo que se compra.
- **Honestidade como marca:** o nome é a régua. Toda decisão de produto se pergunta "isso torna a rede
  mais honesta ou menos?".

### Para quem (os dois lados)
- **Cliente** — pessoa comum que precisa de um serviço (reparo, limpeza, reforma, costura, jardim…) e quer
  contratar alguém confiável sem apostar no escuro.
- **Profissional autônomo** — vive de reputação e quer um lugar onde sua história de bom trabalho VALE
  algo (o IC), fica visível e gera novos clientes por indicação.
- *(Variações do mesmo eixo:)* **empregador** que publica uma **Vaga** formal; **contratante de Diária**
  que precisa de mão-de-obra pontual; **ajudante** que se disponibiliza para diárias.

---

## 2. Os dois lados e seus objetivos (jobs-to-be-done)

| Lado | O que ele quer resolver | Como o app entrega hoje (ou pretende) |
|---|---|---|
| **Cliente** | "Preciso de alguém de confiança para X, rápido." | Busca de Profissionais + Pedido público de indicação + IC visível para decidir. |
| **Cliente** | "Não conheço ninguém — quem a rede me indica?" | Publica um **Pedido**; a rede indica profissionais; ele compara pelo IC. |
| **Profissional** | "Quero que meu bom trabalho me traga clientes novos." | Perfil público + IC + aparecer em buscas/indicações/pedidos da região. |
| **Profissional** | "Quero provar que sou confiável sem 'me gabar'." | O IC e as avaliações fazem a prova por ele. |
| **Empregador** | "Preciso contratar formalmente (CLT/fixo)." | **Vagas** (modo emprego). |
| **Contratante/Ajudante** | "Preciso/ofereço mão-de-obra por diária." | **Diárias** (modo pontual). |

**Observação de produto:** o cliente e o profissional são a MESMA pessoa em momentos diferentes (quem
contrata hoje pode ser indicado amanhã). O app não separa "conta de cliente" de "conta de profissional" —
todo mundo tem um perfil, e "virar profissional" é preencher os dados profissionais + marcar perfil público.
Isso é uma força (rede única, todo mundo tem IC) e precisa ser tratado com intenção no roadmap.

---

## 3. O ciclo de valor (o flywheel) — como as peças se encaixam

Hoje as superfícies (Profissionais, Pedidos, Vagas, Diárias, Contratos) existem como abas separadas. O
conceito ganha força quando elas são lidas como **estágios de um único ciclo de confiança**:

```
        ┌───────────────────────────────────────────────────────┐
        │                                                       ▼
   [1] DESCOBERTA  ──►  [2] ACORDO  ──►  [3] ENTREGA  ──►  [4] AVALIAÇÃO
   (achar quem)        (minicontrato)   (o serviço)        (feedback)
        ▲                                                       │
        │                                                       ▼
        └──────────────  [5] IC atualizado  ◄────────────────────
              (reputação; IC melhor = mais descoberta na volta)
```

Cada superfície atual é um **modo** dentro desse ciclo:

| Estágio | Superfície(s) | Papel no ciclo |
|---|---|---|
| **1. Descoberta direta** | aba **Profissionais** | Busca/filtro — para quem já sabe o que procura. |
| **1. Descoberta social** | aba **Pedidos** + **modo Indicação** | Referral — a rede indica quem você não acharia sozinho. É o coração do "Indicações". |
| **2. Acordo** | **Contratos / minicontrato** | O registro do combinado (escopo, valor). É o que dá lastro à avaliação e ao IC. |
| **3. Entrega** | *(fora do app)* | O serviço acontece no mundo real. |
| **4. Avaliação** | **comentários/avaliações** do card | O feedback que alimenta a reputação. |
| **5. Reputação** | **IC (Índice de Confiança)** | A moeda que resume tudo e realimenta a descoberta. |
| *Adjacentes* | **Vagas** (emprego formal) e **Diárias** (mão-de-obra pontual) | Modos vizinhos ao ciclo principal (projeto por indicação), com sua própria lógica. |

**A grande verdade estratégica:** hoje o app tem os estágios 1 e (parcialmente) 4/5 na tela, mas o ciclo
**não fecha** — não há um vínculo real entre contratar (2), entregar (3), avaliar (4) e mover o IC (5).
Fechar esse loop é o que transforma um "catálogo bonito" em uma "rede de confiança viva". Ver seções 4 e 8.

**`[DECISÃO D1]` — Vagas e Diárias: núcleo ou satélite?** Elas ampliam o público, mas têm um ciclo
próprio (candidatura, contratação formal) que divide o foco. Sugestão: tratá-las como **satélites** —
mantê-las funcionando, mas priorizar o fechamento do ciclo principal (descoberta→contrato→avaliação→IC)
antes de investir backend nelas. Ver seção 9.

---

## 4. O IC (Índice de Confiança) — o coração ainda por definir

O IC é o elemento mais importante e, hoje, o **mais incompleto conceitualmente**: existe como número
exibido (0–100, com faixas), mas **não há um modelo de como ele se move**. Como o nome do app é a promessa
de honestidade, a credibilidade do IC é o produto. Este é o principal "problema criativo" a resolver.

### O que já está definido (no código/design)
- Escala **0–100**.
- **Faixas** (tiers) com limiares **75 / 50 / 25** → `ok` (≥75) / `warn` (≥50) / `alert` (≥25) / `bad` (<25),
  cada uma com escudo e cor (ver `js/core/domain.js` e `.claude/rules/design-system.md`).
- Regra de comunicação: nunca abreviar em texto visível ("Índice de Confiança", nunca "IC"); a nota do
  card já diz **"Todas as suas ações, boas ou ruins, afetam esse índice"** — ou seja, a promessa ao usuário
  JÁ foi feita; falta o motor que a cumpra.

### O que precisa ser decidido (o modelo)
**`[DECISÃO D2]` — Quais fatores movem o IC, e com que peso?** Proposta de um modelo v1 simples, honesto
e difícil de fraudar (a refinar):

| Fator | Direção | Racional |
|---|---|---|
| Avaliação recebida após um serviço | ↑ / ↓ | O sinal central. Só conta se atrelada a um **minicontrato concluído** (evita review falso). |
| Contrato concluído sem incidente | ↑ | Volume de trabalho entregue constrói reputação. |
| No-show / cancelamento tardio / abandono | ↓ | Puno o que quebra a confiança operacional. |
| Denúncia procedente | ↓↓ | Freio forte contra golpe/má conduta. |
| Verificação de identidade / documento | ↑ (uma vez) | Piso de confiança para quem se identifica. |
| Tempo de casa + constância | ↑ (lento) | Recompensa histórico longo, resiste a manipulação rápida. |

**`[DECISÃO D3]` — Cold start:** com que IC um profissional novo (sem histórico) entra? Opções: (a) um
valor neutro-baixo que ele precisa CONSTRUIR; (b) zero até o primeiro serviço; (c) um piso condicionado à
verificação de identidade. Sugestão: **piso baixo + salto na verificação**, para que "ser verificado" já
valha algo e o resto se ganhe trabalhando.

**`[DECISÃO D4]` — Transparência vs. anti-gaming:** quanto do cálculo é mostrado? Mostrar demais convida
a fraude; mostrar de menos parece arbitrário ("por que meu IC caiu?"). Sugestão: comunicar os **princípios**
("o que ajuda/atrapalha") e o **histórico de eventos** do próprio usuário, sem expor a fórmula exata nem
os pesos.

**Princípios inegociáveis do IC (independentemente dos pesos):**
1. **Não se compra IC.** Nenhum plano pago ou destaque pode alterar o número.
2. **Avaliação só com lastro.** Idealmente atrelada a um contrato/serviço registrado — não a um clique solto.
3. **Simétrico com a honestidade:** sobe devagar (confiança se constrói), pode cair mais rápido (confiança
   se quebra) — mas com defesa contra denúncia injusta (contraditório/moderação).
4. **Explicável ao dono:** a pessoa consegue entender, no seu histórico, por que está onde está.

---

## 5. Estado atual — inventário honesto (o que TEMOS)

Legenda: **UI** = a tela existe · **Persiste** = sobrevive a recarregar/troca de aparelho · **Lógica real**
= a regra de negócio funciona de verdade (não é placeholder).

| Superfície / Capacidade | UI | Persiste | Lógica real | Observação |
|---|:--:|:--:|:--:|---|
| Login (telefone + OTP + whitelist) | ✅ | ✅ | ✅ | Único fluxo **real**. Firebase Auth + coleção `testers`. |
| Onboarding / perfil (nome, foto, tags, serviço, pagamento) | ✅ | ⚠️ | ⚠️ | Só o `displayName` sobrevive; foto/tags/bio/localização **não** (sem Firestore/Storage). |
| Perfil público (virar profissional) | ✅ | ❌ | ⚠️ | Flag em memória; sem backend de perfis. |
| Card do IC (cadastro) | ✅ | — | ❌ | Número **fixo/ilustrativo**; sem motor. |
| Aba Profissionais (busca, filtro, sort, pin) | ✅ | ⚠️ | ⚠️ | 5 pros **mock**; pins e filtros só na sessão. |
| Cards de profissional (flip, avaliações) | ✅ | ❌ | ⚠️ | 15 comentários mock, iguais para todos. |
| Pedidos (publicar pedido de indicação) | ✅ | ❌ | ⚠️ | Em memória; 3 indicações **semeadas** ao publicar. |
| Modo Indicação (indicar alguém num pedido) | ✅ | ❌ | ⚠️ | Fluxo/animação completos; sem persistência. |
| Compartilhar pedido fora do app | ✅ | — | ✅ | Web Share / clipboard funcionam. |
| Vagas (criar, listar, detalhe do dono) | ✅ | ⚠️ | ⚠️ | Mock + `localStorage` parcial; candidatura é placeholder. |
| Candidatura a vaga | ✅ | ❌ | ❌ | `comingSoon`. |
| Diárias (disponibilizar-me / chamar ajudante) | ✅ | ⚠️ | ⚠️ | Estado em `localStorage`; sorteio mock; sem backend. |
| Contratos / minicontrato | ✅ | ❌ | ❌ | Só UI da gaveta; "Criar minicontrato" é placeholder. |
| Contratar / WhatsApp | ✅ | — | ❌ | `comingSoon`. |
| Denunciar (long-press no pedido) | ✅ | ❌ | ❌ | Sem moderação real. |
| Notificações push | ❌ | ❌ | ❌ | Previsto (FCM), não iniciado. |
| Descoberta por região/GPS | ⚠️ | ❌ | ❌ | "Cidades vizinhas" e localização existem na UI; sem geoquery real. |

**Resumo:** a **camada de experiência está madura** (design system consistente, animações, roteamento,
acessibilidade, PWA, service worker) — o app PARECE pronto. A **camada de verdade está vazia**: fora o
login, nada persiste nem tem regra de negócio. O trabalho daqui para frente é quase todo "encher de verdade"
uma casca já muito bem construída.

---

## 6. O que FALTA (as lacunas) — de produto e de plataforma

**Lacunas de plataforma (técnicas):**
- **Persistência (Firestore/Storage)** por entidade: perfis/profissionais, pedidos, indicações, vagas,
  candidaturas, diárias, contratos, avaliações. *(A arquitetura já favorece isso: tudo passa pelo
  `js/feed/repository.js` — o ponto único onde os accessors mock viram queries.)*
- **Fotos de perfil** (Firebase Storage — hoje só `data URL` em memória).
- **Motor do IC** (serviço que recebe eventos e recalcula o índice).
- **Notificações (FCM)**: novo pedido na região, indicação recebida, avaliação recebida, resposta de vaga.
- **Descoberta geográfica**: modelo de "região" (bairro/cidade) + consulta por proximidade.

**Lacunas de produto (o que dá SENTIDO ao conceito):**
- **Fechar o ciclo:** um caminho real de **contratar → registrar minicontrato → concluir → avaliar → mover IC**.
  Sem isso, IC e avaliações são decorativos.
- **Onboarding do profissional** com **verificação de identidade** (piso de confiança / anti-golpe).
- **Moderação e denúncia** de verdade (fila, critério, efeito no IC, contraditório).
- **Anti-fraude do IC** (auto-indicação, conluio, review falso).
- **Incentivo a indicar:** por que um usuário gastaria 10 segundos para indicar alguém? (reputação social,
  reciprocidade, gamificação leve — a definir).
- **Regra de "virar profissional"**: hoje é um checkbox; falta o rito que o torne crível.

---

## 7. O que QUEREMOS — o norte (visão de 12–18 meses)

- **Ser o padrão de confiança do serviço de bairro:** quando alguém pergunta "é gente honesta?", a resposta
  é o app. O IC vira uma referência que a pessoa cita fora do app.
- **Rede densa por região:** o valor é local e tem efeito de rede — poucos bairros MUITO cobertos valem
  mais que um país inteiro raso. A estratégia de crescimento é **bairro a bairro**, não "lançar nacional".
- **O ciclo girando sozinho:** indicações gerando contratos, contratos gerando avaliações, avaliações
  movendo o IC, IC melhor trazendo mais trabalho — sem intervenção manual.
- **Honestidade defensável:** anti-golpe e moderação bons o bastante para que a marca "Gente Honesta" não
  seja irônica.

**`[DECISÃO D5]` — Monetização.** Ainda não há modelo. Opções a considerar (não excludentes): assinatura
opcional do profissional (recursos, NÃO IC), taxa/destaque em Vagas, comissão sobre serviço fechado
(difícil de capturar em serviço informal), patrocínio local. **Restrição inegociável:** nada que possa
comprar IC ou distorcer a confiança. Decidir isso cedo evita construir o produto de um jeito que depois
não fecha conta — mas pode ficar para depois da validação do ciclo. Ver seção 9.

---

## 8. Roadmap por fases

Cada fase tem **objetivo** (a pergunta que ela responde), **entregáveis**, **critério de pronto** e
**dependências**. As fases são sequenciais em VALOR, mas partes podem paralelizar.

> Princípio geral: **primeiro tornar VERDADE o ciclo principal** (descoberta social → contrato → avaliação →
> IC), porque é o que dá sentido à marca; superfícies adjacentes (Vagas/Diárias) e monetização vêm depois.

### Fase 0 — Casca completa em testes fechados *(≈ atual)*
- **Objetivo:** validar a EXPERIÊNCIA com um grupo whitelistado antes de investir em backend.
- **Estado:** praticamente concluída — UI, design system, PWA, animações e fluxos mock prontos; auth real.
- **Pronto quando:** o grupo de testes consegue "usar" o app de ponta a ponta (mesmo mock) e o feedback de
  usabilidade estabilizou.

### Fase 1 — Tornar real o núcleo de descoberta
- **Objetivo:** *"O que eu vejo é real e sobrevive?"* — sair do mock no coração do produto.
- **Entregáveis:**
  - Perfis/profissionais no **Firestore** (+ fotos no **Storage**); onboarding persiste de verdade.
  - **Pedidos** e **indicações** persistidos (o `repository.js` troca mock por query, sem mexer nos chamadores).
  - Aba Profissionais lendo dados reais dos testers.
- **Critério de pronto:** um tester publica um pedido, outro indica um profissional, e ambos veem isso
  persistir após recarregar/trocar de aparelho.
- **Dependências:** modelagem das coleções Firestore + regras de segurança.

### Fase 2 — Fechar o ciclo de confiança *(a fase que dá sentido à marca)*
- **Objetivo:** *"Contratar, avaliar e a reputação MEXER de verdade."*
- **Entregáveis:**
  - **Minicontrato real:** criar/registrar o combinado (escopo, valor, partes) — o lastro da avaliação.
  - **Avaliação real** atrelada a um contrato concluído.
  - **Motor do IC v1** (`[DECISÃO D2/D3/D4]`): eventos → recálculo → faixa; histórico explicável ao dono.
- **Critério de pronto:** concluir um minicontrato → avaliar → o IF/IC do profissional muda de forma
  visível e explicável.
- **Dependências:** Fase 1; decisões D2–D4 fechadas.

### Fase 3 — Ativação e retenção
- **Objetivo:** *"Trazer a pessoa de volta na hora certa."*
- **Entregáveis:**
  - **FCM push:** novo pedido na sua região, você foi indicado, recebeu avaliação, resposta de vaga.
  - **Descoberta geográfica** real (região/bairro; "cidades vizinhas" passa a filtrar de verdade).
- **Critério de pronto:** um pedido novo na região dispara notificação para profissionais elegíveis.
- **Dependências:** Fase 1 (dados) + modelo de região.

### Fase 4 — Superfícies adjacentes com backend *(`[DECISÃO D1]`)*
- **Objetivo:** *"Vagas e Diárias deixam de ser demonstração."*
- **Entregáveis:** persistência + candidatura real em Vagas; agendamento/confirmação real em Diárias;
  ligação (ou não) do comportamento nelas ao IC.
- **Critério de pronto:** candidatar-se a uma vaga e chamar uma diária geram registros reais e notificações.
- **Dependências:** Fases 1–3; decisão sobre o peso dessas superfícies.

### Fase 5 — Abertura ao público
- **Objetivo:** *"Tirar a whitelist sem quebrar a confiança."*
- **Entregáveis:** remover o bloco de whitelist (`js/auth/auth.js`), **verificação de identidade**,
  **moderação/denúncia** operante, **anti-fraude do IC**, e (se decidido) **monetização** (`[DECISÃO D5]`).
- **Critério de pronto:** um usuário desconhecido entra, se verifica, e o sistema de confiança/moderação
  aguenta má-fé sem intervenção manual constante.
- **Dependências:** ciclo de confiança maduro (Fases 2–3).

---

## 9. Decisões em aberto (consolidado)

| ID | Decisão | Padrão assumido enquanto não decidido | Quando precisa ser decidida |
|---|---|---|---|
| **D1** | Vagas/Diárias são núcleo ou satélite? | **Satélite** — funcionam, mas o ciclo principal tem prioridade. | Antes da Fase 4. |
| **D2** | Quais fatores movem o IC e com que peso? | Modelo v1 da seção 4 (avaliação com lastro + contratos + penalidades). | Início da Fase 2. |
| **D3** | Com que IC entra um profissional novo (cold start)? | Piso baixo + salto na verificação de identidade. | Início da Fase 2. |
| **D4** | Quanto do cálculo do IC é transparente ao usuário? | Princípios + histórico pessoal; fórmula/pesos não expostos. | Início da Fase 2. |
| **D5** | Modelo de monetização? | Indefinido; restrição: nada compra IC. | Antes da Fase 5 (idealmente esboçado antes). |
| **D6** | Conta única (cliente=profissional) ou perfis separados? | **Conta única**, "virar profissional" = completar dados + verificar. | Antes da Fase 1 (afeta modelagem). |
| **D7** | Qual o incentivo para o usuário INDICAR alguém? | Indefinido (reputação social / reciprocidade / gamificação leve). | Antes/durante a Fase 2. |

---

## 10. Changelog do conceito

- **(criação)** — primeira versão do registro de conceito: tese, dois lados, flywheel, análise do IC,
  inventário do estado atual, lacunas, visão e roadmap em 6 fases. Sete decisões em aberto (D1–D7).
