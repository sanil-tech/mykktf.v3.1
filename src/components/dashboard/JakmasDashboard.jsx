import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, Megaphone, Calendar, UserCheck, ClipboardList, Flag, BarChart2 } from 'lucide-react';

export default function JakmasDashboard({ user }) {
  const [stats, setStats] = useState({ totalStudents: 0, myAnnouncements: 0, upcomingEvents: 0, totalRegistrations: 0, pendingInspections: 0, chatReports: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [students, announcements, events, registrations, inspections, chatReports] = await Promise.all([
      base44.entities.Student.filter({ status: 'Active' }),
      base44.entities.Announcement.list(),
      base44.entities.Event.list('-event_date'),
      base44.entities.EventRegistration.list(),
      base44.entities.RoomInspection.filter({ status: 'Submitted' }),
      base44.entities.ChatMessage.filter({ reported: true }),
    ]);

    const upcoming = events.filter(e => e.event_date >= today && e.status !== 'Cancelled');
    setUpcomingEvents(upcoming.slice(0, 3));

    setStats({
      totalStudents: students.length,
      myAnnouncements: announcements.filter(a => a.published_by === (user.full_name || user.email)).length,
      upcomingEvents: upcoming.length,
      totalRegistrations: registrations.filter(r => r.status === 'Registered').length,
      pendingInspections: inspections.length,
      chatReports: chatReports.length,
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
    { label: 'My Announcements', value: stats.myAnnouncements, icon: Megaphone, color: 'bg-purple-100 text-purple-600', link: '/announcements' },
    { label: 'Upcoming Events', value: stats.upcomingEvents, icon: Calendar, color: 'bg-green-100 text-green-600', link: '/events' },
    { label: 'Event Registrations', value: stats.totalRegistrations, icon: UserCheck, color: 'bg-teal-100 text-teal-600', link: '/events' },
    { label: 'Pending Inspections', value: stats.pendingInspections, icon: ClipboardList, color: 'bg-yellow-100 text-yellow-600', link: '/room-inspections' },
    { label: 'Chat Reports', value: stats.chatReports, icon: Flag, color: 'bg-red-100 text-red-600', link: '/chat' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-primary text-primary-foreground rounded-xl p-5">
        <h1 className="text-lg font-heading font-bold">Welcome, {user?.full_name || 'JAKMAS'}</h1>
        <p className="text-sm opacity-80 mt-0.5">Jawatankuasa Mahasiswa Kolej — Student Committee Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
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
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
          { label: 'Create Announcement', path: '/announcements', icon: Megaphone },
          { label: 'Create Event', path: '/events', icon: Calendar },
          { label: 'Room Inspection', path: '/room-inspections', icon: ClipboardList },
          { label: 'Community Chat', path: '/chat', icon: Flag },
          { label: 'Resident Directory', path: '/directory', icon: Users },
          { label: 'View Analytics', path: '/announcements', icon: BarChart2 },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.path} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors text-sm font-medium">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}