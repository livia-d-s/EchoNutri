# Planilha Financeira — EchoNutri (rascunho)

> Modelo pronto pra copiar no Excel. **Edite só a seção PREMISSAS** — o resto deriva dela.
> Valores reais da Livia (jul/2026). **MEI** (DAS R$87/mês) → migra pra ME ao lucrar.
> **Separação de falas por contexto (Gemini)** — sem AssemblyAI. No ao vivo a transcrição é grátis (navegador).

> ⚠️ **CONFIRMADO:** atividade pode ser MEI (Livia validou). Migração pra ME fica pro futuro (ao lucrar / perto do teto).

---

## 1) PREMISSAS (edite só aqui)

| Premissa | Valor | Obs |
|---|---|---|
| Preço mensal | R$ 67,00 | |
| Preço anual (15% off) | R$ 683,40 | ≈ R$ 56,95/mês |
| Consultas/mês por assinante | 40 | |
| **Custo IA por consulta** | **R$ 0,50** | separação de falas + análise clínica (Gemini) — estimativa, validar |
| Transcrição ao vivo | R$ 0,00 | navegador (Web Speech), grátis |
| Taxa Stripe | 3,99% + R$0,39 | por transação |
| Regime tributário | **MEI** | DAS fixo R$87/mês (sem 6% sobre receita) |
| Câmbio USD → BRL | 5,60 | só relevante pro upload (Whisper) — ver nota |

---

## 2) CUSTOS FIXOS MENSAIS (MEI)

| Item | R$/mês | Obs |
|---|---|---|
| DAS-MEI | 87,00 | já inclui INSS + imposto (fixo) |
| Domínio + email | 5,83 | R$70/ano já pago ÷ 12 |
| Render / Vercel / Firebase | 0,00 | planos grátis (Render Free) |
| **Subtotal SEM ads (Mês 1)** | **92,83** | contato 1-a-1, lista de espera |
| Ads | 800,00 | **só a partir do Mês 2** |
| **Subtotal COM ads (Mês 2+)** | **892,83** | |

> 💻 **Claude (Claude Code)** é custo de desenvolvimento seu (~R$120/mês, temporário) — fora do break-even do produto.
> (Tirei a linha "OpenAI/Gemini base" — agora o custo de IA está todo no variável por consulta.)

---

## 3) CUSTO VARIÁVEL POR ASSINANTE (COGS)

| Item | Cálculo | R$/assinante/mês |
|---|---|---|
| Transcrição ao vivo (navegador) | grátis | 0,00 |
| IA: separação de falas + análise (Gemini) | 40 × 0,50 | 20,00 |
| **TOTAL VARIÁVEL** | | **R$ 20,00** |

> 📌 **Upload (opcional):** se a nutri subir um áudio gravado em vez do ao vivo, entra o custo do
> Whisper (~R$2/consulta de 45min). Como o fluxo principal é ao vivo, o modelo base assume R$0 de transcrição.

---

## 4) UNIT ECONOMICS (por assinante — MEI)

| Métrica | Cálculo | Valor |
|---|---|---|
| Receita bruta | preço | R$ 67,00 |
| (–) Taxa Stripe | 67×3,99% + 0,39 | R$ 3,06 |
| **Receita líquida** | | **R$ 63,94** |
| (–) Custo variável | seção 3 | R$ 20,00 |
| **Margem de contribuição** | | **R$ 43,94** |

> Sem AssemblyAI, a margem saltou de **R$31,38 → R$43,94** por assinante (66% de margem!).

---

## 5) PONTO DE EQUILÍBRIO (break-even)

`Break-even = Custo Fixo ÷ Margem de contribuição (43,94)`

| Cenário | Custo fixo | Break-even |
|---|---|---|
| **Mês 1 — sem ads** | 92,83 | ≈ **3 assinantes** 🤯 |
| **Mês 2+ — com ads** | 892,83 | ≈ **21 assinantes** |

---

## 6) SENSIBILIDADE AO USO (consultas/mês)

| Consultas/mês | Custo variável | Margem/assin. | Break-even (sem ads) |
|---|---|---|---|
| 10 | 5,00 | 58,94 | ≈ 2 |
| 20 | 10,00 | 53,94 | ≈ 2 |
| 30 | 15,00 | 48,94 | ≈ 2 |
| 40 | 20,00 | 43,94 | ≈ 3 |

---

## 7) PROJEÇÃO DE LUCRO (uso de 40 consultas, margem R$43,94)

| Assinantes | Lucro Mês 1 (sem ads) | Lucro Mês 2+ (com ads) |
|---|---|---|
| 5 | +116,87 | −663,13 |
| 10 | +336,57 | −463,43 |
| 20 | +775,97 | −24,03 |
| 30 | +1.215,37 | +415,37 |
| 50 | +2.094,17 | +1.294,17 |
| 100 | +4.291,17 | +3.491,17 |

**Fórmula Excel:** `=(Assinantes * 43,94) - CustoFixo`

---

## 8) TETO DO MEI + MIGRAÇÃO PRA ME

- **Limite MEI:** ~R$81.000/ano = R$6.750/mês = **~100 assinantes a R$67**.
- Perto do teto (ou lucrando bem), **migrar pra ME**: voltam contadora (~R$325) + INSS (~R$370) + imposto ~6% + abertura R$1.140.
- **Plano:** crescer no MEI (custo fixo baixíssimo) até ~80-100 nutris → migrar pra ME já lucrando.

---

## 9) NOTAS / REVISAR

- **Custo IA por consulta (R$0,50):** estimativa (separação + análise). **Medir na fatura real do Gemini** após o beta — é a premissa-chave agora.
- **Sem AssemblyAI:** transcrição ao vivo grátis; separação de falas feita por contexto no Gemini. Margem muito maior.
- **Ads só no Mês 2:** break-even ~3 sem ads vs ~21 com ads → começar 1-a-1 é imbatível.
- **Render Free:** cold start ~50s na 1ª chamada; upgrade US$7 só com volume.
- **Preço R$67 / anual 15% off:** validar com as primeiras nutris.
- **Atualizar mensalmente** após o lançamento.
