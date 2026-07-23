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
   (achar quem)        (o Acordo)       (o serviço)        (feedback)
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
| **2. Acordo** | **Acordo** (ex-"minicontrato") | O registro OPCIONAL do combinado (escopo, valor, prazo). É o que dá lastro à avaliação (vira comentário) e à zona de qualidade do IC. |
| **3. Entrega** | *(fora do app)* | O serviço acontece no mundo real. |
| **4. Avaliação** | **comentários/avaliações** do card | O feedback que alimenta a reputação. |
| **5. Reputação** | **IC (Índice de Confiança)** | A moeda que resume tudo e realimenta a descoberta. |
| *Adjacentes* | **Vagas** (emprego formal) e **Diárias** (mão-de-obra pontual) | Modos vizinhos ao ciclo principal (projeto por indicação), com sua própria lógica. |

**A grande verdade estratégica:** hoje o app tem os estágios 1 e (parcialmente) 4/5 na tela, mas o ciclo
**não fecha** — não há um vínculo real entre contratar (2), entregar (3), avaliar (4) e mover o IC (5).
Fechar esse loop é o que transforma um "catálogo bonito" em uma "rede de confiança viva". Ver seções 4 e 8.

**`[DECISÃO D1]` — Vagas e Diárias: núcleo (DECIDIDA).** São **tão centrais quanto o ciclo principal** —
não satélites. São três portas de igual importância para a mesma rede de confiança: **serviço por projeto**
(o ciclo principal), **emprego formal** (Vagas) e **mão-de-obra pontual** (Diárias). O IC atravessa as três
(é a mesma pessoa e a mesma reputação em qualquer modo). Consequência para o roadmap: o backend de Vagas e
Diárias **não é adiado para o fim** — entra em paralelo ao núcleo (ver Fase 4, que passa a interfoliar com
as Fases 1–3), e o comportamento nelas (comparecer a uma diária, honrar uma vaga) também deve alimentar o IC.

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
| Avaliação recebida após um serviço | ↑ / ↓ | O sinal central. Peso alto se atrelada a um **Acordo concluído** (vira comentário); peso baixo se avaliação de perfil aberta. Ver §10.2. |
| Contrato concluído sem incidente | ↑ | Volume de trabalho entregue constrói reputação. |
| No-show / cancelamento tardio / abandono | ↓ | Puno o que quebra a confiança operacional. |
| Denúncia procedente | ↓↓ | Freio forte contra golpe/má conduta. |
| Verificação de identidade / documento | ↑ (uma vez) | Piso de confiança para quem se identifica. |
| Tempo de casa + constância | ↑ (lento) | Recompensa histórico longo, resiste a manipulação rápida. |

> **Estrutura por zonas (ver §10.1):** esses fatores **não somam livremente** — cada eixo vive numa **zona
> com teto próprio**. Você preenche uma zona até o limite dela e ali **estagna**; para subir mais, precisa
> preencher AS OUTRAS (ser muito bem avaliado não compensa não ter indicado ninguém nem fechado acordos).
> Isso força participação em toda a rede, não só em um eixo. Cada zona tem também um **piso**: avaliação ruim
> sozinha leva a "warn/alert", não a "bad" — o **fundo (perto de 0) é reservado a ações de má-fé**
> (denúncias/golpes/fraudes), não a quem é apenas mal avaliado. O detalhamento está no deep-dive da Indicação.

**`[DECISÃO D3]` — Curva de sensibilidade (DECIDIDA):** o IC **não se move de forma linear** — quanto ele
reage a cada evento depende de quanto histórico a pessoa já tem. A regra de rumo é:

- **No início (pouco histórico): alta sensibilidade nas DUAS direções.** Com poucos dados, cada avaliação
  pesa muito — sobe rápido e cai rápido. A reputação se forma depressa a partir dos primeiros serviços.
- **No meio (histórico acumulado): inércia / amortecimento.** Já com track record, um evento isolado mexe
  pouco; é preciso um PADRÃO consistente (vários sinais na mesma direção) para deslocar o índice. Aqui a
  reputação fica estável e "cara" de mover — que é o prêmio por ter história.
- **No topo (IC alto): lento para subir, mas ainda sensível e estável.** Chegar perto de 100 é difícil e
  devagar (retornos decrescentes); porém o topo **não é blindado** — uma falha grave ou um padrão ruim
  ainda registra. Ninguém fica "intocável".

Em uma frase: **a confiança se forma rápido, se consolida devagar e nunca congela.** Tecnicamente isso é
uma reputação **ponderada por confiança/volume** (a "taxa de aprendizado" de cada evento decai conforme o
número de eventos cresce) + **retornos decrescentes perto de 100**. O cold start decorre daí: o profissional
novo entra num **piso baixo** e, como a sensibilidade inicial é alta, constrói (ou perde) reputação rápido
nos primeiros trabalhos; a **verificação de identidade** dá um salto de partida (ver princípios abaixo).

**`[DECISÃO D4]` — Transparência vs. anti-gaming:** quanto do cálculo é mostrado? Mostrar demais convida
a fraude; mostrar de menos parece arbitrário ("por que meu IC caiu?"). Sugestão: comunicar os **princípios**
("o que ajuda/atrapalha") e o **histórico de eventos** do próprio usuário, sem expor a fórmula exata nem
os pesos.

**Princípios inegociáveis do IC (independentemente dos pesos):**
1. **Não se compra IC.** Nenhum plano pago ou destaque pode alterar o número.
2. **Avaliação só com lastro.** Idealmente atrelada a um contrato/serviço registrado — não a um clique solto.
3. **Ponderado por volume (ver D3):** com pouco histórico, cada evento pesa muito (forma rápido); com
   muito histórico, só um padrão consistente move o índice (consolida devagar); no topo, sobe devagar mas
   nunca congela. A confiança se forma rápido, se consolida devagar e nunca é blindada.
4. **Com defesa contra injustiça:** denúncia/avaliação hostil tem contraditório e moderação — o índice pune
   má-fé, não azar nem sabotagem.
5. **Explicável ao dono:** a pessoa consegue entender, no seu histórico, por que está onde está.
6. **Uma reputação, todos os modos:** o mesmo IC vale para serviço por projeto, Vagas e Diárias — comparecer,
   honrar o combinado e ser bem avaliado em qualquer um deles conta.

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
- **Fechar o ciclo:** um caminho real de **conectar → registrar Acordo (opcional) → concluir → avaliar → mover IC**.
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
  - **Acordo real** (ex-"minicontrato"): criar/registrar o combinado OPCIONAL (escopo, valor, prazo, partes)
    — a fonte (B) dos dados ricos e o lastro dos comentários do perfil.
  - **Avaliação real em duas classes:** direta de perfil (peso baixo, sem comentário) e de Acordo concluído
    (peso alto, vira comentário). Ver §10.2.
  - **Motor do IC v1** (`[DECISÃO D2/D3/D4]`): eventos → recálculo → faixa; histórico explicável ao dono.
- **Critério de pronto:** concluir um Acordo → avaliar → o IC do profissional muda de forma
  visível e explicável.
- **Dependências:** Fase 1; decisões D2–D4 fechadas.

### Fase 3 — Ativação e retenção
- **Objetivo:** *"Trazer a pessoa de volta na hora certa."*
- **Entregáveis:**
  - **FCM push:** novo pedido na sua região, você foi indicado, recebeu avaliação, resposta de vaga.
  - **Descoberta geográfica** real (região/bairro; "cidades vizinhas" passa a filtrar de verdade).
- **Critério de pronto:** um pedido novo na região dispara notificação para profissionais elegíveis.
- **Dependências:** Fase 1 (dados) + modelo de região.

### Fase 4 — Vagas e Diárias reais *(interfolia com as Fases 1–3 — são núcleo, D1)*
- **Objetivo:** *"As três portas da rede — projeto, emprego e diária — funcionam de verdade."*
- **Entregáveis:** persistência + candidatura real em Vagas; agendamento/confirmação real em Diárias;
  o comportamento nelas (comparecer, honrar o combinado, ser avaliado) **alimenta o mesmo IC**.
- **Critério de pronto:** candidatar-se a uma vaga e chamar/atender uma diária geram registros reais,
  notificações, e eventos que movem o IF/IC de quem participou.
- **Nota de sequência:** por decisão D1, Vagas/Diárias têm o mesmo peso do ciclo principal, então esta fase
  **não espera** as Fases 1–3 terminarem — a persistência (Fase 1) e o motor do IC (Fase 2) devem já nascer
  cobrindo as três superfícies. Está numerada em separado só por clareza, não por prioridade menor.
- **Dependências:** Fase 1 (persistência) e Fase 2 (motor do IC) desenhadas para abraçar as três portas.

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
| **D1** | ✅ **DECIDIDA** — Vagas/Diárias são núcleo (peso igual ao ciclo principal). | — | Fechada. |
| **D2** | Quais fatores movem o IC e com que peso? (agora enquadrado como **zonas com teto** — ver §10.1) | Zonas: avaliações, indicações, acordos, conduta, verificação; pesos/tetos a definir. | Início da Fase 2. |
| **D3** | ✅ **DECIDIDA** — Curva de sensibilidade: forma rápido, consolida devagar, nunca congela (ponderada por volume). | — | Fechada. |
| **D4** | Quanto do cálculo do IC é transparente ao usuário? | Princípios + histórico pessoal; fórmula/pesos não expostos. | Início da Fase 2. |
| **D5** | Modelo de monetização? | Indefinido; restrição: nada compra IC. | Antes da Fase 5 (idealmente esboçado antes). |
| **D6** | Conta única (cliente=profissional) ou perfis separados? | **Conta única**, "virar profissional" = completar dados + verificar. | Antes da Fase 1 (afeta modelagem). |
| **D7** | 🔶 **ENCAMINHADA** — incentivo a indicar = ganho de IC (indicar rende; aceita rende mais) + zona exclusiva (§10.1). Falta calibrar os ganhos. | Ganhos/valores a calibrar com D2. | Início da Fase 2. |
| **D8** | ✅ **DECIDIDA** — só responsabilidade retroativa; a fiança já É a aposta e auto-regula o crescimento. Stake explícito guardado p/ abuso. | — | Fechada. |
| **D9** | ✅ **DECIDIDA** — vínculo indicador↔indicado (herança + fiança) dura ~1 semana, depois solta. | — | Fechada. |
| **D10** | Acordo com cliente NÃO cadastrado: exige cadastro (vira growth) ou permite registro unilateral de baixa confiança? | Exigir cadastro — coerente com "indicado é conta real" + motor de crescimento. | Início da Fase 2. |
| **D11** | ✅ **DECIDIDA** — toggle na criação: reutilizável = um pendente por cliente; senão queima no 1º aceite. | — | Fechada. |
| **D12** | ✅ **DECIDIDA** — os dois: o pro escolhe data específica OU duração ("em N dias"). | — | Fechada. |
| **D13** | ✅ **DECIDIDA** — os dados são do profissional; o cliente só aceita/recusa; só o pro edita; ajuste off-app; snapshot no aceite. | — | Fechada. |

---

## 10. Detalhamento dos conceitos (deep-dives)

> Aprofundamento de cada mecânica, uma por vez, começando pela base. Cada deep-dive separa as **regras
> decididas** (o que já é rumo firmado) das **propostas/defesas** (o que ainda pede escolha, marcado
> `[DECISÃO]`). Próximos previstos: o motor do IC (as zonas e seus tetos), o Acordo, a avaliação.

### 10.1 Indicação — a mecânica-base

A indicação é, ao mesmo tempo, o **método de descoberta**, o **motor de crescimento orgânico** e a
**primeira fonte de IC**. É onde os pilares "Indicações" e "Confiança" se tocam. Também é o que responde à
pergunta que mais me preocupava: *por que alguém gastaria esforço para indicar?* — porque indicar constrói
reputação, num eixo que nenhuma outra ação preenche (ver zonas, regra 5).

**Regras decididas:**

1. **Indicar rende IC; a indicação ACEITA rende mais.** Fazer uma indicação já contribui para o seu IC. Se
   a sua for a **escolhida** (uma das 3 de um pedido é aceita), o ganho é maior — o sistema premia o palpite
   certo, não só o ato de palpitar.
2. **Crescimento por herança de IC.** Você pode indicar alguém **sem cadastro completo**; ao entrar, essa
   pessoa **herda o IC de quem a indicou** como ponto de partida. É o laço viral do produto — gente de
   confiança trazendo gente de confiança. **Fórmula (decidida):** o IC de partida = **média entre 70 e o IC
   de quem indicou**. O 70 é o **ponto de gravidade**: um indicador excelente (90) gera um novato em 80 (não
   em 90 → "o novato não é o melhor"); um indicador ruim (40) puxa alguém que seria bom para 55 (não para 40
   → "o bom não é arrastado ao fundo"). Como a faixa "ok/confiável" começa em 75, o novato-padrão nasce em
   **"warn"**; para nascer já confiável é preciso ser indicado por quem tem **IC ≥ 80** — um filtro natural.
   *(Cold start SEM indicação — quem entra sozinho — segue o piso baixo + salto na verificação, D3.)*
3. **Verificados puxam confiança.** Profissionais **verificados** têm o IC ajustado (piso mais alto); ao
   indicarem, trazem para a plataforma pessoas com confiança **igual ou semelhante** à deles.
4. **Indicar mal custa caro (você é fiador).** As **primeiras avaliações** do indicado caem também na conta
   de quem o indicou — um vouch ruim machuca o SEU IC, não só o do indicado. Skin in the game.
5. **IC por zonas com teto.** O IC é a soma de **zonas de contribuição reservada**. Por mais bem avaliado
   que seja, se você não indicou ninguém, não fechou acordos, etc., o índice sobe **até o teto daquela zona
   e estagna**; para subir mais, é preciso **preencher outras zonas**. A reputação é multidimensional de
   propósito — recompensa quem participa da rede inteira, não quem otimiza um só eixo.
6. **A indicação toca os dois lados.** Mesmo um profissional **já cadastrado** é afetado pelo IC de quem o
   indicou; e um profissional **de fora** é obrigado a **se cadastrar** para constar na lista de indicados
   (não existe "indicado fantasma" — todo indicado é uma conta real).

**Propostas, defesas e pontos a decidir** (contribuição para fechar o desenho):

- **Herança provisória, vínculo de ~1 semana (D9 DECIDIDA).** O IC herdado é um **empréstimo de partida**,
  não um presente: pela alta sensibilidade inicial (D3), ele **flutua rápido para o desempenho próprio** do
  indicado. O **vínculo indicador↔indicado** — tanto a herança quanto a fiança das primeiras avaliações —
  fica ativo por **alguns dias, ~1 semana**; depois solta, e o indicado anda com as próprias pernas. Isso já
  mata a "fábrica de contas": o IC emprestado não fixa, e ninguém empresta mais confiança do que tem. *(Ponta
  de borda resolvida: se a semana acaba SEM nenhum trabalho, não há crash — sem eventos, o índice
  simplesmente permanece perto da partida ancorada em 70; ele só "flutua" quando há atividade real.)*
- **Indicar é uma APOSTA de reputação — e é isso que auto-regula o crescimento (D8 DECIDIDA).** Fica só a
  **responsabilidade retroativa** (regra 4), sem stake explícito por ora — porque a fiança **já é** a
  aposta: indicar qualquer um arrisca um revés no seu próprio índice, então **não compensa indicar no
  escuro**. Indicar vários bons (que não te atrapalham) é bom pra você E pra plataforma. Efeito de desenho,
  poderoso: **a rede só cresce tão rápido quanto gente confiável se dispõe a se expor vouchando** — o
  crescimento é *quality-gated* por construção. (Stake explícito fica na gaveta, caso surja abuso.)
- **Teto E piso por zona — só a má-fé chega ao fundo.** Refinamento da regra 5: cada zona tem não só um
  **teto** (você estagna sem preencher as outras) como um **piso**. Avaliação ruim, sozinha, te derruba
  DENTRO da zona de avaliação — leva a "warn/alert", não a "bad". **Chegar perto de IC 0 é reservado a quem
  acumula AÇÕES de má-fé** (denúncias procedentes, golpes, fraudes), numa zona de conduta de peso negativo
  forte. Um profissional medíocre não é destruído por umas notas baixas; o fundo do poço é para quem é
  *perigoso*, não para quem é *fraco* — o que preserva a leitura do índice ("IC baixo = cuidado real").
- **Dois tipos de indicação — distinguir.** (a) **Responsiva:** indicar dentro de um **pedido** (matchmaking;
  tem o evento "aceita"). (b) **De entrada / fundadora:** **trazer alguém novo** para a plataforma, fora de
  qualquer pedido (puro crescimento). Podem render diferente e ter validações diferentes (a de entrada é a
  que dispara a herança de IC + convite). Vale nomear os dois no motor do IC.
- **O laço viral precisa do CONVITE explícito.** Quando você indica um outsider, ele recebe o gancho:
  *"Fulano te indicou no Gente Honesta — complete seu cadastro e comece com IC X."* O IC herdado é a isca. É
  isto que transforma indicação em canal de aquisição (liga-se a notificações, Fase 3, e a como o
  outsider "entra" via convite).
- **Defesa contra conluio / auto-indicação.** `[risco]` O abuso óbvio é o **anel de indicação mútua** (A e B
  se inflam) e a **conta-laranja** (indico a mim mesmo por outra conta). As zonas com teto + fiança + stake
  ajudam, mas o desenho já deve prever **detecção de reciprocidade/circularidade** e limites por par de
  usuários. Entra no anti-fraude (Fase 5), mas nasce aqui como requisito.
- **O efeito sobre o profissional já estabelecido deve ser LIMITADO.** A regra 6 (o já-cadastrado também é
  tocado pelo IC de quem o indicou) é boa — cria uma **teia de confiança** —, mas precisa de teto: um
  indicador ruim **não pode derrubar** quem tem histórico longo. Pela ponderação por volume (D3), o histórico
  próprio já domina; o efeito da indicação é **um empurrão pequeno**, não uma alavanca.

**Impacto nas decisões abertas:** este deep-dive **encaminha D7** (o incentivo a indicar = ganho de IC +
zona exclusiva), **começa a preencher D2** (as *zonas* são a espinha dos fatores do IC) e **reforça D3** (a
herança é o mecanismo de cold start). Abre D8 (stake) e D9 (prazo da fiança).

### 10.2 O motor do IC — inventário de zonas candidatas (menu a podar)

O IC é a **soma de zonas com contribuição reservada** (teto E piso por zona; ver §10.1, regra 5). Antes de
escolher os pesos (D2), aqui está o **cardápio completo** de zonas possíveis, agrupadas por família. É um
menu para PODAR: nem tudo entra no v1; marcamos abaixo uma sugestão de núcleo enxuto. **Mas antes,
o pé no chão** — nem toda zona deste cardápio é mensurável; leia a proveniência a seguir.

**Pé no chão — de onde vem cada dado (e o que NÃO temos).** A plataforma **não media a relação**: ela
**conecta contatos** e oferece uma **ferramenta OPCIONAL, o Acordo** (nome de trabalho; ex-"minicontrato").
O serviço, a conversa e o dinheiro acontecem FORA (WhatsApp, presencial). Logo, quase nada é telemetria
automática — é **declarado** pelas partes ou **reportado** por pessoas. Antes de pesar zonas, é preciso
saber a PROCEDÊNCIA e a confiabilidade de cada sinal:

- **(A) Observado pelo app — alta integridade (o app é a testemunha).** Indicações feitas/aceitas,
  verificação, denúncias registradas, tempo de casa, completude do perfil, detecção de conluio, e a
  EXISTÊNCIA de um Acordo. Sempre disponível, difícil de forjar. **É a espinha dorsal do IC.**
- **(B) Declarado no Acordo — média-alta integridade (os DOIS lados registram).** Valores, prazos, atrasos,
  confirmações, reclamações, conclusão, e a **avaliação com lastro** que vira **comentário no perfil**. Rico
  e valioso, MAS **esparso** (nem todo serviço gera Acordo: cliente confia na palavra, acha o serviço simples
  demais, ou é recorrente e nem busca no app) e **declarado, não observado**. É a camada PREMIUM, porém rara.
- **(C) Avaliação de perfil aberta — baixa integridade.** Qualquer um com o contato, na mesma região, pode
  avaliar. Barata e manipulável → **peso baixo** e **não gera comentário** (só um empurrãozinho no número).
- **(D) Cego — não temos.** O conteúdo do WhatsApp, se o dinheiro trocou de mãos e quanto, se o profissional
  chegou no horário de fato. Só sabemos o que alguém DECLARA (num Acordo) ou REPORTA (numa denúncia).

**Três consequências de desenho, decididas:**
1. **Duas classes de avaliação.** (i) *Direta de perfil* = baixo peso, sem comentário (fonte C). (ii)
   *De Acordo concluído* = alto peso e **vira o comentário do perfil** (fonte B). Os comentários no card do
   profissional só nascem de Acordos — é o que dá lastro à reputação visível.
2. **A família 4 (operacional) NÃO é zona independente.** Atraso, reclamação, confirmação, no-show não são
   medições automáticas — são **campos declarados dentro de um Acordo** (fonte B). Entram como facetas das
   zonas Acordo/Qualidade, não como eixos próprios.
3. **O IC se apoia no que SEMPRE existe (A), com o prêmio do que às vezes existe (B).** Como o Acordo é
   esparso, a BASE do índice são os sinais observados pelo app (indicação, verificação, conduta, tempo de
   casa); a qualidade-via-Acordo é uma zona de **alto valor e baixa cobertura**. O índice PRECISA fazer
   sentido para quem tem poucos Acordos — senão pune quem atende cliente que "confia na palavra".

**Por que o profissional QUER Acordos (o incentivo certo):** o Acordo é a única fonte de dados ricos — gera
os comentários do perfil e alimenta a zona de qualidade de alto peso. É opcional para o cliente, mas
**incentivado pelo profissional**, que ganha reputação de melhor lastro ao formalizar.

**Família 1 — Qualidade (resultado do trabalho)** · sinal `+`
| Zona candidata | Mede |
|---|---|
| Média das avaliações | qualidade percebida do serviço |
| Consistência | variância baixa = previsível (bom sempre, não às vezes) |
| Recontratação | o mesmo cliente volta = confiança forte |
| Avaliação por critério | pontualidade / capricho / preço justo / comunicação, separados |

**Família 2 — Rede / Indicação (capital social)** · sinal `+`
| Zona candidata | Mede |
|---|---|
| Indicações feitas | participação na rede |
| Indicações aceitas | o seu palpite foi o escolhido |
| Qualidade dos indicados | seus indicados se saem bem = você é bom curador |
| Quem/quantos te indicam | teia de confiança; diversidade de indicadores > um só repetido |

**Família 3 — Volume / Histórico (track record real)** · sinal `+`
| Zona candidata | Mede |
|---|---|
| Acordos fechados | volume de trabalho concreto |
| Taxa de conclusão | fecha o que começa (vs abandona) |
| Tempo de casa | antiguidade na plataforma |
| Constância | ativo recorrente vs sumido |

**Família 4 — Confiabilidade operacional (comportamento)** · sinal `+/–` · ⚠️ **fonte B — só existe DENTRO
de um Acordo** (campos declarados, não medição automática; entram como facetas da zona Acordo, não como zona
independente — ver "pé no chão" acima)
| Zona candidata | Mede |
|---|---|
| Comparecimento | no-show em diárias/combinados |
| Pontualidade / prazo | cumpre o combinado no tempo |
| Cancelamentos | frequência e "em cima da hora" |
| Tempo de resposta | responde rápido a pedidos/mensagens |
| Honrar o valor | preço final = combinado (sem surpresa no fim) |

**Família 5 — Verificação (piso de confiança)** · sinal `+` (salto único)
| Zona candidata | Mede |
|---|---|
| Identidade | documento/selfie confirmados |
| Ofício / formalidade | MEI, emite NF, certificado onde aplicável |
| Região confirmada | endereço/bairro validado |

**Família 6 — Conduta / Integridade (a zona NEGATIVA — a que leva ao fundo)** · sinal `–` (sem teto)
| Zona candidata | Mede |
|---|---|
| Denúncias procedentes | peso negativo forte |
| Golpe / fraude confirmada | catastrófico |
| Fraude no próprio IC | conluio / auto-indicação detectada |
| Reclamações não resolvidas | pendências abertas |

**Família 7 — Bom cidadão / o OUTRO lado (conta única: cliente = profissional)** · sinal `+/–`
| Zona candidata | Mede |
|---|---|
| Completude do perfil | foto, bio, tags, formas de pagamento preenchidas |
| Comportamento como CLIENTE | paga em dia, avalia com justiça, não dá calote no profissional |

**Como as zonas se combinam (estrutura proposta):**
- **Zonas `+` têm TETO:** cada uma contribui até um máximo. Encheu uma e parou de mexer nas outras → estagna
  (é a mecânica da regra 5). É o que obriga a participar da rede inteira, não só de um eixo.
- **Verificação é um PISO/salto único:** dá um degrau de partida, não cresce com o tempo.
- **Conduta é a zona `–` SEM teto:** é a única que fura os pisos das demais e leva ao fundo (perto de 0).
  Por isso "avaliação ruim não zera; má-fé zera".
- **A ponderação por volume (D3) atua POR CIMA da soma:** com pouco histórico o índice se move rápido; com
  muito, consolida.

**`[DECISÃO D2]` — Núcleo v1 sugerido (aterrado na proveniência):** organizado por CONFIABILIDADE da fonte,
não por "seria legal medir".

- **Espinha dorsal — fonte A (sempre disponível, observada pelo app):**
  1. **Indicação** — feitas + aceitas.
  2. **Verificação** — identidade (o piso de partida).
  3. **Conduta** — denúncias/golpes/fraudes (a zona negativa, sem teto).
  4. **Tempo de casa / atividade** — antiguidade + constância.
- **Prêmio — fonte B (alto valor, baixa cobertura, via Acordo):**
  5. **Qualidade via Acordo** — avaliação com lastro (→ vira comentário) + os campos do Acordo (conclusão,
     atraso, reclamação, volume de Acordos concluídos). É aqui que a família 4 mora, como faceta.
- **Tempero — fonte C (peso baixo):** avaliação de perfil direta — um empurrãozinho, **sem comentário**.

O lado-cliente (família 7) e os refinamentos das famílias 1–3 (consistência, recontratação, curadoria)
entram como **fast-followers**, quando houver sinal para medi-los. **A decidir:** o PESO/TETO de cada zona
(quanto dos 100 pontos cada uma vale) e quais candidatas promover ao v1.

### 10.3 O Acordo — a fonte rica de dados (ex-"minicontrato")

**O que é.** Um registro **OPCIONAL, de DOIS LADOS e leve** do combinado entre cliente e profissional,
criado dentro do app. Não é contrato legal — é o "combinado" que **ambos confirmam**. Seu valor: é a única
fonte **estruturada e bilateral** de dados (fonte B), e é o que produz os **comentários do perfil** e o
sinal de IC de **alto peso**. Opcional para o cliente, **incentivado pelo profissional**.

**Como se conecta (nasce de uma conexão).** Depois que a descoberta acontece (busca, ou pedido/indicação) e
os contatos se conectam, **qualquer uma das partes propõe** um Acordo. Ele **liga** um cliente a um
profissional (a "conexão") e é a ponte do estágio 2 do flywheel (descoberta → **Acordo** → entrega →
avaliação). Um Acordo concluído se liga ao **perfil** do profissional (a avaliação vira comentário) e ao
**par** cliente↔pro (recontratação = Acordos repetidos entre os mesmos dois).

**Ciclo de vida (estados) — casa com o `CONTRACT_STATUS` que já existe no código:**
1. **Proposto / pendente** — uma parte cria com os termos (escopo, valor, prazo); aguarda o outro confirmar.
   *(= pending; a gaveta "Contratos pendentes" de hoje.)*
2. **Ativo** — o outro **CONFIRMA** os termos → o combinado vale, o serviço está em curso. *(= `active`.)*
3. **Concluído** — o serviço terminou; a conclusão **DESTRAVA a avaliação com lastro** (→ comentário).
   *(= `done`.)*
4. **Cancelado** — uma parte encerra antes/durante; cancelamento tardio/abandono é **sinal negativo**.
   *(= `cancelled`.)*
5. **(Reclamação / disputa)** — transversal: uma parte registra reclamação → alimenta conduta / pode ir à
   moderação.

**O que ele registra (os campos = a matéria-prima do IC):** partes (cliente + profissional), escopo, **valor
(DECLARADO)**, prazo/data combinada, datas (criado / confirmado / concluído / cancelado), **confirmações**
(os dois toparam), **atrasos** (prazo × conclusão real declarada), **reclamações**, **avaliação final +
comentário**.

**Como é avaliado — DOIS LADOS (a chave da confiança).** Ao concluir, **cada lado avalia o outro** (a conta
é única!):
- **Cliente → profissional:** avaliação COM LASTRO → **vira comentário no perfil** + zona Qualidade (alto peso).
- **Profissional → cliente:** contra-avaliação → alimenta o "bom cidadão / lado-cliente" (família 7).

A bilateralidade é o que torna o Acordo **confiável** (ambos têm pele em jogo) e é o que torna a **família 7
mensurável** (sem o Acordo, não haveria como medir o comportamento do cliente).

**Regras de integridade e anti-fraude (decididas):**
- **Só conta pro IC se CONFIRMADO pelos dois E CONCLUÍDO.** Um Acordo pendente/unilateral NÃO move o índice
  (senão o profissional fabrica Acordos sozinho). A confirmação bilateral é o portão.
- **Valor é DECLARADO, não verificado** (fonte D — o app não processa pagamento). Serve de informação/filtro,
  nunca de prova.
- **Conluio:** dois combinados podem fabricar Acordos para farmar avaliação. Defesas: a confirmação
  bilateral já **exige um cúmplice**; muitos Acordos no MESMO par rendem cada vez menos (e acendem suspeita)
  — mesma detecção do conluio de indicação (Fase 5).

**`[DECISÃO D10]` — Acordo com cliente NÃO cadastrado.** Para ser bilateral, os dois precisam de conta. Se o
cliente não está no app: (a) **exigir o cadastro dele para confirmar** → o Acordo vira **canal de
crescimento** (o profissional puxa o cliente para o app, igual à indicação de outsider); ou (b) permitir um
**registro unilateral de baixa confiança** (não vira comentário, peso mínimo). Sugestão: **(a)** — coerente
com "todo indicado é conta real" e com o motor de crescimento.

**Catálogo Acordo → IC (o que alimenta o quê — para aplicar nas zonas):**
| Evento / campo do Acordo | Fonte | Efeito no IC |
|---|:--:|---|
| Acordo confirmado pelos dois | A + B | zona **Acordos** (volume), leve `+` |
| Acordo concluído | B | zona **Acordos** (conclusão) `+` |
| Avaliação cliente→pro (com lastro) | B | zona **Qualidade** (alto peso) `+` **+ comentário no perfil** |
| Avaliação pro→cliente | B | zona **lado-cliente / família 7** (`+/–`) |
| Atraso (prazo × conclusão) | B | faceta `–` na zona Acordo (operacional) |
| Cancelamento tardio / abandono | B | penalidade `–` (operacional; grave → conduta) |
| Reclamação procedente | B → moderação | zona **Conduta** `–` |
| Recontratação (mesmo par, novo Acordo) | A (par observado) | sinal forte de confiança (fast-follower) |

**Impacto:** consolida a fonte (B) do IC, dá o mapa para catalogar as zonas, e torna a **família 7
(lado-cliente) mensurável** via a contra-avaliação. Abre **D10** (Acordo com cliente de fora).

---

## 11. Especificação de telas (design) — backlog de construção

> Onde o conceito vira **ferramenta**: as telas a construir, aterradas no design system existente
> (`.claude/rules/design-system.md` + `feed.md`). Regra de ouro do projeto: **reusar a primitiva, nunca
> criar árvore paralela**. Cada tela abaixo mapeia para o que JÁ existe + o que é novo.

### 11.1 O Acordo — fluxo e telas

**O fluxo: HANDSHAKE DUPLO por link (decidido).** O profissional cria um Acordo **sem cliente dono**
(reutilizável), gera um **link** e o envia (WhatsApp). O cliente abre o link **logado**, **aceita**
(manifesta interesse) → o profissional é **notificado** ("Cliente X quer fechar") e **reconfirma com aquele
cliente específico**. Só então o Acordo vale.

```
[PROFISSIONAL cria]          [CLIENTE abre link, logado]        [PROFISSIONAL]
   MODELO (sem cliente,  ──link──►  aceita → PENDENTE      ──►    confirma → ATIVO
   reutilizável)                    (vinculado ao cliente)        (par fechado)
                                                                      │
                                                    CONCLUÍDO ◄───────┤ (após o serviço → destrava avaliação)
                                                    CANCELADO ◄───────┘
```

**Estados (o `CONTRACT_STATUS` interno ganha dois degraus):**
| Estado | Quem vê / o que significa | Onde mora na UI |
|---|---|---|
| **Modelo** | Pro criou, link aberto, sem cliente. Reutilizável. | Bandeja "Acordos pendentes" (rows `contract-mini`, com editar/compartilhar). |
| **Pendente** | Um cliente aceitou; aguarda o pro confirmar. | Mesma bandeja, **destacado** (carrega cliente + IC + CTA "Confirmar"). Cliente vê "aguardando confirmação". |
| **Ativo** | Pro confirmou; serviço em curso. | Lista principal (`.contract-card--active`). |
| **Concluído** | Serviço terminou; destrava avaliação dos dois lados. | Lista (`--done`, tint azul). |
| **Cancelado** | Encerrado antes/durante. | Lista (`--cancelled`, tint vermelho). |

**Um link reutilizável gera UM pendente POR cliente** (cada aceite é uma instância independente que o pro
confirma separadamente; o modelo segue aberto). O toggle "reutilizável" liga/desliga isso (D11, decidido);
desligado, o link "queima" no 1º aceite.

> **Regra do Acordo (DECIDIDA): os dados são do PROFISSIONAL.** O cliente só pode **ACEITAR ou RECUSAR** —
> nunca editar. Todo ajuste é por contato direto/WhatsApp, e **só o profissional edita** o Acordo.
> **Integridade (snapshot):** ao aceitar, o Pendente/Ativo guarda um **snapshot** dos termos do momento do
> aceite; editar o modelo depois só muda os **próximos** aceites — quem já aceitou segue vinculado ao que
> viu (mexer num pendente/ativo = novo acordo / re-aceite). Assim "o cliente aceitou exatamente o que viu"
> se sustenta.

**Os dados do Acordo (campos, por etapa):**
| Campo | Quem preenche | Widget (reuso) |
|---|---|---|
| **Título do serviço** (obrigatório) | Pro (criação) | `.input-text` |
| **Descrição / escopo** (o que inclui e o que NÃO inclui) | Pro | `<textarea>` (contador, como o pedido) |
| **Valor** (R$, DECLARADO) | Pro | padrão do salário da vaga (`toLocaleString('pt-BR')`, `R$` externo) |
| **Forma de pagamento** | Pro | chips `.chip--payment` (Dinheiro/Pix/Cartão) |
| **Prazo** (data combinada e/ou "em N dias") | Pro | data OU duração — o pro escolhe o modo (D12) |
| **Reutilizável?** | Pro | `.check-box` (toggle) |
| **Cliente** (vínculo) | definido no **aceite** | — (auto: quem aceitou) |
| **Datas** (criado/aceito/confirmado/concluído) | auto por evento | `contract-card__dates` (já existe) |
| **Avaliação + comentário** (dois lados) | na **conclusão** | tela de Avaliação (spec à parte) |

**As telas a construir (backlog):**

1. ✅ **CONSTRUÍDA (v448)** — **Criar Acordo — formulário** · `#acordo-sheet` — reusa o scaffolding
   `.pedido-sheet*` do `#vaga-sheet` (3 camadas, `--sheet-top`, backNav+layerFocus, tap-outside). Campos
   acima; **rodapé fixo** `.pedido-sheet__actions--footer` com CTA **"Gerar link do Acordo"** (`btn--accent`).
   Abridor = o CTA "Criar Acordo" (`#btn-new-contract`) no rodapé da gaveta de Acordos; abre POR CIMA dela.
   No MOCK, "Gerar link" valida e confirma a criação (a geração/compartilha do link real é a Tela 2). Doc em
   `feed.md`.
2. **Link gerado / compartilhar** · estado pós-criação — card `.card` "Acordo criado" + o link + botão
   **"Compartilhar"** (reusa a Web Share `shareOrCopy`/`sharePedidoExternal` que JÁ existe). O Acordo entra
   como **Modelo** na bandeja.
3. **Detalhe do Acordo (visualização)** · sheet de leitura — reusa o VISUAL do `.contract-card` como fonte
   única (mesmo padrão do vaga-detail que reusa `vagaContentHTML`): topo (partes: pro + cliente com
   `icBarHTML`) + status badge (`contract-card__status--*`) + `__body` (escopo + `value-box`) + datas.
   Ações no rodapé variam por estado. Ponto de entrada: o "Abrir Acordo" (`contract-mini__open`) já no HTML.
4. **Aceite do cliente (landing do link)** · o cliente abre o link **logado** (se não, passa pelo auth e
   volta — laço de crescimento, **D10**). Vê a tela 3 em leitura + rodapé **"Tenho interesse"**
   (`btn--accent`) e "Agora não". Ao aceitar → cria o **Pendente**, notifica o pro, e ele passa a ver
   "Aguardando o profissional confirmar".
5. **Confirmação do profissional** · o pro é avisado (hoje: **pulso `--notify`** no botão de Acordos, que JÁ
   existe, + contador na bandeja; push real na Fase 3). Abre o pendente → vê o Acordo **+ o cliente
   específico** (nome + IC + foto) → CTA **"Confirmar com [Cliente]"** (`btn--accent`) + "Recusar". Ao
   confirmar → **Ativo**, ambos notificados; se reutilizável, o modelo segue aberto.
6. *(próximo conceito)* **Conclusão + avaliação dos dois lados** — marca concluído → destrava a avaliação
   (tela da Avaliação, especificada quando atacarmos esse conceito).

**Reuso vs. novo (resumo p/ implementação):**
- **Já existe:** gaveta de Acordos + lista, `.contract-card` (active/done/cancelled), bandeja "Acordos
  pendentes" + `contract-mini`, CTA "Criar Acordo", pulso `--notify` do botão, Web Share.
- **Novo:** o `#acordo-sheet` (formulário), a geração/estado de **link**, o **detalhe** com ações por
  estado, a **landing de aceite** do cliente, a **confirmação** do pro, e dois estados novos no
  `CONTRACT_STATUS` (**modelo**, **pendente-aceito**). Nada disso pede primitiva nova de CSS — tudo compõe
  `.pedido-sheet*` / `.contract-card` / `.card` / `.chip` / `.btn`.

**Decisões de design (DECIDIDAS):**
- **D11 — Reutilizável:** ✅ **toggle na criação** — ligado, o link gera um pendente por cliente
  (multi-cliente); desligado, "queima" no 1º aceite.
- **D12 — Prazo:** ✅ **os dois** — o pro escolhe data específica OU duração ("em N dias"); a duração vira
  data na confirmação.
- **Negociação:** ✅ **os dados são do profissional; o cliente só aceita ou recusa** (nunca edita). Ajuste é
  por contato direto/WhatsApp e só o pro edita. Sem negociação dentro do app. + **snapshot** dos termos no
  aceite (ver a "Regra do Acordo" acima) para não mudar o que o cliente já aceitou.

---

## 12. Changelog do conceito

- **(criação)** — primeira versão do registro de conceito: tese, dois lados, flywheel, análise do IC,
  inventário do estado atual, lacunas, visão e roadmap em 6 fases. Sete decisões em aberto (D1–D7).
- **(revisão 1)** — fechadas **D1** (Vagas/Diárias são núcleo, não satélite → Fase 4 interfolia, IC
  atravessa as três portas) e **D3** (curva de sensibilidade do IC: forma rápido / consolida devagar /
  nunca congela, ponderada por volume). Restam em aberto D2, D4, D5, D6, D7.
- **(revisão 2)** — primeiro deep-dive: **§10.1 Indicação** (nova seção 10; changelog vira 11). Regras
  decididas: indicar rende IC / aceita rende mais, herança de IC no crescimento, verificados puxam
  confiança, fiança do indicador, IC por zonas com teto, indicado é sempre conta real. **D7 encaminhada**
  (incentivo = IC), **D2 reenquadrada** como zonas com teto. Abertas **D8** (stake ao indicar) e **D9**
  (prazo da fiança). Riscos registrados: herança precisa ser provisória; conluio/auto-indicação; efeito
  limitado sobre o já-estabelecido.
- **(revisão 3)** — fechadas **D8** (só responsabilidade retroativa: a fiança já é a aposta e torna o
  crescimento *quality-gated*; sem stake explícito por ora) e **D9** (vínculo indicador↔indicado dura
  ~1 semana). Novo refinamento das zonas do IC: cada zona tem **teto E piso**; avaliação ruim sozinha não
  zera o IC — o **fundo é reservado a ações de má-fé** (denúncias/golpes/fraudes). Restam D2 (pesos/tetos
  das zonas), D4, D5, D6.
- **(revisão 4)** — **fórmula do IC herdado decidida**: média entre 70 e o IC do indicador (70 = ponto de
  gravidade; estabiliza novato e protege o bom arrastado por indicador ruim; nascer "ok" exige indicador
  ≥80). Ponta de borda da semana sem trabalho resolvida (sem crash — permanece na partida ancorada). Novo
  **§10.2 — inventário de zonas candidatas do IC** (7 famílias, ~28 sinais), com estrutura de combinação
  (teto nas `+`, verificação como piso, conduta `–` sem teto) e um **núcleo v1 sugerido de 5 zonas** para
  D2. Falta calibrar pesos/tetos e promover candidatas ao v1.
- **(revisão 5)** — **pé no chão / proveniência dos dados** (§10.2): a plataforma não media a relação (só
  conecta contatos + Acordo opcional via WhatsApp), então quase tudo é declarado/reportado, não automático.
  Sinais classificados em (A) observado pelo app = espinha dorsal, (B) declarado no Acordo = premium mas
  esparso, (C) avaliação de perfil aberta = peso baixo, (D) cego. Decidido: **duas classes de avaliação**
  (direta sem comentário × de Acordo que vira comentário); a **família 4 (operacional) não é zona** (são
  campos do Acordo); o IC apoia-se em (A) com (B) como prêmio. Núcleo v1 reorganizado por confiabilidade da
  fonte. **Renomeação de trabalho: "minicontrato" → "Acordo"** (§3, §8).
- **(revisão 6)** — **§10.3 O Acordo** (deep-dive): registro opcional e bilateral, ciclo de vida (proposto →
  ativo → concluído/cancelado, casando com `CONTRACT_STATUS`), campos registrados, **avaliação dos dois
  lados** (pro↔cliente → torna a família 7 mensurável), regras de integridade (só conta no IC se confirmado
  + concluído; valor é declarado), e o **catálogo Acordo → IC** para aplicar nas zonas. Abre **D10** (Acordo
  com cliente não cadastrado). Rename "minicontrato"→"Acordo" aplicado também no CÓDIGO (botão + comentários
  + feed.md).
- **(revisão 7)** — vira design: **§11 Especificação de telas** (nova seção; changelog vira §12). **§11.1 O
  Acordo**: fluxo de **handshake duplo por link** (pro cria modelo → cliente aceita → pro reconfirma), dois
  estados novos (modelo, pendente-aceito), tabela de campos por etapa, e o **backlog de 6 telas** mapeado ao
  design system existente (`.pedido-sheet*`, `.contract-card`, `--notify`, Web Share — nada de primitiva CSS
  nova). Abre **D11** (link reutilizável) e **D12** (formato do prazo).
- **(revisão 8)** — fechadas **D11** (toggle reutilizável), **D12** (prazo = data OU duração) e **D13** (os
  dados do Acordo são do PROFISSIONAL: o cliente só aceita/recusa, nunca edita; ajuste off-app; só o pro
  edita). Novo requisito de integridade: **snapshot** dos termos no aceite — editar o modelo só afeta os
  próximos aceites, não quem já aceitou. §11.1 pronto para virar código.
- **(revisão 9 — 1ª tela construída, v448)** — **Tela 1 do Acordo (`#acordo-sheet`) implementada** no app
  (HTML + CSS + JS), reusando o scaffolding do `#vaga-sheet` sem primitiva nova. Formulário do pro (serviço,
  descrição, valor, pagamento multi, prazo data|duração, reutilizável) com validação e "Gerar link" (mock).
  Verificada por smoke test headless (abrir, validar, alternar prazo, multi-select, tap-outside). Doc na
  `feed.md`. Próximo: Tela 2 (gerar/compartilhar o link).
