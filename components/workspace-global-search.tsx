"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim().slice(0, 160);
    router.push(normalized ? `/app/search?q=${encodeURIComponent(normalized)}` : "/app/search");
  }
  return <form className="workspace-global-search" role="search" onSubmit={submit}>
    <label className="sr-only" htmlFor="workspace-global-search">Search Foremention</label>
    <input id="workspace-global-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Foremention…" maxLength={160} />
    <button type="submit" aria-label="Search questions, AI results, sources, competitors, opportunities, and actions">Search</button>
  </form>;
}
