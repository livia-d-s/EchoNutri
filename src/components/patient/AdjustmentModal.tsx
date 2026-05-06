import React, { useState } from 'react';
import { Sliders, X, ChevronDown } from 'lucide-react';
import { TimelineEvent } from '../../../types';

interface AdjustmentModalProps {
  patientName: string;
  consultations: TimelineEvent[];
  onSave: (note: string, parentEventId?: string) => void;
  onClose: () => void;
}

const formatDate = (d: any) => {
  try {
    if (!d) return '';
    let date: Date;
    if (d.toDate) date = d.toDate();
    else if (d.seconds) date = new Date(d.seconds * 1000);
    else date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

export function AdjustmentModal({ patientName, consultations, onSave, onClose }: AdjustmentModalProps) {
  const [note, setNote] = useState('');
  const [selectedConsultationId, setSelectedConsultationId] = useState(
    consultations.length > 0 ? consultations[0].id : ''
  );

  const handleSave = () => {
    if (!note.trim()) return;
    onSave(note.trim(), selectedConsultationId || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface rounded-lg p-5 sm:p-6 max-w-lg w-full shadow-md border border-line
                      animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-subtle border border-line rounded-md flex items-center justify-center">
              <Sliders size={18} className="text-brand-700" strokeWidth={2.25} />
            </div>
            <div>
              <h3 className="text-md font-semibold text-ink-primary">Ajuste clínico</h3>
              <p className="text-ink-tertiary text-sm">{patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-subtle rounded-md transition-colors"
          >
            <X size={18} className="text-ink-tertiary" strokeWidth={2.25} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Consultation selector */}
          {consultations.length > 0 && (
            <div>
              <label className="block text-2xs font-semibold text-ink-secondary uppercase tracking-[0.1em] mb-1.5">
                Consulta referente
              </label>
              <div className="relative">
                <select
                  value={selectedConsultationId}
                  onChange={(e) => setSelectedConsultationId(e.target.value)}
                  className="w-full bg-surface border border-line rounded-md py-2 px-3 pr-9
                             outline-none text-md text-ink-primary focus:ring-2 focus:ring-brand-700/20
                             focus:border-brand-700 transition-all appearance-none cursor-pointer"
                >
                  {consultations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type === 'initial' ? 'Consulta inicial' : 'Retorno'} — {formatDate(c.date)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" strokeWidth={2.25} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-2xs font-semibold text-ink-secondary uppercase tracking-[0.1em] mb-1.5">
              Descrição do ajuste
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: aumentar proteína de 1.2g para 1.5g/kg devido à boa adesão e progresso..."
              rows={4}
              className="w-full bg-surface border border-line rounded-md py-2 px-3
                         outline-none text-md text-ink-primary placeholder:text-ink-tertiary
                         focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700
                         transition-all resize-none"
              autoFocus
            />
          </div>

          <p className="text-2xs text-ink-tertiary">
            Registre alterações de conduta, observações de evolução ou orientações entre consultas.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md font-semibold text-sm text-ink-secondary bg-subtle
                       hover:bg-line transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="flex-1 py-2.5 rounded-md font-semibold text-sm text-white bg-brand-700
                       hover:bg-brand-900 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed shadow-xs"
          >
            Salvar ajuste
          </button>
        </div>
      </div>
    </div>
  );
}
