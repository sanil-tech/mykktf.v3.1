import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Trash2, Megaphone, AlertTriangle, Info, Bell, CheckCircle, BarChart2 } from 'lucide-react';

const TYPE_CONFIG = {
  'General Notice': { icon: Info, bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  'Emergency Notice': { icon: AlertTriangle, bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
  'Event Notice': { icon: Megaphone, bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
};
const PRIORITY_CONFIG = {
  General: 'bg-gray-100 text-gray-600',
  Important: 'bg-yellow-100 text-yellow-700',
  Critical: 'bg-red-100 text-red-700',
};
const PUBLISH_ROLES = ['super_admin', 'college_admin', 'warden', 'jakmas'];
const ADMIN_ROLES = ['super_admin', 'college_admin'];
const OFFICIAL_TYPES = ['General Notice', 'Emergency Notice', 'Event Notice'];
const JAKMAS_TYPES = ['Student Activities', 'Sports', 'Community Programs', 'Volunteer Programs', 'Club Activities', 'General Student Notices'];

export default function Announcements() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [readMap, setReadMap] = useState({});
  const [readCounts, setReadCounts] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [acknowledgeModal, setAcknowledgeModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', type: 'General Notice', priority: 'General', publish_date: new Date().toISOString().split('T')[0], expiry_date: '' });
  const [announcementLink, setAnnouncementLink] = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);
    const [ann, reads, students] = await Promise.all([
      base44.entities.Announcement.list('-publish_date'),
      (u.role === 'student') ? base44.entities.AnnouncementRead.filter({ student_user_id: u.id }) : base44.entities.AnnouncementRead.list(),
      (ADMIN_ROLES.includes(u.role) || u.role === 'jakmas') ? base44.entities.Student.filter({ status: 'Active' }) : Promise.resolve([]),
    ]);
    setAnnouncements(ann);
    setTotalStudents(students.length);

    if (u.role === 'student') {
      const map = {};
      reads.forEach(r => { map[r.announcement_id] = r; });
      setReadMap(map);
      // Show critical unread first
      const criticalUnread = ann.filter(a => a.priority === 'Critical' && !map[a.id]);
      if (criticalUnread.length > 0) setAcknowledgeModal(criticalUnread[0]);
    } else {
      const counts = {};
      reads.forEach(r => {
        if (!counts[r.announcement_id]) counts[r.announcement_id] = 0;
        counts[r.announcement_id]++;
      });
      setReadCounts(counts);
    }
    setLoading(false);
  }

  async function markRead(ann) {
    if (!user || user.role !== 'student') return;
    if (readMap[ann.id]) return;
    await base44.entities.AnnouncementRead.create({
      announcement_id: ann.id,
      student_user_id: user.id,
      student_name: user.full_name || user.email,
      read_at: new Date().toISOString(),
      acknowledged: ann.priority === 'Critical',
    });
    setReadMap(m => ({ ...m, [ann.id]: { acknowledged: true } }));
  }

  async function acknowledgeAndClose(ann) {
    await markRead(ann);
    setAcknowledgeModal(null);
  }

  async function create() {
    if (!form.title || !form.content) { toast({ title: 'Title and content required', variant: 'destructive' }); return; }
    await base44.entities.Announcement.create({ ...form, published_by: user?.full_name || user?.email });
    toast({ title: 'Announcement published' });
    setShowForm(false);
    setForm({ title: '', content: '', type: 'General Notice', priority: 'General', publish_date: new Date().toISOString().split('T')[0], expiry_date: '' });
    init();
  }

  async function remove(id) {
    if (!confirm('Delete this announcement?')) return;
    await base44.entities.Announcement.delete(id);
    toast({ title: 'Deleted' });
    init();
  }

  const canPublish = user && PUBLISH_ROLES.includes(user.role);
  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const isStudent = user?.role === 'student';
  const isJakmas = user?.role === 'jakmas';
  const availableTypes = isJakmas ? JAKMAS_TYPES : OFFICIAL_TYPES;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="College notices and updates"
        actions={
          <div className="flex gap-2">
            {(isAdmin || isJakmas) && <Button size="sm" variant="outline" onClick={() => setShowAnalytics(true)}><BarChart2 className="w-4 h-4 mr-1" /> Analytics</Button>}
            {canPublish && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Post</Button>}
          </div>
        }
      />

      {/* Critical unread acknowledgement modal */}
      {acknowledgeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border-2 border-red-500 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-red-600 uppercase tracking-wide">Critical Notice</span>
            </div>
            <h2 className="text-base font-bold mb-2">{acknowledgeModal.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{acknowledgeModal.content}</p>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => acknowledgeAndClose(acknowledgeModal)}>
              <CheckCircle className="w-4 h-4 mr-2" /> I Acknowledge This Notice
            </Button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG['General Notice'];
            const Icon = cfg.icon;
            const isRead = isStudent && readMap[ann.id];
            return (
              <div
                key={ann.id}
                onClick={() => isStudent && markRead(ann)}
                className={`border rounded-xl p-4 transition-all cursor-pointer ${cfg.bg} ${isStudent && !isRead ? 'ring-2 ring-primary/20' : 'opacity-80'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{ann.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[ann.priority || 'General']}`}>{ann.priority || 'General'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{ann.type}</span>
                        {isStudent && isRead && <span className="text-xs text-green-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Read</span>}
                        {isStudent && !isRead && <span className="text-xs text-primary flex items-center gap-0.5"><Bell className="w-3 h-3" /> New</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{ann.content}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{ann.publish_date}</span>
                        {ann.published_by && <span>By {ann.published_by}</span>}
                        {!isStudent && <span className="text-blue-600">{readCounts[ann.id] || 0} read</span>}
                      </div>
                    </div>
                  </div>
                  {(canPublish && !isJakmas) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 shrink-0" onClick={(e) => { e.stopPropagation(); remove(ann.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {isJakmas && ann.published_by === (user?.full_name || user?.email) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 shrink-0" onClick={(e) => { e.stopPropagation(); remove(ann.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-28" placeholder="Content *" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General', 'Important', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Publish Date</label><Input type="date" value={form.publish_date} onChange={e => setForm(f => ({ ...f, publish_date: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Expiry Date</label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create}>Publish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Announcement Analytics</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {announcements.map(ann => {
              const reads = readCounts[ann.id] || 0;
              const pct = totalStudents > 0 ? Math.round((reads / totalStudents) * 100) : 0;
              return (
                <div key={ann.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium truncate">{ann.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{reads}/{totalStudents}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
                    <div className="bg-muted rounded p-1"><p className="font-bold">{totalStudents}</p><p className="text-muted-foreground">Recipients</p></div>
                    <div className="bg-green-50 rounded p-1"><p className="font-bold text-green-600">{reads}</p><p className="text-muted-foreground">Read</p></div>
                    <div className="bg-orange-50 rounded p-1"><p className="font-bold text-orange-600">{totalStudents - reads}</p><p className="text-muted-foreground">Unread</p></div>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-right text-muted-foreground mt-0.5">{pct}% read</p>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}