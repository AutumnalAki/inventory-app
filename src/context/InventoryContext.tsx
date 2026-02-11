"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// --- TYPES ---
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
  created_at: string;
  low_stock_threshold: number;
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
  location: string;
  user_id?: string | null;
};

export type Reservation = {
  id: number;
  itemId: number | null;
  itemName: string;
  controlId: string;
  quantity: number;
  location: string;
  reservedBy: string | null;
  reservedByName: string;
  purpose: string;
  reservationDate: string;
  neededDate: string;
  returnDate: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  approvedBy: string | null;
  notes: string;
  createdAt: string;
};

// --- CONTEXT INTERFACE ---
interface InventoryContextType {
  inventory: Item[];
  loans: Loan[];
  users: User[];
  logs: ActivityLog[];
  reservations: Reservation[];
  addItem: (item: Omit<Item, "id">) => Promise<void>;
  updateItem: (id: number, updatedItem: Partial<Item>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  // -- BATCH OPERATIONS --
  deleteItems: (ids: number[]) => Promise<void>;
  updateItems: (ids: number[], data: Partial<Item>) => Promise<void>;
  // --------------------------
  addLoan: (loan: Omit<Loan, "id" | "dateGiven" | "dateReceived" | "status">) => Promise<void>;
  returnLoan: (id: number) => Promise<void>;
  deleteLoan: (id: number) => Promise<void>;
  addUser: (user: Omit<User, "id" | "joined">, password?: string) => Promise<void>;
  updateUser: (id: number, data: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  // -- RESERVATIONS --
  addReservation: (reservation: Omit<Reservation, "id" | "reservationDate" | "status" | "approvedBy" | "createdAt">) => Promise<void>;
  updateReservationStatus: (id: number, status: Reservation["status"], approvedBy?: string) => Promise<void>;
  cancelReservation: (id: number) => Promise<void>;
  deleteReservation: (id: number) => Promise<void>;
  refreshData: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // 1. FETCH DATA FUNCTION
  const fetchData = async () => {
    // A. Inventory
    const { data: itemsData } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
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
        category: "General",
        created_at: i.created_at,
        low_stock_threshold: i.low_stock_threshold ?? 5
      })));
    }

    // B. Loans
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

    // C. Users
    const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (usersData) {
      setUsers(usersData.map((u: any) => ({
        id: u.id, 
        name: u.username, 
        email: u.email, 
        role: u.role,
        status: u.status === 'active' ? 'Active' : 'Inactive',
        joined: new Date(u.created_at).toLocaleDateString()
      })));
    }

    // D. Logs
    const { data: logsData } = await supabase.from('activity_log').select('*').order('timestamp', { ascending: false }).limit(20);
    if (logsData) {
      setLogs(logsData.map((l: any) => ({
        id: l.id,
        action: l.activity_type,
        item: l.description,
        time: new Date(l.timestamp).toLocaleString(),
        location: l.location || "",
        user_id: l.user_id || null
      })));
    }

    // E. Reservations
    const { data: reservationsData } = await supabase.from('reservations').select('*').order('created_at', { ascending: false });
    if (reservationsData) {
      setReservations(reservationsData.map((r: any) => ({
        id: r.id,
        itemId: r.item_id,
        itemName: r.item_name,
        controlId: r.control_id || "",
        quantity: r.quantity,
        location: r.location || "",
        reservedBy: r.reserved_by,
        reservedByName: r.reserved_by_name,
        purpose: r.purpose || "",
        reservationDate: new Date(r.reservation_date).toLocaleString(),
        neededDate: r.needed_date,
        returnDate: r.return_date || "",
        status: r.status,
        approvedBy: r.approved_by,
        notes: r.notes || "",
        createdAt: r.created_at
      })));
    }
  };

  // 2. REALTIME SUBSCRIPTION
  useEffect(() => {
    fetchData(); // Initial Load

    const channel = supabase
      .channel('global_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        console.log("Realtime: Inventory updated");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_tracking' }, () => {
        console.log("Realtime: Tracking updated");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        console.log("Realtime: Users updated");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        console.log("Realtime: Logs updated");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        console.log("Realtime: Reservations updated");
        fetchData();
      })
      .subscribe((status) => {
        console.log(`Supabase Realtime Status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error("Realtime connection failed. Check your API Keys.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. ACTIONS
  const logAction = async (type: string, description: string, location: string = "", userId?: string | null) => {
    await supabase.from('activity_log').insert([{ 
      activity_type: type, description: description, timestamp: new Date().toISOString(), location: location, user_id: userId || null
    }]);
  };

  const addItem = async (item: Omit<Item, "id">) => {
    const { error } = await supabase.from('inventory').insert([{
      item_name: item.name, control_id: item.controlId, quantity: item.quantity,
      location: item.location, supplier: item.supplier, stock_status: item.stock,
      condition_status: item.condition, remarks: item.remarks, unit: 'pcs',
      low_stock_threshold: item.low_stock_threshold ?? 5
    }]);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("New Item Added", `New Item Added: ${item.name}`, item.location, session?.user?.id);
      fetchData();
    }
  };

  const updateItem = async (id: number, updatedItem: Partial<Item>) => {
    const payload: any = {};
    let changes: string[] = [];
    const item = inventory.find(i => i.id === id);
    if (updatedItem.name && updatedItem.name !== item?.name) {
      payload.item_name = updatedItem.name;
      changes.push(`${item?.name ?? "Item"} name changed to ${updatedItem.name}`);
    }
    if (updatedItem.quantity !== undefined && updatedItem.quantity !== item?.quantity) {
      payload.quantity = updatedItem.quantity;
      changes.push(`${item?.name ?? "Item"} quantity changed to ${updatedItem.quantity}`);
    }
    if (updatedItem.stock && updatedItem.stock !== item?.stock) {
      payload.stock_status = updatedItem.stock;
      changes.push(`${item?.name ?? "Item"} status changed to ${updatedItem.stock}`);
    }
    if (updatedItem.condition && updatedItem.condition !== item?.condition) {
      payload.condition_status = updatedItem.condition;
      changes.push(`${item?.name ?? "Item"} condition changed to ${updatedItem.condition}`);
    }
    if (updatedItem.remarks !== undefined && updatedItem.remarks !== item?.remarks) {
      payload.remarks = updatedItem.remarks;
      changes.push(`${item?.name ?? "Item"} remarks changed to ${updatedItem.remarks}`);
    }
    if (updatedItem.controlId && updatedItem.controlId !== item?.controlId) {
      payload.control_id = updatedItem.controlId;
      changes.push(`${item?.name ?? "Item"} control ID changed to ${updatedItem.controlId}`);
    }
    if (updatedItem.supplier && updatedItem.supplier !== item?.supplier) {
      payload.supplier = updatedItem.supplier;
      changes.push(`${item?.name ?? "Item"} supplier changed to ${updatedItem.supplier}`);
    }
    // Support updating location and category which were previously ignored
    if (updatedItem.location && updatedItem.location !== item?.location) {
      payload.location = updatedItem.location;
      changes.push(`${item?.name ?? "Item"} location changed to ${updatedItem.location}`);
    }
    if (updatedItem.low_stock_threshold !== undefined && updatedItem.low_stock_threshold !== item?.low_stock_threshold) {
      payload.low_stock_threshold = updatedItem.low_stock_threshold;
      changes.push(`${item?.name ?? "Item"} low stock threshold changed to ${updatedItem.low_stock_threshold}`);
    }
    // (category not stored in DB currently) -- skip category update
    // If no payload to update, skip DB call but still record an update log (if desired)
    if (Object.keys(payload).length === 0) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Item Updated", `${item?.name ?? "Item"} updated.`, item?.location || (updatedItem.location as string) || "", session?.user?.id);
      return;
    }

    const { error } = await supabase.from('inventory').update(payload).eq('id', id);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (changes.length === 0) {
        await logAction("Item Updated", `${item?.name ?? "Item"} updated.`, item?.location || (updatedItem.location as string) || "", session?.user?.id);
      } else {
        for (const change of changes) {
          await logAction("Item Updated", change, item?.location || (updatedItem.location as string) || "", session?.user?.id);
        }
      }
      fetchData();
    }
  };

  const deleteItem = async (id: number) => {
    // Get the item's location before deleting
    const item = inventory.find(i => i.id === id);
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Item Deleted", `Item: ${item?.name ?? "Unknown"}`, item?.location || "", session?.user?.id);
      fetchData();
    }
  };

  // --- BATCH ACTIONS ---
  const deleteItems = async (ids: number[]) => {
    const { error } = await supabase.from('inventory').delete().in('id', ids);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Batch Delete", `Deleted ${ids.length} items`, "", session?.user?.id);
      fetchData();
    }
  };

  const updateItems = async (ids: number[], data: Partial<Item>) => {
    const payload: any = {};
    if (data.stock) payload.stock_status = data.stock;
    if (data.condition) payload.condition_status = data.condition;
    if (data.location) payload.location = data.location;
    if (data.low_stock_threshold !== undefined) payload.low_stock_threshold = data.low_stock_threshold;
    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase.from('inventory').update(payload).in('id', ids);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Batch Update", `Updated ${ids.length} items`, "", session?.user?.id);
      fetchData();
    }
  };

  const addLoan = async (loan: any) => { 
     const { error } = await supabase.from('equipment_tracking').insert([{
        student_number: loan.studentId, item_name: loan.itemName, control_id: loan.controlId,
        quantity: loan.qty, location: loan.location, active_teacher: loan.teacher,
        room: loan.room, program_section: loan.section, date_given: new Date().toISOString(), status: 'borrowed'
     }]);
     if(!error) fetchData();
  };
  const returnLoan = async (id: number) => { 
      await supabase.from('equipment_tracking').update({ status: 'returned', date_received: new Date().toISOString() }).eq('id', id);
      fetchData();
  };
  const deleteLoan = async (id: number) => {
      await supabase.from('equipment_tracking').delete().eq('id', id);
      fetchData();
  };

  const addUser = async (user: Omit<User, "id" | "joined">, password?: string) => {
    const { error } = await supabase.from('users').insert([{
        username: user.name, email: user.email, role: user.role, status: user.status.toLowerCase(),
    }]);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("User Created", `User: ${user.name}`, "", session?.user?.id);
      fetchData();
    }
  };

  const updateUser = async (id: number, data: Partial<User>) => {
    const payload: any = {};
    if (data.name) payload.username = data.name;
    if (data.email) payload.email = data.email;
    if (data.role) payload.role = data.role;
    if (data.status) payload.status = data.status.toLowerCase();
    
    const { error } = await supabase.from('users').update(payload).eq('id', id);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("User Updated", `User ID: ${id}`, "", session?.user?.id);
      fetchData();
    }
  };

  // --- RESERVATION ACTIONS ---
  const addReservation = async (reservation: Omit<Reservation, "id" | "reservationDate" | "status" | "approvedBy" | "createdAt">) => {
    const { error } = await supabase.from('reservations').insert([{
      item_id: reservation.itemId,
      item_name: reservation.itemName,
      control_id: reservation.controlId,
      quantity: reservation.quantity,
      location: reservation.location,
      reserved_by: reservation.reservedBy,
      reserved_by_name: reservation.reservedByName,
      purpose: reservation.purpose,
      needed_date: reservation.neededDate,
      return_date: reservation.returnDate || null,
      notes: reservation.notes,
      status: 'pending'
    }]);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Reservation Created", `Reservation for ${reservation.itemName} by ${reservation.reservedByName}`, reservation.location, session?.user?.id);
      fetchData();
    }
  };

  const updateReservationStatus = async (id: number, status: Reservation["status"], approvedBy?: string) => {
    const payload: any = { status };
    if (approvedBy) payload.approved_by = approvedBy;
    const { error } = await supabase.from('reservations').update(payload).eq('id', id);
    if (!error) {
      const res = reservations.find(r => r.id === id);
      const { data: { session } } = await supabase.auth.getSession();
      await logAction(`Reservation ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Reservation #${id} for ${res?.itemName ?? "Item"} ${status}`, res?.location || "", session?.user?.id);
      fetchData();
    }
  };

  const cancelReservation = async (id: number) => {
    await updateReservationStatus(id, 'cancelled');
  };

  const deleteReservation = async (id: number) => {
    const res = reservations.find(r => r.id === id);
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("Reservation Deleted", `Reservation #${id} for ${res?.itemName ?? "Item"} deleted`, res?.location || "", session?.user?.id);
      fetchData();
    }
  };

  const deleteUser = async (id: number) => {
    // First get the user's auth id (UUID) from the users table
    const { data: userData } = await supabase.from('users').select('id').eq('id', id).single();
    
    if (userData) {
      // Delete from Supabase Auth via API route
      try {
        await fetch('/api/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authId: userData.id })
        });
      } catch (err) {
        console.error('Failed to delete from auth:', err);
      }
    }

    // Delete from users table
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      await logAction("User Deleted", `User ID: ${id}`, "", session?.user?.id);
      fetchData();
    }
  };

  return (
    <InventoryContext.Provider value={{ 
      inventory, loans, users, logs, reservations,
      addItem, updateItem, deleteItem, 
      deleteItems, updateItems, 
      addLoan, returnLoan, deleteLoan,
      addUser, updateUser, deleteUser,
      addReservation, updateReservationStatus, cancelReservation, deleteReservation,
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