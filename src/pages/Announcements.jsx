import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Megaphone, AlertTriangle, Info, Bell, CheckCircle, BarChart2, Image, X, Users, Calendar } from 'lucide-react';
import { ListSkeleton } from '@/components/shared/ListSkeletons';
import { computeEffectiveRole, fetchActiveJakmasAppointment } from '@/lib/jakmas';
import { logAudit } from '@/lib/audit';

const TYPE_CONFIG = {
  'General Notice': { icon: Info, bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  'Emergency Notice': { icon: AlertTriangle, bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
  'Event Notice': { icon: Megaphone, bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
  'Default': { icon: Info, bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-700' }
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
// JAKMAS may submit official notices for admin approval AND publish non-official
// student content directly.
const JAKMAS_AVAILABLE_TYPES = [...OFFICIAL_TYPES, ...JAKMAS_TYPES];
const APPROVAL_BADGE = {
  pending_approval: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function Announcements() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [rawReads, setRawReads] = useState([]); // Stores complete list of read logs for admin lookup
  const [readMap, setReadMap] = useState({});
  const [readCounts, setReadCounts] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [acknowledgeModal, setAcknowledgeModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // States for viewing individual reader details
  const [activeTrackingAnn, setActiveTrackingAnn] = useState(null);
  const [trackingSearch, setTrackingSearch] = useState('');

  const fileInputRef = useRef(null);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState('');
  
  const [form, setForm] = useState({ 
    title: '', 
    content: '', 
    type: 'General Notice', 
    priority: 'General', 
    publish_date: new Date().toISOString().split('T')[0], 
    expiry_date: '',
    poster_url: ''
  });

  useEffect(() => { init(); }, []);

  async function init() {
    const raw = await base44.auth.me();
    const appt = await fetchActiveJakmasAppointment(raw.id);
    const u = { ...raw, effectiveRole: computeEffectiveRole(raw.role, appt), jakmasAppointment: appt };
    setUser(u);
    const role = u.effectiveRole;
    const [allAnn, reads, students] = await Promise.all([
      base44.entities.Announcement.list('-publish_date'),
      (role === 'student') ? base44.entities.AnnouncementRead.filter({ student_user_id: u.id }) : base44.entities.AnnouncementRead.list(),
      (ADMIN_ROLES.includes(role) || role === 'jakmas') ? base44.entities.Student.filter({ status: 'Active' }) : Promise.resolve([]),
    ]);
    let ann = allAnn;
    // Students only see published notices. JAKMAS sees published + their own
    // pending/rejected submissions. Admins/wardens see everything (to review).
    if (role === 'student') {
      ann = allAnn.filter(a => !a.approval_status || a.approval_status === 'published');
    } else if (role === 'jakmas') {
      ann = allAnn.filter(a => !a.approval_status || a.approval_status === 'published' || a.created_by_id === u.id);
    }
    setAnnouncements(ann);
    setTotalStudents(students.length);

    if (role === 'student') {
      const map = {};
      reads.forEach(r => { map[r.announcement_id] = r; });
      setReadMap(map);
      const criticalUnread = ann.filter(a => a.priority === 'Critical' && !map[a.id]);
      if (criticalUnread.length > 0) setAcknowledgeModal(criticalUnread[0]);
    } else {
      setRawReads(reads); // Keep array reference alive for mapping lists
      const counts = {};
      reads.forEach(r => {
        if (!counts[r.announcement_id]) counts[r.announcement_id] = 0;
        counts[r.announcement_id]++;
      });
      setReadCounts(counts);
    }
    setLoading(false);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  }

  function clearPoster() {
    setPosterFile(null);
    setPosterPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function markRead(ann) {
    if (!user || user.effectiveRole !== 'student') return;
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
    let finalForm = { ...form };
    if (posterFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: posterFile });
      finalForm.poster_url = file_url;
    }

    // JAKMAS-submitted official notices require admin approval before publishing;
    // non-official JAKMAS content and admin/warden posts publish directly.
    const needsApproval = isJakmas && OFFICIAL_TYPES.includes(finalForm.type);
    const approval_status = needsApproval ? 'pending_approval' : 'published';
    await base44.entities.Announcement.create({ ...finalForm, published_by: user?.full_name || user?.email, approval_status });
    await logAudit(user, needsApproval ? 'ANNOUNCEMENT_SUBMITTED' : 'ANNOUNCEMENT_PUBLISHED', 'Announcements', { title: finalForm.title, type: finalForm.type });
    if (!needsApproval) {
      base44.functions.invoke('sendNotificationEmail', { type: 'announcement', title: finalForm.title, message: finalForm.content }).catch(() => {});
    }
    toast({ title: needsApproval ? 'Submitted for admin approval' : 'Announcement published' });
    setShowForm(false);
    clearPoster();
    setForm({ 
      title: '', 
      content: '', 
      type: user?.effectiveRole === 'jakmas' ? JAKMAS_TYPES[0] : 'General Notice', 
      priority: 'General', 
      publish_date: new Date().toISOString().split('T')[0], 
      expiry_date: '',
      poster_url: ''
    });
    init();
  }

  async function remove(id) {
    if (!confirm('Delete this announcement?')) return;
    await base44.entities.Announcement.delete(id);
    await logAudit(user, 'ANNOUNCEMENT_DELETED', 'Announcements', { id });
    toast({ title: 'Deleted' });
    init();
  }

  async function approve(id) {
    const ann = announcements.find(a => a.id === id);
    await base44.entities.Announcement.update(id, { approval_status: 'published' });
    await logAudit(user, 'ANNOUNCEMENT_APPROVED', 'Announcements', { id, title: ann?.title });
    base44.functions.invoke('sendNotificationEmail', { type: 'announcement', title: ann?.title, message: ann?.content }).catch(() => {});
    toast({ title: 'Approved & published' });
    init();
  }

  async function reject(id) {
    const feedback = prompt('Sebab penolakan (pilihan):', '') || '';
    await base44.entities.Announcement.update(id, { approval_status: 'rejected', approval_feedback: feedback });
    await logAudit(user, 'ANNOUNCEMENT_REJECTED', 'Announcements', { id, feedback });
    toast({ title: 'Notice ditolak' });
    init();
  }

  const role = user?.effectiveRole;
  const canPublish = user && PUBLISH_ROLES.includes(role);
  const isAdmin = user && ADMIN_ROLES.includes(role);
  const isStudent = role === 'student';
  const isJakmas = role === 'jakmas';
  const availableTypes = isJakmas ? JAKMAS_AVAILABLE_TYPES : OFFICIAL_TYPES;

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, type: user.effectiveRole === 'jakmas' ? JAKMAS_TYPES[0] : 'General Notice' }));
    }
  }, [user]);

  // Extract readers matching active modal choice
  const activeReadersList = rawReads
    .filter(r => r.announcement_id === activeTrackingAnn?.id)
    .filter(r => r.student_name?.toLowerCase().includes(trackingSearch.toLowerCase()));

  if (loading) return <div><PageHeader title="Announcements" description="College notices and updates" /><ListSkeleton count={5} /></div>;

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

      {/* Critical acknowledgement popup block */}
      {acknowledgeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border-2 border-red-500 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-red-600 uppercase tracking-wide">Critical Notice</span>
            </div>
            <h2 className="text-base font-bold mb-2">{acknowledgeModal.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{acknowledgeModal.content}</p>
            {acknowledgeModal.poster_url && (
              <img src={acknowledgeModal.poster_url} alt="Notice Poster" className="w-full h-auto rounded-lg mb-4 max-h-60 object-cover" />
            )}
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
            const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG['Default'];
            const Icon = cfg.icon;
            const isRead = isStudent && readMap[ann.id];
            return (
              <div
                key={ann.id}
                onClick={() => isStudent && markRead(ann)}
                className={`border rounded-xl p-4 transition-all ${isStudent ? 'cursor-pointer' : ''} ${cfg.bg} ${isStudent && !isRead ? 'ring-2 ring-primary/20' : 'opacity-80'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 w-full">
                    <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{ann.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[ann.priority || 'General']}`}>{ann.priority || 'General'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{ann.type}</span>
                        {ann.approval_status === 'pending_approval' && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${APPROVAL_BADGE.pending_approval}`}>Pending Approval</span>}
                        {ann.approval_status === 'rejected' && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${APPROVAL_BADGE.rejected}`} title={ann.approval_feedback || ''}>Rejected</span>}
                        {isStudent && isRead && <span className="text-xs text-green-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Read</span>}
                        {isStudent && !isRead && <span className="text-xs text-primary flex items-center gap-0.5"><Bell className="w-3 h-3" /> New</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{ann.content}</p>

                      {ann.approval_status === 'rejected' && ann.approval_feedback && (
                        <p className="text-xs text-red-600 italic mb-2">Sebab penolakan: {ann.approval_feedback}</p>
                      )}

                      {ann.poster_url && (
                        <div className="my-2 max-w-sm rounded-lg overflow-hidden border border-border bg-white">
                          <img src={ann.poster_url} alt="Announcement Poster" className="w-full h-auto max-h-64 object-contain" />
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{ann.publish_date}</span>
                        {ann.published_by && <span>By {ann.published_by}</span>}
                        
                        {/* Functional Read Counter Trigger Link */}
                        {!isStudent && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveTrackingAnn(ann); }} 
                            className="text-blue-600 font-medium hover:underline flex items-center gap-1 bg-white/40 px-2 py-0.5 rounded"
                          >
                            <Users className="w-3 h-3" /> {readCounts[ann.id] || 0} read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && ann.approval_status === 'pending_approval' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={(e) => { e.stopPropagation(); approve(ann.id); }}>Approve</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs bg-red-100 text-red-700 hover:bg-red-200" onClick={(e) => { e.stopPropagation(); reject(ann.id); }}>Reject</Button>
                      </>
                    )}
                    {(canPublish && !isJakmas) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); remove(ann.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isJakmas && ann.published_by === (user?.full_name || user?.email) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); remove(ann.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Student Reading Progress Modal */}
      <Dialog open={!!activeTrackingAnn} onOpenChange={(open) => { if(!open) { setActiveTrackingAnn(null); setTrackingSearch(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Read Confirmation Tracking</span>
              <span className="text-xs font-normal text-muted-foreground mr-4">Total: {readCounts[activeTrackingAnn?.id] || 0} Students</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-xs font-medium text-muted-foreground truncate bg-muted px-2.5 py-1.5 rounded">
              Notice: "{activeTrackingAnn?.title}"
            </p>
            <Input 
              placeholder="Search readers by name..." 
              value={trackingSearch} 
              onChange={e => setTrackingSearch(e.target.value)} 
              className="h-8 text-xs"
            />
            <div className="border border-border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
              {activeReadersList.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No matches found matching search filters.</div>
              ) : (
                activeReadersList.map(r => (
                  <div key={r.id} className="p-2.5 flex items-center justify-between text-xs bg-card hover:bg-muted/30">
                    <div className="font-medium truncate max-w-[200px]">{r.student_name}</div>
                    <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      {r.read_at ? new Date(r.read_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create form */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if(!open) clearPoster(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-24" placeholder="Content *" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            
            <div className="border border-input rounded-md p-3 bg-muted/20">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Notice Poster (Optional)</label>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              
              {!posterPreview ? (
                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <Image className="w-4 h-4 mr-2 text-muted-foreground" /> Upload Image / Poster
                </Button>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border bg-background max-h-40 flex justify-center">
                  <img src={posterPreview} alt="Upload preview" className="h-40 object-contain w-auto" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-90 shadow" onClick={clearPoster}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

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
            {isJakmas && OFFICIAL_TYPES.includes(form.type) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                Notis rasmi (General/Emergency/Event Notice) akan dihantar kepada pentadbir untuk kelulusan sebelum diterbitkan.
              </p>
            )}
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
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