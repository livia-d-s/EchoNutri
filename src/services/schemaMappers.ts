/**
 * Pure mappers between the Firestore new-schema shapes and the app's local
 * working types (Patient / TimelineEvent). Kept separate so App.tsx never
 * touches Firestore shapes directly.
 */
import {
  Patient,
  TimelineEvent,
  FirestorePatient,
  FirestorePrescription,
  EvolutionNote,
  PatientExam,
  MealPlan,
} from '../../types';

/** patients/{id} (+ its exam/meal-plan subcollections) -> local Patient. */
export function firestorePatientToLocal(
  fp: FirestorePatient,
  exams: PatientExam[],
  mealPlans: MealPlan[]
): Patient {
  return {
    id: fp.id,
    name: fp.name,
    phone: fp.phone || undefined,
    email: fp.email || undefined,
    birthDate: fp.dateOfBirth || undefined,
    createdAt: fp.createdAt,
    weightKg: fp.weightKg,
    heightCm: fp.heightCm,
    bodyFatPct: fp.bodyFatPct,
    leanMassPct: fp.leanMassPct,
    dietaryRestrictions: fp.dietaryRestrictions,
    goal: fp.goal,
    goals: fp.goals || [],
    goalCustom: fp.goalCustom,
    trainingRoutine: fp.trainingRoutine || [],
    isFirstConsultation: fp.isFirstConsultation,
    highlights: fp.highlights || [],
    exams,
    mealPlans,
  };
}

/** local Patient -> patients/{id} fields (identity + current-state clinical). */
export function localPatientToFirestore(
  p: Partial<Patient>
): Partial<Omit<FirestorePatient, 'id' | 'nutritionistId' | 'createdAt' | 'status'>> {
  return {
    name: p.name,
    phone: p.phone,
    email: p.email,
    dateOfBirth: p.birthDate,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    bodyFatPct: p.bodyFatPct,
    leanMassPct: p.leanMassPct,
    dietaryRestrictions: p.dietaryRestrictions,
    goal: p.goal,
    goals: p.goals,
    goalCustom: p.goalCustom,
    trainingRoutine: p.trainingRoutine,
    isFirstConsultation: p.isFirstConsultation,
    highlights: p.highlights,
  };
}

/** prescriptions/{id} -> consultation TimelineEvent. */
export function prescriptionToEvent(p: FirestorePrescription, fallbackDoctor: string): TimelineEvent {
  return {
    id: p.id,
    patientId: p.patientId,
    type: p.type,
    date: p.date,
    transcript: p.transcript,
    result: p.result,
    suggestedNextQuestions: p.suggestedNextQuestions,
    doctorName: p.doctorName || fallbackDoctor,
    createdAt: p.createdAt,
  };
}

/** evolution/{pid}/notes/{id} -> adjustment TimelineEvent. */
export function noteToEvent(n: EvolutionNote, fallbackDoctor: string): TimelineEvent {
  return {
    id: n.id,
    patientId: n.patientId,
    type: 'adjustment',
    date: n.date,
    adjustmentNote: n.note,
    doctorName: fallbackDoctor,
    createdAt: n.createdAt,
  };
}
