import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ROLES } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/ListSkeletons';
import { Plus, Pencil, Trash2, BookOpen, Search, Sparkles, Upload, CheckCircle2 } from 'lucide-react';

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
  const fileInputRef = useRef(null);

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
  const [uploadedFileName, setUploadedFileName] = useState('');

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
    setUploadedFileName('');
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setUploadedFileName('');
    setForm({
      title: item.title || '', 
      content: item.content || '', 
      category: item.category || 'General',
      tags: item.tags || '', 
      effective_date: item.effective_date || '', 
      expiry_date: item.expiry_date || '',
      status: item.status || 'active',
    });
    setDialogOpen(true);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setForm(prev => ({
          ...prev,
          title: prev.title || cleanTitle,
          content: text.trim(),
          category: prev.category === 'General' && cleanTitle.toLowerCase().includes('peraturan') ? 'Rule' : prev.category
        }));
        toast({ title: 'Dokumen Dimuat Naik', description: `Teks daripada ${file.name} berjaya diekstrak.` });
        if (!dialogOpen) setDialogOpen(true);
      }
    };
    reader.onerror = () => {
      toast({ title: 'Ralat Membaca Fail', description: 'Gagal membaca kandungan dokumen.', variant: 'destructive' });
    };

    reader.readAsText(file);
    e.target.value = '';
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
        toast({ title: 'Pengetahuan baharu ditambah ke KKTF Assistant' });
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
      {/* HIDDEN FILE INPUT FOR IMPORT */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".txt,.md,.doc,.docx,.json,.csv,.text" 
        className="hidden" 
      />

      <PageHeader
        title="Pengetahuan AI"
        description="Urus dokumen, peraturan dan SOP yang dirujuk oleh KKTF Assistant AI secara langsung."
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              className="gap-1.5 text-xs font-semibold"
            >
              <Upload className="w-4 h-4 text-indigo-600" /> Muat Naik Dokumen
            </Button>
            <Button 
              onClick={openCreate} 
              className="gap-1.5 text-xs font-semibold bg-[#132644] hover:bg-[#1e385f] text-white"
            >
              <Plus className="w-4 h-4" /> Tambah Pengetahuan
            </Button>
          </div>
        }
      />

      <Card className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-amber-50/30 border-indigo-100 shadow-xs">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Bagaimana KKTF Assistant Merujuk Dokumen Sumber Ini?
            </p>
            <p className="text-slate-600 leading-relaxed">
              Semua entri berstatus <b>Aktif</b> di sini disuntik secara automatik ke dalam memori model AI (Gemini LLM) setiap kali pelajar atau warden bertanya soalan (RAG Knowledge Context). Acara kolej, pengumuman rasmi, dan peraturan bermalam di luar juga disegerakkan secara langsung.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 text-xs" placeholder="Cari tajuk, peraturan, prosedur, tag..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="sm:w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState 
          icon={BookOpen} 
          title="Tiada pengetahuan AI ditemui" 
          description="Klik 'Tambah Pengetahuan' atau 'Muat Naik Dokumen' untuk memasukkan peraturan dan maklumat kolej ke dalam KKTF Assistant." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(it => (
            <Card key={it.id} className="hover:shadow-md transition-shadow border-slate-200">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[it.category] || CATEGORY_COLOR.General}`}>
                      {it.category}
                    </span>
                    <Badge variant={it.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {it.status === 'active' ? 'Aktif' : 'Draf'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {it.title}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(it)}>
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(it)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-slate-600 line-clamp-3 leading-relaxed">
                  {it.content}
                </p>
                {it.tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {it.tags.split(',').map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Ditambah oleh: {it.created_by_name || 'Admin'}</span>
                  {it.effective_date && <span>Kuat kuasa: {it.effective_date}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG ADD / EDIT KNOWLEDGE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {editing ? 'Kemaskini Pengetahuan AI' : 'Tambah Pengetahuan untuk KKTF Assistant'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Maklumat ini akan dijadikan sumber rujukan pintar semasa menjawab soalan pelajar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* FILE UPLOAD SHORTCUT INSIDE MODAL */}
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Import daripada fail teks / dokumen</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[11px] ml-2" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Pilih Fail (.txt, .md, .doc)
                </Button>
              </div>
              {uploadedFileName && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fail dimuat naik: {uploadedFileName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Tajuk Pengetahuan / Topik *</Label>
                <Input 
                  placeholder="Cth: Peraturan Jam Malam & Senyap di Kolej" 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kategori *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Kandungan Terperinci / Dokumen Sumber *</Label>
              <Textarea 
                rows={8}
                placeholder="Tulis atau tampal teks dokumen, perenggan peraturan, SOP pendaftaran bilik, atau waktu perkhidmatan kolej..." 
                value={form.content} 
                onChange={e => setForm({ ...form, content: e.target.value })} 
                className="text-xs font-sans leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground">
                AI akan membaca seluruh perenggan ini untuk merangka jawapan berautoriti kepada pengguna.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kata Kunci / Tags</Label>
                <Input 
                  placeholder="jam malam, bilik, denda" 
                  value={form.tags} 
                  onChange={e => setForm({ ...form, tags: e.target.value })} 
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tarikh Kuat Kuasa</Label>
                <Input 
                  type="date"
                  value={form.effective_date} 
                  onChange={e => setForm({ ...form, effective_date: e.target.value })} 
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif (Dirujuk AI)</SelectItem>
                    <SelectItem value="draft">Draf (Disembunyikan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button 
              onClick={save} 
              disabled={saving} 
              size="sm" 
              className="bg-[#132644] hover:bg-[#1e385f] text-white text-xs font-semibold"
            >
              {saving ? 'Menyimpan...' : (editing ? 'Kemaskini Pengetahuan' : 'Simpan ke Memori AI')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}