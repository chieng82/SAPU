import React, { useMemo, useState } from 'react';
import { Student, SUBJECTS } from '../types';
import { getFormFromClass } from '../services/analysisUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { Filter } from 'lucide-react';

interface Props {
  students: Student[];
}

export const UASAAnalysisView: React.FC<Props> = ({ students }) => {
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const uniqueForms = useMemo(() => {
    const forms = new Set(students.map(s => getFormFromClass(s.className)));
    return Array.from(forms).sort();
  }, [students]);

  const filteredData = useMemo(() => {
    return students.filter(s => {
      const formMatch = selectedForm === 'all' || getFormFromClass(s.className) === selectedForm;
      const subjMatch = selectedSubject === 'all' || s.subject === selectedSubject;
      return formMatch && subjMatch && s.uasaGrade && s.uasaGrade.trim() !== '';
    });
  }, [students, selectedForm, selectedSubject]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = { A:0, B:0, C:0, D:0, E:0, F:0 };
    filteredData.forEach(s => {
      const g = s.uasaGrade.toUpperCase();
      if (counts[g] !== undefined) counts[g]++;
    });
    
    return Object.entries(counts).map(([name, count]) => {
        let fill = '#94a3b8';
        if(name === 'A') fill = '#15803d';
        if(name === 'B') fill = '#22c55e';
        if(name === 'C') fill = '#3b82f6';
        if(name === 'D') fill = '#eab308';
        if(name === 'E') fill = '#f97316';
        if(name === 'F') fill = '#ef4444';
        
        return { name, count, fill };
    });
  }, [filteredData]);

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
          // Calculate GPMP (Standard: A=1, B=2, C=3, D=4, E=5, F=6)
          // Total Points / Total Students
          const points = (data.grades.A * 1) + (data.grades.B * 2) + (data.grades.C * 3) + 
                         (data.grades.D * 4) + (data.grades.E * 5) + (data.grades.F * 6);
          const gpmp = data.total > 0 ? (points / data.total).toFixed(2) : '0.00';

          return { className, ...data, gpmp };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [filteredData]);

  const lulusCount = gradeDistribution.filter(d => d.name !== 'F').reduce((a, b) => a + b.count, 0);
  const gagalCount = gradeDistribution.find(d => d.name === 'F')?.count || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Filter className="w-4 h-4" />
          Penapis:
        </div>
        
        <select 
          value={selectedForm} 
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Semua Tingkatan</option>
          {uniqueForms.map(f => <option key={f} value={f}>Tingkatan {f}</option>)}
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">Semua Subjek</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <div className="ml-auto text-sm text-slate-500">
            {filteredData.length} Data Direkodkan
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Stats Cards */}
         <div className="lg:col-span-1 grid grid-cols-1 gap-4">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
                <div className="text-3xl font-bold text-slate-800">
                    {(filteredData.length > 0 ? (lulusCount / filteredData.length * 100) : 0).toFixed(1)}%
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase mt-1">% Lulus (A-E)</div>
             </div>
             
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
                <div className="text-3xl font-bold text-blue-600">
                   {filteredData.length > 0 
                     ? (classBreakdown.reduce((acc, curr) => acc + parseFloat(curr.gpmp), 0) / classBreakdown.length).toFixed(2) 
                     : '0.00'}
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase mt-1">GPMP Purata</div>
             </div>
         </div>

         {/* Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Taburan Gred UASA</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                             {gradeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-700">Analisis Gred Mengikut Kelas</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th className="px-4 py-3 font-semibold">Kelas</th>
                        <th className="px-4 py-3 text-center font-semibold">Bil Murid</th>
                        <th className="px-4 py-3 text-center text-green-700 bg-green-50/30">A</th>
                        <th className="px-4 py-3 text-center text-green-600 bg-green-50/30">B</th>
                        <th className="px-4 py-3 text-center text-blue-600 bg-blue-50/30">C</th>
                        <th className="px-4 py-3 text-center text-yellow-600 bg-yellow-50/30">D</th>
                        <th className="px-4 py-3 text-center text-orange-600 bg-orange-50/30">E</th>
                        <th className="px-4 py-3 text-center text-red-600 bg-red-50/30">F</th>
                        <th className="px-4 py-3 text-center font-bold">GPMP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {classBreakdown.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-8 text-slate-400">Tiada Data</td></tr>
                    ) : (
                        classBreakdown.map((row) => (
                            <tr key={row.className} className="hover:bg-slate-50 transition">
                                <td className="px-4 py-3 font-medium text-slate-800">{row.className}</td>
                                <td className="px-4 py-3 text-center text-slate-600">{row.total}</td>
                                <td className="px-4 py-3 text-center bg-green-50/30">{row.grades.A || '-'}</td>
                                <td className="px-4 py-3 text-center bg-green-50/30">{row.grades.B || '-'}</td>
                                <td className="px-4 py-3 text-center bg-blue-50/30">{row.grades.C || '-'}</td>
                                <td className="px-4 py-3 text-center bg-yellow-50/30">{row.grades.D || '-'}</td>
                                <td className="px-4 py-3 text-center bg-orange-50/30">{row.grades.E || '-'}</td>
                                <td className="px-4 py-3 text-center bg-red-50/30">{row.grades.F || '-'}</td>
                                <td className="px-4 py-3 text-center font-bold text-slate-700">{row.gpmp}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};