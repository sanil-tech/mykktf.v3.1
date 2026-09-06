import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserCog, Plus, ShieldAlert, ChevronDown, ShieldCheck, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logAudit } from '@/lib/audit';
import EmptyState from '@/components/shared/EmptyState';
import { ALL_KKTF_BLOCKS, isSameBlock } from '@/lib/kktfBlocks';

const ADMIN_ROLES = ['super_admin', 'college_admin', 'principal'];

export default function BlockAssignment() {
  const [assignments, setAssignments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [form, setForm] = useState({ warden_user_id: '', block_ids: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [selectedWardenForTerm, setSelectedWardenForTerm] = useState(null);
  const [termInput, setTermInput] = useState('');
  const [savingTerm, setSavingTerm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const u = await base44.auth.me();
    setCurrentUser(u);
    const isPrincipal = u?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || u?.role === 'principal' || u?.effectiveRole === 'principal';
    // User.list() is admin-only; skip the restricted fetch for non-admins.
    if (!ADMIN_ROLES.includes(u?.role) && !isPrincipal) {
      setLoading(false);
      return;
    }
    const [a, b, wardensRes] = await Promise.all([
      base44.entities.WardenBlock.list().catch(() => []),
      base44.entities.Block.list().catch(() => []),
      base44.functions.invoke('getAllWardens', {}).catch(() => ({ wardens: [] })),
    ]);

    // Ensure all 14 residential blocks of KKTF exist in blocks list
    let fullBlocks = Array.isArray(b) ? [...b] : [];
    const existingBlockNames = new Set(fullBlocks.map(blk => (blk.block_name || '').replace(/^(block|blok)\s+/i, '').trim().toUpperCase()));

    ALL_KKTF_BLOCKS.forEach(bName => {
      const clean = bName.replace(/^(block|blok)\s+/i, '').trim().toUpperCase();
      if (!existingBlockNames.has(clean)) {
        fullBlocks.push({
          id: `kktf_block_${clean.toLowerCase()}`,
          block_name: bName,
          gender_restriction: ['I', 'J', 'K', 'L', 'M', 'N'].includes(clean) ? 'Male' : 'Female',
          total_floors: 4
        });
      }
    });

    fullBlocks.sort((x, y) => (x.block_name || '').localeCompare(y.block_name || '', undefined, { numeric: true }));

    let wardensList = Array.isArray(wardensRes?.data?.wardens || wardensRes?.wardens) 
      ? [...(wardensRes?.data?.wardens || wardensRes?.wardens)] 
      : [];

    // Ensure all registered staff / admins / wardens can be selected by Pengetua for block appointment
    try {
      const allUsers = await base44.entities.User.list();
      if (Array.isArray(allUsers)) {
        allUsers.forEach(usr => {
          if (['warden', 'felo', 'super_admin', 'college_admin', 'staff'].includes(usr.role) || usr.email?.toLowerCase() === 'sanil@ums.edu.my') {
            if (!wardensList.some(w => w.id === usr.id || (w.email && usr.email && w.email.toLowerCase() === usr.email.toLowerCase()))) {
              wardensList.push({
                id: usr.id,
                full_name: usr.full_name || usr.email,
                email: usr.email,
                role: usr.role
              });
            }
          }
        });
      }
    } catch (e) {}

    // Ensure current user (e.g. Sanil / Super Admin) is available for Pengetua to assign
    if (u && !wardensList.some(w => w.id === u.id || (w.email && u.email && w.email.toLowerCase() === u.email.toLowerCase()))) {
      wardensList.push({
        id: u.id,
        full_name: u.full_name || u.email,
        email: u.email,
        role: u.role
      });
    }

    // Also include any wardens already in assignments
    if (Array.isArray(a)) {
      a.forEach(assign => {
        if (assign.warden_user_id && !wardensList.some(w => w.id === assign.warden_user_id)) {
          wardensList.push({
            id: assign.warden_user_id,
            full_name: assign.warden_name || assign.warden_email,
            email: assign.warden_email
          });
        }
      });
    }

    setAssignments(Array.isArray(a) ? a : []);
    setBlocks(fullBlocks);
    setWardens(wardensList);
    setLoading(false);
  }

  async function addAssignment() {
    if (!form.warden_user_id || form.block_ids.length === 0) return;
    const warden = wardens.find(w => w.id === form.warden_user_id);
    const toCreate = form.block_ids
      .map(bid => blocks.find(b => b.id === bid))
      .filter(Boolean)
      .filter(b => !assignments.find(a => 
        a.warden_user_id === form.warden_user_id && 
        (a.block_id === b.id || (a.block_name && b.block_name && isSameBlock(a.block_name, b.block_name)))
      ));
    if (toCreate.length === 0) {
      toast({ title: 'Blok sudah ditugaskan kepada warden ini', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const existingTerm = localStorage.getItem(`warden_term_${form.warden_user_id}`) || 'Sesi 2025/2026 (1 Ogos 2025 – 31 Julai 2026)';
    await base44.entities.WardenBlock.bulkCreate(toCreate.map(b => ({
      warden_user_id: form.warden_user_id,
      warden_name: warden?.full_name || warden?.email || '',
      warden_email: warden?.email || '',
      block_id: b.id,
      block_name: b.block_name || '',
      appointment_term: existingTerm
    })));
    await logAudit(currentUser, 'WARDEN_BLOCK_ASSIGNED', 'Block Assignment', { warden: warden?.full_name || warden?.email, blocks: toCreate.map(b => b.block_name) });
    toast({ title: `${toCreate.length} blok ditugaskan` });
    setForm({ warden_user_id: '', block_ids: [] });
    setSaving(false);
    load();
  }

  async function removeAssignment(id) {
    await base44.entities.WardenBlock.delete(id);
    await logAudit(currentUser, 'WARDEN_BLOCK_UNASSIGNED', 'Block Assignment', { id });
    toast({ title: 'Assignment removed' });
    load();
  }

  async function saveWardenTerm() {
    if (!selectedWardenForTerm || !termInput.trim()) return;
    setSavingTerm(true);
    try {
      const wbRecords = assignments.filter(a => a.warden_user_id === selectedWardenForTerm.id);
      for (const rec of wbRecords) {
        await base44.entities.WardenBlock.update(rec.id, { appointment_term: termInput.trim() }).catch(() => {});
      }
      localStorage.setItem(`warden_term_${selectedWardenForTerm.id}`, termInput.trim());
      await logAudit(currentUser, 'WARDEN_TERM_UPDATED', 'Block Assignment', {
        warden: selectedWardenForTerm.name || selectedWardenForTerm.email,
        term: termInput.trim(),
        authorized_by: currentUser?.full_name || 'Pengetua Kolej'
      });
      toast({ title: 'Term lantikan felo berjaya dikemas kini oleh Pengetua' });
      setTermModalOpen(false);
      load();
    } catch (err) {
      toast({ title: 'Ralat mengemaskini term lantikan', variant: 'destructive' });
    } finally {
      setSavingTerm(false);
    }
  }

  const byWarden = assignments.reduce((acc, a) => {
    if (!acc[a.warden_user_id]) {
      const savedTerm = localStorage.getItem(`warden_term_${a.warden_user_id}`) || a.appointment_term || 'Sesi 2025/2026';
      acc[a.warden_user_id] = { id: a.warden_user_id, name: a.warden_name, email: a.warden_email, blocks: [], appointment_term: savedTerm };
    }
    acc[a.warden_user_id].blocks.push(a);
    if (a.appointment_term) acc[a.warden_user_id].appointment_term = a.appointment_term;
    return acc;
  }, {});

  const isPrincipal = currentUser?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || currentUser?.role === 'principal' || currentUser?.effectiveRole === 'principal';

  if (!loading && currentUser && !ADMIN_ROLES.includes(currentUser.role) && !isPrincipal) {
    return <EmptyState icon={ShieldAlert} title="Akses Ditolak" description="Hanya Super Admin, Pengetua Kolej, dan Pentadbir Kolej boleh menguruskan tugasan blok warden." />;
  }

  return (
    <div>
      <PageHeader title="Block Assignments" description="Assign wardens to residential blocks" />
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> New Assignment</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={form.warden_user_id} onValueChange={v => setForm(f => ({ ...f, warden_user_id: v }))}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select Warden" /></SelectTrigger>
            <SelectContent>{wardens.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name || w.email}</SelectItem>)}</SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                {form.block_ids.length === 0
                  ? <span className="text-muted-foreground">Select Block(s) — boleh pilih beberapa</span>
                  : <span className="truncate">{blocks.filter(b => form.block_ids.includes(b.id)).map(b => b.block_name).join(', ')}</span>}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="max-h-60 overflow-y-auto p-1">
                {blocks.map(b => {
                  const checked = form.block_ids.includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        setForm(f => v
                          ? { ...f, block_ids: [...f.block_ids, b.id] }
                          : { ...f, block_ids: f.block_ids.filter(id => id !== b.id) });
                      }} />
                      <span>{b.block_name}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={addAssignment} disabled={saving || !form.warden_user_id || form.block_ids.length === 0} className="shrink-0">Assign</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : Object.keys(byWarden).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No block assignments yet.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byWarden).map(([uid, data]) => (
            <div key={uid} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground block">{data.name || data.email}</span>
                    <span className="text-xs text-muted-foreground">{data.email}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1 py-1">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Term: {data.appointment_term || 'Sesi 2025/2026'}
                  </Badge>

                  {(currentUser?.role === 'principal' || currentUser?.role === 'super_admin' || currentUser?.role === 'college_admin' || isPrincipal) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-800 gap-1 px-2.5 rounded-lg"
                      onClick={() => {
                        setSelectedWardenForTerm(data);
                        setTermInput(data.appointment_term || 'Sesi 2025/2026');
                        setTermModalOpen(true);
                      }}
                      title="Kuasa Pengetua Kolej untuk menetapkan tempoh sesi lantikan felo"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Kuasa Pengetua: Tetapkan Term
                    </Button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border">
                {data.blocks.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{a.block_name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg" onClick={() => removeAssignment(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PENETAPAN TERM LANTIKAN WARDEN OLEH PENGETUA */}
      <Dialog open={termModalOpen} onOpenChange={setTermModalOpen}>
        <DialogContent className="max-w-md bg-card rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Penetapan Term Lantikan Felo / Warden
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kuasa eksklusif Pengetua Kolej Kediaman Tun Fuad untuk menguruskan tempoh perkhidmatan lantikan felo.
            </DialogDescription>
          </DialogHeader>

          {selectedWardenForTerm && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <p className="font-bold text-foreground text-sm">{selectedWardenForTerm.name || selectedWardenForTerm.email}</p>
                <p className="text-muted-foreground text-xs">{selectedWardenForTerm.email}</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Tempoh / Sesi Lantikan Rasmi *</Label>
                <Input 
                  value={termInput} 
                  onChange={e => setTermInput(e.target.value)} 
                  placeholder="cth: Sesi 2025/2026 (1 Ogos 2025 – 31 Julai 2026)" 
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-semibold">Cadangan Pantas:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['Sesi 2025/2026', 'Sesi 2025/2027 (2 Tahun)', '1 Ogos 2025 – 31 Julai 2026', 'Sesi 2026/2027'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTermInput(preset)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors font-medium"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-200">
                ℹ️ <em>Term yang ditetapkan oleh Pengetua di sini akan dipaparkan secara rasmi pada profil felo dan rekod pentadbiran kolej.</em>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setTermModalOpen(false)}>Batal</Button>
                <Button 
                  size="sm" 
                  disabled={savingTerm || !termInput.trim()} 
                  onClick={saveWardenTerm} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {savingTerm ? 'Menyimpan...' : 'Sahkan & Tetapkan Term'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}