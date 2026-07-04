import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Pin, Flag, Trash2, Image as ImageIcon, MessageSquare, ShieldAlert, X, Bell } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const COMMUNITY_CHANNEL = { 
  key: 'community', 
  label: 'KKTF Community', 
  channelKey: 'kktf_global_community', 
  description: 'Semua penghuni & warden', 
  type: 'public' 
};

const ADMIN_ROLES = ['super_admin', 'college_admin', 'warden', 'staff'];

function getDMChannelKey(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
}

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(COMMUNITY_CHANNEL);
  const [channels, setChannels] = useState([COMMUNITY_CHANNEL]);
  const [dmInbox, setDmInbox] = useState([]); 
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State untuk tetingkap DM aktif
  const [dmTarget, setDmTarget] = useState(null); 
  const [dmMessages, setDmMessages] = useState([]);
  const [dmText, setDmText] = useState('');

  const bottomRef = useRef(null);
  const dmBottomRef = useRef(null);
  const fileRef = useRef(null);

  const activeChannelRef = useRef(activeChannel);
  const dmTargetRef = useRef(dmTarget);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    dmTargetRef.current = dmTarget;
  }, [dmTarget]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const u = await base44.auth.me();
      setUser(u);
      
      await loadChannelsAndInbox(u);

      const unsub = base44.entities.ChatMessage.subscribe(() => {
        loadMessages();
        loadChannelsAndInbox(u);
        if (dmTargetRef.current) {
          loadDmMessages(u, dmTargetRef.current);
        }
      });

      return unsub;
    } catch (error) {
      console.error("Ralat sembang:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChannelsAndInbox(currentUser) {
    if (!currentUser) return;
    const publicChannels = [COMMUNITY_CHANNEL];

    try {
      // 1. Bina Saluran Awam / Blok / Bilik
      if (currentUser.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: currentUser.id });
        wb.forEach(w => {
          publicChannels.unshift({ 
            key: `block_${w.block_name}`.toLowerCase(), 
            label: `Block ${w.block_name}`, 
            channelKey: `block_${w.block_name}`.toLowerCase(),
            type: 'public'
          });
        });
      } else {
        let sp = await base44.entities.Student.filter({ user_id: currentUser.id });
        if (!sp.length) sp = await base44.entities.Student.filter({ email: currentUser.email });
        const s = sp[0] || null;

        if (s?.block_name) {
          publicChannels.unshift({ 
            key: `block_${s.block_name}`.toLowerCase(), 
            label: `Block ${s.block_name}`, 
            channelKey: `block_${s.block_name}`.toLowerCase(),
            type: 'public' 
          });
        }
        if (s?.room_number && s?.block_name) {
          publicChannels.unshift({ 
            key: `room_${s.room_number}_${s.block_name}`.toLowerCase(), 
            label: `Room ${s.room_number}`, 
            channelKey: `room_${s.room_number}_${s.block_name}`.toLowerCase(), 
            type: 'public' 
          });
        }
      }
      setChannels(publicChannels);

      // 2. KESAN DM AKTIF (INBOX 2-WAY): Berfungsi automatik untuk Pelajar & Warden
      const allMsgs = await base44.entities.ChatMessage.filter({});
      const dmMessages = allMsgs.filter(m => m.channel === 'direct_message' && m.channel_key?.includes(currentUser.id));
      
      dmMessages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      const uniqueConversations = {};
      
      dmMessages.forEach(msg => {
        const parts = msg.channel_key.split('_');
        const partnerId = parts[1] === currentUser.id ? parts[2] : parts[1];
        
        if (partnerId && !uniqueConversations[partnerId]) {
          // KOD 2-WAY NOTIFICATION: Mesej dianggap unread jika penghantar terakhir BUKAN dirinya sendiri
          const isUnread = msg.sender_user_id !== currentUser.id;
          
          // Tentukan nama paparan berdasarkan peranan pasangan perbualan
          let displayName = msg.sender_name;
          if (msg.sender_user_id === currentUser.id) {
            displayName = currentUser.role === 'warden' ? 'Pelajar' : 'Warden';
          }

          uniqueConversations[partnerId] = {
            id: partnerId,
            name: displayName,
            role: msg.sender_role,
            lastMessage: msg.message || '📁 [Gambar]',
            isUnread: isUnread // Kedua-dua peranan (student/warden) akan terima true jika ada mesej masuk baru
          };
        }
      });

      setDmInbox(Object.values(uniqueConversations));

    } catch (err) {
      console.error("Ralat membina saluran & inbox:", err);
    }
  }

  useEffect(() => {
    if (user && activeChannel) {
      loadMessages();
    }
  }, [activeChannel, user]);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  useEffect(() => {
    if (dmMessages.length > 0) {
      dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dmMessages]);

  async function loadMessages() {
    if (!activeChannelRef.current) return;
    try {
      const allMsgs = await base44.entities.ChatMessage.filter({}, 'created_date', 150);
      const filtered = allMsgs.filter(msg => 
        msg.channel_key === activeChannelRef.current.channelKey && !msg.is_deleted
      );
      setMessages(filtered);
    } catch (err) {
      console.error("Gagal muat mesej:", err);
    }
  }

  async function loadDmMessages(currentUser, target) {
    if (!currentUser || !target) return;
    try {
      const targetKey = getDMChannelKey(currentUser.id, target.id);
      const allMsgs = await base44.entities.ChatMessage.filter({});
      const filtered = allMsgs.filter(msg => msg.channel_key === targetKey && !msg.is_deleted);
      setDmMessages(filtered);
    } catch (err) {
      console.error(err);
    }
  }

  function handleOpenDm(targetUser) {
    if (!user || targetUser.id === user.id) return;
    setDmTarget(targetUser);
    loadDmMessages(user, targetUser);
    
    // Serta-merta hilangkan status unread secara lokal sebelum DB sync selesai
    setDmInbox(prev => prev.map(item => item.id === targetUser.id ? { ...item, isUnread: false } : item));
  }

  async function send() {
    if (!text.trim() || !user || !activeChannel) return;
    try {
      await base44.entities.ChatMessage.create({
        channel: 'public', 
        channel_key: activeChannel.channelKey, 
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role, 
        message: text.trim(),
        is_deleted: false
      });
      setText('');
      await loadMessages(); 
    } catch (err) {
      console.error(err);
    }
  }

  async function sendDm() {
    if (!dmText.trim() || !user || !dmTarget) return;
    try {
      const targetKey = getDMChannelKey(user.id, dmTarget.id);
      await base44.entities.ChatMessage.create({
        channel: 'direct_message',
        channel_key: targetKey,
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        message: dmText.trim(),
        is_deleted: false
      });
      setDmText('');
      await loadDmMessages(user, dmTarget);
      await loadChannelsAndInbox(user);
    } catch (err) {
      console.error(err);
    }
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file || !user || !activeChannel) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        channel: 'public',
        channel_key: activeChannel.channelKey,
        sender_user_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        message: '',
        image_url: file_url,
        is_deleted: false
      });
      await loadMessages();
    } catch (err) {
      console.error(err);
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

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const pinnedMessages = messages.filter(m => m.is_pinned);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="relative">
      <PageHeader title="Community Chat" description="Sembang komuniti awam dan semak Inbox Direct Messages (DM) di bahagian tepi" />
      
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        
        {/* SIDEBAR INBOX (NOTIFIKASI SEHALA & DUA HALA BERFUNGSI PENUH) */}
        <div className="w-60 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            
            {/* Urusan Saluran Awam */}
            <div>
              <div className="px-3 py-1.5 mb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Channels</p>
              </div>
              <div className="space-y-0.5 px-1">
                {channels.map(ch => (
                  <button key={ch.key} onClick={() => setActiveChannel(ch)} className={`w-full text-left px-3 py-1.5 text-xs transition-colors rounded-lg flex flex-col ${activeChannel?.channelKey === ch.channelKey ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-slate-700'}`}>
                    <p className="truncate"># {ch.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* INBOX DM DUA HALA */}
            <div>
              <div className="px-3 py-1.5 mb-1 border-t pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-sky-600" /> Inbox Perbualan DM
                </p>
              </div>
              <div className="space-y-1 px-1">
                {dmInbox.length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-3 py-1 italic">Tiada DM aktif.</p>
                )}
                {dmInbox.map(inbox => (
                  <button 
                    key={inbox.id} 
                    onClick={() => handleOpenDm(inbox)} 
                    className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex flex-col gap-0.5 transition-all border
                      ${inbox.isUnread ? 'bg-amber-50 border-amber-200 font-bold shadow-2xs' : 'hover:bg-muted bg-slate-50/50 border-transparent text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate max-w-[70%] text-slate-900">{inbox.name}</span>
                      {inbox.isUnread && (
                        <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1 rounded flex items-center gap-0.5 animate-pulse">
                          <Bell className="w-2 h-2" /> Baru
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate w-full font-normal">{inbox.lastMessage}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* UTAMA WINDOW */}
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
              <div className="text-center py-8 text-muted-foreground text-sm">Tiada rekod sembang di sini lagi.</div>
            )}
            {messages.map(msg => {
              const isOwn = msg.sender_user_id === user?.id;
              const isWarden = msg.sender_role === 'warden';
              const isSuperAdmin = msg.sender_role === 'super_admin' || msg.sender_role === 'college_admin';

              return (
                <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                  
                  <div 
                    onClick={() => handleOpenDm({ id: msg.sender_user_id, name: msg.sender_name, role: msg.sender_role })}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-transform active:scale-90
                      ${isWarden ? 'bg-red-600 text-white' : isSuperAdmin ? 'bg-amber-600 text-white' : 'bg-primary text-primary-foreground'}`}
                  >
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <p 
                        onClick={() => handleOpenDm({ id: msg.sender_user_id, name: msg.sender_name, role: msg.sender_role })}
                        className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        {msg.sender_name} 
                        {isWarden && <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1 rounded">WARDEN</span>}
                        {isSuperAdmin && <span className="text-[9px] bg-amber-100 text-amber-700 font-extrabold px-1 rounded">ADMIN</span>}
                      </p>
                    )}
                    
                    <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : isWarden ? 'bg-red-50 border border-red-100 text-slate-800' : 'bg-muted'}`}>
                      {msg.message && <p className="leading-relaxed break-words">{msg.message}</p>}
                      {msg.image_url && <img src={msg.image_url} alt="shared" className="max-w-[200px] rounded-lg mt-1" />}
                    </div>

                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isOwn && (
                        <button onClick={() => handleOpenDm({ id: msg.sender_user_id, name: msg.sender_name, role: msg.sender_role })} className="text-[11px] text-sky-600 hover:underline flex items-center gap-0.5 px-1 bg-sky-50 rounded">
                          <MessageSquare className="w-2.5 h-2.5" /> Mesej Peribadi
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => togglePin(msg)} className="text-xs text-muted-foreground hover:text-primary p-0.5">📌</button>
                          <button onClick={() => deleteMessage(msg.id)} className="text-xs text-muted-foreground hover:text-red-500 p-0.5">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* INPUT BAR */}
          <div className="p-3 border-t border-border flex gap-2 items-center">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={sendImage} />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input className="flex-1 h-9" placeholder={`Mesej ke #${activeChannel?.label}...`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* TETINGKAP POP-UP DM AKTIF */}
      {dmTarget && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-card border-2 border-sky-400 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-sky-600 text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold truncate">PM: {dmTarget.name}</p>
            </div>
            <button onClick={() => setDmTarget(null)} className="text-white/80 hover:text-white hover:bg-sky-700 p-1 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="px-3 py-1 bg-sky-50 border-b border-sky-100 text-[10px] text-sky-800 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Sembang selamat (Private).
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            {dmMessages.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">Tiada mesej lama. Sila mulakan sembang...</div>
            )}
            {dmMessages.map(m => {
              const isOwnDm = m.sender_user_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isOwnDm ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] break-words shadow-2xs
                    ${isOwnDm ? 'bg-sky-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none'}`}>
                    <p>{m.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={dmBottomRef} />
          </div>

          <div className="p-2 border-t border-slate-100 flex gap-1.5 bg-card">
            <Input 
              className="h-8 text-xs flex-1" 
              placeholder="Balas mesej..." 
              value={dmText} 
              onChange={e => setDmText(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && sendDm()} 
            />
            <Button size="icon" className="h-8 w-8 bg-sky-600 hover:bg-sky-700 text-white shrink-0" onClick={sendDm} disabled={!dmText.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}