/**
 * Firestore functions for new schema (Patients, Prescriptions, Evolution)
 * Handles CRUD operations for the restructured collections
 */

import {
  db,
} from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  FirestorePatient,
  FirestorePrescription,
  EvolutionWeight,
  EvolutionExam,
  EvolutionNote,
  StructuredMealPlan,
  PatientExam,
  MealPlan,
} from '../../types';

// ============ PATIENTS COLLECTION ============

/**
 * Create a new patient record in Firestore
 */
export async function createPatient(
  nutritionistId: string,
  data: Omit<FirestorePatient, 'id' | 'createdAt' | 'updatedAt' | 'nutritionistId' | 'status'>
): Promise<FirestorePatient> {
  const now = new Date().toISOString();
  const patientRef = await addDoc(collection(db, 'patients'), {
    ...data,
    nutritionistId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: patientRef.id,
    ...data,
    nutritionistId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get patient by ID
 */
export async function getPatient(patientId: string): Promise<FirestorePatient | null> {
  try {
    const snap = await getDoc(doc(db, 'patients', patientId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FirestorePatient;
  } catch (err) {
    console.error('Failed to get patient:', err);
    return null;
  }
}

/**
 * Get all patients for a nutritionist
 */
export async function getPatientsByNutritionist(nutritionistId: string): Promise<FirestorePatient[]> {
  try {
    const q = query(
      collection(db, 'patients'),
      where('nutritionistId', '==', nutritionistId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePatient));
  } catch (err) {
    console.error('Failed to get patients:', err);
    return [];
  }
}

/**
 * Get uploaded exam PDFs for a patient (Híbrido model: stored as a
 * subcollection under patients/{id}/exams to stay under the 1MB doc limit).
 */
export async function getPatientExams(patientId: string): Promise<PatientExam[]> {
  try {
    const snap = await getDocs(collection(db, 'patients', patientId, 'exams'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientExam));
  } catch (err) {
    console.error('Failed to get patient exams:', err);
    return [];
  }
}

/**
 * Get uploaded meal-plan PDFs for a patient (subcollection patients/{id}/mealPlans).
 */
export async function getPatientMealPlans(patientId: string): Promise<MealPlan[]> {
  try {
    const snap = await getDocs(collection(db, 'patients', patientId, 'mealPlans'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MealPlan));
  } catch (err) {
    console.error('Failed to get patient meal plans:', err);
    return [];
  }
}

/**
 * Update patient
 */
export async function updatePatient(
  patientId: string,
  updates: Partial<Omit<FirestorePatient, 'id' | 'nutritionistId' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'patients', patientId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update patient:', err);
    throw err;
  }
}

/**
 * Archive patient (soft delete)
 */
export async function archivePatient(patientId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'patients', patientId), {
      status: 'archived',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to archive patient:', err);
    throw err;
  }
}

// ============ PRESCRIPTIONS COLLECTION ============

/**
 * Create a new prescription
 */
export async function createPrescription(
  nutritionistId: string,
  patientId: string,
  data: Omit<FirestorePrescription, 'id' | 'nutritionistId' | 'patientId' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<FirestorePrescription> {
  const now = new Date().toISOString();
  const prescRef = await addDoc(collection(db, 'prescriptions'), {
    ...data,
    nutritionistId,
    patientId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: prescRef.id,
    ...data,
    nutritionistId,
    patientId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get prescription by ID
 */
export async function getPrescription(prescriptionId: string): Promise<FirestorePrescription | null> {
  try {
    const snap = await getDoc(doc(db, 'prescriptions', prescriptionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FirestorePrescription;
  } catch (err) {
    console.error('Failed to get prescription:', err);
    return null;
  }
}

/**
 * Get all prescriptions for a patient (ordered by date, newest first)
 */
export async function getPrescriptionsByPatient(patientId: string): Promise<FirestorePrescription[]> {
  try {
    const q = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', patientId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePrescription));
  } catch (err) {
    console.error('Failed to get prescriptions:', err);
    return [];
  }
}

/**
 * Get active prescription for a patient (most recent with status 'delivered')
 */
export async function getActivePrescription(patientId: string): Promise<FirestorePrescription | null> {
  try {
    const q = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', patientId),
      where('status', '==', 'delivered'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as FirestorePrescription;
  } catch (err) {
    console.error('Failed to get active prescription:', err);
    return null;
  }
}

/**
 * Update prescription (e.g., mark as delivered)
 */
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<Omit<FirestorePrescription, 'id' | 'patientId' | 'nutritionistId' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'prescriptions', prescriptionId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update prescription:', err);
    throw err;
  }
}

// ============ EVOLUTION COLLECTION ============

/**
 * Record weight entry for patient
 */
export async function recordWeight(
  patientId: string,
  weight: number,
  unit: 'kg' | 'lb' = 'kg',
  notes?: string
): Promise<EvolutionWeight> {
  const now = new Date().toISOString();
  // Firestore rejects `undefined` field values, so only include `notes` when set.
  const data: Record<string, unknown> = {
    patientId,
    date: now,
    value: weight,
    unit,
    createdAt: now,
  };
  if (notes !== undefined) data.notes = notes;
  const weightRef = await addDoc(
    collection(db, 'evolution', patientId, 'weight'),
    data
  );
  return {
    id: weightRef.id,
    patientId,
    date: now,
    value: weight,
    unit,
    notes,
    createdAt: now,
  };
}

/**
 * Get weight history for patient (ordered by date, newest first)
 */
export async function getWeightHistory(patientId: string, limit: number = 30): Promise<EvolutionWeight[]> {
  try {
    const q = query(
      collection(db, 'evolution', patientId, 'weight'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .slice(0, limit)
      .map(d => ({ id: d.id, patientId, ...d.data() } as EvolutionWeight));
  } catch (err) {
    console.error('Failed to get weight history:', err);
    return [];
  }
}

/**
 * Record exam result for patient
 */
export async function recordExam(
  patientId: string,
  exam: Omit<EvolutionExam, 'id' | 'patientId' | 'createdAt'>
): Promise<EvolutionExam> {
  const now = new Date().toISOString();
  const examRef = await addDoc(
    collection(db, 'evolution', patientId, 'exams'),
    {
      patientId,
      ...exam,
      createdAt: now,
    }
  );
  return {
    id: examRef.id,
    patientId,
    ...exam,
    createdAt: now,
  };
}

/**
 * Get exam history for patient
 */
export async function getExamHistory(patientId: string): Promise<EvolutionExam[]> {
  try {
    const q = query(
      collection(db, 'evolution', patientId, 'exams'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, patientId, ...d.data() } as EvolutionExam));
  } catch (err) {
    console.error('Failed to get exam history:', err);
    return [];
  }
}

/**
 * Record evolution note for patient
 */
export async function recordNote(
  patientId: string,
  note: Omit<EvolutionNote, 'id' | 'patientId' | 'createdAt'>
): Promise<EvolutionNote> {
  const now = new Date().toISOString();
  const noteRef = await addDoc(
    collection(db, 'evolution', patientId, 'notes'),
    {
      patientId,
      ...note,
      createdAt: now,
    }
  );
  return {
    id: noteRef.id,
    patientId,
    ...note,
    createdAt: now,
  };
}

/**
 * Get evolution notes for patient
 */
export async function getNotes(patientId: string): Promise<EvolutionNote[]> {
  try {
    const q = query(
      collection(db, 'evolution', patientId, 'notes'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, patientId, ...d.data() } as EvolutionNote));
  } catch (err) {
    console.error('Failed to get notes:', err);
    return [];
  }
}
