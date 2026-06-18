import React from 'react';
import { Patient, PatientExam } from '../../../types';
import { ExamUploader } from './ExamUploader';

interface PatientSupplementsProps {
  patient: Patient;
  onUpdateSupplements: (patientId: string, supplements: PatientExam[]) => void;
}

export function PatientSupplements({ patient, onUpdateSupplements }: PatientSupplementsProps) {
  const supplements = patient.supplements || [];

  const confirmedChange = (next: PatientExam[]) => {
    // Protect removals with a confirmation (only when the list shrinks)
    if (next.length < supplements.length) {
      if (!window.confirm('Remover este suplemento?')) return;
    }
    onUpdateSupplements(patient.id, next);
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-4 md:p-5 mb-4 md:mb-5">
      <ExamUploader
        exams={supplements}
        onChange={confirmedChange}
        label="Suplementos"
        emptyMessage="Nenhum suplemento anexado. Anexe a prescrição de suplementos em PDF."
        idPrefix="supp"
      />
    </div>
  );
}
