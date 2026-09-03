import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

const VARIANT_CLASSES = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-white text-foreground border border-border hover:bg-black/[.03]",
  danger: "bg-white text-danger border border-danger/40 hover:bg-danger/5",
} as const;

const SIZE_CLASSES = {
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-4 text-lg",
} as const;

type Variant = keyof typeof VARIANT_CLASSES;
type Size = keyof typeof SIZE_CLASSES;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`${baseClasses} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${baseClasses} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
