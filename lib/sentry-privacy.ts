type PrivacySafeSentryEvent = {
  breadcrumbs?: unknown;
  exception?: { values?: Array<{ value?: string; mechanism?: { data?: unknown } }> };
  extra?: unknown;
  message?: string;
  request?: unknown;
  user?: unknown;
};

/**
 * Keep error type and stack frames useful while removing fields that can carry
 * customer prompts, answers, email addresses, request bodies, or credentials.
 */
export function scrubSentryEvent<T extends PrivacySafeSentryEvent>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.message;
  for (const exception of event.exception?.values || []) {
    exception.value = "Application error";
    if (exception.mechanism) delete exception.mechanism.data;
  }
  return event;
}
