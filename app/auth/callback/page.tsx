import { AuthCallback } from "@/components/auth-callback";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Verifying your email", description: "Complete Foremention account verification.", path: "/auth/callback", noIndex: true });

export default function AuthCallbackPage() {
  return <AuthCallback />;
}
