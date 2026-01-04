"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, X, Send, Bot, User, Sparkles, 
  Package, BarChart3, ClipboardList, Search, Plus, 
  Loader2, ArrowRight, CheckCircle, AlertCircle, Edit3, Trash2,
  RefreshCw, TrendingDown, Zap, Clock, MapPin, AlertTriangle, 
  RotateCcw, Eye, Box, Wrench, Archive, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useInventory, Item, Loan } from "@/context/InventoryContext";

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: InlineAction[];
  items?: Item[];
  loans?: Loan[];
  suggestions?: string[];
}

interface InlineAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  data?: any;
}

interface ConversationContext {
  lastIntent: string;
  lastItems: Item[];
  lastLoans: Loan[];
  selectedItem: Item | null;
  selectedLoan: Loan | null;
  formData: Record<string, any>;
  formStep: number;
  awaitingConfirmation: string | null;
  pendingAction: { type: string; data: any } | null;
}

type ConversationMode = "normal" | "form" | "confirming" | "selecting";

// ============================================
// CONSTANTS
// ============================================

const LOCATIONS = [
  "Computer Laboratory", "Civil Engineering Laboratory", "Chemistry Laboratory",
  "Physics Laboratory", "Electrical Engineering Laboratory", "Mechanical Engineering Laboratory",
  "ECE Laboratory", "CPE Laboratory"
];

const LOCATION_ALIASES: Record<string, string> = {
  "computer": "Computer Laboratory", "comp": "Computer Laboratory", "it": "Computer Laboratory",
  "civil": "Civil Engineering Laboratory", "ce": "Civil Engineering Laboratory",
  "chemistry": "Chemistry Laboratory", "chem": "Chemistry Laboratory",
  "physics": "Physics Laboratory", "phys": "Physics Laboratory",
  "electrical": "Electrical Engineering Laboratory", "ee": "Electrical Engineering Laboratory",
  "mechanical": "Mechanical Engineering Laboratory", "me": "Mechanical Engineering Laboratory",
  "ece": "ECE Laboratory", "electronics": "ECE Laboratory",
  "cpe": "CPE Laboratory", "computer engineering": "CPE Laboratory",
};

const CONDITIONS = ["Available", "Broken", "For Repairs"];
const CONDITION_ALIASES: Record<string, string> = {
  "working": "Available", "good": "Available", "ok": "Available", "fine": "Available",
  "broken": "Broken", "damaged": "Broken", "not working": "Broken", "defective": "Broken",
  "repair": "For Repairs", "repairs": "For Repairs", "fix": "For Repairs", "maintenance": "For Repairs",
};

// Form field type
interface FormField {
  name: string;
  label: string;
  required: boolean;
  type?: string;
  options?: string[];
}

// Form field definitions
const ITEM_FIELDS: FormField[] = [
  { name: "name", label: "Item Name", required: true },
  { name: "controlId", label: "Control ID", required: true },
  { name: "quantity", label: "Quantity", required: true, type: "number" },
  { name: "location", label: "Location", required: true, options: LOCATIONS },
  { name: "supplier", label: "Supplier", required: false },
  { name: "condition", label: "Condition", required: true, options: CONDITIONS },
  { name: "remarks", label: "Remarks", required: false },
];

const LOAN_FIELDS: FormField[] = [
  { name: "studentId", label: "Borrower Name/ID", required: true },
  { name: "itemName", label: "Item Name", required: true },
  { name: "qty", label: "Quantity", required: true, type: "number" },
  { name: "section", label: "Program/Section", required: true },
  { name: "room", label: "Room", required: false },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseLocation(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (LOCATIONS.some(l => l.toLowerCase() === lower)) {
    return LOCATIONS.find(l => l.toLowerCase() === lower) || null;
  }
  for (const [alias, location] of Object.entries(LOCATION_ALIASES)) {
    if (lower.includes(alias)) return location;
  }
  return null;
}

function parseCondition(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (CONDITIONS.some(c => c.toLowerCase() === lower)) {
    return CONDITIONS.find(c => c.toLowerCase() === lower) || null;
  }
  for (const [alias, condition] of Object.entries(CONDITION_ALIASES)) {
    if (lower.includes(alias)) return condition;
  }
  return null;
}

function parseQuantity(input: string): number | null {
  const match = input.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    return isNaN(num) || num < 0 ? null : num;
  }
  return null;
}

// Smart parsing for quick add commands
function parseQuickAddItem(message: string): Partial<Item> | null {
  const patterns = [
    // "add 5 oscilloscopes to chemistry lab"
    /add\s+(\d+)\s+(.+?)\s+(?:to|in|at)\s+(.+?)(?:\s+lab(?:oratory)?)?$/i,
    // "add oscilloscope qty 5 location chemistry"
    /add\s+(.+?)\s+qty\s*(\d+)\s+(?:location|loc|in)\s+(.+)/i,
    // "quick add: oscilloscope, 5, chemistry lab"
    /quick\s+add[:\s]+(.+?),\s*(\d+),\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const [, first, second, third] = match;
      // Determine order based on pattern
      if (/^\d+$/.test(first)) {
        // Pattern: add [qty] [name] to [location]
        return {
          quantity: parseInt(first),
          name: second.trim(),
          location: parseLocation(third) || third.trim(),
        };
      } else {
        // Pattern: add [name] qty [qty] location [location]
        return {
          name: first.trim(),
          quantity: parseInt(second),
          location: parseLocation(third) || third.trim(),
        };
      }
    }
  }
  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<ConversationMode>("normal");
  const [context, setContext] = useState<ConversationContext>({
    lastIntent: "",
    lastItems: [],
    lastLoans: [],
    selectedItem: null,
    selectedLoan: null,
    formData: {},
    formStep: 0,
    awaitingConfirmation: null,
    pendingAction: null,
  });
  const [currentFormType, setCurrentFormType] = useState<"item" | "loan" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { inventory, loans, addItem, updateItem, deleteItem, addLoan, returnLoan } = useInventory();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const alerts = getAlerts();
      let welcome = `Hi! 👋 I'm your **LabTrack AI Assistant**. I can:

📦 **Manage Inventory** - Add, edit, search, update items
📋 **Track Loans** - Record borrowings, mark returns
📊 **Get Insights** - Status, alerts, analytics
🚀 **Quick Commands** - Natural language actions`;

      if (alerts.length > 0) {
        welcome += `\n\n⚡ **Alerts:**\n${alerts.slice(0, 3).map(a => `• ${a}`).join("\n")}`;
      }

      addBotMessage(welcome, {
        suggestions: ["Quick add item", "Show low stock", "Record a loan", "Status report"]
      });
    }
  }, [isOpen, messages.length]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const getAlerts = useCallback(() => {
    const alerts: string[] = [];
    const lowStock = inventory.filter(i => i.stock === "Low Stock" || i.stock === "Out of Stock");
    const broken = inventory.filter(i => i.condition === "Broken" || i.condition === "For Repairs");
    const overdueLoans = loans.filter(l => l.status === "Borrowed"); // Could add date check

    if (lowStock.length > 0) alerts.push(`${lowStock.length} items low/out of stock`);
    if (broken.length > 0) alerts.push(`${broken.length} items need repair`);
    if (overdueLoans.length > 5) alerts.push(`${overdueLoans.length} active loans`);
    
    return alerts;
  }, [inventory, loans]);

  const getStats = useCallback(() => ({
    total: inventory.length,
    inStock: inventory.filter(i => i.stock === "In Stock").length,
    lowStock: inventory.filter(i => i.stock === "Low Stock").length,
    outOfStock: inventory.filter(i => i.stock === "Out of Stock").length,
    available: inventory.filter(i => i.condition === "Available").length,
    broken: inventory.filter(i => i.condition === "Broken").length,
    forRepairs: inventory.filter(i => i.condition === "For Repairs").length,
    activeLoans: loans.filter(l => l.status === "Borrowed").length,
    totalLoans: loans.length,
  }), [inventory, loans]);

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  const addBotMessage = useCallback((content: string, extras?: Partial<Message>) => {
    setMessages(prev => [...prev, {
      id: `bot-${Date.now()}`,
      role: "assistant",
      content,
      timestamp: new Date(),
      ...extras
    }]);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date()
    }]);
  }, []);

  // ============================================
  // SEARCH & FILTER
  // ============================================

  // Simple stemming to handle plurals
  const stemWord = useCallback((word: string): string[] => {
    const variations = [word];
    // Handle common plural forms
    if (word.endsWith('s')) {
      variations.push(word.slice(0, -1)); // testers -> tester
      if (word.endsWith('es')) {
        variations.push(word.slice(0, -2)); // boxes -> box
      }
      if (word.endsWith('ies')) {
        variations.push(word.slice(0, -3) + 'y'); // batteries -> battery
      }
    } else {
      variations.push(word + 's'); // tester -> testers
      variations.push(word + 'es'); // box -> boxes
    }
    return variations;
  }, []);

  const searchItems = useCallback((query: string, filters?: { location?: string; condition?: string; stock?: string }) => {
    let results = [...inventory];
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

    // Text search with stemming
    if (terms.length > 0) {
      results = results.filter(item => {
        const itemText = `${item.name} ${item.controlId} ${item.supplier || ''} ${item.location}`.toLowerCase();
        return terms.some(term => {
          const variations = stemWord(term);
          return variations.some(v => itemText.includes(v));
        });
      });
    }

    // Apply filters
    if (filters?.location) {
      const loc = parseLocation(filters.location);
      if (loc) results = results.filter(i => i.location === loc);
    }
    if (filters?.condition) {
      const cond = parseCondition(filters.condition);
      if (cond) results = results.filter(i => i.condition === cond);
    }
    if (filters?.stock) {
      results = results.filter(i => i.stock.toLowerCase().includes(filters.stock!.toLowerCase()));
    }

    return results;
  }, [inventory, stemWord]);

  const parseSearchQuery = useCallback((message: string) => {
    const filters: { query: string; location?: string; condition?: string; stock?: string } = { query: "" };
    let remaining = message.toLowerCase();

    // Extract location
    const locMatch = remaining.match(/(?:in|at|from)\s+(\w+(?:\s+\w+)?)\s*(?:lab(?:oratory)?)?/i);
    if (locMatch) {
      filters.location = locMatch[1];
      remaining = remaining.replace(locMatch[0], " ");
    }

    // Extract condition
    for (const cond of [...CONDITIONS, ...Object.keys(CONDITION_ALIASES)]) {
      if (remaining.includes(cond.toLowerCase())) {
        filters.condition = cond;
        remaining = remaining.replace(new RegExp(cond, "gi"), " ");
        break;
      }
    }

    // Extract stock status
    if (remaining.includes("low stock") || remaining.includes("running low")) {
      filters.stock = "Low Stock";
      remaining = remaining.replace(/low stock|running low/gi, " ");
    } else if (remaining.includes("out of stock") || remaining.includes("no stock")) {
      filters.stock = "Out of Stock";
      remaining = remaining.replace(/out of stock|no stock/gi, " ");
    }

    // Clean up remaining as search query
    filters.query = remaining
      .replace(/(?:search|find|show|list|get|display|look\s+for|where\s+is|locate)\s*/gi, "")
      .replace(/(?:items?|equipment|all)\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return filters;
  }, []);

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleAction = useCallback(async (actionId: string, data?: any) => {
    setIsTyping(true);

    try {
      switch (actionId) {
        case "confirm-add-item": {
          const itemData = context.pendingAction?.data;
          if (itemData) {
            const stock = itemData.quantity === 0 ? "Out of Stock" : itemData.quantity <= 5 ? "Low Stock" : "In Stock";
            await addItem({ ...itemData, stock, condition: itemData.condition || "Available" });
            addBotMessage(`✅ **Success!** Added **${itemData.name}** to inventory.

• Quantity: ${itemData.quantity}
• Location: ${itemData.location}
• Condition: ${itemData.condition || "Available"}`, {
              suggestions: ["Add another item", "View inventory", "Show status"]
            });
          }
          resetContext();
          break;
        }

        case "confirm-add-loan": {
          const loanData = context.pendingAction?.data;
          if (loanData) {
            await addLoan(loanData);
            addBotMessage(`✅ **Loan Recorded!**

• Borrower: ${loanData.studentId}
• Item: ${loanData.itemName}
• Quantity: ${loanData.qty}`, {
              suggestions: ["Record another loan", "View tracking", "Show active loans"]
            });
          }
          resetContext();
          break;
        }

        case "confirm-update-item": {
          const { id, updates } = context.pendingAction?.data || {};
          if (id && updates) {
            await updateItem(id, updates);
            addBotMessage(`✅ **Updated!** Item has been modified.`, {
              suggestions: ["View inventory", "Show status"]
            });
          }
          resetContext();
          break;
        }

        case "confirm-delete-item": {
          const item = context.pendingAction?.data;
          if (item?.id) {
            await deleteItem(item.id);
            addBotMessage(`✅ **Deleted!** **${item.name}** has been removed.`, {
              suggestions: ["View inventory", "Add new item"]
            });
          }
          resetContext();
          break;
        }

        case "return-loan": {
          if (data?.id) {
            await returnLoan(data.id);
            addBotMessage(`✅ **Loan Returned!** Marked as returned.`, {
              suggestions: ["View tracking", "Show active loans"]
            });
          }
          break;
        }

        case "select-item": {
          if (data) {
            setContext(prev => ({ ...prev, selectedItem: data }));
            addBotMessage(`Selected **${data.name}** (${data.controlId})

What would you like to do?`, {
              actions: [
                { id: "edit-selected", label: "Edit", icon: <Edit3 size={12} />, variant: "secondary" },
                { id: "mark-broken", label: "Mark Broken", icon: <Wrench size={12} />, variant: "danger", data },
                { id: "mark-available", label: "Mark Available", icon: <CheckCircle size={12} />, variant: "success", data },
                { id: "delete-selected", label: "Delete", icon: <Trash2 size={12} />, variant: "danger", data },
              ],
              suggestions: ["Go back", "View inventory"]
            });
          }
          break;
        }

        case "mark-broken": {
          if (data?.id) {
            setContext(prev => ({
              ...prev,
              pendingAction: { type: "update-item", data: { id: data.id, updates: { condition: "Broken" } } },
              awaitingConfirmation: "confirm-update-item"
            }));
            setMode("confirming");
            addBotMessage(`Mark **${data.name}** as **Broken**?`, {
              actions: [
                { id: "confirm-update-item", label: "Yes, mark broken", variant: "danger" },
                { id: "cancel", label: "Cancel", variant: "secondary" },
              ]
            });
          }
          break;
        }

        case "mark-available": {
          if (data?.id) {
            await updateItem(data.id, { condition: "Available" });
            addBotMessage(`✅ **${data.name}** marked as **Available**.`, {
              suggestions: ["View inventory", "Show broken items"]
            });
          }
          break;
        }

        case "delete-selected": {
          if (data) {
            setContext(prev => ({
              ...prev,
              pendingAction: { type: "delete-item", data },
              awaitingConfirmation: "confirm-delete-item"
            }));
            setMode("confirming");
            addBotMessage(`⚠️ **Delete ${data.name}?** This cannot be undone.`, {
              actions: [
                { id: "confirm-delete-item", label: "Yes, delete", variant: "danger" },
                { id: "cancel", label: "Cancel", variant: "secondary" },
              ]
            });
          }
          break;
        }

        case "cancel":
          resetContext();
          addBotMessage("Cancelled. What else can I help with?", {
            suggestions: ["Add item", "Search inventory", "Show status"]
          });
          break;

        case "navigate":
          if (data?.path) {
            router.push(data.path);
            setIsOpen(false);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      addBotMessage(`❌ **Error:** Something went wrong. Please try again.`);
      resetContext();
    }

    setIsTyping(false);
  }, [context, addItem, updateItem, deleteItem, addLoan, returnLoan, router, addBotMessage]);

  const resetContext = useCallback(() => {
    setContext({
      lastIntent: "",
      lastItems: [],
      lastLoans: [],
      selectedItem: null,
      selectedLoan: null,
      formData: {},
      formStep: 0,
      awaitingConfirmation: null,
      pendingAction: null,
    });
    setMode("normal");
    setCurrentFormType(null);
  }, []);

  // ============================================
  // FORM HANDLING
  // ============================================

  const startItemForm = useCallback((prefill?: Partial<Item>) => {
    setCurrentFormType("item");
    setMode("form");
    setContext(prev => ({
      ...prev,
      formData: prefill || {},
      formStep: prefill?.name ? 1 : 0, // Skip name if provided
    }));

    const firstField = ITEM_FIELDS[prefill?.name ? 1 : 0];
    let prompt = prefill?.name
      ? `Adding **${prefill.name}**. What's the **Control ID**?`
      : `Let's add a new item! 📦\n\n**What's the item name?**`;
    
    if (prefill?.quantity) prompt = `Adding **${prefill.name}** (${prefill.quantity} pcs).\n\nWhat's the **Control ID**?`;

    addBotMessage(prompt, {
      suggestions: ["Cancel"]
    });
  }, [addBotMessage]);

  const startLoanForm = useCallback(() => {
    setCurrentFormType("loan");
    setMode("form");
    setContext(prev => ({ ...prev, formData: {}, formStep: 0 }));
    addBotMessage(`Let's record a loan! 📋\n\n**What's the borrower's name?**`, {
      suggestions: ["Cancel"]
    });
  }, [addBotMessage]);

  const handleFormInput = useCallback((input: string) => {
    const fields = currentFormType === "item" ? ITEM_FIELDS : LOAN_FIELDS;
    const field = fields[context.formStep];
    
    if (!field) {
      resetContext();
      return;
    }

    let value: any = input.trim();

    // Validate
    if (field.type === "number") {
      const num = parseQuantity(value);
      if (num === null) {
        addBotMessage(`Please enter a valid number for **${field.label}**.`);
        return;
      }
      value = num;
    }

    if (field.options) {
      const parsed = field.name === "location" ? parseLocation(value) : parseCondition(value);
      if (parsed) {
        value = parsed;
      } else if (field.required) {
        addBotMessage(`Please choose: ${field.options.join(", ")}`);
        return;
      }
    }

    if (field.required && !value && value !== 0) {
      addBotMessage(`**${field.label}** is required.`);
      return;
    }

    // Handle skip
    if (input.toLowerCase() === "skip" && !field.required) {
      value = "";
    }

    // Update form data
    const newFormData = { ...context.formData, [field.name]: value };
    const nextStep = context.formStep + 1;

    if (nextStep < fields.length) {
      const nextField = fields[nextStep];
      let prompt = `Got it! **${nextField.label}**?`;
      
      if (nextField.options) {
        prompt += `\n\nOptions: ${nextField.options.join(", ")}`;
      }
      if (!nextField.required) {
        prompt += `\n\n_(Type "skip" to skip)_`;
      }

      setContext(prev => ({ ...prev, formData: newFormData, formStep: nextStep }));
      addBotMessage(prompt);
    } else {
      // Form complete
      completeForm(newFormData);
    }
  }, [context, currentFormType, addBotMessage, resetContext]);

  const completeForm = useCallback((data: Record<string, any>) => {
    if (currentFormType === "item") {
      const summary = `📦 **New Item:**
• Name: ${data.name}
• Control ID: ${data.controlId}
• Quantity: ${data.quantity}
• Location: ${data.location}
• Supplier: ${data.supplier || "—"}
• Condition: ${data.condition}
${data.remarks ? `• Remarks: ${data.remarks}` : ""}

**Add this item?**`;

      setContext(prev => ({
        ...prev,
        pendingAction: { type: "add-item", data },
        awaitingConfirmation: "confirm-add-item"
      }));
      setMode("confirming");
      addBotMessage(summary, {
        actions: [
          { id: "confirm-add-item", label: "Yes, add item", variant: "success", icon: <CheckCircle size={12} /> },
          { id: "cancel", label: "Cancel", variant: "secondary" },
        ]
      });
    } else if (currentFormType === "loan") {
      const summary = `📋 **New Loan:**
• Borrower: ${data.studentId}
• Item: ${data.itemName}
• Quantity: ${data.qty}
• Section: ${data.section}
${data.room ? `• Room: ${data.room}` : ""}

**Record this loan?**`;

      setContext(prev => ({
        ...prev,
        pendingAction: { type: "add-loan", data },
        awaitingConfirmation: "confirm-add-loan"
      }));
      setMode("confirming");
      addBotMessage(summary, {
        actions: [
          { id: "confirm-add-loan", label: "Yes, record", variant: "success", icon: <CheckCircle size={12} /> },
          { id: "cancel", label: "Cancel", variant: "secondary" },
        ]
      });
    }
  }, [currentFormType, addBotMessage]);

  // ============================================
  // MAIN MESSAGE PROCESSOR
  // ============================================

  const processMessage = useCallback(async (userInput: string) => {
    const msg = userInput.trim();
    if (!msg) return;

    addUserMessage(msg);
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const msgLower = msg.toLowerCase();

    // Handle confirmation mode
    if (mode === "confirming") {
      if (/^(yes|yeah|yep|ok|sure|confirm|do it)$/i.test(msg)) {
        if (context.awaitingConfirmation) {
          await handleAction(context.awaitingConfirmation);
        }
      } else if (/^(no|nope|cancel|stop)$/i.test(msg)) {
        await handleAction("cancel");
      } else {
        addBotMessage("Please confirm with **Yes** or **No**.");
      }
      setIsTyping(false);
      return;
    }

    // Handle form mode
    if (mode === "form") {
      if (/^cancel$/i.test(msg)) {
        resetContext();
        addBotMessage("Cancelled! What else can I help with?", {
          suggestions: ["Add item", "Record loan", "Status"]
        });
        setIsTyping(false);
        return;
      }
      handleFormInput(msg);
      setIsTyping(false);
      return;
    }

    // === QUICK ADD (one-line commands) ===
    const quickAdd = parseQuickAddItem(msg);
    if (quickAdd && quickAdd.name && quickAdd.quantity !== undefined) {
      // Validate location
      const location = quickAdd.location ? parseLocation(quickAdd.location) : null;
      if (location) {
        quickAdd.location = location;
      }
      startItemForm(quickAdd);
      setIsTyping(false);
      return;
    }

    // === INTENT DETECTION ===

    // Add item
    if (/(?:add|create|new)\s*(?:an?\s+)?(?:item|equipment)/i.test(msgLower)) {
      startItemForm();
      setIsTyping(false);
      return;
    }

    // Record loan
    if (/(?:add|create|new|record)\s*(?:a?\s+)?(?:loan|borrow)/i.test(msgLower)) {
      startLoanForm();
      setIsTyping(false);
      return;
    }

    // Return loan
    if (/(?:return|returned|mark.*return)/i.test(msgLower)) {
      const activeLoans = loans.filter(l => l.status === "Borrowed");
      if (activeLoans.length === 0) {
        addBotMessage("No active loans to return.", { suggestions: ["View tracking", "Record loan"] });
      } else {
        addBotMessage(`**Active Loans (${activeLoans.length}):**\n\nSelect one to mark as returned:`, {
          loans: activeLoans.slice(0, 5),
          actions: activeLoans.slice(0, 5).map(loan => ({
            id: "return-loan",
            label: `${loan.studentId} - ${loan.itemName}`,
            variant: "secondary" as const,
            data: loan
          })),
          suggestions: activeLoans.length > 5 ? ["View all in tracking"] : undefined
        });
      }
      setIsTyping(false);
      return;
    }

    // Search / Find
    if (/(?:search|find|show|list|where|locate|get)/i.test(msgLower)) {
      const filters = parseSearchQuery(msg);
      const results = searchItems(filters.query, filters);

      if (results.length === 0) {
        addBotMessage(`🔍 No items found matching your search.`, {
          suggestions: ["Show all items", "Add new item", "Try different search"]
        });
      } else if (results.length <= 8) {
        addBotMessage(`🔍 Found **${results.length}** item(s):`, {
          items: results,
          actions: results.map(item => ({
            id: "select-item",
            label: `${item.name} (${item.quantity})`,
            variant: "secondary" as const,
            data: item
          })),
          suggestions: ["Add new item", "Search again"]
        });
      } else {
        addBotMessage(`🔍 Found **${results.length}** items. Showing first 8:`, {
          items: results.slice(0, 8),
          actions: [{ id: "navigate", label: "View all in inventory", variant: "primary", data: { path: "/dashboard/inventory" } }],
          suggestions: ["Narrow search", "Add filters"]
        });
      }
      setContext(prev => ({ ...prev, lastItems: results, lastIntent: "search" }));
      setIsTyping(false);
      return;
    }

    // Status / Overview
    if (/(?:status|overview|summary|report|stats|how many|dashboard)/i.test(msgLower)) {
      const stats = getStats();
      addBotMessage(`📊 **Inventory Status:**

📦 **Total Items:** ${stats.total}
├ ✅ In Stock: ${stats.inStock}
├ ⚠️ Low Stock: ${stats.lowStock}
└ ❌ Out of Stock: ${stats.outOfStock}

🔧 **Condition:**
├ ✅ Available: ${stats.available}
├ 🛠️ For Repairs: ${stats.forRepairs}
└ ❌ Broken: ${stats.broken}

📋 **Loans:** ${stats.activeLoans} active / ${stats.totalLoans} total`, {
        actions: [
          { id: "navigate", label: "View Reports", variant: "primary", data: { path: "/dashboard/reports" } },
        ],
        suggestions: ["Show low stock", "Show broken items", "Show active loans"]
      });
      setIsTyping(false);
      return;
    }

    // Low stock
    if (/low\s*stock|running\s*low|needs?\s*restock/i.test(msgLower)) {
      const lowStock = inventory.filter(i => i.stock === "Low Stock" || i.stock === "Out of Stock");
      if (lowStock.length === 0) {
        addBotMessage("✅ All items are well-stocked!", { suggestions: ["Show status", "Add item"] });
      } else {
        addBotMessage(`⚠️ **${lowStock.length} items need attention:**`, {
          items: lowStock.slice(0, 8),
          suggestions: lowStock.length > 8 ? ["View all in inventory"] : ["Add item", "Show status"]
        });
      }
      setIsTyping(false);
      return;
    }

    // Broken items
    if (/broken|damaged|needs?\s*repair|for\s*repair/i.test(msgLower)) {
      const broken = inventory.filter(i => i.condition === "Broken" || i.condition === "For Repairs");
      if (broken.length === 0) {
        addBotMessage("✅ No broken items!", { suggestions: ["Show status", "Add item"] });
      } else {
        addBotMessage(`🔧 **${broken.length} items need attention:**`, {
          items: broken.slice(0, 8),
          actions: broken.slice(0, 5).map(item => ({
            id: "select-item",
            label: `${item.name} - ${item.condition}`,
            variant: "secondary" as const,
            data: item
          })),
          suggestions: ["Mark item available", "View inventory"]
        });
      }
      setIsTyping(false);
      return;
    }

    // Active loans
    if (/active\s*loans?|borrowed|who\s*borrow/i.test(msgLower)) {
      const active = loans.filter(l => l.status === "Borrowed");
      if (active.length === 0) {
        addBotMessage("📋 No active loans.", { suggestions: ["Record loan", "View tracking"] });
      } else {
        addBotMessage(`📋 **${active.length} Active Loans:**`, {
          loans: active.slice(0, 6),
          actions: [{ id: "navigate", label: "View Tracking", variant: "primary", data: { path: "/dashboard/tracking" } }]
        });
      }
      setIsTyping(false);
      return;
    }

    // Navigation
    const navMatch = msgLower.match(/(?:go\s*to|open|navigate|show)\s*(\w+)/);
    if (navMatch) {
      const dest = navMatch[1];
      const routes: Record<string, string> = {
        dashboard: "/dashboard", home: "/dashboard", inventory: "/dashboard/inventory",
        items: "/dashboard/inventory", tracking: "/dashboard/tracking", loans: "/dashboard/tracking",
        reports: "/dashboard/reports", analytics: "/dashboard/reports", members: "/dashboard/members",
        settings: "/dashboard/settings"
      };
      if (routes[dest]) {
        router.push(routes[dest]);
        setIsOpen(false);
        setIsTyping(false);
        return;
      }
    }

    // Greetings
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))[\s!]*$/i.test(msg)) {
      addBotMessage("Hello! 👋 How can I help you today?", {
        suggestions: ["Add item", "Record loan", "Show status", "Help"]
      });
      setIsTyping(false);
      return;
    }

    // Thanks
    if (/thank|thanks|thx/i.test(msgLower)) {
      addBotMessage("You're welcome! 😊 Anything else?", {
        suggestions: ["Add item", "Show status", "Help"]
      });
      setIsTyping(false);
      return;
    }

    // Help
    if (/help|what can you|how do i|commands/i.test(msgLower)) {
      addBotMessage(`🤖 **LabTrack AI Commands:**

**📦 Inventory:**
• "Add item" - Step-by-step item creation
• "Add 5 oscilloscopes to Chemistry Lab" - Quick add
• "Find multimeter" - Search items
• "Show broken items" - Filter by condition
• "Show low stock" - Stock alerts

**📋 Loans:**
• "Record loan" - New borrowing
• "Return loan" - Mark as returned
• "Show active loans" - Current borrowings

**📊 Analytics:**
• "Status" - Overview dashboard
• "Go to reports" - Full analytics

**💡 Tips:**
• Use natural language!
• Say "cancel" to stop any action
• Say "skip" for optional fields`, {
        suggestions: ["Try it out!", "Show status"]
      });
      setIsTyping(false);
      return;
    }

    // Default
    addBotMessage(`I'm not sure what you mean. Try:

• **"Add item"** - Add new equipment
• **"Find [name]"** - Search inventory
• **"Record loan"** - Track borrowing
• **"Status"** - Get overview
• **"Help"** - See all commands`, {
      suggestions: ["Add item", "Show status", "Help"]
    });
    setIsTyping(false);
  }, [mode, context, handleAction, handleFormInput, searchItems, parseSearchQuery, getStats, inventory, loans, router, addUserMessage, addBotMessage, resetContext, startItemForm, startLoanForm]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    processMessage(input);
    setInput("");
  }, [input, isTyping, processMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    processMessage(suggestion);
  }, [processMessage]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all ${
          isOpen ? "bg-gray-800 text-gray-400" : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
              <MessageCircle size={24} />
              {getAlerts().length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-48px)] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ height: "min(700px, calc(100vh - 140px))" }}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-purple-600/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <Sparkles size={20} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">LabTrack AI</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${mode === "normal" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
                    {mode === "normal" ? "Ready" : mode === "form" ? "Collecting info..." : "Awaiting confirmation"}
                  </p>
                </div>
                {mode !== "normal" && (
                  <button onClick={() => { resetContext(); addBotMessage("Cancelled."); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center mt-1">
                      <Bot size={14} className="text-indigo-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "order-first" : ""}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white/5 text-gray-200 rounded-bl-sm border border-white/5"
                    }`}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                          .replace(/_(.*?)_/g, '<em class="text-gray-400 text-xs">$1</em>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />

                    {/* Item Cards */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {msg.items.slice(0, 6).map(item => (
                          <div key={item.id} className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white">{item.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                item.condition === "Available" ? "bg-emerald-500/20 text-emerald-400" :
                                item.condition === "Broken" ? "bg-red-500/20 text-red-400" :
                                "bg-amber-500/20 text-amber-400"
                              }`}>{item.condition}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-gray-400">
                              <span className="flex items-center gap-1"><Box size={10} /> {item.quantity}</span>
                              <span className="flex items-center gap-1"><MapPin size={10} /> {item.location.split(" ")[0]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Loan Cards */}
                    {msg.loans && msg.loans.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {msg.loans.slice(0, 5).map(loan => (
                          <div key={loan.id} className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-xs">
                            <div className="font-medium text-white">{loan.studentId}</div>
                            <div className="text-gray-400 mt-0.5">{loan.itemName} × {loan.qty}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAction(action.id, action.data)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              action.variant === "primary" ? "bg-indigo-600 hover:bg-indigo-500 text-white" :
                              action.variant === "danger" ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" :
                              action.variant === "success" ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30" :
                              "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                            }`}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(sug)}
                            className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-gray-400 hover:text-white transition-all"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mt-1">
                      <User size={14} className="text-white" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing */}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Bot size={14} className="text-indigo-400" />
                  </div>
                  <div className="px-4 py-3 bg-white/5 rounded-2xl rounded-bl-sm border border-white/5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-black/30">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === "form" ? "Enter value..." : mode === "confirming" ? "Yes or No?" : "Ask me anything..."}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                {mode === "normal" ? 'Try: "Add 5 oscilloscopes to Chemistry Lab"' : 'Type "cancel" to stop'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
