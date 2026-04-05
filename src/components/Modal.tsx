"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { clsx } from "clsx";

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16 }}
            className={clsx(
              "w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl",
              className,
            )}
          >
            <div className="flex items-start justify-between border-b border-white/10 bg-white/5 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

            {footer ? (
              <div className="border-t border-white/10 bg-white/5 px-5 py-3">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
