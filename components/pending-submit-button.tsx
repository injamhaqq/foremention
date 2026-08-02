"use client";

import { useFormStatus } from "react-dom";
import type { MouseEventHandler, ReactNode } from "react";

export function PendingSubmitButton({ idle, pending, className = "", onClick }: { idle: ReactNode; pending: ReactNode; className?: string; onClick?: MouseEventHandler<HTMLButtonElement> }) {
  const { pending: isPending } = useFormStatus();
  return <button className={className} type="submit" disabled={isPending} aria-disabled={isPending} onClick={onClick}>{isPending ? pending : idle}</button>;
}
