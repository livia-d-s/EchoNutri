# Planilha Financeira — EchoNutri (rascunho)

> Modelo pronto pra copiar no Excel. **Edite só a seção PREMISSAS** — o resto deriva dela.
> Valores reais da Livia (jun/2026). **Começa como MEI** (DAS fixo R$87/mês) → migra pra ME quando lucrar.
> **Diarização roda em TODA consulta** (é core do produto).

> ⚠️ **CONFIRMAR com contadora / Portal do Empreendedor:** se a atividade de **software/SaaS é permitida no MEI**.
> Desenvolvimento/licenciamento de software normalmente **não** está na lista de ocupações MEI — pode precisar de
> uma ocupação correlata permitida ou ir direto pra ME. Isso valida (ou não) todo este modelo MEI.

---

## 1) PREMISSAS (edite só aqui)

| Premissa | Valor | Obs |
|---|---|---|
| Câmbio USD → BRL | 5,60 | |
| Preço mensal | R$ 67,00 | |
| Preço anual (15% off) | R$ 683,40 | = 67×12×0,85 → equivale a R$ 56,95/mês |
| Consultas/mês por assinante | 40 | todas diarizadas |
| Duração média da consulta (h) | 0,75 | 45 min |
| Custo ASR/hora (USD) | 0,17 | AssemblyAI: US$0,15 transcrição + US$0,02 diarização |
| Custo análise IA/consulta (R$) | 0,10 | Gemini |
| Taxa Stripe | 3,99% + R$0,39 | por transação |
| Regime tributário | **MEI** | DAS fixo R$87/mês (sem 6% sobre receita) |

---

## 2) CUSTOS FIXOS MENSAIS (MEI)

| Item | R$/mês | Obs |
|---|---|---|
| DAS-MEI | 87,00 | já inclui INSS + imposto (fixo) — substitui contadora+INSS+6% |
| Domínio + email | 5,83 | R$70/ano já pago ÷ 12 |
| OpenAI/Gemini (base) | 10,00 | uso leve |
| Render / Vercel / Firebase | 0,00 | planos grátis (Render Free no beta) |
| **Subtotal SEM ads (Mês 1)** | **102,83** | contato 1-a-1, lista de espera |
| Ads | 800,00 | **só a partir do Mês 2** |
| **Subtotal COM ads (Mês 2+)** | **902,83** | |

> 💻 **Claude (Claude Code)** é custo de desenvolvimento seu (~R$120/mês, temporário) — fora do break-even do produto.

---

## 2b) CUSTOS DE ABERTURA (uma vez)

| Quando | Item | R$ |
|---|---|---|
| **Agora (MEI)** | usar/ativar MEI existente | ~0 |
| **Depois (migrar p/ ME, ao lucrar)** | abertura ME R$900 + encerrar MEI R$240 | 1.140 (pago com o lucro) |

> 💡 Adiar a ME pro futuro **tira R$1.140 da largada** → reserva de caixa inicial bem menor (R$1.000-2.000 já tranquiliza).

---

## 3) CUSTO VARIÁVEL POR ASSINANTE (COGS) — toda consulta diarizada

| Item | Cálculo | R$/assinante/mês |
|---|---|---|
| Transcrição + diarização (AssemblyAI) | 40 × 0,75 × 0,17 × 5,60 | 28,56 |
| Análise IA (Gemini) | 40 × 0,10 | 4,00 |
| **TOTAL VARIÁVEL** | | **R$ 32,56** |

---

## 4) UNIT ECONOMICS (por assinante — MEI, sem imposto %)

| Métrica | Cálculo | Valor |
|---|---|---|
| Receita bruta | preço | R$ 67,00 |
| (–) Taxa Stripe | 67×3,99% + 0,39 | R$ 3,06 |
| **Receita líquida** | | **R$ 63,94** |
| (–) Custo variável | seção 3 | R$ 32,56 |
| **Margem de contribuição** | | **R$ 31,38** |

> No MEI a margem subiu (de R$27,36 p/ **R$31,38**) porque sumiu o imposto de 6% sobre a receita.

---

## 5) PONTO DE EQUILÍBRIO (break-even)

`Break-even = Custo Fixo ÷ Margem de contribuição (31,38)`

| Cenário | Custo fixo | Break-even |
|---|---|---|
| **Mês 1 — sem ads** | 102,83 | ≈ **4 assinantes** 🤯 |
| **Mês 2+ — com ads** | 902,83 | ≈ **29 assinantes** |

> 💡 Sem ads, com o fixo do MEI tão baixo, você fica no azul com **~4 nutris pagantes**. O peso real passa a ser **só os ads**.

---

## 6) SENSIBILIDADE AO USO (consultas diarizadas/mês)

| Consultas/mês | Custo variável | Margem/assin. | Break-even (sem ads) |
|---|---|---|---|
| 10 | 8,14 | 55,80 | ≈ 2 |
| 20 | 16,28 | 47,66 | ≈ 3 |
| 30 | 24,42 | 39,52 | ≈ 3 |
| 40 | 32,56 | 31,38 | ≈ 4 |

---

## 7) PROJEÇÃO DE LUCRO (uso de 40 consultas, margem R$31,38)

| Assinantes | Lucro Mês 1 (sem ads) | Lucro Mês 2+ (com ads) |
|---|---|---|
| 5 | +54,07 | −745,93 |
| 10 | +210,97 | −589,03 |
| 20 | +524,77 | −275,23 |
| 30 | +838,57 | +38,57 |
| 50 | +1.466,17 | +666,17 |
| 100 | +3.035,17 | +2.235,17 |

**Fórmula Excel:** `=(Assinantes * 31,38) - CustoFixo`

---

## 8) TETO DO MEI + MIGRAÇÃO PRA ME

- **Limite de faturamento MEI:** ~R$81.000/ano = R$6.750/mês = **~100 assinantes a R$67**.
- Ao se aproximar do teto (ou ao lucrar bem), **migrar pra ME** (Simples Nacional): aí voltam contadora (~R$325) + INSS (~R$370) + imposto ~6%, e o custo de abertura R$1.140.
- **Plano:** crescer no MEI (custo fixo baixíssimo) até perto de ~80-100 nutris → migrar pra ME já lucrando, com a ME se pagando fácil.

---

## 9) NOTAS / REVISAR

- ⚠️ **Validar elegibilidade MEI p/ software** (topo do arquivo) — é o que sustenta este modelo.
- **Preço R$67 / anual 15% off:** definido. Revisar após validar com as primeiras nutris.
- **Consultas diarizadas/mês (40):** premissa-chave de custo — medir o uso real.
- **Ads só no Mês 2:** começar 1-a-1 (break-even ~4 sem ads vs ~29 com ads).
- **Render Free no beta:** cold start ~50s na 1ª chamada; upgrade US$7 só com volume.
- **Atualizar mensalmente** após o lançamento.
