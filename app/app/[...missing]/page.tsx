import { notFound } from "next/navigation";

// Unknown /app/* URLs render the signed-in 404 (app/app/not-found.tsx) inside
// the workspace shell. Specific routes always take precedence over this
// catch-all, and the /app layout still requires a signed-in viewer first.
export default function UnknownWorkspaceRoute() {
  notFound();
}
