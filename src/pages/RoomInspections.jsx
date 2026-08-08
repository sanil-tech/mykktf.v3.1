import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

const STATUS_COLORS = {
  Submitted: 'bg-yellow-100 text-yellow-700',
  Reviewed: 'bg-blue-100 text-blue-700',
  Verified: 'bg-green-100 text-green-700',
};
const PASS_FAIL = ['Pass', 'Fail', 'Needs Attention'];
const DAMAGE_OPTIONS = ['None', 'Minor', 'Major'];
const MANAGE_ROLES = ['super_admin', 'college_admin', 'warden', 'staff', 'jakmas'];

const emptyForm = {
  student_id: '', student_name: '', room_number: '', block_name: '',
  inspection_date: new Date().toISOString().split('T')[0],
  room_cleanliness: 'Pass', furniture_complete: 'Pass',
  visible_damage: 'None', resident_present: false,
  notes: '', flagged_issues: '',
};

export default function RoomInspections() {
  const [user, setUser] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);
    const [insp, studs] = await Promise.all([
      base44.entities.RoomInspection.list('-created_date'),
      base44.entities.Student.list(),
    ]);
    setInspections(insp);
    setStudents(studs);
    setLoading(false);
  }

  async function submit() {
    if (!form.student_name || !form.room_number || !form.inspection_date) {
      toast({ title: 'Fill required fields', variant: 'destructive' }); return;
    }
    await base44.entities.RoomInspection.create({
      ...form,
      inspected_by_user_id: user.id,
      inspected_by_name: user.full_name || user.email,
    });
    await base44.entities.AuditLog.create({
      user_id: user.id, user_name: user.full_name || user.email,
      action: 'Inspection Submitted', module: 'Room Inspections',
      details: `Room ${form.room_number} — ${form.student_name}`,
      timestamp: new Date().toISOString(),
    });
    toast({ title: 'Inspection submitted' });
    setShowForm(false);
    setForm(emptyForm);
    init();
  }

  async function updateStatus(id, status) {
    await base44.entities.RoomInspection.update(id, { status });
    setViewing(v => ({ ...v, status }));
    init();
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photos: file_url }));
    setUploading(false);
  }

  function prefillStudent(studentId) {
    const s = students.find(st => st.student_id === studentId);
    if (s) setForm(f => ({ ...f, student_id: s.student_id, student_name: s.full_name, room_number: s.room_number || '', block_name: s.block_name || '' }));
  }

  const canManage = user && MANAGE_ROLES.includes(user.role);
  const canVerify = user && ['super_admin', 'college_admin', 'warden', 'staff'].includes(user.role);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Room Inspections"
        description="Preliminary room inspection checklist"
        actions={canManage && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Inspection</Button>}
      />

      {inspections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No inspections yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Room</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Inspected By</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map(ins => (
                  <tr key={ins.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{ins.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ins.block_name ? `${ins.block_name} - ` : ''}{ins.room_number}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{ins.inspected_by_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{ins.inspection_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ins.status]}`}>{ins.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(ins)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Inspection Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preliminary Room Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Student ID</Label>
                <Select value={form.student_id} onValueChange={prefillStudent}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.student_id}>{s.student_id} — {s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Student Name *</Label><Input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Room Number *</Label><Input value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Block</Label><Input value={form.block_name} onChange={e => setForm(f => ({ ...f, block_name: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Inspection Date *</Label><Input type="date" value={form.inspection_date} onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} className="h-9 text-sm mt-1" /></div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Checklist</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Room Cleanliness</Label>
                <Select value={form.room_cleanliness} onValueChange={v => setForm(f => ({ ...f, room_cleanliness: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PASS_FAIL.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Furniture Complete</Label>
                <Select value={form.furniture_complete} onValueChange={v => setForm(f => ({ ...f, furniture_complete: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PASS_FAIL.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Visible Damage</Label>
                <Select value={form.visible_damage} onValueChange={v => setForm(f => ({ ...f, visible_damage: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAMAGE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="resident_present" checked={form.resident_present} onChange={e => setForm(f => ({ ...f, resident_present: e.target.checked }))} />
                <Label htmlFor="resident_present" className="text-xs cursor-pointer">Resident Present</Label>
              </div>
            </div>
            <div><Label className="text-xs">Flagged Issues</Label><Input value={form.flagged_issues} onChange={e => setForm(f => ({ ...f, flagged_issues: e.target.value }))} placeholder="Describe any issues..." className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Notes</Label><textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-16 mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Photos</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={uploadPhoto} className="text-xs" disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                {form.photos && <span className="text-xs text-green-600">✓ Uploaded</span>}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={submit}>Submit Inspection</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Inspection Dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Inspection Report</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Student', viewing.student_name], ['Room', `${viewing.block_name || ''} ${viewing.room_number}`],
                  ['Date', viewing.inspection_date], ['Inspected By', viewing.inspected_by_name],
                  ['Cleanliness', viewing.room_cleanliness], ['Furniture', viewing.furniture_complete],
                  ['Damage', viewing.visible_damage], ['Resident Present', viewing.resident_present ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <React.Fragment key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-xs font-medium">{v || '—'}</p>
                  </React.Fragment>
                ))}
              </div>
              {viewing.flagged_issues && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Flagged Issues</p>
                  <p className="text-xs">{viewing.flagged_issues}</p>
                </div>
              )}
              {viewing.notes && <p className="text-xs text-muted-foreground">{viewing.notes}</p>}
              {viewing.photos && <img src={viewing.photos} alt="inspection" className="w-full rounded-lg" />}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span>
              </div>
              {canVerify && viewing.status === 'Submitted' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(viewing.id, 'Reviewed')}>Mark Reviewed</Button>
                  <Button size="sm" onClick={() => updateStatus(viewing.id, 'Verified')}><CheckCircle className="w-3 h-3 mr-1" /> Verify</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}