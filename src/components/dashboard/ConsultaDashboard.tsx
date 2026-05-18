// Painel mostrado na tela "Consulta" quando a nutri acaba de abrir o app
// (status === IDLE e sem patientName digitado). Preenche o espaço que
// antes era vazio com dois blocos úteis:
//   1) Stats da semana (consultas registradas + pacientes ativas)
//   2) Consultas recentes (últimas 5, click abre análise)
//
// "Rascunhos pendentes" foi removido a pedido da founder (não considerou
// necessário). Caso volte na pauta, é só adicionar uma terceira seção.

import React, { useMemo } from 'react';
import { Calendar, Users, ChevronRight, Activity } from 'lucide-react';
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
  const stats = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    // Consultas (não-ajustes) registradas nos últimos 7 dias.
    const consultasSemana = events.filter(
      (e) => e.type !== 'adjustment' && now - toMs(e.date) < weekMs
    ).length;

    // Pacientes únicas com algum evento (consulta ou ajuste) nos últimos 30 dias.
    const ativas = new Set<string>();
    for (const e of events) {
      if (now - toMs(e.date) < monthMs) ativas.add(e.patientId);
    }
    return { consultasSemana, pacientesAtivas: ativas.size };
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Stats row — 2 cards compactos */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Calendar size={14} strokeWidth={2.25} className="text-brand-700" />}
          label="Consultas esta semana"
          value={stats.consultasSemana}
        />
        <StatCard
          icon={<Users size={14} strokeWidth={2.25} className="text-brand-700" />}
          label="Pacientes ativas · 30 dias"
          value={stats.pacientesAtivas}
        />
      </div>

      {/* Recent consultations */}
      <div className="bg-surface rounded-lg border border-line shadow-xs overflow-hidden">
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
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3 shadow-xs">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-ink-primary tracking-tight font-mono">{value}</div>
    </div>
  );
}
