"use client";

import React, { useState } from "react";

export default function AITestPage() {
  const [query, setQuery] = useState("What is a voltmeter?");
  const [candidatesText, setCandidatesText] = useState<string>(JSON.stringify([
    { id: "1", name: "Voltmeter" },
    { id: "2", name: "Multimeter" }
  ], null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    let candidates: any = [];
    try {
      candidates = JSON.parse(candidatesText);
      if (!Array.isArray(candidates)) throw new Error("Candidates must be a JSON array");
    } catch (err: any) {
      setError("Invalid candidates JSON: " + String(err.message || err));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/ai/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, candidates }),
      });

      const data = await resp.json();
      if (!resp.ok) setError(JSON.stringify(data));
      setResult(data);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Gemini / AI Proxy Test</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded bg-white/5 border border-white/10 p-2 text-sm"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Candidates (JSON array)</label>
          <textarea
            value={candidatesText}
            onChange={(e) => setCandidatesText(e.target.value)}
            className="w-full rounded bg-white/5 border border-white/10 p-2 text-sm font-mono"
            rows={8}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-3 py-2 bg-sky-600 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Running..." : "Run"}
          </button>
          <button
            type="button"
            className="px-3 py-2 border rounded text-sm"
            onClick={() => {
              setQuery("What is a voltmeter?");
              setCandidatesText(JSON.stringify([
                { id: "1", name: "Voltmeter" },
                { id: "2", name: "Multimeter" }
              ], null, 2));
              setResult(null);
              setError(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Result</h2>
        {error && (
          <pre className="mt-2 p-2 bg-red-900/40 text-sm text-red-200 rounded">{error}</pre>
        )}

        {result && (
          <pre className="mt-2 p-3 bg-white/5 text-sm rounded overflow-auto font-mono">{JSON.stringify(result, null, 2)}</pre>
        )}

        {!result && !error && (
          <div className="mt-2 text-sm text-gray-400">No result yet. Click "Run" to test the proxy.</div>
        )}
      </div>
    </div>
  );
}
