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
        id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        extractedText: text,
        sizeBytes: file.size,
      };
      // Derive from the source array (patient.mealPlans), not the sorted copy,
      // so a rapid second action can't overwrite with a stale snapshot.
      onUpdateMealPlans(patient.id, [...(patient.mealPlans || []), newPlan]);
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
    const isActive = planId === activePlanId;
    const msg = isActive
      ? 'Remover o plano atual? A IA deixará de usá-lo como referência nas próximas análises.'
      : 'Remover este plano do histórico?';
    if (!window.confirm(msg)) return;
    onUpdateMealPlans(patient.id, (patient.mealPlans || []).filter(p => p.id !== planId));
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-4 md:p-5 mb-4 md:mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-brand-700" strokeWidth={2.25} />
          <h3 className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
            Prescrição vigente
            <span className="ml-1.5 text-ink-tertiary normal-case font-normal">{plans.length}</span>
          </h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-primary bg-surface border border-line hover:bg-subtle hover:border-brand-700 rounded-md transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <><Loader2 size={12} className="animate-spin" /> Processando</>
          ) : (
            <><Plus size={12} strokeWidth={2.25} className="text-brand-700" /> Anexar PDF</>
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
        <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-md text-xs text-critical">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-xs text-ink-tertiary py-1">
          Nenhuma prescrição ainda. Anexe um PDF como referência para sugerir ajustes.
        </p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`flex items-center gap-3 p-2.5 rounded-md border group transition-colors ${
                  isActive
                    ? 'bg-surface border-brand-700'
                    : 'bg-subtle border-line opacity-75'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-brand-700/10' : 'bg-subtle'
                }`}>
                  <FileText size={14} className={isActive ? 'text-brand-700' : 'text-ink-tertiary'} strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-primary truncate">{plan.fileName}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-2xs font-semibold uppercase tracking-[0.08em] bg-brand-700 text-white">
                        <Check size={8} strokeWidth={2.5} /> Vigente
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-ink-tertiary">
                    Anexado em {formatDate(plan.uploadedAt)}
                    {plan.sizeBytes ? ` · ${formatFileSize(plan.sizeBytes)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => removePlan(plan.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-tertiary hover:text-critical hover:bg-red-50 rounded-md transition-all"
                  title="Remover"
                >
                  <X size={13} strokeWidth={2.25} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
