// Painel mostrado na tela "Consulta" quando a nutri acaba de abrir o app
// (status === IDLE e sem patientName digitado). Preenche o espaço que
// antes era vazio com dois blocos úteis:
//   1) Stats da semana (consultas registradas + pacientes ativas)
//   2) Consultas recentes (últimas 5, click abre análise)
//
// "Rascunhos pendentes" foi removido a pedido da founder (não considerou
// necessário). Caso volte na pauta, é só adicionar uma terceira seção.

import React, { useMemo } from 'react';
import { Calendar, ChevronRight, Activity } from 'lucide-react';
import { Patient, TimelineEvent } from '../../../types';

interface ConsultaDashboardProps {
  patients: Patient[];
  events: TimelineEvent[];
  onOpenConsultation: (event: TimelineEvent) => void;
}

const toMs = (d: any): number => {
  if (!d) return 0;
  if (d.toDate) return d.toDate().getTime();
  if (d.seconds) return d.seconds * 1000;
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
};

const formatDate = (d: any) => {
  const ms = toMs(d);
  if (!ms) return '';
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return `hoje · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `ontem · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function ConsultaDashboard({ patients, events, onOpenConsultation }: ConsultaDashboardProps) {
  const consultasUltima7Dias = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    // Consultas (não-ajustes) registradas nos últimos 7 dias — passado.
    return events.filter(
      (e) => e.type !== 'adjustment' && now - toMs(e.date) < weekMs
    ).length;
  }, [events]);

  const recentConsultations = useMemo(() => {
    return events
      .filter((e) => e.type !== 'adjustment')
      .sort((a, b) => toMs(b.date) - toMs(a.date))
      .slice(0, 5);
  }, [events]);

  const patientById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.id, p);
    return map;
  }, [patients]);

  // Para nutris novas sem histórico, escondemos o dashboard inteiro —
  // só estresse visual sem trazer valor. O input + CTAs já bastam.
  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-10 gap-3 animate-in fade-in duration-300">
      {/* Consultas recentes — 70% de largura */}
      <div className="md:col-span-7 bg-surface rounded-lg border border-line shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
            Consultas recentes
          </h3>
          <span className="text-2xs text-ink-tertiary font-medium">
            {recentConsultations.length} {recentConsultations.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <ul>
          {recentConsultations.map((event) => {
            const patient = patientById.get(event.patientId);
            const patientName = patient?.name || 'Paciente removida';
            const hasResult = !!event.result;
            return (
              <li key={event.id}>
                <button
                  onClick={() => onOpenConsultation(event)}
                  disabled={!hasResult}
                  className="w-full px-4 py-2.5 text-left hover:bg-subtle disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors border-b border-line last:border-b-0 group flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-md bg-subtle border border-line flex items-center justify-center flex-shrink-0">
                    <Activity size={13} strokeWidth={2.25} className="text-brand-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-sm text-ink-primary truncate">{patientName}</p>
                      <span className="text-2xs text-ink-tertiary flex-shrink-0">{formatDate(event.date)}</span>
                    </div>
                    <p className="text-2xs text-ink-tertiary mt-0.5">
                      {event.type === 'initial' ? 'Consulta inicial' : 'Retorno'}
                      {!hasResult && ' · sem análise registrada'}
                    </p>
                  </div>
                  {hasResult && (
                    <ChevronRight
                      size={15}
                      strokeWidth={2.25}
                      className="text-ink-tertiary group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Stat — 30% de largura */}
      <div className="md:col-span-3 bg-surface border border-line rounded-lg shadow-xs p-4 flex flex-col">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Calendar size={13} strokeWidth={2.25} className="text-brand-700" />
          <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary text-center">
            Consultas nesta última semana
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-bold text-ink-primary tracking-tight font-mono leading-none">
            {consultasUltima7Dias}
          </div>
          <div className="text-2xs text-ink-tertiary mt-1.5">
            registradas nos últimos 7 dias
          </div>
        </div>
      </div>
    </div>
  );
}
