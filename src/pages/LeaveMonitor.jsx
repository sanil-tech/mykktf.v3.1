import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarCheck, CalendarOff, Building2, ShieldCheck, Lock } from 'lucide-react';
import moment from 'moment';
import { isOperatingAsWarden, getWardenBlocks } from '@/lib/wardenHelper';
import { isBlockInList, isSameBlock } from '@/lib/kktfBlocks';

export default function LeaveMonitor() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [blocks, setBlocks] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [filterBlock, setFilterBlock] = useState('all');
  const [wardenBlocks, setWardenBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const [b, s, l] = await Promise.all([
      base44.entities.Block.list().catch(() => []),
      base44.entities.Student.filter({ status: 'Active' }).catch(() => []),
      base44.entities.LeaveApplication.list('-created_date').catch(() => []),
    ]);
    setBlocks(b);
    setStudents(s);
    setLeaves(l);

    if (isOperatingAsWarden(u)) {
      const wb = await getWardenBlocks(u);
      setWardenBlocks(wb);
    }
    setLoading(false);
  }

  const isWarden = isOperatingAsWarden(user);

  const date = moment(selectedDate);
  const onLeaveSet = new Set(
    leaves.filter(l => 
      l.status === 'Approved' && 
      !l.returned_at && 
      moment(l.departure_date).isSameOrBefore(date, 'day') && 
      moment(l.return_date).isSameOrAfter(date, 'day')
    ).map(l => l.student_id)
  );

  // Jika mod felo, hanya benarkan blok jagaan rasmi sahaja (tiada paparan blok kolej lain)
  const accessibleBlocks = isWarden && wardenBlocks.length > 0
    ? blocks.filter(b => isBlockInList(b.block_name, wardenBlocks)) 
    : isWarden
      ? []
      : blocks;

  const displayBlocks = filterBlock === 'all' 
    ? accessibleBlocks 
    : accessibleBlocks.filter(b => isSameBlock(b.block_name, filterBlock));

  const scopedStudents = isWarden && wardenBlocks.length > 0
    ? students.filter(s => isBlockInList(s.block_name, wardenBlocks)) 
    : isWarden
      ? []
      : students;

  const blockStats = displayBlocks.map(block => {
    const bs = scopedStudents.filter(s => isSameBlock(s.block_name, block.block_name));
    const onLeave = bs.filter(s => onLeaveSet.has(s.student_id)).length;
    const present = bs.length - onLeave;
    const occupancy = bs.length > 0 ? Math.round((present / bs.length) * 100) : 0;
    return { ...block, total: bs.length, present, onLeave, occupancy };
  });

  const totalPresent = blockStats.reduce((a, b) => a + b.present, 0);
  const totalOnLeave = blockStats.reduce((a, b) => a + b.onLeave, 0);
  const totalStudents = blockStats.reduce((a, b) => a + b.total, 0);

  const leavingStudents = leaves.filter(l => {
    const inRange = moment(l.departure_date).isSameOrBefore(date, 'day') && moment(l.return_date).isSameOrAfter(date, 'day');
    if (!inRange) return false;
    if (isWarden) {
      const stu = scopedStudents.find(s => s.student_id === l.student_id);
      return !!stu;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isWarden ? "Leave Occupancy Monitor (Mod Felo)" : "Leave Occupancy Monitor"} 
        description={
          isWarden 
            ? `Pemantauan keberadaan residen bagi blok jagaan anda (${wardenBlocks.join(', ') || 'Blok Jagaan'})`
            : "Lihat kehadiran dan keberadaan residen kolej bagi sebarang tarikh"
        } 
      />

      {/* BANNER SKOP TUGASAN FELO */}
      {isWarden && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Peranan Felo Aktif: <strong>Skop Pemantauan Dikhususkan</strong>. Hanya data residen bagi blok jagaan anda yang dipaparkan.
            </span>
          </div>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-400/40 text-[11px] font-semibold">
            Blok Jagaan: {wardenBlocks.join(', ') || 'Tiada'}
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Tarikh:</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            className="border border-input rounded-md px-3 py-1.5 text-sm bg-card" 
          />
        </div>
        <Select value={filterBlock} onValueChange={setFilterBlock}>
          <SelectTrigger className="w-60 bg-card">
            <SelectValue placeholder={isWarden ? "Semua Blok Jagaan" : "Semua Blok Kolej"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isWarden && wardenBlocks.length > 0
                ? `Semua Blok Jagaan (${wardenBlocks.join(' & ')})` 
                : isWarden
                  ? 'Tiada Blok Jagaan'
                  : 'Semua Blok Kolej (A - N)'}
            </SelectItem>
            {accessibleBlocks.map(b => (
              <SelectItem key={b.id} value={b.block_name}>{b.block_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* STATISTIK RINGKASAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">{isWarden ? 'Residen Blok Jagaan' : 'Jumlah Residen'}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPresent}</p>
            <p className="text-xs text-muted-foreground">Berada di Kolej</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
            <CalendarOff className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalOnLeave}</p>
            <p className="text-xs text-muted-foreground">Sedang Bercuti (E-Leave)</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Kadar Keberadaan</p>
          </div>
        </div>
      </div>

      {/* KAD KADAR PENGHUNIAN SETIAP BLOK JAGAAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blockStats.map(block => (
          <div key={block.id} className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">{block.block_name}</h3>
              <span className="text-xs text-muted-foreground">{block.gender_restriction}</span>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Jumlah Residen</span>
                <span className="font-medium text-foreground">{block.total}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 dark:text-green-400">Di Kolej</span>
                <span className="font-medium text-green-600 dark:text-green-400">{block.present}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600 dark:text-orange-400">Bercuti (E-Leave)</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{block.onLeave}</span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-emerald-600 rounded-full transition-all" 
                style={{ width: `${block.occupancy}%` }} 
              />
            </div>
            <p className="text-xs text-right text-muted-foreground mt-1">{block.occupancy}% berada di blok</p>
          </div>
        ))}
      </div>

      {/* JADUAL PELAJAR SEDANG BERCUTI DALAM BLOK JAGAAN */}
      {leavingStudents.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <h3 className="text-sm font-semibold text-foreground">
              Pelajar Sedang Bercuti ({moment(selectedDate).format('D MMM YYYY')})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Nama Pelajar</th>
                  <th className="text-left px-4 py-2">Jenis Cuti</th>
                  <th className="text-left px-4 py-2">Tarikh Keluar</th>
                  <th className="text-left px-4 py-2">Tarikh Kembali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leavingStudents.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">{l.student_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.leave_type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.departure_date}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.return_date}</td>
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