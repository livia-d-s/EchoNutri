import React, { useState, useMemo } from 'react';
import { Patient, TimelineEvent } from '../../../types';
import { PatientHeader } from './PatientHeader';
import { PatientTimeline } from './PatientTimeline';
import { PatientExams } from './PatientExams';
import { PatientMealPlans } from './PatientMealPlans';
import { AdjustmentModal } from './AdjustmentModal';
import { PatientExam, MealPlan } from '../../../types';

interface PatientPageProps {
  patient: Patient;
  events: TimelineEvent[];
  onBack: () => void;
  onNewConsultation: (patient: Patient) => void;
  onAddAdjustment: (patientId: string, note: string, parentEventId?: string) => void;
  onEventClick: (event: TimelineEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string, newNote: string) => void;
  onEditPatient?: (patientId: string, newName: string) => void;
  onUpdateHighlights?: (patientId: string, highlights: string[]) => void;
  onUpdateExams?: (patientId: string, exams: PatientExam[]) => void;
  onUpdateMealPlans?: (patientId: string, mealPlans: MealPlan[]) => void;
  onUpdatePatient?: (patientId: string, changes: Partial<Patient>) => void;
}

export function PatientPage({
  patient,
  events,
  onBack,
  onNewConsultation,
  onAddAdjustment,
  onEventClick,
  onDeleteEvent,
  onEditEvent,
  onEditPatient,
  onUpdateHighlights,
  onUpdateExams,
  onUpdateMealPlans,
  onUpdatePatient,
}: PatientPageProps) {
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Filter events for this patient
  const patientEvents = events.filter(e => e.patientId === patient.id);

  // Get only consultations (not adjustments) for the selector, most recent first
  const consultations = useMemo(() => {
    const toTime = (d: any): number => {
      if (!d) return 0;
      if (d.toDate) return d.toDate().getTime();
      if (d.seconds) return d.seconds * 1000;
      const parsed = new Date(d).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };
    return patientEvents
      .filter(e => e.type !== 'adjustment')
      .sort((a, b) => toTime(b.date) - toTime(a.date));
  }, [patientEvents]);

  const handleSaveAdjustment = (note: string, parentEventId?: string) => {
    onAddAdjustment(patient.id, note, parentEventId);
    setShowAdjustmentModal(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <PatientHeader
        patient={patient}
        onBack={onBack}
        onNewConsultation={() => onNewConsultation(patient)}
        onNewAdjustment={() => setShowAdjustmentModal(true)}
        onEditPatient={onEditPatient}
        onUpdateHighlights={onUpdateHighlights}
        onUpdatePatient={onUpdatePatient ? (changes) => onUpdatePatient(patient.id, changes) : undefined}
      />

      <div className="max-w-6xl mx-auto">
        {onUpdateExams && (
          <PatientExams patient={patient} onUpdateExams={onUpdateExams} />
        )}
        {onUpdateMealPlans && (
          <PatientMealPlans patient={patient} onUpdateMealPlans={onUpdateMealPlans} />
        )}
        <PatientTimeline
          events={patientEvents}
          onEventClick={onEventClick}
          onDeleteEvent={onDeleteEvent}
          onEditEvent={onEditEvent}
        />
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <AdjustmentModal
          patientName={patient.name}
          consultations={consultations}
          onSave={handleSaveAdjustment}
          onClose={() => setShowAdjustmentModal(false)}
        />
      )}
    </div>
  );
}
