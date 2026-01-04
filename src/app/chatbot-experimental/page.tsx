"use client";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";

// Simple developer role check
function useIsDeveloper() {
  const { role } = useRole();
  return role?.toLowerCase() === "developer";
}

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function ChatbotExperimentalPage() {
  const isDev = useIsDeveloper();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hello! I am LabTrack AI (Experimental). How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDev) router.replace("/");
  }, [isDev, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { role: "user", text: input }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages(msgs => [...msgs, { role: "ai", text: data.text }]);
      } else {
        setMessages(msgs => [...msgs, { role: "ai", text: data.error || "AI did not respond." }]);
      }
    } catch (err: any) {
      setError("Network error. Try again.");
      setMessages(msgs => [...msgs, { role: "ai", text: "Network error. Try again." }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  if (!isDev) return null;

  return (
    <main className="flex flex-col h-screen bg-black text-foreground">
      <div className="flex-1 overflow-y-auto px-2 py-4 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-4">Chatbot (Experimental)</h1>
        {messages.map((msg, i) => (
          <div key={i} className={`flex mb-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap shadow-md text-sm
              ${msg.role === "user" ? "bg-sky-600 text-white" : "bg-white/10 text-foreground border border-white/10"}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={sendMessage} className="w-full max-w-2xl mx-auto flex gap-2 p-4 bg-black border-t border-white/10">
        <input
          className="flex-1 rounded bg-white/10 border border-white/10 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-sky-600"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-sky-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
      {error && <div className="text-red-500 text-center py-2">{error}</div>}
    </main>
  );
}
