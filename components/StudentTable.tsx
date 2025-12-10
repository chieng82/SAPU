import React, { useState } from 'react';
import { AnalysisResult, Student, GRADE_MAP, SUBJECTS } from '../types';
import { Edit2, Save, X, AlertTriangle, AlertOctagon, CheckCircle2, Trash2 } from 'lucide-react';

interface Props {
  data: AnalysisResult[];
  onUpdate: (student: Student) => void;
  onDelete: (id: string) => void;
}

export const StudentTable: React.FC<Props> = ({ data, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setEditForm({ ...student });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      if (!editForm.name) {
          alert("Nama murid tidak boleh dibiarkan kosong.");
          return;
      }
      onUpdate(editForm as Student);
      setEditingId(null);
    }
  };

  const getRowStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50/50 hover:bg-red-50 border-l-4 border-l-red-500';
      case 'warning': return 'bg-amber-50/50 hover:bg-amber-50 border-l-4 border-l-amber-500';
      default: return 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent';
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left text-slate-600">
        <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200 tracking-wider">
          <tr>
            <th className="px-4 py-3">Nama Murid</th>
            <th className="px-4 py-3 w-24">Kelas</th>
            <th className="px-4 py-3 w-40">Subjek</th>
            <th className="px-4 py-3 w-24 text-center">Gred UASA</th>
            <th className="px-4 py-3 w-24 text-center">TP PBD</th>
            <th className="px-4 py-3 w-32 text-center">Jurang</th>
            <th className="px-4 py-3 w-24 text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                Tiada data dijumpai.
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const isEditing = editingId === item.student.id;
              
              return (
                <tr key={item.student.id} className={`transition-colors ${getRowStyle(item.severity)}`}>
                  {/* NAME */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                        className="w-full p-1.5 border border-slate-300 rounded text-base uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nama Murid"
                      />
                    ) : (
                      <div className="font-semibold text-slate-800 text-base">
                        {item.student.name}
                      </div>
                    )}
                  </td>

                  {/* CLASS */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.className} 
                        onChange={(e) => setEditForm({...editForm, className: e.target.value.toUpperCase()})}
                        className="w-full p-1.5 border border-slate-300 rounded text-base uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm font-medium border border-slate-200">
                        {item.student.className}
                      </span>
                    )}
                  </td>

                  {/* SUBJECT */}
                  <td className="px-4 py-3 text-sm">
                    {isEditing ? (
                      <select 
                        value={editForm.subject}
                        onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                         {SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {item.student.subject}
                      </span>
                    )}
                  </td>

                  {/* UASA */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <select 
                        value={editForm.uasaGrade}
                        onChange={(e) => setEditForm({...editForm, uasaGrade: e.target.value})}
                        className="p-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                         <option value="">-</option>
                        {Object.keys(GRADE_MAP).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-base ${
                          !item.student.uasaGrade 
                            ? 'bg-red-50 text-red-400 border border-red-100' 
                            : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      }`}>
                        {item.student.uasaGrade || '-'}
                      </div>
                    )}
                  </td>

                  {/* PBD */}
                  <td className="px-4 py-3 text-center">
                     {isEditing ? (
                      <select 
                        value={editForm.pbdTP}
                        onChange={(e) => setEditForm({...editForm, pbdTP: parseInt(e.target.value)})}
                        className="p-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value={0}>-</option>
                        {[1, 2, 3, 4, 5, 6].map(tp => (
                          <option key={tp} value={tp}>TP {tp}</option>
                        ))}
                      </select>
                    ) : (
                      item.student.pbdTP > 0 ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold border shadow-sm ${
                            item.student.pbdTP >= 5 ? 'bg-green-50 text-green-700 border-green-200' :
                            item.student.pbdTP >= 3 ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            TP {item.student.pbdTP}
                        </span>
                      ) : (
                        <span className="text-red-400 font-medium text-sm">-</span>
                      )
                    )}
                  </td>

                  {/* GAP INDICATOR */}
                  <td className="px-4 py-3 text-center">
                    {item.gap > 0 ? (
                        <div className={`flex items-center justify-center gap-1.5 font-semibold text-sm ${
                            item.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                            {item.severity === 'critical' ? <AlertOctagon className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            <span>{item.gap} Tahap</span>
                        </div>
                    ) : (
                         <div className="flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-slate-300" />
                         </div>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={saveEdit} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200 transition" title="Simpan">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 bg-white text-slate-400 hover:bg-slate-100 rounded border border-slate-200 transition" title="Batal">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => startEdit(item.student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(item.student.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Padam">
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};