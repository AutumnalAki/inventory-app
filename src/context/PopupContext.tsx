"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, CheckCircle, ShieldAlert, Trash2 } from "lucide-react";

// Types
type PopupType = "alert" | "confirm";
type PopupVariant = "success" | "error" | "info" | "danger";

interface PopupOptions {
  title: string;
  message: string;
  variant?: PopupVariant;
  confirmText?: string;
  cancelText?: string;
}

interface PopupContextType {
  showAlert: (options: PopupOptions) => Promise<void>;
  showConfirm: (options: PopupOptions) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PopupOptions & { type: PopupType }>({
    type: "alert",
    title: "",
    message: "",
  });

  // Stores the resolve function for the Promise
  const resolveRef = useRef<(value?: any) => void>(() => {});

  const showAlert = (options: PopupOptions): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({ ...options, type: "alert" });
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  };

  const showConfirm = (options: PopupOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({ ...options, type: "confirm" });
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  };

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    
    // FIX: Explicitly cast the resolve function to satisfy TypeScript
    if (config.type === "confirm") {
      (resolveRef.current as (value: boolean) => void)(result);
    } else {
      (resolveRef.current as () => void)();
    }
  };

  // --- UI HELPERS ---
  const getIcon = () => {
    switch (config.variant) {
      case "success": return <CheckCircle className="text-emerald-400" size={32} />;
      case "error": return <ShieldAlert className="text-red-400" size={32} />;
      case "danger": return <Trash2 className="text-red-400" size={32} />;
      default: return <Info className="text-indigo-400" size={32} />;
    }
  };

  const getColors = () => {
    switch (config.variant) {
      case "success": return "bg-emerald-500/10 border-emerald-500/20";
      case "error": return "bg-red-500/10 border-red-500/20";
      case "danger": return "bg-red-900/20 border-red-500/30";
      default: return "bg-indigo-500/10 border-indigo-500/20";
    }
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getColors()}`}>
                  {getIcon()}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{config.message}</p>

                <div className="flex gap-3 justify-center">
                  {config.type === "confirm" && (
                    <button 
                      onClick={() => handleClose(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold transition-colors"
                    >
                      {config.cancelText || "Cancel"}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleClose(true)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-bold shadow-lg transition-all transform active:scale-95 ${
                      config.variant === 'danger' || config.variant === 'error'
                        ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                        : config.variant === 'success'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                    }`}
                  >
                    {config.confirmText || "Okay"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) throw new Error("usePopup must be used within a PopupProvider");
  return context;
}