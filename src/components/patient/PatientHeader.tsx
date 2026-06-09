import React, { useState } from 'react';
import { ArrowLeft, Plus, Sliders, Pencil, Check, X, Target, Dumbbell, Sparkles, Activity } from 'lucide-react';
import { Patient, GOAL_LABELS } from '../../../types';
import { ClinicalDataModal } from './ClinicalDataModal';
import { notify } from '../../utils/toast';

interface PatientHeaderProps {
  patient: Patient;
  onBack: () => void;
  onNewConsultation: () => void;
  onNewAdjustment: () => void;
  onEditPatient?: (patientId: string, newName: string) => void;
  onUpdateHighlights?: (patientId: string, highlights: string[]) => void;
  onUpdatePatient?: (changes: Partial<Patient>) => void;
}

export function PatientHeader({
  patient,
  onBack,
  onNewConsultation,
  onNewAdjustment,
  onEditPatient,
  onUpdateHighlights,
  onUpdatePatient
}: PatientHeaderProps) {
  const [showClinicalModal, setShowClinicalModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(patient.name);
  const [isAddingHighlight, setIsAddingHighlight] = useState(false);
  const [newHighlight, setNewHighlight] = useState('');
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [editHighlightText, setEditHighlightText] = useState('');

  const handleSaveEdit = () => {
    if (editName.trim() && onEditPatient) {
      onEditPatient(patient.id, editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(patient.name);
    setIsEditing(false);
  };

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

  const highlights = patient.highlights || [];

  const MAX_HIGHLIGHTS = 8;

  const addHighlight = () => {
    if (!newHighlight.trim() || !onUpdateHighlights) return;
    if (highlights.length >= MAX_HIGHLIGHTS) {
      notify(`Limite de ${MAX_HIGHLIGHTS} marcadores atingido. Remova um para adicionar outro.`, 'error');
      return;
    }
    onUpdateHighlights(patient.id, [...highlights, newHighlight.trim()]);
    setNewHighlight('');
    setIsAddingHighlight(false);
  };

  const handleClickAdd = () => {
    if (highlights.length >= MAX_HIGHLIGHTS) {
      notify(`Limite de ${MAX_HIGHLIGHTS} marcadores atingido. Remova um para adicionar outro.`, 'error');
      return;
    }
    setIsAddingHighlight(true);
  };

  const removeHighlight = (index: number) => {
    if (!onUpdateHighlights) return;
    onUpdateHighlights(patient.id, highlights.filter((_, i) => i !== index));
  };

  const saveEditHighlight = (index: number) => {
    if (!editHighlightText.trim() || !onUpdateHighlights) return;
    const updated = [...highlights];
    updated[index] = editHighlightText.trim();
    onUpdateHighlights(patient.id, updated);
    setEditingHighlightIndex(null);
    setEditHighlightText('');
  };

  const startEditHighlight = (index: number) => {
    setEditingHighlightIndex(index);
    setEditHighlightText(highlights[index]);
  };

  // Single-accent chip style — premium clinical, no rainbow
  const chipColors = [
    'bg-subtle text-ink-primary border-line',
  ];

  return (
    <div className="bg-surface border-b border-line -mx-3 md:-mx-8 px-3 md:px-8 py-4 md:py-5 mb-5
                    sticky top-[57px] md:top-[73px] z-30 backdrop-blur-sm bg-surface/95">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-brand-700 hover:text-brand-900 font-semibold text-sm mb-3 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2.25} /> Pacientes
        </button>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Patient Info */}
          <div className="flex gap-4 items-start group">
            {/* Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-brand-700
                            flex items-center justify-center text-white text-xl font-semibold
                            flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="text-xl md:text-2xl font-bold text-ink-primary leading-tight bg-surface border border-line rounded-md px-3 py-1 outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-positive hover:bg-green-50 rounded-md transition-colors"
                    title="Salvar"
                  >
                    <Check size={18} strokeWidth={2.25} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-ink-tertiary hover:bg-subtle rounded-md transition-colors"
                    title="Cancelar"
                  >
                    <X size={18} strokeWidth={2.25} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-ink-primary leading-tight tracking-tight">
                    {patient.name}
                  </h1>
                  {onEditPatient && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-tertiary hover:text-brand-700 hover:bg-subtle rounded-md transition-all"
                      title="Editar nome"
                    >
                      <Pencil size={14} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-ink-tertiary text-sm mt-0.5">
                Paciente desde {formatDate(patient.createdAt)}
              </p>
              {/* Goal and Training Display */}
              {Boolean(patient.goals?.length || patient.goal || patient.trainingRoutine?.length) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {(patient.goals?.length || patient.goal) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-subtle text-ink-secondary border border-line">
                      <Target size={10} strokeWidth={2.25} />
                      {patient.goals?.length
                        ? patient.goals.map(g => g === 'outro' ? patient.goalCustom : GOAL_LABELS[g]).join(' + ')
                        : (patient.goal === 'outro' ? patient.goalCustom : GOAL_LABELS[patient.goal!])
                      }
                    </span>
                  )}
                  {patient.trainingRoutine?.length ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-subtle text-ink-secondary border border-line">
                      <Dumbbell size={10} strokeWidth={2.25} />
                      {patient.trainingRoutine.map(t => `${t.type}: ${t.frequency}`).join(', ')}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Actions — compact so they don't dominate the header */}
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap items-start">
            <button
              onClick={onNewConsultation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white
                         rounded-md font-semibold text-xs hover:bg-brand-900 transition-colors shadow-xs"
            >
              <Plus size={14} strokeWidth={2.25} />
              <span className="hidden sm:inline">Nova consulta</span>
              <span className="sm:hidden">Consulta</span>
            </button>
            <button
              onClick={onNewAdjustment}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line
                         text-ink-primary rounded-md font-semibold text-xs hover:bg-subtle transition-colors"
            >
              <Sliders size={14} strokeWidth={2.25} />
              <span className="hidden sm:inline">Ajuste clínico</span>
              <span className="sm:hidden">Ajuste</span>
            </button>
            {onUpdatePatient && (
              <button
                onClick={() => setShowClinicalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line
                           text-ink-primary rounded-md font-semibold text-xs hover:bg-subtle
                           transition-colors relative"
                title="Peso, altura, data de nascimento, %gordura, %massa magra, restrições"
              >
                <Activity size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Composição</span>
                <span className="sm:hidden">Comp.</span>
                {(patient.weightKg || patient.heightCm || patient.birthDate) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-700 border-2 border-surface" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Marcadores clínicos */}
        {(highlights.length > 0 || onUpdateHighlights) && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={11} className="text-brand-700" strokeWidth={2.25} />
              <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                Marcadores clínicos
                <span className="ml-1.5 text-ink-tertiary normal-case font-normal">{highlights.length}/{MAX_HIGHLIGHTS}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <div key={i} className="group/chip">
                  {editingHighlightIndex === i ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editHighlightText}
                        onChange={(e) => setEditHighlightText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditHighlight(i);
                          if (e.key === 'Escape') setEditingHighlightIndex(null);
                        }}
                        className="text-xs px-2 py-1 border border-line rounded-md outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 w-40 text-ink-primary"
                        autoFocus
                      />
                      <button onClick={() => saveEditHighlight(i)} className="p-0.5 text-positive hover:bg-green-50 rounded-sm">
                        <Check size={12} strokeWidth={2.25} />
                      </button>
                      <button onClick={() => setEditingHighlightIndex(null)} className="p-0.5 text-ink-tertiary hover:bg-subtle rounded-sm">
                        <X size={12} strokeWidth={2.25} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border cursor-default
                                  ${chipColors[i % chipColors.length]}`}
                    >
                      {h}
                      {onUpdateHighlights && (
                        <span className="hidden group-hover/chip:inline-flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => startEditHighlight(i)}
                            className="p-0.5 hover:bg-line rounded-sm transition-colors"
                            title="Editar"
                          >
                            <Pencil size={9} strokeWidth={2.25} />
                          </button>
                          <button
                            onClick={() => removeHighlight(i)}
                            className="p-0.5 hover:bg-red-50 rounded-sm transition-colors text-critical"
                            title="Remover"
                          >
                            <X size={9} strokeWidth={2.25} />
                          </button>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ))}

              {/* Add highlight button / input */}
              {onUpdateHighlights && (
                isAddingHighlight ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addHighlight();
                        if (e.key === 'Escape') { setIsAddingHighlight(false); setNewHighlight(''); }
                      }}
                      placeholder="Ex: intolerante à lactose"
                      className="text-xs px-2 py-1 border border-line rounded-md outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 w-44 text-ink-primary placeholder:text-ink-tertiary"
                      autoFocus
                    />
                    <button onClick={addHighlight} className="p-0.5 text-positive hover:bg-green-50 rounded-sm">
                      <Check size={12} strokeWidth={2.25} />
                    </button>
                    <button onClick={() => { setIsAddingHighlight(false); setNewHighlight(''); }} className="p-0.5 text-ink-tertiary hover:bg-subtle rounded-sm">
                      <X size={12} strokeWidth={2.25} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleClickAdd}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium
                               border border-dashed border-line text-ink-tertiary
                               hover:border-brand-700 hover:text-brand-700 transition-colors"
                  >
                    <Plus size={10} strokeWidth={2.25} /> Adicionar
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {showClinicalModal && onUpdatePatient && (
        <ClinicalDataModal
          patient={patient}
          onSave={(changes) => onUpdatePatient(changes)}
          onClose={() => setShowClinicalModal(false)}
        />
      )}
    </div>
  );
}
