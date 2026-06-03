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

/** Recursively drop `undefined` values — Firestore rejects them. */
export function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return obj;
}

// ============ PATIENTS COLLECTION ============

/**
 * Create a new patient record in Firestore
 */
export async function createPatient(
  nutritionistId: string,
  data: Omit<FirestorePatient, 'id' | 'createdAt' | 'updatedAt' | 'nutritionistId' | 'status'>
): Promise<FirestorePatient> {
  const now = new Date().toISOString();
  const payload = stripUndefined({
    ...data,
    nutritionistId,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  });
  const patientRef = await addDoc(collection(db, 'patients'), payload);
  return { id: patientRef.id, ...payload } as FirestorePatient;
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
    // Single-field filter (matches the security rule and needs no composite
    // index); status filter + ordering are done client-side.
    const snap = await getDocs(
      query(collection(db, 'patients'), where('nutritionistId', '==', nutritionistId))
    );
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as FirestorePatient))
      .filter(p => p.status !== 'archived')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
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

/** Upsert one uploaded exam PDF (its own `id` is the doc id). */
export async function savePatientExam(patientId: string, exam: PatientExam): Promise<void> {
  const { id, ...rest } = exam;
  await setDoc(doc(db, 'patients', patientId, 'exams', id), stripUndefined(rest));
}

/** Delete one uploaded exam PDF. */
export async function deletePatientExam(patientId: string, examId: string): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'exams', examId));
}

/** Upsert one uploaded meal-plan PDF (its own `id` is the doc id). */
export async function savePatientMealPlan(patientId: string, mealPlan: MealPlan): Promise<void> {
  const { id, ...rest } = mealPlan;
  await setDoc(doc(db, 'patients', patientId, 'mealPlans', id), stripUndefined(rest));
}

/** Delete one uploaded meal-plan PDF. */
export async function deletePatientMealPlan(patientId: string, mealPlanId: string): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'mealPlans', mealPlanId));
}

/**
 * Update patient
 */
export async function updatePatient(
  patientId: string,
  updates: Partial<Omit<FirestorePatient, 'id' | 'nutritionistId' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'patients', patientId), stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
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
  const payload = stripUndefined({
    ...data,
    nutritionistId,
    patientId,
    status: 'delivered' as const,
    createdAt: now,
    updatedAt: now,
  });
  const prescRef = await addDoc(collection(db, 'prescriptions'), payload);
  return { id: prescRef.id, ...payload } as FirestorePrescription;
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
 * Get all prescriptions for a nutritionist (newest first). Filters by
 * nutritionistId — matching the security rule, so the list query is allowed
 * (a by-patientId query would be denied) and needs no composite index.
 */
export async function getPrescriptionsByNutritionist(nutritionistId: string): Promise<FirestorePrescription[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'prescriptions'), where('nutritionistId', '==', nutritionistId))
    );
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as FirestorePrescription))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.error('Failed to get prescriptions:', err);
    return [];
  }
}

/** Update a prescription (e.g. when the nutri edits the diagnosis result). */
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<Omit<FirestorePrescription, 'id' | 'nutritionistId' | 'patientId' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'prescriptions', prescriptionId), stripUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

/** Delete a prescription. */
export async function deletePrescription(prescriptionId: string): Promise<void> {
  await deleteDoc(doc(db, 'prescriptions', prescriptionId));
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
  const payload = stripUndefined({ patientId, date: now, value: weight, unit, notes, createdAt: now });
  const weightRef = await addDoc(collection(db, 'evolution', patientId, 'weight'), payload);
  return { id: weightRef.id, ...payload } as EvolutionWeight;
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
  const payload = stripUndefined({ patientId, ...note, createdAt: now });
  const noteRef = await addDoc(collection(db, 'evolution', patientId, 'notes'), payload);
  return { id: noteRef.id, ...payload } as EvolutionNote;
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

/** Update an evolution note (e.g. editing an adjustment). */
export async function updateNote(patientId: string, noteId: string, note: string): Promise<void> {
  await updateDoc(doc(db, 'evolution', patientId, 'notes', noteId), { note });
}

/** Delete an evolution note. */
export async function deleteNote(patientId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'evolution', patientId, 'notes', noteId));
}

// ============ MAINTENANCE ============

/**
 * Wipe every record owned by a nutritionist (patients + their subcollections,
 * evolution series, and prescriptions). Used for a clean start while there is
 * only disposable test data. Destructive and irreversible.
 */
export async function deleteAllNutritionistData(
  nutritionistId: string
): Promise<{ patients: number; prescriptions: number }> {
  const patientsSnap = await getDocs(
    query(collection(db, 'patients'), where('nutritionistId', '==', nutritionistId))
  );
  for (const pdoc of patientsSnap.docs) {
    const pid = pdoc.id;
    for (const sub of ['exams', 'mealPlans']) {
      const s = await getDocs(collection(db, 'patients', pid, sub));
      await Promise.all(s.docs.map(d => deleteDoc(d.ref)));
    }
    for (const sub of ['weight', 'exams', 'notes']) {
      const s = await getDocs(collection(db, 'evolution', pid, sub));
      await Promise.all(s.docs.map(d => deleteDoc(d.ref)));
    }
    await deleteDoc(pdoc.ref);
  }

  const prescSnap = await getDocs(
    query(collection(db, 'prescriptions'), where('nutritionistId', '==', nutritionistId))
  );
  await Promise.all(prescSnap.docs.map(d => deleteDoc(d.ref)));

  return { patients: patientsSnap.docs.length, prescriptions: prescSnap.docs.length };
}

/** Delete the legacy appData patient/event blobs (post-cutover cleanup). */
export async function deleteLegacyAppData(uid: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'users', uid, 'appData', 'patients')).catch(() => {}),
    deleteDoc(doc(db, 'users', uid, 'appData', 'events')).catch(() => {}),
  ]);
}
