// Landing page pública do EchoNutri. Aparece quando o visitante chega
// em echonutri.com.br sem estar logado. Pitch + 4 pilares + pricing
// + CTAs pra criar conta.
//
// Decisões do pitch (definidas com a founder em 13/05/2026):
// - Tom: premium clínico-acolhedor
// - Headline: "Inteligência clínica para nutrição integrativa"
// - 4 pilares (com PDFs incluídos por pedido explícito):
//   capturar, analisar, prescrever (+ PDFs), acompanhar evolução
// - Logo placeholder: letra "E" maiúscula em quadrado brand-700
// - Pricing: R$67 mensal ou R$57 anual (15% off), 7 dias trial

import React from 'react';
import {
  Activity, Mic, Brain, FileText, TrendingUp, Check, ArrowRight,
  ShieldCheck, Clock, Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onStartTrial: () => void;       // CTA primário — abre AuthScreen em modo signup
  onLogin: () => void;            // Link "entrar" no header — abre AuthScreen em modo login
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
}

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 bg-brand-700 rounded-md flex items-center justify-center shadow-xs">
      <span className="text-white text-lg font-bold leading-none">E</span>
    </div>
    <div>
      <div className="text-md font-bold text-ink-primary tracking-tight leading-none">EchoNutri</div>
      <div className="text-2xs text-ink-tertiary font-medium uppercase tracking-[0.1em] mt-0.5">Inteligência clínica</div>
    </div>
  </div>
);

interface PillarProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Pillar: React.FC<PillarProps> = ({ icon, title, description }) => (
  <div className="bg-surface border border-line rounded-lg p-6 shadow-xs">
    <div className="w-10 h-10 rounded-md bg-subtle border border-line flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-md font-semibold text-ink-primary mb-2 tracking-tight">{title}</h3>
    <p className="text-sm text-ink-secondary leading-relaxed">{description}</p>
  </div>
);

export function LandingPage({ onStartTrial, onLogin, onOpenLegal }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-base text-ink-primary">
      {/* ===== NAV ===== */}
      <nav className="border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={onLogin}
              className="px-3 md:px-4 py-1.5 text-sm font-semibold text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={onStartTrial}
              className="px-3 md:px-4 py-1.5 bg-brand-700 hover:bg-brand-900 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              <span className="hidden sm:inline">Começar grátis</span>
              <span className="sm:hidden">Começar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-subtle border border-line text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-6">
          <Sparkles size={11} strokeWidth={2.25} className="text-brand-700" />
          Plataforma para nutricionistas clínicas
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink-primary leading-[1.1]">
          Inteligência clínica
          <br />
          <span className="text-brand-700">para nutrição integrativa</span>
        </h1>
        <p className="text-md md:text-lg text-ink-secondary mt-6 max-w-2xl mx-auto leading-relaxed">
          Grave a consulta, deixe a IA cruzar alimentação, sono, estresse, treino e contexto de vida — e tenha prescrição nutricional pronta para entregar à paciente em minutos.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <button
            onClick={onStartTrial}
            className="w-full sm:w-auto px-6 py-3 bg-brand-700 hover:bg-brand-900 text-white text-md font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            Comece com 7 dias grátis
            <ArrowRight size={16} strokeWidth={2.25} />
          </button>
          <div className="text-2xs text-ink-tertiary sm:ml-2">
            Sem fidelidade · Cancele quando quiser
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-2xs text-ink-tertiary font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} strokeWidth={2.25} className="text-positive" />
            LGPD-aware desde o cadastro
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} strokeWidth={2.25} className="text-positive" />
            Setup em menos de 2 minutos
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={12} strokeWidth={2.25} className="text-positive" />
            Para CRN ativo
          </div>
        </div>
      </section>

      {/* ===== 4 PILARES ===== */}
      <section className="bg-surface border-y border-line">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-700 mb-3">
              Como funciona
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ink-primary leading-tight">
              Um fluxo único, do registro à entrega
            </h2>
            <p className="text-md text-ink-secondary mt-4 leading-relaxed">
              Tudo que a consulta precisa para virar conduta — sem alternar entre 3 ferramentas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Pillar
              icon={<Mic size={18} strokeWidth={2.25} className="text-brand-700" />}
              title="1. Capture a consulta inteira"
              description="Grave ao vivo no app ou importe a gravação do Zoom, Meet ou do gravador do celular — áudio ou vídeo, até 2h30. Você atende, a EchoNutri transcreve com fidelidade clínica."
            />
            <Pillar
              icon={<Brain size={18} strokeWidth={2.25} className="text-brand-700" />}
              title="2. Análise clínica que conecta os pontos"
              description="Não é só transcrição. A IA interpreta o caso cruzando alimentação, sono, estresse, treino, queixas e contexto biopsicossocial — em uma avaliação estruturada com racional, hipóteses e direcionamento."
            />
            <Pillar
              icon={<FileText size={18} strokeWidth={2.25} className="text-brand-700" />}
              title="3. Prescrição e documentos prontos"
              description="Plano alimentar com substituições equivalentes e macros calculados. Pedido de exames, conduta nutricional para a paciente e encaminhamento clínico — todos em PDF na sua identidade visual, em um clique."
            />
            <Pillar
              icon={<TrendingUp size={18} strokeWidth={2.25} className="text-brand-700" />}
              title="4. Evolução real, consulta após consulta"
              description="Marcadores clínicos, histórico de hipóteses e comparação entre consultas. Toda paciente acumula contexto — você nunca perde o raciocínio anterior."
            />
          </div>
        </div>
      </section>

      {/* ===== DIFFERENTIATION ===== */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="bg-surface border border-line rounded-lg p-8 md:p-10 shadow-sm">
          <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-700 mb-3">
            Para quem trata o ser humano inteiro
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink-primary leading-tight mb-5">
            Não é um app de cardápio. É inteligência clínica.
          </h2>
          <div className="space-y-3 text-md text-ink-secondary leading-relaxed">
            <p>
              Outros apps tratam a paciente como um conjunto de gramas e calorias. A EchoNutri foi construída para nutricionistas que enxergam alimentação como sintoma — não como causa.
            </p>
            <p>
              A IA entrega análise integrativa de verdade: cruza queixas, sono, rotina, treino, exames, comportamento e contexto familiar. Devolve hipóteses clínicas — não receitas prontas. <strong className="text-ink-primary">A conduta continua sendo sua.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="bg-surface border-y border-line">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-700 mb-3">
              Preço justo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ink-primary leading-tight">
              Um plano. Todas as features.
            </h2>
            <p className="text-md text-ink-secondary mt-4 leading-relaxed">
              Sem tiers confusos. Sem features escondidas atrás de upgrade. Sem fidelidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Mensal */}
            <div className="bg-base rounded-lg border border-line p-6">
              <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">
                Mensal
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-ink-primary tracking-tight">R$ 67</span>
                <span className="text-sm text-ink-tertiary">/mês</span>
              </div>
              <p className="text-2xs text-ink-tertiary mb-5">Cobrado mensalmente</p>
              <button
                onClick={onStartTrial}
                className="w-full py-2.5 rounded-md font-semibold text-sm text-ink-primary bg-surface border border-line hover:border-brand-700 hover:bg-subtle transition-colors"
              >
                Começar grátis
              </button>
            </div>

            {/* Anual */}
            <div className="bg-base rounded-lg border-2 border-brand-700 p-6 relative shadow-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-brand-700 text-white text-2xs font-semibold uppercase tracking-[0.08em]">
                Mais escolhido · 15% off
              </div>
              <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">
                Anual
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-ink-primary tracking-tight">R$ 57</span>
                <span className="text-sm text-ink-tertiary">/mês</span>
              </div>
              <p className="text-2xs text-ink-tertiary mb-5">R$ 684 cobrados anualmente</p>
              <button
                onClick={onStartTrial}
                className="w-full py-2.5 rounded-md font-semibold text-sm text-white bg-brand-700 hover:bg-brand-900 transition-colors shadow-xs"
              >
                Começar grátis
              </button>
            </div>
          </div>

          {/* Included features */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-3 text-center">
              Tudo incluído
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-ink-primary">
              {[
                'Pacientes e consultas ilimitados',
                'Gravação ao vivo + upload de áudio/vídeo (até 2h30)',
                'Avaliação clínica integrativa com IA',
                'Prescrição nutricional com substituições',
                'PDFs prontos (4 templates)',
                'Marcadores clínicos por paciente',
                'Histórico e comparação entre consultas',
                'LGPD-aware (export + delete sob demanda)',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check size={14} strokeWidth={2.25} className="text-positive mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink-primary leading-tight mb-3">
          Construído para nutricionistas que enxergam o ser humano inteiro.
        </h2>
        <p className="text-md text-ink-secondary mb-8 leading-relaxed">
          Não só o cardápio.
        </p>
        <button
          onClick={onStartTrial}
          className="px-7 py-3 bg-brand-700 hover:bg-brand-900 text-white text-md font-semibold rounded-md shadow-sm transition-colors inline-flex items-center gap-2"
        >
          Comece com 7 dias grátis
          <ArrowRight size={16} strokeWidth={2.25} />
        </button>
        <div className="text-2xs text-ink-tertiary mt-3">
          Sem fidelidade · Cancele quando quiser
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs text-ink-tertiary">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-brand-700 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">E</span>
            </div>
            <span className="font-medium">EchoNutri · Inteligência clínica para nutrição</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onOpenLegal('terms')} className="hover:text-ink-primary font-medium transition-colors">
              Termos de Uso
            </button>
            <span>·</span>
            <button onClick={() => onOpenLegal('privacy')} className="hover:text-ink-primary font-medium transition-colors">
              Política de Privacidade
            </button>
            <span>·</span>
            <a href="mailto:contato@echonutri.com.br" className="hover:text-ink-primary font-medium transition-colors">
              contato@echonutri.com.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
