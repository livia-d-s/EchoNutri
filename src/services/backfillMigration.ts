/**
 * One-time backfill: legacy appData arrays -> new schema collections.
 *
 * Legacy data lives in:
 *   users/{uid}/appData/patients  ->  { items: Patient[] }
 *   users/{uid}/appData/events    ->  { items: TimelineEvent[] }
 *
 * It is migrated (Híbrido model) into:
 *   patients/{patientId}                 identity + current-state clinical fields
 *   patients/{patientId}/exams/{id}      uploaded exam PDFs
 *   patients/{patientId}/mealPlans/{id}  uploaded meal-plan PDFs
 *   prescriptions/{eventId}              consultations (initial/followup)
 *   evolution/{patientId}/notes/{eventId}   adjustments
 *   evolution/{patientId}/weight/legacy_seed   current weight as one data point
 *
 * The same legacy IDs are reused as new document IDs. This (a) keeps the
 * evolution/{patientId} paths lined up, and (b) makes every write idempotent:
 * re-running the backfill setDoc()s over the same IDs instead of duplicating.
 */

import { db } from '../firebaseConfig';
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { Patient, TimelineEvent } from '../../types';

const WEIGHT_SEED_ID = 'legacy_seed';

export interface BackfillPlan {
  legacyPatients: number;
  patientsToCreate: number;      // legacy patients with no patients/{id} doc yet
  patientsAlreadyPresent: number;
  exams: number;                 // uploaded exam PDFs to migrate
  mealPlans: number;             // uploaded meal-plan PDFs to migrate
  prescriptions: number;         // initial/followup events -> prescriptions
  adjustmentNotes: number;       // adjustment events -> evolution notes
  weightSeeds: number;           // patients with a current weight to seed
  patientNames: string[];        // names of patients that would be created
  hasLegacyData: boolean;
}

export interface BackfillReport extends BackfillPlan {
  written: {
    patients: number;
    exams: number;
    mealPlans: number;
    prescriptions: number;
    adjustmentNotes: number;
    weightSeeds: number;
  };
  errors: string[];
}

/** Recursively drop `undefined` values — Firestore rejects them. */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return obj;
}

async function loadLegacy(userId: string): Promise<{ patients: Patient[]; events: TimelineEvent[] }> {
  const [patientsSnap, eventsSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId, 'appData', 'patients')),
    getDoc(doc(db, 'users', userId, 'appData', 'events')),
  ]);
  const patients: Patient[] = patientsSnap.exists() ? (patientsSnap.data().items || []) : [];
  const events: TimelineEvent[] = eventsSnap.exists() ? (eventsSnap.data().items || []) : [];
  return { patients, events };
}

/**
 * Dry-run: inventory what would be migrated. Reads only, writes nothing.
 */
export async function planBackfill(userId: string): Promise<BackfillPlan> {
  const { patients, events } = await loadLegacy(userId);

  let patientsToCreate = 0;
  let patientsAlreadyPresent = 0;
  let exams = 0;
  let mealPlans = 0;
  let weightSeeds = 0;
  const patientNames: string[] = [];

  // Check existence in parallel.
  const existence = await Promise.all(
    patients.map(p => getDoc(doc(db, 'patients', p.id)).then(s => s.exists()).catch(() => false))
  );

  patients.forEach((p, i) => {
    if (existence[i]) {
      patientsAlreadyPresent++;
    } else {
      patientsToCreate++;
      patientNames.push(p.name);
    }
    exams += p.exams?.length || 0;
    mealPlans += p.mealPlans?.length || 0;
    if (typeof p.weightKg === 'number') weightSeeds++;
  });

  const prescriptions = events.filter(e => e.type !== 'adjustment').length;
  const adjustmentNotes = events.filter(e => e.type === 'adjustment').length;

  return {
    legacyPatients: patients.length,
    patientsToCreate,
    patientsAlreadyPresent,
    exams,
    mealPlans,
    prescriptions,
    adjustmentNotes,
    weightSeeds,
    patientNames,
    hasLegacyData: patients.length > 0 || events.length > 0,
  };
}

/**
 * Execute the backfill. Idempotent: safe to re-run. Patient docs are only
 * written when missing (so native edits are never clobbered); everything else
 * is keyed by the legacy ID and setDoc()-ed.
 */
export async function runBackfill(userId: string): Promise<BackfillReport> {
  const { patients, events } = await loadLegacy(userId);
  const now = new Date().toISOString();
  const errors: string[] = [];
  const written = { patients: 0, exams: 0, mealPlans: 0, prescriptions: 0, adjustmentNotes: 0, weightSeeds: 0 };

  const plan = await planBackfill(userId);

  for (const p of patients) {
    try {
      const patientRef = doc(db, 'patients', p.id);
      const exists = (await getDoc(patientRef)).exists();
      if (!exists) {
        const patientDoc = stripUndefined({
          nutritionistId: userId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          dateOfBirth: p.birthDate,
          mainComplaint: p.highlights?.[0],
          status: 'active' as const,
          createdAt: p.createdAt || now,
          updatedAt: now,
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
          migratedFrom: 'legacy' as const,
        });
        await setDoc(patientRef, patientDoc);
        written.patients++;
      }

      // Uploaded exam PDFs -> patients/{id}/exams/{examId}
      for (const exam of p.exams || []) {
        try {
          const { id, ...rest } = exam;
          await setDoc(doc(db, 'patients', p.id, 'exams', id), stripUndefined(rest));
          written.exams++;
        } catch (e) {
          errors.push(`exam ${exam.id} de ${p.name}: ${msg(e)}`);
        }
      }

      // Uploaded meal-plan PDFs -> patients/{id}/mealPlans/{planId}
      for (const mp of p.mealPlans || []) {
        try {
          const { id, ...rest } = mp;
          await setDoc(doc(db, 'patients', p.id, 'mealPlans', id), stripUndefined(rest));
          written.mealPlans++;
        } catch (e) {
          errors.push(`plano ${mp.id} de ${p.name}: ${msg(e)}`);
        }
      }

      // Current weight -> one seed point in evolution history
      if (typeof p.weightKg === 'number') {
        try {
          await setDoc(doc(db, 'evolution', p.id, 'weight', WEIGHT_SEED_ID), stripUndefined({
            patientId: p.id,
            date: p.createdAt || now,
            value: p.weightKg,
            unit: 'kg',
            createdAt: now,
          }));
          written.weightSeeds++;
        } catch (e) {
          errors.push(`peso inicial de ${p.name}: ${msg(e)}`);
        }
      }
    } catch (e) {
      errors.push(`paciente ${p.name}: ${msg(e)}`);
    }
  }

  // Events -> prescriptions (consultations) / evolution notes (adjustments)
  for (const ev of events) {
    try {
      if (ev.type === 'adjustment') {
        await setDoc(doc(db, 'evolution', ev.patientId, 'notes', ev.id), stripUndefined({
          patientId: ev.patientId,
          date: ev.date,
          note: ev.adjustmentNote || ev.newPlan || '',
          type: 'follow-up',
          createdAt: ev.createdAt || now,
        }));
        written.adjustmentNotes++;
      } else {
        const r = ev.result as any;
        const analysis = r ? stripUndefined({
          complaint: r.nutritionalAssessment ?? r.diagnosis ?? '',
          rationale: r.clinicalRationale ?? r.rationale ?? '',
          recommendations: r.nutritionalConduct ?? '',
        }) : undefined;
        await setDoc(doc(db, 'prescriptions', ev.id), stripUndefined({
          patientId: ev.patientId,
          nutritionistId: userId,
          date: ev.date,
          analysis,
          status: 'delivered' as const,
          createdAt: ev.createdAt || now,
        }));
        written.prescriptions++;
      }
    } catch (e) {
      errors.push(`evento ${ev.id}: ${msg(e)}`);
    }
  }

  return { ...plan, written, errors };
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
