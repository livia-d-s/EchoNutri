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
  FirestorePost,
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
  const weightRef = await addDoc(
    collection(db, 'evolution', patientId, 'weight'),
    {
      patientId,
      date: now,
      value: weight,
      unit,
      notes,
      createdAt: now,
    }
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

// ============ POSTS COLLECTION ============

/**
 * Create a new post (carousel generated content)
 */
export async function createPost(
  nutritionistId: string,
  data: Omit<FirestorePost, 'id' | 'nutritionistId' | 'createdAt' | 'updatedAt'>
): Promise<FirestorePost> {
  const now = new Date().toISOString();
  const postRef = await addDoc(collection(db, 'posts'), {
    ...data,
    nutritionistId,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: postRef.id,
    ...data,
    nutritionistId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get post by ID
 */
export async function getPost(postId: string): Promise<FirestorePost | null> {
  try {
    const snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FirestorePost;
  } catch (err) {
    console.error('Failed to get post:', err);
    return null;
  }
}

/**
 * Get all posts for a nutritionist
 */
export async function getPostsByNutritionist(nutritionistId: string): Promise<FirestorePost[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('nutritionistId', '==', nutritionistId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePost));
  } catch (err) {
    console.error('Failed to get posts:', err);
    return [];
  }
}

/**
 * Get posts assigned to a patient
 */
export async function getPostsByPatient(patientId: string): Promise<FirestorePost[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('patientIds', 'array-contains', patientId),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePost));
  } catch (err) {
    console.error('Failed to get posts for patient:', err);
    return [];
  }
}

/**
 * Update post (e.g., add patients, change status, update carousel)
 */
export async function updatePost(
  postId: string,
  updates: Partial<Omit<FirestorePost, 'id' | 'nutritionistId' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'posts', postId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update post:', err);
    throw err;
  }
}

/**
 * Delete post
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    console.error('Failed to delete post:', err);
    throw err;
  }
}

/**
 * Assign post to patients
 */
export async function assignPostToPatients(postId: string, patientIds: string[]): Promise<void> {
  try {
    const post = await getPost(postId);
    if (!post) throw new Error('Post not found');

    const currentIds = post.patientIds || [];
    const newIds = Array.from(new Set([...currentIds, ...patientIds]));

    await updatePost(postId, { patientIds: newIds });
  } catch (err) {
    console.error('Failed to assign post to patients:', err);
    throw err;
  }
}

/**
 * Remove post from patient
 */
export async function removePostFromPatient(postId: string, patientId: string): Promise<void> {
  try {
    const post = await getPost(postId);
    if (!post) throw new Error('Post not found');

    const updatedIds = (post.patientIds || []).filter(id => id !== patientId);
    await updatePost(postId, { patientIds: updatedIds });
  } catch (err) {
    console.error('Failed to remove post from patient:', err);
    throw err;
  }
}
