import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Wrench, CalendarOff, Package, Bell, Home, ClipboardList, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusConfig = {
  'Pending': { color: 'bg-yellow-100 text-yellow-800' },
  'Pending Collection': { color: 'bg-yellow-100 text-yellow-800' },
  'Approved': { color: 'bg-green-100 text-green-800' },
  'Collected': { color: 'bg-green-100 text-green-800' },
  'Rejected': { color: 'bg-red-100 text-red-800' },
  'Submitted': { color: 'bg-blue-100 text-blue-800' },
  'Assigned': { color: 'bg-purple-100 text-purple-800' },
  'In Progress': { color: 'bg-orange-100 text-orange-800' },
  'Completed': { color: 'bg-green-100 text-green-800' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
      {status}
    </span>
  );
}

function QuickAction({ to, icon: Icon, label, color, description }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all hover:-translate-y-0.5 text-center">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground leading-tight">{description}</span>
    </Link>
  );
}

export default function StudentDashboard({ user }) {
  const [student, setStudent] = useState(null);
  const [myLeave, setMyLeave] = useState([]);
  const [myMaint, setMyMaint] = useState([]);
  const [myParcels, setMyParcels] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [students, leave, maint, parcels, ann] = await Promise.all([
        base44.entities.Student.filter({ email: user.email }),
        base44.entities.LeaveApplication.list('-created_date', 5),
        base44.entities.MaintenanceRequest.list('-created_date', 5),
        base44.entities.Parcel.list('-created_date', 5),
        base44.entities.Announcement.list('-publish_date', 5),
      ]);

      const myStudent = students[0] || null;
      setStudent(myStudent);

      if (myStudent) {
        setMyLeave(leave.filter(l => l.student_id === myStudent.student_id));
        setMyMaint(maint.filter(m => m.student_id === myStudent.student_id));
        setMyParcels(parcels.filter(p => p.student_id === myStudent.student_id));
      }

      setAnnouncements(ann);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const pendingParcels = myParcels.filter(p => p.status === 'Pending Collection').length;
  const activeMaint = myMaint.filter(m => m.status !== 'Completed').length;
  const pendingLeave = myLeave.filter(l => l.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[hsl(222,47%,21%)] to-[hsl(199,89%,48%)] rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 mb-1">Welcome back,</p>
        <h1 className="text-2xl font-heading font-bold">{user.full_name || 'Resident'}</h1>
        {student && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm opacity-90">
            <span>🎓 {student.student_id}</span>
            <span>🏢 {student.faculty}</span>
            <span>📅 Year {student.year_of_study}</span>
          </div>
        )}
        {!student && (
          <p className="text-sm opacity-75 mt-2">Your student profile has not been linked yet. Please contact the college admin.</p>
        )}
      </div>

      {/* Alert Badges */}
      {(pendingParcels > 0 || activeMaint > 0 || pendingLeave > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingParcels > 0 && (
            <Link to="/parcels" className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg hover:bg-yellow-100 transition-colors">
              <Package className="w-4 h-4" /> {pendingParcels} parcel(s) waiting for collection
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {activeMaint > 0 && (
            <Link to="/maintenance" className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">
              <Wrench className="w-4 h-4" /> {activeMaint} maintenance request(s) in progress
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {pendingLeave > 0 && (
            <Link to="/leave" className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors">
              <CalendarOff className="w-4 h-4" /> {pendingLeave} leave application(s) pending approval
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-heading font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction to="/leave" icon={CalendarOff} label="Apply Leave" description="Request weekend or emergency leave" color="bg-[hsl(280,65%,50%)]" />
          <QuickAction to="/maintenance" icon={Wrench} label="Report Issue" description="Submit a maintenance request" color="bg-[hsl(38,92%,50%)]" />
          <QuickAction to="/facilities" icon={Home} label="Book Facility" description="Reserve study room or hall" color="bg-[hsl(199,89%,48%)]" />
          <QuickAction to="/visitors" icon={ClipboardList} label="Register Visitor" description="Log an incoming visitor" color="bg-[hsl(162,63%,41%)]" />
          <QuickAction to="/attendance" icon={Calendar} label="Attendance" description="View your attendance record" color="bg-[hsl(222,47%,35%)]" />
          <QuickAction to="/announcements" icon={Bell} label="Notices" description="Read latest announcements" color="bg-[hsl(0,84%,60%)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Leave Applications */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold">My Leave Applications</h3>
            <Link to="/leave"><Button variant="ghost" size="sm" className="text-xs h-7">View All</Button></Link>
          </div>
          {myLeave.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No leave applications yet.</p>
          ) : (
            <div className="space-y-3">
              {myLeave.map(l => (
                <div key={l.id} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{l.leave_type}</p>
                    <p className="text-xs text-muted-foreground">{l.destination} · {l.departure_date} → {l.return_date}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Maintenance Requests */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold">My Maintenance Requests</h3>
            <Link to="/maintenance"><Button variant="ghost" size="sm" className="text-xs h-7">View All</Button></Link>
          </div>
          {myMaint.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No maintenance requests yet.</p>
          ) : (
            <div className="space-y-3">
              {myMaint.map(m => (
                <div key={m.id} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{m.category}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Parcels */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold">My Parcels</h3>
            <Link to="/parcels"><Button variant="ghost" size="sm" className="text-xs h-7">View All</Button></Link>
          </div>
          {myParcels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No parcels recorded.</p>
          ) : (
            <div className="space-y-3">
              {myParcels.map(p => (
                <div key={p.id} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.courier_company}</p>
                    <p className="text-xs text-muted-foreground">Tracking: {p.tracking_number} · Arrived: {p.arrival_date}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold">Latest Announcements</h3>
            <Link to="/announcements"><Button variant="ghost" size="sm" className="text-xs h-7">View All</Button></Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 bg-muted/40 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${a.type === 'Emergency Notice' ? 'bg-red-100 text-red-700' : a.type === 'Event Notice' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{a.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.publish_date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}