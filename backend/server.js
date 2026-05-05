const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai');
require('dotenv').config();

// Initialize Firebase Admin SDK (for verifying user ID tokens)
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT env var missing — backend will reject all requests");
} else {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", err.message);
  }
}

// Middleware: verify Firebase ID Token from Authorization header
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    if (!match) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting: max 10 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configurações do Servidor
const allowedOrigins = [
  'https://echomed.com.br',
  'https://www.echomed.com.br',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('-livia-d-s-projects.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json({ limit: '50mb' }));

// Inicializa a Inteligência Artificial do Google
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint para análise nutricional (EchoMed)
const TONE_INSTRUCTIONS = {
  humanizado: `Use linguagem acolhedora, empática e próxima. Valide os sentimentos do paciente
e aborde as questões com sensibilidade. Evite termos excessivamente técnicos.
Priorize conexão e compreensão do contexto emocional.`,
  sistemico: `Adote uma abordagem integrativa e sistêmica. Conecte alimentação com sono, estresse,
rotina, emoções, atividade física e contexto social. Trabalhe com hipóteses de causas
subjacentes interconectadas (eixo intestino-cérebro, inflamação, microbiota, etc.).
Use linguagem profissional com base científica.`,
  direto: `Use linguagem objetiva, clara e pragmática. Foque no que é acionável. Evite rodeios
e elaborações emocionais. Vá direto à conduta e às recomendações práticas.`,
};

app.post('/api/analyze-medical', apiLimiter, requireAuth, async (req, res) => {
  try {
    const { transcript, tone, exams, activeMealPlan, patientAnthropometry, generateMealPlan } = req.body;
    const selectedTone = tone && TONE_INSTRUCTIONS[tone] ? tone : 'humanizado';
    const toneInstruction = TONE_INSTRUCTIONS[selectedTone];

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: "Transcrição vazia" });
    }

    // Build exam context block (cap total length to avoid ballooning prompt)
    let examsContext = '';
    if (Array.isArray(exams) && exams.length > 0) {
      const MAX_PER_EXAM = 8000;
      const MAX_TOTAL = 20000;
      let used = 0;
      const parts = [];
      for (const ex of exams) {
        if (used >= MAX_TOTAL) break;
        const label = ex.fileName || 'exame.pdf';
        const dateStr = ex.uploadedAt ? new Date(ex.uploadedAt).toLocaleDateString('pt-BR') : '';
        const remaining = MAX_TOTAL - used;
        const text = String(ex.extractedText || '').slice(0, Math.min(MAX_PER_EXAM, remaining));
        if (!text) continue;
        parts.push(`--- ${label}${dateStr ? ` (anexado em ${dateStr})` : ''} ---\n${text}`);
        used += text.length;
      }
      if (parts.length > 0) {
        examsContext = `\n\n[EXAMES LABORATORIAIS ANEXADOS À CONSULTA]
OBRIGATÓRIO: Você DEVE ler, analisar e mencionar explicitamente os valores destes exames nos campos "clinicalRationale" e "nutritionalAssessment". Cruze valores laboratoriais com as queixas relatadas na transcrição (ex: cansaço + ferritina baixa → anemia ferropriva). Se um exame estiver alterado, use isso como base de hipótese no racional clínico. NÃO ignore os exames.

${parts.join('\n\n')}`;
      }
    }

    // Build active meal plan context block (most recent plan attached to the patient)
    let mealPlanContext = '';
    if (activeMealPlan && typeof activeMealPlan.extractedText === 'string' && activeMealPlan.extractedText.trim()) {
      const MAX_PLAN = 15000;
      const planText = activeMealPlan.extractedText.slice(0, MAX_PLAN);
      const label = activeMealPlan.fileName || 'plano.pdf';
      const dateStr = activeMealPlan.uploadedAt
        ? new Date(activeMealPlan.uploadedAt).toLocaleDateString('pt-BR')
        : '';
      mealPlanContext = `\n\n[PLANO ALIMENTAR ATUAL DA PACIENTE]
OBRIGATÓRIO: A paciente já segue o plano alimentar abaixo. No campo "nutritionalConduct", em vez de criar um plano novo do zero, SUGIRA AJUSTES ESPECÍFICOS neste plano atual com base no que foi dito na consulta (ex: "Substituir o lanche da tarde atual por X, pois a paciente relatou fome à noite"). Cite partes concretas do plano quando for ajustar. Se tudo estiver adequado, confirme a manutenção do plano. NÃO ignore o plano existente.

--- ${label}${dateStr ? ` (anexado em ${dateStr})` : ''} ---
${planText}`;
    }

    // Anthropometry context (optional)
    let anthropoContext = '';
    if (patientAnthropometry && typeof patientAnthropometry === 'object') {
      const parts = [];
      if (patientAnthropometry.weightKg) parts.push(`Peso: ${patientAnthropometry.weightKg} kg`);
      if (patientAnthropometry.heightCm) parts.push(`Altura: ${patientAnthropometry.heightCm} cm`);
      if (patientAnthropometry.age) parts.push(`Idade: ${patientAnthropometry.age} anos`);
      if (patientAnthropometry.bodyFatPct) parts.push(`% Gordura: ${patientAnthropometry.bodyFatPct}%`);
      if (patientAnthropometry.leanMassPct) parts.push(`% Massa magra: ${patientAnthropometry.leanMassPct}%`);
      if (patientAnthropometry.dietaryRestrictions) {
        parts.push(`Restrições/preferências: ${patientAnthropometry.dietaryRestrictions}`);
      }
      if (parts.length > 0) {
        anthropoContext = `\n\n[DADOS ANTROPOMÉTRICOS DA PACIENTE]\n${parts.join('\n')}`;
      }
    }

    // Meal plan generation flag — only adds the structuredMealPlan field when nutri requests it
    const mealPlanInstruction = generateMealPlan ? `

[GERAÇÃO DE PLANO ALIMENTAR ESTRUTURADO]
A nutricionista solicitou geração de um plano alimentar estruturado. Inclua o campo "structuredMealPlan" no JSON de resposta com a estrutura abaixo:

{
  "meals": [
    {
      "name": "Café da manhã",
      "time": "07:00",
      "items": [
        {
          "food": "1 fatia de pão integral",
          "category": "carbo",
          "kcal": 80,
          "prot_g": 4,
          "carb_g": 14,
          "fat_g": 1,
          "substitutions": ["1 tapioca pequena", "2 colheres de aveia em flocos", "1/2 batata-doce cozida (100g)"]
        },
        {
          "food": "1 ovo mexido",
          "category": "proteina",
          "kcal": 90,
          "prot_g": 6,
          "carb_g": 1,
          "fat_g": 7,
          "substitutions": ["50g de frango desfiado", "2 colheres de chia", "1/2 xícara de iogurte natural"]
        }
      ]
    }
  ],
  "notes": "Beber 2L de água ao dia. Evitar ultraprocessados.",
  "macroEstimate": { "calories": 1800, "protein": "90g", "carbs": "220g", "fat": "60g" }
}

Regras OBRIGATÓRIAS para structuredMealPlan:
- 5 refeições no padrão brasileiro: Café da manhã, Lanche da manhã, Almoço, Lanche da tarde, Jantar (pode ajustar para 4 ou 6 conforme contexto/treino)
- Cada refeição com 2-4 alimentos
- Cada alimento em "food" deve ter QUANTIDADE EM MEDIDA CASEIRA (ex: "1 fatia", "1 colher de sopa", "100g", "1 unidade média")
- "category" obrigatório, valores: "carbo", "proteina", "gordura", "fruta", "vegetal", "lacteo", "outro"
- "kcal", "prot_g", "carb_g", "fat_g" OBRIGATÓRIOS em CADA item (inteiros). Calcule item-a-item proporcional à quantidade escrita usando TBCA/TACO. macroEstimate.calories deve ser EXATAMENTE a soma dos kcal de todos os itens (não estime "no olho", some). Mesmo princípio para protein/carbs/fat.
- "substitutions" com 3-4 alternativas EQUIVALENTES em quantidade/calorias da MESMA categoria
  * Exemplo: se food é "1 banana média", substituições podem ser ["1 maçã grande", "1 fatia média de mamão", "8 morangos"] (todas frutas com porção similar)
  * NÃO sugira substituição de categoria diferente (ex: trocar carbo por proteína)
- Use alimentos COMUNS NO BRASIL: feijão, arroz, mandioca, cuscuz, tapioca, abacate, maracujá, aipim, etc.
- Considere obrigatoriamente as RESTRIÇÕES da paciente (vegetariana → não inclua carnes; sem lactose → não inclua leite/queijo)
- Considere o objetivo, treino e queixas relatadas
- Se houver dados antropométricos (peso, altura, idade), preencha "macroEstimate" com calorias e macros estimados; se não houver, OMITA o campo macroEstimate (não retorne null, simplesmente não inclua)
- "notes" é opcional, use para hidratação, suplementos, recomendações gerais
- Se a paciente tem PLANO ATIVO anexado, NÃO gere um plano novo — retorne null no campo structuredMealPlan e use o nutritionalConduct para sugerir ajustes ao plano existente

Quando NÃO solicitado, simplesmente NÃO inclua o campo structuredMealPlan no JSON.` : '';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured in .env file");
    }

    console.log(`🤖 Calling Google Gemini API (tone: ${selectedTone})...`);

    const systemPrompt = `
Você é uma nutricionista clínica experiente.
Seu papel é analisar a transcrição da consulta considerando que o paciente é um ser biopsicossocial,
ou seja, os sinais e queixas podem estar relacionados não apenas à alimentação,
mas também ao sono, estresse, emoções, rotina de trabalho, nível de atividade física,
relacionamentos, saúde mental e contexto de vida.

Tom da resposta: ${toneInstruction}

REGRA CRÍTICA DE FIDELIDADE — NÃO INVENTE NADA:
- Use APENAS informações que aparecem de forma clara e explícita na transcrição ou nos exames anexados.
- NÃO adicione sintomas, alimentos, queixas, rotinas ou hábitos que não foram mencionados.
- Se a paciente não disse algo, NÃO assuma. É melhor devolver uma análise curta e precisa do que detalhada e inventada.
- Se a transcrição tiver palavras que parecem erros de reconhecimento de voz (palavras cortadas, termos estranhos), tente interpretar pelo contexto, mas NÃO fabrique detalhes para preencher lacunas.
- Nos campos de listas (patientHighlights, extractedTraining, suggestedNextQuestions), se não há base na transcrição, retorne array vazio [].

Evite julgamentos, rótulos ou conclusões absolutas.
Trabalhe com hipóteses nutricionais e possíveis causas associadas.

Analise a transcrição e retorne APENAS um objeto JSON válido,
sem markdown, sem explicações externas, seguindo exatamente esta estrutura:

{
  "nutritionalAssessment": "síntese concisa (MÁX 3-4 frases) da avaliação nutricional principal",
  "clinicalRationale": "justificativa detalhada considerando alimentação, comportamento, rotina, emoções, sono, estresse e treino",
  "possibleAssociatedConditions": ["condição ou desequilíbrio possível 1", "condição ou desequilíbrio possível 2"],
  "recommendedExams": ["exame laboratorial ou avaliação complementar 1", "exame 2"],
  "nutritionalConduct": "orientações nutricionais iniciais e conduta recomendada",
  "patientFriendlyConduct": "Versão da conduta escrita diretamente PARA a paciente, em segunda pessoa, com tom acolhedor e justificativa baseada no contexto dela",
  "medicalReferralSummary": "Resumo técnico para encaminhamento médico, em linguagem clínica formal",
  "patientHighlights": ["frase curta relevante 1", "frase curta relevante 2"],
  "extractedTraining": [{"type": "Musculação", "frequency": "4x/semana"}],
  "suggestedNextQuestions": ["sugestão 1", "sugestão 2", "sugestão 3"],
  "adherenceProbability": "alta",
  "behavioralProfile": "resistente"
}

Regras para o campo nutritionalAssessment:
- MÁXIMO 3-4 frases, síntese concisa
- Escrito em terceira pessoa sobre a paciente (ex: "A paciente apresenta..." e não "Você apresenta...")

Regras para o campo patientHighlights:
- Extraia pontos-chave mencionados na conversa
- Escreva sempre em TERCEIRA PESSOA sobre a paciente (ex: "Tem filhos, rotina corrida" — NUNCA "Tenho filhos")
- Exemplos válidos: "Não gosta de carne vermelha", "Dorme 5h por noite", "Intolerante à lactose", "Come por ansiedade"
- NÃO inclua informações sobre treino/atividade física aqui (use o campo extractedTraining)
- Máximo 8 palavras por item
- Extraia apenas o que foi dito, não invente

Regras para o campo extractedTraining:
- Extraia qualquer menção a atividade física / treino estruturado do paciente
- Formato: array de objetos { "type": "nome da atividade", "frequency": "frequência" }
- Exemplos: [{"type": "Musculação", "frequency": "4x/semana"}], [{"type": "Corrida", "frequency": "3x/semana"}, {"type": "Yoga", "frequency": "1x/semana"}]
- Se paciente disser que NÃO treina, retorne: [{"type": "Sedentária", "frequency": "não treina"}]
- Se não mencionar nada sobre treino, retorne array vazio []

Regras para o campo suggestedNextQuestions:
- Gere NO MÁXIMO 3 sugestões ESTRATÉGICAS e ACIONÁVEIS para a nutri usar na próxima consulta
- IMPORTANTE: escreva AS SUGESTÕES DIRIGIDAS À NUTRI, falando SOBRE a paciente em terceira pessoa
  * CORRETO: "Investigar o que ELA considera 'vitamina' — entender os ingredientes pode revelar oportunidades de aumentar proteínas"
  * ERRADO: "Vamos conversar sobre o que VOCÊ considera vitamina"
- Cada sugestão combina uma recomendação/pergunta COM justificativa clínica breve (1-2 linhas)
- NÃO repita conteúdo do clinicalRationale ou nutritionalConduct
- Exemplos do estilo esperado:
  * "Investigar se ela gosta de beterraba — rica em ferro, compensaria a baixa ingestão de carne vermelha e pode aliviar o cansaço relatado"
  * "Perguntar sobre qualidade do sono dela após o ajuste do jantar — alimentação noturna pesada pode estar impactando a recuperação"
  * "Explorar com ela estratégias de meal prep — a rotina corrida dificulta refeições saudáveis, e pequenos preparos antecipados podem facilitar a adesão"
- Se a transcrição for muito curta, retorne array vazio []

Regras para o campo adherenceProbability:
- Valor obrigatório: "alta", "média" ou "baixa" (minúsculo)
- Baseie-se em sinais: comprometimento com autocuidado, histórico de seguir planos, organização, motivação demonstrada, pressão de tempo, nível de conhecimento
- Se não há dados suficientes para inferir, use "média"

Regras para o campo behavioralProfile:
- UMA ÚNICA PALAVRA (adjetivo) descrevendo o perfil comportamental
- Exemplos: "resistente", "motivada", "ansiosa", "oscilante", "comprometida", "analítica", "impulsiva", "conservadora", "ambivalente"
- Escolha o adjetivo mais representativo com base na fala/postura da paciente
- Se não há dados suficientes, retorne "neutra"

Regras para o campo patientFriendlyConduct (CRÍTICO):
- Escreva DIRETAMENTE PARA A PACIENTE em SEGUNDA PESSOA ("você") — NUNCA em terceira pessoa
- Tom acolhedor, motivacional e empático, como se fosse uma conversa pessoal
- Comece justificando com base no contexto que ela trouxe (ex: "Já que você está com um bebê recém-nascido em casa e relatou pouco tempo, vamos seguir assim:")
- Em seguida, dê 3 a 5 ações práticas e claras (use bullets implícitos no texto, ou numeração 1, 2, 3 dentro do texto)
- Linguagem simples, SEM jargão técnico (evite "macronutrientes", "ingestão proteica", "índice glicêmico" — use "proteínas", "comer", "açúcar no sangue")
- 4 a 8 frases no total
- Termine com uma palavra de incentivo curta
- NÃO mencione hipóteses clínicas, diagnósticos diferenciais, exames laboratoriais ou condições médicas — isso é só pra nutri
- NÃO repita o nutritionalConduct literalmente; é uma reformulação humanizada

Regras para o campo medicalReferralSummary:
- Escreva em LINGUAGEM CLÍNICA FORMAL, dirigida ao médico (não à paciente)
- Estrutura sugerida (3 parágrafos curtos):
  * Parágrafo 1: identificação e queixa principal — "Paciente do sexo feminino, [idade se mencionada], em acompanhamento nutricional, apresenta [queixa principal] associada a [contexto relevante: rotina, treino, sono, etc.]"
  * Parágrafo 2: hipóteses clínicas e achados objetivos — citar dados de exames laboratoriais quando disponíveis (com valores), referir hipóteses de desequilíbrios (ex: "sugestivo de anemia ferropriva", "perfil compatível com SOP", "padrão de inflamação subclínica")
  * Parágrafo 3: solicitação de avaliação — "Solicito avaliação especializada para [conduta esperada do médico: confirmação diagnóstica, prescrição, exames complementares]. Encaminho para esclarecimento e conduta médica conforme indicação clínica."
- Use terminologia técnica apropriada (ex: "ferritina", "TSH", "perfil glicêmico", "dislipidemia", "disautonomia")
- NÃO inclua a conduta nutricional já realizada — o médico tem o plano se precisar
- 6 a 12 frases no total
- Tom profissional e objetivo, sem floreio emocional
- Se a paciente claramente não precisa de encaminhamento médico (queixas estritamente nutricionais sem sinais de alarme), retorne string vazia ""

Se alguma informação estiver ausente na transcrição,
mencione a necessidade de investigação adicional dentro do campo apropriado,
sem inventar dados.
`;

    const prompt = `${systemPrompt}${mealPlanInstruction}\n\nTranscrição da consulta:\n${transcript}${anthropoContext}${examsContext}${mealPlanContext}`;

    // Use Google AI Studio API - Gemini 2.0 Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(JSON.stringify(errorData));
    }

    const result = await response.json();
    console.log("API Response structure:", JSON.stringify(result, null, 2));

    // Handle different response formats
    let text;
    if (result.candidates && result.candidates.length > 0 && result.candidates[0]) {
      const content = result.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        text = content.parts[0].text;
      } else {
        console.error("Response content:", JSON.stringify(content, null, 2));
        throw new Error("Response has no parts - model may have hit token limit. FinishReason: " + (result.candidates[0].finishReason || "UNKNOWN"));
      }
    } else if (result.text) {
      text = result.text;
    } else {
      throw new Error("Unexpected API response format: " + JSON.stringify(result));
    }

    // Parse JSON response
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    console.log("✅ Gemini analysis completed successfully!");

    res.json(aiResponse);

  } catch (error) {
    console.error("Erro na análise nutricional:", error);
    res.status(500).json({
      error: "Erro ao processar análise",
      details: error.message
    });
  }
});

// Recalculate macros for a structured meal plan after the nutri edited items/quantities.
// Strategy: reuse the cached per-item breakdown for unchanged items (string-exact match
// on `food`), and only ask the LLM about NEW or CHANGED items. Then sum deterministically.
// This avoids the drift you get when the LLM re-estimates the entire plan on every recalc.
app.post('/api/recalculate-macros', apiLimiter, requireAuth, async (req, res) => {
  try {
    const { mealPlan, previousBreakdown } = req.body;
    if (!mealPlan || !Array.isArray(mealPlan.meals) || mealPlan.meals.length === 0) {
      return res.status(400).json({ error: 'mealPlan inválido ou vazio' });
    }

    // Build cache: food string -> breakdown entry from the previous calculation.
    const cache = new Map();
    if (Array.isArray(previousBreakdown)) {
      for (const entry of previousBreakdown) {
        if (entry && typeof entry.food === 'string') {
          cache.set(entry.food, entry);
        }
      }
    }

    // Collect all current item foods, identify which need fresh estimation.
    const allFoods = [];
    const foodsToEstimate = new Set();
    for (const meal of mealPlan.meals) {
      for (const item of meal.items || []) {
        if (!item || !item.food) continue;
        allFoods.push(item.food);
        if (!cache.has(item.food)) {
          foodsToEstimate.add(item.food);
        }
      }
    }

    // If there are new foods, ask the LLM to estimate ONLY those.
    if (foodsToEstimate.size > 0) {
      const toEstimate = Array.from(foodsToEstimate);
      const prompt = `Você é nutricionista clínica brasileira. Para cada item da lista abaixo, estime calorias e macros NA QUANTIDADE EXATAMENTE como foi escrita. Use TBCA/TACO como referência.

PROCEDIMENTO OBRIGATÓRIO (siga passo a passo):
1) Identifique a QUANTIDADE NUMÉRICA literal (ex: "20g", "30 colheres", "1 fatia"). Trate gramas/ml conforme escrito.
2) Encontre o valor por 100g (ou por porção padrão) na TBCA/TACO.
3) Calcule proporcionalmente: kcal_total = (kcal_por_100g × gramas) / 100. Faça igual pra prot/carb/gordura.

REGRAS DE PORÇÃO (apenas se NÃO houver quantidade explícita):
- 1 copo = 200 ml
- 1 fatia de pão = 30 g
- 1 colher de sopa = 15 ml/g
- 1 unidade média (fruta) = 120 g
- 1 unidade ovo = 50 g
- 1 xícara cozido = 150 g

REFERÊNCIA RÁPIDA (kcal por 100g — use como sanity check):
- queijo minas frescal: ~240 kcal/100g | mussarela: ~280 | requeijão: ~280
- pão francês: ~270 | pão integral: ~250 | tapioca seca: ~360 (hidratada cai p/ ~100)
- arroz branco cozido: ~130 | feijão cozido: ~75 | aveia em flocos: ~370
- frango grelhado peito: ~165 | ovo: ~150 | iogurte natural: ~60
- banana: ~90 | maçã: ~50 | manteiga: ~720 | azeite: ~880
- leite integral: ~60 (por 100ml) | leite desnatado: ~35

REGRAS CRÍTICAS:
1. Para QUANTIDADES PEQUENAS (ex: "20g de queijo"), o resultado deve ser PROPORCIONAL: 20g de queijo minas = (240 × 20) / 100 = ~48 kcal. NÃO inflacione.
2. Para QUANTIDADES GRANDES, vale o mesmo escalonamento. Nunca normalize pra um intake típico.
3. NÃO ajuste para nenhum alvo metabólico. Cada item é independente.
4. Limite físico: NUNCA ultrapasse 9 kcal por grama (limite teórico de gordura pura).

[ITENS]
${toEstimate.map((f) => `- ${f}`).join('\n')}

Antes de cada item, faça os 3 passos do PROCEDIMENTO mentalmente. Confira se kcal/g do resultado faz sentido (queijo ~2.4, gorduras ~9, frutas ~0.5, pão ~2.7).

Responda APENAS JSON puro neste schema (uma entrada por item, na mesma ordem):
{
  "items": [
    { "food": "<exatamente como recebido>", "kcal": <int>, "prot_g": <int>, "carb_g": <int>, "fat_g": <int> }
  ]
}`;

      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      const text = result.text || result.response?.text() || '';
      const clean = String(text).replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      // Sanity check: try to extract a gram weight from the food string and
      // clamp kcal at <=9 kcal/g (theoretical max for pure fat). If the LLM
      // wildly over-estimates a small-quantity item, this caps it.
      const extractGrams = (food) => {
        const s = String(food).toLowerCase();
        const gMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramas?\b)/);
        if (gMatch) return parseFloat(gMatch[1].replace(',', '.'));
        const mlMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:ml\b|mililitros?\b)/);
        if (mlMatch) return parseFloat(mlMatch[1].replace(',', '.')); // assume 1ml ~= 1g for liquids
        return null;
      };

      for (const entry of items) {
        if (!entry || typeof entry.food !== 'string') continue;
        let kcalEntry = Math.round(Number(entry.kcal) || 0);
        const protEntry = Math.round(Number(entry.prot_g) || 0);
        const carbEntry = Math.round(Number(entry.carb_g) || 0);
        const fatEntry = Math.round(Number(entry.fat_g) || 0);
        const grams = extractGrams(entry.food);
        if (grams != null && grams > 0) {
          const maxKcal = Math.ceil(grams * 9); // theoretical max (pure fat)
          if (kcalEntry > maxKcal) {
            console.warn(`[recalc] Clamping ${entry.food}: ${kcalEntry} kcal -> ${maxKcal} kcal (max ${grams}g × 9)`);
            kcalEntry = maxKcal;
          }
        }
        cache.set(entry.food, {
          food: entry.food,
          kcal: kcalEntry,
          prot_g: protEntry,
          carb_g: carbEntry,
          fat_g: fatEntry,
        });
      }
    }

    // Build the final breakdown from the current items (in order), using cache.
    const breakdown = [];
    let kcal = 0, prot = 0, carb = 0, fat = 0;
    for (const food of allFoods) {
      const entry = cache.get(food);
      if (!entry) continue;
      breakdown.push(entry);
      kcal += Number(entry.kcal) || 0;
      prot += Number(entry.prot_g) || 0;
      carb += Number(entry.carb_g) || 0;
      fat += Number(entry.fat_g) || 0;
    }

    res.json({
      macroEstimate: {
        calories: Math.round(kcal),
        protein: `${Math.round(prot)}g`,
        carbs: `${Math.round(carb)}g`,
        fat: `${Math.round(fat)}g`,
      },
      macroBreakdown: breakdown,
    });
  } catch (error) {
    console.error('Erro ao recalcular macros:', error);
    res.status(500).json({ error: 'Erro ao recalcular macros' });
  }
});

// ====================================================================
// Audio transcription (Phase 2 #6) — async job + polling pattern.
// ====================================================================
// Uploaded audio (Zoom/Meet/iPhone/Android recordings) is sent to Gemini's
// File API, transcribed in Portuguese, and the resulting transcript flows
// into the same downstream pipeline as live recording.
//
// Why async polling instead of synchronous: a 2:30h audio takes 5-15 min
// to transcribe end-to-end. Holding an HTTP connection open that long is
// unreliable across Render free + Cloudflare + browser timeouts. We
// return a jobId immediately and the frontend polls.
//
// The job store is in-memory: if Render spins down, in-flight jobs are
// lost. That's acceptable for MVP because the nutri waits on the page
// during transcription — losing a job means re-uploading. A persistent
// queue (Firestore + worker) is a post-launch upgrade.
// ====================================================================

const TRANSCRIPTION_JOBS = new Map();
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Periodic cleanup so the in-memory map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of TRANSCRIPTION_JOBS) {
    if (now - job.createdAt > JOB_TTL_MS) TRANSCRIPTION_JOBS.delete(id);
  }
}, 5 * 60 * 1000);

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 8);
      cb(null, `echomed_audio_${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB — fits ~2:30h of compressed audio
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ok =
      /^audio\//.test(file.mimetype) ||
      /^video\//.test(file.mimetype) || // mp4 from Zoom/Meet recordings
      /\.(mp3|m4a|mp4|wav|webm|ogg|aac|flac)$/i.test(file.originalname || '');
    if (!ok) return cb(new Error('Formato de áudio não suportado'));
    cb(null, true);
  },
});

// Lighter rate limit for audio uploads (heavier per-request, fewer per minute).
const audioLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 4,
  message: { error: 'Muitos uploads de áudio. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function processTranscriptionJob(jobId, file) {
  const job = TRANSCRIPTION_JOBS.get(jobId);
  if (!job) return;
  try {
    // 1. Upload to Gemini File API. The SDK handles the multipart upload
    // and resumable protocol behind the scenes.
    const uploaded = await genAI.files.upload({
      file: file.path,
      config: {
        mimeType: file.mimetype || 'audio/mpeg',
        displayName: file.originalname || 'echomed_audio',
      },
    });

    // 2. Wait for the file to leave PROCESSING. Audio normally takes 2-15s
    // to be ready depending on length. Poll fast (500ms) — these calls are
    // tiny and the user is waiting on the page.
    let f = uploaded;
    const pollDeadline = Date.now() + 5 * 60 * 1000; // 5 min cap on processing
    while (f.state === 'PROCESSING') {
      if (Date.now() > pollDeadline) throw new Error('Timeout aguardando processamento do arquivo no Gemini');
      await new Promise((r) => setTimeout(r, 500));
      f = await genAI.files.get({ name: uploaded.name });
    }
    if (f.state !== 'ACTIVE') {
      throw new Error(`Arquivo ficou em estado inválido: ${f.state}`);
    }

    // 3. Transcribe via generateContent referencing the file URI.
    const transcribePrompt = `Transcreva o áudio em português brasileiro de forma fiel, preservando expressões coloquiais e mantendo a fala da paciente e da nutricionista.

REGRAS:
- Não invente conteúdo. Se uma parte estiver inaudível, escreva [inaudível].
- Não resuma — transcreva o que foi dito.
- Use pontuação natural (vírgula, ponto, interrogação) para facilitar leitura.
- Não inclua marcações de tempo nem identificação de falante (ex: "[00:32]" ou "Nutri:") — apenas a fala corrida.
- Corrija apenas erros óbvios de pronúncia (sem alterar o sentido).

Responda APENAS com a transcrição (texto puro, sem JSON, sem markdown).`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: createUserContent([
        createPartFromUri(f.uri, f.mimeType),
        transcribePrompt,
      ]),
    });

    const transcript = (result.text || result.response?.text() || '').trim();
    if (!transcript) throw new Error('Gemini retornou transcrição vazia');

    // 4. Clean up the Gemini file (don't pile up in storage).
    try {
      await genAI.files.delete({ name: uploaded.name });
    } catch (cleanupErr) {
      console.warn('[transcribe] Failed to delete Gemini file:', cleanupErr.message);
    }

    job.status = 'done';
    job.transcript = transcript;
  } catch (err) {
    console.error('[transcribe] Job failed:', err);
    job.status = 'failed';
    job.error = err?.message || 'Erro ao transcrever áudio';
  } finally {
    // Always remove the local temp file
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
}

// Multer error handler — turns Multer errors into JSON the frontend can parse.
function handleAudioUploadErrors(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo maior que 200MB. Comprima o áudio antes de enviar.' });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(400).json({ error: err.message || 'Erro ao processar upload' });
}

// POST /api/transcribe-audio — start a transcription job.
app.post(
  '/api/transcribe-audio',
  audioLimiter,
  requireAuth,
  (req, res, next) => {
    audioUpload.single('audio')(req, res, (err) => {
      if (err) return handleAudioUploadErrors(err, req, res, next);
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Arquivo de áudio ausente' });

    const jobId = crypto.randomUUID();
    TRANSCRIPTION_JOBS.set(jobId, {
      status: 'processing',
      uid: req.user?.uid,
      createdAt: Date.now(),
    });

    // Fire-and-forget: the worker reports back into the in-memory job entry.
    processTranscriptionJob(jobId, req.file).catch((err) => {
      console.error('[transcribe] Unexpected worker crash:', err);
    });

    res.json({ jobId });
  }
);

// GET /api/transcribe-audio/:jobId — poll for status.
app.get('/api/transcribe-audio/:jobId', requireAuth, (req, res) => {
  const job = TRANSCRIPTION_JOBS.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job não encontrado ou expirado' });
  // Only the user who started the job can read it.
  if (job.uid && job.uid !== req.user?.uid) return res.status(403).json({ error: 'Acesso negado' });

  const payload = { status: job.status };
  if (job.status === 'done') payload.transcript = job.transcript;
  if (job.status === 'failed') payload.error = job.error;
  res.json(payload);

  // Once the client picked up the result, free the slot.
  if (job.status === 'done' || job.status === 'failed') {
    TRANSCRIPTION_JOBS.delete(req.params.jobId);
  }
});

// Endpoint legado para nutrição
app.post('/api/analyze', apiLimiter, requireAuth, async (req, res) => {
  try {
    const { audioBase64, textPreview } = req.body;

    const prompt = `
      Você é um assistente especializado em nutrição clínica.
      Recebi uma transcrição de consulta: "${textPreview}"

      Sua tarefa:
      1. Corrigir erros de português da transcrição.
      2. Gerar uma análise clínica estruturada.

      Responda APENAS com um objeto JSON seguindo exatamente este modelo:
      {
        "formattedTranscript": "Texto corrigido",
        "diagnosisResult": {
          "diagnosis": "Título do Diagnóstico",
          "aiReading": "Explicação detalhada",
          "protocols": ["Protocolo 1", "Protocolo 2"],
          "attentionPoints": ["Ponto 1"],
          "hypotheses": [
             {"category": "Metabolismo", "description": "..."}
          ]
        }
      }
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.text || result.response?.text() || JSON.stringify(result);
    const cleanJson = text.replace(/```json|```/g, "").trim();
    res.json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("Erro na API:", error);
    res.status(500).json({ error: "Erro interno no servidor de IA" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de IA rodando em http://localhost:${PORT}`);
});