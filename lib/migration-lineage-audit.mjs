// Read-only migration ledger comparison. A matching name/version is a metadata
// match, never proof that the remote SQL equals the repository SQL.
export function compareMigrationLedger(local, remote) {
  if (!Array.isArray(local) || !Array.isArray(remote)) throw new TypeError("Both migration lists must be arrays");
  for (const item of local) {
    if (!/^\d{14}$/.test(item.version || "") || !/^[a-z0-9_]+$/.test(item.name || "")) {
      throw new Error("Invalid repository migration metadata");
    }
  }
  for (const item of remote) {
    if (!/^\d{14}$/.test(item.version || "") || !/^[a-z0-9_]+$/.test(item.name || "")) {
      throw new Error("Invalid remote migration ledger metadata");
    }
  }
  const index = new Map();
  for (const file of local) index.set(file.name, [...(index.get(file.name) || []), file]);
  const remoteByName = new Map();
  for (const entry of remote) remoteByName.set(entry.name, [...(remoteByName.get(entry.name) || []), entry]);
  const exact = remote.filter(r => (index.get(r.name) || []).some(l => l.version === r.version));
  const versionDrift = remote.filter(r => index.has(r.name) && !(index.get(r.name) || []).some(l => l.version === r.version))
    .map(r => ({ ...r, local_versions: index.get(r.name).map(l => l.version) }));
  const unmatchedRemote = remote.filter(r => !index.has(r.name));
  const unmatchedLocal = local.filter(l => !remoteByName.has(l.name));
  const duplicateRemoteNames = [...remoteByName].filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => ({ name, remote_versions: entries.map(x => x.version) }));
  // A suffix like _main_2c306677 is suggestive only. Never mark SQL as run
  // based on a guessed alias or auto-edit the remote migration ledger.
  const aliasCandidates = unmatchedRemote.flatMap(r => {
    const candidateName = r.name.replace(/_main_[a-f0-9]{7,40}$/, "");
    if (candidateName === r.name || !index.has(candidateName)) return [];
    return [{ remote: r, possible_local_name: candidateName, local_versions: index.get(candidateName).map(l => l.version), proof: "NONE—verify executed SQL and resultant schema" }];
  });
  return {
    counts: { local: local.length, remote: remote.length, exact_name_version_only: exact.length,
      name_match_version_drift: versionDrift.length, remote_without_name_match: unmatchedRemote.length,
      local_without_name_match: unmatchedLocal.length, duplicate_remote_name_groups: duplicateRemoteNames.length,
      alias_candidates_without_sql_proof: aliasCandidates.length },
    exact_name_version_only: exact, name_match_version_drift: versionDrift,
    remote_without_name_match: unmatchedRemote, local_without_name_match: unmatchedLocal,
    duplicate_remote_names: duplicateRemoteNames, alias_candidates_without_sql_proof: aliasCandidates,
    evidence_limit: "Metadata comparison only; never proof of equivalent executed SQL. Do not modify production history from this report."
  };
}
