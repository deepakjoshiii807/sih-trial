import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Search, Circle, ChevronLeft, Paperclip, Smile, Clock, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  sender: "me" | "other";
  text: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  initials: string;
  role: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1", name: "Aarav Sharma", initials: "AS", role: "Student · BAMS 3rd Year",
    lastMessage: "Thank you for shortlisting me! I'm available for the interview.", lastTime: "2 min ago", unread: 1, online: true,
    messages: [
      { id: "m-1", sender: "other", text: "Hi! I saw my application was shortlisted for the ML Research Intern position.", timestamp: "10:30 AM", read: true },
      { id: "m-2", sender: "me", text: "Yes Aarav, your profile stood out. We'd like to schedule an interview.", timestamp: "10:32 AM", read: true },
      { id: "m-3", sender: "other", text: "That's great! When would be a good time?", timestamp: "10:33 AM", read: true },
      { id: "m-4", sender: "me", text: "How about Thursday at 3 PM? It'll be a 30-min video call.", timestamp: "10:35 AM", read: true },
      { id: "m-5", sender: "other", text: "Thank you for shortlisting me! I'm available for the interview.", timestamp: "10:38 AM", read: false },
    ]
  },
  {
    id: "conv-2", name: "Rohan Gupta", initials: "RG", role: "Student · MD Pharmacology",
    lastMessage: "Could you share more details about the research project?", lastTime: "1 hour ago", unread: 0, online: true,
    messages: [
      { id: "m-6", sender: "other", text: "Hello, I'm interested in the Herbal Drug Safety research collaboration.", timestamp: "9:15 AM", read: true },
      { id: "m-7", sender: "me", text: "Hi Rohan! Great to hear. What's your background in pharmacology?", timestamp: "9:20 AM", read: true },
      { id: "m-8", sender: "other", text: "I'm in my first year of MD Pharmacology at BHU. I have experience with Python and statistical analysis.", timestamp: "9:22 AM", read: true },
      { id: "m-9", sender: "other", text: "Could you share more details about the research project?", timestamp: "9:25 AM", read: true },
    ]
  },
  {
    id: "conv-3", name: "Ananya Patel", initials: "AP", role: "Student · BAMS 2nd Year",
    lastMessage: "I've submitted the research proposal draft.", lastTime: "Yesterday", unread: 0, online: false,
    messages: [
      { id: "m-10", sender: "me", text: "Ananya, have you had a chance to review the literature review template?", timestamp: "Yesterday 3 PM", read: true },
      { id: "m-11", sender: "other", text: "I've submitted the research proposal draft.", timestamp: "Yesterday 4 PM", read: true },
    ]
  },
  {
    id: "conv-4", name: "Sneha Reddy", initials: "SR", role: "Student · BAMS 4th Year",
    lastMessage: "Thanks for the feedback on my publication draft!", lastTime: "2 days ago", unread: 0, online: false,
    messages: [
      { id: "m-12", sender: "me", text: "Sneha, your publication draft needs some revisions in the methodology section.", timestamp: "2 days ago", read: true },
      { id: "m-13", sender: "other", text: "Thanks for the feedback on my publication draft!", timestamp: "2 days ago", read: true },
    ]
  },
];

export function MessagingSystem() {
  const [selected, setSelected] = useState<string | null>(DEMO_CONVERSATIONS[0].id);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [localConversations, setLocalConversations] = useState(DEMO_CONVERSATIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = localConversations.find(c => c.id === selected);
  const filtered = localConversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  const sendMessage = () => {
    if (!input.trim() || !activeConv) return;
    const newMsg: Message = { id: `m-${Date.now()}`, sender: "me", text: input.trim(), timestamp: "Just now", read: true };
    setLocalConversations(prev => prev.map(c =>
      c.id === selected ? { ...c, messages: [...c.messages, newMsg], lastMessage: input.trim(), lastTime: "Just now" } : c
    ));
    setInput("");
  };

  return (
    <div className="col-span-12 border rounded-xl overflow-hidden flex" style={{ borderColor: "#E6E3D7", height: "480px" }}>
      {/* Conversation list */}
      <div className="w-72 border-r flex flex-col" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
        <div className="p-3 border-b" style={{ borderColor: "#E6E3D7" }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} style={{ color: "#244B35" }} />
            <h3 className="text-[13px] font-semibold" style={{ color: "#171A18" }}>Messages</h3>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] border focus:outline-none focus:ring-1"
              style={{ borderColor: "#E6E3D7", background: "white" }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className="w-full flex items-center gap-2.5 p-3 text-left transition-all hover:bg-white"
              style={{ background: selected === c.id ? "#DCE6D0" : "transparent" }}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-[11px]"
                  style={{ background: "#EDEBE0", color: "#171A18" }}>{c.initials}</div>
                {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#244B35" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[12px] truncate">{c.name}</span>
                  <span className="text-[9px] flex-shrink-0" style={{ color: "#888" }}>{c.lastTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] truncate" style={{ color: "#6B6F68" }}>{c.lastMessage}</span>
                  {c.unread > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full grid place-items-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: "#C98B5F" }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: "#E6E3D7", background: "white" }}>
            <div className="relative">
              <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-[11px]"
                style={{ background: "#DCE6D0", color: "#16301F" }}>{activeConv.initials}</div>
              {activeConv.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#244B35" }} />}
            </div>
            <div>
              <div className="font-semibold text-[13px]">{activeConv.name}</div>
              <div className="text-[10px] flex items-center gap-1" style={{ color: "#6B6F68" }}>
                {activeConv.online ? <><Circle size={6} fill="#244B35" style={{ color: "#244B35" }} /> Online</> : <><Clock size={10} /> Last seen {activeConv.lastTime}</>}
                {" · "}{activeConv.role}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "#F8F6F1" }}>
            {activeConv.messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-xl px-3 py-2 ${m.sender === "me" ? "" : ""}`}
                  style={{
                    background: m.sender === "me" ? "#244B35" : "white",
                    color: m.sender === "me" ? "white" : "#171A18",
                    border: m.sender === "me" ? "none" : "1px solid #E6E3D7",
                  }}>
                  <div className="text-[12px]">{m.text}</div>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-[9px]" style={{ opacity: 0.6 }}>{m.timestamp}</span>
                    {m.sender === "me" && <CheckCheck size={10} style={{ opacity: m.read ? 0.8 : 0.4 }} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t" style={{ borderColor: "#E6E3D7", background: "white" }}>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-all" style={{ color: "#888" }}>
                <Paperclip size={14} />
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-xl text-[12px] border focus:outline-none focus:ring-1"
                style={{ borderColor: "#E6E3D7" }} />
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-all" style={{ color: "#888" }}>
                <Smile size={14} />
              </button>
              <button onClick={sendMessage}
                className="p-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: input.trim() ? "#244B35" : "#E6E3D7", color: input.trim() ? "white" : "#999" }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid place-items-center" style={{ color: "#999" }}>
          <div className="text-center">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[13px]">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
