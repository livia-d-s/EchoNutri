import React, { useEffect, useState } from 'react';
import { X, Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { planBackfill, runBackfill, BackfillPlan, BackfillReport } from '../../services/backfillMigration';

interface MigrationPanelProps {
  userId: string;
  onClose: () => void;
}

type Phase = 'planning' | 'plan' | 'running' | 'done' | 'error';

export function MigrationPanel({ userId, onClose }: MigrationPanelProps) {
  const [phase, setPhase] = useState<Phase>('planning');
  const [plan, setPlan] = useState<BackfillPlan | null>(null);
  const [report, setReport] = useState<BackfillReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let alive = true;
    planBackfill(userId)
      .then(p => { if (alive) { setPlan(p); setPhase('plan'); } })
      .catch(e => { if (alive) { setErrorMsg(e instanceof Error ? e.message : String(e)); setPhase('error'); } });
    return () => { alive = false; };
  }, [userId]);

  const handleRun = async () => {
    setPhase('running');
    try {
      const r = await runBackfill(userId);
      setReport(r);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const Row = ({ label, value }: { label: string; value: number }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-line last:border-0">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className="text-sm font-mono font-semibold text-ink-primary">{value}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-lg shadow-md border border-line w-full max-w-md overflow-hidden"
      >
        <div className="bg-surface border-b border-line px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-md text-ink-primary flex items-center gap-2">
            <Database size={15} className="text-brand-700" strokeWidth={2.25} /> Migração de dados (legado → novo)
          </h3>
          <button onClick={onClose} className="p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {phase === 'planning' && (
            <div className="flex items-center gap-2 text-ink-secondary text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Analisando dados legados…
            </div>
          )}

          {phase === 'plan' && plan && (
            <>
              {!plan.hasLegacyData ? (
                <p className="text-sm text-ink-secondary py-4 text-center">
                  Nenhum dado legado encontrado. Nada a migrar. ✓
                </p>
              ) : (
                <>
                  <p className="text-2xs text-ink-tertiary uppercase tracking-[0.16em] font-semibold">Pré-visualização (nada foi gravado ainda)</p>
                  <div>
                    <Row label="Pacientes legados encontrados" value={plan.legacyPatients} />
                    <Row label="Pacientes a criar" value={plan.patientsToCreate} />
                    <Row label="Já presentes no esquema novo" value={plan.patientsAlreadyPresent} />
                    <Row label="Exames (PDF) a migrar" value={plan.exams} />
                    <Row label="Planos alimentares (PDF) a migrar" value={plan.mealPlans} />
                    <Row label="Consultas → prescrições" value={plan.prescriptions} />
                    <Row label="Ajustes → notas de evolução" value={plan.adjustmentNotes} />
                    <Row label="Pesos iniciais a semear" value={plan.weightSeeds} />
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-2xs text-amber-800 leading-relaxed">
                      Garanta que as regras do Firestore atualizadas (com a subcoleção de pacientes) já foram publicadas, senão a migração de exames/planos vai falhar por permissão. A operação é idempotente — pode rodar de novo sem duplicar.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {phase === 'running' && (
            <div className="flex items-center gap-2 text-ink-secondary text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Migrando… não feche esta janela.
            </div>
          )}

          {phase === 'done' && report && (
            <>
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <CheckCircle2 size={16} /> Migração concluída
              </div>
              <div>
                <Row label="Pacientes criados" value={report.written.patients} />
                <Row label="Exames migrados" value={report.written.exams} />
                <Row label="Planos migrados" value={report.written.mealPlans} />
                <Row label="Prescrições criadas" value={report.written.prescriptions} />
                <Row label="Notas de evolução" value={report.written.adjustmentNotes} />
                <Row label="Pesos semeados" value={report.written.weightSeeds} />
              </div>
              {report.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2.5 max-h-40 overflow-auto">
                  <p className="text-2xs font-semibold text-red-700 mb-1">{report.errors.length} erro(s):</p>
                  <ul className="text-2xs text-red-600 space-y-0.5 list-disc list-inside">
                    {report.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-2xs text-ink-tertiary">Recarregue a página para ver os dados vindos do esquema novo.</p>
            </>
          )}

          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-subtle border-t border-line flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-line rounded-md transition-colors">
            {phase === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {phase === 'plan' && plan?.hasLegacyData && (
            <button onClick={handleRun} className="px-4 py-2 bg-brand-700 hover:bg-brand-900 text-white text-sm font-semibold rounded-md shadow-xs transition-colors">
              Confirmar e migrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
