import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle2, Building2, Sparkles, HeartHandshake, ThumbsUp, Send } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const QUESTIONS = [
  { 
    key: 'room_satisfaction', 
    title: '1. Keadaan Bilik & Perabot', 
    sub: 'Room Condition & Furniture',
    hint: 'Kualiti tilam, katil, almari, meja belajar dan keselesaan ruang bilik tidur.' 
  },
  { 
    key: 'cleanliness_satisfaction', 
    title: '2. Kebersihan Tandas & Kawasan Sepunya', 
    sub: 'Washrooms & Common Area Cleanliness',
    hint: 'Kebersihan tandas aras, pantri, bilik basuh, koridor dan pelupusan sampah.' 
  },
  { 
    key: 'maintenance_satisfaction', 
    title: '3. Kepantasan Tindakan Penyelenggaraan', 
    sub: 'Maintenance & Repair Response',
    hint: 'Kepantasan dan kualiti pembaikan kerosakan lampu, kipas, tombol pintu atau paip rosak.' 
  },
  { 
    key: 'facility_satisfaction', 
    title: '4. Kualiti Kemudahan & Fasiliti Kolej', 
    sub: 'Facilities & Amenities',
    hint: 'Kemudahan dewan serbaguna, gimnasium, gelanggang sukan dan mesin basuh kolej.' 
  },
  { 
    key: 'internet_satisfaction', 
    title: '5. Kestabilan Internet Wi-Fi UMS', 
    sub: 'Wi-Fi & Internet Connectivity',
    hint: 'Kelajuan dan kestabilan capaian internet di blok kolej kediaman.' 
  },
  { 
    key: 'staff_warden_satisfaction', 
    title: '6. Layanan Staf Pejabat & Keprihatinan Felo Blok', 
    sub: 'Staff & Warden Welfare Care',
    hint: 'Keramahan staf kaunter pejabat kolej dan kebolehcapaian felo dalam hal kebajikan pelajar.' 
  },
  { 
    key: 'security_satisfaction', 
    title: '7. Keselamatan & Kawalan Pengawal', 
    sub: 'Security & Safety',
    hint: 'Rondaan keselamatan malam, pencahayaan kawasan kolej, dan perlindungan harta benda.' 
  },
  { 
    key: 'checkout_process_satisfaction', 
    title: '8. Kelancaran Check-In / Express Drop-Key', 
    sub: 'Check-In/Out & Drop-Key Experience',
    hint: 'Kemudahan urusan kunci awal semester dan serahan kunci pantas hujung semester.' 
  },
  { 
    key: 'overall_satisfaction', 
    title: '9. Kepuasan Keseluruhan Penginapan di KKTF', 
    sub: 'Overall Residential Experience',
    hint: 'Penilaian menyeluruh pengalaman kediaman anda di KKTF sepanjang semester ini.' 
  },
];

const RETURNING_OPTIONS = [
  { value: 'yes', label: 'Ya, saya berhasrat menginap semula Sem 2', emoji: '✅' },
  { value: 'no', label: 'Tidak (Akan menyewa di luar / tamat belajar / LI)', emoji: '❌' },
  { value: 'unsure', label: 'Belum pasti / Menunggu perancangan', emoji: '⏳' }
];

function StarRating({ value, onChange }) {
  const getLabel = (v) => {
    switch (v) {
      case 1: return 'Sangat Tidak Memuaskan';
      case 2: return 'Kurang Memuaskan';
      case 3: return 'Sederhana';
      case 4: return 'Memuaskan';
      case 5: return 'Sangat Cemerlang';
      default: return 'Sila pilih penilaian';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button 
            key={n} 
            type="button" 
            onClick={() => onChange(n)} 
            className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
            title={`${n} Bintang`}
          >
            <Star 
              className={`w-6 h-6 transition-colors ${
                n <= value 
                  ? 'text-amber-400 fill-amber-400 drop-shadow-sm' 
                  : 'text-slate-300 hover:text-amber-200'
              }`} 
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-700 ml-2 font-mono">
          {value > 0 ? `${value} / 5` : ''}
        </span>
      </div>
      <span className="text-[11px] font-medium text-slate-500 italic">
        {getLabel(value)}
      </span>
    </div>
  );
}

export default function SurveyModal({ open, onClose, onComplete, user, student, checkoutId }) {
  const [ratings, setRatings] = useState({
    room_satisfaction: 0,
    cleanliness_satisfaction: 0,
    maintenance_satisfaction: 0,
    facility_satisfaction: 0,
    internet_satisfaction: 0,
    staff_warden_satisfaction: 0,
    security_satisfaction: 0,
    checkout_process_satisfaction: 0,
    overall_satisfaction: 0
  });

  const [returningIntent, setReturningIntent] = useState('yes');
  const [bestAspect, setBestAspect] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const incomplete = QUESTIONS.some(q => !ratings[q.key]);
    if (incomplete) {
      toast({ 
        title: 'Sila lengkapkan semua 9 kategori penilaian bintang', 
        description: 'Setiap kategori memberi data penting kepada pihak pengurusan kolej.',
        variant: 'destructive' 
      }); 
      return; 
    }

    setSaving(true);
    try {
      await base44.entities.Survey.create({
        student_id: student?.student_id || '',
        student_name: student?.full_name || user?.full_name || '',
        student_user_id: user?.id || '',
        block_name: student?.block_name || '',
        room_number: student?.room_number || '',
        semester: new Date().getFullYear() + ' Sem ' + (new Date().getMonth() < 6 ? '1' : '2'),
        ...ratings,
        staff_satisfaction: ratings.staff_warden_satisfaction, // backward compatibility
        returning_sem2_intent: returningIntent,
        best_aspect: bestAspect,
        suggestions: suggestions,
        comments: bestAspect ? `Aspek Terbaik: ${bestAspect}` : '',
        checkout_id: checkoutId || '',
      });

      toast({ 
        title: 'Maklum Balas Berjaya Dihantar! 🎉',
        description: 'Terima kasih atas kerjasama anda dalam meningkatkan kualiti Kolej Kediaman Tun Fuad.'
      });
      
      onComplete?.();
      onClose?.();
    } catch (err) {
      console.error('Survey submission error:', err);
      toast({ 
        title: 'Ralat menghantar kaji selidik', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && onClose) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl" onPointerDownOutside={e => { if (!onClose) e.preventDefault(); }}>
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Kajian Kepuasan Pelajar Residen KKTF
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                End-of-Semester Residential Quality Survey &bull; Sesi Akademik 2025/2026
              </DialogDescription>
            </div>
          </div>
          <p className="text-xs text-slate-600 pt-1 leading-relaxed">
            Maklum balas ikhlas anda membantu Pengetua, Pentadbiran dan Felo Kolej Kediaman Tun Fuad menilai prestasi operasi, kualiti kontraktor, serta merancang penambahbaikan kemudahan sesi hadapan.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          
          {/* 9 KATEGORI PENILAIAN BINTANG */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bahagian A: Penilaian Kualiti Perkhidmatan Kolej
            </h4>

            {QUESTIONS.map(q => (
              <div 
                key={q.key} 
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  ratings[q.key] > 0 
                    ? 'bg-slate-50/80 border-slate-200' 
                    : 'bg-white border-amber-200/80 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900">{q.title}</p>
                  <span className="text-[10px] text-slate-400 font-mono italic">{q.sub}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{q.hint}</p>
                <StarRating 
                  value={ratings[q.key]} 
                  onChange={v => setRatings(r => ({ ...r, [q.key]: v }))} 
                />
              </div>
            ))}
          </div>

          {/* BAHAGIAN B: UNJURAN KEMASUKAN SEMESTER 2 */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Bahagian B: Hasrat Menginap Semula Semester 2
            </h4>
            <p className="text-xs text-indigo-900 leading-relaxed">
              Adakah anda berhasrat untuk terus menginap di Kolej Kediaman Tun Fuad pada Semester 2 hadapan?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {RETURNING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReturningIntent(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs font-medium flex items-center gap-2 ${
                    returningIntent === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <span className="text-sm shrink-0">{opt.emoji}</span>
                  <span className="text-[11px] leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BAHAGIAN C: MAKLUM BALAS KUALITATIF */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Bahagian C: Maklum Balas Tambahan & Cadangan
            </h4>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                1. Aspek Terbaik KKTF (Pilihan)
              </label>
              <textarea 
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none h-16 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                placeholder="Contoh: Kemudahan bilik basuh teratur, felo sangat prihatin, proses pemulangan drop-key sangat cepat..." 
                value={bestAspect} 
                onChange={e => setBestAspect(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                2. Cadangan Penambahbaikan Utama (Pilihan)
              </label>
              <textarea 
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none h-16 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                placeholder="Contoh: Tingkatkan kelajuan Wi-Fi di Blok C, tambah pencahayaan di laluan pejalan kaki belakang..." 
                value={suggestions} 
                onChange={e => setSuggestions(e.target.value)} 
              />
            </div>
          </div>

          {/* BUTANG TINDAKAN */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            {onClose && (
              <Button 
                type="button" 
                variant="outline" 
                className="text-xs h-10 px-4 rounded-xl border-slate-300" 
                onClick={onClose}
              >
                Nanti / Tutup
              </Button>
            )}
            <Button 
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm h-10 font-bold rounded-xl shadow-md gap-2 cursor-pointer" 
              onClick={submit} 
              disabled={saving}
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Menghantar Maklum Balas...' : 'Hantar Kajian Kepuasan Pelajar'}</span>
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}