import React, { useState } from 'react';
import { ChevronRight, Trash2, Pencil } from 'lucide-react';
import { TimelineEvent, EventType } from '../../../types';

interface TimelineItemProps {
  event: TimelineEvent;
  onClick: () => void;
  onDelete?: (eventId: string) => void;
  onEdit?: (eventId: string, newNote: string) => void;
  isConnected?: boolean; // True if this is an adjustment connected to a consultation
}

const eventConfig: Record<EventType, { color: string; bgColor: string; label: string; badgeBg: string; badgeText: string }> = {
  initial: {
    color: 'bg-brand-700',
    bgColor: 'bg-subtle',
    label: 'Consulta inicial',
    badgeBg: 'bg-subtle',
    badgeText: 'text-ink-primary'
  },
  followup: {
    color: 'bg-brand-700',
    bgColor: 'bg-subtle',
    label: 'Retorno',
    badgeBg: 'bg-subtle',
    badgeText: 'text-ink-secondary'
  },
  adjustment: {
    color: 'bg-caution',
    bgColor: 'bg-subtle',
    label: 'Ajuste clínico',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-caution'
  }
};

export function TimelineItem({ event, onClick, onDelete, onEdit, isConnected }: TimelineItemProps) {
  const config = eventConfig[event.type];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(event.adjustmentNote || '');

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

  const getEventSummary = () => {
    if (event.type === 'adjustment') {
      return event.adjustmentNote || 'Ajuste no plano nutricional';
    }

    const result = event.result as any;
    if (result) {
      return result.nutritionalAssessment || result.diagnosis || 'Consulta realizada';
    }
    return 'Consulta realizada';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(event.id);
    setShowDeleteConfirm(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editNote.trim()) {
      onEdit?.(event.id, editNote.trim());
    }
    setIsEditing(false);
  };

  const isAdjustment = event.type === 'adjustment';

  return (
    <div className={`relative ${isConnected ? '' : 'pb-8'} last:pb-0`}>
      {/* Vertical line + dot only for standalone items (not side-by-side adjustments) */}
      {!isConnected && (
        <>
          <div className="absolute left-[7px] top-4 bottom-0 w-px bg-line" />
          <div
            className={`absolute left-0 w-3.5 h-3.5 rounded-full ${config.color} ring-4 ring-base`}
          />
        </>
      )}

      {/* Content Card */}
      <div
        onClick={isEditing ? undefined : onClick}
        className={`${isConnected ? '' : 'ml-7'} p-4 bg-surface rounded-md border
                   ${isConnected ? 'border-line border-l-2 border-l-caution' : 'border-line'}
                   hover:border-brand-700 ${isEditing ? '' : 'cursor-pointer'}
                   transition-colors group relative`}
      >
        {/* Edit/Delete buttons for adjustments */}
        {isAdjustment && (onDelete || onEdit) && !isEditing && (
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-ink-tertiary hover:text-brand-700 hover:bg-subtle rounded-md transition-all"
                title="Editar"
              >
                <Pencil size={13} strokeWidth={2.25} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 text-ink-tertiary hover:text-critical hover:bg-red-50 rounded-md transition-all"
                title="Excluir"
              >
                <Trash2 size={13} strokeWidth={2.25} />
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-medium text-ink-tertiary">
            {formatDate(event.date)}
          </span>
          <span
            className={`text-2xs font-medium uppercase tracking-[0.08em] px-2 py-0.5
                        rounded-md whitespace-nowrap ${config.badgeBg} ${config.badgeText} border border-line`}
          >
            {config.label}
          </span>
        </div>

        {/* Edit mode for adjustments */}
        {isEditing ? (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full p-3 bg-surface border border-line rounded-md text-sm text-ink-primary resize-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditNote(event.adjustmentNote || ''); }}
                className="px-3 py-1.5 text-xs text-ink-secondary hover:bg-subtle rounded-md font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1.5 text-xs bg-brand-700 text-white rounded-md hover:bg-brand-900 font-semibold"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <p className="text-ink-primary text-sm leading-snug line-clamp-2 pr-8">
              {getEventSummary()}
            </p>

            {/* View details link (only for consultations) */}
            {!isAdjustment && (
              <div className="flex items-center gap-1 mt-3 text-xs text-brand-700 font-semibold
                              group-hover:gap-1.5 transition-all">
                Ver análise
                <ChevronRight size={13} strokeWidth={2.25} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation popup */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
        >
          <div
            className="bg-surface rounded-lg p-5 max-w-sm w-full mx-4 shadow-md border border-line animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-critical" strokeWidth={2.25} />
              </div>
              <h3 className="text-md font-semibold text-ink-primary">Confirmar exclusão</h3>
              <p className="text-ink-secondary text-sm mt-1.5">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2 rounded-md font-semibold text-sm text-ink-secondary bg-subtle hover:bg-line transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-md font-semibold text-sm text-white bg-critical hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
