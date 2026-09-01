import { Patient, TimelineEvent, NutritionalAssessment } from '../../types';

// Paciente de demonstração mostrada só para visitantes em beta fechado.
// Vive em memória: NUNCA é escrita no Firestore, e o app bloqueia qualquer
// edição em cima do id 'demo-'. Serve pra pessoa ver como fica uma timeline
// de verdade — sem isso a tela de Pacientes chega vazia, já que só salvamos
// paciente quando existe resultado da IA (que o visitante não gera).
export const DEMO_PATIENT_ID = 'demo-maria-silva';

export const isDemoId = (id?: string | null): boolean => !!id && id.startsWith('demo-');

export const DEMO_PATIENT: Patient = {
  id: DEMO_PATIENT_ID,
  name: 'Maria Silva',
  phone: '(11) 98888-1234',
  email: 'maria.silva@exemplo.com.br',
  birthDate: '1991-04-22',
  createdAt: '2026-06-10T13:00:00.000Z',
  weightKg: 74.2,
  heightCm: 165,
  bodyFatPct: 31.4,
  leanMassPct: 62.1,
  dietaryRestrictions: 'Intolerância a lactose (leve)',
  goals: ['perda_gordura', 'saude_geral'],
  trainingRoutine: [
    { type: 'Musculação', frequency: '3x/semana' },
    { type: 'Caminhada', frequency: '2x/semana' },
  ],
  isFirstConsultation: false,
  highlights: [
    'Relata compulsão por doce no fim da tarde, principalmente em dias de trabalho puxado.',
    'Dorme em média 5h por noite e acorda cansada.',
    'Pula o almoço com frequência e come muito à noite.',
    'Já fez três dietas restritivas e recuperou o peso nas três.',
    'Melhora no inchaço desde que reduziu lactose.',
  ],
};

const initialResult: NutritionalAssessment = {
  nutritionalAssessment:
    'Paciente de 35 anos, com IMC 27,3 e percentual de gordura em 31,4%. Relata ganho de 8 kg nos últimos dois anos, coincidindo com mudança de cargo e aumento da carga de trabalho. O padrão alimentar é irregular: café da manhã ausente ou apenas café preto, almoço frequentemente pulado ou substituído por lanche rápido, e concentração calórica importante no período noturno, com episódios de compulsão por doce entre 16h e 18h.',
  clinicalRationale:
    'O quadro sugere que a compulsão vespertina é consequência, não causa: o déficit prolongado até o fim da tarde gera queda glicêmica e busca por açúcar de absorção rápida. Some-se a isso a privação de sono (média de 5h por noite), que desregula grelina e leptina e amplifica a fome hedônica. O histórico de três dietas restritivas com reganho reforça que a abordagem precisa ser de reconstrução de rotina alimentar, não de nova restrição.',
  possibleAssociatedConditions: [
    'Resistência à insulina em fase inicial',
    'Privação crônica de sono',
    'Intolerância à lactose (relato de melhora com redução)',
  ],
  recommendedExams: [
    'Hemograma completo',
    'Glicemia de jejum e insulina (HOMA-IR)',
    'TSH e T4 livre',
    'Vitamina D (25-OH)',
    'Ferritina',
  ],
  nutritionalConduct:
    'Prioridade um: garantir três refeições estruturadas por dia, com foco em não chegar às 16h em jejum desde o café. Café da manhã com proteína (ovos ou iogurte sem lactose), almoço com prato base (proteína + vegetais + carboidrato integral) mesmo em dias corridos, e um lanche da tarde planejado por volta das 15h30. Nenhum alimento foi proibido nesta etapa — o objetivo dos primeiros 30 dias é regularidade, não restrição. Higiene do sono trabalhada em paralelo: meta de 6h30 na primeira quinzena.',
};

const followupResult: NutritionalAssessment = {
  nutritionalAssessment:
    'Retorno após cinco semanas. Peso em 71,8 kg (−2,4 kg) e percentual de gordura em 29,8%. Relata que a compulsão do fim da tarde reduziu de forma expressiva: de quase diária para uma ou duas vezes por semana, concentradas nos dias em que pula o almoço. Sono subiu para média de 6h. Aderência ao lanche das 15h30 foi o fator que ela mesma aponta como decisivo.',
  clinicalRationale:
    'A correlação que a paciente identificou sozinha — compulsão apenas nos dias sem almoço — confirma a hipótese inicial e é clinicamente mais valiosa que a perda de peso em si, porque transfere o controle pra ela. A perda de 2,4 kg em cinco semanas está dentro da faixa sustentável e veio acompanhada de preservação de massa magra, o que indica que a estratégia de não restringir foi acertada.',
  possibleAssociatedConditions: [
    'Resistência à insulina em fase inicial (reavaliar com exames)',
  ],
  recommendedExams: ['Glicemia de jejum e insulina (HOMA-IR) — controle'],
  nutritionalConduct:
    'Manter a estrutura das três refeições. Ajuste desta consulta: preparar uma opção de almoço de emergência para os dias de agenda cheia, já que esses são os dias de risco identificados. Aumentar proteína no café da manhã para sustentar melhor a manhã. Musculação segue 3x/semana; incluir uma caminhada a mais na semana, sem meta de intensidade.',
};

export const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: 'demo-event-1',
    patientId: DEMO_PATIENT_ID,
    type: 'initial',
    date: '2026-06-10T13:00:00.000Z',
    createdAt: '2026-06-10T13:00:00.000Z',
    doctorName: 'Nutricionista',
    result: initialResult,
    transcript:
      'Nutricionista: Me conta como está sua rotina alimentar hoje.\nPaciente: Olha, é bem bagunçada. Eu acordo, tomo um café e já entro em reunião...',
    suggestedNextQuestions: [
      'Verificar se ela conseguiu manter o lanche das 15h30 nos dias de agenda cheia.',
      'Perguntar como está o sono depois das mudanças combinadas.',
      'Checar se a compulsão do fim da tarde mudou de frequência ou de intensidade.',
    ],
  },
  {
    id: 'demo-event-2',
    patientId: DEMO_PATIENT_ID,
    type: 'followup',
    date: '2026-07-15T13:00:00.000Z',
    createdAt: '2026-07-15T13:00:00.000Z',
    doctorName: 'Nutricionista',
    result: followupResult,
    transcript:
      'Nutricionista: E aí, como foram essas cinco semanas?\nPaciente: Muito melhor. Eu percebi uma coisa: só dava vontade de doce nos dias que eu não almoçava...',
    suggestedNextQuestions: [
      'Confirmar se a opção de almoço de emergência foi testada na prática.',
      'Reavaliar composição corporal e revisar os exames solicitados.',
    ],
  },
  {
    id: 'demo-event-3',
    patientId: DEMO_PATIENT_ID,
    type: 'adjustment',
    date: '2026-07-28T13:00:00.000Z',
    createdAt: '2026-07-28T13:00:00.000Z',
    doctorName: 'Nutricionista',
    parentEventId: 'demo-event-2',
    adjustmentNote:
      'Paciente relatou por mensagem que viajou a trabalho e ficou três dias sem conseguir seguir o plano. Combinado: retomar sem compensar, sem cortar nada da semana seguinte.',
  },
];
