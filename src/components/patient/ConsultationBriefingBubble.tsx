import React, { useState } from 'react';
import { Sparkles, X, Calendar } from 'lucide-react';
import { TimelineEvent } from '../../../types';

interface ConsultationBriefingBubbleProps {
  events: TimelineEvent[];
  patientName: string;
  patients: any[];
}

const toTime = (d: any): number => {
  if (!d) return 0;
  if (d.toDate) return d.toDate().getTime();
  if (d.seconds) return d.seconds * 1000;
  const parsed = new Date(d).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const formatDate = (d: any) => {
  try {
    if (!d) return '';
    let date: Date;
    if (d.toDate) date = d.toDate();
    else if (d.seconds) date = new Date(d.seconds * 1000);
    else date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
};

export function ConsultationBriefingBubble({
  events,
  patientName,
  patients,
}: ConsultationBriefingBubbleProps) {
  const [open, setOpen] = useState(false);

  // Find the patient by name
  const pn = (patientName || '').trim().toLowerCase();
  if (!pn) return null;
  const patient = patients.find((p: any) => p.name?.toLowerCase() === pn);
  if (!patient) return null;

  // Find their most recent consultation (not adjustment) with suggestions
  const consultations = events
    .filter(e => e.patientId === patient.id && e.type !== 'adjustment')
    .sort((a, b) => toTime(b.date) - toTime(a.date));
  if (consultations.length === 0) return null;

  const lastConsultation = consultations[0];
  const result: any = lastConsultation.result || {};
  const suggestions: string[] = Array.isArray(result.suggestedNextQuestions)
    ? result.suggestedNextQuestions.slice(0, 3)
    : [];
  if (suggestions.length === 0) return null;

  return (
    <>
      {/* Panel (expanded) */}
      {open && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-surface rounded-lg shadow-md border border-line overflow-hidden">
            <div className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-ink-primary flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-700" strokeWidth={2.25} /> Pontos a investigar
                </h3>
                <p className="text-2xs text-ink-tertiary flex items-center gap-1 mt-0.5">
                  <Calendar size={10} strokeWidth={2.25} /> Da consulta de {formatDate(lastConsultation.date)}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors flex-shrink-0"
                title="Fechar"
              >
                <X size={15} strokeWidth={2.25} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <ul className="space-y-3">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-ink-primary leading-relaxed flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md bg-subtle border border-line text-ink-primary flex items-center justify-center text-2xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 md:right-6 z-50 w-11 h-11 rounded-md bg-brand-700 text-white shadow-md hover:bg-brand-900 active:scale-95 transition-all flex items-center justify-center group"
        title={`${suggestions.length} ponto${suggestions.length > 1 ? 's' : ''} a investigar nesta consulta`}
      >
        <Sparkles size={17} strokeWidth={2.25} />
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-caution border-2 border-base text-white text-2xs font-semibold flex items-center justify-center">
          {suggestions.length}
        </span>
      </button>
    </>
  );
}
