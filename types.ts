
export interface BloodMarker {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  minRef: number;
  maxRef: number;
  category: string;
  description: string;
  displayMin: number; // For graph axis scaling visual
  displayMax: number; // For graph axis scaling visual
}

export interface Measurement {
  id: string;
  markerId: string;
  value: number;
  date: string;
  note?: string; // optional measurement context
}

export interface MarkerNote {
  id: string;
  markerId: string;
  note: string;
  date: string; // created_at or local timestamp
}

export type HealthStatus = 'low' | 'normal' | 'high';

/**
 * Fokusområden / organ-system (biohacking “attention map”)
 */
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

export interface MarkerGoal {
  markerId: string;
  targetMin?: number;
  targetMax?: number;
  targetDate?: string; // YYYY-MM-DD (optional)
  plan?: string; // protocol / hypothesis / plan
  note?: string; // user notes on the goal
  createdAt?: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface MarkerHistory extends BloodMarker {
  measurements: Measurement[];
  notes: MarkerNote[];
  latestMeasurement: Measurement | undefined;
  status: HealthStatus;

  focusAreas: FocusAreaId[]; // computed client-side
  goal?: MarkerGoal | null; // stored locally per user
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
