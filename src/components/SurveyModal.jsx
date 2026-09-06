import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const QUESTIONS = [
  { key: 'room_satisfaction', label: 'Room Condition & Cleanliness' },
  { key: 'facility_satisfaction', label: 'Facility Quality (gym, hall, courts)' },
  { key: 'internet_satisfaction', label: 'Internet Connectivity' },
  { key: 'staff_satisfaction', label: 'Staff Service Quality' },
  { key: 'security_satisfaction', label: 'Security & Safety' },
  { key: 'overall_satisfaction', label: 'Overall Satisfaction' },
];

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star className={`w-6 h-6 ${n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
      <span className="text-sm text-muted-foreground ml-1 mt-0.5">{value > 0 ? `${value}/5` : ''}</span>
    </div>
  );
}

export default function SurveyModal({ open, onClose, onComplete, user, student, checkoutId }) {
  const [ratings, setRatings] = useState({ room_satisfaction: 0, facility_satisfaction: 0, internet_satisfaction: 0, staff_satisfaction: 0, security_satisfaction: 0, overall_satisfaction: 0 });
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const incomplete = QUESTIONS.some(q => !ratings[q.key]);
    if (incomplete) { toast({ title: 'Sila lengkapkan semua kategori penilaian', variant: 'destructive' }); return; }
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
        comments,
        suggestions,
        checkout_id: checkoutId || '',
      });
      toast({ title: 'Terima kasih atas maklum balas anda!' });
      onComplete?.();
      onClose?.();
    } catch (err) {
      console.error('Survey submission error:', err);
      toast({ title: 'Ralat menghantar tinjauan', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && onClose) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={e => { if (!onClose) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Kajian Kepuasan Pelajar (End-of-Semester Survey)</DialogTitle>
          <p className="text-xs text-muted-foreground">Maklum balas anda membantu pihak pengurusan Kolej Kediaman Tun Fuad meningkatkan mutu perkhidmatan.</p>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {QUESTIONS.map(q => (
            <div key={q.key} className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-800 mb-1">{q.label}</p>
              <StarRating value={ratings[q.key]} onChange={v => setRatings(r => ({ ...r, [q.key]: v }))} />
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold text-slate-800 mb-1">Komen / Catatan Tambahan</p>
            <textarea className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-16 bg-white" placeholder="Kongsi pengalaman anda sepanjang menetap di kolej..." value={comments} onChange={e => setComments(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 mb-1">Cadangan Penambahbaikan</p>
            <textarea className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-16 bg-white" placeholder="Apakah aspek yang boleh kami perbaiki?" value={suggestions} onChange={e => setSuggestions(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            {onClose && (
              <Button type="button" variant="outline" className="text-xs h-9 px-4 rounded-xl" onClick={onClose}>
                Nanti / Tutup
              </Button>
            )}
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold rounded-xl shadow-xs" onClick={submit} disabled={saving}>
              {saving ? 'Menghantar Maklum Balas...' : 'Hantar Kajian Kepuasan Pelajar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}