
export interface Student {
  id: string;
  name: string;
  className: string;
  subject: string;
  uasaGrade: string; // A, B, C, D, E, F
  pbdTP: number; // 1-6
  marks?: number | null;
}

export interface AnalysisResult {
  student: Student;
  uasaNumeric: number;
  gap: number; // Absolute difference
  gapDirection: 'positive' | 'negative' | 'neutral'; // PBD > UASA, PBD < UASA, Equal
  severity: 'none' | 'warning' | 'critical' | 'extreme'; // none, warning (1), critical (2), extreme (3+)
}

export interface FilterState {
  search: string;
  className: string;
  subject: string;
  severity: 'all' | 'warning' | 'critical' | 'extreme';
  minGap: number;
  tpRange?: [number, number]; // New: [Min, Max] e.g., [1, 2] for weak students
}

export const SUBJECTS = ['Bahasa Melayu', 'Bahasa Inggeris', 'Bahasa Cina'];

// Maps specific string grades to numeric value (A=6, F=1)
export const GRADE_MAP: Record<string, number> = {
  'A': 6,
  'B': 5,
  'C': 4,
  'D': 3,
  'E': 2,
  'F': 1
};

export const NUMERIC_TO_GRADE: Record<number, string> = {
  6: 'A',
  5: 'B',
  4: 'C',
  3: 'D',
  2: 'E',
  1: 'F'
};
