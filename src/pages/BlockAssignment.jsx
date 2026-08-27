import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserCog, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logAudit } from '@/lib/audit';

export default function BlockAssignment() {
  const [assignments, setAssignments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [form, setForm] = useState({ warden_user_id: '', block_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const u = await base44.auth.me();
    setCurrentUser(u);
    const [a, b, users] = await Promise.all([
      base44.entities.WardenBlock.list(),
      base44.entities.Block.list(),
      base44.entities.User.list(),
    ]);
    setAssignments(a);
    setBlocks(b);
    setWardens(users.filter(u => u.role === 'warden'));
    setLoading(false);
  }

  async function addAssignment() {
    if (!form.warden_user_id || !form.block_id) return;
    const block = blocks.find(b => b.id === form.block_id);
    const warden = wardens.find(w => w.id === form.warden_user_id);
    const exists = assignments.find(a => a.warden_user_id === form.warden_user_id && a.block_id === form.block_id);
    if (exists) { toast({ title: 'Already assigned', variant: 'destructive' }); return; }
    setSaving(true);
    await base44.entities.WardenBlock.create({
      warden_user_id: form.warden_user_id,
      warden_name: warden?.full_name || warden?.email || '',
      warden_email: warden?.email || '',
      block_id: form.block_id,
      block_name: block?.block_name || '',
    });
    await logAudit(currentUser, 'WARDEN_BLOCK_ASSIGNED', 'Block Assignment', { warden: warden?.full_name || warden?.email, block: block?.block_name });
    toast({ title: 'Assignment added' });
    setForm({ warden_user_id: '', block_id: '' });
    setSaving(false);
    load();
  }

  async function removeAssignment(id) {
    await base44.entities.WardenBlock.delete(id);
    await logAudit(currentUser, 'WARDEN_BLOCK_UNASSIGNED', 'Block Assignment', { id });
    toast({ title: 'Assignment removed' });
    load();
  }

  const byWarden = assignments.reduce((acc, a) => {
    if (!acc[a.warden_user_id]) acc[a.warden_user_id] = { name: a.warden_name, email: a.warden_email, blocks: [] };
    acc[a.warden_user_id].blocks.push(a);
    return acc;
  }, {});

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
          <Select value={form.block_id} onValueChange={v => setForm(f => ({ ...f, block_id: v }))}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select Block" /></SelectTrigger>
            <SelectContent>{blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.block_name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={addAssignment} disabled={saving || !form.warden_user_id || !form.block_id} className="shrink-0">Assign</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : Object.keys(byWarden).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No block assignments yet.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byWarden).map(([uid, data]) => (
            <div key={uid} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <UserCog className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{data.name || data.email}</span>
                <span className="text-xs text-muted-foreground">{data.email}</span>
              </div>
              <div className="divide-y divide-border">
                {data.blocks.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{a.block_name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeAssignment(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}