
import React, { useMemo, useState, useRef } from 'react';
import { Student, SUBJECTS } from '../types';
import { getFormFromClass } from '../services/analysisUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Filter, Search, ChevronDown, XCircle, Info, X } from 'lucide-react';

interface Props {
  students: Student[];
}

export const UASAAnalysisView: React.FC<Props> = ({ students }) => {
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showInfo, setShowInfo] = useState(false);
  
  // NEW: State for Detailed Table Filters
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all'); // 'all', 'A', 'B', etc.

  const tableRef = useRef<HTMLDivElement>(null);

  const uniqueForms = useMemo(() => {
    const forms = new Set(students.map(s => getFormFromClass(s.className)));
    return Array.from(forms).sort();
  }, [students]);

  const filteredData = useMemo(() => {
    return students.filter(s => {
      const formMatch = selectedForm === 'all' || getFormFromClass(s.className) === selectedForm;
      const subjMatch = selectedSubject === 'all' || s.subject === selectedSubject;
      const hasData = s.uasaGrade && s.uasaGrade.trim() !== '';
      return formMatch && subjMatch && hasData;
    });
  }, [students, selectedForm, selectedSubject]);

  // Data for Student Table (Filtered + Search + Grade Filter)
  const studentTableData = useMemo(() => {
      return filteredData.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesGrade = selectedGradeFilter === 'all' || s.uasaGrade.toUpperCase() === selectedGradeFilter;
        return matchesSearch && matchesGrade;
      }).sort((a, b) => {
          const classCompare = a.className.localeCompare(b.className);
          if (classCompare !== 0) return classCompare;
          return a.name.localeCompare(b.name);
      });
  }, [filteredData, studentSearch, selectedGradeFilter]);

  // Achievement Stats Calculation
  const achievementStats = useMemo(() => {
    const stats = [
        { label: 'Cemerlang', grades: ['A'], count: 0, color: 'bg-green-100 text-green-700', border: 'border-green-200', fill: '#16a34a', ring: 'ring-green-500' },
        { label: 'Baik', grades: ['B'], count: 0, color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', fill: '#10b981', ring: 'ring-emerald-500' },
        { label: 'Memuaskan', grades: ['C'], count: 0, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200', fill: '#3b82f6', ring: 'ring-blue-500' },
        { label: 'Sederhana', grades: ['D'], count: 0, color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', fill: '#eab308', ring: 'ring-yellow-500' },
        { label: 'Lemah', grades: ['E'], count: 0, color: 'bg-orange-100 text-orange-700', border: 'border-orange-200', fill: '#f97316', ring: 'ring-orange-500' },
        { label: 'Sangat Lemah', grades: ['F'], count: 0, color: 'bg-red-100 text-red-700', border: 'border-red-200', fill: '#ef4444', ring: 'ring-red-500' },
    ];

    filteredData.forEach(s => {
        const g = s.uasaGrade.toUpperCase();
        const category = stats.find(stat => stat.grades.includes(g));
        if (category) category.count++;
    });

    return stats.map(stat => ({
        ...stat,
        percentage: filteredData.length > 0 ? ((stat.count / filteredData.length) * 100).toFixed(1) : '0.0'
    }));
  }, [filteredData]);

  // Class Breakdown Logic (Used for Table)
  const classBreakdown = useMemo(() => {
    const groups: Record<string, { grades: Record<string, number>, total: number }> = {};
    
    filteredData.forEach(s => {
      if (!groups[s.className]) {
        groups[s.className] = { grades: { A:0, B:0, C:0, D:0, E:0, F:0 }, total: 0 };
      }
      const g = s.uasaGrade.toUpperCase();
      if (groups[s.className].grades[g] !== undefined) {
        groups[s.className].grades[g]++;
        groups[s.className].total++;
      }
    });

    return Object.entries(groups)
      .map(([className, data]) => {
          const points = (data.grades.A * 1) + (data.grades.B * 2) + (data.grades.C * 3) + 
                         (data.grades.D * 4) + (data.grades.E * 5) + (data.grades.F * 6);
          const gpmp = data.total > 0 ? (points / data.total).toFixed(2) : '0.00';

          return { className, ...data, gpmp: parseFloat(gpmp) }; 
      })
      // Sort naturally: 1 Amanah, 1 Bestari, 2 Amanah...
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' }));
  }, [filteredData]);

  const lulusCount = filteredData.filter(s => s.uasaGrade.toUpperCase() !== 'F').length;

  const handleCardClick = (grade: string) => {
      if (selectedGradeFilter === grade) {
          setSelectedGradeFilter('all'); // Toggle Off
      } else {
          setSelectedGradeFilter(grade);
          // Scroll to table
          setTimeout(() => {
             tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 relative">
      
      {/* GPMP INFO MODAL */}
      {showInfo && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowInfo(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        Info GPMP
                    </h3>
                    <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Formula Pengiraan:</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm font-mono text-slate-600">
                            GPMP = <br/>(Σ Bil. Murid × Nilai Gred) / Jumlah Murid
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Nilai Gred (KPM):</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between p-2 bg-green-50 rounded border border-green-100"><span className="font-bold">A</span> <span>1.00</span></div>
                            <div className="flex justify-between p-2 bg-emerald-50 rounded border border-emerald-100"><span className="font-bold">B</span> <span>2.00</span></div>
                            <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100"><span className="font-bold">C</span> <span>3.00</span></div>
                            <div className="flex justify-between p-2 bg-yellow-50 rounded border border-yellow-100"><span className="font-bold">D</span> <span>4.00</span></div>
                            <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100"><span className="font-bold">E</span> <span>5.00</span></div>
                            <div className="flex justify-between p-2 bg-red-50 rounded border border-red-100"><span className="font-bold">F</span> <span>6.00</span></div>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400 text-center">
                        * Nilai GPMP yang lebih kecil menunjukkan prestasi yang lebih baik.
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-base">
          <Filter className="w-5 h-5" />
          Penapis Utama:
        </div>
        
        <select 
          value={selectedForm} 
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-base bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
        >
          <option value="all">Semua Tingkatan</option>
          {uniqueForms.map(f => <option key={f} value={f}>Tingkatan {f}</option>)}
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-base bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
        >
          <option value="all">Semua Subjek</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button 
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition border border-blue-100 ml-auto md:ml-0"
        >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Info GPMP</span>
        </button>
        
        <div className="ml-auto text-base text-slate-500 font-medium hidden md:block">
            {filteredData.length} Data Direkodkan
        </div>
      </div>

      {/* ACHIEVEMENT CARDS (INTERACTIVE) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {achievementStats.map((stat) => {
              const isSelected = selectedGradeFilter === stat.grades[0];
              return (
                <div 
                    key={stat.label} 
                    onClick={() => handleCardClick(stat.grades[0])}
                    className={`
                        p-4 rounded-xl border cursor-pointer transition-all duration-200 transform hover:scale-[1.02] relative
                        ${stat.color} 
                        ${isSelected ? `ring-4 ${stat.ring} shadow-lg z-10 scale-105 border-transparent` : stat.border}
                        flex flex-col items-center justify-center text-center shadow-sm
                    `}
                >
                    {isSelected && (
                        <div className="absolute top-2 right-2">
                             <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                        </div>
                    )}
                    <div className="text-3xl font-extrabold">{stat.percentage}%</div>
                    <div className="text-sm font-bold uppercase mt-1 opacity-80">{stat.label}</div>
                    <div className="text-xs mt-1 font-medium bg-white/50 px-2 py-0.5 rounded-full">
                        {stat.count} Murid
                    </div>
                    {isSelected && <div className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded">Dipilih</div>}
                </div>
              );
          })}
      </div>

      {/* Main Stats & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* KPI Cards */}
         <div className="lg:col-span-1 grid grid-cols-1 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                <div className="text-6xl font-black text-slate-800 tracking-tighter">
                    {(filteredData.length > 0 ? (lulusCount / filteredData.length * 100) : 0).toFixed(1)}<span className="text-3xl text-slate-400">%</span>
                </div>
                <div className="text-sm font-bold text-slate-500 uppercase mt-2 tracking-wide">% Lulus (A-E)</div>
             </div>
             
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                <div className="text-6xl font-black text-blue-600 tracking-tighter">
                   {filteredData.length > 0 
                     ? (classBreakdown.reduce((acc, curr) => acc + curr.gpmp, 0) / classBreakdown.length).toFixed(2) 
                     : '0.00'}
                </div>
                <div className="text-sm font-bold text-slate-500 uppercase mt-2 tracking-wide">GPMP Purata</div>
             </div>
         </div>

         {/* Achievement Bar Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Graf Analisis Pencapaian</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={achievementStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{fontSize: 12, fontWeight: 600}} interval={0} />
                        <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar 
                            dataKey="count" 
                            radius={[6, 6, 0, 0]} 
                            barSize={50}
                            onClick={(data) => handleCardClick(data.grades[0])}
                            cursor="pointer"
                        >
                             {achievementStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} opacity={selectedGradeFilter === 'all' || selectedGradeFilter === entry.grades[0] ? 1 : 0.3} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Class Breakdown Table (Full Width) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg">Analisis Gred Mengikut Kelas</h3>
          </div>
          <div className="overflow-x-auto flex-1">
              <table className="w-full text-base text-left">
                  <thead className="text-sm text-slate-600 uppercase bg-slate-100 border-b border-slate-200">
                      <tr>
                          <th className="px-5 py-4 font-bold">Kelas</th>
                          <th className="px-5 py-4 text-center font-bold">Bil Murid</th>
                          <th className="px-5 py-4 text-center text-green-700 bg-green-50/50">A</th>
                          <th className="px-5 py-4 text-center text-green-600 bg-green-50/50">B</th>
                          <th className="px-5 py-4 text-center text-blue-600 bg-blue-50/50">C</th>
                          <th className="px-5 py-4 text-center text-yellow-600 bg-yellow-50/50">D</th>
                          <th className="px-5 py-4 text-center text-orange-600 bg-orange-50/50">E</th>
                          <th className="px-5 py-4 text-center text-red-600 bg-red-50/50">F</th>
                          <th className="px-5 py-4 text-center font-bold">GPMP</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {classBreakdown.length === 0 ? (
                          <tr><td colSpan={9} className="text-center py-10 text-slate-400">Tiada Data</td></tr>
                      ) : (
                          classBreakdown.map((row) => (
                              <tr key={row.className} className="hover:bg-slate-50 transition">
                                  <td className="px-5 py-4 font-semibold text-slate-800">{row.className}</td>
                                  <td className="px-5 py-4 text-center text-slate-600 font-medium">{row.total}</td>
                                  <td className="px-5 py-4 text-center bg-green-50/30">{row.grades.A || '-'}</td>
                                  <td className="px-5 py-4 text-center bg-green-50/30">{row.grades.B || '-'}</td>
                                  <td className="px-5 py-4 text-center bg-blue-50/30">{row.grades.C || '-'}</td>
                                  <td className="px-5 py-4 text-center bg-yellow-50/30">{row.grades.D || '-'}</td>
                                  <td className="px-5 py-4 text-center bg-orange-50/30">{row.grades.E || '-'}</td>
                                  <td className="px-5 py-4 text-center bg-red-50/30">{row.grades.F || '-'}</td>
                                  <td className="px-5 py-4 text-center font-bold text-slate-800">{row.gpmp.toFixed(2)}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* DETAILED STUDENT TABLE WITH FILTERS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden scroll-mt-24" ref={tableRef}>
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    Senarai Terperinci Murid
                    {selectedGradeFilter !== 'all' && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            Gred {selectedGradeFilter} <button onClick={() => setSelectedGradeFilter('all')}><XCircle className="w-3 h-3 hover:text-blue-200" /></button>
                        </span>
                    )}
                </h3>
            </div>
            
            {/* Table Filters Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari nama dalam senarai..." 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                    />
                </div>

                {/* Grade Filter Dropdown */}
                <div className="relative w-full sm:w-48">
                    <select 
                        value={selectedGradeFilter}
                        onChange={(e) => setSelectedGradeFilter(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none bg-white cursor-pointer"
                    >
                        <option value="all">Semua Gred</option>
                        <option value="A">Gred A</option>
                        <option value="B">Gred B</option>
                        <option value="C">Gred C</option>
                        <option value="D">Gred D</option>
                        <option value="E">Gred E</option>
                        <option value="F">Gred F</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
                <thead className="text-sm font-bold text-slate-600 uppercase bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4 w-12 text-center">No.</th>
                        <th className="px-6 py-4">Nama Murid</th>
                        <th className="px-6 py-4 w-32">Kelas</th>
                        <th className="px-6 py-4 w-40">Subjek</th>
                        <th className="px-6 py-4 w-24 text-center">Markah</th>
                        <th className="px-6 py-4 w-24 text-center">Gred</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base">
                    {studentTableData.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">Tiada murid dijumpai.</td></tr>
                    ) : (
                        studentTableData.map((student, index) => {
                            const g = student.uasaGrade ? student.uasaGrade.toUpperCase() : '-';
                            let badgeColor = 'bg-slate-100 text-slate-600';
                            if(g === 'A') badgeColor = 'bg-green-100 text-green-700';
                            if(g === 'B') badgeColor = 'bg-emerald-100 text-emerald-700';
                            if(g === 'C') badgeColor = 'bg-blue-100 text-blue-700';
                            if(g === 'D') badgeColor = 'bg-yellow-100 text-yellow-700';
                            if(g === 'E') badgeColor = 'bg-orange-100 text-orange-700';
                            if(g === 'F') badgeColor = 'bg-red-100 text-red-700';

                            return (
                                <tr key={student.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-3 text-center text-slate-400 font-mono text-sm">{index + 1}</td>
                                    <td className="px-6 py-3 font-semibold text-slate-800">{student.name}</td>
                                    <td className="px-6 py-3 text-slate-600">
                                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-sm font-medium">{student.className}</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{student.subject}</td>
                                    <td className="px-6 py-3 text-center font-mono font-medium text-slate-700">
                                        {student.marks !== null && student.marks !== undefined ? student.marks : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${badgeColor}`}>
                                            {g}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium text-right">
            Memaparkan {studentTableData.length} rekod
        </div>
      </div>
    </div>
  );
};
