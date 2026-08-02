"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim().slice(0, 160);
    router.push(normalized ? `/app/intelligence?q=${encodeURIComponent(normalized)}#workspace-search` : "/app/intelligence#workspace-search");
  }
  return <form className="workspace-global-search" role="search" onSubmit={submit}>
    <label className="sr-only" htmlFor="workspace-global-search">Search workspace</label>
    <input id="workspace-global-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace" maxLength={160} />
    <button type="submit" aria-label="Search answers, sources, actions, and evidence">Search</button>
  </form>;
}
