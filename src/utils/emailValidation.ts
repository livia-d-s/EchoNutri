// Validação de formato de e-mail mais rígida que o type="email" nativo.
//
// O atributo HTML5 type="email" aceita coisas como "user@host.comm" ou
// "user@host.x" porque ele segue uma spec frouxa do WHATWG. Pra um SaaS
// pago não queremos isso — uma nutri que digita ".comm" provavelmente
// não vai receber o e-mail de confirmação e nunca completa a conta.
//
// Estratégia: regex de formato + whitelist dos TLDs mais comuns no Brasil
// e no contexto de e-mail profissional/pessoal. TLDs fora da lista são
// rejeitados (preferimos falso-negativo a um e-mail inalcançável).
//
// Verificação real de entregabilidade fica pra etapa de e-mail de
// confirmação (Firebase Auth sendEmailVerification), que será adicionada
// quando o fluxo de onboarding for desenhado.

// TLDs aceitos. Cobre 99%+ dos e-mails que uma nutri brasileira teria.
// Lista feita à mão pra evitar depender de pacote npm gigante.
const VALID_TLDS = new Set([
  // Brasil
  'br', 'com', 'net', 'org', 'edu', 'gov', 'mil', 'art',
  // Genéricos comuns
  'co', 'io', 'me', 'app', 'dev', 'tech', 'site', 'online',
  'health', 'club', 'pro', 'biz', 'info', 'name',
  // Países comuns no contexto profissional
  'us', 'uk', 'eu', 'pt', 'es', 'fr', 'de', 'it', 'ar', 'mx',
  'ca', 'au', 'nz', 'jp', 'cn', 'in', 'cl', 'co',
]);

// Regex baseado no RFC 5322 simplificado — cobre o que usuários reais digitam.
const EMAIL_FORMAT = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export type EmailValidationResult =
  | { valid: true; canonical: string }
  | { valid: false; error: string };

export function validateEmail(input: string): EmailValidationResult {
  const raw = String(input || '').trim();
  if (!raw) return { valid: false, error: 'Informe seu e-mail.' };

  // Normalize: lowercase, no leading/trailing whitespace.
  const normalized = raw.toLowerCase();

  // Reject e-mails óbvios como "abc@def" (sem TLD) ou ".comm" (TLD inválido)
  if (!EMAIL_FORMAT.test(normalized)) {
    return { valid: false, error: 'Formato de e-mail inválido.' };
  }

  // Sanity: at least one @ and one dot in the host part
  const atIdx = normalized.lastIndexOf('@');
  const host = normalized.slice(atIdx + 1);
  if (!host.includes('.')) {
    return { valid: false, error: 'Formato de e-mail inválido.' };
  }

  // TLD check — last segment after the last dot.
  const tld = host.split('.').pop() || '';
  if (!VALID_TLDS.has(tld)) {
    return {
      valid: false,
      error: `Domínio ".${tld}" não parece válido. Verifique o e-mail.`,
    };
  }

  // Disposable/throwaway domains aren't blocked by default — that's a
  // policy decision for later. Adicionar se virar um problema de fraude.

  return { valid: true, canonical: normalized };
}
