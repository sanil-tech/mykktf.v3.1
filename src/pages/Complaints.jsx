import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, MessageSquare, Lightbulb, Eye, CheckCircle } from 'lucide-react';

const CATEGORIES = ['Facilities', 'Internet', 'Security', 'Cleanliness', 'Staff Services', 'Others'];
const STATUS_FLOW = ['Submitted', 'Under Review', 'Resolved', 'Closed'];
const STATUS_COLORS = {
  Submitted: 'bg-gray-100 text-gray-700',
  'Under Review': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-500',
};
const STAFF_ROLES = ['super_admin', 'college_admin', 'warden', 'staff'];

export default function Complaints() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [response, setResponse] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ type: 'Complaint', category: 'Facilities', title: '', description: '', is_anonymous: false });

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);
    const isStaff = STAFF_ROLES.includes(u.role);
    let data = [];
    if (isStaff) {
      if (u.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: u.id });
        const all = await base44.entities.Complaint.list('-created_date');
        const blockNames = wb.map(w => w.block_name);
        data = blockNames.length > 0 ? all.filter(c => !c.block_name || blockNames.includes(c.block_name)) : all;
      } else {
        data = await base44.entities.Complaint.list('-created_date');
      }
    } else {
      data = await base44.entities.Complaint.filter({ student_user_id: u.id }, '-created_date');
      let sp = await base44.entities.Student.filter({ user_id: u.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
      if (sp.length) setStudent(sp[0]);
    }
    setItems(data);
    setLoading(false);
  }

  async function submit() {
    if (!form.title || !form.description) { toast({ title: 'Fill in all required fields', variant: 'destructive' }); return; }
    const payload = {
      ...form,
      student_user_id: user.id,
      student_id: student?.student_id || '',
      student_name: form.is_anonymous ? 'Anonymous' : (student?.full_name || user.full_name || user.email),
      block_name: student?.block_name || '',
      room_number: student?.room_number || '',
    };
    await base44.entities.Complaint.create(payload);
    toast({ title: `${form.type} submitted successfully` });
    setShowForm(false);
    setForm({ type: 'Complaint', category: 'Facilities', title: '', description: '', is_anonymous: false });
    init();
  }

  async function updateStatus(id, status) {
    await base44.entities.Complaint.update(id, { status, resolved_by: user.full_name || user.email, resolved_at: new Date().toISOString() });
    if (viewing?.id === id) setViewing(v => ({ ...v, status }));
    init();
  }

  async function saveResponse(id) {
    const isWarden = user.role === 'warden';
    const update = isWarden ? { warden_response: response } : { admin_response: response };
    await base44.entities.Complaint.update(id, update);
    const item = items.find(i => i.id === id);
    if (item?.student_user_id && !item.is_anonymous) {
      await base44.entities.Notification.create({ user_id: item.student_user_id, title: 'Response on your submission', message: `Your ${item.type} has received a response.`, type: 'general', link: '/complaints' });
    }
    toast({ title: 'Response saved' });
    setResponse('');
    setViewing(null);
    init();
  }

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Complaints & Suggestions"
        description="Submit and track complaints or suggestions"
        actions={!isStaff && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Submission</Button>}
      />
      <div className="flex gap-2 mb-4">
        {['all', 'Complaint', 'Suggestion'].map(t => (
          <Button key={t} size="sm" variant={filterType === t ? 'default' : 'outline'} onClick={() => setFilterType(t)}>
            {t === 'all' ? 'All' : t}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No submissions found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'Complaint' ? 'bg-red-100' : 'bg-blue-100'}`}>
                  {item.type === 'Complaint' ? <MessageSquare className="w-4 h-4 text-red-600" /> : <Lightbulb className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.category} · {item.is_anonymous ? 'Anonymous' : item.student_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewing(item); setResponse(''); }}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Submission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {['Complaint', 'Suggestion'].map(t => (
                <Button key={t} size="sm" variant={form.type === t ? 'default' : 'outline'} onClick={() => setForm(f => ({ ...f, type: t }))}>{t}</Button>
              ))}
            </div>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-24" placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
              Submit anonymously
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{viewing.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[viewing.status]}`}>{viewing.status}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{viewing.type}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{viewing.category}</span>
              </div>
              <p className="text-muted-foreground">{viewing.description}</p>
              {viewing.block_name && <p className="text-xs text-muted-foreground">Block: {viewing.block_name} · Room: {viewing.room_number}</p>}
              {viewing.admin_response && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-700 mb-1">Admin Response</p><p>{viewing.admin_response}</p></div>}
              {viewing.warden_response && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xs font-semibold text-green-700 mb-1">Warden Response</p><p>{viewing.warden_response}</p></div>}
              {isStaff && (
                <>
                  <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-20" placeholder="Write a response..." value={response} onChange={e => setResponse(e.target.value)} />
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_FLOW.filter(s => s !== viewing.status).map(s => (
                      <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(viewing.id, s)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> {s}
                      </Button>
                    ))}
                    {response && <Button size="sm" onClick={() => saveResponse(viewing.id)}>Save Response</Button>}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}