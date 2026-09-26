"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";

interface Props {
  onResults: (data: {
    items: Array<{
      id: string;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      department: string;
      status: string;
    }>;
    total: number;
    filters: Record<string, unknown>;
    query: string;
  }) => null;
}

export function AiSearch({ onResults }: Props) {
  const { setters } = useDirectoryFilters();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data.filters?.search) setters.setSearch(data.filters.search);
      if (data.filters?.dept) setters.setDept(data.filters.dept);
      if (data.filters?.status) setters.setStatus(data.filters.status);
      setters.setPage(1);

      onResults({ ...data, query });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI search failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-nexus-200 bg-white px-3 py-2 text-sm font-medium text-nexus-700 hover:bg-nexus-50"
      >
        <Sparkles className="h-4 w-4" />
        Ask AI
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-md border border-nexus-200 bg-nexus-50/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-nexus-700">
          <Sparkles className="h-4 w-4" />
          Ask in plain English
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
            setError(null);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
          }
        }}
        placeholder='Try: "engineers hired last quarter" or "sales reps on leave"'
        rows={2}
        className="input-field w-full"
        disabled={loading}
      />
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          disabled={loading}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-nexus-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-nexus-600 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>
    </div>
  );
}
