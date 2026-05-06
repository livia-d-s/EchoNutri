import React, { useRef, useState } from 'react';
import { FileText, Plus, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { Patient, MealPlan } from '../../../types';
import { extractTextFromPdf, MAX_PDF_FILE_SIZE } from '../../utils/pdfExtract';

interface PatientMealPlansProps {
  patient: Patient;
  onUpdateMealPlans: (patientId: string, mealPlans: MealPlan[]) => void;
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
    const date = typeof d === 'string' ? new Date(d) : new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function PatientMealPlans({ patient, onUpdateMealPlans }: PatientMealPlansProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort by date, most recent first — first item is considered "active"
  const plans = [...(patient.mealPlans || [])].sort(
    (a, b) => toTime(b.uploadedAt) - toTime(a.uploadedAt)
  );
  const activePlanId = plans[0]?.id;

  const handleFile = async (file: File) => {
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Apenas arquivos PDF são aceitos.');
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE) {
      setError('PDF acima de 10MB. Tente um arquivo menor.');
      return;
    }

    setIsUploading(true);
    try {
      const text = await extractTextFromPdf(file);
      if (!text || text.length < 10) {
        setError('Não foi possível extrair texto do PDF. O arquivo pode ser uma imagem escaneada.');
        return;
      }
      const newPlan: MealPlan = {
        id: `plan_${Date.now()}`,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        extractedText: text,
        sizeBytes: file.size,
      };
      onUpdateMealPlans(patient.id, [...plans, newPlan]);
    } catch (err) {
      console.error('PDF extraction error:', err);
      setError('Erro ao processar o PDF. Tente outro arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const isActive = planId === activePlanId;
    const msg = isActive
      ? 'Remover o plano atual? A IA deixará de usá-lo como referência nas próximas análises.'
      : 'Remover este plano do histórico?';
    if (!window.confirm(msg)) return;
    onUpdateMealPlans(patient.id, plans.filter(p => p.id !== planId));
    void plan;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-5 mb-4 md:mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-emerald-600" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
            Plano alimentar
            <span className="ml-1 text-slate-300 normal-case">— {plans.length}</span>
          </h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <><Loader2 size={12} className="animate-spin" /> Processando</>
          ) : (
            <><Plus size={12} /> Anexar PDF</>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          Nenhum plano anexado. Importe um PDF de plano alimentar para a IA sugerir ajustes baseados no plano atual.
        </p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border group transition-colors ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-100 opacity-75'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  <FileText size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700 truncate">{plan.fileName}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                        <Check size={8} /> Atual
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Anexado em {formatDate(plan.uploadedAt)}
                    {plan.sizeBytes ? ` • ${formatFileSize(plan.sizeBytes)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => removePlan(plan.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
