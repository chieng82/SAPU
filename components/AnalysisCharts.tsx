
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult[];
}

export const AnalysisCharts: React.FC<Props> = ({ data }) => {
  
  const gapDistribution = useMemo(() => {
    const counts = { NoGap: 0, Warning: 0, Critical: 0, Extreme: 0 };
    data.forEach(d => {
      if (d.severity === 'extreme') counts.Extreme++;
      else if (d.severity === 'critical') counts.Critical++;
      else if (d.severity === 'warning') counts.Warning++;
      else counts.NoGap++;
    });
    return [
      { name: 'Tiada Jurang', value: counts.NoGap, color: '#4ade80' },
      { name: 'Amaran (1 Tahap)', value: counts.Warning, color: '#facc15' },
      { name: 'Kritikal (2 Tahap)', value: counts.Critical, color: '#f87171' },
      { name: 'Sangat Kritikal (3+)', value: counts.Extreme, color: '#a855f7' }, // Purple
    ];
  }, [data]);

  const tpVsGrade = useMemo(() => {
    // Distribution of TP
    const dist = [1, 2, 3, 4, 5, 6].map(tp => ({
      name: `TP ${tp}`,
      count: data.filter(d => d.student.pbdTP === tp).length
    }));
    return dist;
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Gap Severity Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Analisis Jurang Prestasi</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gapDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {gapDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TP Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Taburan Tahap Penguasaan (PBD)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tpVsGrade}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="count" name="Bilangan Murid" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
