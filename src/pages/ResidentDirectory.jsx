import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { Search, Users } from 'lucide-react';
import { TableSkeleton } from '@/components/shared/ListSkeletons';

// JAKMAS can only see: Name, Matric Number, Block, Room Number
// No IC, Passport, Address, Discipline, Leave, Staff Notes

export default function ResidentDirectory() {
  const [students, setStudents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBlock, setFilterBlock] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [studs, blks] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.Block.list(),
    ]);
    setStudents(studs);
    setBlocks(blks);
    setLoading(false);
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q);
    const matchBlock = filterBlock === 'all' || s.block_name === filterBlock;
    return matchSearch && matchBlock;
  });

  if (loading) return <div><PageHeader title="Resident Directory" description="Active resident listing (limited view)" /><TableSkeleton rows={8} cols={5} /></div>;

  return (
    <div>
      <PageHeader title="Resident Directory" description="Active resident listing (limited view)" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or matric number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterBlock} onValueChange={setFilterBlock}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="All Blocks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Blocks</SelectItem>
            {blocks.map(b => <SelectItem key={b.id} value={b.block_name}>{b.block_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} residents shown</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No residents found" description="Adjust your search or filter." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Matric No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Block</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Room</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.block_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.room_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}