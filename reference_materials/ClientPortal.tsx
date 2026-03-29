"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../constants';
import { RequisitionForm, LabItem } from '../types';
import { useInventory } from '../src/context/InventoryContext';

// Import the local logo
import cdmLogo from '../src/context/images/public/cdmlogo.png';

const LOGO_URL = cdmLogo;

export default function ClientPortal({ onClose, initialType }: { onClose?: () => void, initialType?: 'Borrow' | 'Reserve' } = {}) {
  const { inventory: inventoryItems, reservations, addReservation, refreshData, settings } = useInventory();
  
  const availableInventory = React.useMemo(() => {
    const aggregatedInventory = new Map<string, any>();
    
    inventoryItems.forEach(item => {
      const key = item.name.toLowerCase().trim();
      const maintenance = Number(item.qty_maintenance) || 0;
      const broken = Number(item.qty_broken) || 0;
      const unusableQty = maintenance + broken;
      const safeTotal = Math.max(0, Number(item.quantity) - unusableQty);

      if (aggregatedInventory.has(key)) {
        const existing = aggregatedInventory.get(key);
        existing.quantity += safeTotal;
      } else {
        aggregatedInventory.set(key, { ...item, quantity: safeTotal });
      }
    });

    return Array.from(aggregatedInventory.values()).map(item => {
      const takenByReservations = (reservations || [])
        .filter(r => ['Reserved', 'Approved', 'Released'].includes(r.status))
        .reduce((acc, r) => {
          const itemInReq = r.items.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
          return acc + (itemInReq ? Number(itemInReq.quantity) : 0);
        }, 0);

      return {
        ...item,
        quantity: Math.max(0, item.quantity - takenByReservations)
      };
    });
  }, [inventoryItems, reservations]);

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // 🛠️ FIX: Using modern error modal state instead of default browser alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<RequisitionForm>>({
    studentName: '',
    studentNumber: '',
    purpose: '',
    instructor: '',
    programSection: '',
    courseCode: '',
    room: '',
    timeOfUse: '',
    items: Array(10).fill({ name: '', quantity: 0, unit: '' }),
  });

  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<LabItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSuggestionRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const showSuggestions = (index: number, val: string, currentItems?: any[]) => {
    const itemsToUse = currentItems || [...(form.items || [])];
    const otherRowsQuantities = itemsToUse.reduce((acc: Record<string, number>, it: any, i: number) => {
      if (i !== index && it.name.trim()) {
        const nameKey = it.name.toLowerCase().trim();
        acc[nameKey] = (acc[nameKey] || 0) + (Number(it.quantity) || 0);
      }
      return acc;
    }, {});

    const currentRowQty = Number(itemsToUse[index].quantity) || 0;

    const filtered = availableInventory.map(item => {
      const alreadyTakenOther = otherRowsQuantities[item.name.toLowerCase().trim()] || 0;
      const maxForRow = Math.max(0, item.quantity - alreadyTakenOther);
      const remainingAfterCurrent = Math.max(0, maxForRow - currentRowQty);
      const isAlreadyInAnotherRow = Object.keys(otherRowsQuantities).includes(item.name.toLowerCase().trim());

      return {
        ...item,
        quantity: remainingAfterCurrent,
        isAvailableForThisRow: remainingAfterCurrent > 0 && !isAlreadyInAnotherRow,
        isDuplicate: isAlreadyInAnotherRow
      };
    }).filter(item => 
      !item.isDuplicate && item.name.toLowerCase().includes(val.trim().toLowerCase())
    );
    
    setFilteredSuggestions(filtered);
    setActiveSuggestionRow(index);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...(form.items || [])];
    let itemValue: string | number = value;

    if (field === 'quantity') {
      const parsed = parseInt(value as string, 10);
      itemValue = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      
      const itemName = newItems[index].name.toLowerCase().trim();
      if (itemName) {
        const invItem = availableInventory.find(i => i.name.toLowerCase().trim() === itemName);
        if (invItem) {
          const otherRowsQuantities = newItems.reduce((acc, it, i) => {
            if (i !== index && it.name.trim().toLowerCase() === itemName) {
              return acc + (Number(it.quantity) || 0);
            }
            return acc;
          }, 0);
          const available = Math.max(0, invItem.quantity - otherRowsQuantities);
          if (Number(itemValue) > available) itemValue = available;
        }
      }
      newItems[index].unit = (Number(itemValue) <= 1) ? 'pc' : 'pcs';
    }

    if (field === 'name' && String(value).trim() === '') {
      newItems[index] = { name: '', quantity: 0, unit: '' };
    } else {
      newItems[index] = { ...newItems[index], [field]: itemValue };
    }

    setForm(prev => ({ ...prev, items: newItems }));

    if (field === 'name' || field === 'quantity') {
      const val = field === 'name' ? String(value) : newItems[index].name;
      if (val.trim()) {
        showSuggestions(index, val, newItems);
      } else if (field === 'name') {
        setActiveSuggestionRow(null);
      }
    }
  };

  const selectSuggestion = (index: number, suggestion: any) => {
    if (!suggestion.isAvailableForThisRow || suggestion.isDuplicate) return; 
    
    const newItems = [...(form.items || [])];
    const currentQty = Number(newItems[index].quantity) || 0;
    const resolvedQty = currentQty > 0 ? currentQty : 1;
    
    newItems[index] = { 
      ...newItems[index], 
      name: suggestion.name, 
      quantity: resolvedQty,
      unit: resolvedQty <= 1 ? 'pc' : 'pcs' 
    };
    setForm(prev => ({ ...prev, items: newItems }));
    setActiveSuggestionRow(null);
  };

  const getStartTime = (timeRange: string): string => {
    const parts = timeRange.split(' - ');
    return parts[0] || '';
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    if (onClose) onClose();
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, type: 'Borrow' | 'Reserve' = 'Reserve') => {
    e.preventDefault();
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 21 || currentHour < 5) {
      setErrorMsg("SYSTEM LOCKED: The Central Storage Room (CSR) is currently closed. Transactions cannot be processed between 9:00 PM and 5:00 AM.");
      return;
    }

    // 🛠️ FIX: Included all of your custom field validations correctly, mapped to the modern modal!
    if (type === 'Reserve' && !form.timeOfUse) {
      setErrorMsg("Please select a valid time of use for your reservation.");
      return;
    }

    if (!form.studentName) {
      setErrorMsg("Please fill in the Student Name field.");
      return;
    }

    if (!form.studentNumber) {
      setErrorMsg("Please fill in the Student Number field.");
      return;
    }

    if (!form.purpose) {
      setErrorMsg("Please fill in the Student Purpose field.");
      return;
    }

    if (!form.instructor) {
      setErrorMsg("Please fill in the Instructor/Adviser field.");
      return;
    }

    if (!form.programSection) {
      setErrorMsg("Please fill in the Program & Section field.");
      return;
    }

    if (!form.courseCode) {
      setErrorMsg("Please fill in the Course/Code field.");
      return;
    }

    if (!form.room) {
      setErrorMsg("Please fill in the Room field.");
      return;
    }

    const rawItems = (form.items || []).filter(i => i.name.trim() !== '' && i.name !== 'Invalid Item' && i.quantity > 0);
    if (rawItems.length === 0) {
      setErrorMsg("Please add at least one valid item from the inventory.");
      return;
    }

    for (const item of rawItems) {
      const exists = availableInventory.some(inv => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
      if (!exists) {
        setErrorMsg(`INVALID ITEM: "${item.name}" is not in the system. Please select a valid item from the suggestions.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formId = `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      let status: RequisitionForm["status"] = settings?.autoApproval ? 'Approved' : 'Reserved';
      let dateOut: string = new Date().toISOString();
      
      if (type === 'Reserve' && form.timeOfUse) {
        const startTimeStr = getStartTime(form.timeOfUse);
        if (startTimeStr) {
          const [time, ampm] = startTimeStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          const dateOutObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
          dateOut = dateOutObj.toISOString();
        }
      }

      const newRequisition: RequisitionForm = {
        id: formId,
        studentName: form.studentName!,
        studentNumber: form.studentNumber!,
        purpose: form.purpose || '',
        programSection: form.programSection || '',
        courseCode: form.courseCode || '',
        room: form.room || '',
        instructor: form.instructor || '',
        timeOfUse: form.timeOfUse || '',
        items: rawItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
        status: status,
        dateOut: dateOut,
        dateIn: null,
        signatures: {
          requested: true,
          endorsed: settings?.autoApproval ? true : false,
          released: false,
          approved: settings?.autoApproval ? true : false
        }
      };

      await addReservation(newRequisition);
      setShowSuccessModal(true);
      setForm({
        studentName: '',
        studentNumber: '',
        purpose: '',
        instructor: '',
        programSection: '',
        courseCode: '',
        room: '',
        timeOfUse: '',
        items: Array(10).fill({ name: '', quantity: 0, unit: '' }),
      });

    } catch (err: any) {
      setErrorMsg(`Error: ${err.message || 'Failed to submit requisition'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-center items-center py-10 px-4 sm:px-8 animate-in fade-in duration-500 bg-stone-950 ${onClose ? '' : 'pb-24'}`}>
      {!onClose && (
        <header className="w-full max-w-4xl text-center px-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">Client Portal</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base font-medium tracking-tight">Official Requisition of Laboratory Equipment, Supplies and Apparatus.</p>
        </header>
      )}

      <div className="w-full max-w-4xl bg-white text-stone-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl border border-stone-300 overflow-hidden font-serif mx-auto">
        <div className="p-[2mm] sm:p-[5mm] space-y-4">
          <div className="border-[2px] sm:border-[3px] border-black p-0.5 sm:p-1">
            <div className="border-2 border-black">
              <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-black p-2 sm:p-4 gap-4 bg-white">
                <div className="flex items-center space-x-3 sm:space-x-6 w-full md:w-auto">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center p-1 shrink-0">
                    <img src={LOGO_URL} alt="CDM Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="flex-1 text-left">
                    <h1 className="text-[13px] sm:text-lg lg:text-xl font-bold uppercase leading-tight tracking-tight">Colegio de Muntinlupa</h1>
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Requisition Form</h2>
                    <p className="text-[8px] sm:text-[10px] lg:text-xs font-bold uppercase text-stone-600">Equipment, Supplies and Apparatus</p>
                  </div>
                </div>
                <div className="border-2 border-black text-[10px] w-full md:w-64 lg:w-72 shrink-0">
                  <div className="bg-stone-800 text-white p-1 sm:p-1.5 font-bold text-center border-b-2 border-black uppercase">Document Code</div>
                  <div className="p-1 sm:p-2 border-b-2 border-black font-mono text-center text-[10px] sm:text-xs h-6 sm:h-8 flex items-center justify-center">AUTOGEN-ON-SUBMIT</div>
                  <div className="grid grid-cols-3 text-[8px] sm:text-[9px] font-bold">
                    <div className="border-r-2 border-black p-1 flex flex-col justify-between h-8 sm:h-10"><span>Effective Date</span><span className="font-normal text-center">{new Date().toLocaleDateString()}</span></div>
                    <div className="border-r-2 border-black p-1 flex flex-col justify-between h-8 sm:h-10"><span>Revision No.</span><span className="font-normal text-center">00</span></div>
                    <div className="p-1 flex flex-col justify-between h-8 sm:h-10"><span>Revision Date</span><span className="font-normal text-center"></span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-black">
                <div className="flex flex-col h-full border-b-2 md:border-b-0 md:border-r-2 border-black">
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Name:" value={form.studentName || ''} onChange={(val) => handleFieldChange('studentName', val)} placeholder="Surname, Firstname M.I." /></div>
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Student Number:" value={form.studentNumber || ''} onChange={(val) => handleFieldChange('studentNumber', val)} placeholder="Enter student number..." numericOnly={true} /></div>
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Purpose:" value={form.purpose || ''} onChange={(val) => handleFieldChange('purpose', val)} placeholder="Enter purpose..." /></div>
                  <div className="flex-1 flex flex-col justify-center"><DetailInput label="Instructor/Adviser:" value={form.instructor || ''} onChange={(val) => handleFieldChange('instructor', val)} placeholder="Enter instructor name..." /></div>
                </div>
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Program & Section:" value={form.programSection || ''} onChange={(val) => handleFieldChange('programSection', val)} placeholder="Enter program/section..." /></div>
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Course/Code:" value={form.courseCode || ''} onChange={(val) => handleFieldChange('courseCode', val)} placeholder="Enter course/code..." /></div>
                  <div className="flex-1 flex flex-col justify-center border-b-2 border-black"><DetailInput label="Room:" value={form.room || ''} onChange={(val) => handleFieldChange('room', val)} placeholder="Enter room..." /></div>
                  <div className="flex-1 flex flex-col justify-center"><TimeSelectionInput label="Time of use:" value={form.timeOfUse || ''} onChange={(val) => handleFieldChange('timeOfUse', val)} /></div>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse border-b-2 border-black bg-white min-w-[650px]">
                  <thead>
                    <tr className="text-center text-[10px] sm:text-xs font-bold bg-stone-200 text-black">
                      <th className="border-r-2 border-b-2 border-black py-2 px-2">Equipment/Supplies/Apparatus</th>
                      <th className="border-r-2 border-b-2 border-black py-2 w-[10%]">Quantity</th>
                      <th className="border-r-2 border-b-2 border-black py-2 w-[12%]">Unit</th>
                      <th className="border-r-2 border-b-2 border-black py-2 w-[15%]">Date and Time Out</th>
                      <th className="border-b-2 border-black py-2 w-[15%]">Date and Time In</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {(form.items || []).map((item, i) => {
                      const isItemValid = availableInventory.some(inv => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                      const isInvalidFeedback = item.name === 'Invalid Item';

                      return (
                      <tr key={i} className="h-8 text-[10px] sm:text-xs font-bold group relative">
                        <td className="border-r-2 border-b-2 border-black p-0 relative">
                          <input 
                            type="text" 
                            autoComplete="off" 
                            placeholder="Search items in inventory..." 
                            className={`w-full h-full px-2 outline-none italic text-[9px] sm:text-[10px] bg-white focus:bg-orange-50 transition-colors text-left placeholder:text-stone-300 placeholder:italic placeholder:font-normal ${isInvalidFeedback ? 'text-red-500 font-black' : 'text-stone-900 font-bold'}`} 
                            style={{ fontFamily: 'Arial, sans-serif' }} 
                            value={item.name} 
                            onChange={(e) => handleItemChange(i, 'name', e.target.value)} 
                            onFocus={() => {
                              if (isInvalidFeedback) {
                                handleItemChange(i, 'name', '');
                                showSuggestions(i, '');
                              } else {
                                showSuggestions(i, item.name);
                              }
                            }}
                            onBlur={(e) => {
                              setTimeout(() => {
                                setForm(prev => {
                                  const newItems = [...(prev.items || [])];
                                  const currentName = newItems[i].name.trim();
                                  if (currentName !== '' && currentName !== 'Invalid Item') {
                                    const exists = availableInventory.some(inv => inv.name.toLowerCase().trim() === currentName.toLowerCase());
                                    if (!exists) {
                                      newItems[i].name = 'Invalid Item';
                                      newItems[i].quantity = 0;
                                      newItems[i].unit = '';
                                    }
                                  }
                                  return { ...prev, items: newItems };
                                });
                              }, 200);
                            }}
                          />
                          {activeSuggestionRow === i && (
                            <div ref={dropdownRef} className="absolute left-0 top-full mt-0 w-full min-w-[250px] bg-white border border-stone-300 shadow-2xl z-50 max-h-48 overflow-y-auto rounded-b-lg border-t-0 animate-in fade-in slide-in-from-top-1 duration-200 no-print">
                              {filteredSuggestions.length > 0 ? (
                                filteredSuggestions.map((suggestion, sIdx) => (
                                  <button key={sIdx} type="button" onClick={() => selectSuggestion(i, suggestion)} className={`w-full text-left px-4 py-3 transition-all flex justify-between items-center border-b last:border-0 border-stone-200 group/item ${!(suggestion as any).isAvailableForThisRow ? 'bg-red-50 cursor-not-allowed opacity-80' : 'bg-white hover:bg-orange-600 cursor-pointer'}`}>
                                    <div className="flex flex-col pr-2">
                                      <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${!(suggestion as any).isAvailableForThisRow ? 'text-red-700' : 'text-stone-900 group-hover/item:text-white'}`}>{suggestion.name}</span>
                                      <span className={`text-[9px] font-bold transition-colors ${!(suggestion as any).isAvailableForThisRow ? 'text-red-500' : 'text-stone-500 group-hover/item:text-white/80'}`}>{suggestion.category}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      {!(suggestion as any).isAvailableForThisRow ? (
                                        <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest shadow-sm">OUT OF STOCK</span>
                                      ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 group-hover/item:text-white">Available: {suggestion.quantity}</span>
                                      )}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-5 py-6 text-center bg-red-50/50 rounded-b-lg">
                                  <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">No Available Items</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="border-r-2 border-b-2 border-black p-0">
                          <input type="number" min="0" placeholder={item.name ? "0" : ""} disabled={!isItemValid} className="w-full h-full text-center outline-none font-black text-xs bg-white text-stone-900 focus:bg-orange-50 transition-colors disabled:bg-stone-50 disabled:cursor-not-allowed placeholder:text-stone-300 placeholder:italic placeholder:font-normal" style={{ fontFamily: 'Arial, sans-serif' }} value={item.quantity === 0 ? '' : item.quantity} onKeyDown={(e) => { if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault(); }} onChange={(e) => handleItemChange(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="border-r-2 border-b-2 border-black p-0 bg-stone-50/50">
                          <input type="text" readOnly disabled={!isItemValid} className="w-full h-full text-center outline-none font-bold text-xs bg-transparent text-stone-500 transition-colors italic disabled:opacity-30 disabled:cursor-not-allowed cursor-default" style={{ fontFamily: 'Arial, sans-serif' }} value={item.unit} tabIndex={-1} />
                        </td>
                        <td className="border-r-2 border-b-2 border-black px-1 text-[9px] text-center font-bold"></td>
                        <td className="border-b-2 border-black px-1 text-[9px] text-center font-bold"></td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-[10px] gap-0">
                <SignatureBlock label="Requested by:" title="Student/Instructor" value={form.studentName} className="border-b-2 md:border-r-2 lg:border-b-0 border-black" />
                <SignatureBlock label="Endorsed by:" title="Instructor/Adviser" value={form.instructor} className="border-b-2 md:border-r-0 lg:border-r-2 lg:border-b-0 border-black" />
                <SignatureBlock label="Released by:" title="Laboratory Technician" value="SINO DITO?" className="border-b-2 md:border-b-0 md:border-r-2 border-black" />
                <SignatureBlock label="Approved by:" title="Lab. Head/Prog. Chair" value="Engr. John Daniel Salbon" className="border-black" />
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setForm(prev => ({ ...prev, items: [...(prev.items || []), { name: '', quantity: 0, unit: '' }] }))} className="mt-4 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors flex items-center gap-1 group no-print">
            <Icons.Plus /><span>Add more rows</span>
          </button>
          <div className="pt-4 border-t border-stone-200 no-print">
            <div className="bg-amber-50 border border-amber-200 p-4 sm:p-6 rounded-xl flex items-start space-x-3 sm:space-x-4">
              <div className="text-amber-600 mt-1 shrink-0"><Icons.AlertTriangle /></div>
              <div>
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm mb-1 uppercase tracking-tight">Submission Agreement</h4>
                <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed font-medium">By submitting this form, I acknowledge responsibility for the equipment requested. I agree to adhere to laboratory safety protocols and return all items in their original condition.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto mt-8 flex flex-col sm:flex-row justify-end gap-4 px-2 sm:px-0 no-print">
        {(!initialType || initialType === 'Borrow') && (
          <button type="button" onClick={(e) => handleSubmit(e, 'Borrow')} disabled={isSubmitting} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] italic text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3">
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Tracking />}
            <span>{isSubmitting ? 'Processing...' : 'Borrow'}</span>
          </button>
        )}
        {(!initialType || initialType === 'Reserve') && (
          <button type="button" onClick={(e) => handleSubmit(e, 'Reserve')} disabled={isSubmitting} className="w-full sm:w-auto bg-orange-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] italic text-sm hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/40 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3">
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Clock />}
            <span>{isSubmitting ? 'Processing...' : 'Reserve'}</span>
          </button>
        )}
      </div>

      {/* 🛠️ Modern Custom Error Modal */}
      {errorMsg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-8 max-w-sm w-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Attention Required</h3>
                <p className="text-stone-400 text-xs leading-relaxed font-medium">{errorMsg}</p>
              </div>
              <button 
                onClick={() => setErrorMsg(null)} 
                className="w-full bg-stone-800 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] hover:bg-stone-700 transition-all border border-stone-700 active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-10 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-green-500/20 rounded-[1.5rem] flex items-center justify-center mx-auto text-green-400 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Success!</h3>
              <p className="text-stone-400 text-sm mt-2 font-medium">Request submitted. Please proceed to the CSR office to confirm your transaction.</p>
            </div>
            <button onClick={closeSuccessModal} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest text-[11px] active:scale-95">Close Window</button>
          </div>
        </div>
      )}
    </div>
  );
}

const TimeSelectionInput: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => {
  const allTimeOptions = [];
  for (let hour = 6; hour <= 21; hour++) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const time1 = `${displayHour}:00 ${ampm}`;
    allTimeOptions.push(time1);
    if (hour < 21) {
      const time2 = `${displayHour}:30 ${ampm}`;
      allTimeOptions.push(time2);
    }
  }

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [time, ampm] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = currentHour * 60 + now.getMinutes();

  if (currentHour >= 21 || currentHour < 5) {
    return (
      <div className="flex text-[9px] sm:text-[10px] items-stretch h-full min-h-[2.5rem]">
        <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black"><span className="leading-tight py-1">{label}</span></div>
        <div className="flex-1 flex items-center justify-start px-2 text-red-500 text-[10px] font-bold">No available times (9:00 PM to 5:00 AM)</div>
      </div>
    );
  }

  let nextSlotMinutes = Math.ceil(currentMinutes / 30) * 30;
  if (currentMinutes % 30 === 0) nextSlotMinutes = currentMinutes;

  const validStartOptions = allTimeOptions.filter(t => {
    const minutes = timeToMinutes(t);
    return minutes >= nextSlotMinutes && minutes <= 1260;
  });

  const parts = value.split(' - ');
  const start = parts[0] || '';
  let end = parts[1] || '';
  const startMinutes = timeToMinutes(start);

  if (start && end && timeToMinutes(end) <= startMinutes) {
    end = '';
  }

  const validEndOptions = allTimeOptions.filter(t => {
    const minutes = timeToMinutes(t);
    return minutes > startMinutes && minutes <= 1260;
  });

  if (validStartOptions.length === 0) {
    return (
      <div className="flex text-[9px] sm:text-[10px] items-stretch h-full min-h-[2.5rem]">
        <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black"><span className="leading-tight py-1">{label}</span></div>
        <div className="flex-1 flex items-center justify-start px-2 text-red-500 text-[10px] font-bold">No available times (9:00 PM to 5:00 AM)</div>
      </div>
    );
  }

  return (
    <div className="flex text-[9px] sm:text-[10px] items-stretch h-full min-h-[2.5rem]">
      <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black"><span className="leading-tight py-1">{label}</span></div>
      <div className="flex-1 flex items-center justify-start px-2">
        <div className="flex items-center space-x-1 sm:space-x-2 w-full max-w-[200px]">
          <div className="flex-1 border border-stone-300 rounded px-0.5 sm:px-1 py-1 bg-stone-50/50">
            <select className="bg-transparent border-none outline-none italic font-bold w-full text-center appearance-none cursor-pointer text-[9px] sm:text-[10px] text-stone-800" style={{ fontFamily: 'Arial, sans-serif' }} value={start} onChange={(e) => { const newStart = e.target.value; const newStartMin = timeToMinutes(newStart); const currentEndMin = timeToMinutes(end); let newEnd = end; if (currentEndMin <= newStartMin) { newEnd = ''; } onChange(`${newStart} - ${newEnd}`); }}>
              <option value="" disabled>Start</option>
              {validStartOptions.map(t => <option key={t} value={t} className="not-italic font-normal">{t}</option>)}
            </select>
          </div>
          <span className="font-bold italic text-stone-400 text-[8px] sm:text-[9px]">to</span>
          <div className={`flex-1 border border-stone-300 rounded px-0.5 sm:px-1 py-1 bg-stone-50/50 ${!start ? 'opacity-50' : ''}`}>
            <select className={`bg-transparent border-none outline-none italic font-bold w-full text-center appearance-none cursor-pointer text-[9px] sm:text-[10px] text-stone-800 ${!start ? 'cursor-not-allowed' : ''}`} style={{ fontFamily: 'Arial, sans-serif' }} value={end} onChange={(e) => onChange(`${start} - ${e.target.value}`)} disabled={!start}>
              <option value="" disabled>End</option>
              {validEndOptions.map(t => <option key={t} value={t} className="not-italic font-normal">{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailInput: React.FC<{ label: string, value: string, onChange: (val: string) => void, placeholder?: string, numericOnly?: boolean }> = ({ label, value, onChange, placeholder, numericOnly }) => (
  <div className="flex text-[10px] sm:text-xs items-stretch h-full min-h-[2.5rem]">
    <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black"><span className="leading-tight py-1">{label}</span></div>
    <div className="flex-1 flex items-center">
      <input className="block w-full bg-transparent border-none outline-none italic font-bold px-2 placeholder:text-stone-300 placeholder:font-normal placeholder:italic py-2 text-left text-stone-800" style={{ fontFamily: 'Arial, sans-serif' }} value={value} onChange={(e) => { if (numericOnly) { const val = e.target.value.replace(/[^0-9]/g, ''); onChange(val); } else { onChange(e.target.value); } }} placeholder={placeholder} inputMode={numericOnly ? "numeric" : undefined} />
    </div>
  </div>
);

const SignatureBlock: React.FC<{ label: string, title: string, value?: string, className?: string }> = ({ label, title, value, className }) => (
  <div className={`flex flex-col h-24 sm:h-32 p-2 text-left ${className || ''}`}>
    <p className="font-bold text-[9px] sm:text-[10px]">{label}</p>
    <div className="mt-auto text-center">
      <div className="border-b-2 border-black mx-2 relative h-6 sm:h-10 flex items-end justify-center pb-1">
        {value && <span className="font-bold uppercase text-[9px] sm:text-xs truncate w-full px-1">{value}</span>}
      </div>
      <p className="font-bold mt-1 uppercase text-[8px] sm:text-[9px]">{title}</p>
      <div className="flex items-center mt-1 sm:mt-2 px-2">
        <span className="font-bold mr-1 text-[8px] sm:text-[9px]">Date:</span>
        <div className="flex-1 border-b border-black h-3 sm:h-4"></div>
      </div>
    </div>
  </div>
);