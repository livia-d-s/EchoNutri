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
  // Dietary restrictions / preferences (free-text, e.g. "vegetariana, sem lactose")
  dietaryRestrictions?: string;
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