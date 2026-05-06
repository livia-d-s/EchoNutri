import React from 'react';
import { Clock } from 'lucide-react';
import { TimelineEvent } from '../../../types';
import { TimelineItem } from './TimelineItem';

interface PatientTimelineProps {
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string, newNote: string) => void;
}

interface EventGroup {
  consultation: TimelineEvent;
  adjustments: TimelineEvent[];
}

export function PatientTimeline({ events, onEventClick, onDeleteEvent, onEditEvent }: PatientTimelineProps) {
  const toTime = (d: any): number => {
    if (!d) return 0;
    if (d.toDate) return d.toDate().getTime();
    if (d.seconds) return d.seconds * 1000;
    const parsed = new Date(d).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => toTime(b.date) - toTime(a.date)
  );

  // Group adjustments with their parent consultations
  // Uses parentEventId if available, falls back to date-based grouping for old data
  const groupedEvents = (): (EventGroup | TimelineEvent)[] => {
    const consultations = sortedEvents.filter(e => e.type !== 'adjustment');
    const adjustments = sortedEvents.filter(e => e.type === 'adjustment');
    const groups: (EventGroup | TimelineEvent)[] = [];

    consultations.forEach((consultation, index) => {
      const nextConsultation = consultations[index - 1];
      const relatedAdjustments = adjustments.filter(adj => {
        // Prefer explicit link via parentEventId
        if (adj.parentEventId) {
          return adj.parentEventId === consultation.id;
        }
        // Fallback: date-based grouping for old data without parentEventId
        const adjDate = toTime(adj.date);
        const consultDate = toTime(consultation.date);
        const nextDate = nextConsultation ? toTime(nextConsultation.date) : Infinity;
        return adjDate >= consultDate && adjDate < nextDate;
      });

      if (relatedAdjustments.length > 0) {
        groups.push({
          consultation,
          adjustments: relatedAdjustments.sort((a, b) =>
            toTime(b.date) - toTime(a.date)
          )
        });
      } else {
        groups.push(consultation);
      }
    });

    // Handle orphan adjustments (no parentEventId and before any consultation)
    const orphanAdjustments = adjustments.filter(adj => {
      if (adj.parentEventId) {
        return !consultations.some(c => c.id === adj.parentEventId);
      }
      const adjDate = toTime(adj.date);
      const firstConsultation = consultations[consultations.length - 1];
      return firstConsultation && adjDate < toTime(firstConsultation.date);
    });
    orphanAdjustments.forEach(adj => groups.push(adj));

    return groups;
  };

  if (events.length === 0) {
    return (
      <div className="py-16 bg-white border-2 border-dashed border-slate-200
                      rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
        <Clock size={40} className="mb-4 opacity-50" />
        <p className="font-bold text-lg">Nenhum evento registrado</p>
        <p className="text-sm mt-1">Inicie uma consulta para começar o histórico</p>
      </div>
    );
  }

  const eventGroups = groupedEvents();

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-blue-600 rounded-full" />
        <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
          Linha do Tempo
        </h3>
        <span className="text-xs text-slate-400 ml-2">
          {events.length} {events.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-2">
        {eventGroups.map((item) => {
          if ('consultation' in item) {
            // Consultation on the left, adjustments stacked on the right
            // Orange horizontal line visually connects them
            return (
              <div key={item.consultation.id} className="mb-2 flex flex-col md:flex-row md:items-center gap-0">
                <div className="md:basis-[70%] min-w-0">
                  <TimelineItem
                    event={item.consultation}
                    onClick={() => onEventClick(item.consultation)}
                  />
                </div>
                {/* Horizontal orange connector (desktop only) */}
                <div className="hidden md:block h-0.5 w-4 bg-amber-400 flex-shrink-0" />
                <div className="md:basis-[30%] flex-shrink space-y-2 mt-2 md:mt-0">
                  {item.adjustments.map((adjustment) => (
                    <TimelineItem
                      key={adjustment.id}
                      event={adjustment}
                      onClick={() => onEventClick(adjustment)}
                      onDelete={onDeleteEvent}
                      onEdit={onEditEvent}
                      isConnected
                    />
                  ))}
                </div>
              </div>
            );
          } else {
            return (
              <TimelineItem
                key={item.id}
                event={item}
                onClick={() => onEventClick(item)}
                onDelete={item.type === 'adjustment' ? onDeleteEvent : undefined}
                onEdit={item.type === 'adjustment' ? onEditEvent : undefined}
              />
            );
          }
        })}
      </div>
    </div>
  );
}
