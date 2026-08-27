import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, X, Send, Minimize2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SYSTEM_KNOWLEDGE = `You are KKTF Assistant, the AI helper for Kolej Kediaman Tun Fuad (KKTF), Universiti Malaysia Sabah.

Key baseline information:
- Check-in: After completing profile, go to Admin Office / Registration Counter to check in.
- Check-out: Go to Admin Office to check out, await admin approval.
- Leave applications: Submit via Leave module, requires warden/admin approval. Types: Weekend, Semester Break, Emergency, Medical.
- Facility bookings: Seminar Room, Multipurpose Hall, Badminton Court 1 & 2 — require admin approval.
- Maintenance: Report via Maintenance module (Electrical, Plumbing, Furniture, Internet, Cleaning).
- Visitors: Register via Visitors module with IC/passport, limited visiting hours.
- Fees: Pay hostel fees each semester, check status in Fees module.
- Emergency contacts: Contact warden on duty, or college admin office.
- Curfew: 11pm weekdays, 12am weekends (verify with warden for updates).
- Rules: No unauthorized guests in rooms, no smoking on premises, maintain cleanliness.

Onboarding / feature tour:
- New users see a guided, role-based tour automatically on their first dashboard visit.
- The tour explains the main modules (Dashboard, Maintenance, Leave, Announcements, etc.) per role.
- If a user asks to repeat, restart, show or open the tour/guide/panduan again, append the exact token [TOUR] at the end of your reply and tell them the tour will reopen. Do not explain the token.

Answer questions clearly and helpfully in the user's language (Malay/English). Prefer the injected live context below over the baseline when they conflict. If unsure, suggest contacting college administration.`;

const TOUR_TOKEN = '[TOUR]';

function TourButton() {
  function restart() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('kkms_tour_done_'))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    if (window.location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('kkms:restart-tour'));
    } else {
      window.location.href = '/';
    }
  }
  return (
    <button
      onClick={restart}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <Sparkles className="w-3.5 h-3.5" /> Mula Tour Semula
    </button>
  );
}

function MessageContent({ content }) {
  if (!content) return null;
  const hasTour = content.includes(TOUR_TOKEN);
  const clean = content.replace(TOUR_TOKEN, '').trim();
  return (
    <>
      <ReactMarkdown className="prose prose-sm max-w-none text-inherit [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 break-words">
        {clean}
      </ReactMarkdown>
      {hasTour && <TourButton />}
    </>
  );
}

export default function AIAssistant({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your KKTF Assistant. Ask me anything about hostel rules, processes, facilities or events! 😊\n\nNew here? Just say **\"tunjuk tour\"** and I'll reopen the guided tour." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Fetch live knowledge context when the panel opens (cached for the session).
  useEffect(() => {
    if (!open || context) return;
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [articles, events, announcements] = await Promise.all([
          base44.entities.KnowledgeArticle.filter({ status: 'active' }, '-created_date', 30),
          base44.entities.Event.list('-event_date', 8),
          base44.entities.Announcement.list('-publish_date', 8),
        ]);

        const activeArticles = (articles || []).filter(a => {
          if (a.expiry_date && a.expiry_date < today) return false;
          return true;
        });
        const upcomingEvents = (events || []).filter(e => e.event_date && e.event_date >= today).slice(0, 5);
        const recentNotices = (announcements || [])
          .filter(a => a.approval_status === 'published')
          .slice(0, 5);

        const blocks = [];
        if (activeArticles.length) {
          blocks.push('=== KNOWLEDGE BASE (admin-curated) ===\n' + activeArticles.map(a =>
            `[${a.category}] ${a.title}${a.effective_date ? ` (berkuat kuasa ${a.effective_date})` : ''}: ${a.content}`
          ).join('\n'));
        }
        if (upcomingEvents.length) {
          blocks.push('=== UPCOMING EVENTS ===\n' + upcomingEvents.map(e =>
            `${e.event_name} — ${e.event_date} ${e.event_time || ''} @ ${e.venue || ''}${e.organizer ? ` (organiser: ${e.organizer})` : ''}`
          ).join('\n'));
        }
        if (recentNotices.length) {
          blocks.push('=== RECENT PUBLISHED ANNOUNCEMENTS ===\n' + recentNotices.map(a =>
            `[${a.type}${a.priority ? '/' + a.priority : ''}] ${a.title} (${a.publish_date}): ${a.content}`
          ).join('\n'));
        }
        setContext(blocks.length ? blocks.join('\n\n') : '');
      } catch (e) {
        /* live context is best-effort */
      }
    })();
  }, [open]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const live = context ? `\n\nLIVE CONTEXT (most recent, authoritative):\n${context}\n` : '';
      const prompt = `${SYSTEM_KNOWLEDGE}${live}\n\nConversation history:\n${history}\n\nUser: ${userMsg}\n\nAssistant:`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(m => [...m, { role: 'assistant', content: response || "I'm sorry, I couldn't process that. Please try again." }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(m => [...m, { role: 'assistant', content: "Sorry, I am facing connection issues right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" style={{ height: '480px' }}>
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">KKTF Assistant</p>
                <p className="text-xs opacity-70">AI-powered help</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded transition-colors"><Minimize2 className="w-4 h-4" /></button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-background/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                  <MessageContent content={msg.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-none px-3 py-3 flex gap-1 items-center shadow-sm">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border bg-card flex gap-2">
            <Input
              className="flex-1 h-9 text-sm focus-visible:ring-primary"
              placeholder="Ask anything... (cth: 'tunjuk tour')"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
            />
            <Button size="icon" className="h-9 w-9 shrink-0 shadow-sm" onClick={send} disabled={!input.trim() || loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}