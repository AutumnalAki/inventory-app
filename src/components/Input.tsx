"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";

type BaseFieldProps = {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
};

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & BaseFieldProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className, containerClassName, ...props },
  ref,
) {
  return (
    <label className={clsx("block", containerClassName)}>
      {label && (
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        className={clsx(
          "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500",
          error && "border-red-500/70 focus:border-red-500",
          className,
        )}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-300">{error}</span>
      ) : helperText ? (
        <span className="mt-1 block text-xs text-gray-500">{helperText}</span>
      ) : null}
    </label>
  );
});

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  BaseFieldProps;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, helperText, className, containerClassName, ...props },
  ref,
) {
  return (
    <label className={clsx("block", containerClassName)}>
      {label && (
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      )}
      <textarea
        ref={ref}
        {...props}
        className={clsx(
          "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500",
          error && "border-red-500/70 focus:border-red-500",
          className,
        )}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-300">{error}</span>
      ) : helperText ? (
        <span className="mt-1 block text-xs text-gray-500">{helperText}</span>
      ) : null}
    </label>
  );
});

export type SelectInputProps = React.SelectHTMLAttributes<HTMLSelectElement> &
  BaseFieldProps;

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  function SelectInput(
    { label, error, helperText, className, containerClassName, children, ...props },
    ref,
  ) {
    return (
      <label className={clsx("block", containerClassName)}>
        {label && (
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            {label}
          </span>
        )}
        <select
          ref={ref}
          {...props}
          className={clsx(
            "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500",
            error && "border-red-500/70 focus:border-red-500",
            className,
          )}
        >
          {children}
        </select>
        {error ? (
          <span className="mt-1 block text-xs text-red-300">{error}</span>
        ) : helperText ? (
          <span className="mt-1 block text-xs text-gray-500">{helperText}</span>
        ) : null}
      </label>
    );
  },
);
