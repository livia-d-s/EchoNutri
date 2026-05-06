import React from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { Patient } from '../../../types';

interface PatientCardProps {
  patient: Patient;
  eventCount: number;
  lastEventDate?: string;
  onClick: () => void;
}

export function PatientCard({ patient, eventCount, lastEventDate, onClick }: PatientCardProps) {
  const initial = patient.name.charAt(0).toUpperCase();

  const formatDate = (d: any) => {
    try {
      let date: Date;
      if (!d) return '';
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

  return (
    <div
      onClick={onClick}
      className="bg-surface p-4 rounded-md border border-line hover:border-brand-700
                 hover:shadow-sm cursor-pointer transition-all group"
    >
      <div className="flex gap-4 items-center">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-md bg-brand-700 text-white text-md font-semibold
                        flex items-center justify-center flex-shrink-0">
          {initial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-md text-ink-primary truncate">
            {patient.name}
          </h4>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-medium text-ink-tertiary">
              {eventCount} {eventCount === 1 ? 'consulta' : 'consultas'}
            </span>
            {lastEventDate && (
              <span className="text-xs text-ink-tertiary flex items-center gap-1">
                <Calendar size={10} strokeWidth={2.25} />
                {formatDate(lastEventDate)}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          className="text-ink-tertiary group-hover:text-brand-700 group-hover:translate-x-0.5
                     transition-all flex-shrink-0"
          size={18}
          strokeWidth={2.25}
        />
      </div>
    </div>
  );
}
