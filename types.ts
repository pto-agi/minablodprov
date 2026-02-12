
export type FocusAreaId =
  | 'cardiovascular'
  | 'metabolic'
  | 'liver'
  | 'kidney'
  | 'thyroid'
  | 'inflammation'
  | 'blood'
  | 'hormones'
  | 'micronutrients'
  | 'electrolytes'
  | 'other';

export interface BloodMarker {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  minRef: number;
  maxRef: number;
  category: string;
  description: string;
  displayMin: number;
  displayMax: number;
  goal?: {
    targetMin: number;
    targetMax: number;
  };
  recommendationLow?: string;
  recommendationHigh?: string;
  riskLow?: string;
  riskHigh?: string;
}

export type HealthStatus = 'low' | 'normal' | 'high';

export interface Measurement {
  id: string;
  markerId: string;
  value: number;
  date: string;
  note?: string | null; // anteckning per mätning (measurements.note)
}

export interface MarkerNote {
  id: string;
  markerId: string;
  note: string;
  date: string; // created_at
}

export interface MeasurementTodo {
  id: string;
  measurementId?: string; // Kept for backward compat, but we prefer markerIds now
  markerIds: string[]; // Array of marker IDs this todo relates to
  task: string;
  done: boolean;
  dueDate?: string | null; // New field for deadline
  linkedJournalId?: string | null; // New: Link to a plan/journal entry
  createdAt: string;
  updatedAt: string;
}

export interface JournalGoal {
  id?: string; // Optional because it might be a temp ID before save
  markerId: string;
  direction: 'higher' | 'lower' | 'range';
  targetValue: number; // For single direction or Min value in range
  targetValueUpper?: number; // For Max value in range
}

export interface JournalPlan {
  id: string;
  title: string;
  content: string; // HTML body
  createdAt: string;
  updatedAt: string;
  startDate?: string; // New
  targetDate?: string; // New (Plan slutförd/Mål)
  isPinned: boolean;
  linkedMarkerIds: string[];
  goals?: JournalGoal[]; // New: Gamified goals
}

export interface MarkerHistory extends BloodMarker {
  measurements: Measurement[];
  notes: MarkerNote[];
  latestMeasurement: Measurement | undefined;
  status: HealthStatus;
  isIgnored?: boolean; // New: If true, user wants to ignore this marker's deviation
  hasActivePlan?: boolean; // New: If true, marker is linked to the currently active plan
}

export interface OptimizationEvent {
  markerId: string;
  markerName: string;
  unit: string;
  badDate: string;
  badValue: number;
  badStatus: HealthStatus;
  goodDate: string;
  goodValue: number;
}

export interface ActionableTodo {
  systemId: string;
  systemName: string;
  systemEmoji: string;
  actionTitle: string; 
  actionDescription: string;
  triggeredBy: string[]; 
}

export interface JournalEntry {
  id: string;
  content: string;
  entryDate: string;
  tags: string[];
  createdAt: string;
}

export interface StatsHistoryEntry {
  id: string;
  log_date: string;
  score: number;
  total_markers: number;
}