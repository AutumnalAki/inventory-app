"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, Package, ClipboardList, 
  LayoutDashboard, FileText, Settings, Sparkles, CheckCircle, Users,
  MousePointer, Download, UserPlus, Eye, Edit2, Trash2, Key, BarChart3,
  Lightbulb, Send, History
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  route?: string;
  waitForElement?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  // === WELCOME ===
  {
    id: 1,
    title: "Welcome to CDM LabTrack!",
    description: "Your all-in-one laboratory inventory management system. Let's take a quick tour to help you get the most out of it.",
    icon: <Sparkles className="text-orange-500" size={28} />,
    route: "/dashboard",
  },

  // === DASHBOARD OVERVIEW ===
  {
    id: 2,
    title: "Dashboard Overview",
    description: "This is your command center. Here you can see a quick summary of your entire inventory at a glance.",
    icon: <LayoutDashboard className="text-indigo-500" size={28} />,
    selector: '[href="/dashboard"]',
    position: "right",
    route: "/dashboard",
  },
  {
    id: 3,
    title: "Interactive Stat Cards",
    description: "These cards show your inventory stats. Click on any card to instantly filter and view those specific items in your inventory!",
    icon: <MousePointer className="text-amber-500" size={28} />,
    selector: '[data-tour="stat-cards"]',
    position: "bottom",
    route: "/dashboard",
    waitForElement: true,
  },
  {
    id: 4,
    title: "Recent Activity",
    description: "Track all changes made to your inventory. Every add, edit, or delete is logged here for accountability.",
    icon: <BarChart3 className="text-cyan-500" size={28} />,
    selector: '[data-tour="activity-log"]',
    position: "left",
    route: "/dashboard",
    waitForElement: true,
  },

  // === INVENTORY ===
  {
    id: 5,
    title: "Inventory Management",
    description: "This is where you manage all your laboratory equipment. Let's explore its powerful features.",
    icon: <Package className="text-emerald-500" size={28} />,
    selector: '[href="/dashboard/inventory"]',
    position: "right",
    route: "/dashboard/inventory",
  },
  {
    id: 6,
    title: "Add New Items",
    description: "Click here to add new equipment to your inventory. Fill in the details like name, quantity, location, and condition.",
    icon: <Package className="text-emerald-500" size={28} />,
    selector: '[data-tour="add-item-btn"]',
    position: "bottom",
    route: "/dashboard/inventory",
    waitForElement: true,
  },
  {
    id: 7,
    title: "Filter & Search",
    description: "Use the lab tabs to filter by location, or use the search bar to find specific items. You can also filter by status and condition.",
    icon: <Package className="text-emerald-500" size={28} />,
    selector: '[data-tour="filter-tabs"]',
    position: "bottom",
    route: "/dashboard/inventory",
    waitForElement: true,
  },
  {
    id: 8,
    title: "Export Your Data",
    description: "Need reports? Click Export to download your inventory as PDF, Excel, or CSV. Perfect for documentation and audits!",
    icon: <Download className="text-blue-500" size={28} />,
    selector: '[data-tour="export-btn"]',
    position: "bottom",
    route: "/dashboard/inventory",
    waitForElement: true,
  },

  // === TRACKING ===
  {
    id: 9,
    title: "Item Tracking",
    description: "Monitor equipment loans and returns. See who borrowed what, when, and from which laboratory.",
    icon: <ClipboardList className="text-blue-500" size={28} />,
    selector: '[href="/dashboard/tracking"]',
    position: "right",
    route: "/dashboard/tracking",
  },
  {
    id: 10,
    title: "Log New Borrowing",
    description: "When someone borrows equipment, click here to record the transaction. Track student ID, items, and expected return dates.",
    icon: <ClipboardList className="text-blue-500" size={28} />,
    selector: '[data-tour="add-loan-btn"]',
    position: "bottom",
    route: "/dashboard/tracking",
    waitForElement: true,
  },

  // === REPORTS ===
  {
    id: 11,
    title: "Generate Reports",
    description: "Create comprehensive reports of your inventory and borrowing history. Export them for meetings or audits.",
    icon: <FileText className="text-purple-500" size={28} />,
    selector: '[href="/dashboard/reports"]',
    position: "right",
    route: "/dashboard/reports",
  },

  // === MEMBERS (Conditional - shown only if user has access) ===
  {
    id: 12,
    title: "Team Management",
    description: "As an administrator, you can manage who has access to the system. Let's learn how to add and manage team members.",
    icon: <Users className="text-rose-500" size={28} />,
    selector: '[href="/dashboard/members"]',
    position: "right",
    route: "/dashboard/members",
  },
  {
    id: 13,
    title: "Generate Invite Codes",
    description: "Click here to create invite codes for new members. You can set their role (Lab In-Charge, Program Chair, etc.) when generating.",
    icon: <Key className="text-amber-500" size={28} />,
    selector: '[data-tour="generate-code-btn"]',
    position: "bottom",
    route: "/dashboard/members",
    waitForElement: true,
  },
  {
    id: 14,
    title: "View Invite Codes",
    description: "Your generated codes appear here. Click the eye icon to reveal hidden codes, then share them with new team members to join.",
    icon: <Eye className="text-cyan-500" size={28} />,
    selector: '[data-tour="invite-codes-section"]',
    position: "top",
    route: "/dashboard/members",
    waitForElement: true,
  },
  {
    id: 15,
    title: "Edit & Delete Users",
    description: "Each user row has action buttons. Click Edit to change roles or information, or Delete to remove a user from the system.",
    icon: <Edit2 className="text-indigo-500" size={28} />,
    selector: '[data-tour="user-actions"]',
    position: "left",
    route: "/dashboard/members",
    waitForElement: true,
  },

  // === SUGGESTIONS (Conditional - shown only if user has access) ===
  {
    id: 16,
    title: "Suggestions Box",
    description: "Have ideas to improve CDM LabTrack? The Suggestions page lets you submit feature requests, report bugs, and share feedback with the development team.",
    icon: <Lightbulb className="text-amber-500" size={28} />,
    selector: '[href="/dashboard/suggestions"]',
    position: "right",
    route: "/dashboard/suggestions",
  },
  {
    id: 17,
    title: "Submit Suggestions",
    description: "Click here to submit a new suggestion. Choose a category, write a clear title and description, and your feedback will be reviewed by the development team.",
    icon: <Send className="text-blue-500" size={28} />,
    selector: '[data-tour="submit-suggestion-btn"]',
    position: "bottom",
    route: "/dashboard/suggestions",
    waitForElement: true,
  },

  // === UPDATE LOGS ===
  {
    id: 18,
    title: "Update Logs",
    description: "Stay informed about what's new! The Update Logs page shows all the latest features, improvements, and bug fixes added to CDM LabTrack.",
    icon: <History className="text-purple-500" size={28} />,
    selector: '[href="/dashboard/updates"]',
    position: "right",
    route: "/dashboard/updates",
  },

  // === SETTINGS ===
  {
    id: 19,
    title: "Personalize Settings",
    description: "Make CDM LabTrack yours! Change your accent color theme in Appearance, update your password in Security, and replay this tutorial anytime from the Help tab.",
    icon: <Settings className="text-gray-400" size={28} />,
    selector: '[href="/dashboard/settings"]',
    position: "right",
    route: "/dashboard/settings",
  },

  // === FINISH ===
  {
    id: 20,
    title: "You're All Set! 🎉",
    description: "You now know how to use CDM LabTrack! Start managing your laboratory inventory like a pro. Need help? Go to Settings → Help to replay this tutorial.",
    icon: <CheckCircle className="text-emerald-500" size={28} />,
    route: "/dashboard",
  },
];

interface OnboardingProps {
  onComplete: () => void;
  isOpen: boolean;
  canViewMembers?: boolean;
  canViewSuggestions?: boolean;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function Onboarding({ onComplete, isOpen, canViewMembers = false, canViewSuggestions = false }: OnboardingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const [availableSteps, setAvailableSteps] = useState<OnboardingStep[]>([]);

  // Filter steps based on user role (e.g., Members page only for admins/program chairs)
  useEffect(() => {
    if (isOpen) {
      let filteredSteps = ONBOARDING_STEPS;
      
      // Filter out members-related steps for non-admin users
      if (!canViewMembers) {
        filteredSteps = filteredSteps.filter(s => 
          !s.route?.includes("/members") && !s.selector?.includes("members")
        );
      }
      
      // Filter out suggestions-related steps for users without access
      if (!canViewSuggestions) {
        filteredSteps = filteredSteps.filter(s => 
          !s.route?.includes("/suggestions") && !s.selector?.includes("suggestions")
        );
      }
      
      setAvailableSteps(filteredSteps);
    }
  }, [isOpen, canViewMembers, canViewSuggestions]);

  const step = availableSteps[currentStep] || ONBOARDING_STEPS[0];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === availableSteps.length - 1;
  const progress = ((currentStep + 1) / availableSteps.length) * 100;

  // Navigate to the step's route if needed
  useEffect(() => {
    if (isOpen && step?.route && pathname !== step.route) {
      setIsNavigating(true);
      router.push(step.route);
    }
  }, [currentStep, isOpen, step?.route, pathname, router]);

  // Wait for navigation to complete
  useEffect(() => {
    if (isNavigating && pathname === step?.route) {
      const timeout = setTimeout(() => {
        setIsNavigating(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [pathname, step?.route, isNavigating]);

  // Calculate highlight position
  const updateHighlight = useCallback(() => {
    if (!step?.selector || isNavigating) {
      setHighlightRect(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(step.selector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setHighlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position
        const pos = step.position || "right";
        let tooltipTop = rect.top;
        let tooltipLeft = rect.left;
        const tooltipWidth = 360;
        const tooltipHeight = 280;

        if (pos === "right") {
          tooltipLeft = Math.min(rect.right + 20, window.innerWidth - tooltipWidth - 20);
          tooltipTop = rect.top + rect.height / 2;
        } else if (pos === "left") {
          tooltipLeft = Math.max(rect.left - tooltipWidth - 20, 20);
          tooltipTop = rect.top + rect.height / 2;
        } else if (pos === "bottom") {
          tooltipTop = Math.min(rect.bottom + 20, window.innerHeight - tooltipHeight - 20);
          tooltipLeft = rect.left + rect.width / 2;
        } else if (pos === "top") {
          tooltipTop = Math.max(rect.top - tooltipHeight - 20, 20);
          tooltipLeft = rect.left + rect.width / 2;
        }

        // Keep tooltip in viewport
        tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 20));
        tooltipTop = Math.max(20, Math.min(tooltipTop, window.innerHeight - tooltipHeight - 20));

        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
        return true;
      }
      return false;
    };

    // Try to find element, retry if waitForElement is set
    if (!findElement() && step.waitForElement) {
      const interval = setInterval(() => {
        if (findElement()) {
          clearInterval(interval);
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setHighlightRect(null);
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [step, isNavigating]);

  useEffect(() => {
    if (isOpen && !isNavigating) {
      const timeout = setTimeout(updateHighlight, 100);
      window.addEventListener("resize", updateHighlight);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener("resize", updateHighlight);
      };
    }
  }, [isOpen, currentStep, updateHighlight, isNavigating]);

  const handleNext = () => {
    if (isLastStep) {
      router.push("/dashboard");
      onComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
    onComplete();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleSkip();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, currentStep, isLastStep]);

  // Reset step when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsNavigating(false);
    }
  }, [isOpen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || availableSteps.length === 0) return null;

  const hasHighlight = highlightRect !== null && !isNavigating;
  const showCentered = !hasHighlight || step.position === "center";

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Dark Overlay with Spotlight Cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && !isNavigating && (
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ 
                    x: highlightRect.left,
                    y: highlightRect.top,
                    width: highlightRect.width,
                    height: highlightRect.height,
                    opacity: 1
                  }}
                  transition={{ duration: 0.3 }}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.85)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight Border Glow */}
        {hasHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              top: highlightRect!.top,
              left: highlightRect!.left,
              width: highlightRect!.width,
              height: highlightRect!.height,
            }}
            transition={{ duration: 0.3 }}
            className="absolute rounded-xl border-2 border-orange-500 pointer-events-none"
            style={{
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3)",
            }}
          />
        )}

        {/* Pulsing Ring Animation */}
        {hasHighlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute rounded-xl pointer-events-none"
            style={{
              top: highlightRect!.top,
              left: highlightRect!.left,
              width: highlightRect!.width,
              height: highlightRect!.height,
            }}
          >
            <span className="absolute inset-0 rounded-xl border-2 border-orange-500 animate-ping opacity-30" />
          </motion.div>
        )}

        {/* Loading indicator during navigation */}
        {isNavigating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-8 py-6 flex items-center gap-4"
            >
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white font-medium">Navigating...</span>
            </motion.div>
          </div>
        )}

        {/* Tooltip / Content Card */}
        {!isNavigating && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`absolute ${showCentered ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""}`}
            style={!showCentered ? { 
              top: tooltipPosition.top, 
              left: tooltipPosition.left,
            } : {}}
          >
            <div className="w-[360px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1 bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="p-5 pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-xs text-orange-500 font-semibold mb-0.5">
                        Step {currentStep + 1} of {availableSteps.length}
                      </p>
                      <h3 className="text-lg font-bold text-white leading-tight">{step.title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-gray-500 hover:text-white transition-colors p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentStep}
                    initial={{ opacity: 0, x: direction * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-400 text-sm leading-relaxed"
                  >
                    {step.description}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Step Dots */}
              <div className="flex items-center justify-center gap-1 pb-3 px-5 flex-wrap">
                {availableSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentStep ? 1 : -1);
                      setCurrentStep(index);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-5 bg-orange-500"
                        : index < currentStep
                        ? "w-1.5 bg-orange-500/50"
                        : "w-1.5 bg-white/20 hover:bg-white/30"
                    }`}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-between">
                <button
                  onClick={isFirstStep ? handleSkip : handlePrev}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  {isFirstStep ? (
                    "Skip Tour"
                  ) : (
                    <>
                      <ChevronLeft size={16} />
                      Back
                    </>
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    isLastStep
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {isLastStep ? (
                    <>
                      Get Started
                      <CheckCircle size={16} />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Keyboard hint */}
              <div className="px-5 pb-4 pt-0">
                <p className="text-[10px] text-gray-600 text-center">
                  Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-500">←</kbd>{" "}
                  <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-500">→</kbd> to navigate
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return createPortal(content, document.body);
}

// Hook to manage onboarding state (account-based)
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id);
          
          // Check if user has completed onboarding from database
          const { data } = await supabase
            .from('users')
            .select('onboarding_complete')
            .eq('id', session.user.id)
            .single();
          
          // Show onboarding if not completed (null, undefined, or false)
          if (!data?.onboarding_complete) {
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    checkOnboardingStatus();
  }, []);

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    
    if (userId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: true })
          .eq('id', userId);
      } catch (error) {
        console.error("Error saving onboarding status:", error);
      }
    }
  };

  const resetOnboarding = async () => {
    if (userId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_complete: false })
          .eq('id', userId);
        setShowOnboarding(true);
      } catch (error) {
        console.error("Error resetting onboarding status:", error);
      }
    }
  };

  return {
    showOnboarding,
    isLoaded,
    completeOnboarding,
    resetOnboarding,
  };
}
