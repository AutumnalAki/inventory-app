"use client";

import React, { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { supabase } from "@/lib/supabase";
import { Send, Trash } from "lucide-react";

export default function PushNotificationsPage() {
  const { role } = useRole();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    if (role !== "Developer") return;
    fetchLogs();
  }, [role]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("update_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setLogs(data as any[]);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePush = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title && !message) return;
    setLoading(true);
    try {
      // Get the current user's access token and call the server-side secure route
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any)?.session?.access_token;
      const res = await fetch('/api/dev/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ title, description: message }),
      });

      const payload = await res.json();
      if (!res.ok) throw payload;

      setTitle('');
      setMessage('');
      await fetchLogs();
    } catch (err) {
      console.error("Failed to push notification", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Delete this notification?")) return;
    try {
      const { error } = await supabase.from("update_logs").delete().eq("id", id);
      if (error) throw error;
      setLogs((l) => l.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Push Notifications</h1>
      <form onSubmit={handlePush} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline" className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message body" className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 h-28" />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md">
            <Send size={16} />
            <span>{loading ? 'Pushing...' : 'Push to users'}</span>
          </button>
          <button type="button" onClick={() => { setTitle(""); setMessage(""); }} className="px-3 py-2 rounded-md bg-white/5 border border-white/10">Clear</button>
        </div>
      </form>

      <section className="mt-8">
        <h2 className="font-semibold mb-2">Recent Pushes</h2>
        <div className="space-y-2">
          {logs.length === 0 && <div className="text-gray-400">No pushes yet.</div>}
          {logs.map((l) => (
            <div key={l.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{l.title || '(no title)'}</div>
                <div className="text-xs text-gray-400">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</div>
                <div className="mt-2 text-sm text-white">{l.message}</div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button onClick={() => handleDelete(l.id)} className="text-rose-400 hover:text-rose-300">
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
