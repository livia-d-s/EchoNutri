import React, { useState } from 'react';
import { Utensils, X, Loader2, Sparkles, Check, FileText } from 'lucide-react';
import { Patient, StructuredMealPlan } from '../../../types';

interface MealPlanBubbleProps {
  patient: Patient;
  // Optional initial plan (e.g., when shown on the DiagnosisView with an existing plan)
  initialPlan?: StructuredMealPlan | null;
  // Updates the patient's anthropometric/restriction data
  onUpdatePatient: (changes: Partial<Patient>) => void;
  // Called when nutri clicks "Gerar plano"
  onGeneratePlan: (anthropometry: {
    weightKg?: number;
    heightCm?: number;
    age?: number;
    dietaryRestrictions?: string;
  }) => Promise<StructuredMealPlan | null>;
}

export function MealPlanBubble({
  patient,
  initialPlan,
  onUpdatePatient,
  onGeneratePlan,
}: MealPlanBubbleProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<boolean>(!!initialPlan);
  const [justGenerated, setJustGenerated] = useState(false);

  // Local edit state for anthropometric data (initialized from patient)
  const [weight, setWeight] = useState<string>(patient.weightKg ? String(patient.weightKg) : '');
  const [height, setHeight] = useState<string>(patient.heightCm ? String(patient.heightCm) : '');
  const [birthDate, setBirthDate] = useState<string>(patient.birthDate || '');
  const [bodyFat, setBodyFat] = useState<string>(patient.bodyFatPct != null ? String(patient.bodyFatPct) : '');
  const [leanMass, setLeanMass] = useState<string>(patient.leanMassPct != null ? String(patient.leanMassPct) : '');
  const [restrictions, setRestrictions] = useState<string>(patient.dietaryRestrictions || '');

  const hasExternalPlan = Array.isArray(patient.mealPlans) && patient.mealPlans.length > 0;

  const computeAge = (iso: string): number | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const ms = Date.now() - d.getTime();
    const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
    return yrs > 0 && yrs < 130 ? yrs : null;
  };

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const w = parseFloat(weight.replace(',', '.'));
      const h = parseFloat(height.replace(',', '.'));
      const bf = parseFloat(bodyFat.replace(',', '.'));
      const lm = parseFloat(leanMass.replace(',', '.'));
      const changes: Partial<Patient> = {};
      if (!isNaN(w) && w > 0) changes.weightKg = w;
      if (!isNaN(h) && h > 0) changes.heightCm = h;
      if (!isNaN(bf) && bf > 0 && bf < 100) changes.bodyFatPct = bf;
      if (!isNaN(lm) && lm > 0 && lm < 100) changes.leanMassPct = lm;
      if (birthDate) changes.birthDate = birthDate;
      if (restrictions.trim()) changes.dietaryRestrictions = restrictions.trim();
      if (Object.keys(changes).length > 0) onUpdatePatient(changes);

      const anthropo: any = {};
      if (!isNaN(w) && w > 0) anthropo.weightKg = w;
      if (!isNaN(h) && h > 0) anthropo.heightCm = h;
      if (!isNaN(bf) && bf > 0 && bf < 100) anthropo.bodyFatPct = bf;
      if (!isNaN(lm) && lm > 0 && lm < 100) anthropo.leanMassPct = lm;
      const age = computeAge(birthDate);
      if (age) anthropo.age = age;
      if (restrictions.trim()) anthropo.dietaryRestrictions = restrictions.trim();

      const plan = await onGeneratePlan(anthropo);
      if (plan) {
        setGenerated(true);
        setJustGenerated(true);
        // Show check briefly, then close panel and scroll to the plan card.
        window.setTimeout(() => {
          setJustGenerated(false);
          setOpen(false);
          // Wait for next paint so the card is mounted before scrolling.
          requestAnimationFrame(() => {
            const el = document.getElementById('meal-plan-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }, 900);
      } else {
        setError('A IA não retornou um plano estruturado. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Plan generation error:', err);
      setError(err?.message || 'Erro ao gerar plano alimentar.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Panel (expanded) */}
      {open && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-surface rounded-lg shadow-md border border-line overflow-hidden max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-ink-primary flex items-center gap-1.5">
                  <Utensils size={14} strokeWidth={2.25} className="text-brand-700" /> Prescrição nutricional
                </h3>
                <p className="text-2xs text-ink-tertiary mt-0.5">
                  Composição corporal + análise da consulta
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

            {/* Body */}
            <div className="p-4 overflow-y-auto">
              {hasExternalPlan ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <p className="font-bold mb-1">Esta paciente já tem plano alimentar ativo.</p>
                      <p>
                        A IA já considera o plano atual ao sugerir ajustes na conduta nutricional. Para gerar um plano novo do zero, primeiro remova o plano atual em <span className="font-bold">Planos Alimentares</span> no perfil da paciente.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-tertiary mb-2">
                    Composição corporal <span className="font-normal normal-case tracking-normal">(opcional — refina a prescrição)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Peso (kg)"
                      className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Altura (cm)"
                      className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                    <input
                      type="date"
                      className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      title="Data de nascimento"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="% Gordura"
                      className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                      title="Percentual de gordura corporal"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="% Massa magra"
                      className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                      value={leanMass}
                      onChange={(e) => setLeanMass(e.target.value)}
                      title="Percentual de massa magra"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Restrições / preferências (ex: vegetariana, sem lactose)"
                    className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm text-ink-primary placeholder:text-ink-tertiary focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all mt-2"
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                  />

                  <div className="mt-4 p-3 bg-subtle rounded-md border border-line">
                    <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5 flex items-center gap-1">
                      <Sparkles size={10} className="text-brand-700" strokeWidth={2.25} /> A IA também usa
                    </div>
                    <ul className="text-xs text-ink-secondary space-y-0.5 leading-relaxed">
                      <li>• Tudo o que foi dito na consulta</li>
                      <li>• Objetivo e rotina de treino da paciente</li>
                      <li>• Adesão e perfil comportamental detectados</li>
                      <li>• Exames anexados (se houver)</li>
                    </ul>
                  </div>

                  {error && (
                    <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-md text-xs text-critical">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={generating || justGenerated}
                    className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-md shadow-xs transition-colors disabled:opacity-90 ${
                      justGenerated ? 'bg-positive' : 'bg-brand-700 hover:bg-brand-900'
                    }`}
                  >
                    {justGenerated ? (
                      <><Check size={15} strokeWidth={2.25} /> Prescrição gerada</>
                    ) : generating ? (
                      <><Loader2 size={14} className="animate-spin" /> Gerando…</>
                    ) : generated ? (
                      <><Sparkles size={14} strokeWidth={2.25} /> Gerar nova prescrição</>
                    ) : (
                      <><Sparkles size={14} strokeWidth={2.25} /> Gerar prescrição</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 md:right-6 z-50 w-11 h-11 rounded-md bg-brand-700 text-white shadow-md hover:bg-brand-900 active:scale-95 transition-all flex items-center justify-center group"
        title="Prescrição nutricional — composição corporal e geração"
        style={{ right: 'calc(1rem + 56px)' }}
      >
        <Utensils size={17} strokeWidth={2.25} />
        {generated && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-positive border-2 border-base" />
        )}
      </button>
    </>
  );
}
