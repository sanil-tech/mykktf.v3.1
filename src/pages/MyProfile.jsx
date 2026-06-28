import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, Save, Loader2, Building2, Plus, X } from 'lucide-react';

export default function MyProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);

    const user = await base44.auth.me();
    setCurrentUser(user);

    let studs = await base44.entities.Student.filter({ user_id: user.id });
    if (!studs.length) studs = await base44.entities.Student.filter({ email: user.email });

    const s = studs[0] || null;

    if (s && !s.user_id) {
      await base44.entities.Student.update(s.id, { user_id: user.id });
      s.user_id = user.id;
    }

    setStudent(s);

    setForm(s ? { ...s } : {
      full_name: user.full_name || '',
      phone: '',
      email: user.email || '',
      faculty: '',
      programme: '',
      year_of_study: 1,
    });

    setLoading(false);
  }

  async function refreshStudent() {
    const user = await base44.auth.me();
    setCurrentUser(user);

    const studs = await base44.entities.Student.filter({ user_id: user.id });
    const updated = studs[0] || null;

    setStudent(updated);
    if (updated) setForm(updated);
  }

  async function handleSave() {
    if (!form.full_name || !form.phone) {
      toast({ title: 'Full name and phone are required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (student) {
      await base44.entities.Student.update(student.id, {
        ...form,
        user_id: currentUser.id,
      });
    } else {
      await base44.entities.Student.create({
        ...form,
        user_id: currentUser.id,
      });
    }

    // 🔥 IMPORTANT: refresh data so sidebar/topbar updates instantly
    await refreshStudent();

    toast({ title: 'Profile updated successfully' });

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" description="View and update your personal information" />

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">

        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>

          <div>
            {/* 🔥 FIX: use STUDENT not auth */}
            <p className="font-heading font-semibold text-base">
              {student?.full_name}
            </p>
            <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentUser?.role}</p>
          </div>
        </div>

        {/* FORM */}
        <div>
          <Label>Full Name</Label>
          <Input
            value={form.full_name || ''}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>

        <div>
          <Label>Phone</Label>
          <Input
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}