import React, { useMemo, useState } from 'react';
import { Student, SUBJECTS } from '../types';
import { getFormFromClass } from '../services/analysisUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Filter, ChevronRight, Users } from 'lucide-react';

interface Props {
  students: Student[];
  onDrillDown: (minTP: number, maxTP: number) => void;
}

export const PBDAnalysisView: React.FC<Props> = ({ students, onDrillDown }) => {
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Get unique Forms (Tingkatan)
  const uniqueForms = useMemo(() => {
    const forms = new Set(students.map(s => getFormFromClass(s.className)));
    return Array.from(forms).sort();
  }, [students]);

  // Filter Data
  const filteredData = useMemo(() => {
    return students.filter(s => {
      const formMatch = selectedForm === 'all' || getFormFromClass(s.className) === selectedForm;
      const subjMatch = selectedSubject === 'all' || s.subject === selectedSubject;
      return formMatch && subjMatch && s.pbdTP > 0; // Only count students with PBD data
    });
  }, [students, selectedForm, selectedSubject]);

  // Calculate Aggregates
  const tpDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredData.forEach(s => {
      if (s.pbdTP >= 1 && s.pbdTP <= 6) {
        counts[s.pbdTP as keyof typeof counts]++;
      }
    });
    return [
      { name: 'TP 1', count: counts[1], fill: '#ef4444' },
      { name: 'TP 2', count: counts[2], fill: '#f97316' },
      { name: 'TP 3', count: counts[3], fill: '#eab308' },
      { name: 'TP 4', count: counts[4], fill: '#3b82f6' },
      { name: 'TP 5', count: counts[5], fill: '#22c55e' },
      { name: 'TP 6', count: counts[6], fill: '#15803d' },
    ];
  }, [filteredData]);

  // Group By Class for Table
  const classBreakdown = useMemo(() => {
    const groups: Record<string, { tp: Record<number, number>, total: number }> = {};
    
    filteredData.forEach(s => {
      if (!groups[s.className]) {
        groups[s.className] = { tp: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }, total: 0 };
      }
      if (s.pbdTP >= 1 && s.pbdTP <= 6) {
        groups[s.className].tp[s.pbdTP]++;
        groups[s.className].total++;
      }
    });

    return Object.entries(groups)
      .map(([className, data]) => ({ className, ...data }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [filteredData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-base">
          <Filter className="w-5 h-5" />
          Penapis:
        </div>
        
        <select 
          value={selectedForm} 
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-base bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Semua Tingkatan</option>
          {uniqueForms.map(f => <option key={f} value={f}>Tingkatan {f}</option>)}
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-base bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Semua Subjek</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto text-base text-slate-500 font-medium">
            {filteredData.length} Data Direkodkan
        </div>
      </div>

      {/* Stats Summary - INTERACTIVE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* MENGUASAI */}
             <div 
                onClick={() => onDrillDown(3, 6)}
                className="bg-green-50 p-6 rounded-xl border border-green-100 flex flex-col justify-center text-center cursor-pointer hover:bg-green-100 hover:shadow-md transition group relative overflow-hidden"
             >
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
                    <ChevronRight className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-5xl font-extrabold text-green-700">
                    {filteredData.filter(s => s.pbdTP >= 3).length}
                </div>
                <div className="text-sm font-bold text-green-600 uppercase mt-3 tracking-wide">Menguasai (TP3-TP6)</div>
                <p className="text-xs text-green-600/70 mt-1">Klik untuk lihat senarai</p>
             </div>

             {/* BELUM MENGUASAI */}
             <div 
                onClick={() => onDrillDown(1, 2)}
                className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col justify-center text-center cursor-pointer hover:bg-red-100 hover:shadow-md transition group relative overflow-hidden"
             >
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
                    <ChevronRight className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-5xl font-extrabold text-red-600">
                    {filteredData.filter(s => s.pbdTP < 3).length}
                </div>
                <div className="text-sm font-bold text-red-500 uppercase mt-3 tracking-wide">Belum Menguasai (TP1-TP2)</div>
                <p className="text-xs text-red-500/70 mt-1">Klik untuk lihat senarai</p>
             </div>

             {/* MTM */}
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col justify-center text-center">
                <div className="text-5xl font-extrabold text-blue-600">
                    {(filteredData.length > 0 ? (filteredData.filter(s => s.pbdTP >= 3).length / filteredData.length * 100) : 0).toFixed(1)}%
                </div>
                <div className="text-sm font-bold text-blue-500 uppercase mt-3 tracking-wide">% MTM</div>
             </div>
        </div>

      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Taburan TP Keseluruhan</h3>
             <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tpDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 14}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                            {tpDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>

        {/* Detail Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg">Analisis Mengikut Kelas</h3>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-base text-left">
                    <thead className="text-sm text-slate-600 uppercase bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th className="px-5 py-4 font-bold">Kelas</th>
                            <th className="px-5 py-4 text-center font-bold">Bil Murid</th>
                            <th className="px-5 py-4 text-center text-green-700 bg-green-50/50">TP 6</th>
                            <th className="px-5 py-4 text-center text-green-600 bg-green-50/50">TP 5</th>
                            <th className="px-5 py-4 text-center text-blue-600 bg-blue-50/50">TP 4</th>
                            <th className="px-5 py-4 text-center text-blue-500 bg-blue-50/50">TP 3</th>
                            <th className="px-5 py-4 text-center text-amber-600 bg-amber-50/50">TP 2</th>
                            <th className="px-5 py-4 text-center text-red-600 bg-red-50/50">TP 1</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {classBreakdown.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-10 text-slate-400">Tiada Data</td></tr>
                        ) : (
                            classBreakdown.map((row) => (
                                <tr key={row.className} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-4 font-semibold text-slate-800">{row.className}</td>
                                    <td className="px-5 py-4 text-center text-slate-600 font-medium">{row.total}</td>
                                    <td className="px-5 py-4 text-center bg-green-50/30">{row.tp[6] || '-'}</td>
                                    <td className="px-5 py-4 text-center bg-green-50/30">{row.tp[5] || '-'}</td>
                                    <td className="px-5 py-4 text-center bg-blue-50/30">{row.tp[4] || '-'}</td>
                                    <td className="px-5 py-4 text-center bg-blue-50/30">{row.tp[3] || '-'}</td>
                                    <td className="px-5 py-4 text-center bg-amber-50/30">{row.tp[2] || '-'}</td>
                                    <td className="px-5 py-4 text-center bg-red-50/30">{row.tp[1] || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};