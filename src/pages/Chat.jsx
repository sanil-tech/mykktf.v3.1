import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Pin, Trash2, MessageSquare, X, Bell, Paperclip, FileText, Download, ExternalLink, Edit2, Check, Hash, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realTimeQueryOptions } from '@/lib/query-client';
import { toast as sonnerToast } from 'sonner';

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

function renderMessageText(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-medium text-amber-200 hover:text-white inline-flex items-center gap-0.5 break-all">
          {part} <ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    }
    return part;
  });
}

function renderAttachment(url) {
  if (!url) return null;
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  
  if (isImage) {
    return <img src={url} alt="Shared graphic" className="max-w-[200px] md:max-w-[280px] rounded-lg mt-1 border border-black/10 shadow-xs" />;
  }

  const fileName = url.split('/').pop().split('?')[0] || "Dokumen Lampiran";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 mt-1.5 rounded-lg bg-black/10 hover:bg-black/20 transition-colors text-xs max-w-[240px]">
      <FileText className="w-5 h-5 shrink-0 text-white" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{fileName}</p>
        <p className="text-[10px] text-white/70">Klik untuk muat turun</p>
      </div>
      <Download className="w-3.5 h-3.5 shrink-0 text-white/80" />
    </a>
  );
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeChannel, setActiveChannel] = useState(COMMUNITY_CHANNEL);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [dmTarget, setDmTarget] = useState(null); 
  const [dmText, setDmText] = useState('');
  const [dmComposerOpen, setDmComposerOpen] = useState(false);
  const [wardenOptions, setWardenOptions] = useState([]);
  const [loadingWardens, setLoadingWardens] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const bottomRef = useRef(null);
  const dmBottomRef = useRef(null);
  const fileRef = useRef(null);
  const dmFileRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(console.error);
  }, []);

  const { data: channelsData, refetch: refetchChannels } = useQuery({
    queryKey: ['chat', 'channelsAndInbox', user?.id],
    queryFn: async () => {
      if (!user) return { channels: [COMMUNITY_CHANNEL], dmInbox: [] };
      const publicChannels = [COMMUNITY_CHANNEL];

      if (user.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
        wb.forEach(w => {
          publicChannels.unshift({ 
            key: `block_${w.block_name}`.toLowerCase(), 
            label: `Block ${w.block_name}`, 
            channelKey: `block_${w.block_name}`.toLowerCase(),
            type: 'public'
          });
        });
      } else {
        let sp = await base44.entities.Student.filter({ user_id: user.id });
        if (!sp.length) sp = await base44.entities.Student.filter({ email: user.email });
        const s = sp[0] || null;

        if (s?.block_name) {
          publicChannels.unshift({ key: `block_${s.block_name}`.toLowerCase(), label: `Block ${s.block_name}`, channelKey: `block_${s.block_name}`.toLowerCase(), type: 'public' });
        }
        if (s?.room_number && s?.block_name) {
          publicChannels.unshift({ key: `room_${s.room_number}_${s.block_name}`.toLowerCase(), label: `Room ${s.room_number}`, channelKey: `room_${s.room_number}_${s.block_name}`.toLowerCase(), type: 'public' });
        }
      }

      const allMsgs = await base44.entities.ChatMessage.filter({});
      const dmMessages = allMsgs.filter(m => m.channel === 'direct_message' && m.channel_key?.includes(user.id));
      
      dmMessages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const allStudents = await base44.entities.Student.filter({});
      const uniqueConversations = {};
      
      dmMessages.forEach(msg => {
        const parts = msg.channel_key.split('_');
        const partnerId = parts[1] === user.id ? parts[2] : parts[1];
        
        if (partnerId && !uniqueConversations[partnerId]) {
          const isUnread = msg.sender_user_id !== user.id;
          const studentProfile = allStudents.find(s => s.user_id === partnerId);
          
          let displayName = msg.sender_name;
          let blockName = '';

          if (studentProfile) {
            displayName = studentProfile.full_name || studentProfile.name || msg.sender_name;
            blockName = studentProfile.block_name ? `Blok ${studentProfile.block_name}` : '';
          } else if (msg.sender_role === 'warden') {
            displayName = msg.sender_name;
            blockName = 'Warden Kediaman';
          }

          uniqueConversations[partnerId] = {
            id: partnerId,
            name: displayName,
            block: blockName,
            role: msg.sender_role,
            lastMessage: msg.is_deleted ? '🗑️ Mesej dipadam' : (msg.message || '📁 [Fail Lampiran]'),
            isUnread: isUnread 
          };
        }
      });

      return { channels: publicChannels, dmInbox: Object.values(uniqueConversations) };
    },
    enabled: !!user,
    ...realTimeQueryOptions
  });

  const channels = channelsData?.channels || [COMMUNITY_CHANNEL];
  const dmInbox = channelsData?.dmInbox || [];

  const { data: messages = [], refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat', 'messages', activeChannel?.channelKey],
    queryFn: async () => {
      if (!activeChannel) return [];
      const allMsgs = await base44.entities.ChatMessage.filter({}, 'created_date', 150);
      const filtered = allMsgs.filter(msg => msg.channel_key === activeChannel.channelKey && !msg.is_deleted);
      
      const allStudents = await base44.entities.Student.filter({});
      const enhancedFiltered = filtered.map(msg => {
        const profile = allStudents.find(s => s.user_id === msg.sender_user_id);
        if (profile && profile.full_name) {
          return { ...msg, sender_name: profile.full_name };
        }
        return msg;
      });
      return enhancedFiltered;
    },
    enabled: !!activeChannel,
    ...realTimeQueryOptions
  });

  const { data: dmMessages = [], refetch: refetchDmMessages } = useQuery({
    queryKey: ['chat', 'dmMessages', dmTarget?.id],
    queryFn: async () => {
      if (!user || !dmTarget) return [];
      const targetKey = getDMChannelKey(user.id, dmTarget.id);
      const allMsgs = await base44.entities.ChatMessage.filter({});
      const filtered = allMsgs.filter(msg => msg.channel_key === targetKey && !msg.is_deleted);
      
      const allStudents = await base44.entities.Student.filter({});
      const enhancedFiltered = filtered.map(msg => {
        const profile = allStudents.find(s => s.user_id === msg.sender_user_id);
        if (profile && profile.full_name) {
          return { ...msg, sender_name: profile.full_name };
        }
        return msg;
      });
      return enhancedFiltered;
    },
    enabled: !!user && !!dmTarget,
    ...realTimeQueryOptions
  });

  async function resolveSenderName(currentUser) {
    if (!currentUser) return 'Unknown';
    try {
      let profiles = await base44.entities.Student.filter({ user_id: currentUser.id });
      if (!profiles.length) profiles = await base44.entities.Student.filter({ email: currentUser.email });
      if (profiles.length > 0 && profiles[0].full_name) return profiles[0].full_name;
    } catch (e) { console.error(e); }
    return currentUser.full_name || currentUser.email;
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (dmMessages.length > 0) dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dmMessages]);

  useEffect(() => {
    if (!activeChannel) return;
    
    if (typeof base44.entities.ChatMessage.subscribe === 'function') {
      const unsubscribe = base44.entities.ChatMessage.subscribe(
        { channel_key: activeChannel.channelKey },
        (event) => {
          if (event.type === 'create') {
            queryClient.setQueryData(['chat', 'messages', activeChannel.channelKey], (old = []) => {
              if (old.some(m => m.id === event.data.id)) return old;
              return [...old, event.data];
            });
          } else if (event.type === 'update') {
            queryClient.setQueryData(['chat', 'messages', activeChannel.channelKey], (old = []) => {
              return old.map(m => m.id === event.data.id ? event.data : m);
            });
          }
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeChannel?.channelKey, queryClient]);

  function startEdit(msg) {
    setEditingMessageId(msg.id);
    setEditText(msg.message);
  }

  async function saveEdit(id, isDm = false) {
    if (!editText.trim()) return;
    try {
      await base44.entities.ChatMessage.update(id, { message: editText.trim() });
      setEditingMessageId(null);
      setEditText('');
      if (isDm) {
        refetchDmMessages();
        refetchChannels();
      } else {
        refetchMessages();
      }
      toast({ title: "Mesej dikemas kini" });
    } catch (err) { console.error(err); }
  }

  async function deleteMessage(id, isDm = false) {
    try {
      await base44.entities.ChatMessage.update(id, { is_deleted: true });
      if (isDm) {
        refetchDmMessages();
        refetchChannels();
      } else {
        refetchMessages();
      }
      toast({ title: "Mesej dipadam" });
    } catch (err) { console.error(err); }
  }

  async function togglePin(msg) {
    try {
      await base44.entities.ChatMessage.update(msg.id, { is_pinned: !msg.is_pinned });
      refetchMessages();
      toast({ title: msg.is_pinned ? "Pin dibuang" : "Mesej di-pin" });
    } catch (err) { console.error(err); }
  }

  async function handleMainUpload(e) {
    const file = e.target.files[0];
    if (!file || !user || !activeChannel) return;
    setUploading(true);
    try {
      const resolvedName = await resolveSenderName(user);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        channel: 'public', channel_key: activeChannel.channelKey, sender_user_id: user.id,
        sender_name: resolvedName, sender_role: user.role, message: '', image_url: file_url, is_deleted: false
      });
      refetchMessages();
    } catch (err) { console.error(err); } 
    finally { setUploading(false); fileRef.current.value = ''; }
  }

  async function handleMiniDmUpload(e) {
    const file = e.target.files[0];
    if (!file || !user || !dmTarget) return;
    setUploading(true);
    try {
      const resolvedName = await resolveSenderName(user);
      const targetKey = getDMChannelKey(user.id, dmTarget.id);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        channel: 'direct_message', channel_key: targetKey, sender_user_id: user.id,
        sender_name: resolvedName, sender_role: user.role, message: '', image_url: file_url, is_deleted: false
      });
      refetchDmMessages();
      refetchChannels();
    } catch (err) { console.error(err); } 
    finally { setUploading(false); dmFileRef.current.value = ''; }
  }

  const sendMessageMutation = useMutation({
    mutationFn: async ({ channelKey, text }) => {
      const resolvedName = await resolveSenderName(user);
      return await base44.entities.ChatMessage.create({
        channel: 'public',
        channel_key: channelKey,
        sender_user_id: user.id,
        sender_name: resolvedName,
        sender_role: user.role,
        message: text,
        is_deleted: false,
      });
    },
    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', newMsg.channelKey] });
      const previousMessages = queryClient.getQueryData(['chat', 'messages', newMsg.channelKey]);

      queryClient.setQueryData(['chat', 'messages', newMsg.channelKey], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          channel_key: newMsg.channelKey,
          message: newMsg.text,
          sender_user_id: user.id,
          sender_name: user.full_name || user.email || 'Me',
          sender_role: user.role,
          isPending: true,
          created_date: new Date().toISOString(),
        },
      ]);
      return { previousMessages };
    },
    onError: (err, newMsg, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['chat', 'messages', newMsg.channelKey], context.previousMessages);
      }
      sonnerToast.error("Failed to send message");
    },
    onSettled: (data, error, newMsg) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', newMsg.channelKey] });
    },
  });

  async function send() {
    if (!text.trim() || !user || !activeChannel) return;
    const msgText = text.trim();
    setText('');
    sendMessageMutation.mutate({ channelKey: activeChannel.channelKey, text: msgText });
  }

  async function sendDm() {
    if (!dmText.trim() || !user || !dmTarget) return;
    try {
      const resolvedName = await resolveSenderName(user);
      const targetKey = getDMChannelKey(user.id, dmTarget.id);
      await base44.entities.ChatMessage.create({
        channel: 'direct_message', channel_key: targetKey, sender_user_id: user.id,
        sender_name: resolvedName, sender_role: user.role, message: dmText.trim(), is_deleted: false
      });
      setDmText(''); 
      refetchDmMessages();
      refetchChannels();
    } catch (err) { console.error(err); }
  }

  async function openWardenComposer() {
    if (!user) return;
    setDmComposerOpen(true);
    setWardenOptions([]);
    setLoadingWardens(true);
    try {
      let sp = await base44.entities.Student.filter({ user_id: user.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: user.email });
      const s = sp[0];
      if (!s?.block_name) {
        toast({ title: "Blok kediaman belum ditetapkan untuk profil anda." });
        return;
      }
      const wardens = await base44.entities.WardenBlock.filter({ block_name: s.block_name });
      setWardenOptions(wardens.map(w => ({ id: w.warden_user_id, name: w.warden_name || 'Warden', block: `Blok ${w.block_name}` })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWardens(false);
    }
  }

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const pinnedMessages = messages.filter(m => m.is_pinned);

  if (isLoadingMessages && messages.length === 0) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)]">
      <PageHeader title="Community Chat" description="Sembang komuniti dengan paparan Top Bar yang mesra peranti mudah alih (mobile)." />
      
      {/* 1. TOP BAR CHANNELS - Menghemat ruang tepi mobile */}
      <div className="bg-card border border-border rounded-xl p-2 mb-3 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 md:pb-0">
          <div className="flex items-center gap-1 shrink-0 text-muted-foreground px-2 text-xs font-bold uppercase tracking-wider border-r pr-3">
            <Hash className="w-3.5 h-3.5 text-primary" /> Saluran
          </div>
          <div className="flex gap-1.5 pl-1">
            {channels.map(ch => (
              <button 
                key={ch.key} 
                onClick={() => setActiveChannel(ch)} 
                className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-lg transition-all border ${activeChannel?.channelKey === ch.channelKey ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-xs' : 'hover:bg-muted bg-slate-50 border-transparent text-slate-700'}`}
              >
                # {ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rangka Utama Bawah */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        
        {/* KOTAK SEMBANG UTAMA (Luas penuh di Mobile) */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-xs h-full">
          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">📌 Pinned Message</p>
              {pinnedMessages.map(m => (
                <p key={m.id} className="text-xs text-yellow-800 truncate">{m.sender_name}: {m.message}</p>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs italic">Tiada mesej di saluran ini.</div>}
            {messages.map(msg => {
              const isOwn = msg.sender_user_id === user?.id;
              const isWarden = msg.sender_role === 'warden';

              return (
                <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isWarden ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}>
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  
                  <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">{msg.sender_name}</p>
                    
                    <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-slate-900'} ${msg.isPending ? 'opacity-70' : ''}`}>
                      {editingMessageId === msg.id ? (
                        <div className="flex gap-1.5 items-center min-w-[220px] p-0.5">
                          <Input 
                            className="h-8 text-xs bg-white text-slate-900 border border-slate-300 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary shadow-inner" 
                            value={editText} 
                            onChange={e => setEditText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && saveEdit(msg.id)}
                            autoFocus
                          />
                          <Button size="icon" className="h-8 w-8 bg-green-600 text-white shrink-0" onClick={() => saveEdit(msg.id)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" className="h-8 w-8 bg-slate-200 text-slate-700 shrink-0 border" onClick={() => setEditingMessageId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          {msg.message && <p className="break-words leading-relaxed">{renderMessageText(msg.message)}</p>}
                          {renderAttachment(msg.image_url)}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                      {isOwn && editingMessageId !== msg.id && (
                        <button onClick={() => startEdit(msg)} className="text-slate-500 hover:underline flex items-center gap-0.5"><Edit2 className="w-2.5 h-2.5" /> Edit</button>
                      )}
                      {(isOwn || isAdmin) && (
                        <button onClick={() => deleteMessage(msg.id)} className="text-red-500 hover:underline flex items-center gap-0.5"><Trash2 className="w-2.5 h-2.5" /> Padam</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => togglePin(msg)} className="text-amber-600 hover:underline flex items-center gap-0.5"><Pin className="w-2.5 h-2.5" /> {msg.is_pinned ? 'Unpin' : 'Pin'}</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* INPUT BAR UTAMA */}
          <div className="p-3 border-t border-border flex gap-2 items-center bg-card">
            <input type="file" ref={fileRef} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleMainUpload} />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 shrink-0" onClick={() => fileRef.current?.click()}><Paperclip className="w-4 h-4" /></Button>
            <Input className="flex-1 h-9" placeholder="Tulis mesej..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!text.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* INBOX PERBUALAN DM SIDEBAR - Menjadi panel bawah/tepi mengikut saiz skrin */}
        <div className="w-full md:w-64 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-xs h-[200px] md:h-full">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 shrink-0 flex items-center justify-between gap-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-sky-600" /> Inbox Perbualan DM
            </p>
            {user && !isAdmin && (
              <button onClick={() => dmComposerOpen ? setDmComposerOpen(false) : openWardenComposer()} className="text-[10px] font-bold text-sky-700 hover:text-sky-800 bg-white border border-sky-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Plus className="w-2.5 h-2.5" /> Warden Blok
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {dmComposerOpen ? (
              loadingWardens ? (
                <p className="text-[11px] text-muted-foreground px-2 py-1">Memuatkan warden...</p>
              ) : wardenOptions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-2 py-1 italic">Tiada warden ditugaskan untuk blok anda.</p>
              ) : (
                wardenOptions.map(w => (
                  <button key={w.id} onClick={() => { setDmTarget(w); setDmComposerOpen(false); }} className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-sky-50 bg-slate-50/50 border border-transparent text-slate-700">
                    <span className="block truncate font-semibold text-slate-900 leading-tight">{w.name}</span>
                    <span className="inline-block text-[9px] text-red-600 bg-red-50 px-1 rounded-sm mt-0.5">{w.block} · Warden</span>
                  </button>
                ))
              )
            ) : (
              <>
                {dmInbox.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-1 italic">Tiada DM aktif. Gunakan "Warden Blok" untuk menghubungi warden blok anda secara sulit.</p>}
                {dmInbox.map(inbox => (
                  <button key={inbox.id} onClick={() => { setDmTarget(inbox); }} className={`w-full text-left px-2.5 py-2 text-xs rounded-lg border ${inbox.isUnread ? 'bg-amber-50 border-amber-200 font-bold' : 'hover:bg-muted bg-slate-50/50 border-transparent text-slate-700'}`}>
                    <div className="flex items-start justify-between w-full gap-1">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900 leading-tight">{inbox.name}</span>
                        {inbox.block && <span className="inline-block text-[9px] text-sky-700 bg-sky-50 px-1 rounded-sm mt-0.5">{inbox.block}</span>}
                      </div>
                      {inbox.isUnread && <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1 rounded animate-pulse shrink-0"><Bell className="w-2 h-2 inline" /> Baru</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate w-full mt-0.5">{inbox.lastMessage}</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

      {/* MINI DM POP-UP */}
      {dmTarget && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-card border-2 border-sky-400 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-sky-600 text-white px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-bold truncate">PM: {dmTarget.name} ({dmTarget.block || 'Warden'})</p>
            <button onClick={() => setDmTarget(null)} className="text-white hover:bg-sky-700 p-1 rounded-full"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            {dmMessages.map(m => {
              const isOwnDm = m.sender_user_id === user?.id;
              return (
                <div key={m.id} className={`flex flex-col group ${isOwnDm ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] break-words shadow-2xs ${isOwnDm ? 'bg-sky-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none'}`}>
                    {editingMessageId === m.id ? (
                      <div className="flex gap-1 items-center min-w-[170px] p-0.5">
                        <input 
                          className="h-7 text-xs bg-white text-slate-900 border border-slate-300 rounded px-1.5 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-sky-500" 
                          value={editText} 
                          onChange={e => setEditText(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && saveEdit(m.id, true)}
                          autoFocus
                        />
                        <button className="bg-green-600 text-white p-1 rounded shrink-0" onClick={() => saveEdit(m.id, true)}><Check className="w-3 h-3" /></button>
                        <button className="bg-slate-200 text-slate-700 p-1 rounded shrink-0 border" onClick={() => setEditingMessageId(null)}><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <>
                        {m.message && <p className="leading-normal">{renderMessageText(m.message)}</p>}
                        {renderAttachment(m.image_url)}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] mt-0.5 px-0.5">
                    {isOwnDm && editingMessageId !== m.id && <button onClick={() => startEdit(m)} className="text-slate-500 hover:underline">Edit</button>}
                    {(isOwnDm || isAdmin) && <button onClick={() => deleteMessage(m.id, true)} className="text-red-500 hover:underline">Padam</button>}
                  </div>
                </div>
              );
            })}
            <div ref={dmBottomRef} />
          </div>

          <div className="p-2 border-t flex gap-1.5 bg-card items-center">
            <input type="file" ref={dmFileRef} accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleMiniDmUpload} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 shrink-0" onClick={() => dmFileRef.current?.click()}><Paperclip className="w-3.5 h-3.5" /></Button>
            <Input className="h-8 text-xs flex-1" placeholder="Tulis PM..." value={dmText} onChange={e => setDmText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDm()} />
            <Button size="icon" className="h-8 w-8 bg-sky-600 text-white shrink-0" onClick={sendDm} disabled={!dmText.trim()}><Send className="w-3 h-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}