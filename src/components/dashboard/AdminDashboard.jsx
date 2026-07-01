import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import { 
  Users, 
  DoorOpen, 
  Wrench, 
  CalendarOff, 
  Package, 
  ShieldAlert, 
  Building2, 
  ClipboardCheck,
  BedDouble // Icon for available beds
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['hsl(199,89%,48%)', 'hsl(162,63%,41%)', 'hsl(222,47%,21%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)'];

export default function AdminDashboard() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [students, rooms, blocks, maintenance, leave, parcels, discipline] = await Promise.all([
          base44.entities.Student.list(),
          base44.entities.Room.list(),
          base44.entities.Block.list(),
          base44.entities.MaintenanceRequest.list(),
          base44.entities.LeaveApplication.list(),
          base44.entities.Parcel.list(),
          base44.entities.DisciplineRecord.list(),
        ]);

        setRawData({ students, rooms, blocks, maintenance, leave, parcels, discipline });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    if (!rawData) return null;

    const { students, rooms, blocks, maintenance, leave, parcels, discipline } = rawData;

    const activeStudents = students.filter(s => s.status === 'Active');
    const totalCapacity = rooms.reduce((a, r) => a + (r.capacity || 0), 0);
    const totalOccupancy = rooms.reduce((a, r) => a + (r.current_occupancy || 0), 0);
    
    // Calculate total available beds across all rooms
    const totalAvailableBeds = rooms.reduce((a, r) => {
      const roomBedsAvailable = (r.capacity || 0) - (r.current_occupancy || 0);
      return a + (roomBedsAvailable > 0 ? roomBedsAvailable : 0);
    }, 0);

    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    const pendingMaint = maintenance.filter(m => m.status !== 'Completed').length;
    const pendingLeave = leave.filter(l => l.status === 'Pending').length;
    const pendingParcels = parcels.filter(p => p.status === 'Pending Collection').length;
    const activeDiscipline = discipline.filter(d => d.status !== 'Closed').length;
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    const blockDist = blocks.map(b => {
      const bRooms = rooms.filter(r => r.block_id === b.id);
      return {
        name: b.block_name,
        occupancy: bRooms.reduce((a, r) => a + (r.current_occupancy || 0), 0),
        capacity: bRooms.reduce((a, r) => a + (r.capacity || 0), 0)
      };
    });

    const maintByCategory = ['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleaning', 'Others']
      .map(cat => ({
        name: cat,
        count: maintenance.filter(m => m.category === cat).length
      }))
      .filter(c => c.count > 0);

    const leaveByStatus = [
      { name: 'Pending', value: leave.filter(l => l.status === 'Pending').length },
      { name: 'Approved', value: leave.filter(l => l.status === 'Approved').length },
      { name: 'Rejected', value: leave.filter(l => l.status === 'Rejected').length },
    ].filter(l => l.value > 0);

    return {
      totalResidents: activeStudents.length,
      availableRooms,
      totalAvailableBeds,
      occupiedRooms: rooms.length - availableRooms,
      pendingMaint,
      pendingLeave,
      pendingParcels,
      activeDiscipline,
      occupancyRate,
      blockDist,
      maintByCategory,
      leaveByStatus
    };
  }, [rawData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of residential college operations" />
      
      {/* Primary KPI Row - Changed to lg:grid-cols-5 to accommodate the new card cleanly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Residents" value={stats.totalResidents} icon={Users} color="bg-[hsl(222,47%,21%)]" />
        <StatCard label="Available Rooms" value={stats.availableRooms} icon={DoorOpen} color="bg-[hsl(162,63%,41%)]" />
        <StatCard label="Available Beds" value={stats.totalAvailableBeds} icon={BedDouble} color="bg-[hsl(142,71%,45%)]" />
        <StatCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} icon={Building2} color="bg-[hsl(199,89%,48%)]" />
        <StatCard label="Pending Maintenance" value={stats.pendingMaint} icon={Wrench} color="bg-[hsl(38,92%,50%)]" />
      </div>

      {/* Secondary Operational Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Leave" value={stats.pendingLeave} icon={CalendarOff} color="bg-[hsl(280,65%,50%)]" />
        <StatCard label="Pending Parcels" value={stats.pendingParcels} icon={Package} color="bg-[hsl(25,80%,50%)]" />
        <StatCard label="Active Discipline" value={stats.activeDiscipline} icon={ShieldAlert} color="bg-[hsl(0,84%,60%)]" />
        <StatCard label="Occupied Rooms" value={stats.occupiedRooms} icon={ClipboardCheck} color="bg-[hsl(222,47%,35%)]" />
      </div>

      {/* Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.blockDist.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold mb-4">Block Occupancy</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.blockDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="occupancy" fill="hsl(199,89%,48%)" radius={[4, 4, 0, 0]} name="Occupied" />
                <Bar dataKey="capacity" fill="hsl(214,32%,91%)" radius={[4, 4, 0, 0]} name="Capacity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.maintByCategory.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold mb-4">Maintenance by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.maintByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(222,47%,21%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.leaveByStatus.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold mb-4">Leave Applications</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={stats.leaveByStatus} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={55} 
                  outerRadius={90} 
                  paddingAngle={4} 
                  dataKey="value" 
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.leaveByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}