import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CalendarOff, Wrench, Check, X, Clock, AlertCircle, Building2 } from 'lucide-react';

export default function WardenDashboard({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [wardenBlocks, setWardenBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [wb, l, m] = await Promise.all([
      base44.entities.WardenBlock.filter({ warden_user_id: user.id }),
      base44.entities.LeaveApplication.filter({ status: 'Pending' }, '-created_date'),
      base44.entities.MaintenanceRequest.filter({ status: 'Submitted' }, '-created_date'),
    ]);
    setWardenBlocks(wb);

    const blockNames = wb.map(w => w.block_name);
    // If warden has block assignments, filter to those blocks via student lookup
    if (blockNames.length > 0) {
      const students = await base44.entities.Student.list();
      const stuByStudentId = {};
      students.forEach(s => { stuByStudentId[s.student_id] = s; });

      const filteredLeaves = l.filter(lv => {
        const stu = stuByStudentId[lv.student_id];
        return stu && blockNames.includes(stu.block_name);
      });
      const filteredMaint = m.filter(mx => blockNames.includes(mx.block_name));
      setLeaves(filteredLeaves);
      setMaintenance(filteredMaint);
    } else {
      setLeaves(l);
      setMaintenance(m);
    }
    setLoading(false);
  }

  async function updateLeave(id, status) {
    await base44.entities.LeaveApplication.update(id, { status, approved_by: user?.full_name || user?.email });
    load();
  }

  async function updateMaintenance(id, status) {
    await base44.entities.MaintenanceRequest.update(id, { status });
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-primary text-primary-foreground rounded-xl p-5">
        <h1 className="text-lg font-heading font-bold">Welcome, {user?.full_name || 'Warden'}</h1>
        <p className="text-sm opacity-80 mt-0.5">Here's what needs your attention today.</p>
        {wardenBlocks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {wardenBlocks.map(wb => (
              <span key={wb.id} className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {wb.block_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
            <CalendarOff className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{leaves.length}</p>
            <p className="text-xs text-muted-foreground">Pending Leaves</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{maintenance.length}</p>
            <p className="text-xs text-muted-foreground">New Maintenance</p>
          </div>
        </div>
      </div>

      {/* Pending Leave Applications */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" /> Pending Leave Applications
          </h2>
          <Link to="/leave" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Check className="w-8 h-8 text-green-400" />
            <p className="text-sm text-muted-foreground">All caught up! No pending leaves.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {leaves.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.student_name}</p>
                  <p className="text-xs text-muted-foreground">{l.leave_type} · {l.departure_date} → {l.return_date}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.destination}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => updateLeave(l.id, 'Approved')}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateLeave(l.id, 'Rejected')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Maintenance Requests */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500" /> New Maintenance Requests
          </h2>
          <Link to="/maintenance" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {maintenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Check className="w-8 h-8 text-green-400" />
            <p className="text-sm text-muted-foreground">No new maintenance requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {maintenance.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.student_name}</p>
                  <p className="text-xs text-muted-foreground">Room {m.room_number}{m.block_name ? ` · ${m.block_name}` : ''} · <span className="font-medium text-foreground">{m.category}</span></p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => updateMaintenance(m.id, 'Assigned')}>
                  Assign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}