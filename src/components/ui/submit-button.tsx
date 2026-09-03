"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({
  children,
  pendingLabel = "Bezig…",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "lg";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
