"use client";

import React from "react";
import { cn } from "@/lib/cn";

// ---- Button ----
export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-court-700 text-court-100 hover:bg-court-400 hover:text-court-950 shadow-chamber",
    secondary:
      "bg-court-200 text-court-900 hover:bg-court-100 border border-court-400/40",
    ghost: "bg-transparent text-court-200 hover:bg-court-700/40",
    danger: "bg-red-800 text-red-100 hover:bg-red-700",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---- Card ----
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-court-400/30 bg-court-100 text-court-950 shadow-chamber",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-court-400/30 px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg text-court-900", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

// ---- Inputs ----
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-court-400/50 bg-white px-3 py-2 text-sm text-court-950 placeholder:text-court-400 focus:border-court-700 focus:outline-none focus:ring-2 focus:ring-court-400/40",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-court-400/50 bg-white px-3 py-2 text-sm text-court-950 placeholder:text-court-400 focus:border-court-700 focus:outline-none focus:ring-2 focus:ring-court-400/40",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-court-400/50 bg-white px-3 py-2 text-sm text-court-950 focus:border-court-700 focus:outline-none focus:ring-2 focus:ring-court-400/40",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-xs font-semibold uppercase tracking-wider text-court-700", className)} {...props} />
  );
}

// ---- Badge ----
export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "danger" | "warning" | "accent";
}) {
  const tones = {
    neutral: "bg-court-200 text-court-900",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    danger: "bg-red-100 text-red-800 border border-red-300",
    warning: "bg-amber-100 text-amber-800 border border-amber-300",
    accent: "bg-court-400/30 text-court-900 border border-court-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

// ---- ScoreBar ----
export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-court-900">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-court-200">
        <div
          className="h-2 rounded-full bg-court-400 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

// ---- Spinner ----
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-court-400 border-t-transparent",
        className,
      )}
    />
  );
}

// ---- Empty / Error states ----
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-court-400/50 bg-court-200/30 p-10 text-center">
      <p className="font-display text-court-200">{title}</p>
      {hint && <p className="mt-2 text-sm text-court-400">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-400/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}
