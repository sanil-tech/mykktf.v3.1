import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Pin, Flag, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const COMMUNITY_CHANNEL = { key: 'community', label: 'KKTF Community', channelKey: 'kktf', description: 'All residents' };
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

  useEffect(() => { init(); }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);

    const chs = [COMMUNITY_CHANNEL];

    if (u.role === 'warden') {
      // Wardens get block channels for all their assigned blocks
      const wb = await base44.entities.WardenBlock.filter({ warden_user_id: u.id });
      wb.forEach(w => {
        chs.unshift({ key: `block_${w.block_name}`, label: `Block ${w.block_name}`, channelKey: w.block_name, description: `Block ${w.block_name} residents` });
      });
    } else {
      // Students/staff get channels based on their student profile
      let sp = await base44.entities.Student.filter({ user_id: u.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
      const s = sp[0] || null;
      if (s?.block_name) {
        chs.unshift({ key: 'block', label: `Block ${s.block_name}`, channelKey: s.block_name, description: `Block ${s.block_name} residents` });
      }
      if (s?.room_number && s?.block_name) {
        chs.unshift({ key: 'room', label: `Room ${s.room_number}`, channelKey: `${s.room_number}_${s.block_name}`, description: 'Your room' });
      }
    }

    setChannels(chs);
    setActiveChannel(chs[0]);
    setLoading(false);
  }

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages();
    const unsub = base44.entities.ChatMessage.subscribe(() => { loadMessages(); });
    return unsub;
  }, [activeChannel]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadMessages() {
    if (!activeChannel) return;
    const msgs = await base44.entities.ChatMessage.filter({ channel_key: activeChannel.channelKey, is_deleted: false }, 'created_date', 100);
    setMessages(msgs);
  }

  async function send() {
    if (!text.trim() || !user || !activeChannel) return;
    await base44.entities.ChatMessage.create({
      channel: activeChannel.key,
      channel_key: activeChannel.channelKey,
      sender_user_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: user.role,
      message: text.trim(),
    });
    setText('');
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file || !user || !activeChannel) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ChatMessage.create({
      channel: activeChannel.key,
      channel_key: activeChannel.channelKey,
      sender_user_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: user.role,
      message: '',
      image_url: file_url,
    });
    setUploading(false);
    fileRef.current.value = '';
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
      <PageHeader title="Community Chat" description="Connect with your fellow residents" />
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        <div className="w-48 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channels</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {channels.map(ch => (
              <button key={ch.key} onClick={() => setActiveChannel(ch)} className={`w-full text-left px-3 py-2.5 text-sm transition-colors rounded-md mx-1 ${activeChannel?.key === ch.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                <p className="font-medium truncate"># {ch.label}</p>
                <p className={`text-xs truncate ${activeChannel?.key === ch.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{ch.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
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
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0">
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && <p className="text-xs text-muted-foreground mb-0.5">{msg.sender_name}</p>}
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
            <Input className="flex-1 h-9" placeholder="Type a message..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}