import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Pin, Flag, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Hanya satu saluran utama yang digunakan oleh semua pengguna
const COMMUNITY_CHANNEL = { 
  key: 'community', 
  label: 'KKTF Community', 
  channelKey: 'kktf_global_community', 
  description: 'Saluran rasmi semua penghuni & warden', 
  type: 'public' 
};

const ADMIN_ROLES = ['super_admin', 'college_admin', 'warden', 'staff'];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      // 1. Dapatkan maklumat pengguna yang sedang log masuk
      const u = await base44.auth.me();
      setUser(u);
      
      // 2. Muat mesej sedia ada di dalam pangkalan data
      await loadMessages();

      // 3. Langgan (*Subscribe*) kemas kini secara real-time global
      const unsub = base44.entities.ChatMessage.subscribe(() => {
        loadMessages();
      });

      return unsub;
    } catch (error) {
      console.error("Ralat memulakan sistem sembang:", error);
    } finally {
      setLoading(false);
    }
  }

  // Sentiasa tumpukan skrin ke mesej yang paling bawah setiap kali mesej dikemas kini
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Fungsi membaca mesej yang dikongsi bersama
  async function loadMessages() {
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { channel_key: COMMUNITY_CHANNEL.channelKey, is_deleted: false }, 
        'created_date', 
        100
      );
      setMessages(msgs);
    } catch (err) {
      console.error("Gagal memuatkan mesej:", err);
    }
  }

  // Fungsi menghantar mesej teks
  async function send() {
    if (!text.trim() || !user) return;
    try {
      await base44.entities.ChatMessage.create({
        channel: 'public', 
        channel_key: COMMUNITY_CHANNEL.channelKey, 
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role, // Membezakan role 'warden' atau 'student'
        message: text.trim(),
      });
      setText('');
      await loadMessages(); 
    } catch (err) {
      console.error("Gagal menghantar mesej:", err);
    }
  }

  // Fungsi menghantar gambar
  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        channel: 'public',
        channel_key: COMMUNITY_CHANNEL.channelKey,
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        message: '',
        image_url: file_url,
      });
      await loadMessages();
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
        
        {/* SIDEBAR MUDAH */}
        <div className="w-56 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-3 py-1.5 mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Channels</p>
            </div>
            <div className="px-1">
              <button className="w-full text-left px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold">
                <p className="truncate"># {COMMUNITY_CHANNEL.label}</p>
                <p className="text-[10px] truncate font-normal text-primary-foreground/70">{COMMUNITY_CHANNEL.description}</p>
              </button>
            </div>
          </div>
        </div>

        {/* RUANGAN CHAT MAIN WINDOW */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
          
          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">📌 Pinned</p>
              {pinnedMessages.map(m => (
                <p key={m.id} className="text-xs text-yellow-800 truncate">{m.sender_name}: {m.message}</p>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada mesej di sini. Mulakan perbualan pertama anda!</div>
            )}
            {messages.map(msg => {
              const isOwn = msg.sender_user_id === user?.id;
              const isWarden = msg.sender_role === 'warden';

              return (
                <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar dengan warna khusus untuk Warden */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isWarden ? 'bg-red-600 text-white shadow-xs' : 'bg-primary text-primary-foreground'}`}>
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                        {msg.sender_name} 
                        {isWarden && <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1 rounded">WARDEN</span>}
                      </p>
                    )}
                    
                    {/* Belon Mesej */}
                    <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : isWarden ? 'bg-red-50 border border-red-100 text-slate-800' : 'bg-muted'}`}>
                      {msg.message && <p className="leading-relaxed break-words">{msg.message}</p>}
                      {msg.image_url && <img src={msg.image_url} alt="shared" className="max-w-[200px] rounded-lg mt-1" />}
                    </div>

                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && (
                        <>
                          <button onClick={() => togglePin(msg)} className="text-xs text-muted-foreground hover:text-primary p-0.5">📌</button>
                          <button onClick={() => deleteMessage(msg.id)} className="text-xs text-muted-foreground hover:text-red-500 p-0.5">🗑️</button>
                        </>
                      )}
                      {!isOwn && <button onClick={() => reportMessage(msg)} className="text-xs text-muted-foreground hover:text-orange-500 p-0.5">🚩</button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* RUANGAN INPUT MESEJ */}
          <div className="p-3 border-t border-border flex gap-2 items-center">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={sendImage} />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input className="flex-1 h-9" placeholder="Tulis mesej komuniti anda di sini..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}