import React from 'react';
import { Patient, PatientExam } from '../../../types';
import { ExamUploader } from './ExamUploader';

interface PatientExamsProps {
  patient: Patient;
  onUpdateExams: (patientId: string, exams: PatientExam[]) => void;
}

export function PatientExams({ patient, onUpdateExams }: PatientExamsProps) {
  const exams = patient.exams || [];

  const handleChange = (next: PatientExam[]) => {
    onUpdateExams(patient.id, next);
  };

  const confirmedChange = (next: PatientExam[]) => {
    // Protect removals with a confirmation (only when list shrinks)
    if (next.length < exams.length) {
      if (!window.confirm('Remover este exame?')) return;
    }
    handleChange(next);
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-4 md:p-5 mb-4 md:mb-5">
      <ExamUploader exams={exams} onChange={confirmedChange} />
    </div>
  );
}
