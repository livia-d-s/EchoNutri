import React from 'react';
import { Clock } from 'lucide-react';
import { DerivedSubscriptionState } from '../../utils/subscription';

interface TrialBadgeProps {
  state: DerivedSubscriptionState;
  onClick?: () => void;
}

// Pequeno badge no header: "Trial · 12 dias" / "Trial expirado" / nada.
// Cores derivadas do quão crítico está o status — neutras quando tem
// muito tempo, amarelas quando aperta, vermelhas quando expira.
export function TrialBadge({ state, onClick }: TrialBadgeProps) {
  if (state.kind === 'admin') return null;          // founders não veem
  if (state.kind === 'active') return null;         // pagantes não precisam ver

  if (state.kind === 'trialing') {
    const { daysLeft } = state;
    const tone =
      daysLeft <= 1 ? 'bg-red-50 text-critical border-red-200' :
      daysLeft <= 4 ? 'bg-amber-50 text-caution border-amber-200' :
                       'bg-subtle text-ink-primary border-line';
    const label = daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`;
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold border ${tone} transition-colors hover:opacity-90`}
        title="Detalhes da assinatura"
      >
        <Clock size={11} strokeWidth={2.25} />
        Trial · {label}
      </button>
    );
  }

  if (state.kind === 'trial_expired') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold border bg-red-50 text-critical border-red-200 hover:opacity-90"
      >
        <Clock size={11} strokeWidth={2.25} />
        Trial expirado
      </button>
    );
  }

  if (state.kind === 'past_due') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold border bg-amber-50 text-caution border-amber-200 hover:opacity-90"
      >
        Pagamento pendente
      </button>
    );
  }

  if (state.kind === 'canceled') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold border bg-subtle text-ink-secondary border-line hover:opacity-90"
      >
        Cancelada
      </button>
    );
  }

  return null;
}
