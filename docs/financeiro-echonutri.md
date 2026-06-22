# Planilha Financeira — EchoNutri (rascunho)

> Modelo pronto pra copiar no Excel. **Edite só a seção PREMISSAS** — o resto deriva dela.
> Valores reais da Livia (jun/2026). **Diarização roda em TODA consulta** (é core do produto).

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
| Imposto (Simples Nacional) | 6% | sobre a receita |

---

## 2) CUSTOS FIXOS MENSAIS

| Item | R$/mês | Obs |
|---|---|---|
| Contadora | 325,00 | |
| INSS | 370,00 | |
| Domínio + email | 5,83 | R$70/ano já pago ÷ 12 |
| Render (backend) | 41,00 | US$7 × 5,60 + IOF (~3,4%) |
| OpenAI/Gemini (base) | 10,00 | uso leve |
| Vercel / Firebase | 0,00 | planos grátis |
| **Subtotal SEM ads (Mês 1)** | **751,83** | contato 1-a-1, lista de espera |
| Ads | 800,00 | **só a partir do Mês 2** |
| **Subtotal COM ads (Mês 2+)** | **1.551,83** | |

---

## 2b) CUSTOS DE ABERTURA (uma vez só — entram na reserva de caixa, não no mensal)

| Item | R$ |
|---|---|
| Abertura da empresa (ME) | 900,00 |
| Encerramento do MEI antigo | 240,00 |
| **Total de abertura** | **1.140,00** |

> 💡 Some isso à **reserva de caixa inicial**. Com o prejuízo dos primeiros meses
> (até chegar nas ~28 nutris sem ads) + abertura, uma reserva de **R$3.000–5.000**
> deixa o lançamento tranquilo.

---

## 3) CUSTO VARIÁVEL POR ASSINANTE (COGS) — toda consulta diarizada

| Item | Cálculo | R$/assinante/mês |
|---|---|---|
| Transcrição + diarização (AssemblyAI) | 40 × 0,75 × 0,17 × 5,60 | 28,56 |
| Análise IA (Gemini) | 40 × 0,10 | 4,00 |
| **TOTAL VARIÁVEL** | | **R$ 32,56** |

**Fórmula Excel** (ASR): `=Consultas * DuracaoH * CustoASR_USD * Cambio`

> O custo é proporcional às **horas de áudio**. Quem usa menos, paga menos (ver seção 6).

---

## 4) UNIT ECONOMICS (por assinante)

| Métrica | Cálculo | Valor |
|---|---|---|
| Receita bruta | preço | R$ 67,00 |
| (–) Taxa Stripe | 67×3,99% + 0,39 | R$ 3,06 |
| (–) Imposto 6% | 67×6% | R$ 4,02 |
| **Receita líquida** | | **R$ 59,92** |
| (–) Custo variável | seção 3 | R$ 32,56 |
| **Margem de contribuição** | | **R$ 27,36** |

---

## 5) PONTO DE EQUILÍBRIO (break-even)

`Break-even = Custo Fixo ÷ Margem de contribuição (27,36)`

| Cenário | Custo fixo | Break-even |
|---|---|---|
| **Mês 1 — sem ads** | 751,83 | ≈ **28 assinantes** |
| **Mês 2+ — com ads** | 1.551,83 | ≈ **57 assinantes** |

---

## 6) SENSIBILIDADE AO USO (consultas realmente diarizadas/mês)

O variável e o break-even dependem de quanto cada nutri usa:

| Consultas/mês | Custo variável | Margem/assin. | Break-even (sem ads) |
|---|---|---|---|
| 10 | 8,14 | 51,78 | ≈ 15 |
| 20 | 16,28 | 43,64 | ≈ 18 |
| 30 | 24,42 | 35,50 | ≈ 22 |
| 40 | 32,56 | 27,36 | ≈ 28 |

> 💡 Mesmo diarizando **tudo**, o break-even fica entre **15 e 28 nutris** (sem ads).
> Totalmente viável — a margem de contribuição é de **41% a 77%**.

---

## 7) PROJEÇÃO DE LUCRO (uso de 40 consultas, margem R$27,36)

| Assinantes | Lucro Mês 1 (sem ads) | Lucro Mês 2+ (com ads) |
|---|---|---|
| 10 | −478,23 | −1.278,23 |
| 20 | −204,63 | −1.004,63 |
| 30 | +68,97 | −731,03 |
| 50 | +616,17 | −183,83 |
| 100 | +1.984,17 | +1.184,17 |

**Fórmula Excel:** `=(Assinantes * 27,36) - CustoFixo`

---

## 8) ALAVANCAS / NOTAS

- **Preço AssemblyAI confirmar na fatura real** após uso (US$0,15 base + US$0,02 diarização).
- **Aumento de 10% a partir de 01/07/2026:** mandar `"model_region": "global"` na chamada da API
  pra manter o preço atual (ajuste técnico que eu faço no backend).
- **Custo escala com horas de áudio** — quem faz consultas mais curtas/menos consultas, custa menos.
- **INSS + contadora (R$695/mês)** é o peso fixo do início → reforça começar sem ads (break-even ~28 vs ~57).
- **Trial 7 dias:** gera custo variável sem receita; monitorar abuso.
- **Atualizar mensalmente** após o lançamento + medir consultas/mês reais (premissa-chave).
