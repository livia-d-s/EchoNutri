// Helpers + tipos auxiliares para o gating de assinatura.
//
// Estratégia: o subscription doc vive em doctors/{uid}.subscription
// (criado no signup pelo AuthScreen). Se um usuário antigo entra sem
// subscription, o App lazy-cria um trial de 7 dias a partir do
// primeiro login observado.

import { Subscription, createInitialSubscription } from '../../types';

// Lista de e-mails que pulam o gate de trial — só founders/devs.
// Mantido em código (não env) pra ser visível em code review.
const ADMIN_EMAILS = new Set<string>([
  'liviadasilva205@gmail.com',
  'contato@echonutri.com.br',
]);

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}

/**
 * Retorna a "verdade" sobre o status atual da assinatura, considerando
 * a passagem do tempo. Por exemplo: se o doc diz `trialing` mas o
 * trialEnd já passou, retornamos `trial_expired`.
 */
export type DerivedSubscriptionState =
  | { kind: 'admin' }                                 // bypass total
  | { kind: 'trialing'; daysLeft: number; trialEnd: Date }
  | { kind: 'trial_expired'; trialEnd: Date }
  | { kind: 'active'; currentPeriodEnd?: Date }
  | { kind: 'past_due' }
  | { kind: 'canceled'; endsAt?: Date }
  | { kind: 'incomplete' }
  | { kind: 'missing' };                              // sem subscription doc

export function deriveSubscriptionState(
  subscription: Subscription | null | undefined,
  email?: string | null,
  now: Date = new Date(),
): DerivedSubscriptionState {
  if (isAdminUser(email)) return { kind: 'admin' };
  if (!subscription) return { kind: 'missing' };

  if (subscription.status === 'trialing') {
    const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
    if (!trialEnd || isNaN(trialEnd.getTime())) {
      return { kind: 'trial_expired', trialEnd: now };
    }
    const msLeft = trialEnd.getTime() - now.getTime();
    if (msLeft <= 0) return { kind: 'trial_expired', trialEnd };
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return { kind: 'trialing', daysLeft, trialEnd };
  }

  if (subscription.status === 'active') {
    return {
      kind: 'active',
      currentPeriodEnd: subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : undefined,
    };
  }
  if (subscription.status === 'past_due') return { kind: 'past_due' };
  if (subscription.status === 'canceled') {
    return {
      kind: 'canceled',
      endsAt: subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : undefined,
    };
  }
  if (subscription.status === 'incomplete') return { kind: 'incomplete' };

  return { kind: 'missing' };
}

/** True quando o usuário tem acesso completo ao app agora. */
export function hasActiveAccess(state: DerivedSubscriptionState): boolean {
  return (
    state.kind === 'admin' ||
    state.kind === 'trialing' ||
    state.kind === 'active' ||
    // canceled mantém acesso até o fim do ciclo pago atual
    (state.kind === 'canceled' && (!state.endsAt || state.endsAt > new Date()))
  );
}

export { createInitialSubscription };
