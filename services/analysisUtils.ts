import { Student, AnalysisResult, GRADE_MAP } from '../types';

export const calculateGap = (student: Student): AnalysisResult => {
  const uasaNumeric = GRADE_MAP[student.uasaGrade.toUpperCase()] || 0;
  const pbdTP = student.pbdTP || 0;
  
  if (uasaNumeric === 0 || pbdTP === 0) {
    return {
        student,
        uasaNumeric,
        gap: 0,
        gapDirection: 'neutral',
        severity: 'none'
    };
  }

  const gap = Math.abs(pbdTP - uasaNumeric);
  
  let severity: 'none' | 'warning' | 'critical' = 'none';
  if (gap >= 2) severity = 'critical';
  else if (gap === 1) severity = 'warning';

  let gapDirection: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (pbdTP > uasaNumeric) gapDirection = 'positive'; 
  else if (pbdTP < uasaNumeric) gapDirection = 'negative'; 

  return {
    student,
    uasaNumeric,
    gap,
    gapDirection,
    severity
  };
};

const extractNumber = (val: string): number => {
  if (!val) return 0;
  const match = val.toString().match(/\d+/); 
  return match ? parseInt(match[0], 10) : 0;
};

const splitCSVLine = (line: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

const standardizeSubject = (input: string): string => {
    const norm = input.trim().toLowerCase();
    if (norm.includes('bahasa melayu') || norm === 'bm') return 'Bahasa Melayu';
    if (norm.includes('bahasa inggeris') || norm === 'bi') return 'Bahasa Inggeris';
    if (norm.includes('bahasa cina') || norm === 'bc') return 'Bahasa Cina';
    return input.charAt(0).toUpperCase() + input.slice(1);
}

// Helper: Extract Form (Tingkatan) from Class Name
// e.g., "1 Anggerik" -> "1", "4 Sains" -> "4", "Peralihan" -> "Peralihan"
export const getFormFromClass = (className: string): string => {
  const match = className.match(/^\d+/);
  return match ? match[0] : 'Lain-lain';
};

// AGGRESSIVE NORMALIZATION
export const normalizeString = (str: string): string => {
    if (!str) return "";
    return str.toLowerCase()
              .replace(/[^a-z0-9]/g, ' ') 
              .trim()
              .replace(/\s+/g, ' ');
};

// Levenshtein Distance for Fuzzy Matching
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export interface DuplicatePair {
  original: Student;
  match: Student;
  similarity: number; // 0 to 1
  reason: string;
}

// Find fuzzy duplicates based on Levenshtein distance
export const findSimilarStudents = (students: Student[]): DuplicatePair[] => {
  const pairs: DuplicatePair[] = [];
  const processed = new Set<string>();

  // Group by Class and Subject first to reduce complexity
  const groups: Record<string, Student[]> = {};
  students.forEach(s => {
    const key = `${normalizeString(s.className)}|${normalizeString(s.subject)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  Object.values(groups).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const s1 = group[i];
        const s2 = group[j];
        
        // Skip if exact ID match (shouldn't happen) or already processed pair
        const pairKey = [s1.id, s2.id].sort().join('-');
        if (processed.has(pairKey)) continue;

        const n1 = normalizeString(s1.name);
        const n2 = normalizeString(s2.name);

        // 1. Exact Normalization Match (handled by dedup, but catch here too)
        if (n1 === n2) {
           pairs.push({ original: s1, match: s2, similarity: 1.0, reason: 'Nama sama persis (setelah dibersihkan)' });
           processed.add(pairKey);
           continue;
        }

        // 2. Fuzzy Match
        // Calculate similarity
        const distance = levenshteinDistance(n1, n2);
        const maxLength = Math.max(n1.length, n2.length);
        const similarity = 1 - (distance / maxLength);

        // Threshold: 80% similar OR distance <= 2 edits for short names
        if (similarity > 0.8 || (distance <= 2 && maxLength > 5)) {
           pairs.push({ original: s1, match: s2, similarity, reason: `Hampir serupa (${Math.round(similarity * 100)}%)` });
           processed.add(pairKey);
        }
      }
    }
  });

  return pairs.sort((a, b) => b.similarity - a.similarity);
};

export const parseCSV = (csvText: string): Student[] => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0].toLowerCase());
  const students: Student[] = [];

  const subjectConfigs = [
    { key: 'bm', name: 'Bahasa Melayu', keywords: ['bm', 'bahasa melayu'] },
    { key: 'bi', name: 'Bahasa Inggeris', keywords: ['bi', 'bahasa inggeris'] },
    { key: 'bc', name: 'Bahasa Cina', keywords: ['bc', 'bahasa cina'] }
  ];

  const findColIndex = (typeKeywords: string[], subjectKeywords: string[]) => {
    return headers.findIndex(h => 
      typeKeywords.some(tk => h.includes(tk)) && 
      subjectKeywords.some(sk => h.includes(sk))
    );
  };

  const isWideFormat = headers.some(h => 
    subjectConfigs.some(c => c.keywords.some(k => h.includes(k)))
  );

  const nameIndex = headers.findIndex(h => h.includes('nama'));
  const classIndex = headers.findIndex(h => h.includes('kelas'));

  for (let i = 1; i < lines.length; i++) {
    const currentLine = splitCSVLine(lines[i]);
    if (currentLine.length < 2) continue;

    const baseName = nameIndex > -1 ? currentLine[nameIndex] : '';
    const baseClass = classIndex > -1 ? currentLine[classIndex] : '';

    if (!baseName) continue;
    
    // Clean name for display
    const cleanName = baseName.toUpperCase().trim().replace(/\s+/g, ' ');

    if (isWideFormat) {
      subjectConfigs.forEach(subj => {
        const uasaIdx = findColIndex(['gred', 'uasa'], subj.keywords);
        const marksIdx = findColIndex(['markah'], subj.keywords);
        const tpIdx = findColIndex(['tp', 'pbd', 'tahap', 'band'], subj.keywords);

        const uasaVal = uasaIdx > -1 ? currentLine[uasaIdx] : '';
        const marksVal = marksIdx > -1 ? currentLine[marksIdx] : '';
        const tpRaw = tpIdx > -1 ? currentLine[tpIdx] : '';
        const tpVal = extractNumber(tpRaw);

        if (uasaVal || marksVal || tpVal > 0) {
          const student: Student = {
            id: crypto.randomUUID(),
            name: cleanName, 
            className: baseClass ? baseClass.toUpperCase().trim() : 'N/A',
            subject: subj.name,
            uasaGrade: uasaVal ? uasaVal.toUpperCase().trim() : '',
            pbdTP: tpVal,
            marks: marksVal ? parseFloat(marksVal) : null
          };
          students.push(student);
        }
      });

    } else {
      const student: any = { 
        id: crypto.randomUUID(), 
        subject: 'Bahasa Melayu',
        uasaGrade: '',
        pbdTP: 0,
        marks: null
      };

      headers.forEach((header, index) => {
        const value = currentLine[index];
        if (!value) return;

        if (header.includes('nama')) student.name = value.toUpperCase().trim().replace(/\s+/g, ' ');
        else if (header.includes('kelas')) student.className = value.toUpperCase().trim();
        else if (header.includes('subjek') || header.includes('mata')) student.subject = standardizeSubject(value);
        else if (header.includes('uasa') || header.includes('gred')) student.uasaGrade = value.toUpperCase().trim();
        else if (header.includes('pbd') || header.includes('tp')) student.pbdTP = extractNumber(value);
        else if (header.includes('markah')) student.marks = parseFloat(value);
      });

      if (student.name && student.className) {
        students.push(student as Student);
      }
    }
  }

  return students;
};

export const mergeStudents = (current: Student[], incoming: Student[]): Student[] => {
    const map = new Map<string, Student>();
    const getKey = (s: Student) => `${normalizeString(s.name)}|${normalizeString(s.className)}|${normalizeString(s.subject)}`;

    current.forEach(s => map.set(getKey(s), s));

    incoming.forEach(inc => {
        const key = getKey(inc);
        const existing = map.get(key);

        if (existing) {
            map.set(key, {
                ...existing,
                marks: (typeof inc.marks === 'number') ? inc.marks : existing.marks,
                uasaGrade: (inc.uasaGrade && inc.uasaGrade.trim() !== '') ? inc.uasaGrade : existing.uasaGrade,
                pbdTP: (inc.pbdTP && inc.pbdTP > 0) ? inc.pbdTP : existing.pbdTP
            });
        } else {
            map.set(key, inc);
        }
    });

    return Array.from(map.values());
};

export const deduplicateStudents = (students: Student[]): { cleanedList: Student[], duplicatesFound: number, idsToDelete: string[] } => {
    const map = new Map<string, Student>();
    const idsToDelete: string[] = [];
    let duplicatesFound = 0;

    const getKey = (s: Student) => `${normalizeString(s.name)}|${normalizeString(s.className)}|${normalizeString(s.subject)}`;

    students.forEach(student => {
        const key = getKey(student);
        const existing = map.get(key);

        if (existing) {
            duplicatesFound++;
            idsToDelete.push(student.id);

            const merged: Student = {
                ...existing, 
                name: student.name.length > existing.name.length ? student.name : existing.name,
                marks: (typeof existing.marks === 'number') ? existing.marks : student.marks,
                uasaGrade: (existing.uasaGrade && existing.uasaGrade.trim() !== '') ? existing.uasaGrade : student.uasaGrade,
                pbdTP: (existing.pbdTP && existing.pbdTP > 0) ? existing.pbdTP : student.pbdTP
            };

            map.set(key, merged);
        } else {
            map.set(key, student);
        }
    });

    return {
        cleanedList: Array.from(map.values()),
        duplicatesFound,
        idsToDelete
    };
};

export const exportToCSV = (results: AnalysisResult[]): void => {
  const headers = ['Nama Murid', 'Kelas', 'Subjek', 'Markah', 'Gred UASA', 'TP PBD', 'Jurang (Gap)', 'Status'];
  const rows = results.map(r => [
    `"${r.student.name}"`,
    `"${r.student.className}"`,
    `"${r.student.subject}"`,
    r.student.marks !== null ? r.student.marks : '',
    r.student.uasaGrade,
    r.student.pbdTP || '',
    r.gap,
    r.severity === 'critical' ? 'Kritikal' : r.severity === 'warning' ? 'Amaran' : 'Baik'
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  triggerDownload(csvContent, `analisis_data_murid_${new Date().toISOString().split('T')[0]}.csv`);
};

export const downloadTemplate = (type: 'all' | 'uasa' | 'pbd' = 'all'): void => {
  let headers: string[] = [];
  let rows: string[] = [];

  if (type === 'uasa') {
    headers = ['Nama Murid', 'Kelas', 'Markah BM', 'Gred BM', 'Markah BI', 'Gred BI', 'Markah BC', 'Gred BC'];
    rows = [
        'Ali Bin Abu,5 Merah,85,A,60,B,40,D',
        'Siti Aminah,5 Biru,70,B,80,A,55,C'
    ];
    triggerDownload([headers.join(','), ...rows].join('\n'), 'template_uasa_markah.csv');
  } else if (type === 'pbd') {
    headers = ['Nama Murid', 'Kelas', 'TP BM', 'TP BI', 'TP BC'];
    rows = [
        'Ali Bin Abu,5 Merah,6,4,3',
        'Siti Aminah,5 Biru,5,5,4'
    ];
    triggerDownload([headers.join(','), ...rows].join('\n'), 'template_pbd.csv');
  } else {
    headers = ['Nama Murid', 'Kelas', 'Subjek', 'Markah', 'Gred UASA', 'TP PBD'];
    rows = [
        'Ali Bin Abu,5 Merah,Bahasa Melayu,85,A,6',
        'Ali Bin Abu,5 Merah,Bahasa Inggeris,70,B,4'
    ];
    triggerDownload([headers.join(','), ...rows].join('\n'), 'template_basic.csv');
  }
};

const triggerDownload = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};