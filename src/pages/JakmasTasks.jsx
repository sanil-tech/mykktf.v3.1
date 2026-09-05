import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { ClipboardList, CheckCircle2, Play, Send, FileText, Clock } from 'lucide-react';
import { logJakmasAudit, isActiveAppointment, todayISO } from '@/lib/jakmas';

const TASK_STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-500',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function JakmasTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [workTask, setWorkTask] = useState(null);
  const [progress, setProgress] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [tks, appts] = await Promise.all([
        base44.entities.JakmasTask.filter({ assigned_to_user_id: u.id }),
        base44.entities.JakmasAppointment.filter({ student_user_id: u.id }),
      ]);
      const today = todayISO();
      setAppointment(appts.find((a) => isActiveAppointment(a, today)) || null);
      setTasks(tks.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
    } catch (e) {
      toast({ title: 'Gagal memuatkan tugas', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidenceUrl(file_url);
      toast({ title: 'Bukti di muat naik' });
    } catch (e) {
      toast({ title: 'Muat naik gagal', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(task, newStatus, extra = {}) {
    const now = new Date().toISOString();
    const updates = { status: newStatus, ...extra };
    if (newStatus === 'acknowledged' && !task.acknowledged_at) updates.acknowledged_at = now;
    if (newStatus === 'in_progress' && !task.started_at) updates.started_at = now;
    if (newStatus === 'submitted') updates.submitted_at = now;
    try {
      await base44.entities.JakmasTask.update(task.id, updates);
      const actionMap = {
        acknowledged: 'JAKMAS_TASK_ACKNOWLEDGED',
        in_progress: 'JAKMAS_TASK_STARTED',
        submitted: 'JAKMAS_TASK_SUBMITTED',
      };
      await logJakmasAudit(user, actionMap[newStatus] || 'JAKMAS_TASK_UPDATED', 'JAKMAS', { task_id: task.id, title: task.title });
      toast({ title: `Status: ${newStatus}` });
      setWorkTask(null);
      setProgress('');
      setEvidenceUrl('');
      init();
    } catch (e) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  }

  async function saveProgress(task) {
    const updates = { progress_notes: progress || task.progress_notes || '' };
    if (evidenceUrl) updates.evidence_url = evidenceUrl;
    await base44.entities.JakmasTask.update(task.id, updates);
    await logJakmasAudit(user, 'JAKMAS_TASK_UPDATED', 'JAKMAS', { task_id: task.id, title: task.title });
    toast({ title: 'Kemajuan disimpan' });
    setWorkTask(null);
    setProgress('');
    setEvidenceUrl('');
    init();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!appointment) {
    return (
      <div>
        <PageHeader title="My JAKMAS Tasks" description="Tugas JAKMAS anda" />
        <EmptyState icon={ClipboardList} title="No active JAKMAS appointment" description="Anda tiada pelantikan JAKMAS aktif. Hubungi pentadbir kolej." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My JAKMAS Tasks" description={`${appointment.position || 'JAKMAS'} · ${appointment.portfolio || '-'}`} />

      {/* Identity */}
      <div className="bg-primary text-primary-foreground rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-emerald-400/90 text-emerald-950">JAKMAS — ACTIVE</Badge>
          <span className="text-xs opacity-80">Student</span>
        </div>
        <h2 className="text-lg font-heading font-bold">{user?.full_name || 'JAKMAS'}</h2>
        <p className="text-sm opacity-80">Student ID: {appointment.student_id || '-'}</p>
        <p className="text-xs opacity-70 mt-1">
          Position: {appointment.position || '-'} · Portfolio: {appointment.portfolio || '-'} · Term: {appointment.term_start || '-'} → {appointment.term_end || 'open'}
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks assigned" description="Tugas yang ditugaskan kepada anda akan dipaparkan di sini." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{t.title}</h3>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={TASK_STATUS_COLORS[t.status]}>{t.status}</Badge>
                    {t.priority && <Badge className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge>}
                    {t.deadline && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {t.deadline}</span>}
                    <span className="text-xs text-muted-foreground">by {t.created_by_name || '-'}</span>
                  </div>
                  {t.instructions && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{t.instructions}</p>}
                  {t.progress_notes && <div className="mt-2 text-xs"><span className="font-medium">Progress:</span> <span className="text-muted-foreground">{t.progress_notes}</span></div>}
                  {t.evidence_url && <div className="mt-1"><a href={t.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><FileText className="w-3 h-3" /> View evidence</a></div>}
                  {t.admin_feedback && <div className="mt-2 p-2 bg-muted/50 rounded text-xs"><span className="font-medium">Admin feedback:</span> {t.admin_feedback}</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {t.status === 'assigned' && (
                  <Button size="sm" onClick={() => updateStatus(t, 'acknowledged')}><CheckCircle2 className="w-4 h-4" /> Acknowledge</Button>
                )}
                {(t.status === 'acknowledged' || t.status === 'returned') && (
                  <Button size="sm" onClick={() => updateStatus(t, 'in_progress')}><Play className="w-4 h-4" /> Start</Button>
                )}
                {(t.status === 'in_progress' || t.status === 'acknowledged') && (
                  <Button size="sm" variant="outline" onClick={() => { setWorkTask(t); setProgress(t.progress_notes || ''); setEvidenceUrl(t.evidence_url || ''); }}>
                    <FileText className="w-4 h-4" /> Update / Submit
                  </Button>
                )}
                {t.status === 'submitted' && <Badge className="bg-purple-100 text-purple-700">Awaiting admin review</Badge>}
                {t.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update / Submit dialog */}
      <Dialog open={!!workTask} onOpenChange={(o) => !o && setWorkTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update & Submit Task</DialogTitle></DialogHeader>
          {workTask && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{workTask.title}</p>
              <div>
                <Label className="text-xs">Progress Notes</Label>
                <Textarea value={progress} onChange={(e) => setProgress(e.target.value)} rows={4} placeholder="Kemas kini kemajuan..." />
              </div>
              <div>
                <Label className="text-xs">Evidence (optional)</Label>
                <Input type="file" onChange={(e) => handleUpload(e.target.files?.[0])} disabled={uploading} />
                {evidenceUrl && <p className="text-xs text-emerald-600 mt-1">Bukti di muat naik ✓</p>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => workTask && saveProgress(workTask)} disabled={uploading}>Save Progress</Button>
            <Button onClick={() => workTask && updateStatus(workTask, 'submitted', { progress_notes: progress || workTask.progress_notes || '', evidence_url: evidenceUrl || workTask.evidence_url || '' })} disabled={uploading}>
              <Send className="w-4 h-4" /> Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}