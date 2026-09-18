export function operatingAgentOsEnabled() {
  return process.env.FOREMENTION_AGENT_OS_ENABLED === "1";
}
