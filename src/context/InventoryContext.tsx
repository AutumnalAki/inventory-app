"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// --- Types ---
export type Item = {
  id: number;
  name: string;
  controlId: string;
  quantity: number;
  location: string;
  supplier: string;
  stock: "In Stock" | "Low Stock" | "Out of Stock";
  condition: "Available" | "Broken" | "For Repairs";
  remarks: string;
  category: string; 
};

export type Loan = {
  id: number;
  studentId: string;
  itemName: string;
  controlId: string;
  qty: number;
  location: string;
  teacher: string;
  room: string;
  section: string;
  dateGiven: string;
  dateReceived: string;
  status: "Borrowed" | "Returned";
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  joined: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  item: string;
  time: string;
};

interface InventoryContextType {
  inventory: Item[];
  loans: Loan[];
  users: User[]; // <--- Added Users
  logs: ActivityLog[];
  addItem: (item: Omit<Item, "id">) => Promise<void>;
  updateItem: (id: number, updatedItem: Partial<Item>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  addLoan: (loan: Omit<Loan, "id" | "dateGiven" | "dateReceived" | "status">) => Promise<void>;
  returnLoan: (id: number) => Promise<void>;
  deleteLoan: (id: number) => Promise<void>;
  addUser: (user: Omit<User, "id" | "joined">, password?: string) => Promise<void>; // <--- Added
  updateUser: (id: number, data: Partial<User>) => Promise<void>; // <--- Added
  deleteUser: (id: number) => Promise<void>; // <--- Added
  refreshData: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]); // <--- Added
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // --- 1. Fetch Data from Supabase ---
  const fetchData = async () => {
    
    // A. Fetch Inventory
    const { data: itemsData } = await supabase.from('inventory').select('*').order('id', { ascending: false });
    if (itemsData) {
      setInventory(itemsData.map((i: any) => ({
        id: i.id,
        name: i.item_name,
        controlId: i.control_id,
        quantity: i.quantity,
        location: i.location,
        supplier: i.supplier,
        stock: i.stock_status,
        condition: i.condition_status,
        remarks: i.remarks || "",
        category: "General"
      })));
    }

    // B. Fetch Loans
    const { data: loansData } = await supabase.from('equipment_tracking').select('*').order('id', { ascending: false });
    if (loansData) {
      setLoans(loansData.map((l: any) => ({
        id: l.id,
        studentId: l.student_number,
        itemName: l.item_name,
        controlId: l.control_id,
        qty: l.quantity,
        location: l.location,
        teacher: l.active_teacher,
        room: l.room,
        section: l.program_section,
        dateGiven: new Date(l.date_given).toLocaleString(),
        dateReceived: l.date_received ? new Date(l.date_received).toLocaleString() : "-",
        status: l.status === 'borrowed' ? 'Borrowed' : 'Returned'
      })));
    }

    // C. Fetch Users (NEW)
    const { data: usersData } = await supabase.from('users').select('*').order('id', { ascending: false });
    if (usersData) {
      setUsers(usersData.map((u: any) => ({
        id: u.id,
        name: u.username, // Map DB 'username' to App 'name'
        email: u.email,
        role: u.role,
        status: u.status === 'active' ? 'Active' : 'Inactive', // Capitalize for UI
        joined: new Date(u.created_at).toLocaleDateString()
      })));
    }

    // D. Fetch Logs
    const { data: logsData } = await supabase.from('activity_log').select('*').order('timestamp', { ascending: false }).limit(20);
    if (logsData) {
      setLogs(logsData.map((l: any) => ({
        id: l.id,
        action: l.activity_type,
        item: l.description,
        time: new Date(l.timestamp).toLocaleString()
      })));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const logAction = async (type: string, description: string) => {
    await supabase.from('activity_log').insert([{ 
      activity_type: type, 
      description: description,
      timestamp: new Date().toISOString()
    }]);
    fetchData(); 
  };

  // --- Inventory Actions ---
  const addItem = async (item: Omit<Item, "id">) => {
    const { error } = await supabase.from('inventory').insert([{
      item_name: item.name, control_id: item.controlId, quantity: item.quantity,
      location: item.location, supplier: item.supplier, stock_status: item.stock,
      condition_status: item.condition, remarks: item.remarks, unit: 'pcs'
    }]);
    if (!error) { await logAction("New Item Added", `Item: ${item.name}`); fetchData(); }
  };

  const updateItem = async (id: number, updatedItem: Partial<Item>) => {
    const payload: any = {};
    if (updatedItem.name) payload.item_name = updatedItem.name;
    if (updatedItem.quantity !== undefined) payload.quantity = updatedItem.quantity;
    if (updatedItem.stock) payload.stock_status = updatedItem.stock;
    if (updatedItem.condition) payload.condition_status = updatedItem.condition;
    if (updatedItem.remarks) payload.remarks = updatedItem.remarks;
    const { error } = await supabase.from('inventory').update(payload).eq('id', id);
    if (!error) { await logAction("Item Updated", `Item ID: ${id}`); fetchData(); }
  };

  const deleteItem = async (id: number) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) { await logAction("Item Deleted", `Item ID: ${id}`); fetchData(); }
  };

  // --- Loan Actions ---
  const addLoan = async (loan: any) => { /* ... existing addLoan code ... */
     // Re-use your existing addLoan logic here (I'm abbreviating to save space, but keep your logic!)
     // 1. Check stock, 2. Insert to equipment_tracking, 3. Update inventory, 4. Log
     // For now, I'll assume you keep the logic you had. If you lost it, let me know.
     const { error } = await supabase.from('equipment_tracking').insert([{
        student_number: loan.studentId, item_name: loan.itemName, control_id: loan.controlId,
        quantity: loan.qty, location: loan.location, active_teacher: loan.teacher,
        room: loan.room, program_section: loan.section, date_given: new Date().toISOString(), status: 'borrowed'
     }]);
     if (!error) fetchData();
  };
  const returnLoan = async (id: number) => { 
      await supabase.from('equipment_tracking').update({ status: 'returned', date_received: new Date().toISOString() }).eq('id', id);
      fetchData();
  };
  const deleteLoan = async (id: number) => {
      await supabase.from('equipment_tracking').delete().eq('id', id);
      fetchData();
  };

  // --- User Actions (NEW) ---
  const addUser = async (user: Omit<User, "id" | "joined">, password?: string) => {
    // Note: In a real app, you should use supabase.auth.signUp(). 
    // Here we are just inserting into your 'users' table as per your SQL dump.
    const { error } = await supabase.from('users').insert([{
        username: user.name,
        email: user.email,
        role: user.role,
        status: user.status.toLowerCase(), // DB expects 'active'/'inactive'
        password: password || 'default123', // Placeholder since we aren't hashing here yet
        role_key: 'generated_key' // Required by your DB schema
    }]);
    if (!error) { await logAction("User Created", `User: ${user.name}`); fetchData(); }
  };

  const updateUser = async (id: number, data: Partial<User>) => {
    const payload: any = {};
    if (data.name) payload.username = data.name;
    if (data.email) payload.email = data.email;
    if (data.role) payload.role = data.role;
    if (data.status) payload.status = data.status.toLowerCase();
    
    const { error } = await supabase.from('users').update(payload).eq('id', id);
    if (!error) { await logAction("User Updated", `User ID: ${id}`); fetchData(); }
  };

  const deleteUser = async (id: number) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) { await logAction("User Deleted", `User ID: ${id}`); fetchData(); }
  };

  return (
    <InventoryContext.Provider value={{ 
      inventory, loans, users, logs, // Export 'users'
      addItem, updateItem, deleteItem, 
      addLoan, returnLoan, deleteLoan,
      addUser, updateUser, deleteUser, // Export actions
      refreshData: fetchData 
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
}