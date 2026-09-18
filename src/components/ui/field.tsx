import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

const fieldClasses =
  "w-full rounded-lg border border-muted/50 bg-black/[.035] px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClasses} min-h-24 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClasses} ${className}`} {...props} />;
}

const gradientSearchClasses =
  "w-full rounded-lg border border-white/40 bg-white/10 px-3.5 py-2.5 text-base text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30";

/** Zoekveld dat direct op de blauwe achtergrond-gradient staat (niet in een witte kaart) — witte tekst i.p.v. de donkere standaardkleur, anders onleesbaar. */
export function GradientSearchInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="search" className={`${gradientSearchClasses} ${className}`} {...props} />;
}

export function Field({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
