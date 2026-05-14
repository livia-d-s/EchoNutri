import React from 'react';
import { X, Sparkles, Mail } from 'lucide-react';

interface CheckoutPlaceholderProps {
  onClose: () => void;
}

// Placeholder do checkout — exibido quando a nutri clica em "Ativar
// assinatura" antes do Stripe estar integrado (Semana 4 do plano).
// Quando o checkout real entrar, este componente é substituído pelo
// fluxo do Stripe Checkout / Stripe Elements.
export function CheckoutPlaceholder({ onClose }: CheckoutPlaceholderProps) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden"
      >
        <div className="bg-surface border-b border-line px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-md text-ink-primary flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-700" strokeWidth={2.25} /> Assinatura Pro
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors"
            title="Fechar"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-subtle border border-line flex items-center justify-center">
            <Mail size={22} className="text-brand-700" strokeWidth={2.25} />
          </div>
          <h2 className="text-md font-semibold text-ink-primary">Pagamento ainda não disponível</h2>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            O checkout entra no ar no lançamento oficial em <strong>01/07/2026</strong>.
            Até lá, beta-testers usam o app sem limitações.
          </p>
          <p className="text-2xs text-ink-tertiary mt-3 leading-relaxed">
            Dúvidas? <a href="mailto:contato@echonutri.com.br" className="text-brand-700 hover:text-brand-900 font-medium underline underline-offset-2">contato@echonutri.com.br</a>
          </p>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-md font-semibold text-sm text-white bg-brand-700 hover:bg-brand-900 transition-colors shadow-xs"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
