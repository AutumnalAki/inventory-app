// ChatBot.tsx (refactored)
type InventoryItem = { name: string; stock: string };
type Loan = { status: string };

interface ChatBotProps {
  inventory: InventoryItem[];
  loans: Loan[];
  addBotMessage: (msg: string) => void;
}

const callGemini = async (
  userInput: string,
  inventory: InventoryItem[],
  loans: Loan[],
  addBotMessage: (msg: string) => void
) => {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: userInput,
      contextData: {
        inventoryCount: Array.isArray(inventory) ? inventory.length : 0,
        activeLoans: Array.isArray(loans) ? loans.filter(l => l.status === "Borrowed").length : 0,
        lowStockItems: Array.isArray(inventory) ? inventory.filter(i => i.stock !== "In Stock").map(i => i.name) : []
      }
    }),
  });
  const data = await response.json();
  if (typeof addBotMessage === 'function') addBotMessage(data.text);
};

// Usage example (replace your default case):
// await callGemini(msg, inventory, loans, addBotMessage);

export {}; // Ensure this file is treated as a module for top-level await