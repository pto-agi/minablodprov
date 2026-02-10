
import { BloodMarker, HealthStatus, FocusAreaId, Measurement } from './types';

// Robust parsing for numbers that might come as strings with commas (Swedish format)
export const safeFloat = (value: any): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) return 0;
  
  // Convert string, replace comma with dot, remove non-numeric chars except dot/minus
  const s = String(value).replace(',', '.').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export const getStatus = (value: number, min: number, max: number): HealthStatus => {
  // If inputs are bad, default to normal to avoid crashing, 
  // but this shouldn't happen if safeFloat is used upstream.
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 'normal';
  
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'normal';
};

export const isWithinRange = (value: number, min: number, max: number) => value >= min && value <= max;

export const distanceToRange = (value: number, min: number, max: number) => {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const formatNumber = (value: number | undefined | null, maxDecimals: number = 2): string => {
  if (value === undefined || value === null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
};

export const computeDelta = (measurements: Measurement[]) => {
  // Expects latest-first sorting
  if (!measurements || measurements.length < 2) return null;
  const curr = measurements[0];
  const prev = measurements[1];
  const delta = curr.value - prev.value;
  return { delta, prev };
};

export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: HealthStatus) => {
  switch (status) {
    case 'low':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'high':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'normal':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusTextColor = (status: HealthStatus) => {
  switch (status) {
    case 'low':
      return 'text-rose-700';
    case 'high':
      return 'text-rose-700';
    case 'normal':
      return 'text-emerald-700';
    default:
      return 'text-slate-900';
  }
};

export const getStatusText = (status: HealthStatus) => {
  switch (status) {
    case 'low':
      return 'Lågt';
    case 'high':
      return 'Högt';
    case 'normal':
      return 'Inom ref';
  }
};

/**
 * IDs / storage helpers
 */
export const uid = () => {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const storageGetJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const storageSetJson = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export const storageRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/**
 * Tags / hashtags for notes
 */
export const slugifyTag = (tag: string) => {
  const t = tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, ''); // keep unicode letters/numbers
  return t;
};

export const buildTaggedText = (tags: string[], body: string) => {
  const cleanBody = (body ?? '').trim();
  const cleanTags = Array.from(
    new Set(
      (tags ?? [])
        .map(slugifyTag)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );

  const prefix = cleanTags.length ? `${cleanTags.map((t) => `#${t}`).join(' ')}\n` : '';
  return `${prefix}${cleanBody}`.trim();
};

export const parseTaggedText = (text: string) => {
  const raw = (text ?? '').trim();
  if (!raw) return { tags: [] as string[], body: '' };

  const lines = raw.split('\n');
  const first = (lines[0] ?? '').trim();

  const tagMatches = [...first.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => (m[1] ?? '').toString());
  const headerOnly = first.replace(/#([\p{L}\p{N}_-]+)/gu, '').trim() === '';

  const tags = Array.from(new Set(tagMatches.map((t) => t.toLowerCase()))).filter(Boolean);
  const body = headerOnly ? lines.slice(1).join('\n').trim() : raw;

  return { tags, body };
};

/**
 * Fokusområden meta + heuristik
 */
export const FOCUS_AREAS: Array<{
  id: FocusAreaId;
  title: string;
  emoji: string;
  description: string;
}> = [
  {
    id: 'cardiovascular',
    title: 'Hjärta & kärl',
    emoji: '🫀',
    description: 'Lipider, ApoB, blodtrycksrelaterade och riskmarkörer.',
  },
  {
    id: 'metabolic',
    title: 'Metabolt',
    emoji: '⚡️',
    description: 'Glukos, insulin, HbA1c och energimetabolism.',
  },
  {
    id: 'liver',
    title: 'Lever',
    emoji: '🧪',
    description: 'ALT/AST/ALP/GGT, bilirubin och leverrelaterade markörer.',
  },
  {
    id: 'kidney',
    title: 'Njurar',
    emoji: '🫘',
    description: 'Kreatinin, eGFR, cystatin C, urea och urat.',
  },
  {
    id: 'thyroid',
    title: 'Sköldkörtel',
    emoji: '🦋',
    description: 'TSH, fT3, fT4 och autoantikroppar.',
  },
  {
    id: 'inflammation',
    title: 'Inflammation',
    emoji: '🔥',
    description: 'CRP, SR/ESR, cytokiner och inflammationsrelaterat.',
  },
  {
    id: 'blood',
    title: 'Blod',
    emoji: '🩸',
    description: 'Hb, RBC/WBC, trombocyter och blodstatus.',
  },
  {
    id: 'hormones',
    title: 'Hormoner',
    emoji: '🧬',
    description: 'Testosteron, östradiol, cortisol, SHBG, LH/FSH m.fl.',
  },
  {
    id: 'micronutrients',
    title: 'Mikronäring',
    emoji: '🥬',
    description: 'Ferritin/järn, B12, folat, vitamin D, zink, selen m.m.',
  },
  {
    id: 'electrolytes',
    title: 'Elektrolyter',
    emoji: '🧂',
    description: 'Natrium, kalium, klorid, kalcium, fosfat, CO2/bikarbonat.',
  },
  {
    id: 'other',
    title: 'Övrigt',
    emoji: '🧩',
    description: 'Allt som inte faller in i övriga områden.',
  },
];

export const focusAreaMeta = (id: FocusAreaId) => FOCUS_AREAS.find((a) => a.id === id) ?? FOCUS_AREAS[FOCUS_AREAS.length - 1];

const norm = (s: string) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const includesAny = (hay: string, needles: string[]) => needles.some((n) => hay.includes(n));

export const getFocusAreasForMarker = (marker: Pick<BloodMarker, 'name' | 'category'>): FocusAreaId[] => {
  const name = norm(marker.name);
  const cat = norm(marker.category);

  const out: FocusAreaId[] = [];

  // Category hints first (if your DB categories already reflect systems)
  if (includesAny(cat, ['lever'])) out.push('liver');
  if (includesAny(cat, ['njur'])) out.push('kidney');
  if (includesAny(cat, ['skold', 'thyroid'])) out.push('thyroid');
  if (includesAny(cat, ['inflamm', 'immun'])) out.push('inflammation');
  if (includesAny(cat, ['lipid', 'hjarta', 'karl', 'cardio'])) out.push('cardiovascular');
  if (includesAny(cat, ['metabol', 'gluk', 'diabet'])) out.push('metabolic');
  if (includesAny(cat, ['hormon'])) out.push('hormones');
  if (includesAny(cat, ['blod', 'hemat'])) out.push('blood');
  if (includesAny(cat, ['vitamin', 'mineral', 'naring'])) out.push('micronutrients');
  if (includesAny(cat, ['elektro', 'salt'])) out.push('electrolytes');

  // Name heuristics
  if (
    includesAny(name, [
      'apob',
      'apo b',
      'ldl',
      'hdl',
      'triglycer',
      'trigly',
      'cholesterol',
      'kolesterol',
      'non-hdl',
      'lipoprotein',
      'lp(a)',
      'lpa',
    ])
  )
    out.push('cardiovascular');

  if (includesAny(name, ['glukos', 'glucose', 'hba1c', 'insulin', 'c-peptid', 'keton', 'homa']))
    out.push('metabolic');

  if (includesAny(name, ['alt', 'alat', 'ast', 'asat', 'alp', 'ggt', 'bilirubin', 'albumin']))
    out.push('liver');

  if (includesAny(name, ['kreatinin', 'creatinine', 'egfr', 'cystatin', 'urea', 'urat', 'uric']))
    out.push('kidney');

  if (includesAny(name, ['tsh', 'ft3', 'ft4', 't3', 't4', 'tpo', 'trab', 'tgab', 'thyro']))
    out.push('thyroid');

  if (includesAny(name, ['crp', 'hscrp', 'esr', 'sr', 'sedimentation', 'il-6', 'tnf']))
    out.push('inflammation');

  if (
    includesAny(name, [
      'hemoglobin',
      'hb ',
      ' hb',
      'erytro',
      'rbc',
      'wbc',
      'leuko',
      'tromb',
      'platelet',
      'hematokrit',
      'mcv',
      'mch',
      'mchc',
      'rdw',
    ])
  )
    out.push('blood');

  if (
    includesAny(name, [
      'testoster',
      'testosterone',
      'estradi',
      'oest',
      'progester',
      'prolakt',
      'dhea',
      'cortisol',
      'shbg',
      'lh',
      'fsh',
      'igf',
    ])
  )
    out.push('hormones');

  if (
    includesAny(name, [
      'ferritin',
      'jarn',
      'iron',
      'b12',
      'folat',
      'folate',
      'vitamin d',
      '25-oh',
      'zink',
      'zinc',
      'magnesium',
      'selen',
      'iod',
      'vitamin a',
      'vitamin e',
    ])
  )
    out.push('micronutrients');

  if (
    includesAny(name, [
      'natrium',
      'sodium',
      'kalium',
      'potassium',
      'klorid',
      'chloride',
      'calcium',
      'fosfat',
      'phosphate',
      'bikarbonat',
      'co2',
      'bicarbonate',
    ])
  )
    out.push('electrolytes');

  const uniq = Array.from(new Set(out));
  return uniq.length ? uniq : ['other'];
};
