import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Wrench, CalendarOff, Bell, Home, ClipboardList, Calendar, ChevronRight, AlertTriangle, Info, CheckCircle, X, Maximize2, GraduationCap, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JakmasPanel from '@/components/dashboard/JakmasPanel';

const PRIORITY_BORDER = { 
  Critical: 'border-l-4 border-l-red-600 shadow-[0_0_15px_rgba(220,38,38,0.1)]', 
  Important: 'border-l-4 border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]', 
  General: 'border-l-4 border-l-sky-600' 
};
const PRIORITY_ICON = { Critical: AlertTriangle, Important: Bell, General: Info };

const statusConfig = {
  'Pending': { color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Pending Collection': { color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Approved': { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'Collected': { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  'Rejected': { color: 'bg-rose-50 text-rose-700 border border-rose-200' },
  'Submitted': { color: 'bg-sky-50 text-sky-700 border border-sky-200' },
  'Assigned': { color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  'In Progress': { color: 'bg-orange-50 text-orange-700 border border-orange-200' },
  'Completed': { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { color: 'bg-slate-50 text-slate-700 border border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${cfg.color}`}>
      {status}
    </span>
  );
}

function QuickAction({ to, icon: Icon, label, color, description }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-sky-200 transition-all hover:-translate-y-1 text-center group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-bold text-slate-800 tracking-tight mt-1">{label}</span>
      <span className="text-[11px] text-slate-500 leading-tight line-clamp-2">{description}</span>
    </Link>
  );
}

export default function StudentDashboard({ user, jakmasAppointment }) {
  const [student, setStudent] = useState(null);
  const [myLeave, setMyLeave] = useState([]);
  const [myMaint, setMyMaint] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentChats, setRecentChats] = useState([]); // State baharu untuk mesej komuniti live
  const [readMap, setReadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);

  // Ambil data mesej terkini untuk saluran komuniti
  async function loadRecentChats() {
    try {
      const chats = await base44.entities.ChatMessage.filter(
        { channel_key: 'kktf', is_deleted: false }, 
        '-created_date', 
        2
      );
      // Susun balik mesej supaya yang paling lama di atas mengikut gaya perbualan biasa
      setRecentChats(chats.reverse());
    } catch (err) {
      console.error("Gagal memuatkan mesej komuniti:", err);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const students = await base44.entities.Student.filter({ email: user.email });
        const myStudent = students[0] || null;
        setStudent(myStudent);

        const dataPromises = [
          base44.entities.Announcement.list('-publish_date'),
          base44.entities.AnnouncementRead.filter({ student_user_id: user.id })
        ];

        if (myStudent) {
          dataPromises.push(base44.entities.LeaveApplication.filter({ student_id: myStudent.student_id }, '-created_date', 5));
          dataPromises.push(base44.entities.MaintenanceRequest.filter({ student_id: myStudent.student_id }, '-created_date', 5));
        }

        const [ann, reads, leave = [], maint = []] = await Promise.all(dataPromises);

        setMyLeave(leave);
        setMyMaint(maint);

        const map = {};
        reads.forEach(r => { map[r.announcement_id] = r; });
        setReadMap(map);
        setAnnouncements(ann);
        
        // Muatkan mesej sembang kali pertama
        await loadRecentChats();
      } catch (error) {
        console.error("Failed to load UMS dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Langganan mesej masa nyata (real-time chat updates)
    const unsubChat = base44.entities.ChatMessage.subscribe(() => {
      loadRecentChats();
    });
    return unsubChat;
  }, [user]);

  async function markRead(ann) {
    if (readMap[ann.id]) return;
    try {
      await base44.entities.AnnouncementRead.create({
        announcement_id: ann.id,
        student_user_id: user.id,
        student_name: user.full_name || user.email,
        read_at: new Date().toISOString(),
        acknowledged: ann.priority === 'Critical',
      });
      setReadMap(m => ({ ...m, [ann.id]: { acknowledged: true } }));
      setActiveAnnouncement(null);
    } catch (error) {
      console.error("Error updating notice map:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0B1E36] rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Loading UMS Portal...</p>
      </div>
    );
  }

  const activeMaint = myMaint.filter(m => m.status !== 'Completed').length;
  const pendingLeave = myLeave.filter(l => l.status === 'Pending').length;
  const unreadAnn = announcements.filter(a => !readMap[a.id]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] p-1 rounded-2xl">
      {/* 1. UMS Welcome Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-2xl p-6 text-white shadow-lg border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-44 h-44 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-60 h-20 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-1 relative z-10">
          <p className="text-xs font-bold tracking-wider text-amber-400 uppercase drop-shadow-sm">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return '🌅 Selamat Pagi / Good morning';
              if (hour < 18) return '☀️ Selamat Tengahari / Good afternoon';
              return '🌙 Selamat Malam / Good evening';
            })()}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl capitalize">
            {student?.full_name || user?.full_name || 'Resident'}
          </h1>
          
          {student ? (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2.5 text-xs font-medium text-slate-200">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> Matrik: {student.student_id}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                🏢 {student.faculty}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                📅 Pengajian: Year {student.year_of_study}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-white/10 italic">
              Your undergraduate student profile has not been linked yet. Please contact the college resident admin.
            </p>
          )}
        </div>
      </div>

      {jakmasAppointment && <JakmasPanel user={user} appointment={jakmasAppointment} />}

      {/* 2. Urgent Unread Notices Box */}
      {unreadAnn.length > 0 && (
        <div className="space-y-3 bg-red-50/60 border border-red-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-extrabold text-red-700 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <Bell className="w-4 h-4 stroke-[2.5]" /> Makluman Penting ({unreadAnn.length} New Notices)
          </p>
          <div className="grid grid-cols-1 gap-2">
            {unreadAnn.map(ann => {
              const PriorityIcon = PRIORITY_ICON[ann.priority || 'General'] || Info;
              return (
                <div
                  key={ann.id}
                  onClick={() => setActiveAnnouncement(ann)}
                  className={`bg-white border border-slate-100 rounded-xl p-4 cursor-pointer hover:border-red-200 hover:shadow-sm transition-all duration-150 relative group flex items-center justify-between gap-4 ${PRIORITY_BORDER[ann.priority || 'General']}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl shrink-0 text-red-600 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                      <PriorityIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 tracking-tight">{ann.title}</p>
                        {ann.priority === 'Critical' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-red-600 text-white">
                            Tinggi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{ann.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-sky-700 font-bold shrink-0 group-hover:text-[#0B1E36] transition-colors">
                    <span>Semak</span>
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action System Alerts */}
      {(activeMaint > 0 || pendingLeave > 0) && (
        <div className="flex flex-wrap gap-2.5">
          {activeMaint > 0 && (
            <Link to="/maintenance" className="flex items-center gap-2 bg-sky-50/70 border border-sky-200/60 text-sky-900 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-sky-100/80 transition-colors shadow-2xs">
              <Wrench className="w-4 h-4 text-sky-600" /> {activeMaint} Aduan Kerosakan Sedang Diproses
              <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
            </Link>
          )}
          {pendingLeave > 0 && (
            <Link to="/leave" className="flex items-center gap-2 bg-purple-50/70 border border-purple-200/60 text-purple-900 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-purple-100/80 transition-colors shadow-2xs">
              <CalendarOff className="w-4 h-4 text-purple-600" /> {pendingLeave} Permohonan Pelepasan Keluar
              <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
            </Link>
          )}
        </div>
      )}

      {/* Quick Access Matrix */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pl-1">Menu Tindakan Pantas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction to="/leave" icon={CalendarOff} label="Mohon Cuti" description="Pelepasan balik hujung minggu" color="bg-purple-600" />
          <QuickAction to="/maintenance" icon={Wrench} label="Aduan Fasiliti" description="Laporan kerosakan bilik/blok" color="bg-amber-500" />
          <QuickAction to="/facilities" icon={Home} label="Tempahan" description="Bilik belajar, dewan & peralatan" color="bg-sky-600" />
          <QuickAction to="/visitors" icon={ClipboardList} label="Daftar Pelawat" description="Log kemasukan pelawat luar" color="bg-emerald-600" />
          <QuickAction to="/attendance" icon={Calendar} label="Kehadiran" description="Semak rekod kehadiran kolej" color="bg-[#132A4A]" />
          <QuickAction to="/announcements" icon={Bell} label="Notis Kolej" description="Arkib makluman universiti" color="bg-red-600" />
        </div>
      </div>

      {/* Main Grid: Split layout for monitoring logs & Community Gateway Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Stack (2/3 width on wide screens) - 2x2 Log Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Leave Requests */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Status Cuti & Pelepasan</h3>
                <Link to="/leave"><Button variant="ghost" size="sm" className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 h-8 rounded-lg">Semua</Button></Link>
              </div>
              {myLeave.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">Tiada permohonan cuti aktif direkodkan.</p>
              ) : (
                <div className="space-y-2.5">
                  {myLeave.map(l => (
                    <div key={l.id} className="flex items-start justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">{l.leave_type}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{l.destination} · <span className="text-slate-400">{l.departure_date} → {l.return_date}</span></p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Laporan Kerosakan Teknikal</h3>
                <Link to="/maintenance"><Button variant="ghost" size="sm" className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 h-8 rounded-lg">Semua</Button></Link>
              </div>
              {myMaint.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">Tiada laporan kerosakan dibuat.</p>
              ) : (
                <div className="space-y-2.5">
                  {myMaint.map(m => (
                    <div key={m.id} className="flex items-start justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                        <p className="text-xs font-bold text-slate-800">{m.category}</p>
                        <p className="text-[11px] text-slate-500 truncate font-medium">{m.description}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Announcement History Board */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Lembaga Notis Am</h3>
                <Link to="/announcements"><Button variant="ghost" size="sm" className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 h-8 rounded-lg">Semua</Button></Link>
              </div>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">Tiada notis universiti diterbitkan.</p>
              ) : (
                <div className="space-y-2.5">
                  {announcements.slice(0, 5).map(a => {
                    const isRead = !!readMap[a.id];
                    return (
                      <div 
                        key={a.id} 
                        onClick={() => setActiveAnnouncement(a)} 
                        className={`p-3.5 rounded-xl cursor-pointer transition-all border ${isRead ? 'bg-slate-50/40 border-slate-100 opacity-60' : 'bg-sky-50/30 border-sky-100/70 hover:border-sky-200'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{a.title}</p>
                          {isRead ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <Bell className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-bounce" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{a.content}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1.5">{a.publish_date}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. Right Column Stack (1/3 width) - Ditambah baik untuk mengambil data Live Chat */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[320px] sticky top-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#0B1E36]/5 text-[#0B1E36] rounded-xl">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sembang Komuniti</h3>
                    <h4 className="text-sm font-bold text-slate-800">Kampus Semasa</h4>
                  </div>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              
              {/* Dipautan penuh menggunakan Link supaya mesra pengguna */}
              <Link to="/chat" className="block space-y-3 group/chatbox">
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-3 group-hover/chatbox:border-sky-200 transition-colors">
                  {recentChats.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Tiada mesej terbaru. Mulakan sembang!</p>
                  ) : (
                    recentChats.map((msg, index) => (
                      <div key={msg.id} className={`${index > 0 ? 'border-t border-slate-100 pt-3' : ''} space-y-1`}>
                        <p className={`text-[11px] font-bold ${msg.sender_role === 'student' ? 'text-sky-700' : 'text-red-600'}`}>
                          {msg.sender_name} {msg.sender_role !== 'student' && `(${msg.sender_role})`}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {msg.message || '📷 [Sent an image]'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Link>
            </div>

            <div className="pt-4">
              <Link to="/chat">
                <Button className="w-full text-xs font-bold rounded-xl h-10 bg-[#0B1E36] hover:bg-[#132A4A] text-white gap-1.5 shadow-sm">
                  Buka Ruang Sembang <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Full Screen Premium Frosted Modal Overlays */}
      {activeAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1E36]/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveAnnouncement(null)}
              className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest uppercase bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded">
                  {activeAnnouncement.priority || 'Pemberitahuan Am'}
                </span>
                <h3 className="text-base font-extrabold text-slate-800 pt-2 leading-tight">{activeAnnouncement.title}</h3>
                <p className="text-[11px] font-medium text-slate-400">{activeAnnouncement.publish_date}</p>
              </div>
              
              <div className="text-xs text-slate-600 bg-slate-50/80 p-4 rounded-xl leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-100">
                {activeAnnouncement.content}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs font-semibold rounded-lg h-9" onClick={() => setActiveAnnouncement(null)}>
                  Tutup / Close
                </Button>
                {!readMap[activeAnnouncement.id] && (
                  <Button size="sm" className="text-xs font-bold rounded-lg h-9 bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-sm" onClick={() => markRead(activeAnnouncement)}>
                    <CheckCircle className="w-4 h-4" /> Faham, Sahkan Bacaan
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}