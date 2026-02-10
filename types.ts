
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
  measurementId: string;
  task: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerHistory extends BloodMarker {
  measurements: Measurement[];
  notes: MarkerNote[];
  latestMeasurement: Measurement | undefined;
  status: HealthStatus;
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
