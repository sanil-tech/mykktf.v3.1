import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CalendarCheck, CalendarOff, Building2 } from 'lucide-react';
import moment from 'moment';

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
    const u = await base44.auth.me();
    setUser(u);
    const [b, s, l] = await Promise.all([
      base44.entities.Block.list(),
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.LeaveApplication.list('-created_date'),
    ]);
    setBlocks(b);
    setStudents(s);
    setLeaves(l);
    if (u.role === 'warden') {
      const wb = await base44.entities.WardenBlock.filter({ warden_user_id: u.id });
      setWardenBlocks(wb.map(w => w.block_name));
    }
    setLoading(false);
  }

  const date = moment(selectedDate);
  const onLeaveSet = new Set(
    leaves.filter(l => 
      l.status === 'Approved' && 
      !l.returned_at && 
      moment(l.departure_date).isSameOrBefore(date, 'day') && 
      moment(l.return_date).isSameOrAfter(date, 'day')
    ).map(l => l.student_id)
  );

  const accessibleBlocks = user?.role === 'warden' && wardenBlocks.length > 0 ? blocks.filter(b => wardenBlocks.includes(b.block_name)) : blocks;
  const displayBlocks = filterBlock === 'all' ? accessibleBlocks : accessibleBlocks.filter(b => b.block_name === filterBlock);
  const scopedStudents = user?.role === 'warden' && wardenBlocks.length > 0 ? students.filter(s => wardenBlocks.includes(s.block_name)) : students;

  const blockStats = displayBlocks.map(block => {
    const bs = scopedStudents.filter(s => s.block_name === block.block_name);
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
    if (user?.role === 'warden' && wardenBlocks.length > 0) {
      const stu = scopedStudents.find(s => s.student_id === l.student_id);
      return !!stu;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Leave Occupancy Monitor" description="View resident presence for any date" />
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Date:</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border border-input rounded-md px-3 py-1.5 text-sm" />
        </div>
        <Select value={filterBlock} onValueChange={setFilterBlock}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Blocks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Blocks</SelectItem>
            {accessibleBlocks.map(b => <SelectItem key={b.id} value={b.block_name}>{b.block_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Total Residents</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-600">{totalPresent}</p><p className="text-xs text-muted-foreground">Present</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><CalendarOff className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-2xl font-bold text-orange-600">{totalOnLeave}</p><p className="text-xs text-muted-foreground">On Leave</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-blue-600">{totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Occupancy</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {blockStats.map(block => (
          <div key={block.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{block.block_name}</h3>
              <span className="text-xs text-muted-foreground">{block.gender_restriction}</span>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total</span><span className="font-medium">{block.total}</span></div>
              <div className="flex justify-between text-xs"><span className="text-green-600">Present</span><span className="font-medium text-green-600">{block.present}</span></div>
              <div className="flex justify-between text-xs"><span className="text-orange-600">On Leave</span><span className="font-medium text-orange-600">{block.onLeave}</span></div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all" style={{ width: `${block.occupancy}%` }} />
            </div>
            <p className="text-xs text-right text-muted-foreground mt-1">{block.occupancy}% present</p>
          </div>
        ))}
      </div>

      {leavingStudents.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Students on Leave – {moment(selectedDate).format('D MMM YYYY')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-xs text-muted-foreground">
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Leave Type</th>
                <th className="text-left px-4 py-2">Departure</th>
                <th className="text-left px-4 py-2">Return</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {leavingStudents.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">{l.student_name}</td>
                    <td className="px-4 py-2">{l.leave_type}</td>
                    <td className="px-4 py-2">{l.departure_date}</td>
                    <td className="px-4 py-2">{l.return_date}</td>
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