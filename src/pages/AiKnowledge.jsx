import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert } from 'lucide-react';
import { ROLES } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/ListSkeletons';
import { Plus, Pencil, Trash2, BookOpen, Search, Sparkles } from 'lucide-react';

const CATEGORIES = ['Rule', 'Process', 'Event', 'Announcement', 'FAQ', 'General'];
const CATEGORY_COLOR = {
  Rule: 'bg-rose-100 text-rose-700',
  Process: 'bg-blue-100 text-blue-700',
  Event: 'bg-emerald-100 text-emerald-700',
  Announcement: 'bg-violet-100 text-violet-700',
  FAQ: 'bg-amber-100 text-amber-700',
  General: 'bg-slate-100 text-slate-700',
};

const EMPTY = { title: '', content: '', category: 'General', tags: '', effective_date: '', expiry_date: '', status: 'active' };

export default function AiKnowledge() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  // Restrict to administrators (Super Admin / College Admin). RLS already blocks
  // data access at the backend, but this gives a clean UX for direct-URL visits.
  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  useEffect(() => {
    if (!isLoadingAuth && user && !isAdmin) {
      toast({ title: 'Akses ditolak', description: 'Halaman ini hanya untuk Pentadbir.', variant: 'destructive' });
      navigate('/', { replace: true });
    }
  }, [isLoadingAuth, user, isAdmin]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.KnowledgeArticle.list('-created_date', 200);
      setItems(data || []);
    } catch (e) {
      toast({ title: 'Gagal memuatkan pengetahuan AI', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }
  function openEdit(item) {
    setEditing(item);
    setForm({
      title: item.title || '', content: item.content || '', category: item.category || 'General',
      tags: item.tags || '', effective_date: item.effective_date || '', expiry_date: item.expiry_date || '',
      status: item.status || 'active',
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Tajuk dan kandungan diperlukan', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, created_by_name: user?.full_name || user?.email || '' };
      if (editing) {
        await base44.entities.KnowledgeArticle.update(editing.id, payload);
        toast({ title: 'Pengetahuan dikemas kini' });
      } else {
        await base44.entities.KnowledgeArticle.create(payload);
        toast({ title: 'Pengetahuan baharu ditambah' });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Padam "${item.title}"?`)) return;
    try {
      await base44.entities.KnowledgeArticle.delete(item.id);
      toast({ title: 'Pengetahuan dipadam' });
      load();
    } catch (e) {
      toast({ title: 'Gagal memadam', variant: 'destructive' });
    }
  }

  const filtered = items.filter(it => {
    const matchSearch = !search ||
      it.title?.toLowerCase().includes(search.toLowerCase()) ||
      it.content?.toLowerCase().includes(search.toLowerCase()) ||
      it.tags?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || it.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengetahuan AI"
        description="Urus pengetahuan yang dirujuk KKTF Assistant — peraturan, proses, acara & makluman."
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Pengetahuan
          </Button>
        }
      />

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Entri <b>aktif</b> di sini disuntik automatik ke dalam konteks KKTF Assistant bagi setiap soalan.
            Acara akan datang & pengumuman terbaru juga disertakan secara langsung — tidak perlu salin semula ke sini.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari tajuk / kandungan / tag..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Tiada pengetahuan" description="Tambah entri pertama untuk KKTF Assistant." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(it => (
            <Card key={it.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={CATEGORY_COLOR[it.category]}>{it.category}</Badge>
                    <Badge variant={it.status === 'active' ? 'default' : 'secondary'}>
                      {it.status === 'active' ? 'Aktif' : 'Diarkib'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{it.title}</CardTitle>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(it)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">{it.content}</p>
                {it.tags && <p className="text-xs text-muted-foreground/70">Tag: {it.tags}</p>}
                {(it.effective_date || it.expiry_date) && (
                  <p className="text-xs text-muted-foreground/70">
                    {it.effective_date && `Berkuat kuasa: ${it.effective_date}`}
                    {it.effective_date && it.expiry_date && ' · '}
                    {it.expiry_date && `Tamat: ${it.expiry_date}`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pengetahuan' : 'Tambah Pengetahuan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tajuk *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="cth: Peraturan baru kawalan bunyi 10pm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="archived">Diarkib</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kandungan *</Label>
              <Textarea rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Tulis pengetahuan penuh yang AI patut tahu..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tag (pilihan)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="cth: bunyi, kurfew, denda" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Berkuat Kuasa (pilihan)</Label>
                <Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tamat Kuat Kuasa (pilihan)</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}