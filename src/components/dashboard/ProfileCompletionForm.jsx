import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { UserCircle2 } from 'lucide-react';

export default function ProfileCompletionForm({ user, onComplete }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    student_id: user?.student_id || '',
    gender: user?.gender || '',
    phone: user?.phone || '',
  });

  async function save() {
    if (!form.student_id || !form.gender) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: form.full_name,
        student_id: form.student_id,
        gender: form.gender,
        phone: form.phone,
        profile_completed: true,
      });
      toast({ title: 'Profile completed!' });
      onComplete();
    } catch (err) {
      toast({ title: 'Failed to save profile', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <UserCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-lg font-heading font-bold">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Please fill in your details to continue.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Student ID *</Label>
            <Input value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="h-9 text-sm mt-1" placeholder="e.g. 2024103456" />
          </div>
          <div>
            <Label className="text-xs">Gender *</Label>
            <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-sm mt-1" placeholder="01x-xxxxxxx" />
          </div>
          <Button className="w-full mt-2" disabled={saving} onClick={save}>
            {saving ? 'Saving...' : 'Complete Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}