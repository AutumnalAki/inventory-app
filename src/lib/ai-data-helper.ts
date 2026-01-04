/**
 * AI Data Helper - Intelligent Data Entry & Cleanup
 * 
 * Features:
 * - Duplicate Detection: Checks for similar control IDs and item names
 * - Supplier Reliability Analysis: Ranks suppliers based on equipment longevity and condition
 * - Fuzzy Matching: Finds similar items even with typos or variations
 * - Smart Remarks Suggestions: Context-aware suggestions for item remarks
 * - Natural Language Search: Parse natural language queries into filters
 * - AI Report Summaries: Generate intelligent summaries of inventory status
 */

import { Item, Loan, ActivityLog } from "@/context/InventoryContext";

// ============================================
// STRING SIMILARITY (Levenshtein Distance)
// ============================================

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Levenshtein distance for fuzzy matching
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Check if two strings are similar enough to be potential duplicates
 */
export function isSimilar(str1: string, str2: string, threshold = 0.75): boolean {
  return calculateSimilarity(str1, str2) >= threshold;
}

// ============================================
// COMMON VARIATIONS & ABBREVIATIONS
// ============================================

const COMMON_VARIATIONS: Record<string, string[]> = {
  "voltmeter": ["volt meter", "voltage meter", "v-meter", "vmeter"],
  "ammeter": ["amp meter", "ampere meter", "a-meter", "ameter"],
  "multimeter": ["multi meter", "multi-meter", "dmm", "digital multimeter"],
  "oscilloscope": ["oscope", "o-scope", "scope", "oscillograph"],
  "microscope": ["micro scope", "micro-scope"],
  "thermometer": ["thermo meter", "temp meter", "temperature meter"],
  "resistor": ["res", "resistance"],
  "capacitor": ["cap", "capacitance"],
  "transformer": ["xformer", "trans"],
  "power supply": ["psu", "power unit", "ps"],
  "function generator": ["func gen", "signal generator", "sig gen"],
  "breadboard": ["bread board", "proto board", "protoboard"],
  "soldering iron": ["solder iron", "soldering tool"],
  "wire stripper": ["wire strippers", "stripper"],
  "pliers": ["plier", "needle nose", "needle-nose"],
  "screwdriver": ["screw driver", "driver"],
  "wrench": ["spanner"],
};

/**
 * Normalize item name by expanding common abbreviations
 */
function normalizeItemName(name: string): string {
  let normalized = name.toLowerCase().trim();
  
  // Check if name matches any variation
  for (const [standard, variations] of Object.entries(COMMON_VARIATIONS)) {
    if (variations.some(v => normalized.includes(v) || isSimilar(normalized, v, 0.85))) {
      return standard;
    }
  }
  
  return normalized;
}

// ============================================
// DUPLICATE DETECTION
// ============================================

export interface DuplicateMatch {
  item: Item;
  matchType: "exact_id" | "similar_id" | "exact_name" | "similar_name" | "variation";
  similarity: number;
  reason: string;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  suggestion: string;
}

/**
 * Check for potential duplicates when adding a new item
 */
export function checkForDuplicates(
  newItemName: string,
  newControlId: string,
  existingItems: Item[],
  excludeId?: number
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];
  const normalizedNewName = normalizeItemName(newItemName);
  const newIdLower = newControlId.toLowerCase().trim();
  
  for (const item of existingItems) {
    // Skip the item being edited
    if (excludeId && item.id === excludeId) continue;
    
    const itemNameLower = item.name.toLowerCase().trim();
    const itemIdLower = item.controlId.toLowerCase().trim();
    const normalizedItemName = normalizeItemName(item.name);
    
    // 1. Exact Control ID match
    if (newIdLower && itemIdLower && newIdLower === itemIdLower) {
      matches.push({
        item,
        matchType: "exact_id",
        similarity: 1,
        reason: `Exact Control ID match: "${item.controlId}"`
      });
      continue;
    }
    
    // 2. Similar Control ID (could be typo)
    if (newIdLower && itemIdLower) {
      const idSimilarity = calculateSimilarity(newIdLower, itemIdLower);
      if (idSimilarity >= 0.85 && idSimilarity < 1) {
        matches.push({
          item,
          matchType: "similar_id",
          similarity: idSimilarity,
          reason: `Similar Control ID: "${item.controlId}" (${Math.round(idSimilarity * 100)}% match)`
        });
        continue;
      }
    }
    
    // 3. Exact name match
    if (itemNameLower === newItemName.toLowerCase().trim()) {
      matches.push({
        item,
        matchType: "exact_name",
        similarity: 1,
        reason: `Exact item name match: "${item.name}"`
      });
      continue;
    }
    
    // 4. Name variation match (e.g., "Volt Meter" vs "Voltmeter")
    if (normalizedNewName === normalizedItemName && normalizedNewName !== newItemName.toLowerCase().trim()) {
      matches.push({
        item,
        matchType: "variation",
        similarity: 0.95,
        reason: `Name variation detected: "${item.name}" is the same as "${newItemName}"`
      });
      continue;
    }
    
    // 5. Similar name (fuzzy match)
    const nameSimilarity = calculateSimilarity(newItemName, item.name);
    if (nameSimilarity >= 0.8 && nameSimilarity < 1) {
      matches.push({
        item,
        matchType: "similar_name",
        similarity: nameSimilarity,
        reason: `Similar item name: "${item.name}" (${Math.round(nameSimilarity * 100)}% match)`
      });
    }
  }
  
  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);
  
  // Generate suggestion
  let suggestion = "";
  if (matches.length > 0) {
    const topMatch = matches[0];
    if (topMatch.matchType === "exact_id") {
      suggestion = `An item with Control ID "${newControlId}" already exists. Consider updating the existing item instead.`;
    } else if (topMatch.matchType === "variation") {
      suggestion = `"${newItemName}" appears to be the same as "${topMatch.item.name}". Consider using consistent naming.`;
    } else if (topMatch.matchType === "similar_id") {
      suggestion = `Found similar Control ID "${topMatch.item.controlId}". Is this a typo?`;
    } else {
      suggestion = `Found ${matches.length} similar item(s). Review to avoid duplicates.`;
    }
  }
  
  return {
    hasDuplicates: matches.length > 0,
    matches: matches.slice(0, 5), // Return top 5 matches
    suggestion
  };
}

// ============================================
// SUPPLIER RELIABILITY ANALYSIS
// ============================================

export interface SupplierStats {
  supplier: string;
  totalItems: number;
  availableItems: number;
  brokenItems: number;
  forRepairsItems: number;
  reliabilityScore: number; // 0-100
  reliabilityGrade: "Excellent" | "Good" | "Average" | "Poor" | "N/A";
  avgConditionScore: number;
  commonIssues: string[];
  recommendation: string;
}

export interface SupplierAnalysis {
  suppliers: SupplierStats[];
  bestSupplier: SupplierStats | null;
  worstSupplier: SupplierStats | null;
  insights: string[];
}

/**
 * Analyze supplier reliability based on item conditions and remarks
 */
export function analyzeSupplierReliability(items: Item[]): SupplierAnalysis {
  // Group items by supplier
  const supplierGroups: Record<string, Item[]> = {};
  
  for (const item of items) {
    const supplier = item.supplier?.trim() || "Unknown";
    if (!supplierGroups[supplier]) {
      supplierGroups[supplier] = [];
    }
    supplierGroups[supplier].push(item);
  }
  
  // Analyze each supplier
  const supplierStats: SupplierStats[] = [];
  
  for (const [supplier, supplierItems] of Object.entries(supplierGroups)) {
    if (supplier === "Unknown" || supplier === "") continue;
    
    const totalItems = supplierItems.length;
    const availableItems = supplierItems.filter(i => i.condition === "Available").length;
    const brokenItems = supplierItems.filter(i => i.condition === "Broken").length;
    const forRepairsItems = supplierItems.filter(i => i.condition === "For Repairs").length;
    
    // Calculate condition score (0-100)
    // Available = 100, For Repairs = 50, Broken = 0
    let conditionScoreSum = 0;
    for (const item of supplierItems) {
      if (item.condition === "Available") conditionScoreSum += 100;
      else if (item.condition === "For Repairs") conditionScoreSum += 50;
      // Broken = 0
    }
    const avgConditionScore = totalItems > 0 ? conditionScoreSum / totalItems : 0;
    
    // Extract common issues from remarks
    const commonIssues: string[] = [];
    const issueKeywords = ["broken", "damaged", "defective", "faulty", "not working", "malfunction", "repair", "replace"];
    const remarksText = supplierItems.map(i => i.remarks?.toLowerCase() || "").join(" ");
    
    for (const keyword of issueKeywords) {
      if (remarksText.includes(keyword)) {
        commonIssues.push(keyword);
      }
    }
    
    // Calculate reliability score
    // Base score from condition + penalty for issues mentioned
    let reliabilityScore = avgConditionScore;
    reliabilityScore -= commonIssues.length * 5; // -5 per issue type found
    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));
    
    // Determine grade
    let reliabilityGrade: SupplierStats["reliabilityGrade"];
    if (totalItems < 3) {
      reliabilityGrade = "N/A"; // Not enough data
    } else if (reliabilityScore >= 90) {
      reliabilityGrade = "Excellent";
    } else if (reliabilityScore >= 75) {
      reliabilityGrade = "Good";
    } else if (reliabilityScore >= 50) {
      reliabilityGrade = "Average";
    } else {
      reliabilityGrade = "Poor";
    }
    
    // Generate recommendation
    let recommendation = "";
    if (reliabilityGrade === "Excellent") {
      recommendation = "Highly recommended. Equipment from this supplier maintains excellent condition.";
    } else if (reliabilityGrade === "Good") {
      recommendation = "Recommended. Most equipment remains in good condition.";
    } else if (reliabilityGrade === "Average") {
      recommendation = "Consider alternatives. Some equipment has required repairs.";
    } else if (reliabilityGrade === "Poor") {
      recommendation = "Not recommended. High rate of equipment issues and repairs.";
    } else {
      recommendation = "Insufficient data to assess reliability.";
    }
    
    supplierStats.push({
      supplier,
      totalItems,
      availableItems,
      brokenItems,
      forRepairsItems,
      reliabilityScore: Math.round(reliabilityScore),
      reliabilityGrade,
      avgConditionScore: Math.round(avgConditionScore),
      commonIssues: [...new Set(commonIssues)],
      recommendation
    });
  }
  
  // Sort by reliability score
  supplierStats.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  
  // Find best and worst (with enough data)
  const ratedSuppliers = supplierStats.filter(s => s.reliabilityGrade !== "N/A");
  const bestSupplier = ratedSuppliers.length > 0 ? ratedSuppliers[0] : null;
  const worstSupplier = ratedSuppliers.length > 0 ? ratedSuppliers[ratedSuppliers.length - 1] : null;
  
  // Generate insights
  const insights: string[] = [];
  
  if (bestSupplier && bestSupplier.reliabilityScore >= 80) {
    insights.push(`🏆 Best supplier: ${bestSupplier.supplier} (${bestSupplier.reliabilityScore}% reliability)`);
  }
  
  if (worstSupplier && worstSupplier.reliabilityScore < 60 && worstSupplier !== bestSupplier) {
    insights.push(`⚠️ Consider alternatives to ${worstSupplier.supplier} (${worstSupplier.reliabilityScore}% reliability)`);
  }
  
  const totalBroken = items.filter(i => i.condition === "Broken").length;
  const totalForRepairs = items.filter(i => i.condition === "For Repairs").length;
  
  if (totalBroken > 0 || totalForRepairs > 0) {
    insights.push(`📊 ${totalBroken} items broken, ${totalForRepairs} items need repairs across all suppliers`);
  }
  
  return {
    suppliers: supplierStats,
    bestSupplier,
    worstSupplier,
    insights
  };
}

// ============================================
// AUTO-SUGGEST ITEM NAME
// ============================================

/**
 * Get item name suggestions based on partial input
 */
export function getItemNameSuggestions(
  partialName: string,
  existingItems: Item[],
  limit = 5
): string[] {
  if (!partialName || partialName.length < 2) return [];
  
  const searchLower = partialName.toLowerCase();
  const suggestions = new Set<string>();
  
  // Get unique item names that start with or contain the search term
  for (const item of existingItems) {
    const nameLower = item.name.toLowerCase();
    
    // Prioritize items that start with the search term
    if (nameLower.startsWith(searchLower)) {
      suggestions.add(item.name);
    }
  }
  
  // Then add items that contain the search term
  for (const item of existingItems) {
    if (suggestions.size >= limit) break;
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes(searchLower) && !suggestions.has(item.name)) {
      suggestions.add(item.name);
    }
  }
  
  return Array.from(suggestions).slice(0, limit);
}

/**
 * Get supplier suggestions based on partial input
 */
export function getSupplierSuggestions(
  partialName: string,
  existingItems: Item[],
  limit = 5
): string[] {
  if (!partialName || partialName.length < 2) return [];
  
  const searchLower = partialName.toLowerCase();
  const supplierSet = new Set<string>();
  
  for (const item of existingItems) {
    if (!item.supplier) continue;
    const supplierLower = item.supplier.toLowerCase();
    
    if (supplierLower.includes(searchLower)) {
      supplierSet.add(item.supplier);
    }
  }
  
  return Array.from(supplierSet).slice(0, limit);
}

// ============================================
// SMART REMARKS SUGGESTIONS
// ============================================

export interface RemarkSuggestion {
  text: string;
  category: string;
}

const CONDITION_REMARKS: Record<string, RemarkSuggestion[]> = {
  "Broken": [
    { text: "Display not working", category: "Electrical" },
    { text: "Power issue - won't turn on", category: "Electrical" },
    { text: "Physical damage - cracked casing", category: "Physical" },
    { text: "Internal component failure", category: "Electrical" },
    { text: "Screen/display damaged", category: "Physical" },
    { text: "Buttons/controls not responding", category: "Mechanical" },
    { text: "Calibration error - readings inaccurate", category: "Calibration" },
    { text: "Motor/movement malfunction", category: "Mechanical" },
    { text: "Connection ports damaged", category: "Physical" },
    { text: "Water/liquid damage", category: "Physical" },
  ],
  "For Repairs": [
    { text: "Needs recalibration", category: "Calibration" },
    { text: "Battery replacement needed", category: "Maintenance" },
    { text: "Minor physical damage - cosmetic", category: "Physical" },
    { text: "Loose connections - intermittent issues", category: "Electrical" },
    { text: "Software/firmware update required", category: "Software" },
    { text: "Cleaning required - dirty contacts", category: "Maintenance" },
    { text: "Worn parts need replacement", category: "Mechanical" },
    { text: "Fuse replacement needed", category: "Electrical" },
    { text: "Cable/cord frayed - needs replacement", category: "Physical" },
    { text: "Overheating - needs inspection", category: "Electrical" },
  ],
  "Available": [
    { text: "Newly acquired - in excellent condition", category: "Status" },
    { text: "Recently serviced and calibrated", category: "Maintenance" },
    { text: "Returned from repair - fully functional", category: "Status" },
    { text: "Tested and verified working", category: "Status" },
  ],
};

/**
 * Get smart remarks suggestions based on item condition
 */
export function getRemarksSuggestions(condition: string): RemarkSuggestion[] {
  return CONDITION_REMARKS[condition] || [];
}

// ============================================
// NATURAL LANGUAGE SEARCH
// ============================================

export interface SearchFilters {
  searchTerm: string;
  status: string;
  condition: string;
  location: string;
  supplier: string;
}

interface ParsedQuery {
  filters: Partial<SearchFilters>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  interpretation: string;
}

// Export for external use
export type { ParsedQuery };

const LOCATION_KEYWORDS: Record<string, string[]> = {
  "Computer Laboratory": ["computer lab", "computer", "comp lab", "it lab"],
  "Civil Engineering Laboratory": ["civil lab", "ce lab", "civil engineering", "civil"],
  "Chemistry Laboratory": ["chemistry lab", "chem lab", "chemistry", "chem"],
  "Physics Laboratory": ["physics lab", "physics", "phys lab"],
  "Electrical Engineering Laboratory": ["electrical lab", "ee lab", "electrical engineering", "electrical"],
  "Mechanical Engineering Laboratory": ["mechanical lab", "me lab", "mechanical engineering", "mechanical"],
  "ECE Laboratory": ["ece lab", "ece", "electronics"],
  "CPE Laboratory": ["cpe lab", "cpe", "computer engineering"],
};

const STATUS_KEYWORDS: Record<string, string[]> = {
  "In Stock": ["in stock", "available stock", "have stock", "stocked"],
  "Low Stock": ["low stock", "low", "running low", "almost out"],
  "Out of Stock": ["out of stock", "no stock", "empty", "none left", "out"],
  "Critical": ["critical", "urgent", "attention needed", "needs attention"],
};

const CONDITION_KEYWORDS: Record<string, string[]> = {
  "Available": ["available", "working", "functional", "good condition", "usable"],
  "Broken": ["broken", "damaged", "not working", "defective", "faulty"],
  "For Repairs": ["repair", "repairs", "needs repair", "maintenance", "fixing"],
};

const SORT_KEYWORDS: Record<string, string[]> = {
  "Newest": ["newest", "recent", "latest", "new"],
  "Oldest": ["oldest", "old", "first"],
  "Name A-Z": ["alphabetical", "a-z", "name", "alphabetically"],
  "Name Z-A": ["z-a", "reverse alphabetical"],
  "Quantity (High)": ["most", "highest quantity", "most items"],
  "Quantity (Low)": ["least", "lowest quantity", "fewest"],
};

/**
 * Parse a natural language query into search filters
 */
export function parseNaturalLanguageQuery(query: string): ParsedQuery {
  const queryLower = query.toLowerCase().trim();
  const filters: Partial<SearchFilters> = {};
  const interpretations: string[] = [];
  
  // Check for location
  for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      filters.location = location;
      interpretations.push(`in ${location}`);
      break;
    }
  }
  
  // Check for status
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      filters.status = status;
      interpretations.push(`with status "${status}"`);
      break;
    }
  }
  
  // Check for condition
  for (const [condition, keywords] of Object.entries(CONDITION_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      filters.condition = condition;
      interpretations.push(`condition "${condition}"`);
      break;
    }
  }
  
  // Check for sort
  let sortBy: string | undefined;
  let sortOrder: "asc" | "desc" = "desc";
  
  for (const [sort, keywords] of Object.entries(SORT_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      // Map to simple sort values
      if (sort === "Name A-Z") { sortBy = "name"; sortOrder = "asc"; }
      else if (sort === "Name Z-A") { sortBy = "name"; sortOrder = "desc"; }
      else if (sort === "Newest") { sortBy = "date"; sortOrder = "desc"; }
      else if (sort === "Oldest") { sortBy = "date"; sortOrder = "asc"; }
      else if (sort === "Quantity (High)") { sortBy = "quantity"; sortOrder = "desc"; }
      else if (sort === "Quantity (Low)") { sortBy = "quantity"; sortOrder = "asc"; }
      interpretations.push(`sorted by ${sort}`);
      break;
    }
  }
  
  // Extract potential item name (remove matched keywords)
  let remainingQuery = queryLower;
  const allKeywords = [
    ...Object.values(LOCATION_KEYWORDS).flat(),
    ...Object.values(STATUS_KEYWORDS).flat(),
    ...Object.values(CONDITION_KEYWORDS).flat(),
    ...Object.values(SORT_KEYWORDS).flat(),
    "show", "find", "search", "get", "list", "items", "equipment", "in", "at", "the", "all", "me", "with"
  ];
  
  for (const keyword of allKeywords) {
    remainingQuery = remainingQuery.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' ');
  }
  
  remainingQuery = remainingQuery.replace(/\s+/g, ' ').trim();
  
  if (remainingQuery.length > 1) {
    filters.searchTerm = remainingQuery;
    interpretations.unshift(`"${remainingQuery}"`);
  }
  
  const interpretation = interpretations.length > 0 
    ? `Searching for ${interpretations.join(', ')}`
    : "Showing all items";
  
  return { filters, sortBy, sortOrder, interpretation };
}

// ============================================
// AI REPORT SUMMARIES
// ============================================

export interface AIInsight {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
  metric?: string;
  action?: string;
  actionPath?: string;
}

export interface DashboardSummary {
  headline: string;
  insights: AIInsight[];
  trends: {
    borrowingTrend: "up" | "down" | "stable";
    stockHealth: "good" | "warning" | "critical";
    maintenanceLoad: "low" | "moderate" | "high";
  };
}

/**
 * Generate AI-powered dashboard summary and insights
 */
export function generateDashboardSummary(
  inventory: Item[],
  loans: Loan[],
  logs: ActivityLog[]
): DashboardSummary {
  const insights: AIInsight[] = [];
  
  // Calculate metrics
  const totalItems = inventory.reduce((acc, i) => acc + i.quantity, 0);
  const totalTypes = inventory.length;
  const lowStockItems = inventory.filter(i => i.stock === "Low Stock");
  const outOfStockItems = inventory.filter(i => i.stock === "Out of Stock");
  const brokenItems = inventory.filter(i => i.condition === "Broken");
  const forRepairsItems = inventory.filter(i => i.condition === "For Repairs");
  const activeLoans = loans.filter(l => l.status === "Borrowed");
  
  // Location analysis
  const locationCounts: Record<string, number> = {};
  inventory.forEach(item => {
    locationCounts[item.location] = (locationCounts[item.location] || 0) + item.quantity;
  });
  const busiestLab = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
  
  // Supplier analysis
  const supplierCounts: Record<string, { total: number; broken: number }> = {};
  inventory.forEach(item => {
    if (!item.supplier) return;
    if (!supplierCounts[item.supplier]) {
      supplierCounts[item.supplier] = { total: 0, broken: 0 };
    }
    supplierCounts[item.supplier].total++;
    if (item.condition === "Broken") {
      supplierCounts[item.supplier].broken++;
    }
  });
  
  // Recent activity analysis
  const recentAdds = logs.filter(l => l.action.toLowerCase().includes("added") || l.action.toLowerCase().includes("new")).length;
  const recentUpdates = logs.filter(l => l.action.toLowerCase().includes("updated") || l.action.toLowerCase().includes("edit")).length;
  
  // Generate headline
  let headline = "";
  const criticalCount = lowStockItems.length + outOfStockItems.length + brokenItems.length;
  
  if (criticalCount === 0) {
    headline = "Everything looks great! Your inventory is in excellent shape.";
  } else if (criticalCount <= 3) {
    headline = "Your inventory is mostly healthy with a few items needing attention.";
  } else if (criticalCount <= 10) {
    headline = "Several items require your attention. Review the insights below.";
  } else {
    headline = "Multiple inventory issues detected. Immediate action recommended.";
  }
  
  // Generate insights
  
  // 1. Stock health insight
  if (outOfStockItems.length > 0) {
    insights.push({
      id: "out-of-stock",
      type: "danger",
      title: "Out of Stock Alert",
      description: `${outOfStockItems.length} item${outOfStockItems.length > 1 ? 's are' : ' is'} completely out of stock and may disrupt operations.`,
      metric: `${outOfStockItems.length}`,
      action: "View Items",
      actionPath: "/dashboard/inventory?status=Out%20of%20Stock"
    });
  }
  
  if (lowStockItems.length > 0) {
    insights.push({
      id: "low-stock",
      type: "warning",
      title: "Low Stock Warning",
      description: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's are' : ' is'} running low and may need restocking soon.`,
      metric: `${lowStockItems.length}`,
      action: "View Items",
      actionPath: "/dashboard/inventory?status=Low%20Stock"
    });
  }
  
  // 2. Broken items insight
  if (brokenItems.length > 0) {
    insights.push({
      id: "broken",
      type: "danger",
      title: "Equipment Damage Report",
      description: `${brokenItems.length} item${brokenItems.length > 1 ? 's are' : ' is'} marked as broken and need replacement or major repair.`,
      metric: `${brokenItems.length}`,
      action: "View Broken",
      actionPath: "/dashboard/inventory?condition=Broken"
    });
  }
  
  // 3. Items for repairs
  if (forRepairsItems.length > 0) {
    insights.push({
      id: "repairs",
      type: "warning",
      title: "Maintenance Queue",
      description: `${forRepairsItems.length} item${forRepairsItems.length > 1 ? 's are' : ' is'} awaiting repairs. Schedule maintenance to restore availability.`,
      metric: `${forRepairsItems.length}`,
      action: "View Items",
      actionPath: "/dashboard/inventory?condition=For%20Repairs"
    });
  }
  
  // 4. Active loans insight
  if (activeLoans.length > 0) {
    insights.push({
      id: "loans",
      type: "info",
      title: "Active Borrowing",
      description: `${activeLoans.length} equipment loan${activeLoans.length > 1 ? 's are' : ' is'} currently active across all laboratories.`,
      metric: `${activeLoans.length}`,
      action: "View Loans",
      actionPath: "/dashboard/tracking"
    });
  }
  
  // 5. Busiest lab insight
  if (busiestLab) {
    insights.push({
      id: "busiest-lab",
      type: "info",
      title: "Most Stocked Location",
      description: `${busiestLab[0]} has the highest inventory with ${busiestLab[1]} items.`,
      metric: `${busiestLab[1]}`,
    });
  }
  
  // 6. All good insight (if no issues)
  if (criticalCount === 0 && insights.length < 3) {
    insights.push({
      id: "all-good",
      type: "success",
      title: "Inventory Health",
      description: `All ${totalItems} items across ${totalTypes} types are in good standing with no critical issues.`,
      metric: "100%",
    });
  }
  
  // Determine trends
  const stockHealth: DashboardSummary["trends"]["stockHealth"] = 
    outOfStockItems.length > 3 || brokenItems.length > 5 ? "critical" :
    lowStockItems.length > 0 || brokenItems.length > 0 ? "warning" : "good";
  
  const maintenanceLoad: DashboardSummary["trends"]["maintenanceLoad"] = 
    (brokenItems.length + forRepairsItems.length) > 10 ? "high" :
    (brokenItems.length + forRepairsItems.length) > 3 ? "moderate" : "low";
  
  const borrowingTrend: DashboardSummary["trends"]["borrowingTrend"] = 
    activeLoans.length > 20 ? "up" : activeLoans.length < 5 ? "down" : "stable";
  
  return {
    headline,
    insights: insights.slice(0, 6), // Max 6 insights
    trends: {
      borrowingTrend,
      stockHealth,
      maintenanceLoad,
    }
  };
}