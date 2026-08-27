import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, Megaphone, Calendar, UserCheck, ClipboardList, Flag, BarChart2, BadgeCheck } from 'lucide-react';
import { fetchActiveJakmasAppointment } from '@/lib/jakmas';

export default function JakmasDashboard({ user }) {
  const [stats, setStats] = useState({ totalStudents: 0, myAnnouncements: 0, upcomingEvents: 0, totalRegistrations: 0, pendingInspections: 0, chatReports: 0, myTasks: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [students, announcements, events, registrations, inspections, chatReports, appt, myTasks] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.Announcement.list(),
      base44.entities.Event.list('-event_date'),
      base44.entities.EventRegistration.list(),
      base44.entities.RoomInspection.filter({ status: 'Submitted' }),
      base44.entities.ChatMessage.filter({ reported: true }),
      fetchActiveJakmasAppointment(user?.id),
      user?.id ? base44.entities.JakmasTask.filter({ assigned_to_user_id: user.id }).catch(() => []) : [],
    ]);

    const upcoming = events.filter(e => e.event_date >= today && e.status !== 'Cancelled');
    setUpcomingEvents(upcoming.slice(0, 3));
    setAppointment(appt);

    setStats({
      totalStudents: students.length,
      myAnnouncements: announcements.filter(a => a.published_by === (user.full_name || user.email)).length,
      upcomingEvents: upcoming.length,
      totalRegistrations: registrations.filter(r => r.status === 'Registered').length,
      pendingInspections: inspections.length,
      chatReports: chatReports.length,
      myTasks: myTasks.filter(t => t.status !== 'approved' && t.status !== 'cancelled').length,
    });
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Total Residents', value: stats.totalStudents, icon: Users, color: 'bg-blue-100 text-blue-600', link: '/directory' },
    { label: 'My JAKMAS Tasks', value: stats.myTasks, icon: ClipboardList, color: 'bg-indigo-100 text-indigo-600', link: '/jakmas-tasks' },
    { label: 'My Announcements', value: stats.myAnnouncements, icon: Megaphone, color: 'bg-purple-100 text-purple-600', link: '/announcements' },
    { label: 'Upcoming Events', value: stats.upcomingEvents, icon: Calendar, color: 'bg-green-100 text-green-600', link: '/events' },
    { label: 'Event Registrations', value: stats.totalRegistrations, icon: UserCheck, color: 'bg-teal-100 text-teal-600', link: '/events' },
    { label: 'Pending Inspections', value: stats.pendingInspections, icon: ClipboardList, color: 'bg-yellow-100 text-yellow-600', link: '/room-inspections' },
    { label: 'Chat Reports', value: stats.chatReports, icon: Flag, color: 'bg-red-100 text-red-600', link: '/chat' },
  ];

  return (
    <div className="space-y-6">
      {/* Identity — student serving as JAKMAS via active appointment */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-2xl p-6 text-white shadow-lg border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-60 h-20 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-emerald-400/90 text-emerald-950 text-xs font-semibold px-2.5 py-1 rounded-full">
              <BadgeCheck className="w-3.5 h-3.5" /> JAKMAS — ACTIVE
            </span>
            <span className="text-xs text-slate-300">Student</span>
          </div>
          <h1 className="text-xl font-heading font-bold">{user?.full_name || 'JAKMAS'}</h1>
          <p className="text-xs text-slate-300">Student ID: {appointment?.student_id || '-'}</p>
          <p className="text-sm text-slate-200 mt-1.5">
            Position: {appointment?.position || '-'} · Portfolio: {appointment?.portfolio || '-'} · Term: {appointment?.term_start || '-'} → {appointment?.term_end || 'open'}
          </p>
          {appointment?.term_start && appointment.term_start > new Date().toISOString().split('T')[0] && (
            <span className="inline-block mt-3 text-xs bg-amber-400/20 text-amber-100 border border-amber-300/30 px-2.5 py-1 rounded-full">
              Term bermula {appointment.term_start}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-500" /> Upcoming Events
          </h2>
          <Link to="/events" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No upcoming events.</div>
        ) : (
          <div className="divide-y divide-border">
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="px-4 py-3">
                <p className="text-sm font-medium">{ev.event_name}</p>
                <p className="text-xs text-muted-foreground">{ev.event_date} · {ev.venue} · {ev.current_registrations || 0}/{ev.registration_limit || '∞'} registered</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'My JAKMAS Tasks', path: '/jakmas-tasks', icon: ClipboardList, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Create Announcement', path: '/announcements', icon: Megaphone, color: 'bg-purple-100 text-purple-600' },
          { label: 'Create Event', path: '/events', icon: Calendar, color: 'bg-green-100 text-green-600' },
          { label: 'Room Inspection', path: '/room-inspections', icon: ClipboardList, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Community Chat', path: '/chat', icon: Flag, color: 'bg-red-100 text-red-600' },
          { label: 'Resident Directory', path: '/directory', icon: Users, color: 'bg-blue-100 text-blue-600' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.path} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-medium">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}