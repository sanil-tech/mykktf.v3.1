import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ClipboardList, Megaphone, Calendar, Flag } from 'lucide-react';

// Shown inside StudentDashboard for students holding an active JAKMAS appointment.
// JAKMAS members keep full student capabilities; this panel adds their JAKMAS
// quick actions. Resident Directory is intentionally NOT linked here — JAKMAS
// access to other residents' listings is restricted.
export default function JakmasPanel({ user, appointment }) {
  if (!appointment) return null;

  const links = [
    { to: '/jakmas-tasks', icon: ClipboardList, label: 'Tugas JAKMAS', color: 'bg-indigo-600' },
    { to: '/announcements', icon: Megaphone, label: 'Pengumuman', color: 'bg-purple-600' },
    { to: '/events', icon: Calendar, label: 'Event', color: 'bg-green-600' },
    { to: '/chat', icon: Flag, label: 'Sembang Komuniti', color: 'bg-red-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-[#132A4A] to-[#1E3A60] rounded-2xl p-5 text-white shadow-sm border border-indigo-700/30">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 bg-emerald-400/90 text-emerald-950 text-xs font-semibold px-2.5 py-1 rounded-full">
              <BadgeCheck className="w-3.5 h-3.5" /> JAKMAS — ACTIVE
            </span>
            <span className="text-xs text-slate-200">Pelajar / Student</span>
          </div>
          <p className="text-sm font-bold">{appointment.position || 'JAKMAS Member'}</p>
          <p className="text-xs text-slate-200 mt-0.5">
            Portfolio: {appointment.portfolio || '-'} · Term: {appointment.term_start || '-'} → {appointment.term_end || 'open'}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pl-1">Menu JAKMAS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {links.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all hover:-translate-y-1 text-center group"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm ${item.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}