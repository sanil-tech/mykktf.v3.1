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

export default function SurveyModal({ open, onComplete, user, student, checkoutId }) {
  const [ratings, setRatings] = useState({ room_satisfaction: 0, facility_satisfaction: 0, internet_satisfaction: 0, staff_satisfaction: 0, security_satisfaction: 0, overall_satisfaction: 0 });
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const incomplete = QUESTIONS.some(q => !ratings[q.key]);
    if (incomplete) { toast({ title: 'Please rate all categories', variant: 'destructive' }); return; }
    setSaving(true);
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
    toast({ title: 'Thank you for your feedback!' });
    setSaving(false);
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>End-of-Semester Satisfaction Survey</DialogTitle>
          <p className="text-sm text-muted-foreground">Please complete this mandatory survey before check-out.</p>
        </DialogHeader>
        <div className="space-y-4">
          {QUESTIONS.map(q => (
            <div key={q.key}>
              <p className="text-sm font-medium mb-1.5">{q.label}</p>
              <StarRating value={ratings[q.key]} onChange={v => setRatings(r => ({ ...r, [q.key]: v }))} />
            </div>
          ))}
          <div>
            <p className="text-sm font-medium mb-1.5">Comments</p>
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-20" placeholder="Any comments about your stay..." value={comments} onChange={e => setComments(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5">Suggestions for Improvement</p>
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-16" placeholder="How can we do better?" value={suggestions} onChange={e => setSuggestions(e.target.value)} />
          </div>
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Survey & Continue Check-Out'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}