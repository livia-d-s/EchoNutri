import React from 'react';
import { Lock, Mic, Sparkles } from 'lucide-react';

interface BetaNoticeProps {
  // 'welcome' aparece logo depois do login: explica o limite ANTES da pessoa
  // gravar meia hora de consulta. 'blocked' aparece quando ela tenta finalizar.
  variant: 'welcome' | 'blocked';
  onClose: () => void;
}

const WAITLIST_HREF = 'mailto:contato@echonutri.com.br?subject=Lista%20de%20espera%20do%20EchoNutri';

// Aviso de beta fechado — NÃO bloqueia o app. A pessoa fecha, grava e vê a
// transcrição ao vivo (que roda no próprio navegador, sem custo de API). Só a
// geração do prontuário com IA fica desativada, e o aviso diz isso na cara.
export function BetaNotice({ variant, onClose }: BetaNoticeProps) {
  const welcome = variant === 'welcome';

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden">
        <div className="px-6 py-7 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-subtle border border-line flex items-center justify-center">
            {welcome
              ? <Mic size={22} className="text-brand-700" strokeWidth={2.25} />
              : <Lock size={22} className="text-brand-700" strokeWidth={2.25} />}
          </div>

          <h2 className="text-xl font-bold text-ink-primary tracking-tight">
            {welcome ? 'Fique à vontade pra explorar' : 'É aqui que a IA entraria'}
          </h2>

          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            {welcome ? (
              <>
                O EchoNutri está em beta fechado. Você pode navegar pelo app e gravar à
                vontade — a transcrição aparece em tempo real na tela. O que ainda não
                está liberado é a geração do prontuário com IA no final.
              </>
            ) : (
              <>
                Sua transcrição está aí, inteira. O que viria agora é a avaliação clínica,
                a conduta e os PDFs gerados pela IA — e essa parte está liberada só para o
                grupo de nutricionistas que está testando o beta.
              </>
            )}
          </p>
        </div>

        {welcome && (
          <div className="px-6 pb-5">
            <div className="bg-subtle border border-line rounded-md p-4">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">
                <Sparkles size={11} strokeWidth={2.25} className="text-brand-700" />
                O que dá pra testar agora
              </div>
              <ul className="text-xs text-ink-secondary space-y-1">
                <li>• Gravar e ver a transcrição saindo em tempo real</li>
                <li>• Abrir a paciente de exemplo e ver a timeline dela</li>
                <li>• Passear por todas as telas do app</li>
              </ul>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-md font-semibold text-sm text-white bg-brand-700 hover:bg-brand-900 transition-colors shadow-xs"
          >
            {welcome ? 'Entendi, quero explorar' : 'Voltar para a transcrição'}
          </button>
          <a
            href={WAITLIST_HREF}
            className="w-full py-2 rounded-md font-medium text-sm text-ink-secondary hover:bg-subtle transition-colors text-center"
          >
            Entrar na lista de espera
          </a>
        </div>
      </div>
    </div>
  );
}
