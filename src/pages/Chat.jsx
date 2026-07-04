import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Pin, Flag, Trash2, Image as ImageIcon, MessageSquare, ShieldAlert } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const COMMUNITY_CHANNEL = { key: 'community', label: 'KKTF Community', channelKey: 'kktf', description: 'All residents', type: 'public' };
const ADMIN_ROLES = ['super_admin', 'college_admin', 'warden', 'staff'];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [channels, setChannels] = useState([COMMUNITY_CHANNEL]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // Menggunakan ref untuk mengelakkan isu closure stale state pada fungsi realtime subscribe
  const activeChannelRef = useRef(null);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const u = await base44.auth.me();
      setUser(u);
      await loadChannels(u);
    } catch (error) {
      console.error("Ralat memulakan sistem sembang:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChannels(currentUser) {
    if (!currentUser) return;

    const publicChannels = [COMMUNITY_CHANNEL];
    const dmChannels = [];

    if (currentUser.role === 'warden') {
      // --- ALIRAN PENGGUNA: WARDEN ---
      const wb = await base44.entities.WardenBlock.filter({ warden_user_id: currentUser.id });
      
      wb.forEach(w => {
        publicChannels.unshift({ 
          key: `block_${w.block_name}`, 
          label: `Block ${w.block_name}`, 
          channelKey: `block_${w.block_name}`.toLowerCase(), // Standardized channel key
          description: `Residents of Block ${w.block_name}`,
          type: 'public'
        });
      });

      // Ambil mesej DM yang melibatkan warden ini
      const allDmMessages = await base44.entities.ChatMessage.filter({ channel: 'direct_message' });
      const activeStudentIds = new Set();
      const studentNamesMap = {};

      allDmMessages.forEach(msg => {
        if (msg.channel_key && msg.channel_key.includes(currentUser.id)) {
          const parts = msg.channel_key.split('_');
          const studentId = parts[1]; // Format standard: dm_studentId_wardenId
          
          if (studentId && studentId !== currentUser.id) {
            activeStudentIds.add(studentId);
            if (msg.sender_user_id !== currentUser.id) {
              studentNamesMap[studentId] = msg.sender_name;
            }
          }
        }
      });

      activeStudentIds.forEach(studentId => {
        dmChannels.push({
          key: `dm_${studentId}`,
          label: `💬 DM: ${studentNamesMap[studentId] || 'Pelajar Portal'}`,
          channelKey: `dm_${studentId}_${currentUser.id}`, 
          description: 'Sembang peribadi (Klik untuk balas)',
          type: 'dm'
        });
      });

    } else {
      // --- ALIRAN PENGGUNA: PELAJAR ---
      let sp = await base44.entities.Student.filter({ user_id: currentUser.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: currentUser.email });
      const s = sp[0] || null;

      if (s?.block_name) {
        // Masukkan saluran Blok
        publicChannels.unshift({ 
          key: `block_${s.block_name}`, 
          label: `Block ${s.block_name}`, 
          channelKey: `block_${s.block_name}`.toLowerCase(), // Memastikan key sama dengan apa yang dibaca warden
          description: `Block ${s.block_name} residents`,
          type: 'public' 
        });

        // Cari warden blok untuk mulakan saluran DM
        const blockWardens = await base44.entities.WardenBlock.filter({ block_name: s.block_name });
        if (blockWardens.length > 0) {
          const wardenInfo = blockWardens[0];
          dmChannels.push({
            key: `dm_warden`,
            label: `💬 DM: Warden ${wardenInfo.block_name}`,
            channelKey: `dm_${currentUser.id}_${wardenInfo.warden_user_id}`,
            description: 'Hubungi warden secara peribadi (Sulit)',
            type: 'dm'
          });
        } else {
          // Fallback jika maklumat warden blok tiada di DB
          dmChannels.push({
            key: `dm_general_warden`,
            label: `💬 DM: Hubungi Warden Blok`,
            channelKey: `dm_${currentUser.id}_general_warden`,
            description: 'Sembang bantuan pengurusan kediaman',
            type: 'dm'
          });
        }
      }

      // Masukkan saluran Bilik
      if (s?.room_number && s?.block_name) {
        publicChannels.unshift({ 
          key: `room_${s.room_number}`, 
          label: `Room ${s.room_number}`, 
          channelKey: `room_${s.room_number}_${s.block_name}`.toLowerCase(), 
          description: 'Sembang ahli bilik anda',
          type: 'public' 
        });
      }
    }

    const allChannels = [...publicChannels, ...dmChannels];
    setChannels(allChannels);

    // Tetapkan saluran aktif jika belum dipilih
    if (!activeChannelRef.current && allChannels.length > 0) {
      setActiveChannel(allChannels[0]);
    }
  }

  // Hook untuk menguruskan pemuatan mesej & realtime sync
  useEffect(() => {
    if (!user) return;

    if (activeChannel) {
      loadMessages();
    }

    // Melanggan kemas kini secara global daripada pangkalan data
    const unsub = base44.entities.ChatMessage.subscribe(() => {
      loadChannels(user);
      if (activeChannelRef.current) {
        loadMessages();
      }
    });

    return unsub;
  }, [activeChannel, user]);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  async function loadMessages() {
    if (!activeChannelRef.current) return;
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { channel_key: activeChannelRef.current.channelKey, is_deleted: false }, 
        'created_date', 
        100
      );
      setMessages(msgs);
    } catch (err) {
      console.error("Gagal memuatkan mesej:", err);
    }
  }

  async function send() {
    if (!text.trim() || !user || !activeChannel) return;
    try {
      await base44.entities.ChatMessage.create({
        channel: activeChannel.type === 'dm' ? 'direct_message' : activeChannel.key,
        channel_key: activeChannel.channelKey, // Menggunakan nilai channelKey yang diselaraskan
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        message: text.trim(),
      });
      setText('');
      loadMessages(); // Muat semula mesej serta-merta selepas menghantar
    } catch (err) {
      console.error("Gagal menghantar mesej:", err);
    }
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file || !user || !activeChannel) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        channel: activeChannel.type === 'dm' ? 'direct_message' : activeChannel.key,
        channel_key: activeChannel.channelKey,
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        message: '',
        image_url: file_url,
      });
      loadMessages();
    } catch (err) {
      console.error("Gagal memuat naik gambar:", err);
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  }

  async function togglePin(msg) {
    await base44.entities.ChatMessage.update(msg.id, { is_pinned: !msg.is_pinned });
    loadMessages();
  }

  async function deleteMessage(id) {
    await base44.entities.ChatMessage.update(id, { is_deleted: true });
    loadMessages();
  }

  async function reportMessage(msg) {
    await base44.entities.ChatMessage.update(msg.id, { reported: true, report_reason: 'Reported by user' });
    toast({ title: 'Message reported' });
  }

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const pinnedMessages = messages.filter(m => m.is_pinned);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Community Chat" description="Connect with your fellow residents and wardens" />
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        
        {/* SIDEBAR */}
        <div className="w-56 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            
            {/* Saluran Umum */}
            <div>
              <div className="px-3 py-1.5 mb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Channels</p>
              </div>
              <div className="space-y-0.5 px-1">
                {channels.filter(ch => ch.type !== 'dm').map(ch => (
                  <button key={ch.key} onClick={() => setActiveChannel(ch)} className={`w-full text-left px-3 py-2 text-sm transition-colors rounded-lg flex flex-col ${activeChannel?.channelKey === ch.channelKey ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-slate-700'}`}>
                    <p className="truncate"># {ch.label}</p>
                    <p className={`text-[10px] truncate font-normal ${activeChannel?.channelKey === ch.channelKey ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{ch.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages */}
            {channels.some(ch => ch.type === 'dm') && (
              <div>
                <div className="px-3 py-1.5 mb-1 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-sky-600" /> Direct Messages
                  </p>
                </div>
                <div className="space-y-0.5 px-1">
                  {channels.filter(ch => ch.type === 'dm').map(ch => (
                    <button key={ch.key} onClick={() => setActiveChannel(ch)} className={`w-full text-left px-3 py-2 text-sm transition-colors rounded-lg flex flex-col border ${activeChannel?.channelKey === ch.channelKey ? 'bg-sky-600 border-sky-600 text-white font-semibold' : 'hover:bg-amber-50/50 border-transparent text-slate-700 bg-amber-50/20'}`}>
                      <p className="truncate flex items-center gap-1 text-xs">{ch.label}</p>
                      <p className={`text-[10px] truncate font-normal ${activeChannel?.channelKey === ch.channelKey ? 'text-white/80' : 'text-slate-400'}`}>{ch.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
          {activeChannel?.type === 'dm' && (
            <div className="px-4 py-1.5 bg-sky-50 border-b border-sky-100 text-[11px] text-sky-800 font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-600" /> Perbualan ini adalah peribadi antara anda dan pihak pengurusan sahaja.
            </div>
          )}

          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</p>
              {pinnedMessages.map(m => (
                <p key={m.id} className="text-xs text-yellow-800 truncate">{m.sender_name}: {m.message}</p>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No messages yet. Be the first to say hi!</div>
            )}
            {messages.map(msg => {
              const isOwn = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.sender_role === 'warden' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}>
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {msg.sender_name} {msg.sender_role === 'warden' && <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-1 rounded ml-1">Warden</span>}
                      </p>
                    )}
                    <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.message && <p>{msg.message}</p>}
                      {msg.image_url && <img src={msg.image_url} alt="shared" className="max-w-[200px] rounded-lg mt-1" />}
                    </div>
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && (
                        <>
                          <button onClick={() => togglePin(msg)} className="text-xs text-muted-foreground hover:text-primary p-0.5"><Pin className="w-3 h-3" /></button>
                          <button onClick={() => deleteMessage(msg.id)} className="text-xs text-muted-foreground hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                        </>
                      )}
                      {!isOwn && <button onClick={() => reportMessage(msg)} className="text-xs text-muted-foreground hover:text-orange-500 p-0.5"><Flag className="w-3 h-3" /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2 items-center">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={sendImage} />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input className="flex-1 h-9" placeholder={activeChannel?.type === 'dm' ? "Tulis mesej peribadi kepada warden..." : "Type a message..."} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}