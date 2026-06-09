import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { DerivedSubscriptionState } from '../../utils/subscription';

interface TrialExpiredGateProps {
  state: DerivedSubscriptionState;
  onSubscribe: () => void;
  onLogout?: () => void;
}

// Overlay full-screen mostrado quando o trial expirou OU a assinatura
// está past_due. Bloqueia o uso do app mas mantém acesso a "Sair" e
// "Ativar assinatura". Mostrado por cima de toda a interface.
//
// Por enquanto, o botão "Ativar" apenas mostra um placeholder porque o
// checkout do Stripe ainda não foi integrado (Semana 4 do plano).
export function TrialExpiredGate({ state, onSubscribe, onLogout }: TrialExpiredGateProps) {
  let title: string;
  let description: string;
  let cta = 'Ativar assinatura';
  switch (state.kind) {
    case 'past_due':
      title = 'Pagamento pendente';
      description = 'A cobrança da sua assinatura falhou. Atualize seu método de pagamento para retomar o acesso completo.';
      cta = 'Atualizar pagamento';
      break;
    case 'incomplete':
      title = 'Pagamento não concluído';
      description = 'Seu checkout não foi finalizado. Conclua o pagamento para liberar o acesso ao EchoNutri.';
      cta = 'Concluir pagamento';
      break;
    case 'canceled':
      title = 'Assinatura encerrada';
      description = 'Sua assinatura foi cancelada e o período de acesso terminou. Reative para continuar usando o EchoNutri.';
      cta = 'Reativar assinatura';
      break;
    default: // trial_expired e missing
      title = 'Período de teste encerrado';
      description = 'Seu trial de 7 dias terminou. Ative a assinatura para continuar usando o EchoNutri sem interrupção.';
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden">
        <div className="px-6 py-7 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-subtle border border-line flex items-center justify-center">
            <Lock size={22} className="text-brand-700" strokeWidth={2.25} />
          </div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">{title}</h2>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">{description}</p>
        </div>

        <div className="px-6 pb-5">
          <div className="bg-subtle border border-line rounded-md p-4 space-y-2">
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
              <Sparkles size={11} strokeWidth={2.25} className="text-brand-700" />
              Plano Pro
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-ink-primary tracking-tight">R$ 67</span>
              <span className="text-sm text-ink-tertiary">/mês</span>
            </div>
            <div className="text-2xs text-ink-tertiary">ou R$ 57/mês no plano anual (15% off)</div>
            <ul className="text-xs text-ink-secondary space-y-1 mt-2">
              <li>• Pacientes e consultas ilimitados</li>
              <li>• Transcrição de áudio/vídeo até 2h30 cada</li>
              <li>• Avaliação clínica e prescrição com IA</li>
              <li>• PDFs prontos (exames, conduta, prescrição, encaminhamento)</li>
            </ul>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={onSubscribe}
            className="w-full py-2.5 rounded-md font-semibold text-sm text-white bg-brand-700 hover:bg-brand-900 transition-colors shadow-xs"
          >
            {cta}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-2 rounded-md font-medium text-sm text-ink-secondary hover:bg-subtle transition-colors"
            >
              Sair da conta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
