import React, { useState } from 'react';
import { X, Save, Activity } from 'lucide-react';
import { Patient } from '../../../types';

interface ClinicalDataModalProps {
  patient: Patient;
  onSave: (changes: Partial<Patient>) => void;
  onClose: () => void;
}

export function ClinicalDataModal({ patient, onSave, onClose }: ClinicalDataModalProps) {
  const [weight, setWeight] = useState<string>(patient.weightKg ? String(patient.weightKg) : '');
  const [height, setHeight] = useState<string>(patient.heightCm ? String(patient.heightCm) : '');
  const [birthDate, setBirthDate] = useState<string>(patient.birthDate || '');
  const [bodyFat, setBodyFat] = useState<string>(patient.bodyFatPct != null ? String(patient.bodyFatPct) : '');
  const [leanMass, setLeanMass] = useState<string>(patient.leanMassPct != null ? String(patient.leanMassPct) : '');
  const [restrictions, setRestrictions] = useState<string>(patient.dietaryRestrictions || '');

  const handleSave = () => {
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
    onSave(changes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="bg-surface border-b border-line px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-md text-ink-primary flex items-center gap-2">
              <Activity size={15} className="text-brand-700" strokeWidth={2.25} /> Composição corporal
            </h3>
            <p className="text-2xs text-ink-tertiary mt-0.5">
              Usado para gerar e ajustar a prescrição nutricional
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
                Peso (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 65"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
                Altura (cm)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 165"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
                Nascimento
              </label>
              <input
                type="date"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
                % Gordura
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 22"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
              />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
                % Massa magra
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 78"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono"
                value={leanMass}
                onChange={(e) => setLeanMass(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1 block">
              Restrições / preferências
            </label>
            <input
              type="text"
              placeholder="Ex: vegetariana, sem lactose, alergia a amendoim"
              className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
            />
          </div>

          <p className="text-2xs text-ink-tertiary leading-relaxed pt-1">
            Os dados ficam salvos no perfil da paciente e são usados automaticamente em cada nova prescrição.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-subtle border-t border-line flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-line rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-900 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
          >
            <Save size={14} strokeWidth={2.25} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
