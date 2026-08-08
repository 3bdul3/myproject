"use client";

import { useState, type ChangeEvent } from "react";

/** A password input with a show/hide toggle — stays masked by default, click the eye to verify what you typed. */
export default function PasswordField({
  name,
  label,
  required,
  minLength,
  placeholder,
  autoFocus,
  autoComplete,
  value,
  onChange,
  defaultValue,
  compact,
  labelClassName,
}: {
  name: string;
  label?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  /** Smaller size, for dense inline forms (e.g. table-row credential fields). */
  compact?: boolean;
  labelClassName?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isControlled = value !== undefined;

  const inputClassName = compact
    ? "w-full rounded-lg border border-stone-300 px-2 py-1 pr-6 text-xs outline-none"
    : "w-full rounded-lg border border-stone-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const buttonClassName = compact
    ? "absolute inset-y-0 right-0 flex w-6 items-center justify-center text-stone-400 hover:text-stone-600"
    : "absolute inset-y-0 right-0 flex w-9 items-center justify-center text-stone-400 hover:text-stone-600";
  const iconClassName = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <div>
      {label && <label className={labelClassName ?? "mb-1 block text-sm font-medium text-stone-700"}>{label}</label>}
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          {...(isControlled ? { value, onChange } : { defaultValue })}
          className={inputClassName}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className={buttonClassName}
        >
          {visible ? <EyeOffIcon className={iconClassName} /> : <EyeIcon className={iconClassName} />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        d="M2.5 2.5l15 15M8.3 8.4a2.5 2.5 0 0 0 3.3 3.3M6.2 6.3C3.7 7.6 1.5 10 1.5 10s3 6 8.5 6c1.5 0 2.8-.4 3.9-1M15.7 13.8C17.3 12.5 18.5 10 18.5 10s-1.1-2.2-3.2-3.9C13.9 4.9 12 4 10 4c-.6 0-1.2.1-1.8.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
