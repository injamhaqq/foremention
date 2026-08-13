declare module "cloudflare:workers" {
  export const env: {
    FOREMENTION_BUILD_COMMIT?: string;
    INNGEST_EVENT_KEY?: string;
    [key: string]: unknown;
  };
}
