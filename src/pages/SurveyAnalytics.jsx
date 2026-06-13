import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star } from 'lucide-react';

const FIELDS = [
  { key: 'room_satisfaction', label: 'Room' },
  { key: 'facility_satisfaction', label: 'Facilities' },
  { key: 'internet_satisfaction', label: 'Internet' },
  { key: 'staff_satisfaction', label: 'Staff' },
  { key: 'security_satisfaction', label: 'Security' },
  { key: 'overall_satisfaction', label: 'Overall' },
];

function avg(arr, key) {
  const vals = arr.filter(s => s[key] != null);
  if (!vals.length) return 0;
  return (vals.reduce((a, s) => a + s[key], 0) / vals.length).toFixed(1);
}

export default function SurveyAnalytics() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Survey.list('-created_date').then(s => { setSurveys(s); setLoading(false); });
  }, []);

  const chartData = FIELDS.map(f => ({ name: f.label, avg: parseFloat(avg(surveys, f.key)) }));

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Satisfaction Survey Analytics" description={`${surveys.length} responses collected`} />
      {surveys.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No survey responses yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {FIELDS.map(f => (
              <div key={f.key} className="bg-card border border-border rounded-xl p-3 text-center">
                <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{avg(surveys, f.key)}</p>
                <p className="text-xs text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4">Average Ratings</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="hsl(199,89%,48%)" radius={[4,4,0,0]} name="Avg Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-semibold">Recent Responses</h3></div>
            <div className="divide-y divide-border">
              {surveys.slice(0, 20).map(s => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{s.student_name}</span>
                    <div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /><span className="text-sm font-bold">{s.overall_satisfaction}/5</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.block_name} · {s.room_number} · {s.semester}</p>
                  {s.comments && <p className="text-xs mt-1 text-foreground">{s.comments}</p>}
                  {s.suggestions && <p className="text-xs mt-0.5 text-muted-foreground italic">"{s.suggestions}"</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}