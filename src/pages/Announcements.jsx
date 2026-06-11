import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Megaphone, Trash2, AlertTriangle, Calendar, Info } from 'lucide-react';

const typeIcon = { 'General Notice': Info, 'Emergency Notice': AlertTriangle, 'Event Notice': Calendar };
const typeBg = { 'General Notice': 'border-l-blue-500', 'Emergency Notice': 'border-l-red-500', 'Event Notice': 'border-l-green-500' };

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'General Notice', publish_date: '', expiry_date: '' });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const data = await base44.entities.Announcement.list('-created_date');
    setItems(data);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.title || !form.content || !form.publish_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    await base44.entities.Announcement.create(form);
    toast({ title: 'Announcement published' });
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id) { await base44.entities.Announcement.delete(id); load(); }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Announcements" description="Publish notices and events" actions={<Button size="sm" onClick={() => { setForm({ title: '', content: '', type: 'General Notice', publish_date: new Date().toISOString().split('T')[0], expiry_date: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> New Announcement</Button>} />

      {items.length === 0 ? <EmptyState icon={Megaphone} title="No announcements" /> : (
        <div className="space-y-4">
          {items.map(item => {
            const Icon = typeIcon[item.type] || Info;
            return (
              <div key={item.id} className={`bg-card border border-border border-l-4 ${typeBg[item.type] || 'border-l-blue-500'} rounded-xl p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-semibold">{item.title}</h3>
                      <span className="text-[10px] text-muted-foreground">{item.type} · {item.publish_date}</span>
                      <p className="text-xs text-foreground mt-2 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['General Notice','Emergency Notice','Event Notice'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Content *</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="text-sm mt-1" rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Publish Date *</Label><Input type="date" value={form.publish_date} onChange={e => setForm({ ...form, publish_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Publish</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}