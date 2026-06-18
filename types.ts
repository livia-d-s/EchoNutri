export interface MedicalDiagnosis {
  diagnosis: string;
  confidence: string;
  possibleDiseases: string[];
  exams: string[];
  medications: string[];
  rationale: string;
}

export interface Consultation {
  id: string;
  patientName: string; // Added field
  date: string; // ISO string
  transcript: string;
  result: MedicalDiagnosis | null;
}

export interface DoctorProfile {
  name: string;
  specialty: string;
  imageUrl?: string;
}

export interface AnalysisResult {
  formattedTranscript: string;
  diagnosis: MedicalDiagnosis;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}

// ============ PATIENT-CENTRIC TYPES ============

export interface TrainingActivity {
  type: string;      // e.g., "Musculação", "Natação", "Corrida"
  frequency: string; // e.g., "3x/semana"
}

export type PatientGoal =
  | 'ganho_muscular'
  | 'perda_gordura'
  | 'manutencao'
  | 'performance'
  | 'forca'
  | 'recuperacao'
  | 'saude_geral'
  | 'outro';

export const GOAL_LABELS: Record<PatientGoal, string> = {
  ganho_muscular: 'Ganho Muscular',
  perda_gordura: 'Perda de Gordura',
  manutencao: 'Manutenção',
  performance: 'Performance',
  forca: 'Força',
  recuperacao: 'Recuperação de Lesão',
  saude_geral: 'Saúde Geral',
  outro: 'Outro'
};

// ============ SUBSCRIPTION ============
// Modelado pensando na futura integração com Stripe (Semana 4 do plano).
// Os campos stripeCustomerId / stripeSubscriptionId ficam vazios até o
// checkout entrar — o resto do app já lê/escreve nessa estrutura agora.

export type SubscriptionStatus =
  | 'trialing'        // dentro do trial de 7 dias, ainda não cobrou
  | 'active'          // pagamento em dia
  | 'past_due'        // cobrança falhou, em retry
  | 'canceled'        // cancelada (acesso até currentPeriodEnd)
  | 'incomplete';     // checkout iniciado mas não confirmado

export type SubscriptionPlan = 'pro';

export interface Subscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  startedAt: string;          // ISO — quando a conta foi criada
  trialEnd?: string;          // ISO — fim do trial gratuito (se status === 'trialing')
  currentPeriodEnd?: string;  // ISO — próxima cobrança / fim do acesso pago
  cancelAtPeriodEnd?: boolean;
  // Stripe IDs (preenchidos quando o checkout for integrado)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export const TRIAL_LENGTH_DAYS = 7;

export function createInitialSubscription(now: Date = new Date()): Subscription {
  const trialEnd = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
  return {
    status: 'trialing',
    plan: 'pro',
    startedAt: now.toISOString(),
    trialEnd: trialEnd.toISOString(),
  };
}

export interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;            // ISO date — used to compute age
  createdAt: string;
  // Anthropometric data (optional, used for structured meal plan)
  weightKg?: number;
  heightCm?: number;
  // Body composition (%). Useful for evolution tracking + cleaner macro
  // recommendations (lean mass drives protein needs more than total weight).
  bodyFatPct?: number;
  leanMassPct?: number;
  // Dietary restrictions / preferences (free-text, e.g. "vegetariana, sem lactose")
  dietaryRestrictions?: string;
  supplements?: string;          // Suplementos atuais/prescritos (texto livre)
  // New nutrition-focused fields
  goal?: PatientGoal;            // Legacy single goal (for backwards compat)
  goals?: PatientGoal[];         // Supports up to 2 goals
  goalCustom?: string;           // If goal is 'outro'
  trainingRoutine?: TrainingActivity[];
  isFirstConsultation?: boolean; // Tracks if first consultation was done
  highlights?: string[];         // AI-extracted key patient insights (persists across consultations)
  exams?: PatientExam[];         // Uploaded lab result PDFs (extracted text)
  mealPlans?: MealPlan[];        // Uploaded meal plan PDFs (most recent is the active one)
}

// ============ MEAL PLAN STRUCTURED TYPES ============

export type MealItemCategory = 'carbo' | 'proteina' | 'gordura' | 'fruta' | 'vegetal' | 'lacteo' | 'outro';

export interface StructuredMealItem {
  food: string;                  // e.g. "1 fatia de pão integral"
  category?: MealItemCategory;
  substitutions?: string[];      // 2-4 equivalents in matching quantity
}

export interface StructuredMeal {
  name: string;                  // e.g. "Café da manhã"
  time?: string;                 // e.g. "07:00"
  items: StructuredMealItem[];
}

export interface MacroBreakdownItem {
  food: string;                  // exact match key for cached recalculation
  kcal: number;
  prot_g: number;
  carb_g: number;
  fat_g: number;
}

export interface StructuredMealPlan {
  meals: StructuredMeal[];
  notes?: string;                // hidration, supplements, general guidance
  macroEstimate?: {              // optional, only if anthropometric data is available
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  // Per-item macros, kept in sync with macroEstimate. Reused on partial
  // recalculation so unchanged items don't get re-estimated by the LLM
  // (which causes drift on every recalc).
  macroBreakdown?: MacroBreakdownItem[];
}

export interface PatientExam {
  id: string;
  fileName: string;
  uploadedAt: string;           // ISO date
  extractedText: string;         // Full text extracted from PDF (used as AI context)
  sizeBytes?: number;            // Original PDF size (for display)
}

export interface MealPlan {
  id: string;
  fileName: string;
  uploadedAt: string;
  extractedText: string;
  sizeBytes?: number;
}

export type EventType = 'initial' | 'followup' | 'adjustment';

export interface TimelineEvent {
  id: string;
  patientId: string;
  type: EventType;
  date: string;

  // Consultation data (for initial/followup)
  transcript?: string;
  result?: NutritionalAssessment | MedicalDiagnosis;

  // Adjustment data (for plan changes)
  adjustmentNote?: string;
  parentEventId?: string; // Links adjustment to a specific consultation
  previousPlan?: string;
  newPlan?: string;
  // Briefing for next consultation (extracted from AI result)
  suggestedNextQuestions?: string[];

  doctorName: string;
  createdAt: string;
}

export interface NutritionalAssessment {
  nutritionalAssessment: string;
  clinicalRationale: string;
  possibleAssociatedConditions: string[];
  recommendedExams: string[];
  nutritionalConduct: string;
}

// ============ FIRESTORE COLLECTIONS (New Schema - Phase 1) ============

// firestore/patients/{patientId}
export interface FirestorePatient {
  id: string;                              // Document ID (auto-generated)
  nutritionistId: string;                  // Reference to doctor/nutri (users/{uid})
  name: string;
  email?: string;                          // For patient app login (future)
  phone?: string;
  dateOfBirth?: string;                    // ISO date
  mainComplaint?: string;                  // Initial reason for consultation
  notes?: string;                          // Nutri's private notes
  status: 'active' | 'archived';
  createdAt: string;                       // ISO timestamp
  updatedAt?: string;                      // ISO timestamp

  // Current-state clinical/profile data (Híbrido model). These are "latest
  // value" fields edited via the body-composition modal, not time-series —
  // weight history lives in evolution/{id}/weight. Uploaded exam/meal-plan
  // PDFs live in the patients/{id}/exams and /mealPlans subcollections to
  // avoid the 1MB-per-document limit.
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  leanMassPct?: number;
  dietaryRestrictions?: string;
  supplements?: string;          // Suplementos atuais/prescritos (texto livre)
  goal?: PatientGoal;
  goals?: PatientGoal[];
  goalCustom?: string;
  trainingRoutine?: TrainingActivity[];
  isFirstConsultation?: boolean;
  highlights?: string[];

  // Provenance: set to 'legacy' on records created by the appData→new-schema
  // backfill, so we can tell migrated records apart from natively-created ones.
  migratedFrom?: 'legacy';
}

// firestore/prescriptions/{prescriptionId}
// A prescription is the persisted form of a consultation (initial/followup).
// It holds everything needed to reconstruct that timeline event losslessly.
export interface FirestorePrescription {
  id: string;                              // Document ID
  patientId: string;                       // Reference to patients/{patientId}
  nutritionistId: string;                  // Reference to doctors/{uid}
  type: 'initial' | 'followup';            // Consultation type
  date: string;                            // ISO timestamp (when prescribed)
  transcript?: string;                     // Consultation transcript
  result?: NutritionalAssessment;          // Full AI assessment (may embed structuredMealPlan)
  suggestedNextQuestions?: string[];       // Briefing for the next consultation
  mealPlan?: StructuredMealPlan;           // Active structured meal plan, if saved separately
  doctorName?: string;
  status: 'draft' | 'delivered' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

// firestore/evolution/{patientId}/weight
export interface EvolutionWeight {
  id: string;
  patientId: string;
  date: string;                            // ISO timestamp
  value: number;
  unit: 'kg' | 'lb';
  notes?: string;
  createdAt: string;
}

// firestore/evolution/{patientId}/exams
export interface EvolutionExam {
  id: string;
  patientId: string;
  date: string;                            // ISO timestamp
  type: string;                            // e.g., "glicose", "colesterol"
  value: number;
  unit: string;                            // e.g., "mg/dL"
  referenceRange?: string;                 // e.g., "70-100"
  status: 'normal' | 'improved' | 'high' | 'low';
  createdAt: string;
}

// firestore/evolution/{patientId}/notes
export interface EvolutionNote {
  id: string;
  patientId: string;
  date: string;                            // ISO timestamp
  note: string;
  type?: 'observation' | 'follow-up' | 'alert';
  createdAt: string;
}