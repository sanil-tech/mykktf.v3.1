import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Star, Building2, Wrench, Wifi, Sparkles, Shield, KeyRound, ThumbsUp, Users, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FIELDS = [
  { key: 'room_satisfaction', label: 'Bilik & Perabot', full: 'Keadaan Bilik & Perabot' },
  { key: 'cleanliness_satisfaction', label: 'Tandas & Kebersihan', full: 'Kebersihan Kawasan Sepunya & Tandas' },
  { key: 'maintenance_satisfaction', label: 'Penyelenggaraan', full: 'Kepantasan Tindakan Penyelenggaraan' },
  { key: 'facility_satisfaction', label: 'Fasiliti & Kemudahan', full: 'Kualiti Fasiliti & Dewan' },
  { key: 'internet_satisfaction', label: 'Wi-Fi UMS', full: 'Kestabilan Internet Wi-Fi UMS' },
  { key: 'staff_warden_satisfaction', altKey: 'staff_satisfaction', label: 'Staf & Felo', full: 'Layanan Staf & Felo Blok' },
  { key: 'security_satisfaction', label: 'Keselamatan', full: 'Keselamatan & Kawalan Pengawal' },
  { key: 'checkout_process_satisfaction', label: 'Aliran Drop-Key', full: 'Kelancaran Check-In / Express Drop-Key' },
  { key: 'overall_satisfaction', label: 'Keseluruhan', full: 'Kepuasan Keseluruhan Menginap di KKTF' },
];

function avg(arr, key, altKey) {
  const vals = arr
    .map(s => (s[key] != null ? s[key] : altKey && s[altKey] != null ? s[altKey] : null))
    .filter(v => v != null && v > 0);
  if (!vals.length) return '0.0';
  return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1);
}

export default function SurveyAnalytics() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const s = await base44.entities.Survey.list('-created_date');
      setSurveys(s || []);
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const chartData = FIELDS.map(f => ({
    name: f.label,
    full: f.full,
    avg: parseFloat(avg(surveys, f.key, f.altKey))
  }));

  // Kira unjuran kemasukan semula Semester 2
  const intentCounts = {
    yes: surveys.filter(s => s.returning_sem2_intent === 'yes' || !s.returning_sem2_intent).length,
    no: surveys.filter(s => s.returning_sem2_intent === 'no').length,
    unsure: surveys.filter(s => s.returning_sem2_intent === 'unsure').length,
  };
  const totalWithIntent = surveys.length || 1;
  const yesPercent = Math.round((intentCounts.yes / totalWithIntent) * 100);
  const noPercent = Math.round((intentCounts.no / totalWithIntent) * 100);
  const unsurePercent = Math.round((intentCounts.unsure / totalWithIntent) * 100);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat turun data analitik kajian kepuasan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Analitik Kajian Kepuasan Pelajar (KKTF Survey Analytics)" 
        description={`Papan pemuka maklum balas operasi kolej & unjuran penghunian semester hadapan berdasarkan ${surveys.length} respons pelajar.`} 
      />

      {surveys.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground space-y-2">
          <Star className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">Belum ada maklum balas kaji selidik direkodkan.</p>
          <p className="text-xs text-slate-500">Maklum balas akan dikumpul secara automatik apabila pelajar membuat serahan kunci / pasca check-out.</p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* KAD UNJURAN KEMASUKAN SEMESTER 2 (SEM 2 OCCUPANCY RETENTION FORECAST)     */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-indigo-700/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-800/80 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Unjuran Penghunian & Kemasukan Semula Semester 2
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                      Tinjauan Langsung
                    </Badge>
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Berdasarkan hasrat yang dinyatakan oleh {surveys.length} orang pelajar semasa prosedur check-out.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-indigo-300">Kadar Minat Menginap Semula:</span>
                <p className="text-2xl font-black text-emerald-400">{yesPercent}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-indigo-800/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-bold">✅ Kembali Sem 2</span>
                  <span className="font-mono text-emerald-300 font-bold">{intentCounts.yes} Pelajar</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${yesPercent}%` }} />
                </div>
                <p className="text-[11px] text-slate-300">{yesPercent}% merancang check-in semula ke bilik KKTF.</p>
              </div>

              <div className="bg-slate-900/60 border border-indigo-800/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-rose-400 font-bold">❌ Tidak Kembali (Sewa Luar/LI)</span>
                  <span className="font-mono text-rose-300 font-bold">{intentCounts.no} Pelajar</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                  <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${noPercent}%` }} />
                </div>
                <p className="text-[11px] text-slate-300">{noPercent}% tidak menginap (kuota bilik boleh dibuka kepada pelajar lain).</p>
              </div>

              <div className="bg-slate-900/60 border border-indigo-800/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-400 font-bold">⏳ Belum Pasti</span>
                  <span className="font-mono text-amber-300 font-bold">{intentCounts.unsure} Pelajar</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${unsurePercent}%` }} />
                </div>
                <p className="text-[11px] text-slate-300">{unsurePercent}% menunggu perancangan jadual kuliah.</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 9 METRIK KAD PRESTASI OPERASI KOLEJ                                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {FIELDS.map(f => {
              const score = avg(surveys, f.key, f.altKey);
              const numScore = parseFloat(score);
              const isHigh = numScore >= 4.0;
              const isLow = numScore > 0 && numScore < 3.0;

              return (
                <div key={f.key} className="bg-card border border-border rounded-2xl p-4 text-center shadow-xs flex flex-col justify-between space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200/50">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <p className={`text-2xl font-black font-mono tracking-tight ${isLow ? 'text-rose-600' : isHigh ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {score}
                    </p>
                    <p className="text-[11px] font-bold text-foreground line-clamp-1 mt-0.5">{f.label}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{f.full}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] py-0 px-1.5 mx-auto ${
                    isHigh ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : isLow ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-600'
                  }`}>
                    {numScore >= 4.5 ? 'Cemerlang' : numScore >= 3.5 ? 'Baik' : numScore >= 2.5 ? 'Sederhana' : numScore > 0 ? 'Perlu Perhatian' : 'Tiada Data'}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* CARTA BAR SKOR PURATA 9 TONGGAK                                          */}
          {/* ========================================================================= */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Purata Skor Kepuasan Mengikut Kategori (Skala 1 - 5 Bintang)</h3>
                <p className="text-xs text-muted-foreground">Analisis menyeluruh bagi setiap jabatan sokongan kolej kediaman.</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Maksimum: 5.0 ★</span>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, name, props) => [`${value} / 5.0 Bintang`, props.payload.full]} 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.avg >= 4.0 ? '#10b981' : entry.avg >= 3.0 ? '#6366f1' : '#f59e0b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ========================================================================= */}
          {/* JADUAL MAKLUM BALAS KUALITATIF PELAJAR TERKINI                           */}
          {/* ========================================================================= */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-sm font-bold text-foreground">Maklum Balas Kualitatif & Cadangan Penambahbaikan</h3>
                <p className="text-xs text-muted-foreground">Komen pelajar untuk tindakan pentadbiran kolej dan felo blok.</p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{surveys.length} Rekod</span>
            </div>

            <div className="divide-y divide-border">
              {surveys.slice(0, 25).map(s => (
                <div key={s.id} className="p-4 sm:p-5 hover:bg-muted/10 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{s.student_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">({s.student_id})</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {s.block_name || 'KKTF'} - {s.room_number || 'Bilik'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      {s.returning_sem2_intent && (
                        <Badge className={`text-[10px] ${
                          s.returning_sem2_intent === 'yes' ? 'bg-emerald-100 text-emerald-800' : s.returning_sem2_intent === 'no' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Sem 2: {s.returning_sem2_intent === 'yes' ? 'Kembali' : s.returning_sem2_intent === 'no' ? 'Keluar' : 'Belum Pasti'}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span className="text-xs font-black text-amber-900 font-mono">{s.overall_satisfaction || 5} / 5</span>
                      </div>
                    </div>
                  </div>

                  {/* Aspek Terbaik */}
                  {(s.best_aspect || s.comments) && (
                    <div className="text-xs bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-emerald-950">
                      <strong className="text-emerald-800 flex items-center gap-1 mb-0.5">
                        <ThumbsUp className="w-3 h-3 text-emerald-600" /> Aspek Terbaik Yang Dihargai:
                      </strong>
                      <p className="italic">{s.best_aspect || s.comments}</p>
                    </div>
                  )}

                  {/* Cadangan Penambahbaikan */}
                  {s.suggestions && (
                    <div className="text-xs bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl text-amber-950">
                      <strong className="text-amber-800 flex items-center gap-1 mb-0.5">
                        <Sparkles className="w-3 h-3 text-amber-600" /> Cadangan Penambahbaikan Pelajar:
                      </strong>
                      <p className="italic">"{s.suggestions}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}