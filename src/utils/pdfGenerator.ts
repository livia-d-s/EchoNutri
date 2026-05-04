// PDF generator using pdfmake (dynamic import keeps initial bundle small)

interface NutriProfile {
  name?: string;
  specialty?: string;
  crm?: string;
  logoUrl?: string | null;
  brandColor?: string;
}

interface AnalysisResult {
  nutritionalAssessment?: string;
  clinicalRationale?: string;
  recommendedExams?: string[];
  nutritionalConduct?: string;
  patientFriendlyConduct?: string;
  medicalReferralSummary?: string;
  possibleAssociatedConditions?: string[];
  structuredMealPlan?: any;
}

const DEFAULT_BRAND = '#2563EB';

const formatDate = (d: any): string => {
  try {
    if (!d) return '';
    let date: Date;
    if (d.toDate) date = d.toDate();
    else if (d.seconds) date = new Date(d.seconds * 1000);
    else date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '';
  }
};

const sanitize = (s: string): string => s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

// Parse conduct text into clean numbered/sequential items (mirrors the in-app logic)
const parseSteps = (text?: string): string[] => {
  if (!text) return [];
  const numberedPattern = /\d+\.\s*/;
  if (numberedPattern.test(text)) {
    return text.split(numberedPattern).filter((s) => s.trim().length > 0);
  }
  if (text.includes(';')) {
    return text.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  const sentences = text.split(/\.\s+/).filter((s) => s.trim().length > 10);
  return sentences.length > 1 ? sentences : [text];
};

// Lazy loader for pdfmake (~600KB chunk; only loaded when nutri actually downloads)
async function loadPdfMake(): Promise<any> {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake' as any),
    import('pdfmake/build/vfs_fonts' as any),
  ]);
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;

  // pdfmake's vfs_fonts module shape varies across versions and bundlers
  // (0.2.x: {pdfMake:{vfs}}, 0.3.x: object with .ttf keys, ESM interop may
  // wrap it under .default). Merge every plausible source — any .ttf keys
  // we find go into our vfs.
  const fonts: any = fontsModule;
  const candidates: any[] = [
    fonts,
    fonts?.default,
    fonts?.vfs,
    fonts?.pdfMake?.vfs,
    fonts?.default?.pdfMake?.vfs,
    fonts?.default?.vfs,
  ].filter((c) => c && typeof c === 'object');

  const vfs: Record<string, string> = {};
  for (const cand of candidates) {
    for (const [k, v] of Object.entries(cand)) {
      if (k.endsWith('.ttf') && typeof v === 'string' && !vfs[k]) {
        vfs[k] = v;
      }
    }
  }

  if (Object.keys(vfs).length === 0) {
    console.warn('pdfmake: no font .ttf entries found in vfs_fonts module — PDF will fail');
  }
  pdfMake.vfs = vfs;

  // Explicit font config so pdfmake knows exactly which file to use for each
  // weight/style. Avoids "Roboto-Medium.ttf not found" when bold text is rendered.
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  return pdfMake;
}

// Use pdfmake's native download. Append a timestamp to filename to avoid
// browsers deduping/blocking successive downloads with identical names.
function downloadPdf(pdfMake: any, docDef: any, fileName: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const finalName = fileName.replace(/\.pdf$/, `_${ts}.pdf`);
  pdfMake.createPdf(docDef).download(finalName);
}

function buildHeader(profile: NutriProfile, brand: string): any[] {
  const profileText: any[] = [
    { text: profile.name || 'Nutricionista', style: 'nutriName' },
  ];
  const specialtyParts: string[] = [];
  if (profile.specialty) specialtyParts.push(profile.specialty);
  if (profile.crm) specialtyParts.push(`CRN ${profile.crm}`);
  if (specialtyParts.length > 0) {
    profileText.push({ text: specialtyParts.join('  •  '), style: 'nutriDetails' });
  }

  const headerColumns: any = {
    columns: [
      // Left: logo (if any)
      profile.logoUrl
        ? {
            image: profile.logoUrl,
            fit: [110, 50],
            alignment: 'left',
            width: 'auto',
          }
        : { text: '', width: 'auto' },
      // Right: nutri info, right-aligned
      {
        stack: profileText,
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 12],
  };

  return [
    headerColumns,
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: brand },
      ],
      margin: [0, 0, 0, 16],
    },
  ];
}

function buildPatientBlock(patientName: string, dateStr: string, brand: string): any {
  return {
    columns: [
      {
        stack: [
          { text: 'PACIENTE', style: 'tinyLabel', color: brand },
          { text: patientName, style: 'patientName' },
        ],
      },
      {
        stack: [
          { text: 'DATA', style: 'tinyLabel', color: brand, alignment: 'right' },
          { text: dateStr, style: 'patientName', alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 24],
  };
}

function commonStyles(brand: string): Record<string, any> {
  return {
    nutriName: { fontSize: 12, bold: true, color: '#0F172A' },
    nutriDetails: { fontSize: 9, color: '#64748B' },
    documentTitle: {
      fontSize: 22,
      bold: true,
      color: brand,
      margin: [0, 0, 0, 6],
    },
    sectionHeader: {
      fontSize: 9,
      bold: true,
      color: brand,
      characterSpacing: 1.5,
      margin: [0, 14, 0, 6],
    },
    tinyLabel: {
      fontSize: 7,
      bold: true,
      characterSpacing: 1.5,
    },
    patientName: { fontSize: 13, bold: true, color: '#0F172A' },
    body: { fontSize: 11, color: '#334155', lineHeight: 1.5 },
    examItem: { fontSize: 11, color: '#0F172A', margin: [0, 0, 0, 4] },
    priorityBadge: { fontSize: 8, bold: true, characterSpacing: 1.2, color: '#0F172A' },
    footer: { fontSize: 7, color: '#94A3B8', alignment: 'center' },
    disclaimer: { fontSize: 8, color: '#94A3B8', italics: true, margin: [0, 16, 0, 0] },
  };
}

function buildFooter(brand: string): any {
  return (currentPage: number, pageCount: number) => ({
    columns: [
      { text: 'Gerado via EchoNutri', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
      { text: `${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] },
    ],
    margin: [0, 16, 0, 0],
    color: brand,
  });
}

export async function generateExamRequestPdf(
  result: AnalysisResult,
  patientName: string,
  consultationDate: any,
  profile: NutriProfile,
): Promise<void> {
  const brand = profile.brandColor || DEFAULT_BRAND;
  const exams = result.recommendedExams || [];
  const dateStr = formatDate(consultationDate) || formatDate(new Date());

  const examPriorityLabel = (i: number): string => {
    if (i === 0) return 'Alta';
    if (i === 1) return 'Média';
    return 'Complementar';
  };

  // B&W priority pill: thin black outline, black uppercase text — clinical look
  const examTable = {
    table: {
      widths: ['*', 'auto'],
      body: [
        ...exams.map((exam, i) => [
          { text: `•  ${exam}`, style: 'examItem', margin: [0, 8, 0, 8] },
          {
            text: examPriorityLabel(i).toUpperCase(),
            style: 'priorityBadge',
            alignment: 'center',
            margin: [10, 8, 10, 8],
          },
        ]),
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#E2E8F0',
      paddingLeft: () => 0,
      paddingRight: () => 0,
    },
  };

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      ...buildHeader(profile, brand),
      { text: 'PEDIDO DE EXAMES', style: 'tinyLabel', color: brand },
      { text: 'Solicitação Laboratorial', style: 'documentTitle' },
      buildPatientBlock(patientName || 'Paciente', dateStr, brand),
      { text: 'Solicito a realização dos seguintes exames:', style: 'body', margin: [0, 0, 0, 14] },
      exams.length > 0
        ? examTable
        : { text: 'Nenhum exame foi sugerido nesta análise.', style: 'body', italics: true },
      {
        text:
          'Após a coleta dos resultados, a paciente deverá retornar para reavaliação e ajuste do plano nutricional.',
        style: 'body',
        margin: [0, 24, 0, 0],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 8, x2: 240, y2: 8, lineWidth: 0.5, lineColor: '#94A3B8' }],
        margin: [0, 80, 0, 4],
      },
      { text: profile.name || 'Nutricionista', style: 'patientName' },
      {
        text: [
          profile.specialty || '',
          profile.crm ? `  •  CRN ${profile.crm}` : '',
        ].join(''),
        style: 'nutriDetails',
      },
    ],
    styles: commonStyles(brand),
    footer: buildFooter(brand),
    defaultStyle: { font: 'Roboto' },
  };

  const pdfMake = await loadPdfMake();
  const fileName = `Pedido_Exames_${sanitize(patientName || 'paciente')}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  downloadPdf(pdfMake, docDef, fileName);
}

export async function generateConductPdf(
  result: AnalysisResult,
  patientName: string,
  consultationDate: any,
  profile: NutriProfile,
): Promise<void> {
  const brand = profile.brandColor || DEFAULT_BRAND;
  const dateStr = formatDate(consultationDate) || formatDate(new Date());

  // Patient-facing conduct: prefer the AI's friendly version; fall back to
  // a soft rephrasing of the technical conduct only if the new field isn't
  // available (e.g. older consultations generated before this prompt).
  const friendlyText = (result.patientFriendlyConduct || '').trim();

  const conductBody: any[] = friendlyText
    ? [{ text: friendlyText, style: 'patientBody' }]
    : (() => {
        const steps = parseSteps(result.nutritionalConduct);
        if (steps.length === 0) {
          return [{ text: 'Sem orientações registradas.', style: 'patientBody', italics: true }];
        }
        return [{
          ol: steps.map((s) => ({
            text: s.trim().replace(/\.$/, ''),
            margin: [0, 0, 0, 8],
          })),
          style: 'patientBody',
        }];
      })();

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      ...buildHeader(profile, brand),
      { text: 'PARA VOCÊ', style: 'tinyLabel', color: brand },
      { text: 'Suas orientações da consulta', style: 'documentTitle' },
      buildPatientBlock(patientName || 'Paciente', dateStr, brand),

      { text: 'O QUE COMBINAMOS', style: 'sectionHeader' },
      ...conductBody,

      {
        text:
          'Em caso de dúvidas, fale com sua nutricionista. Estes são pontos práticos do que conversamos.',
        style: 'disclaimer',
      },
    ],
    styles: {
      ...commonStyles(brand),
      patientBody: { fontSize: 12, color: '#1E293B', lineHeight: 1.6 },
    },
    footer: buildFooter(brand),
    defaultStyle: { font: 'Roboto' },
  };

  const pdfMake = await loadPdfMake();
  const fileName = `Conduta_${sanitize(patientName || 'paciente')}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  downloadPdf(pdfMake, docDef, fileName);
}

export async function generateMedicalReferralPdf(
  result: AnalysisResult,
  patientName: string,
  consultationDate: any,
  profile: NutriProfile,
): Promise<void> {
  const brand = profile.brandColor || DEFAULT_BRAND;
  const dateStr = formatDate(consultationDate) || formatDate(new Date());
  const summary = (result.medicalReferralSummary || '').trim();

  // Split into paragraphs for cleaner reading
  const paragraphs = summary
    ? summary.split(/\n{2,}|(?<=\.)\s{2,}/g).map((p) => p.trim()).filter(Boolean)
    : [];

  const exams = result.recommendedExams || [];

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 40],
    content: [
      ...buildHeader(profile, brand),
      { text: 'ENCAMINHAMENTO', style: 'tinyLabel', color: brand },
      { text: 'Resumo Clínico', style: 'documentTitle' },
      buildPatientBlock(patientName || 'Paciente', dateStr, brand),

      { text: 'Prezado(a) Colega,', style: 'body', margin: [0, 8, 0, 14] },

      ...(paragraphs.length > 0
        ? paragraphs.map((p) => ({
            text: p,
            style: 'body',
            margin: [0, 0, 0, 12],
            alignment: 'justify',
          }))
        : [
            {
              text:
                'Resumo de encaminhamento não disponível para esta consulta. Verifique se a análise gerou conteúdo clínico relevante.',
              style: 'body',
              italics: true,
            },
          ]),

      ...(exams.length > 0
        ? [
            { text: 'EXAMES SOLICITADOS PELA NUTRIÇÃO', style: 'sectionHeader' },
            {
              ul: exams.map((e) => ({ text: e, margin: [0, 0, 0, 4] })),
              style: 'body',
            },
          ]
        : []),

      {
        text:
          'Permaneço à disposição para troca de informações que possam contribuir com a conduta integrada.',
        style: 'body',
        margin: [0, 16, 0, 0],
      },

      {
        canvas: [{ type: 'line', x1: 0, y1: 8, x2: 240, y2: 8, lineWidth: 0.5, lineColor: '#94A3B8' }],
        margin: [0, 60, 0, 4],
      },
      { text: profile.name || 'Nutricionista', style: 'patientName' },
      {
        text: [
          profile.specialty || '',
          profile.crm ? `  •  CRN ${profile.crm}` : '',
        ].join(''),
        style: 'nutriDetails',
      },
    ],
    styles: commonStyles(brand),
    footer: buildFooter(brand),
    defaultStyle: { font: 'Roboto' },
  };

  const pdfMake = await loadPdfMake();
  const fileName = `Encaminhamento_${sanitize(patientName || 'paciente')}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  downloadPdf(pdfMake, docDef, fileName);
}

export async function generateMealPlanPdf(
  result: AnalysisResult,
  patientName: string,
  consultationDate: any,
  profile: NutriProfile,
): Promise<void> {
  const brand = profile.brandColor || DEFAULT_BRAND;
  const dateStr = formatDate(consultationDate) || formatDate(new Date());
  const plan = result.structuredMealPlan;

  if (!plan || !Array.isArray(plan.meals) || plan.meals.length === 0) {
    alert('Nenhum plano alimentar disponível para esta consulta. Gere um primeiro.');
    return;
  }

  // Build a meal table: meal name | items + substitutions
  const mealRows = plan.meals.map((meal: any) => {
    const itemsStack: any[] = [];
    (meal.items || []).forEach((item: any, idx: number) => {
      itemsStack.push({
        text: `•  ${item.food}`,
        style: 'mealItem',
        margin: [0, idx === 0 ? 0 : 4, 0, 0],
      });
      if (Array.isArray(item.substitutions) && item.substitutions.length > 0) {
        itemsStack.push({
          text: `Substituições: ${item.substitutions.join(' / ')}`,
          style: 'substitutions',
          margin: [12, 1, 0, 0],
        });
      }
    });
    return [
      {
        stack: [
          { text: meal.name, style: 'mealName' },
          meal.time ? { text: meal.time, style: 'mealTime' } : { text: '', style: 'mealTime' },
        ],
        margin: [0, 6, 0, 6],
      },
      { stack: itemsStack, margin: [8, 6, 0, 6] },
    ];
  });

  // Macros are intentionally omitted from the patient-facing PDF — the plan
  // is what the patient should follow; calorie/macro targets stay internal
  // to the nutri (visible only inside the app).

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      ...buildHeader(profile, brand),
      { text: 'PLANO ALIMENTAR', style: 'tinyLabel', color: brand },
      { text: 'Sugestão Nutricional', style: 'documentTitle' },
      buildPatientBlock(patientName || 'Paciente', dateStr, brand),

      { text: 'REFEIÇÕES', style: 'sectionHeader', margin: [0, 12, 0, 6] },
      {
        table: {
          widths: [110, '*'],
          body: mealRows,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#E2E8F0',
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
      },

      ...(plan.notes ? [
        { text: 'OBSERVAÇÕES', style: 'sectionHeader', margin: [0, 14, 0, 6] },
        { text: plan.notes, style: 'body' },
      ] : []),

      {
        text: 'Plano alimentar elaborado com apoio de inteligência artificial e revisado pela nutricionista.',
        style: 'disclaimer',
      },
    ],
    styles: {
      ...commonStyles(brand),
      mealName: { fontSize: 10, bold: true, color: brand, characterSpacing: 1.2 },
      mealTime: { fontSize: 9, color: '#64748B' },
      mealItem: { fontSize: 11, color: '#0F172A' },
      substitutions: { fontSize: 9, color: '#64748B', italics: true },
    },
    footer: buildFooter(brand),
    defaultStyle: { font: 'Roboto' },
  };

  const pdfMake = await loadPdfMake();
  const fileName = `Plano_Alimentar_${sanitize(patientName || 'paciente')}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  downloadPdf(pdfMake, docDef, fileName);
}
