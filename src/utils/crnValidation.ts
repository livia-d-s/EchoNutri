// Validação de FORMATO de CRN (Conselho Regional de Nutricionistas).
//
// Importante: validamos apenas que o texto digitado parece um CRN real
// (número de inscrição + UF ou região). NÃO validamos autenticidade junto
// ao CFN — isso é responsabilidade da nutricionista declarar e nossa
// posição contratual (Termos de Uso) já estabelece que a operadora
// não verifica registro profissional.
//
// O Brasil tem 11 regiões CRN (CRN-1 a CRN-11), cobrindo todos os estados.
// Formatos aceitos pela nutri no input:
//   "12345/SP"        — mais comum
//   "12345-SP"
//   "12345 SP"
//   "CRN-3 12345"     — formato oficial CFN
//   "CRN 3/12345"
//   "CRN3 12345"
//   "12345 / RJ"      — com espaços extras
//
// Saída canônica padronizada: "NNNNN/UF" (ex: "12345/SP").

const UF_CODES = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]);

// Mapa região CRN → UFs cobertas (referência CFN).
// Usamos pra inferir UF quando a nutri digita só "CRN-3 12345" sem UF
// — mas como uma região cobre múltiplos estados, exigimos UF se ela
// usar o formato oficial.
const CRN_REGIONS: Record<string, string[]> = {
  '1': ['DF', 'GO', 'MT', 'TO'],
  '2': ['RS'],
  '3': ['SP', 'MS'],
  '4': ['RJ', 'ES'],
  '5': ['BA', 'SE'],
  '6': ['AL', 'PB', 'PE', 'RN'],
  '7': ['AC', 'AM', 'AP', 'PA', 'RO', 'RR'],
  '8': ['PR'],
  '9': ['MG'],
  '10': ['SC'],
  '11': ['CE', 'MA', 'PI'],
};

// Flat optional shape (not a discriminated union) — see EmailValidationResult:
// the project isn't in strict mode, so the union wouldn't narrow on `.valid`.
export interface CrnValidationResult {
  valid: boolean;
  canonical?: string;
  number?: string;
  uf?: string;
  error?: string;
}

export function validateCrn(input: string): CrnValidationResult {
  const raw = String(input || '').trim();
  if (!raw) return { valid: false, error: 'Informe seu CRN.' };

  // Normalize: uppercase, collapse whitespace, allow common separators.
  const normalized = raw.toUpperCase().replace(/\s+/g, ' ').trim();

  // Mínimo de 4 dígitos: CRNs com menos do que isso são extremamente raros
  // (apenas registros muito antigos da década de 70/80) e quase sempre
  // indicam dado fake ou digitado errado. Limite máximo 6 cobre o intervalo
  // atual do CRN-3 (~80.000 inscritos).
  const MIN_DIGITS = 4;
  const MAX_DIGITS = 6;
  const NUMBER = `\\d{${MIN_DIGITS},${MAX_DIGITS}}`;

  // Pattern A: "NNNNN/UF" or "NNNNN-UF" or "NNNNN UF"
  let m = normalized.match(new RegExp(`^(${NUMBER})\\s*[\\/\\-\\s]\\s*([A-Z]{2})$`));
  if (m) {
    const [, number, uf] = m;
    if (!UF_CODES.has(uf)) {
      return { valid: false, error: `UF "${uf}" não é válida. Use a sigla do estado (ex: SP, RJ).` };
    }
    return { valid: true, canonical: `${number}/${uf}`, number, uf };
  }

  // Pattern B: "CRN-N NNNNN" or "CRN N/NNNNN" — region without explicit UF.
  // We accept it but flag that we couldn't infer UF — the canonical form
  // will be "CRN-N NNNNN" rather than "NNNNN/UF".
  m = normalized.match(new RegExp(`^CRN[\\s\\-]?(\\d{1,2})[\\s\\-\\/]+(${NUMBER})$`));
  if (m) {
    const [, region, number] = m;
    if (!CRN_REGIONS[region]) {
      return { valid: false, error: `Região CRN-${region} não existe. As regiões vão de CRN-1 a CRN-11.` };
    }
    const possibleUFs = CRN_REGIONS[region];
    if (possibleUFs.length === 1) {
      const uf = possibleUFs[0];
      return { valid: true, canonical: `${number}/${uf}`, number, uf };
    }
    // Region covers multiple states — keep canonical with the region and let
    // the nutri include the UF for precision.
    return {
      valid: false,
      error: `Inclua a UF (ex: "${number}/${possibleUFs[0]}") — a região CRN-${region} cobre ${possibleUFs.join(', ')}.`,
    };
  }

  // Pattern C: "CRN-N NNNNN/UF" — fully qualified.
  m = normalized.match(new RegExp(`^CRN[\\s\\-]?(\\d{1,2})[\\s\\-\\/]+(${NUMBER})\\s*[\\/\\-\\s]\\s*([A-Z]{2})$`));
  if (m) {
    const [, region, number, uf] = m;
    if (!CRN_REGIONS[region]) {
      return { valid: false, error: `Região CRN-${region} não existe.` };
    }
    if (!UF_CODES.has(uf)) {
      return { valid: false, error: `UF "${uf}" não é válida.` };
    }
    if (!CRN_REGIONS[region].includes(uf)) {
      return {
        valid: false,
        error: `UF ${uf} não pertence à região CRN-${region}. Verifique seu registro.`,
      };
    }
    return { valid: true, canonical: `${number}/${uf}`, number, uf };
  }

  // Mensagem de erro mais específica quando o número parece ser muito curto
  // (3 dígitos) — ajuda a nutri a perceber que faltou um dígito.
  const tooShort = normalized.match(/^(\d{1,3})\s*[\/\-\s]\s*[A-Z]{2}$/);
  if (tooShort) {
    return {
      valid: false,
      error: `Número de CRN parece curto (${tooShort[1].length} dígitos). CRNs reais têm pelo menos ${MIN_DIGITS} dígitos.`,
    };
  }

  return {
    valid: false,
    error: 'Formato inválido. Use "NNNNN/UF" (ex: 12345/SP).',
  };
}
