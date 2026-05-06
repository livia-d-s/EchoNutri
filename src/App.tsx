import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Pause, Play, Activity, User, FileText, Upload,
  ArrowLeft, Camera, Check, AlertTriangle, Loader2, Users, Pencil, Info, CheckCircle, Trash2,
  ClipboardCheck, TrendingUp, Brain, Stethoscope, TestTube, Utensils, ChevronDown, ChevronRight
} from 'lucide-react';
import { Patient, TimelineEvent, EventType, PatientGoal, GOAL_LABELS, TrainingActivity } from '../types';
import { PatientList, PatientPage } from './components/patient';
import { ExamUploader } from './components/patient/ExamUploader';
import { ConsultationBriefingBubble } from './components/patient/ConsultationBriefingBubble';
import { MealPlanCard, planSignature } from './components/patient/MealPlanCard';
import { MealPlanBubble } from './components/patient/MealPlanBubble';

// Firebase Imports
import {
  doc, setDoc, getDoc, collection,
  onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './context/AuthContext';

const getBackendUrl = () => {
  // In production, use Render backend
  // In development, use localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://echomed-p3tr.onrender.com'; // Production - Render backend
  }
  try {
    const env = (import.meta as any)?.env || {};
    return env.VITE_BACKEND_URL || "http://localhost:3001";
  } catch {
    return "http://localhost:3001";
  }
};

const backendUrl = getBackendUrl();

// Normalize patient names: proper case + remove special characters
const normalizePatientName = (name: string): string => {
  // Remove special characters: .;'"[{}]
  let cleaned = name.replace(/[.;'"[\]{}]/g, '');

  // Convert to proper case (Title Case)
  // Split by spaces, capitalize first letter of each word, lowercase the rest
  return cleaned
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const AppStatus = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
  PROCESSING: 'processing',
  RESULT: 'result'
};

type AnalysisTone = 'humanizado' | 'sistemico' | 'direto';

type DoctorProfileType = {
  name: string;
  specialty: string;
  photo: string | null;
  crm: string;
  // Visual identity for branded PDFs
  logoUrl?: string | null;       // Base64 data URL (PNG/JPG)
  brandColor?: string;            // Hex color, e.g. "#2563EB"
  preferences?: {
    showConduct: boolean;
    showAttention: boolean;
    showExams: boolean;
    tone: AnalysisTone;
  };
};

const DEFAULT_BRAND_COLOR = '#2563EB';

const DEFAULT_PROFILE: DoctorProfileType = {
  name: "Nutricionista",
  specialty: "Nutrição Clínica",
  photo: null,
  crm: "",
  logoUrl: null,
  brandColor: DEFAULT_BRAND_COLOR,
  preferences: {
    showConduct: true,
    showAttention: true,
    showExams: true,
    tone: 'humanizado',
  },
};

// Build a short list of "remember-this-patient" chips shown when the nutri
// selects an existing patient. Up to 5 entries: training, goal, weight +
// body-fat summary, top 1-2 highlights, prior consultations as fallback.
function buildPatientQuickChips(p: any, events?: any[]): string[] {
  if (!p) return [];
  const chips: string[] = [];

  // 1. Training (first activity is usually the most relevant)
  const t = (p.trainingRoutine || [])[0];
  if (t?.type) {
    chips.push(`${t.type}${t.frequency ? ` ${t.frequency}` : ''}`);
  }

  // 2. Goal
  const goals = (p.goals && p.goals.length ? p.goals : (p.goal ? [p.goal] : [])) as PatientGoal[];
  if (goals.length > 0) {
    const labels = goals
      .map((g) => (g === 'outro' ? p.goalCustom : GOAL_LABELS[g]))
      .filter(Boolean)
      .join(' + ');
    if (labels) chips.push(labels);
  }

  // 3. Weight + body-fat (more useful than BMI for the nutri).
  const w = Number(p.weightKg);
  const bf = Number(p.bodyFatPct);
  if (w > 0 && bf > 0) {
    chips.push(`${w}kg • ${bf}% gord`);
  } else if (w > 0) {
    chips.push(`${w}kg`);
  } else if (bf > 0) {
    chips.push(`${bf}% gord`);
  }

  // 4-5. Top highlights (slice 2 max so we don't crowd out other context)
  for (const h of (p.highlights || []).slice(0, 2)) {
    if (chips.length >= 5) break;
    if (h && typeof h === 'string') chips.push(h);
  }

  // Last resort: prior consultation count
  if (chips.length < 5 && Array.isArray(events)) {
    const count = events.filter((e: any) => e.patientId === p.id && e.type !== 'adjustment').length;
    if (count > 0) chips.push(`${count} consulta${count > 1 ? 's' : ''} anterior${count > 1 ? 'es' : ''}`);
  }

  return chips.slice(0, 5);
}

// Recursively strip `undefined` values from objects/arrays so Firestore
// (which rejects undefined) doesn't blow up when patient fields are cleared.
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function App() {
  // --- Auth from context (must come before user-scoped state effects) ---
  const { user, loading: authLoading, logout } = useAuth();
  const authReady = !authLoading;
  const userId = user?.uid;

  // Build a localStorage key namespaced to the current user
  const lsKey = (base: string) => userId ? `echomed_${userId}_${base}` : null;

  const [view, setView] = useState<'transcription' | 'diagnosis' | 'patients' | 'patient'>('transcription');
  const [status, setStatus] = useState(AppStatus.IDLE);

  // Patient-centric state — initialized empty; loaded from user-scoped storage in an effect below
  const [patients, setPatients] = useState<Patient[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileType>(DEFAULT_PROFILE);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  // Exams uploaded in popup/transcription — applied to the patient on finalize
  const [pendingExams, setPendingExams] = useState<any[]>([]);
  const [pendingMealPlans, setPendingMealPlans] = useState<any[]>([]);

  // Load all user-scoped data when user changes (login/logout switch)
  useEffect(() => {
    if (!userId) {
      setPatients([]);
      setEvents([]);
      setHistory([]);
      setDoctorProfile(DEFAULT_PROFILE);
      setSelectedPatient(null);
      setSelectedEvent(null);
      return;
    }

    // 1. Instant load from localStorage cache
    setPatients(safeParse(localStorage.getItem(`echomed_${userId}_patients`), [] as Patient[]));
    setEvents(safeParse(localStorage.getItem(`echomed_${userId}_events`), [] as TimelineEvent[]));
    setHistory(safeParse(localStorage.getItem(`echomed_${userId}_consultation_history`), [] as any[]));
    setDoctorProfile(safeParse(localStorage.getItem(`echomed_${userId}_doctor_profile`), DEFAULT_PROFILE));

    // 2. Then load from Firestore (overrides localStorage if exists)
    if (!db) return;
    const loadFromFirestore = async () => {
      try {
        const [patientsDoc, eventsDoc, profileDoc] = await Promise.all([
          getDoc(doc(db, 'users', userId, 'appData', 'patients')),
          getDoc(doc(db, 'users', userId, 'appData', 'events')),
          getDoc(doc(db, 'users', userId, 'appData', 'profile')),
        ]);

        if (patientsDoc.exists()) {
          const items = patientsDoc.data().items || [];
          setPatients(items);
          localStorage.setItem(`echomed_${userId}_patients`, JSON.stringify(items));
        }
        if (eventsDoc.exists()) {
          const items = eventsDoc.data().items || [];
          setEvents(items);
          localStorage.setItem(`echomed_${userId}_events`, JSON.stringify(items));
        }
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          const profile = { ...DEFAULT_PROFILE, ...data };
          setDoctorProfile(profile);
          localStorage.setItem(`echomed_${userId}_doctor_profile`, JSON.stringify(profile));
        }
      } catch (err) {
        console.error('Failed to load from Firestore (using localStorage cache):', err);
      }
    };
    loadFromFirestore();
  }, [userId]);

  // Save doctor profile (localStorage cache + Firestore)
  useEffect(() => {
    const key = lsKey('doctor_profile');
    if (!key || !userId) return;
    localStorage.setItem(key, JSON.stringify(doctorProfile));
    if (db) {
      // Photo and logo are kept in the Firestore save so they survive hard
      // refreshes and cross-device logins. Both go through canvas compression
      // before being set, so they stay under Firestore's 1MB-per-field limit.
      // Defensive drop only kicks in for legacy uncompressed uploads.
      const profileToSave: any = { ...doctorProfile };
      const FIRESTORE_FIELD_LIMIT = 1_048_487;
      if (profileToSave.photo && profileToSave.photo.length > FIRESTORE_FIELD_LIMIT) {
        delete profileToSave.photo;
      }
      if (profileToSave.logoUrl && profileToSave.logoUrl.length > FIRESTORE_FIELD_LIMIT) {
        delete profileToSave.logoUrl;
      }
      setDoc(doc(db, 'users', userId, 'appData', 'profile'), stripUndefinedDeep(profileToSave), { merge: true })
        .catch(err => console.error('Failed to save profile to Firestore:', err));
    }
  }, [doctorProfile, userId]);
  const [patientName, setPatientName] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Navigation persistence: keep the user on the same screen across refreshes.
  // We store only lightweight identifiers (view + patient/event id) and look
  // them up against the actual data on rehydration — the source of truth
  // remains `patients`/`events`, not a duplicated snapshot.
  const navRehydratedRef = useRef(false);

  // Persist nav state on changes — only after initial rehydration so we don't
  // overwrite the saved state with the default 'transcription' on boot.
  useEffect(() => {
    if (!userId || !navRehydratedRef.current) return;
    const navKey = `echomed_${userId}_nav_state`;
    localStorage.setItem(navKey, JSON.stringify({
      view,
      selectedPatientId: selectedPatient?.id || null,
      selectedEventId: selectedEvent?.id || null,
    }));
  }, [view, selectedPatient, selectedEvent, userId]);

  // Reset the rehydration flag when the user changes so a fresh login
  // re-attempts restoration with that account's data.
  useEffect(() => {
    navRehydratedRef.current = false;
  }, [userId]);

  // Patient context for current consultation (supports up to 2 goals)
  const [currentPatientGoals, setCurrentPatientGoals] = useState<PatientGoal[]>([]);
  const [currentPatientGoalCustom, setCurrentPatientGoalCustom] = useState('');
  const [currentPatientTraining, setCurrentPatientTraining] = useState<TrainingActivity[]>([]);
  const [currentIsFirstConsultation, setCurrentIsFirstConsultation] = useState<boolean | null>(null);
  // Anthropometric data captured at consultation start — applied to patient on finalize
  const [currentPatientWeight, setCurrentPatientWeight] = useState<number | null>(null);
  const [currentPatientHeight, setCurrentPatientHeight] = useState<number | null>(null);
  const [currentPatientBirthDate, setCurrentPatientBirthDate] = useState<string>('');
  const [currentPatientRestrictions, setCurrentPatientRestrictions] = useState<string>('');

  // Show toast notification
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  // Save history to localStorage when it changes (user-scoped)
  useEffect(() => {
    const key = lsKey('consultation_history');
    if (!key) return;
    if (history.length > 0) {
      localStorage.setItem(key, JSON.stringify(history));
    }
  }, [history, userId]);

  // Save patients (localStorage cache + Firestore)
  useEffect(() => {
    const key = lsKey('patients');
    if (!key || !userId) return;
    localStorage.setItem(key, JSON.stringify(patients));
    if (db && patients.length > 0) {
      setDoc(doc(db, 'users', userId, 'appData', 'patients'), stripUndefinedDeep({ items: patients }))
        .catch(err => console.error('Failed to save patients to Firestore:', err));
    }
  }, [patients, userId]);

  // Normalize existing patient names (runs once on app load)
  useEffect(() => {
    if (patients.length > 0) {
      const needsNormalization = patients.some(p => p.name !== normalizePatientName(p.name));
      if (needsNormalization) {
        const normalizedPatients = patients.map(p => ({
          ...p,
          name: normalizePatientName(p.name)
        }));
        // Merge duplicates that may appear after normalization
        const uniqueMap = new Map<string, Patient>();
        normalizedPatients.forEach(p => {
          const key = p.name.toLowerCase();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
          }
        });
        setPatients(Array.from(uniqueMap.values()));
        console.log('✅ Patient names normalized');
      }
    }
  }, []);

  // Save events (localStorage cache + Firestore)
  useEffect(() => {
    const key = lsKey('events');
    if (!key || !userId) return;
    localStorage.setItem(key, JSON.stringify(events));
    if (db && events.length > 0) {
      setDoc(doc(db, 'users', userId, 'appData', 'events'), stripUndefinedDeep({ items: events }))
        .catch(err => console.error('Failed to save events to Firestore:', err));
    }
  }, [events, userId]);

  // Rehydrate navigation state on mount/login. Views that don't need a data
  // lookup ('transcription', 'patients') restore immediately; 'patient' and
  // 'diagnosis' wait until patients/events are populated so we can resolve
  // the saved id against the actual record.
  useEffect(() => {
    if (!userId || navRehydratedRef.current) return;
    const raw = localStorage.getItem(`echomed_${userId}_nav_state`);
    if (!raw) {
      navRehydratedRef.current = true;
      return;
    }
    let nav: any;
    try { nav = JSON.parse(raw); } catch {
      navRehydratedRef.current = true;
      return;
    }

    if (nav.view === 'patients' || nav.view === 'transcription') {
      setView(nav.view);
      navRehydratedRef.current = true;
      return;
    }

    // Wait for cached data to load before attempting id-based restoration.
    if (patients.length === 0 && events.length === 0) return;

    if (nav.view === 'patient' && nav.selectedPatientId) {
      const p = patients.find((x: Patient) => x.id === nav.selectedPatientId);
      if (p) {
        setSelectedPatient(p);
        setView('patient');
      }
    } else if (nav.view === 'diagnosis' && nav.selectedEventId) {
      const ev = events.find((x: TimelineEvent) => x.id === nav.selectedEventId);
      if (ev && ev.result) {
        setSelectedEvent(ev);
        setCurrentResult(ev.result as any);
        const p = patients.find((x: Patient) => x.id === ev.patientId);
        if (p) {
          setSelectedPatient(p);
          setPatientName(p.name);
        }
        setView('diagnosis');
      }
    }

    navRehydratedRef.current = true;
  }, [userId, patients, events]);

  // Migrate existing history to patient-centric format (runs once)
  useEffect(() => {
    if (history.length > 0 && patients.length === 0) {
      const migratedPatients: Patient[] = [];
      const migratedEvents: TimelineEvent[] = [];
      const patientMap = new Map<string, Patient>();

      history.forEach((item: any, index: number) => {
        const rawPatientName = item.patient || 'Anônimo';
        const normalizedDisplayName = normalizePatientName(rawPatientName);
        const normalizedKey = normalizedDisplayName.toLowerCase();

        // Create or get patient
        let patient = patientMap.get(normalizedKey);
        if (!patient) {
          patient = {
            id: `patient_${Date.now()}_${index}`,
            name: normalizedDisplayName,
            createdAt: item.createdAt || new Date().toISOString()
          };
          patientMap.set(normalizedKey, patient);
          migratedPatients.push(patient);
        }

        // Determine event type (first event for patient = initial, others = followup)
        const existingEventsForPatient = migratedEvents.filter(e => e.patientId === patient!.id);
        const eventType: EventType = existingEventsForPatient.length === 0 ? 'initial' : 'followup';

        // Create event
        const event: TimelineEvent = {
          id: item.id || `event_${Date.now()}_${index}`,
          patientId: patient.id,
          type: eventType,
          date: item.createdAt || new Date().toISOString(),
          transcript: item.transcript,
          result: item.result,
          doctorName: item.doctorName || 'Nutricionista',
          createdAt: item.createdAt || new Date().toISOString()
        };
        migratedEvents.push(event);
      });

      if (migratedPatients.length > 0) {
        setPatients(migratedPatients);
        setEvents(migratedEvents);
        console.log(`✅ Migrated ${migratedPatients.length} patients and ${migratedEvents.length} events`);
      }
    }
  }, [history, patients.length]);

  // Helper to find or create patient with context
  const findOrCreatePatient = (
    name: string,
    context?: {
      goals?: PatientGoal[];
      goalCustom?: string;
      training?: TrainingActivity[];
      isFirstConsultation?: boolean | null;
    }
  ): Patient => {
    const normalizedName = normalizePatientName(name);
    const normalizedLower = normalizedName.toLowerCase();
    const existing = patients.find(p => p.name.toLowerCase() === normalizedLower);

    if (existing) {
      // Update existing patient with new context if provided
      if (context && (context.goals?.length || context.training?.length)) {
        const updatedPatient = {
          ...existing,
          goals: context.goals?.length ? context.goals : existing.goals,
          goalCustom: context.goalCustom || existing.goalCustom,
          trainingRoutine: context.training?.length ? context.training : existing.trainingRoutine,
          isFirstConsultation: context.isFirstConsultation !== null ? context.isFirstConsultation : existing.isFirstConsultation
        };
        setPatients(prev => prev.map(p => p.id === existing.id ? updatedPatient : p));
        return updatedPatient;
      }
      return existing;
    }

    const newPatient: Patient = {
      id: `patient_${Date.now()}`,
      name: normalizedName,
      createdAt: new Date().toISOString(),
      goals: context?.goals,
      goalCustom: context?.goalCustom,
      trainingRoutine: context?.training,
      isFirstConsultation: context?.isFirstConsultation ?? true
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  };

  // Add event for patient
  const addEventForPatient = (patientId: string, type: EventType, result: any, transcript?: string) => {
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}`,
      patientId,
      type,
      date: new Date().toISOString(),
      transcript,
      result,
      doctorName: doctorProfile.name,
      createdAt: new Date().toISOString()
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  };

  // Add adjustment/observation for patient, linked to a specific consultation
  const addAdjustmentForPatient = (patientId: string, note: string, parentEventId?: string) => {
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}`,
      patientId,
      type: 'adjustment',
      date: new Date().toISOString(),
      adjustmentNote: note,
      parentEventId,
      doctorName: doctorProfile.name,
      createdAt: new Date().toISOString()
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  // Delete event (mainly for adjustments)
  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Edit event note (for adjustments)
  const editEventNote = (eventId: string, newNote: string) => {
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, adjustmentNote: newNote } : e
    ));
  };

  // Update event result (for diagnosis edits)
  const updateEventResult = (eventId: string, updatedResult: any) => {
    console.log('🟡 updateEventResult called', { eventId, updatedResult });
    setEvents(prev => {
      const updated = prev.map(e =>
        e.id === eventId ? { ...e, result: updatedResult } : e
      );
      console.log('🟡 Events updated, found match:', prev.some(e => e.id === eventId));
      return updated;
    });
  };

  // Edit patient name
  const editPatient = (patientId: string, newName: string) => {
    const normalizedName = normalizePatientName(newName);
    if (!normalizedName.trim()) return;

    // Update patient
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, name: normalizedName } : p
    ));

    // Update selectedPatient if it's the one being edited
    if (selectedPatient?.id === patientId) {
      setSelectedPatient(prev => prev ? { ...prev, name: normalizedName } : null);
    }
  };

  // Auto-fill profile name from authenticated user on first login
  useEffect(() => {
    if (!user?.displayName) return;
    setDoctorProfile((prev: any) => {
      if (prev.name && prev.name !== 'Nutricionista') return prev;
      return { ...prev, name: user.displayName };
    });
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !db) return;

    try {
      const historyRef = collection(db, 'users', user.uid, 'consultations');
      const unsubscribe = onSnapshot(historyRef, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(data.sort((a:any, b:any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) as any);
      }, (err) => console.error("Firestore Listen Error:", err));

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to set up Firestore listener:", error);
    }
  }, [user]);

  // --- Lógica de IA ---
  const callGeminiAI = async (
    text: string,
    patientContext?: {
      goal?: string;
      training?: TrainingActivity[];
      isFirstConsultation?: boolean;
    }
  ) => {
    // Build context string for AI
    let contextInfo = '';
    if (patientContext) {
      const parts = [];
      if (patientContext.goal) {
        parts.push(`Objetivo do paciente: ${patientContext.goal}`);
      }
      if (patientContext.training?.length) {
        const trainingStr = patientContext.training
          .map(t => `${t.type}: ${t.frequency}`)
          .join(', ');
        parts.push(`Rotina de treino: ${trainingStr}`);
      }
      if (patientContext.isFirstConsultation !== undefined) {
        parts.push(patientContext.isFirstConsultation ? 'Primeira consulta' : 'Consulta de retorno');
      }
      if (parts.length > 0) {
        contextInfo = `\n\n[CONTEXTO DO PACIENTE]\n${parts.join('\n')}`;
      }
    }

    // Add timeout for Render cold start (can take 50+ seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      if (!user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const idToken = await user.getIdToken();
      const response = await fetch(`${backendUrl}/api/analyze-medical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          transcript: text + contextInfo,
          patientContext,
          tone: doctorProfile.preferences?.tone || 'humanizado',
          exams: (() => {
            // Combine existing patient's exams (if any) + pending exams uploaded now.
            // Dedupe by fileName + text length to avoid sending the same file twice.
            const pn = (patientName || '').trim().toLowerCase();
            const match = pn ? patients.find((p: any) => p.name.toLowerCase() === pn) : null;
            const existing: any[] = match?.exams || [];
            const combined = [...existing, ...(pendingExams || [])];
            const seen = new Set<string>();
            return combined.reduce<any[]>((acc, e: any) => {
              const key = `${e.fileName}::${e.extractedText?.length || 0}`;
              if (seen.has(key)) return acc;
              seen.add(key);
              acc.push({
                fileName: e.fileName,
                uploadedAt: e.uploadedAt,
                extractedText: e.extractedText,
              });
              return acc;
            }, []);
          })(),
          activeMealPlan: (() => {
            const pn = (patientName || '').trim().toLowerCase();
            const match = pn ? patients.find((p: any) => p.name.toLowerCase() === pn) : null;
            const existing: any[] = match?.mealPlans || [];
            const combined = [...existing, ...(pendingMealPlans || [])];
            if (combined.length === 0) return null;
            // Pick most recent (active)
            const toTimeLocal = (d: any): number => {
              if (!d) return 0;
              if (d.toDate) return d.toDate().getTime();
              if (d.seconds) return d.seconds * 1000;
              const parsed = new Date(d).getTime();
              return isNaN(parsed) ? 0 : parsed;
            };
            const active = [...combined].sort((a, b) => toTimeLocal(b.uploadedAt) - toTimeLocal(a.uploadedAt))[0];
            return {
              fileName: active.fileName,
              uploadedAt: active.uploadedAt,
              extractedText: active.extractedText,
            };
          })(),
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json();
        const detail = errData.details ? `: ${errData.details}` : '';
        throw new Error((errData.error || "Erro ao processar análise") + detail);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tempo limite excedido. O servidor pode estar iniciando, tente novamente.');
      }
      throw error;
    }
  };

  const finalizeConsultation = async () => {
    if (!currentTranscript.trim()) return;
    if (status === AppStatus.PROCESSING) return; // Prevent double-click
    setStatus(AppStatus.PROCESSING);
    try {
      // Build patient context for AI (supports multiple goals)
      const goalLabels = currentPatientGoals.length > 0
        ? currentPatientGoals.map(g => g === 'outro' ? currentPatientGoalCustom : GOAL_LABELS[g]).join(' + ')
        : undefined;

      const patientContext = {
        goal: goalLabels,
        training: currentPatientTraining,
        isFirstConsultation: currentIsFirstConsultation ?? undefined
      };

      const aiResponse = await callGeminiAI(currentTranscript, patientContext);
      const now = new Date().toISOString();

      // Create consultation record (legacy format for backward compatibility)
      const consultationRecord = {
        id: Date.now().toString(),
        patient: patientName || 'Anônimo',
        diagnosis: aiResponse.nutritionalAssessment || aiResponse.diagnosis,
        result: aiResponse,
        transcript: currentTranscript,
        createdAt: now,
        doctorName: doctorProfile.name
      };

      // Save to local history (always works, even offline)
      setHistory((prev: any) => [consultationRecord, ...prev]);

      // === Patient-centric storage ===
      const patient = findOrCreatePatient(patientName || 'Anônimo', {
        goals: currentPatientGoals,
        goalCustom: currentPatientGoalCustom,
        training: currentPatientTraining,
        isFirstConsultation: currentIsFirstConsultation
      });

      // Determine if this is initial or followup
      const patientEvents = events.filter(e => e.patientId === patient.id);
      const eventType: EventType = patientEvents.length === 0 ? 'initial' : 'followup';

      // Create timeline event and set it as selected for editing
      const newEvent = addEventForPatient(patient.id, eventType, aiResponse, currentTranscript);
      setSelectedEvent(newEvent);

      // Merge AI-extracted highlights + training into patient
      const MAX_HIGHLIGHTS = 8;
      const existingHighlights = patient.highlights || [];
      const remaining = MAX_HIGHLIGHTS - existingHighlights.length;

      const rawHighlights: string[] = Array.isArray(aiResponse.patientHighlights)
        ? aiResponse.patientHighlights
        : [];
      const newHighlights = remaining > 0
        ? rawHighlights
            .filter((h: string) => !existingHighlights.some(
              (eh: string) => eh.toLowerCase() === h.toLowerCase()
            ))
            .slice(0, remaining)
        : [];

      // Extract training info from AI (only applied if patient has no trainingRoutine yet)
      const rawTraining = Array.isArray(aiResponse.extractedTraining)
        ? aiResponse.extractedTraining.filter(
            (t: any) => t && typeof t.type === 'string' && typeof t.frequency === 'string'
          )
        : [];

      // Merge pending exams + meal plans (uploaded in popup/transcription) into the patient,
      // dedupe by fileName + extractedText length
      const existingExams: any[] = (patient as any).exams || [];
      const newExams = (pendingExams || []).filter(
        (pe: any) => !existingExams.some(
          (ee: any) => ee.fileName === pe.fileName && ee.extractedText?.length === pe.extractedText?.length
        )
      );
      const existingMealPlans: any[] = (patient as any).mealPlans || [];
      const newMealPlans = (pendingMealPlans || []).filter(
        (pm: any) => !existingMealPlans.some(
          (em: any) => em.fileName === pm.fileName && em.extractedText?.length === pm.extractedText?.length
        )
      );

      // Anthropometric data captured this consultation — fill if patient doesn't have it yet
      const anthropoChanges: any = {};
      if (currentPatientWeight && !patient.weightKg) anthropoChanges.weightKg = currentPatientWeight;
      if (currentPatientHeight && !patient.heightCm) anthropoChanges.heightCm = currentPatientHeight;
      if (currentPatientBirthDate && !patient.birthDate) anthropoChanges.birthDate = currentPatientBirthDate;
      if (currentPatientRestrictions && !patient.dietaryRestrictions) {
        anthropoChanges.dietaryRestrictions = currentPatientRestrictions;
      }
      const hasAnthropoChanges = Object.keys(anthropoChanges).length > 0;

      if (newHighlights.length > 0 || rawTraining.length > 0 || newExams.length > 0 || newMealPlans.length > 0 || hasAnthropoChanges) {
        setPatients(prev => prev.map(p => {
          if (p.id !== patient.id) return p;
          const updated: any = { ...p, ...anthropoChanges };
          if (newHighlights.length > 0) {
            updated.highlights = [...existingHighlights, ...newHighlights];
          }
          // Merge training: keep nutri's manual entries + append new ones the AI extracted.
          // Dedup uses a canonical activity token (strips digits and frequency words like
          // "x", "semana", "por") so "2x semana futebol" matches "Futebol" + "2x/semana".
          // If the existing entry is missing frequency and the AI version has it, we
          // upgrade to the AI's cleaner { type, frequency } pair.
          if (rawTraining.length > 0) {
            const canonActivity = (t: any): string => {
              return `${t?.type || ''} ${t?.frequency || ''}`
                .toLowerCase()
                .replace(/\d+/g, ' ')
                .replace(/\b(x|vezes|por|semana|semanal|sem|dia|diaria|mes|mensal|min|minutos?|h|horas?)\b/g, ' ')
                .replace(/[\/:,.]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            };
            const merged = [...(p.trainingRoutine || [])];
            for (const aiT of rawTraining as TrainingActivity[]) {
              const aiCanon = canonActivity(aiT);
              if (!aiCanon) continue;
              const idx = merged.findIndex((e) => canonActivity(e) === aiCanon);
              if (idx === -1) {
                merged.push(aiT);
              } else {
                // Same activity — if the manual entry has no clean frequency, prefer
                // the AI's structured version (cleaner type + frequency split).
                const existing = merged[idx];
                if (!existing.frequency && aiT.frequency && aiT.type) {
                  merged[idx] = aiT;
                }
              }
            }
            if (merged.length !== (p.trainingRoutine || []).length ||
                merged.some((m, i) => m !== (p.trainingRoutine || [])[i])) {
              updated.trainingRoutine = merged;
            }
          }
          if (newExams.length > 0) {
            updated.exams = [...existingExams, ...newExams];
          }
          if (newMealPlans.length > 0) {
            updated.mealPlans = [...existingMealPlans, ...newMealPlans];
          }
          return updated;
        }));
      }
      // Clear pending docs after applying
      setPendingExams([]);
      setPendingMealPlans([]);

      // Update UI immediately (before Firebase which may hang)
      setCurrentResult(aiResponse);
      setView('diagnosis');
      showToast('Análise salva com sucesso');
      // Clear autosave after successful analysis
      const asKey = lsKey('autosave');
      if (asKey) localStorage.removeItem(asKey);

      // Save to Firebase under the user's private subcollection (non-blocking)
      if (user?.uid && db) {
        addDoc(collection(db, 'users', user.uid, 'consultations'), {
          patient: patientName || 'Anônimo',
          diagnosis: aiResponse.nutritionalAssessment || aiResponse.diagnosis,
          result: aiResponse,
          transcript: currentTranscript,
          createdAt: serverTimestamp(),
          doctorName: doctorProfile.name
        }).catch(dbError => {
          console.error("Failed to save to Firebase:", dbError);
        });
      }
    } catch (error: any) {
      console.error("Erro na análise:", error);
      alert(`Erro na análise: ${error.message}\n\nVerifique se o servidor backend está rodando em ${backendUrl}`);
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-base font-sans text-ink-primary selection:bg-brand-100">
      <nav className="bg-surface/95 backdrop-blur-md border-b border-line px-4 md:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setCurrentTranscript(''); setPatientName(''); setCurrentResult(null); setView('transcription'); }}>
            <div className="bg-brand-700 p-2 rounded-md text-white shadow-xs"><Activity size={18} strokeWidth={2.25} /></div>
            <div>
              <h1 className="font-bold text-md md:text-lg tracking-tight leading-none text-ink-primary">EchoNutri</h1>
              <span className="text-2xs text-ink-tertiary font-medium uppercase tracking-[0.1em] hidden sm:block mt-0.5">Inteligência clínica</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            <div className="flex gap-0.5 bg-subtle p-0.5 rounded-md">
              <button onClick={() => { setCurrentTranscript(''); setPatientName(''); setCurrentResult(null); setSelectedEvent(null); setView('transcription'); }} className={`px-3 md:px-4 py-1.5 rounded-sm text-sm font-semibold transition-colors ${view === 'transcription' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}>Consulta</button>
              <button onClick={() => { setView('patients'); setSelectedPatient(null); }} className={`px-3 md:px-4 py-1.5 rounded-sm text-sm font-semibold transition-colors flex items-center gap-1.5 ${view === 'patients' || view === 'patient' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}>
                <Users size={14} strokeWidth={2.25} /> <span className="hidden sm:inline">Pacientes</span><span className="sm:hidden">Pac.</span>
              </button>
            </div>
            {/* Profile Picture Button */}
            <button
              onClick={() => setShowProfilePopup(true)}
              className="relative w-9 h-9 rounded-full overflow-hidden border border-line hover:border-brand-700 transition-colors cursor-pointer bg-subtle flex items-center justify-center"
            >
              {doctorProfile.photo ? (
                <img src={doctorProfile.photo} alt="Foto do perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-ink-tertiary" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 py-4 md:p-8 pb-24">
        {view === 'transcription' && (
          <>
            <TranscriptionView
              autosaveKey={userId ? `echomed_${userId}_autosave` : null}
              status={status} setStatus={setStatus}
              patientName={patientName} setPatientName={setPatientName}
              transcript={currentTranscript} setTranscript={setCurrentTranscript}
              onFinalize={finalizeConsultation}
              patients={patients}
              events={events}
              // Patient context (supports up to 2 goals)
              patientGoals={currentPatientGoals} setPatientGoals={setCurrentPatientGoals}
              patientGoalCustom={currentPatientGoalCustom} setPatientGoalCustom={setCurrentPatientGoalCustom}
              patientTraining={currentPatientTraining} setPatientTraining={setCurrentPatientTraining}
              isFirstConsultation={currentIsFirstConsultation} setIsFirstConsultation={setCurrentIsFirstConsultation}
              pendingExams={pendingExams} setPendingExams={setPendingExams}
              pendingMealPlans={pendingMealPlans} setPendingMealPlans={setPendingMealPlans}
              patientWeight={currentPatientWeight} setPatientWeight={setCurrentPatientWeight}
              patientHeight={currentPatientHeight} setPatientHeight={setCurrentPatientHeight}
              patientBirthDate={currentPatientBirthDate} setPatientBirthDate={setCurrentPatientBirthDate}
              patientRestrictions={currentPatientRestrictions} setPatientRestrictions={setCurrentPatientRestrictions}
            />
            <ConsultationBriefingBubble
              events={events}
              patientName={patientName}
              patients={patients}
            />
          </>
        )}
        {view === 'patients' && (
          <PatientList
            patients={patients}
            events={events}
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              setView('patient');
            }}
          />
        )}
        {view === 'patient' && selectedPatient && (
          <PatientPage
            patient={selectedPatient}
            events={events}
            onBack={() => {
              setSelectedPatient(null);
              setView('patients');
            }}
            onNewConsultation={(patient) => {
              setPatientName(patient.name);
              setView('transcription');
            }}
            onAddAdjustment={addAdjustmentForPatient}
            onDeleteEvent={deleteEvent}
            onEditEvent={editEventNote}
            onEditPatient={editPatient}
            onUpdateHighlights={(patientId: string, highlights: string[]) => {
              setPatients(prev => prev.map(p =>
                p.id === patientId ? { ...p, highlights } : p
              ));
              if (selectedPatient?.id === patientId) {
                setSelectedPatient(prev => prev ? { ...prev, highlights } : null);
              }
            }}
            onUpdateExams={(patientId: string, exams: any[]) => {
              setPatients(prev => prev.map(p =>
                p.id === patientId ? { ...p, exams } : p
              ));
              if (selectedPatient?.id === patientId) {
                setSelectedPatient(prev => prev ? { ...prev, exams } : null);
              }
            }}
            onUpdateMealPlans={(patientId: string, mealPlans: any[]) => {
              setPatients(prev => prev.map(p =>
                p.id === patientId ? { ...p, mealPlans } : p
              ));
              if (selectedPatient?.id === patientId) {
                setSelectedPatient(prev => prev ? { ...prev, mealPlans } : null);
              }
            }}
            onUpdatePatient={(patientId: string, changes: any) => {
              setPatients(prev => prev.map(p =>
                p.id === patientId ? { ...p, ...changes } : p
              ));
              if (selectedPatient?.id === patientId) {
                setSelectedPatient(prev => prev ? { ...prev, ...changes } : null);
              }
            }}
            onEventClick={(event) => {
              setSelectedEvent(event);
              if (event.result) {
                setCurrentResult(event.result);
                setPatientName(selectedPatient.name);
                setView('diagnosis');
              }
            }}
          />
        )}
        {view === 'diagnosis' && <DiagnosisView
          result={currentResult}
          patientName={patientName}
          eventId={selectedEvent?.id}
          preferences={doctorProfile.preferences}
          doctorProfile={doctorProfile}
          consultationDate={selectedEvent?.date}
          currentPatient={(() => {
            const pn = (patientName || '').trim().toLowerCase();
            return pn ? patients.find((p: any) => p.name?.toLowerCase() === pn) : null;
          })()}
          onUpdatePatient={(changes: any) => {
            const pn = (patientName || '').trim().toLowerCase();
            const target = pn ? patients.find((p: any) => p.name?.toLowerCase() === pn) : null;
            if (!target) return;
            setPatients(prev => prev.map((p: any) =>
              p.id === target.id ? { ...p, ...changes } : p
            ));
            if (selectedPatient?.id === target.id) {
              setSelectedPatient(prev => prev ? { ...prev, ...changes } : null);
            }
          }}
          onSaveMealPlan={async (structuredPlan: any) => {
            const pn = (patientName || '').trim().toLowerCase();
            const target = pn ? patients.find((p: any) => p.name?.toLowerCase() === pn) : null;
            if (!target) return;
            // Convert structured plan to a MealPlan entry (text representation)
            const text = JSON.stringify(structuredPlan, null, 2);
            const newPlan: any = {
              id: `plan_ai_${Date.now()}`,
              fileName: `Plano_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`,
              uploadedAt: new Date().toISOString(),
              extractedText: text,
              sizeBytes: text.length,
              structuredPlan,
            };
            setPatients(prev => prev.map((p: any) =>
              p.id === target.id
                ? { ...p, mealPlans: [...(p.mealPlans || []), newPlan] }
                : p
            ));
          }}
          onSaveResult={(updatedResult: any) => { if (selectedEvent?.id) { updateEventResult(selectedEvent.id, updatedResult); setCurrentResult(updatedResult); } }}
          onBack={() => { setView(selectedPatient ? 'patient' : 'transcription'); setCurrentTranscript(''); if (!selectedPatient) setPatientName(''); }}
        />}
      </main>

      {/* Profile Popup */}
      {showProfilePopup && (
        <ProfilePopup
          profile={doctorProfile}
          userEmail={user?.email}
          onSave={(newProfile: any) => { setDoctorProfile(newProfile); setShowProfilePopup(false); }}
          onClose={() => setShowProfilePopup(false)}
          onLogout={async () => {
            try {
              await logout();
              setShowProfilePopup(false);
            } catch (err) {
              console.error("Logout error:", err);
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
            <CheckCircle size={18} className="text-green-400" />
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePopup({ profile, userEmail, onSave, onClose, onLogout }: any) {
  const [name, setName] = useState(profile.name || '');
  const [specialty, setSpecialty] = useState(profile.specialty || '');
  const [crn, setCrn] = useState(profile.crm || '');
  const [photo, setPhoto] = useState<string | null>(profile.photo);
  const [logoUrl, setLogoUrl] = useState<string | null>(profile.logoUrl || null);
  const [brandColor, setBrandColor] = useState<string>(profile.brandColor || '#2563EB');
  const defaultPrefs = { showConduct: true, showAttention: true, showExams: true, tone: 'humanizado' };
  const [prefs, setPrefs] = useState(profile.preferences || defaultPrefs);
  const [tab, setTab] = useState<'profile' | 'preferences' | 'brand'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Resize to max 400x400 and re-encode as JPEG so the base64 stays well
      // under Firestore's 1MB-per-field limit. Without this, the photo got
      // stripped from the Firestore save and lost on hard refresh.
      const img = new Image();
      img.onload = () => {
        const maxSide = 400;
        let { width, height } = img;
        if (width > maxSide) { height = height * (maxSide / width); width = maxSide; }
        if (height > maxSide) { width = width * (maxSide / height); height = maxSide; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) { setPhoto(dataUrl); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let compressed = canvas.toDataURL('image/jpeg', 0.85);
        if (compressed.length > 700_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.6);
        }
        setPhoto(compressed);
      };
      img.onerror = () => setPhoto(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem original muito grande (máx 5MB). Comprima antes de enviar.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Resize to max 600x300px and re-encode as JPEG (q=0.85) so the base64
      // stays well under Firestore's 1MB-per-field limit.
      const img = new Image();
      img.onload = () => {
        const maxW = 600;
        const maxH = 300;
        let { width, height } = img;
        if (width > maxW) { height = height * (maxW / width); width = maxW; }
        if (height > maxH) { width = width * (maxH / height); height = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) { setLogoUrl(dataUrl); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // PNG keeps transparency (logos), JPEG smaller for photos.
        const isPng = file.type.includes('png');
        let compressed = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.85);
        // Last-resort safety net to stay under the 1MB Firestore field limit
        if (compressed.length > 700_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.6);
        }
        setLogoUrl(compressed);
      };
      img.onerror = () => setLogoUrl(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({
      ...profile,
      name: name.trim() || 'Nutricionista',
      specialty: specialty.trim() || 'Nutrição Clínica',
      crm: crn.trim(),
      photo,
      logoUrl,
      brandColor,
      preferences: prefs,
    });
  };

  const togglePref = (key: 'showConduct' | 'showAttention' | 'showExams') => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-y-auto p-4"
      onClick={handleSave}
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <h3 className="text-2xl font-black text-slate-900">
            {tab === 'profile' ? 'Meu Perfil' : tab === 'preferences' ? 'Preferências' : 'Identidade Visual'}
          </h3>
          <p className="text-slate-500 mt-1 text-sm">
            {tab === 'profile' ? 'Configure sua foto e informações'
              : tab === 'preferences' ? 'Como a análise aparece para você'
              : 'Logo e cor que aparecem nos PDFs gerados'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'profile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setTab('preferences')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'preferences' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Preferências
          </button>
          <button
            onClick={() => setTab('brand')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'brand' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Visual
          </button>
        </div>

        {tab === 'brand' ? (
          <div className="space-y-5">
            {/* Logo upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Logo (aparece no topo dos PDFs)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center px-2">Sem logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remover
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Recomendado: PNG com fundo transparente, máx 1MB.
              </p>
            </div>

            {/* Brand color */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Cor primária (títulos e detalhes nos PDFs)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-14 h-14 rounded-xl border border-slate-200 cursor-pointer bg-white"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#2563EB"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 outline-none font-mono text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {['#2563EB', '#10B981', '#7C3AED', '#DB2777', '#F59E0B', '#0F172A'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${brandColor === c ? 'border-slate-900 scale-110' : 'border-white hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-3">Pré-visualização do PDF</p>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-100">
                <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: brandColor }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                  ) : (
                    <div className="text-sm font-black" style={{ color: brandColor }}>
                      {name || 'Nutricionista'}
                    </div>
                  )}
                  <div className="ml-auto text-right">
                    <div className="text-[10px] font-bold text-slate-700">{name || 'Nutricionista'}</div>
                    <div className="text-[9px] text-slate-400">{specialty} {crn && `• CRN ${crn}`}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: brandColor }}>
                    Pedido de Exames
                  </div>
                  <div className="text-[10px] text-slate-500">Exemplo de cabeçalho...</div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'preferences' ? (
          <div className="space-y-5">
            {/* Sections to show */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Seções na análise
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl opacity-60">
                  <span className="text-sm font-medium text-slate-700">Racional Clínico</span>
                  <span className="text-xs text-slate-400">Sempre visível</span>
                </div>
                {[
                  { key: 'showConduct', label: 'Direcionamento clínico' },
                  { key: 'showAttention', label: 'Pontos de Atenção' },
                  { key: 'showExams', label: 'Exames Sugeridos' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={!!prefs[key as 'showConduct' | 'showAttention' | 'showExams']}
                      onChange={() => togglePref(key as 'showConduct' | 'showAttention' | 'showExams')}
                      className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Tom da análise
              </label>
              <div className="space-y-2">
                {[
                  { value: 'humanizado', label: 'Humanizado', desc: 'Acolhedor e empático' },
                  { value: 'sistemico', label: 'Sistêmico / Integrativo', desc: 'Conexões biopsicossociais' },
                  { value: 'direto', label: 'Direto', desc: 'Objetivo e prático' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    prefs.tone === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="tone"
                      checked={prefs.tone === value}
                      onChange={() => setPrefs({ ...prefs, tone: value })}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-800">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (<>

        {/* Photo Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-200 hover:border-blue-400 transition-colors cursor-pointer bg-slate-100 flex items-center justify-center"
            >
              {photo ? (
                <img src={photo} alt="Foto do perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-slate-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome</label>
          <input
            type="text"
            placeholder="Seu nome..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Specialty Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidade</label>
          <input
            type="text"
            placeholder="Sua especialidade..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>

        {/* CRN Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CRN</label>
          <input
            type="text"
            placeholder="Ex: 12345/SP"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            value={crn}
            onChange={(e) => setCrn(e.target.value)}
          />
        </div>

        {/* Remove Photo Button */}
        {photo && (
          <button
            onClick={() => setPhoto(null)}
            className="w-full py-2 mb-4 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Remover foto
          </button>
        )}
        </>)}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
        </div>

        {/* Account Info & Logout */}
        {(userEmail || onLogout) && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            {userEmail && (
              <p className="text-xs text-slate-400 text-center mb-3">
                Conectado como <span className="font-semibold text-slate-600">{userEmail}</span>
              </p>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Sair da conta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptionView({
  autosaveKey, status, setStatus, patientName, setPatientName, transcript, setTranscript, onFinalize, patients, events,
  patientGoals, setPatientGoals, patientGoalCustom, setPatientGoalCustom,
  patientTraining, setPatientTraining, isFirstConsultation, setIsFirstConsultation,
  pendingExams, setPendingExams,
  pendingMealPlans, setPendingMealPlans,
  patientWeight, setPatientWeight,
  patientHeight, setPatientHeight,
  patientBirthDate, setPatientBirthDate,
  patientRestrictions, setPatientRestrictions
}: any) {
  const recognitionRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [interim, setInterim] = useState('');
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showPopupSuggestions, setShowPopupSuggestions] = useState(false);
  const [tempGoals, setTempGoals] = useState<PatientGoal[]>([]);
  const [tempGoalCustom, setTempGoalCustom] = useState('');
  const [tempTraining, setTempTraining] = useState('');
  const [tempWeight, setTempWeight] = useState<string>('');
  const [tempHeight, setTempHeight] = useState<string>('');
  const [tempBirthDate, setTempBirthDate] = useState<string>('');
  const [tempRestrictions, setTempRestrictions] = useState<string>('');
  const [tempIsFirst, setTempIsFirst] = useState<boolean | null>(null);
  const [inlineTrainingText, setInlineTrainingText] = useState('');

  // Audio upload state — for offline consultations recorded on Zoom/Meet/phone.
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [audioUploadState, setAudioUploadState] = useState<
    | { kind: 'idle' }
    | { kind: 'uploading'; progress: number; fileName: string }
    | { kind: 'transcribing'; fileName: string; estimateMs: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const handleAudioFileSelected = async (file: File) => {
    if (!file) return;
    if (!patientName.trim()) {
      alert('Informe o nome da paciente antes de carregar o áudio.');
      return;
    }
    if (file.size > 800 * 1024 * 1024) {
      setAudioUploadState({ kind: 'error', message: 'Arquivo maior que 800MB. Comprima o vídeo (ou exporte só o áudio) antes de enviar.' });
      return;
    }

    const auth = (await import('firebase/auth')).getAuth();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      setAudioUploadState({ kind: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    const baseUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
      ? 'https://echomed-p3tr.onrender.com'
      : 'http://localhost:3001';

    // Upload via XMLHttpRequest so we get progress events (fetch can't do that yet).
    setAudioUploadState({ kind: 'uploading', progress: 0, fileName: file.name });
    const formData = new FormData();
    formData.append('audio', file);

    let jobId: string;
    try {
      jobId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/api/transcribe-audio`);
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setAudioUploadState((s: any) => (s.kind === 'uploading' ? { ...s, progress: pct } : s));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300 && data.jobId) resolve(data.jobId);
            else reject(new Error(data.error || `Erro ${xhr.status} ao enviar áudio`));
          } catch {
            reject(new Error('Resposta inválida do servidor'));
          }
        };
        xhr.onerror = () => reject(new Error('Falha na conexão com o servidor'));
        xhr.ontimeout = () => reject(new Error('Tempo de upload excedido'));
        xhr.send(formData);
      });
    } catch (err: any) {
      setAudioUploadState({ kind: 'error', message: err?.message || 'Erro no upload' });
      return;
    }

    // Switch to transcribing state with a rough time estimate (~1 min per 20 min audio).
    // We don't know duration upfront, so estimate from file size as a proxy:
    // ~1MB/min → 1 min processing per ~20MB.
    const estimateMs = Math.max(60_000, Math.round((file.size / (20 * 1024 * 1024)) * 60_000));
    setAudioUploadState({ kind: 'transcribing', fileName: file.name, estimateMs });

    // Poll for the transcript. Poll faster early on (most short audios are
    // ready in 5-20s), slow down later to avoid hammering the backend if
    // the audio is long.
    const pollDeadline = Date.now() + 20 * 60 * 1000; // 20 min cap
    let attempt = 0;
    while (Date.now() < pollDeadline) {
      attempt += 1;
      const interval = attempt < 10 ? 1500 : 5000; // 1.5s for the first ~15s, then 5s
      await new Promise((r) => setTimeout(r, interval));
      const r = await fetch(`${baseUrl}/api/transcribe-audio/${jobId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!r.ok) {
        setAudioUploadState({ kind: 'error', message: 'Erro ao consultar status da transcrição' });
        return;
      }
      const data = await r.json();
      if (data.status === 'done' && data.transcript) {
        setTranscript((prev: string) => (prev ? prev + '\n\n' : '') + data.transcript);
        setAudioUploadState({ kind: 'idle' });
        return;
      }
      if (data.status === 'failed') {
        setAudioUploadState({ kind: 'error', message: data.error || 'Falha na transcrição' });
        return;
      }
    }
    setAudioUploadState({ kind: 'error', message: 'Tempo de transcrição excedido. Tente um áudio menor.' });
  };

  // Sync inlineTrainingText when patientTraining changes externally (e.g., selecting a patient)
  useEffect(() => {
    setInlineTrainingText(formatTraining(patientTraining || []));
  }, [patientTraining]);

  // Toggle goal selection (max 2)
  const toggleGoal = (goal: PatientGoal, isTemp = false) => {
    const currentGoals = isTemp ? tempGoals : (patientGoals || []);
    const setGoals = isTemp ? setTempGoals : setPatientGoals;

    if (currentGoals.includes(goal)) {
      setGoals(currentGoals.filter((g: PatientGoal) => g !== goal));
    } else if (currentGoals.length < 2) {
      setGoals([...currentGoals, goal]);
    }
  };
  const [pendingAction, setPendingAction] = useState<'record' | 'finalize' | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [nameWarning, setNameWarning] = useState('');
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [accumulatedTime, setAccumulatedTime] = useState(0);

  // Parse training string to TrainingActivity array
  const parseTraining = (str: string): TrainingActivity[] => {
    if (!str.trim()) return [];
    // Accepts:
    //   "Musculação 3x, Natação 1x"
    //   "Musculação: 3x/semana, Natação: 1x/semana"
    //   "2x semana futebol" / "3x corrida" (frequency first)
    //   "musculação 3x e hiit 1x" / "futebol 2x; corrida 3x" / "musculação + corrida"
    return str.split(/\s*(?:,|;|\+|\b e \b)\s*/i).map(item => {
      const clean = item.trim();
      // Type-first: "Musculação 3x" / "Musculação: 3x/semana"
      let match = clean.match(/^([^:0-9]+?)[\s:]*(\d+x?\/?(?:semana)?)/i);
      if (match) {
        return { type: match[1].trim(), frequency: match[2].trim() };
      }
      // Frequency-first: "2x semana futebol" / "3x/semana corrida"
      match = clean.match(/^(\d+\s*x?\s*\/?\s*(?:por\s*)?(?:semana|sem|dia|mes)?)\s+(.+)$/i);
      if (match) {
        return { type: match[2].trim(), frequency: match[1].trim().replace(/\s+/g, ' ') };
      }
      return { type: clean, frequency: '' };
    }).filter(t => t.type);
  };

  // Format training array to display string
  const formatTraining = (training: TrainingActivity[]): string => {
    if (!training?.length) return '';
    return training.map(t => `${t.type}: ${t.frequency}`).join(', ');
  };

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timer every second while recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === AppStatus.RECORDING && recordingStartTime) {
      interval = setInterval(() => {
        const currentSessionTime = Math.floor((Date.now() - recordingStartTime) / 1000);
        setElapsedTime(accumulatedTime + currentSessionTime);
      }, 1000);
    }
    // Don't reset on pause - only on IDLE (after finishing)
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, recordingStartTime, accumulatedTime]);

  // Check if name is complete (has at least 2 words)
  const isNameComplete = (name: string) => {
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length >= 2;
  };

  // Get last visit date for a patient
  const getLastVisitDate = (patientId: string) => {
    const patientEvents = events?.filter((e: any) => e.patientId === patientId) || [];
    if (patientEvents.length === 0) return null;
    const sorted = patientEvents.sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0]?.date;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Patient name suggestions with last visit info
  const suggestions = patients?.filter((p: any) =>
    patientName.trim() &&
    p.name.toLowerCase().includes(patientName.toLowerCase()) &&
    p.name.toLowerCase() !== patientName.toLowerCase()
  ).map((p: any) => ({
    ...p,
    lastVisit: getLastVisitDate(p.id)
  })).slice(0, 5) || [];

  // Check if patient name exactly matches an existing patient
  const matchedExistingPatient = patientName.trim()
    ? (patients || []).find(
        (p: any) => p.name.toLowerCase() === patientName.trim().toLowerCase()
      )
    : null;
  const isExistingPatient = !!matchedExistingPatient;
  const matchedExistingChips = buildPatientQuickChips(matchedExistingPatient, events);

  // Auto-save transcript to localStorage (user-scoped)
  useEffect(() => {
    if (!autosaveKey) return;
    if (transcript && patientName) {
      const autoSaveData = { patientName, transcript, timestamp: Date.now() };
      localStorage.setItem(autosaveKey, JSON.stringify(autoSaveData));
      setAutoSaveIndicator(true);
      const timer = setTimeout(() => setAutoSaveIndicator(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [transcript, patientName, autosaveKey]);

  // Restore auto-saved data on mount (user-scoped, max 2h30 old)
  useEffect(() => {
    if (!autosaveKey) return;
    const saved = localStorage.getItem(autosaveKey);
    if (saved && !transcript) {
      try {
        const { patientName: savedName, transcript: savedTranscript, timestamp } = JSON.parse(saved);
        const MAX_AGE = 2.5 * 60 * 60 * 1000; // 2h30
        if (Date.now() - timestamp < MAX_AGE && savedTranscript) {
          if (window.confirm('Há uma transcrição não finalizada. Deseja restaurar?')) {
            setPatientName(savedName || '');
            setTranscript(savedTranscript);
          } else {
            localStorage.removeItem(autosaveKey);
          }
        }
      } catch (e) {
        console.error('Error restoring autosave:', e);
      }
    }
  }, [autosaveKey]);

  // Auto-scroll to bottom when transcript changes (teleprompter effect)
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTo({
        top: transcriptContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript, interim]);

  const checkPatientName = (action: 'record' | 'finalize') => {
    if (!patientName.trim()) {
      setPendingAction(action);
      setTempName('');
      setTempGoals([]);
      setTempGoalCustom('');
      setTempTraining('');
      setTempIsFirst(null);
      setTempWeight('');
      setTempHeight('');
      setTempBirthDate('');
      setTempRestrictions('');
      setPendingExams([]);
      setPendingMealPlans([]);
      setShowNamePopup(true);
      return false;
    }
    return true;
  };

  const handleNameSubmit = () => {
    if (!tempName.trim()) return;

    // Set patient name
    setPatientName(normalizePatientName(tempName));

    // Set patient context (supports multiple goals)
    if (tempGoals.length > 0) setPatientGoals(tempGoals);
    if (tempGoalCustom) setPatientGoalCustom(tempGoalCustom);
    if (tempTraining.trim()) setPatientTraining(parseTraining(tempTraining));
    if (tempIsFirst !== null) setIsFirstConsultation(tempIsFirst);

    // Anthropometric data (only set if filled)
    const w = parseFloat((tempWeight || '').replace(',', '.'));
    if (!isNaN(w) && w > 0) setPatientWeight(w);
    const h = parseFloat((tempHeight || '').replace(',', '.'));
    if (!isNaN(h) && h > 0) setPatientHeight(h);
    if (tempBirthDate) setPatientBirthDate(tempBirthDate);
    if (tempRestrictions.trim()) setPatientRestrictions(tempRestrictions.trim());

    setShowNamePopup(false);
    if (pendingAction === 'record') {
      setTimeout(() => doStartRecording(), 100);
    } else if (pendingAction === 'finalize') {
      setTimeout(() => onFinalize(), 100);
    }
    setPendingAction(null);
  };

  const doStartRecording = (isResume = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Seu navegador não suporta reconhecimento de voz.");
        return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'pt-BR';

    // Track if we intentionally stopped (pause/finalize) vs browser auto-stop
    recognitionRef.current._intentionallyStopped = false;

    recognitionRef.current.onresult = (event: any) => {
      let f = '', i = '';
      for (let x = event.resultIndex; x < event.results.length; ++x) {
        if (event.results[x].isFinal) f += event.results[x][0].transcript;
        else i += event.results[x][0].transcript;
      }
      if (f) setTranscript((prev: string) => prev + ' ' + f);
      setInterim(i);
    };

    // Auto-restart when browser stops recognition unexpectedly
    // This is critical for long consultations (1-2 hours)
    recognitionRef.current.onend = () => {
      // Only restart if we didn't intentionally stop (pause/finalize)
      if (recognitionRef.current && !recognitionRef.current._intentionallyStopped) {
        console.log('🔄 Speech recognition ended unexpectedly, restarting...');
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to restart speech recognition:', e);
        }
      }
    };

    // Handle errors and restart on recoverable ones
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      // Don't restart on intentional stops or fatal errors
      if (recognitionRef.current._intentionallyStopped) return;

      // Recoverable errors - restart after a brief delay
      const recoverableErrors = ['network', 'aborted', 'audio-capture', 'no-speech'];
      if (recoverableErrors.includes(event.error)) {
        console.log('🔄 Recoverable error, restarting in 500ms...');
        setTimeout(() => {
          if (recognitionRef.current && !recognitionRef.current._intentionallyStopped) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart after error:', e);
            }
          }
        }, 500);
      }
    };

    recognitionRef.current.start();
    setRecordingStartTime(Date.now());
    // Only reset accumulated time if starting fresh (not resuming)
    if (!isResume) {
      setAccumulatedTime(0);
      setElapsedTime(0);
    }
    setStatus(AppStatus.RECORDING);
  };

  const startRecording = () => {
    if (checkPatientName('record')) {
      doStartRecording(false);
    }
  };

  const resumeRecording = () => {
    doStartRecording(true);
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      // Mark as intentionally stopped to prevent auto-restart
      recognitionRef.current._intentionallyStopped = true;
      recognitionRef.current.stop();
      // Save accumulated time when pausing
      if (recordingStartTime) {
        const currentSessionTime = Math.floor((Date.now() - recordingStartTime) / 1000);
        setAccumulatedTime(prev => prev + currentSessionTime);
      }
      setStatus(AppStatus.PAUSED);
      setInterim('');
      setRecordingStartTime(null);
    }
  };

  const handleFinalize = () => {
    if (recognitionRef.current) {
      // Mark as intentionally stopped to prevent auto-restart
      recognitionRef.current._intentionallyStopped = true;
      recognitionRef.current.stop();
    }
    // Reset timer state
    setRecordingStartTime(null);
    setAccumulatedTime(0);
    setElapsedTime(0);
    setInterim('');
    setStatus(AppStatus.IDLE);
    onFinalize();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary z-10" size={16} strokeWidth={2.25} />
            <input
              placeholder="Nome completo da paciente"
              className={`w-full bg-surface border rounded-md py-3 pl-10 md:pl-11 pr-4 outline-none font-semibold text-ink-primary placeholder:text-ink-tertiary placeholder:font-normal shadow-xs focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-md ${
                nameWarning ? 'border-amber-300' : 'border-line'
              }`}
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value);
                setShowSuggestions(true);
                setNameWarning('');
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
                if (patientName.trim()) {
                  const normalized = normalizePatientName(patientName);
                  setPatientName(normalized);
                  if (!isNameComplete(normalized)) {
                    setNameWarning('Recomendado: nome completo para evitar confusão entre pacientes');
                  }
                }
              }}
            />
            {/* Name warning */}
            {nameWarning && (
              <p className="absolute -bottom-6 left-0 text-xs text-amber-600 font-medium">
                {nameWarning}
              </p>
            )}
            {/* Autocomplete suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-20">
                {suggestions.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    onMouseDown={() => {
                      setPatientName(p.name);
                      setShowSuggestions(false);
                      setNameWarning('');
                      // Pre-load existing docs so nutri can see/add more
                      if (p.exams?.length) setPendingExams(p.exams);
                      if (p.mealPlans?.length) setPendingMealPlans(p.mealPlans);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-700 block">{p.name}</span>
                      {p.lastVisit && (
                        <span className="text-xs text-slate-400">Última consulta: {formatDate(p.lastVisit)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
        <div className="flex items-center gap-2">
          {autoSaveIndicator && (
            <span className="text-xs text-green-600 font-medium animate-in fade-in duration-300">Salvo</span>
          )}
          {status === AppStatus.RECORDING && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-lg font-black text-red-600 tabular-nums">{formatElapsedTime(elapsedTime)}</span>
            </div>
          )}
          {status === AppStatus.PAUSED && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
              <Pause size={14} className="text-amber-600" />
              <span className="text-lg font-black text-amber-600 tabular-nums">{formatElapsedTime(elapsedTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick-context chips: shown when an existing patient is selected so the
          nutri can refresh memory at a glance before starting the consultation. */}
      {isExistingPatient && status === AppStatus.IDLE && matchedExistingChips.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
          {matchedExistingChips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Inline Patient Context Inputs - show only for NEW patients (not in history) */}
      {patientName.trim() && status === AppStatus.IDLE && !isExistingPatient && suggestions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 -mt-2 space-y-3 animate-in fade-in duration-200">
          {/* First Consultation Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-28 flex-shrink-0">Consulta:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsFirstConsultation(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isFirstConsultation === true
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Primeira
              </button>
              <button
                type="button"
                onClick={() => setIsFirstConsultation(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isFirstConsultation === false
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Retorno
              </button>
            </div>
          </div>

          {/* Goal Selection (optional, max 2) */}
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-28 flex-shrink-0 pt-1">
              Objetivo <span className="text-slate-300 font-normal normal-case">(opcional)</span>:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['ganho_muscular', 'perda_gordura', 'manutencao', 'performance', 'forca', 'recuperacao', 'saude_geral'] as PatientGoal[]).map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal, false)}
                  disabled={!patientGoals?.includes(goal) && (patientGoals?.length || 0) >= 2}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    patientGoals?.includes(goal)
                      ? 'bg-purple-600 text-white'
                      : (patientGoals?.length || 0) >= 2
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {GOAL_LABELS[goal]}
                </button>
              ))}
            </div>
          </div>

          {/* Training Routine */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-28 flex-shrink-0">
              Treino <span className="text-slate-300 font-normal">(opcional)</span>:
            </span>
            <input
              type="text"
              placeholder="Ex: Musculação 3x, Natação 1x"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 outline-none text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              value={inlineTrainingText}
              onChange={(e) => setInlineTrainingText(e.target.value)}
              onBlur={() => setPatientTraining(parseTraining(inlineTrainingText))}
            />
          </div>

          {/* Exam upload */}
          <div className="pt-1">
            <ExamUploader exams={pendingExams || []} onChange={setPendingExams} compact />
          </div>

          {/* Meal plan upload */}
          <div>
            <ExamUploader
              exams={pendingMealPlans || []}
              onChange={setPendingMealPlans}
              compact
              label="Plano alimentar"
              emptyMessage="Nenhum plano. Anexe o plano atual (importar de outro app ou plano vigente)."
              idPrefix="plan"
              buttonColor="emerald"
            />
          </div>
        </div>
      )}

      {/* Patient Context Display (when recording/paused) */}
      {(patientGoals?.length > 0 || patientTraining?.length > 0 || isFirstConsultation !== null) && status !== AppStatus.IDLE && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {isFirstConsultation !== null && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isFirstConsultation ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isFirstConsultation ? 'Primeira Consulta' : 'Retorno'}
            </span>
          )}
          {patientGoals?.length > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {patientGoals.map((g: PatientGoal) => g === 'outro' ? patientGoalCustom : GOAL_LABELS[g]).join(' + ')}
            </span>
          )}
          {patientTraining?.length > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {formatTraining(patientTraining)}
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-xl h-[320px] sm:h-[380px] md:h-[450px] flex flex-col relative overflow-hidden">
        <div
          ref={transcriptContainerRef}
          className="flex-1 p-4 sm:p-6 md:p-12 overflow-y-auto scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
        >
          {transcript || interim ? (
            <p className="text-lg sm:text-xl md:text-2xl font-medium text-ink-primary leading-relaxed">{transcript}<span className="text-brand-700 animate-pulse">{interim}</span></p>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
              <Mic size={40} />
              <p className="font-bold text-center px-4 text-base sm:text-lg md:text-xl">Inicie a consulta para transcrever a voz em tempo real.</p>
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 bg-slate-50/50 border-t border-slate-100 flex justify-center gap-3 md:gap-4">
          {status === AppStatus.IDLE && audioUploadState.kind === 'idle' && (
            transcript.trim() ? (
              // We already have a transcript (uploaded audio or manual edit) —
              // hide the "start" controls and let the nutri move on to analysis.
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                <button
                  onClick={handleFinalize}
                  className="flex items-center gap-2 md:gap-3 bg-blue-600 text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <CheckCircle size={20} /> Analisar Consulta
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Limpar a transcrição atual e começar de novo?')) {
                      setTranscript('');
                    }
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2"
                >
                  Limpar e começar de novo
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                <button onClick={startRecording} className="flex items-center gap-2 md:gap-3 bg-blue-600 text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                  <Mic size={20} /> Registrar Consulta
                </button>
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="flex items-center gap-2 md:gap-3 bg-surface border border-line text-ink-primary px-5 py-3 md:px-7 md:py-4 rounded-md font-semibold text-md hover:bg-subtle hover:border-brand-700 transition-colors active:scale-[0.98]"
                  title="Para consultas online: envie a gravação (vídeo do Zoom/Meet ou áudio do gravador). Até 800MB / 2:30h."
                >
                  <Upload size={18} strokeWidth={2.25} className="text-brand-700" /> Carregar gravação
                </button>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,video/*,.m4a,.mp3,.mp4,.mov,.wav,.webm,.aac,.flac,.ogg,.mkv"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) handleAudioFileSelected(f);
                    // Reset so the same file can be re-selected after a failure.
                    e.target.value = '';
                  }}
                />
              </div>
            )
          )}

          {(audioUploadState.kind === 'uploading' || audioUploadState.kind === 'transcribing') && (
            <div className="flex items-center gap-3 px-5 py-3 bg-subtle border border-line rounded-md min-w-[280px] max-w-md">
              <Loader2 size={18} className="animate-spin text-brand-700 flex-shrink-0" strokeWidth={2.25} />
              <div className="flex-1 min-w-0">
                {audioUploadState.kind === 'uploading' ? (
                  <>
                    <div className="text-sm font-semibold text-ink-primary truncate">Enviando gravação · {audioUploadState.progress}%</div>
                    <div className="h-1 bg-line rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-brand-700 transition-all" style={{ width: `${audioUploadState.progress}%` }} />
                    </div>
                    <div className="text-2xs text-ink-tertiary mt-1 truncate">{audioUploadState.fileName}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-ink-primary">Transcrevendo a gravação</div>
                    <div className="text-2xs text-ink-secondary mt-0.5">
                      Estimativa ~{Math.round(audioUploadState.estimateMs / 60_000)} min · Não feche esta aba
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {audioUploadState.kind === 'error' && (
            <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-2 border-red-200 rounded-2xl">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-red-700">{audioUploadState.message}</div>
              </div>
              <button
                onClick={() => setAudioUploadState({ kind: 'idle' })}
                className="text-xs font-bold text-red-700 hover:text-red-900 px-2 py-1 rounded-lg hover:bg-red-100"
              >
                OK
              </button>
            </div>
          )}
          {status === AppStatus.RECORDING && (
            <div className="flex gap-3 md:gap-4">
              <button onClick={pauseRecording} className="flex items-center gap-2 md:gap-3 bg-amber-500 text-white px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-lg shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all">
                <Pause size={20} /> Pausar
              </button>
              <button onClick={handleFinalize} className="flex items-center gap-2 md:gap-3 bg-slate-900 text-white px-5 py-3 md:px-8 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-xl active:scale-95 transition-all">
                <Square size={16} fill="currentColor" /> Finalizar
              </button>
            </div>
          )}
          {status === AppStatus.PAUSED && (
            <div className="flex gap-3 md:gap-4">
              <button onClick={resumeRecording} className="flex items-center gap-2 md:gap-3 bg-green-500 text-white px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-lg shadow-green-200 hover:bg-green-600 active:scale-95 transition-all">
                <Play size={20} fill="currentColor" /> Retomar
              </button>
              <button onClick={handleFinalize} className="flex items-center gap-2 md:gap-3 bg-slate-900 text-white px-5 py-3 md:px-8 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-xl active:scale-95 transition-all">
                <Square size={16} fill="currentColor" /> Finalizar
              </button>
            </div>
          )}
        </div>

        {status === AppStatus.PROCESSING && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <h2 className="text-xl md:text-2xl font-bold text-ink-primary">Analisando consulta</h2>
            <p className="text-ink-secondary mt-2 text-sm text-center px-4">Avaliação clínica e prescrição em andamento</p>
          </div>
        )}
      </div>

      {/* Patient Pre-Consultation Popup */}
      {showNamePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Dados do Paciente</h3>
              <p className="text-slate-400 text-sm mt-1">Preencha rapidamente antes de iniciar</p>
            </div>

            {/* Patient Name */}
            <div className="mb-4 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: Maria Silva Santos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                value={tempName}
                onChange={(e) => { setTempName(e.target.value); setShowPopupSuggestions(true); }}
                onFocus={() => setShowPopupSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPopupSuggestions(false), 150)}
                autoFocus
              />
              {/* Autocomplete suggestions inside popup */}
              {showPopupSuggestions && tempName.trim() && (() => {
                const popupSuggestions = (patients || []).filter((p: any) =>
                  p.name.toLowerCase().includes(tempName.toLowerCase()) &&
                  p.name.toLowerCase() !== tempName.toLowerCase()
                ).slice(0, 5);
                if (popupSuggestions.length === 0) return null;
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                    {popupSuggestions.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 flex items-center gap-2.5 transition-colors"
                        onMouseDown={() => {
                          setTempName(p.name);
                          // Prefill goals/training/isFirst from existing patient
                          if (p.goals?.length) setTempGoals(p.goals);
                          if (p.goalCustom) setTempGoalCustom(p.goalCustom);
                          if (p.trainingRoutine?.length) {
                            setInlineTrainingText(
                              p.trainingRoutine.map((t: any) => `${t.type}: ${t.frequency}`).join(', ')
                            );
                          }
                          // If patient exists, it's not a first consultation anymore
                          if (p.isFirstConsultation === false || events.some((e: any) => e.patientId === p.id && e.type !== 'adjustment')) {
                            setTempIsFirst(false);
                          }
                          // Pre-load existing exams + meal plans so nutri sees them
                          if (p.exams?.length) setPendingExams(p.exams);
                          if (p.mealPlans?.length) setPendingMealPlans(p.mealPlans);
                          // Pre-load anthropometric data
                          if (p.weightKg) setTempWeight(String(p.weightKg));
                          if (p.heightCm) setTempHeight(String(p.heightCm));
                          if (p.birthDate) setTempBirthDate(p.birthDate);
                          if (p.dietaryRestrictions) setTempRestrictions(p.dietaryRestrictions);
                          setShowPopupSuggestions(false);
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 text-sm truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Quick-context chips when popup name matches an existing patient */}
            {(() => {
              const matched = tempName.trim()
                ? (patients || []).find(
                    (p: any) => p.name.toLowerCase() === tempName.trim().toLowerCase()
                  )
                : null;
              const chips = buildPatientQuickChips(matched, events);
              if (chips.length === 0) return null;
              return (
                <div className="-mt-2 mb-4 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                  {chips.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* First Consultation Toggle */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primeira Consulta?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTempIsFirst(true)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    tempIsFirst === true
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setTempIsFirst(false)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    tempIsFirst === false
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Retorno
                </button>
              </div>
            </div>

            {/* Goal Quick Select (optional, max 2) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Objetivo <span className="text-slate-300 font-normal normal-case">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['ganho_muscular', 'perda_gordura', 'manutencao', 'performance', 'forca', 'recuperacao', 'saude_geral'] as PatientGoal[]).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal, true)}
                    disabled={!tempGoals.includes(goal) && tempGoals.length >= 2}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tempGoals.includes(goal)
                        ? 'bg-blue-600 text-white'
                        : tempGoals.length >= 2
                          ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {GOAL_LABELS[goal]}
                  </button>
                ))}
              </div>
            </div>

            {/* Training Routine (Optional) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Rotina de Treino <span className="text-slate-300 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Musculação 3x, Natação 1x"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                value={tempTraining}
                onChange={(e) => setTempTraining(e.target.value)}
              />
            </div>

            {/* Exam upload (optional) */}
            <div className="mb-4">
              <ExamUploader exams={pendingExams} onChange={setPendingExams} compact />
            </div>

            {/* Meal plan upload (optional, useful for migration from other apps) */}
            <div className="mb-4">
              <ExamUploader
                exams={pendingMealPlans}
                onChange={setPendingMealPlans}
                compact
                label="Plano alimentar"
                emptyMessage="Nenhum plano. Anexe o plano atual da paciente (importar de outro app ou plano vigente)."
                idPrefix="plan"
                buttonColor="emerald"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNamePopup(false); setPendingAction(null); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNameSubmit}
                disabled={!tempName.trim()}
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiagnosisView({ result, patientName, eventId, onSaveResult, onBack, preferences, doctorProfile, consultationDate, currentPatient, onSaveMealPlan, onUpdatePatient }: any) {
  const prefs = preferences || { showConduct: true, showAttention: true, showExams: true };
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedRationale, setEditedRationale] = useState('');
  const [editedConduct, setEditedConduct] = useState('');
  const [editedConditions, setEditedConditions] = useState<string[]>([]);
  const [editedExams, setEditedExams] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'condition' | 'exam'; index: number } | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<'exams' | 'conduct' | 'referral' | 'plan' | null>(null);
  // Editable structured meal plan (initialized from result if present)
  const [mealPlan, setMealPlan] = useState<any>(result?.structuredMealPlan || null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planGenError, setPlanGenError] = useState<string | null>(null);
  // Signature of the plan when it was last saved as active — for dedupe
  const [savedPlanSignature, setSavedPlanSignature] = useState<string | null>(null);
  // Per-card collapse state — lets the nutri hide long sections (Racional, Conduta, etc.)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleCollapse = (section: string) => {
    setCollapsedSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };
  const CollapseToggle = ({ section, hoverColor = 'slate' }: { section: string; hoverColor?: string }) => {
    const collapsed = collapsedSections.has(section);
    const hoverClass: Record<string, string> = {
      slate: 'hover:text-slate-700 hover:bg-slate-100',
      emerald: 'hover:text-emerald-600 hover:bg-emerald-100/50',
      sky: 'hover:text-sky-600 hover:bg-sky-100/50',
      amber: 'hover:text-amber-600 hover:bg-amber-100/50',
      blue: 'hover:text-blue-600 hover:bg-blue-50',
    };
    return (
      <button
        onClick={() => toggleCollapse(section)}
        className={`p-1.5 text-slate-400 ${hoverClass[hoverColor] || hoverClass.slate} rounded-lg transition-all`}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
    );
  };

  // Compute objective for the plan title:
  // 1) explicit patient goals/goal, 2) BMI-derived if anthropometry available, 3) null.
  const planObjective = (() => {
    if (!currentPatient) return null;
    const goals = currentPatient.goals as PatientGoal[] | undefined;
    if (goals && goals.length > 0) {
      return goals
        .map((g: PatientGoal) => (g === 'outro' ? currentPatient.goalCustom : GOAL_LABELS[g]))
        .filter(Boolean)
        .join(' + ')
        .toLowerCase();
    }
    if (currentPatient.goal) {
      return currentPatient.goal === 'outro'
        ? (currentPatient.goalCustom || '').toLowerCase()
        : GOAL_LABELS[currentPatient.goal as PatientGoal].toLowerCase();
    }
    const w = Number(currentPatient.weightKg);
    const h = Number(currentPatient.heightCm);
    if (w > 0 && h > 0) {
      const bmi = w / Math.pow(h / 100, 2);
      if (bmi < 18.5) return 'ganho de peso';
      if (bmi < 25) return 'manutenção';
      if (bmi < 30) return 'emagrecimento';
      return 'emagrecimento prioritário';
    }
    return null;
  })();

  // Generate meal plan via API. Bubble manages its own loading/error state and
  // passes freshly-edited anthropometry. Returns the plan (or null) — bubble
  // shows error if it throws.
  const handleGeneratePlan = async (anthropometry?: any): Promise<any> => {
    if (!currentPatient) throw new Error('Paciente não identificado.');

    const anthro: any = anthropometry || {};
    if (!anthropometry) {
      const ageFromBirth = currentPatient.birthDate
        ? Math.floor((Date.now() - new Date(currentPatient.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;
      if (currentPatient.weightKg) anthro.weightKg = currentPatient.weightKg;
      if (currentPatient.heightCm) anthro.heightCm = currentPatient.heightCm;
      if (ageFromBirth) anthro.age = ageFromBirth;
      if (currentPatient.dietaryRestrictions) anthro.dietaryRestrictions = currentPatient.dietaryRestrictions;
    }
    // Body composition is always pulled from the patient record (the bubble
    // doesn't expose these fields directly — they come from the clinical
    // data modal). Lean mass drives protein needs, body fat refines targets.
    if (currentPatient.bodyFatPct) anthro.bodyFatPct = currentPatient.bodyFatPct;
    if (currentPatient.leanMassPct) anthro.leanMassPct = currentPatient.leanMassPct;

    const auth = (await import('firebase/auth')).getAuth();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sessão expirada. Faça login novamente.');

    const baseUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
      ? 'https://echomed-p3tr.onrender.com'
      : 'http://localhost:3001';

    const transcript = `Reaproveitamento da consulta atual para gerar plano alimentar estruturado.

Análise prévia:
- Avaliação: ${result.nutritionalAssessment || ''}
- Racional: ${result.clinicalRationale || ''}
- Conduta atual: ${result.nutritionalConduct || ''}
- Objetivo: ${(currentPatient.goals || []).join(', ') || currentPatient.goal || 'não definido'}
- Treino: ${(currentPatient.trainingRoutine || []).map((t: any) => `${t.type} ${t.frequency}`).join(', ') || 'não informado'}`;

    const resp = await fetch(`${baseUrl}/api/analyze-medical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        transcript,
        tone: doctorProfile?.preferences?.tone || 'humanizado',
        generateMealPlan: true,
        patientAnthropometry: Object.keys(anthro).length > 0 ? anthro : undefined,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Erro ao gerar plano');
    }
    const data = await resp.json();
    if (data.structuredMealPlan && Array.isArray(data.structuredMealPlan.meals)) {
      // Build the per-item macroBreakdown from the generation response and use
      // its sum as macroEstimate. This keeps the displayed totals consistent
      // with the cached breakdown — so the first recalc after an edit only
      // re-estimates the new/changed items instead of redoing the whole plan.
      const generated = data.structuredMealPlan;
      const breakdown: any[] = [];
      let kcal = 0, prot = 0, carb = 0, fat = 0;
      for (const meal of generated.meals) {
        for (const item of meal.items || []) {
          if (!item || !item.food) continue;
          if (typeof item.kcal === 'number') {
            const entry = {
              food: item.food,
              kcal: Math.round(Number(item.kcal) || 0),
              prot_g: Math.round(Number(item.prot_g) || 0),
              carb_g: Math.round(Number(item.carb_g) || 0),
              fat_g: Math.round(Number(item.fat_g) || 0),
            };
            breakdown.push(entry);
            kcal += entry.kcal;
            prot += entry.prot_g;
            carb += entry.carb_g;
            fat += entry.fat_g;
          }
        }
      }
      const finalPlan: any = { ...generated };
      if (breakdown.length > 0) {
        finalPlan.macroBreakdown = breakdown;
        // Override the AI's holistic macroEstimate with the per-item sum so
        // displayed totals match what a recalc would produce.
        finalPlan.macroEstimate = {
          calories: kcal,
          protein: `${prot}g`,
          carbs: `${carb}g`,
          fat: `${fat}g`,
        };
      }
      setMealPlan(finalPlan);
      if (onSaveResult) onSaveResult({ ...result, structuredMealPlan: finalPlan });
      return finalPlan;
    }
    return null;
  };

  const handleSaveMealPlanAsActive = async () => {
    if (!mealPlan || !onSaveMealPlan) return;
    setSavingPlan(true);
    try {
      await onSaveMealPlan(mealPlan);
      setSavedPlanSignature(planSignature(mealPlan));
    } finally {
      setSavingPlan(false);
    }
  };

  const handleRecalculateMacros = async () => {
    if (!mealPlan) return;

    const auth = (await import('firebase/auth')).getAuth();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sessão expirada. Faça login novamente.');

    const baseUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
      ? 'https://echomed-p3tr.onrender.com'
      : 'http://localhost:3001';

    const resp = await fetch(`${baseUrl}/api/recalculate-macros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      // Sending the previous breakdown lets the backend reuse cached per-item
      // macros for unchanged items and only call the LLM for new/changed ones.
      // Anthropometry is intentionally omitted: macros depend on what's on the
      // plate, not on who's eating it.
      body: JSON.stringify({
        mealPlan,
        previousBreakdown: mealPlan.macroBreakdown || [],
      }),
    });
    if (!resp.ok) throw new Error('Erro ao recalcular macros');
    const data = await resp.json();
    if (data.macroEstimate) {
      const updated = {
        ...mealPlan,
        macroEstimate: data.macroEstimate,
        macroBreakdown: data.macroBreakdown || mealPlan.macroBreakdown,
      };
      setMealPlan(updated);
      if (onSaveResult) onSaveResult({ ...result, structuredMealPlan: updated });
    }
  };

  const handleDownload = async (kind: 'exams' | 'conduct' | 'referral' | 'plan') => {
    if (!result) return;
    setDownloadOpen(false);
    setGeneratingPdf(kind);
    try {
      const {
        generateExamRequestPdf,
        generateConductPdf,
        generateMedicalReferralPdf,
        generateMealPlanPdf,
      } = await import('./utils/pdfGenerator');
      const profile = doctorProfile || {};
      // Always pass the latest mealPlan state into the result for the plan PDF
      const resultForPdf = { ...result, structuredMealPlan: mealPlan || result.structuredMealPlan };
      if (kind === 'exams') {
        await generateExamRequestPdf(resultForPdf, patientName, consultationDate, profile);
      } else if (kind === 'conduct') {
        await generateConductPdf(resultForPdf, patientName, consultationDate, profile);
      } else if (kind === 'referral') {
        await generateMedicalReferralPdf(resultForPdf, patientName, consultationDate, profile);
      } else {
        await generateMealPlanPdf(resultForPdf, patientName, consultationDate, profile);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (!result) return null;

  // Support both nutritional and medical field names
  const title = result.nutritionalAssessment || result.diagnosis;
  const rationale = editedRationale || result.clinicalRationale || result.rationale;
  const conduct = editedConduct || result.nutritionalConduct || result.treatment;
  const conditions = editedConditions.length > 0 ? editedConditions : (result.possibleAssociatedConditions || result.possibleDiseases || []);
  const exams = editedExams.length > 0 ? editedExams : (result.recommendedExams || result.exams || []);

  // Parse conduct into sequential steps
  const parseSteps = (text: string): string[] => {
    if (!text) return [];
    const numberedPattern = /\d+\.\s*/;
    if (numberedPattern.test(text)) {
      return text.split(numberedPattern).filter(s => s.trim().length > 0);
    }
    if (text.includes(';')) {
      return text.split(';').map(s => s.trim()).filter(s => s.length > 0);
    }
    const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 10);
    return sentences.length > 1 ? sentences : [text];
  };

  const conductSteps = parseSteps(conduct);

  const getPriorityLabel = (index: number): { label: string; color: string } => {
    if (index === 0) return { label: 'Prioritário', color: 'bg-red-400' };
    if (index === 1) return { label: 'Importante', color: 'bg-amber-400' };
    return { label: 'Complementar', color: 'bg-blue-300' };
  };

  const startEditing = (section: string) => {
    setEditingSection(section);
    if (section === 'rationale') setEditedRationale(rationale);
    if (section === 'conduct') setEditedConduct(conduct);
    if (section === 'conditions') setEditedConditions([...conditions]);
    if (section === 'exams') setEditedExams([...exams]);
  };

  const saveEditing = () => {
    // Build updated result with edited values
    if (onSaveResult) {
      const updatedResult = {
        ...result,
        // Update rationale fields
        clinicalRationale: editedRationale || result.clinicalRationale,
        rationale: editedRationale || result.rationale,
        // Update conduct fields
        nutritionalConduct: editedConduct || result.nutritionalConduct,
        treatment: editedConduct || result.treatment,
        // Update conditions
        possibleAssociatedConditions: editedConditions.length > 0 ? editedConditions : result.possibleAssociatedConditions,
        possibleDiseases: editedConditions.length > 0 ? editedConditions : result.possibleDiseases,
        // Update exams
        recommendedExams: editedExams.length > 0 ? editedExams : result.recommendedExams,
        exams: editedExams.length > 0 ? editedExams : result.exams,
      };
      onSaveResult(updatedResult);
    }
    setEditingSection(null);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditedRationale('');
    setEditedConduct('');
    setEditedConditions([]);
    setEditedExams([]);
  };

  // Delete item from conditions or exams - auto-saves immediately
  const confirmDeleteItem = () => {
    if (!deleteConfirm) return;

    let newConditionsList = conditions;
    let newExamsList = exams;

    if (deleteConfirm.type === 'condition') {
      newConditionsList = conditions.filter((_: string, i: number) => i !== deleteConfirm.index);
      setEditedConditions(newConditionsList);
    } else {
      newExamsList = exams.filter((_: string, i: number) => i !== deleteConfirm.index);
      setEditedExams(newExamsList);
    }

    // Auto-save the deletion immediately
    if (onSaveResult) {
      const updatedResult = {
        ...result,
        possibleAssociatedConditions: newConditionsList,
        possibleDiseases: newConditionsList,
        recommendedExams: newExamsList,
        exams: newExamsList,
      };
      console.log('🗑️ Auto-saving deletion');
      onSaveResult(updatedResult);
    }

    setDeleteConfirm(null);
  };

  // Edit button component
  const EditButton = ({ section }: { section: string }) => (
    <button
      onClick={() => startEditing(section)}
      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-600
                 hover:bg-blue-50 rounded-lg transition-all"
      title="Editar"
    >
      <Pencil size={12} />
    </button>
  );

  // Adherence & behavioral insights
  const adherence: string = (result.adherenceProbability || '').toString().toLowerCase();
  const behavior: string = (result.behavioralProfile || '').toString();
  const adherenceStyle = {
    alta: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'média': 'bg-amber-50 text-amber-800 border-amber-200',
    media: 'bg-amber-50 text-amber-800 border-amber-200',
    baixa: 'bg-rose-50 text-rose-800 border-rose-200',
  }[adherence] || 'bg-slate-50 text-slate-700 border-slate-200';

  // Exam priority (preserved from original)
  const priorityStyle = (index: number): { label: string; dot: string; badge: string } => {
    if (index === 0) return {
      label: 'Alta',
      dot: 'bg-rose-400',
      badge: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    if (index === 1) return {
      label: 'Média',
      dot: 'bg-amber-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-100',
    };
    return {
      label: 'Complementar',
      dot: 'bg-sky-400',
      badge: 'bg-sky-50 text-sky-700 border-sky-100',
    };
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in zoom-in-95 duration-500">
      {/* Top bar: back + download */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Voltar
        </button>
        {/* Download dropdown */}
        <div className="relative">
          <button
            onClick={() => setDownloadOpen((v) => !v)}
            disabled={!!generatingPdf}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            {generatingPdf ? (
              <><Loader2 size={14} className="animate-spin" /> Gerando…</>
            ) : (
              <><FileText size={14} /> Baixar PDF</>
            )}
          </button>
          {downloadOpen && !generatingPdf && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDownloadOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleDownload('exams')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                >
                  <TestTube size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-slate-800">Pedido de Exames</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Solicitação para o laboratório</div>
                  </div>
                </button>
                <button
                  onClick={() => handleDownload('conduct')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                >
                  <ClipboardCheck size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-ink-primary">Direcionamento clínico</div>
                    <div className="text-2xs text-ink-tertiary mt-0.5">Orientações para a paciente</div>
                  </div>
                </button>
                <button
                  onClick={() => handleDownload('referral')}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                >
                  <Stethoscope size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-slate-800">Encaminhamento Médico</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Resumo clínico para o médico</div>
                  </div>
                </button>
                <button
                  onClick={() => handleDownload('plan')}
                  disabled={!mealPlan && !result?.structuredMealPlan}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!mealPlan && !result?.structuredMealPlan ? 'Gere um plano alimentar primeiro' : ''}
                >
                  <Utensils size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-slate-800">Plano Alimentar</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {mealPlan || result?.structuredMealPlan
                        ? 'Refeições com substituições'
                        : 'Gere um plano primeiro'}
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Elegant header */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-black uppercase text-sm tracking-[0.15em]">
            <User size={14} className="text-slate-400" /> <span>{patientName}</span>
          </div>
          {(adherence || behavior) && (
            <div className="flex flex-wrap gap-2">
              {adherence && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${adherenceStyle}`}>
                  <TrendingUp size={11} />
                  Adesão provável: <span className="capitalize">{adherence}</span>
                </span>
              )}
              {behavior && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                  <Brain size={11} />
                  Perfil: <span className="capitalize">{behavior}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Racional Clínico */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-8 shadow-sm group relative">
        <div className={`flex items-center justify-between ${collapsedSections.has('rationale') ? '' : 'mb-4'}`}>
          <h3 className="text-blue-700 font-black uppercase text-[10px] tracking-[0.1em] flex items-center gap-2">
            <Activity size={13} /> Racional Clínico
          </h3>
          <div className="flex items-center gap-0.5">
            {editingSection !== 'rationale' && !collapsedSections.has('rationale') && <EditButton section="rationale" />}
            <CollapseToggle section="rationale" hoverColor="blue" />
          </div>
        </div>
        {!collapsedSections.has('rationale') && (
          editingSection === 'rationale' ? (
            <div className="space-y-3">
              <textarea
                value={editedRationale}
                onChange={(e) => setEditedRationale(e.target.value)}
                className="w-full p-3 md:p-4 border border-line rounded-md text-md text-ink-primary leading-[1.7] resize-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                rows={5}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={cancelEditing} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={saveEditing} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </div>
          ) : (
            <p className="text-md text-ink-primary leading-[1.7] whitespace-pre-line">
              {rationale}
            </p>
          )
        )}
      </div>

      {/* Direcionamento clínico — clinical checklist */}
      {prefs.showConduct && (
        <div className="bg-surface rounded-lg border border-line p-5 md:p-6 shadow-xs group relative">
          <div className={`flex items-center justify-between ${collapsedSections.has('conduct') ? '' : 'mb-5'}`}>
            <h3 className="text-ink-secondary font-semibold uppercase text-2xs tracking-[0.1em] flex items-center gap-2">
              <ClipboardCheck size={13} className="text-brand-700" /> Direcionamento clínico
            </h3>
            <div className="flex items-center gap-0.5">
              {editingSection !== 'conduct' && !collapsedSections.has('conduct') && (
                <button
                  onClick={() => startEditing('conduct')}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/50 rounded-lg transition-all"
                >
                  <Pencil size={12} />
                </button>
              )}
              <CollapseToggle section="conduct" hoverColor="emerald" />
            </div>
          </div>
          {!collapsedSections.has('conduct') && (
          editingSection === 'conduct' ? (
            <div className="space-y-3">
              <textarea
                value={editedConduct}
                onChange={(e) => setEditedConduct(e.target.value)}
                className="w-full p-3 md:p-4 bg-surface border border-line rounded-md text-md text-ink-primary leading-[1.7] resize-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                rows={6}
                placeholder="Separe os passos por ponto e vírgula (;) ou numere (1. 2. 3.)"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={cancelEditing} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={saveEditing} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Salvar</button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {conductSteps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center mt-0.5 shadow-sm">
                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                  </div>
                  <p className="text-md leading-[1.65] text-ink-primary flex-1">
                    {step.trim().replace(/\.$/, '')}
                  </p>
                </li>
              ))}
            </ul>
          )
          )}
        </div>
      )}

      {/* Structured Meal Plan — only renders when there's a plan to show.
          Generation happens via the floating MealPlanBubble (see App-level render). */}
      {mealPlan && (
        <MealPlanCard
          plan={mealPlan}
          onChange={(next: any) => {
            setMealPlan(next);
            if (onSaveResult) onSaveResult({ ...result, structuredMealPlan: next });
          }}
          onSavePlan={onSaveMealPlan ? handleSaveMealPlanAsActive : undefined}
          saving={savingPlan}
          onRecalculateMacros={currentPatient ? handleRecalculateMacros : undefined}
          objective={planObjective}
          savedSignature={savedPlanSignature}
        />
      )}

      {/* Bottom grid: Exams + Attention */}
      <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
        {/* Exames Sugeridos — elegant priority cards */}
        {prefs.showExams && (exams.length > 0 || editingSection === 'exams') && (
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm group relative">
            <div className={`flex items-center justify-between ${collapsedSections.has('exams') ? '' : 'mb-4'}`}>
              <h3 className="font-black text-[10px] uppercase tracking-[0.1em] text-sky-700 flex items-center gap-2">
                <TestTube size={13} /> Exames Sugeridos
              </h3>
              <div className="flex items-center gap-0.5">
                {editingSection !== 'exams' && !collapsedSections.has('exams') && <EditButton section="exams" />}
                <CollapseToggle section="exams" hoverColor="sky" />
              </div>
            </div>
            {!collapsedSections.has('exams') && (
            editingSection === 'exams' ? (
              <div className="space-y-2">
                {editedExams.map((e, i) => (
                  <input
                    key={i}
                    value={e}
                    onChange={(ev) => {
                      const updated = [...editedExams];
                      updated[i] = ev.target.value;
                      setEditedExams(updated);
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                ))}
                <div className="flex gap-2 justify-end mt-3">
                  <button onClick={cancelEditing} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={saveEditing} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((e: string, i: number) => {
                  const p = priorityStyle(i);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group/item">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-primary text-sm leading-snug">{e}</p>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${p.badge}`}>
                          {p.label}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'exam', index: i })}
                        className="opacity-0 group-hover/item:opacity-60 hover:!opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
            )}
          </div>
        )}

        {/* Pontos de Atenção — clinical tags */}
        {prefs.showAttention && (conditions.length > 0 || editingSection === 'conditions') && (
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm group relative">
            <div className={`flex items-center justify-between ${collapsedSections.has('conditions') ? '' : 'mb-4'}`}>
              <h3 className="font-black text-[10px] uppercase tracking-[0.1em] text-amber-700 flex items-center gap-2">
                <AlertTriangle size={13} /> Pontos de Atenção
              </h3>
              <div className="flex items-center gap-0.5">
                {editingSection !== 'conditions' && !collapsedSections.has('conditions') && <EditButton section="conditions" />}
                <CollapseToggle section="conditions" hoverColor="amber" />
              </div>
            </div>
            {!collapsedSections.has('conditions') && (
            editingSection === 'conditions' ? (
              <div className="space-y-2">
                {editedConditions.map((c, i) => (
                  <input
                    key={i}
                    value={c}
                    onChange={(e) => {
                      const updated = [...editedConditions];
                      updated[i] = e.target.value;
                      setEditedConditions(updated);
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                ))}
                <div className="flex gap-2 justify-end mt-3">
                  <button onClick={cancelEditing} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={saveEditing} className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">Salvar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {conditions.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-amber-50/60 rounded-xl border border-amber-100 group/item">
                    <div className="flex-shrink-0 w-1 self-stretch bg-amber-400 rounded-full" />
                    <p className="font-medium text-slate-700 text-[13px] leading-snug flex-1">{d}</p>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'condition', index: i })}
                      className="opacity-0 group-hover/item:opacity-60 hover:!opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )
            )}
          </div>
        )}
      </div>

      {/* Ethical Disclaimer */}
      <div className="flex items-start gap-2 pt-3">
        <Info size={11} className="text-slate-300 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Análise gerada por inteligência artificial como suporte à decisão clínica.
          O profissional de saúde é responsável pela validação e conduta final.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Confirmar exclusão</h3>
              <p className="text-slate-500 text-sm mt-2">
                Tem certeza que quer deletar este {deleteConfirm.type === 'condition' ? 'item de atenção' : 'exame'}? Não é possível recuperar depois.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteItem}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating meal plan bubble (data + generate) */}
      {currentPatient && (
        <MealPlanBubble
          patient={currentPatient}
          initialPlan={mealPlan}
          onUpdatePatient={onUpdatePatient || (() => {})}
          onGeneratePlan={handleGeneratePlan}
        />
      )}
    </div>
  );
}