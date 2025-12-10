import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Download, 
  Search, 
  Filter, 
  BarChart3, 
  School,
  Database,
  RefreshCw,
  Trash2,
  FileText,
  ChevronDown,
  Loader2,
  AlertTriangle,
  X,
  FileWarning,
  Wand2,
  GitMerge,
  ArrowRight,
  CheckCircle2,
  Settings2,
  Info
} from 'lucide-react';
import { Student, AnalysisResult, FilterState, SUBJECTS } from './types';
import { parseCSV, calculateGap, exportToCSV, downloadTemplate, mergeStudents, normalizeString, findSimilarStudents, DuplicatePair } from './services/analysisUtils';
import { fetchStudents, saveStudents, updateStudent, deleteStudent, getStorageMode, clearData } from './services/firebaseService';
import { StudentTable } from './components/StudentTable';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true); // Initial load
  const [isProcessing, setIsProcessing] = useState(false); // Action processing
  const [storageMode, setStorageMode] = useState<string>('Loading...');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // NEW: State for Duplicate Resolution Tool
  const [showDuplicateTool, setShowDuplicateTool] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<DuplicatePair[]>([]);

  // NEW: State for Reference Modal
  const [showReference, setShowReference] = useState(false);
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    className: '',
    subject: 'all',
    severity: 'all',
    minGap: 0
  });

  // Toggle for Data Check Mode
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadData();
    setStorageMode(getStorageMode());
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = parseCSV(text);
        
        if (parsedData.length > 0) {
          const mergedList = mergeStudents(students, parsedData);
          setStudents(mergedList);
          await saveStudents(mergedList);
          alert(`Berjaya memproses ${parsedData.length} baris data. Data telah digabungkan.`);
        } else {
          alert('Format fail CSV tidak sah atau tiada data.');
        }
      } catch (error) {
        console.error(error);
        alert('Ralat semasa memproses fail.');
      } finally {
        setIsProcessing(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleStudentUpdate = async (updatedStudent: Student) => {
    const duplicateStudent = students.find(s => 
      s.id !== updatedStudent.id && 
      normalizeString(s.name) === normalizeString(updatedStudent.name) && 
      normalizeString(s.className) === normalizeString(updatedStudent.className) &&
      normalizeString(s.subject) === normalizeString(updatedStudent.subject)
    );

    if (duplicateStudent) {
      const confirmMerge = window.confirm(
        `Nama "${updatedStudent.name}" (atau yang serupa) sudah wujud dalam kelas ini. \nAdakah anda mahu menggabungkan data murid ini?`
      );

      if (confirmMerge) {
        setIsProcessing(true);
        try {
          const mergedStudent: Student = {
            ...duplicateStudent, 
            name: updatedStudent.name,
            marks: (typeof updatedStudent.marks === 'number') ? updatedStudent.marks : duplicateStudent.marks,
            uasaGrade: (updatedStudent.uasaGrade && updatedStudent.uasaGrade.trim() !== '') ? updatedStudent.uasaGrade : duplicateStudent.uasaGrade,
            pbdTP: (updatedStudent.pbdTP && updatedStudent.pbdTP > 0) ? updatedStudent.pbdTP : duplicateStudent.pbdTP
          };

          const newList = students
            .filter(s => s.id !== updatedStudent.id) 
            .map(s => s.id === duplicateStudent.id ? mergedStudent : s); 

          setStudents(newList);
          await updateStudent(mergedStudent); 
          await deleteStudent(updatedStudent.id); 
          alert("Data berjaya digabungkan! TP dan Gred telah disatukan.");
        } catch (error) {
          console.error("Gagal menggabungkan data:", error);
          alert("Gagal menggabungkan data.");
        } finally {
          setIsProcessing(false);
        }
        return; 
      }
    }

    const updatedList = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(updatedList);
    await updateStudent(updatedStudent);
  };

  const handleStudentDelete = async (id: string) => {
      if (window.confirm("Adakah anda pasti mahu memadam rekod murid ini?")) {
          setIsProcessing(true);
          try {
              await deleteStudent(id);
              setStudents(prev => prev.filter(s => s.id !== id));
          } catch (error) {
              console.error("Gagal memadam:", error);
              alert("Gagal memadam rekod.");
          } finally {
              setIsProcessing(false);
          }
      }
  };
  
  const confirmDeleteData = async () => {
      setShowDeleteModal(false);
      setIsProcessing(true);
      try {
          await clearData();
          setStudents([]);
          await loadData();
      } catch (error) {
          console.error("Ralat memadam data:", error);
          alert("Gagal memadam data sepenuhnya.");
      } finally {
          setIsProcessing(false);
      }
  }

  const openDuplicateTool = () => {
      setIsProcessing(true);
      setTimeout(() => {
          const duplicates = findSimilarStudents(students);
          setPotentialDuplicates(duplicates);
          setShowDuplicateTool(true);
          setIsProcessing(false);
      }, 100);
  };

  const resolveDuplicate = async (keep: Student, discard: Student) => {
      setIsProcessing(true);
      try {
          const mergedStudent: Student = {
              ...keep,
              marks: (typeof keep.marks === 'number') ? keep.marks : discard.marks,
              uasaGrade: (keep.uasaGrade && keep.uasaGrade.trim() !== '') ? keep.uasaGrade : discard.uasaGrade,
              pbdTP: (keep.pbdTP && keep.pbdTP > 0) ? keep.pbdTP : discard.pbdTP
          };

          const newList = students
              .filter(s => s.id !== discard.id) 
              .map(s => s.id === keep.id ? mergedStudent : s); 
          
          setStudents(newList);
          await updateStudent(mergedStudent);
          await deleteStudent(discard.id);

          setPotentialDuplicates(prev => prev.filter(p => 
              (p.original.id !== keep.id && p.original.id !== discard.id) &&
              (p.match.id !== keep.id && p.match.id !== discard.id)
          ));

      } catch (error) {
          console.error("Error merging:", error);
          alert("Gagal menggabungkan data.");
      } finally {
          setIsProcessing(false);
      }
  };

  const ignoreDuplicate = (pairIndex: number) => {
      setPotentialDuplicates(prev => prev.filter((_, idx) => idx !== pairIndex));
  };

  const analysisData: AnalysisResult[] = useMemo(() => {
    return students.map(calculateGap);
  }, [students]);

  const incompleteCount = useMemo(() => {
    return students.filter(s => {
        const hasUASA = s.uasaGrade && s.uasaGrade.trim() !== '';
        const hasTP = s.pbdTP && s.pbdTP > 0;
        return (hasUASA && !hasTP) || (!hasUASA && hasTP);
    }).length;
  }, [students]);

  const filteredData = useMemo(() => {
    const data = analysisData.filter(item => {
      if (showIncompleteOnly) {
         const hasUASA = item.student.uasaGrade && item.student.uasaGrade.trim() !== '';
         const hasTP = item.student.pbdTP && item.student.pbdTP > 0;
         const isIncomplete = (hasUASA && !hasTP) || (!hasUASA && hasTP);
         if (!isIncomplete) return false;
      }

      const matchesSearch = item.student.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesClass = filters.className ? item.student.className === filters.className : true;
      const matchesSubject = filters.subject === 'all' ? true : item.student.subject === filters.subject;
      const matchesSeverity = filters.severity === 'all' ? true : item.severity === filters.severity;
      const matchesGap = item.gap >= filters.minGap;

      return matchesSearch && matchesClass && matchesSubject && matchesSeverity && matchesGap;
    });

    return data.sort((a, b) => {
        const classCompare = a.student.className.localeCompare(b.student.className);
        if (classCompare !== 0) return classCompare;
        return a.student.name.localeCompare(b.student.name);
    });
  }, [analysisData, filters, showIncompleteOnly]);

  const stats = useMemo(() => {
    const data = filteredData; 
    return {
        total: data.length,
        critical: data.filter(s => s.severity === 'critical').length,
        warning: data.filter(s => s.severity === 'warning').length,
        averageTP: data.length > 0 ? (data.reduce((acc, curr) => acc + (curr.student.pbdTP || 0), 0) / data.length).toFixed(1) : 0
    }
  }, [filteredData]);

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

  return (
    <div className="min-h-screen pb-12 relative font-sans text-slate-800" onClick={() => setTemplateMenuOpen(false)}>
      
      {/* PROCESSING OVERLAY */}
      {(isProcessing || loading) && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-200 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-600 font-medium text-sm">Sedang memproses...</p>
            </div>
        </div>
      )}

      {/* REFERENCE MODAL */}
      {showReference && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowReference(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        Panduan Rujukan
                    </h3>
                    <button onClick={() => setShowReference(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-8">
                    {/* TABLE 1: Grade to TP */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 border-b pb-1">Gred UASA ke TP PBD</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 text-xs">
                                    <th className="pb-2">Gred</th>
                                    <th className="pb-2 text-right">TP Sasaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="py-2 font-medium text-slate-700">A</td><td className="py-2 text-right font-bold text-green-600">TP 6</td></tr>
                                <tr><td className="py-2 font-medium text-slate-700">B</td><td className="py-2 text-right font-bold text-green-500">TP 5</td></tr>
                                <tr><td className="py-2 font-medium text-slate-700">C</td><td className="py-2 text-right font-bold text-blue-500">TP 4</td></tr>
                                <tr><td className="py-2 font-medium text-slate-700">D</td><td className="py-2 text-right font-bold text-blue-400">TP 3</td></tr>
                                <tr><td className="py-2 font-medium text-slate-700">E</td><td className="py-2 text-right font-bold text-amber-500">TP 2</td></tr>
                                <tr><td className="py-2 font-medium text-slate-700">F</td><td className="py-2 text-right font-bold text-red-500">TP 1</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* TABLE 2: Marks to Grade */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 border-b pb-1">Markah ke Gred</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-400 text-xs">
                                    <th className="pb-2">Gred</th>
                                    <th className="pb-2">Julat Markah</th>
                                    <th className="pb-2 text-right">Pencapaian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="py-2 font-bold text-slate-700">A</td>
                                    <td className="py-2 text-slate-600">85 - 100</td>
                                    <td className="py-2 text-right text-slate-500">Cemerlang</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-bold text-slate-700">B</td>
                                    <td className="py-2 text-slate-600">70 - 84</td>
                                    <td className="py-2 text-right text-slate-500">Baik</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-bold text-slate-700">C</td>
                                    <td className="py-2 text-slate-600">55 - 69</td>
                                    <td className="py-2 text-right text-slate-500">Memuaskan</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-bold text-slate-700">D</td>
                                    <td className="py-2 text-slate-600">40 - 54</td>
                                    <td className="py-2 text-right text-slate-500">Sederhana</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-bold text-slate-700">E</td>
                                    <td className="py-2 text-slate-600">20 - 39</td>
                                    <td className="py-2 text-right text-slate-500">Lemah</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-bold text-red-500">F</td>
                                    <td className="py-2 text-slate-600">0 - 19</td>
                                    <td className="py-2 text-right text-red-400">Sangat Lemah</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500 text-center">
                    * Julat markah adalah anggaran umum. Sila rujuk garis panduan SAPS semasa.
                </div>
            </div>
        </div>
      )}

      {/* DUPLICATE TOOL OVERLAY */}
      {showDuplicateTool && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom-5 duration-200">
            <div className="max-w-5xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Wand2 className="w-6 h-6 text-purple-600" />
                            Penyelarasan Nama
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {potentialDuplicates.length} pasangan nama dikesan serupa.
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowDuplicateTool(false)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                        <X className="w-4 h-4" /> Tutup
                    </button>
                </div>

                {potentialDuplicates.length === 0 ? (
                    <div className="bg-white p-16 rounded-xl text-center shadow-sm border border-slate-200">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-80" />
                        <h3 className="text-xl font-bold text-slate-800">Semua Bersih!</h3>
                        <p className="text-slate-500 mt-2">Tiada pertindihan nama dikesan.</p>
                        <button 
                             onClick={() => setShowDuplicateTool(false)}
                             className="mt-8 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
                        >
                            Kembali
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {potentialDuplicates.map((pair, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-center">
                                <div className="md:w-1/4">
                                    <div className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                                        {pair.match.className} &bull; {pair.match.subject}
                                    </div>
                                    <div className="text-sm text-slate-500 mb-2">
                                        {pair.reason}
                                    </div>
                                    <button onClick={() => ignoreDuplicate(idx)} className="text-xs text-slate-400 underline hover:text-slate-600">
                                        Abaikan
                                    </button>
                                </div>
                                <div className="flex-1 flex items-center justify-between gap-4 w-full bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="flex-1 text-center cursor-pointer group" onClick={() => resolveDuplicate(pair.original, pair.match)}>
                                        <div className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition">{pair.original.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex justify-center gap-2">
                                            {pair.original.uasaGrade ? <span className="bg-blue-100 text-blue-700 px-1.5 rounded font-medium">Gred {pair.original.uasaGrade}</span> : <span className="text-red-300">Tiada Gred</span>}
                                            {pair.original.pbdTP ? <span className="bg-green-100 text-green-700 px-1.5 rounded font-medium">TP {pair.original.pbdTP}</span> : <span className="text-red-300">Tiada TP</span>}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300" />
                                    <div className="flex-1 text-center cursor-pointer group" onClick={() => resolveDuplicate(pair.match, pair.original)}>
                                        <div className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition">{pair.match.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex justify-center gap-2">
                                            {pair.match.uasaGrade ? <span className="bg-blue-100 text-blue-700 px-1.5 rounded font-medium">Gred {pair.match.uasaGrade}</span> : <span className="text-red-300">Tiada Gred</span>}
                                            {pair.match.pbdTP ? <span className="bg-green-100 text-green-700 px-1.5 rounded font-medium">TP {pair.match.pbdTP}</span> : <span className="text-red-300">Tiada TP</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 md:w-1/6">
                                    <button onClick={() => resolveDuplicate(pair.original, pair.match)} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded hover:bg-blue-50 font-semibold">Simpan Kiri</button>
                                    <button onClick={() => resolveDuplicate(pair.match, pair.original)} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded hover:bg-blue-50 font-semibold">Simpan Kanan</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100">
                <div className="bg-red-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Padam Semua?</h3>
                <p className="text-slate-500 mb-6 text-sm">
                    Tindakan ini akan memadamkan semua rekod secara kekal.
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm">Batal</button>
                    <button onClick={confirmDeleteData} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 shadow-sm text-sm">Ya, Padam</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Sistem Analisis PBD & UASA</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
             <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${storageMode.includes('Firebase') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs">{storageMode.includes('Firebase') ? 'Online' : 'Offline'}</span>
             </div>
             <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition" title="Muat Semula">
                 <RefreshCw className="w-4 h-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* COMPACT STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Jumlah Data</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Jurang Kritikal</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-amber-500">{stats.warning}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Amaran</p>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.averageTP}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Purata TP</p>
            </div>
        </div>

        {/* CONTROL TOOLBAR */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row justify-between items-center gap-3">
            
            {/* Left: Input & Filters (Grouped closely) */}
            <div className="flex flex-1 w-full xl:w-auto items-center gap-2 p-1 overflow-x-auto no-scrollbar">
                
                {/* Search */}
                <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari murid..." 
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-50 focus:bg-white transition"
                    />
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                {/* Filters */}
                <select 
                    value={filters.className}
                    onChange={(e) => setFilters({...filters, className: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
                >
                    <option value="">Semua Kelas</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                    value={filters.subject}
                    onChange={(e) => setFilters({...filters, subject: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
                >
                    <option value="all">Semua Subjek</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select 
                    value={filters.severity}
                    onChange={(e) => setFilters({...filters, severity: e.target.value as any})}
                    disabled={showIncompleteOnly}
                    className={`px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer ${showIncompleteOnly ? 'opacity-50' : ''}`}
                >
                    <option value="all">Semua Status</option>
                    <option value="critical">Kritikal</option>
                    <option value="warning">Amaran</option>
                </select>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full xl:w-auto justify-end p-1">
                
                {/* File Actions Group */}
                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <label className="p-2 hover:bg-white hover:shadow-sm rounded-md cursor-pointer text-slate-600 transition" title="Import CSV">
                        <Upload className="w-4 h-4" />
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setTemplateMenuOpen(!templateMenuOpen); }}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition relative"
                        title="Templat"
                    >
                        <FileText className="w-4 h-4" />
                        {templateMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-20 py-1 text-left">
                                <button onClick={() => downloadTemplate('all')} className="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Templat Penuh</button>
                                <button onClick={() => downloadTemplate('uasa')} className="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Templat UASA</button>
                                <button onClick={() => downloadTemplate('pbd')} className="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Templat PBD</button>
                            </div>
                        )}
                    </button>
                    <button onClick={() => exportToCSV(filteredData)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition" title="Eksport CSV">
                        <Download className="w-4 h-4" />
                    </button>
                    
                    <button onClick={() => setShowReference(true)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-blue-600 transition" title="Rujukan Gred & Markah">
                        <Info className="w-4 h-4" />
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                {/* Tools Group */}
                <button
                    onClick={openDuplicateTool}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-purple-600 text-sm font-medium transition shadow-sm"
                >
                    <Wand2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Penyelarasan</span>
                </button>

                 <button
                    onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition shadow-sm ${
                        showIncompleteOnly 
                        ? 'bg-orange-50 text-orange-700 border-orange-200' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-orange-600'
                    }`}
                >
                    <FileWarning className="w-4 h-4" />
                    <span className="hidden sm:inline">Semakan</span>
                    {incompleteCount > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{incompleteCount}</span>}
                </button>

                {students.length > 0 && (
                    <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition shadow-sm"
                        title="Padam Semua"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        {/* INCOMPLETE DATA BANNER */}
        {showIncompleteOnly && (
            <div className="bg-orange-50 border border-orange-100 p-3 mb-6 rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-1.5 rounded-full">
                        <FileWarning className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-orange-900 font-bold text-sm">Mod Semakan Data Aktif</h3>
                        <p className="text-xs text-orange-700">Memaparkan {filteredData.length} rekod tidak lengkap.</p>
                    </div>
                </div>
                <button onClick={() => setShowIncompleteOnly(false)} className="p-1 hover:bg-orange-100 rounded text-orange-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* MAIN TABLE */}
        <StudentTable 
            data={filteredData} 
            onUpdate={handleStudentUpdate} 
            onDelete={handleStudentDelete}
        />
        
        <div className="mt-4 flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>{filteredData.length} rekod dipaparkan</span>
            <span>Sistem v1.2</span>
        </div>
      </main>
    </div>
  );
};

export default App;