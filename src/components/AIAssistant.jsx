import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, X, Send, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SYSTEM_KNOWLEDGE = `You are KKTF Assistant, the AI helper for Kolej Kediaman Tun Fuad,(KKTF) Universiti Malays Sabah

Key information:
- Check-in: After Complete Profile, go To Admin Office/Registration Counter to Check in
- Check-out: Go to Admin Office to Check out, await admin approval
- Leave applications: Submit via Leave module, requires warden/admin approval. Types: Weekend, Semester Break, Emergency, Medical
- Facility bookings: Seminar Room, Multipurpose Hall, Badminton Court 1, Badminton Court 2 - require admin approval
- Maintenance: Report via Maintenance module (Electrical, Plumbing, Furniture, Internet, Cleaning)
- Visitors: Register via Visitors module with IC/passport, limited visiting hours
- Fees: Pay hostel fees each semester, check status in Fees module
- Emergency contacts: Contact warden on duty, or college admin office
- Curfew: 11pm weekdays, 12am weekends (check with warden for updates)
- Rules: No unauthorized guests in rooms, no smoking on premises, maintain cleanliness

Answer questions clearly and helpfully. If unsure, suggest contacting college administration.`;

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your KKTF Assistant. Ask me anything about hostel rules, processes, or facilities! 😊" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll ke mesej paling bawah setiap kali ada mesej baharu atau status loading berubah
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    
    // Mengosongkan input dengan serta-merta untuk UX yang lebih responsif
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Mengambil 6 sejarah perbualan terakhir untuk mengekalkan konteks memori chatbot
      const history = messages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
        .join('\n');
        
      const prompt = `${SYSTEM_KNOWLEDGE}\n\nConversation history:\n${history}\n\nStudent: ${userMsg}\n\nAssistant:`;

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
      {/* Floating Action Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" style={{ height: '480px' }}>
          
          {/* Header Bar */}
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

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-background/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                  <ReactMarkdown className="prose prose-sm max-w-none text-inherit [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 break-words">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {/* Loading / Typing Indicator Bubble */}
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

          {/* User Input Action Bar */}
          <div className="p-3 border-t border-border bg-card flex gap-2">
            <Input
              className="flex-1 h-9 text-sm focus-visible:ring-primary"
              placeholder="Ask anything..."
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