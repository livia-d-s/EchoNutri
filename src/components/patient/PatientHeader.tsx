import React, { useState } from 'react';
import { ArrowLeft, Plus, Sliders, Pencil, Check, X, Target, Dumbbell, Sparkles, Activity } from 'lucide-react';
import { Patient, GOAL_LABELS } from '../../../types';
import { ClinicalDataModal } from './ClinicalDataModal';

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
      alert(`Limite de ${MAX_HIGHLIGHTS} marcadores atingido. Remova um para adicionar outro.`);
      return;
    }
    onUpdateHighlights(patient.id, [...highlights, newHighlight.trim()]);
    setNewHighlight('');
    setIsAddingHighlight(false);
  };

  const handleClickAdd = () => {
    if (highlights.length >= MAX_HIGHLIGHTS) {
      alert(`Limite de ${MAX_HIGHLIGHTS} marcadores atingido. Remova um para adicionar outro.`);
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

  // Blue tones palette for chips
  const chipColors = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-sky-50 text-sky-700 border-sky-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
    'bg-blue-100 text-blue-800 border-blue-300',
  ];

  return (
    <div className="bg-white border-b border-slate-200 -mx-3 md:-mx-8 px-3 md:px-8 py-4 md:py-6 mb-4 md:mb-6
                    sticky top-[57px] md:top-[73px] z-30 backdrop-blur-sm bg-white/95">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-3
                     hover:gap-3 transition-all"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Patient Info */}
          <div className="flex gap-4 items-start group">
            {/* Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600
                            flex items-center justify-center text-white text-2xl font-black
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
                    className="text-xl md:text-2xl font-black text-slate-900 leading-tight bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Salvar"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                    {patient.name}
                  </h1>
                  {onEditPatient && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar nome"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-slate-500 text-sm mt-0.5">
                Paciente desde {formatDate(patient.createdAt)}
              </p>
              {/* Goal and Training Display */}
              {Boolean(patient.goals?.length || patient.goal || patient.trainingRoutine?.length) && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(patient.goals?.length || patient.goal) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Target size={10} />
                      {patient.goals?.length
                        ? patient.goals.map(g => g === 'outro' ? patient.goalCustom : GOAL_LABELS[g]).join(' + ')
                        : (patient.goal === 'outro' ? patient.goalCustom : GOAL_LABELS[patient.goal!])
                      }
                    </span>
                  )}
                  {patient.trainingRoutine?.length ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <Dumbbell size={10} />
                      {patient.trainingRoutine.map(t => `${t.type}: ${t.frequency}`).join(', ')}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={onNewConsultation}
              className="flex items-center gap-2 px-4 py-2 bg-brand-700 text-white
                         rounded-md font-semibold text-sm hover:bg-brand-900 transition-colors shadow-xs"
            >
              <Plus size={15} strokeWidth={2.25} />
              <span className="hidden sm:inline">Nova consulta</span>
              <span className="sm:hidden">Consulta</span>
            </button>
            <button
              onClick={onNewAdjustment}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-line
                         text-ink-primary rounded-md font-semibold text-sm hover:bg-subtle transition-colors"
            >
              <Sliders size={15} strokeWidth={2.25} />
              <span className="hidden sm:inline">Ajuste clínico</span>
              <span className="sm:hidden">Ajuste</span>
            </button>
            {onUpdatePatient && (
              <button
                onClick={() => setShowClinicalModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-line
                           text-ink-primary rounded-md font-semibold text-sm hover:bg-subtle
                           transition-colors relative"
                title="Peso, altura, data de nascimento, %gordura, %massa magra, restrições"
              >
                <Activity size={15} strokeWidth={2.25} />
                <span className="hidden sm:inline">Composição</span>
                <span className="sm:hidden">Comp.</span>
                {(patient.weightKg || patient.heightCm || patient.birthDate) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-700 border-2 border-surface" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Highlights section */}
        {(highlights.length > 0 || onUpdateHighlights) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={12} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                Marcadores clínicos <span className="text-slate-300 normal-case">(máx. {MAX_HIGHLIGHTS})</span>
                <span className="ml-1 text-slate-300 normal-case">— {highlights.length}/{MAX_HIGHLIGHTS}</span>
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
                        className="text-xs px-2 py-1 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 w-40"
                        autoFocus
                      />
                      <button onClick={() => saveEditHighlight(i)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingHighlightIndex(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-default
                                  ${chipColors[i % chipColors.length]}`}
                    >
                      {h}
                      {onUpdateHighlights && (
                        <span className="hidden group-hover/chip:inline-flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => startEditHighlight(i)}
                            className="p-0.5 hover:bg-blue-200/50 rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil size={9} />
                          </button>
                          <button
                            onClick={() => removeHighlight(i)}
                            className="p-0.5 hover:bg-red-200/50 rounded transition-colors text-red-400"
                            title="Remover"
                          >
                            <X size={9} />
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
                      placeholder="Ex: Intolerante à lactose"
                      className="text-xs px-2 py-1 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 w-44"
                      autoFocus
                    />
                    <button onClick={addHighlight} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                      <Check size={12} />
                    </button>
                    <button onClick={() => { setIsAddingHighlight(false); setNewHighlight(''); }} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleClickAdd}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
                               border border-dashed border-slate-300 text-slate-400
                               hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <Plus size={10} /> Adicionar
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
