import React, { useRef, useState } from 'react';
import { FileText, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { PatientExam } from '../../../types';
import { extractTextFromPdf, MAX_PDF_FILE_SIZE } from '../../utils/pdfExtract';

interface ExamUploaderProps {
  exams: PatientExam[];
  onChange: (exams: PatientExam[]) => void;
  compact?: boolean;
  label?: string;          // Default: "Exames laboratoriais"
  emptyMessage?: string;   // Default: generic exam message
  idPrefix?: string;       // Prefix for generated IDs (default "exam")
  buttonColor?: 'blue' | 'emerald'; // Accent color variant
}

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

export function ExamUploader({
  exams, onChange, compact = false,
  label = 'Exames laboratoriais',
  emptyMessage = 'Nenhum exame. A IA considerará os PDFs anexados durante a análise.',
  idPrefix = 'exam',
  buttonColor = 'blue',
}: ExamUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Single-accent rebrand — both variants flatten to the same brand-700 treatment.
  const accent = 'text-ink-primary bg-surface border border-line hover:bg-subtle hover:border-brand-700';
  const iconColor = 'text-brand-700';
  void compact;
  void buttonColor;

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
        setError('Não foi possível extrair texto do PDF. Verifique se o arquivo não é uma imagem escaneada.');
        return;
      }
      const newExam: PatientExam = {
        id: `${idPrefix}_${Date.now()}`,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        extractedText: text,
        sizeBytes: file.size,
      };
      onChange([...exams, newExam]);
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

  const removeExam = (examId: string) => {
    onChange(exams.filter(e => e.id !== examId));
  };

  return (
    <div className={compact ? '' : ''}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs font-semibold text-ink-secondary uppercase tracking-[0.1em]">
          {label} {exams.length > 0 && <span className="text-ink-tertiary normal-case font-normal">· {exams.length}</span>}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${accent}`}
        >
          {isUploading ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Processando
            </>
          ) : (
            <>
              <Plus size={11} strokeWidth={2.25} className="text-brand-700" /> Anexar PDF
            </>
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
        <div className="mb-2 flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded-md text-xs text-critical">
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <p className="text-xs text-ink-tertiary">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-1.5">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center gap-2.5 p-2 bg-subtle rounded-md border border-line group"
            >
              <FileText size={13} className={`${iconColor} flex-shrink-0`} strokeWidth={2.25} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-primary truncate">{exam.fileName}</p>
                <p className="text-2xs text-ink-tertiary">
                  {formatDate(exam.uploadedAt)}
                  {exam.sizeBytes ? ` · ${formatFileSize(exam.sizeBytes)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeExam(exam.id)}
                className="p-1 text-ink-tertiary hover:text-critical hover:bg-red-50 rounded-sm transition-colors"
                title="Remover"
              >
                <X size={12} strokeWidth={2.25} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
