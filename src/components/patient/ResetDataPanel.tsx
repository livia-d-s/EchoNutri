import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { deleteAllNutritionistData, deleteLegacyAppData } from '../../services/firestoreNewSchema';

interface ResetDataPanelProps {
  userId: string;
  onClose: () => void;
  onDone: () => void;
}

type Phase = 'confirm' | 'running' | 'done' | 'error';

/**
 * Wipes every patient/consultation owned by the current account so it can
 * start clean on the new schema. Guarded by a typed confirmation. Intended for
 * the pre-launch clean start (disposable test data) — destructive.
 */
export function ResetDataPanel({ userId, onClose, onDone }: ResetDataPanelProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [result, setResult] = useState<{ patients: number; prescriptions: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleReset = async () => {
    setPhase('running');
    try {
      const r = await deleteAllNutritionistData(userId);
      await deleteLegacyAppData(userId);
      setResult(r);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden">
        <div className="bg-surface border-b border-line px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-md text-ink-primary flex items-center gap-2">
            <Trash2 size={15} className="text-red-600" strokeWidth={2.25} /> Recomeçar do zero
          </h3>
          <button onClick={onClose} className="p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {phase === 'confirm' && (
            <>
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-2.5">
                <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-2xs text-red-800 leading-relaxed">
                  Isto apaga <strong>todas as pacientes, consultas, exames e planos</strong> desta conta, de forma permanente. Use só para limpar dados de teste antes do lançamento.
                </p>
              </div>
              <label className="text-2xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary block">
                Digite APAGAR para confirmar
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="APAGAR"
                className="w-full bg-surface border border-line rounded-md py-2 px-2.5 outline-none text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </>
          )}

          {phase === 'running' && (
            <div className="flex items-center gap-2 text-ink-secondary text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Apagando… não feche esta janela.
            </div>
          )}

          {phase === 'done' && result && (
            <>
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <CheckCircle2 size={16} /> Dados apagados
              </div>
              <p className="text-sm text-ink-secondary">
                {result.patients} paciente(s) e {result.prescriptions} consulta(s) removidas. A tela já está limpa.
              </p>
            </>
          )}

          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{errorMsg}</div>
          )}
        </div>

        <div className="px-5 py-3 bg-subtle border-t border-line flex justify-end gap-2">
          <button onClick={phase === 'done' ? onDone : onClose} className="px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-line rounded-md transition-colors">
            {phase === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {phase === 'confirm' && (
            <button
              onClick={handleReset}
              disabled={confirmText !== 'APAGAR'}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Apagar tudo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
