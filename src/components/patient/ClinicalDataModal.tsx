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
  const [restrictions, setRestrictions] = useState<string>(patient.dietaryRestrictions || '');

  const handleSave = () => {
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    const changes: Partial<Patient> = {};
    if (!isNaN(w) && w > 0) changes.weightKg = w;
    if (!isNaN(h) && h > 0) changes.heightCm = h;
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between">
          <div className="text-white">
            <h3 className="font-black text-base flex items-center gap-2">
              <Activity size={16} /> Dados clínicos
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              Usados para gerar e ajustar o plano alimentar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 65"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Altura (cm)
              </label>
              <input
                type="number"
                placeholder="Ex: 165"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Nascimento
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
              Restrições / preferências
            </label>
            <input
              type="text"
              placeholder="Ex: vegetariana, sem lactose, alergia a amendoim"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all"
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Esses dados ficam salvos na paciente e serão usados automaticamente sempre que você clicar em <span className="font-bold text-emerald-700">Gerar plano alimentar</span>.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
          >
            <Save size={14} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
