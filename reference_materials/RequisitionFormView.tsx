import React, { useState, useRef, useEffect } from 'react';
import { RequisitionForm, LabItem, ItemStatus } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Icons } from '../constants';
import { useInventory } from '../src/context/InventoryContext';

// Import the school logo image from the local folder
import cdmLogo from '../src/context/images/public/cdmlogo.png';

// Define the properties that this view expects to receive from its parent screen
interface RequisitionFormViewProps {
  formData: RequisitionForm;
  onClose: () => void;
  onAction: (action: string) => void;
  onUpdate?: (updatedData: RequisitionForm) => void;
}

// Store the logo in a constant variable for easy reference later
const LOGO_URL = cdmLogo;

// ============================================================================
// HELPER FUNCTION: Format Date String
// ============================================================================
// This function takes a computer-style date and turns it into a human-readable 
// format (like "12/31/2023, 02:30 PM"). 
// If no date is given, it returns an empty string. 
// If the date is broken, it just returns the broken text instead of crashing.
// ============================================================================
const formatDateString = (dateString?: string | null) => {
  // If there is nothing passed in, just return nothing.
  if (!dateString) {
    return '';
  }
  
  try {
    // Try to understand the date provided
    const date = new Date(dateString);
    
    // If the date doesn't make sense, return the original text
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    // Format the date nicely for the user
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true
    }).format(date);
    
  } catch (error) { 
    // If anything goes wrong, just return the original text
    return dateString; 
  }
};

// ============================================================================
// MAIN COMPONENT: RequisitionFormView
// ============================================================================
// This is the main window that pops up to show the requisition form. 
// It handles editing the form, showing inventory suggestions, and printing to PDF.
// ============================================================================
const RequisitionFormView: React.FC<RequisitionFormViewProps> = ({ 
  formData, 
  onClose, 
  onAction, 
  onUpdate 
}) => {
  
  // Bring in the current inventory and reservations from our main system
  const { inventory: inventoryItems, reservations } = useInventory();
  
  // Create a local copy of the form data so the user can make changes safely
  const [localData, setLocalData] = useState<RequisitionForm>(formData);
  
  // Keep track of whether the system is currently building the PDF
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Keep track of whether the school logo successfully loaded
  const [logoLoaded, setLogoLoaded] = useState(true);
  
  // Create a reference to the form on the screen so we can take a "picture" of it later
  const formRef = useRef<HTMLDivElement>(null);
  
  // Keep track of which row the user is currently typing in to show suggestions
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  
  // Store the list of items that match what the user is typing
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  
  // Create a reference to the dropdown menu so we know if the user clicks outside of it
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // CALCULATE INVENTORY: availableInventory
  // ============================================================================
  // This block looks at all the items we own, subtracts the ones that are broken
  // or under maintenance, and then subtracts the ones that other students have 
  // already reserved. This gives us the true number of items available to borrow.
  // ============================================================================
  const availableInventory = React.useMemo(() => {
    // Create a temporary storage to group identical items together
    const aggregatedInventory = new Map<string, any>();
    
    // Step 1: Go through every single item in our system
    inventoryItems.forEach(item => {
      // Standardize the name so "Beaker" and "beaker" are treated as the same thing
      const key = item.name.toLowerCase().trim();
      
      // Figure out how many are broken or being fixed
      const maintenance = Number(item.qty_maintenance) || 0;
      const broken = Number(item.qty_broken) || 0;
      const unusableQty = maintenance + broken;
      
      // Calculate how many are physically safe to use
      const safeTotal = Math.max(0, Number(item.quantity) - unusableQty);

      // Add them to our storage
      if (aggregatedInventory.has(key)) {
        const existing = aggregatedInventory.get(key);
        existing.quantity += safeTotal;
      } else {
        aggregatedInventory.set(key, { ...item, quantity: safeTotal });
      }
    });

    // Step 2: Subtract items that are currently reserved by other people
    return Array.from(aggregatedInventory.values()).map(item => {
      
      // Look at all reservations and add up how many of this item are taken
      const takenByReservations = (reservations || [])
        // Only count reservations that are actually approved or active (ignore our own form)
        .filter(r => ['Reserved', 'Approved', 'Released'].includes(r.status) && r.id !== localData.id)
        .reduce((totalTaken, currentReservation) => {
          // Find if this specific item is in the current reservation
          const itemInReq = currentReservation.items.find(
            i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
          // If it is, add the quantity to our total
          return totalTaken + (itemInReq ? Number(itemInReq.quantity) : 0);
        }, 0);

      // Return the item with a new 'availableQty' number
      return {
        ...item,
        availableQty: Math.max(0, item.quantity - takenByReservations)
      };
    });
  }, [inventoryItems, reservations, localData.id]);

  // ============================================================================
  // SETUP: Ensure 10 Rows
  // ============================================================================
  // When the form first loads, this makes sure there are exactly 10 blank rows 
  // in the table, so it looks like a traditional printed paper form.
  // ============================================================================
  useEffect(() => {
    // Copy the items we already have
    const paddedItems = [...formData.items];
    
    // Keep adding blank rows until we hit exactly 10
    while (paddedItems.length < 10) {
      paddedItems.push({ name: '', quantity: 0, unit: '' });
    }
    
    // Save this back to our local screen
    setLocalData({ ...formData, items: paddedItems });
  }, [formData]);

  // ============================================================================
  // SETUP: Handle Clicking Outside
  // ============================================================================
  // This watches where the user clicks their mouse. If they click outside of the
  // suggestion dropdown menu, it closes the menu automatically.
  // ============================================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the dropdown is open, and the click was NOT inside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Close the suggestion box
        setActiveSuggestionRow(null);
      }
    };
    
    // Turn on the click listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Turn off the click listener when the window closes
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================================
  // ACTION: Change Basic Field
  // ============================================================================
  // Whenever the user types in a basic text box (like Name or Course), 
  // this saves what they typed.
  // ============================================================================
  const handleFieldChange = (field: keyof RequisitionForm, value: string) => {
    // Create a new version of the data with the new text
    const updated = { ...localData, [field]: value };
    
    // Update the screen
    setLocalData(updated);
    
    // Tell the main system about the change, if needed
    if (onUpdate) {
      onUpdate(updated);
    }
  };

  // ============================================================================
  // ACTION: Show Dropdown Suggestions
  // ============================================================================
  // As the user types the name of an item, this searches the inventory and 
  // creates a list of matching items for them to click on.
  // ============================================================================
  const showSuggestions = (index: number, val: string, currentItems?: any[]) => {
    // Figure out which items are currently on the screen
    const itemsToUse = currentItems || [...localData.items];
    
    // Make a list of items already chosen in other rows so we don't suggest them twice
    const otherRowsNames = itemsToUse
      .filter((_, i) => i !== index)
      .map((it: any) => it.name.toLowerCase().trim())
      .filter((name: string) => name !== '');

    // Check our available inventory against what the user typed
    const filtered = availableInventory.map(item => {
      // Check if this item is already being used in a different row
      const isAlreadyInAnotherRow = otherRowsNames.includes(item.name.toLowerCase().trim());
      
      // Build a profile for this suggestion
      return {
        ...item,
        displayQty: item.availableQty,
        isAvailableForThisRow: item.availableQty > 0 && !isAlreadyInAnotherRow,
        isDuplicate: isAlreadyInAnotherRow
      };
    }).filter(item => 
      // Only keep it in the list if it's not a duplicate AND it matches what they typed
      !item.isDuplicate && item.name.toLowerCase().includes(val.trim().toLowerCase())
    );
    
    // Update the list of suggestions and tell the system which row it belongs to
    setFilteredSuggestions(filtered);
    setActiveSuggestionRow(index);
  };

  // ============================================================================
  // ACTION: Change Item in Table
  // ============================================================================
  // When the user types an item name or changes a quantity in the table, 
  // this updates that specific row, makes sure they aren't requesting more 
  // than we have, and updates the "pc/pcs" unit automatically.
  // ============================================================================
  const handleItemChange = (index: number, field: string, value: string | number) => {
    // Copy the current list of items
    const newItems = [...localData.items];
    
    // Make sure the list is long enough to include the row they are editing
    while (newItems.length <= index) {
      newItems.push({ name: '', quantity: 0, unit: '' });
    }
    
    let itemValue: string | number = value;

    // If they are changing the number of items they want...
    if (field === 'quantity') {
      // Turn their text into a proper number
      const parsed = parseInt(value as string, 10);
      itemValue = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      
      // Find out what item they are trying to get
      const itemName = newItems[index].name.toLowerCase().trim();
      
      if (itemName) {
        // Check our stock for this item
        const invItem = availableInventory.find(i => i.name.toLowerCase().trim() === itemName);
        if (invItem) {
          // If they asked for too many, lower it to the maximum we have
          if (Number(itemValue) > invItem.availableQty) {
            itemValue = invItem.availableQty;
          }
        }
      }
      
      // Change the label to "pc" for 1, and "pcs" for more than 1
      newItems[index].unit = (Number(itemValue) <= 1) ? 'pc' : 'pcs';
    }

    // If they deleted the item name completely, reset the whole row
    if (field === 'name' && String(value).trim() === '') {
      newItems[index] = { name: '', quantity: 0, unit: '' };
    } else {
      // Otherwise, just save the new change
      newItems[index] = { ...newItems[index], [field]: itemValue };
    }

    // Update the local screen
    const updated = { ...localData, items: newItems };
    setLocalData(updated);

    // If they are typing a name or quantity, pop up the suggestions menu
    if (field === 'name' || field === 'quantity') {
      const val = field === 'name' ? String(value) : newItems[index].name;
      if (val.trim()) {
        showSuggestions(index, val, newItems);
      } else if (field === 'name') {
        // Hide the menu if they cleared the text box
        setActiveSuggestionRow(null);
      }
    }
    
    // Tell the main system about the change
    if (onUpdate) {
      onUpdate(updated);
    }
  };

  // ============================================================================
  // ACTION: Click a Suggestion
  // ============================================================================
  // When the user clicks an item from the dropdown list, this puts that item 
  // into the table row and automatically sets the quantity to 1.
  // ============================================================================
  const selectSuggestion = (index: number, suggestion: any) => {
    // If it's a bad click, out of stock, or already in the table, do nothing
    if (!suggestion || !suggestion.isAvailableForThisRow || suggestion.isDuplicate) {
      return;
    }
    
    // Copy the current items
    const newItems = [...localData.items];
    
    // Ensure the array is long enough
    while (newItems.length <= index) {
      newItems.push({ name: '', quantity: 0, unit: '' });
    }

    // Set the row to exactly what they clicked on
    newItems[index] = { 
      ...newItems[index], 
      name: suggestion.name || '',
      quantity: 1,
      unit: 'pc'
    };
    
    // Save the changes and close the suggestion menu
    const updated = { ...localData, items: newItems };
    setLocalData(updated);
    setActiveSuggestionRow(null);
    
    // Tell the main system
    if (onUpdate) {
      onUpdate(updated);
    }
  };

  // ============================================================================
  // ACTION: Download as PDF
  // ============================================================================
  // This takes a screenshot of the form and packages it neatly into a PDF 
  // sized exactly for a half short bond paper. It hides buttons and changes 
  // text boxes into plain text so it looks like a real printed document.
  // ============================================================================
  const downloadPDF = async () => {
    // Prevent clicking the button twice, and make sure the form actually exists
    if (isDownloading || !formRef.current) {
      return;
    }
    
    // Tell the system we are working on it
    setIsDownloading(true);

    try {
      // Take a high-quality snapshot of the form on the screen
      const canvas = await html2canvas(formRef.current, {
        scale: 3, // Make it very sharp
        useCORS: true, // Allow loading the logo image
        allowTaint: true,
        backgroundColor: '#ffffff', // Ensure the background is white
        
        // Before taking the picture, clean up the screen view temporarily
        onclone: (_clonedDoc, clonedEl) => {
          
          // 1. Hide buttons, dropdown menus, and anything meant only for the screen
          clonedEl.querySelectorAll('.no-print').forEach((el: any) => {
            el.style.display = 'none';
          });

          // 2. Stop scrollbars from cutting off the table
          clonedEl.querySelectorAll('.overflow-x-auto').forEach((el: any) => {
            el.style.overflow = 'visible';
          });

          // 3. Replace text boxes and dropdowns with simple text. 
          // This removes the gray borders and blinking cursors from the final PDF.
          clonedEl.querySelectorAll('input, select').forEach((input: any) => {
            const val = input.value ?? '';
            
            // Figure out if the text should be centered based on the original box
            const isCenter = input.classList.contains('text-center') || input.tagName === 'SELECT';

            // Create a fake piece of text to replace the input box
            const div = _clonedDoc.createElement('div');
            div.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: ${isCenter ? 'center' : 'flex-start'};
              width: 100%;
              height: 100%;
              padding: ${isCenter ? '0 4px' : '0 8px'};
              font-family: Arial, sans-serif;
              font-weight: bold;
              font-size: 11px;
              color: #000;
              box-sizing: border-box;
              white-space: nowrap;
              overflow: hidden;
            `;
            div.textContent = val;
            
            // Swap out the original input box for our new plain text
            input.parentNode?.replaceChild(div, input);
          });
        },
      });

      // Convert the snapshot into a picture file
      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      // Define the paper size: Half short bond paper (portrait format)
      const pageW  = 139.7;   // Width in millimeters (5.5 inches)
      const pageH  = 215.9;   // Height in millimeters (8.5 inches)
      const margin = 5;       // Give it a tiny bit of breathing room on the edges
      const maxW   = pageW - margin * 2;  
      const maxH   = pageH - margin * 2;  

      // Calculate how to shrink or grow the picture so it perfectly fits the page 
      // without getting squished or stretched out.
      const aspect = canvas.width / canvas.height;
      let printW: number, printH: number;
      
      if (maxW / aspect <= maxH) {
        printW = maxW;
        printH = maxW / aspect;
      } else {
        printH = maxH;
        printW = maxH * aspect;
      }

      // Calculate the exact middle of the paper to put the picture there
      const offsetX = margin + (maxW - printW) / 2;
      const offsetY = margin + (maxH - printH) / 2;

      // Create the final blank PDF document
      const pdf = new jsPDF({
        orientation: 'p',          
        unit: 'mm',
        format: [pageW, pageH],
      });

      // Paste the picture onto the blank PDF
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, printW, printH);
      
      // Save it to the user's computer with a nice file name
      pdf.save(`Requisition_${localData.id || 'Form'}.pdf`);

    } catch (error) {
      // If something blows up, let the user know gently
      console.error(error);
      alert('Failed to generate PDF.');
    } finally {
      // Tell the system we are done working so they can click the button again
      setIsDownloading(false);
    }
  };

  // ----------------------------------------------------------------------
  // STATUS CHECKS
  // ----------------------------------------------------------------------
  // These small checks look at the status of the form to decide if we should 
  // lock certain boxes or show specific signature areas.
  // ----------------------------------------------------------------------
  const isApprovedStatus = ['Approved', 'Released', 'Completed'].includes(localData.status);
  const isReleasedStatus = ['Released', 'Completed'].includes(localData.status);
  const isFormLocked = isApprovedStatus || ['Void', 'Cancelled'].includes(localData.status);

  // ----------------------------------------------------------------------
  // VISUAL RENDER
  // ----------------------------------------------------------------------
  // This giant block of code builds the actual user interface on the screen.
  // It handles the black background, the white popup box, the header, the form
  // fields, the data table, the signature sections, and the action buttons at the bottom.
  // ----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white text-stone-900 w-full max-w-7xl my-auto shadow-2xl flex flex-col font-serif rounded-lg border border-stone-300">
        
        {/* Top Header Bar showing the Requisition ID and Close Button */}
        <div className="bg-stone-50 p-4 flex justify-between items-center sticky top-0 border-b border-stone-200 font-sans z-10 rounded-t-lg no-print">
          <div className="flex items-center space-x-4">
            <h2 className="font-bold text-stone-600 uppercase tracking-widest text-xs">REQUISITION VIEW</h2>
            <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${localData.status === 'Void' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
              {localData.status}
            </span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-2 hover:bg-stone-100 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* The Main Scrollable Body containing the Form */}
        <div className="p-8 bg-stone-100 overflow-x-auto flex justify-center">
          
          {/* This specific container is the area that gets turned into the PDF */}
          <div ref={formRef} id="requisition-printable-content" className="bg-white p-[5mm] shadow-sm border border-stone-300 w-full flex-shrink-0 min-w-[850px]">
            <div className="border-[3px] border-black p-1">
              <div className="border-2 border-black">
                
                {/* School Logo and Document Headers */}
                <div className="flex justify-between items-start border-b-2 border-black p-4 bg-white">
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 flex items-center justify-center p-1 shrink-0">
                      {logoLoaded ? (
                        <img src={LOGO_URL} alt="CDM Logo" className="w-full h-full object-contain" crossOrigin="anonymous" onError={() => setLogoLoaded(false)} />
                      ) : (
                        <div className="text-[10px] font-bold text-stone-400 text-center uppercase tracking-tighter">CDM<br/>LOGO</div>
                      )}
                    </div>
                    <div className="flex flex-col py-1">
                      <h1 className="text-xl font-bold uppercase tracking-tight text-left mb-0.5 text-black">Colegio de Muntinlupa</h1>
                      <h2 className="text-3xl font-black uppercase tracking-normal text-left mb-1 text-black">Requisition Form</h2>
                      <p className="text-xs font-bold uppercase text-stone-600 text-left">Equipment, Supplies and Apparatus</p>
                    </div>
                  </div>
                  
                  {/* Official Document Codes Box */}
                  <div className="border-2 border-black text-[10px] w-72 shrink-0">
                    <div className="bg-black text-white p-1.5 font-bold text-center border-b-2 border-black uppercase">Document Code</div>
                    <div className="p-2 border-b-2 border-black font-mono text-center text-xs h-8 flex items-center justify-center font-bold text-black">{localData.id}</div>
                    <div className="grid grid-cols-3 text-[9px] font-bold text-black">
                      <div className="border-r-2 border-black p-1 flex flex-col justify-between h-10"><span>Effective Date</span><span className="font-normal text-center"></span></div>
                      <div className="border-r-2 border-black p-1 flex flex-col justify-between h-10"><span>Revision No.</span><span className="font-normal text-center">00</span></div>
                      <div className="p-1 flex flex-col justify-between h-10"><span>Revision Date</span><span className="font-normal text-center"></span></div>
                    </div>
                  </div>
                </div>

                {/* Personal Information Inputs (Name, Student Num, Purpose, etc.) */}
                <div className="grid grid-cols-2 border-b-2 border-black">
                  <div className="border-r-2 border-black flex flex-col h-full">
                    <DetailInput label="Name:" value={localData.studentName} onChange={(val) => handleFieldChange('studentName', val)} placeholder="Surname, Firstname M.I." disabled={isFormLocked} />
                    <DetailInput label="Student Number:" value={localData.studentNumber} onChange={(val) => handleFieldChange('studentNumber', val)} placeholder="Enter student number..." numericOnly={true} disabled={isFormLocked} />
                    <DetailInput label="Purpose:" value={localData.purpose} onChange={(val) => handleFieldChange('purpose', val)} placeholder="Enter purpose..." disabled={isFormLocked} />
                    <DetailInput label="Instructor/Adviser:" value={localData.instructor || ''} onChange={(val) => handleFieldChange('instructor', val)} placeholder="Enter instructor name..." disabled={isFormLocked} />
                  </div>
                  <div className="flex flex-col h-full">
                    <DetailInput label="Program & Section:" value={localData.programSection} onChange={(val) => handleFieldChange('programSection', val)} placeholder="Enter program/section..." disabled={isFormLocked} />
                    <DetailInput label="Course/Code:" value={localData.courseCode} onChange={(val) => handleFieldChange('courseCode', val)} placeholder="Enter course/code..." disabled={isFormLocked} />
                    <DetailInput label="Room:" value={localData.room} onChange={(val) => handleFieldChange('room', val)} placeholder="Enter room..." disabled={isFormLocked} />
                    <TimeSelectionInput label="Time of use:" value={localData.timeOfUse || ''} onChange={(val) => handleFieldChange('timeOfUse', val)} disabled={isFormLocked || !['Reserved', 'Draft'].includes(localData.status)} />
                  </div>
                </div>

                {/* The Inventory Table */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse border-b-2 border-black bg-white min-w-[650px]">
                    <thead>
                      <tr className="text-center text-xs font-bold bg-stone-200 text-black">
                        <th className="border-r-2 border-b-2 border-black py-2 px-2 w-[50%]">Equipment/Supplies/Apparatus</th>
                        <th className="border-r-2 border-b-2 border-black py-2 w-[10%]">Quantity</th>
                        <th className="border-r-2 border-b-2 border-black py-2 w-[10%]">Unit</th>
                        <th className="border-r-2 border-b-2 border-black py-2 w-[15%]">Date and Time Out</th>
                        <th className="border-b-2 border-black py-2 w-[15%]">Date and Time In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Loop through all 10 items and draw a row for each */}
                      {(localData.items || []).map((item, i) => {
                        const isItemValid = availableInventory.some(inv => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                        const isInvalidFeedback = item.name === 'Invalid Item';

                        return (
                        <tr key={i} className="h-8 text-xs font-bold group">
                          
                          {/* Item Name Text Box */}
                          <td className="border-r-2 border-b-2 border-black p-0 relative">
                            <input 
                              type="text"
                              disabled={isFormLocked}
                              className={`w-full h-full px-2 bg-transparent outline-none font-medium text-[10px] sm:text-[11px] text-center hover:bg-stone-50 focus:bg-orange-50 transition-colors cursor-text placeholder:text-stone-300 placeholder:italic placeholder:font-normal disabled:cursor-default ${isInvalidFeedback ? 'text-red-500 font-black' : 'text-black'}`}
                              style={{ fontFamily: 'Arial, sans-serif' }}
                              value={localData.items[i]?.name || ''} 
                              onChange={(e) => handleItemChange(i, 'name', e.target.value)}
                              onFocus={() => {
                                if (isInvalidFeedback) {
                                  handleItemChange(i, 'name', '');
                                  showSuggestions(i, '');
                                } else {
                                  showSuggestions(i, localData.items[i]?.name || '');
                                }
                              }}
                              onBlur={(e) => {
                                setTimeout(() => {
                                  setLocalData(prev => {
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
                                    const updated = { ...prev, items: newItems };
                                    if (onUpdate) onUpdate(updated); 
                                    return updated;
                                  });
                                }, 200);
                              }}
                              autoComplete="off"
                              placeholder={i === 0 ? "Search items in inventory..." : ""}
                            />
                            
                            {/* Suggestion Dropdown Box for this row */}
                            {activeSuggestionRow === i && (
                              <div ref={dropdownRef} className="absolute left-0 top-full mt-0 w-full min-w-[250px] bg-white border border-stone-300 shadow-2xl z-50 max-h-48 overflow-y-auto rounded-b-lg border-t-0 animate-in fade-in slide-in-from-top-1 duration-200 no-print">
                                {filteredSuggestions.length > 0 ? (
                                  filteredSuggestions.map((suggestion, sIdx) => (
                                    <button 
                                      key={sIdx} 
                                      type="button" 
                                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(i, suggestion); }} 
                                      disabled={!suggestion.isAvailableForThisRow}
                                      className={`w-full text-left px-4 py-3 transition-all flex justify-between items-center border-b last:border-0 border-stone-100 group/item ${
                                        suggestion.isAvailableForThisRow 
                                          ? 'hover:bg-orange-50 cursor-pointer' 
                                          : 'bg-red-50/50 cursor-not-allowed'
                                      }`}
                                    >
                                      <div className="flex flex-col pr-2">
                                        <span className={`text-[11px] font-black uppercase tracking-tight ${!suggestion.isAvailableForThisRow ? 'text-red-700/60' : 'text-stone-700'}`}>{suggestion.name}</span>
                                        <span className={`text-[9px] font-bold opacity-60 ${!suggestion.isAvailableForThisRow ? 'text-red-500/60' : 'text-stone-500'}`}>{suggestion.category}</span>
                                      </div>
                                      <div className="flex flex-col items-end shrink-0">
                                        {suggestion.isDuplicate ? (
                                          <span className="bg-red-600/60 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest">ADDED ABOVE</span>
                                        ) : suggestion.isAvailableForThisRow ? (
                                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 text-stone-500">Available: {suggestion.displayQty || suggestion.quantity}</span>
                                        ) : (
                                          <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest shadow-sm">OUT OF STOCK</span>
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
                          
                          {/* Quantity Box */}
                          <td className="border-r-2 border-b-2 border-black p-0 relative">
                            <input 
                              type="number" 
                              min="0" 
                              placeholder={localData.items[i]?.name ? "0" : ""}
                              disabled={isFormLocked || !isItemValid} 
                              className="w-full h-full text-center bg-transparent outline-none font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50 focus:bg-orange-50 transition-colors text-xs placeholder:text-stone-300 placeholder:italic placeholder:font-normal" 
                              style={{ fontFamily: 'Arial, sans-serif' }} 
                              value={localData.items[i]?.quantity === 0 ? '' : (localData.items[i]?.quantity || '')} 
                              onKeyDown={(e) => { if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault(); }} 
                              onChange={(e) => handleItemChange(i, 'quantity', e.target.value)} 
                            />
                          </td>
                          
                          {/* Unit Box (Read Only) */}
                          <td className="border-r-2 border-b-2 border-black p-0 bg-stone-50/50 relative">
                            <input 
                              type="text" 
                              readOnly
                              disabled={isFormLocked || !isItemValid} 
                              className="w-full h-full text-center bg-transparent outline-none font-medium text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs cursor-default" 
                              style={{ fontFamily: 'Arial, sans-serif' }} 
                              value={localData.items[i]?.unit || ''} 
                              tabIndex={-1}
                            />
                          </td>

                          {/* Date Out and Date In Status Columns */}
                          <td className="border-r-2 border-b-2 border-black px-1 text-[9px] text-center font-medium text-black">{i === 0 && ['Released', 'Completed'].includes(localData.status) ? formatDateString(localData.dateOut) : ''}</td>
                          <td className="border-b-2 border-black px-1 text-[9px] text-center font-medium text-black">{i === 0 && localData.status === 'Completed' ? formatDateString(localData.dateIn) : ''}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Signature Blocks */}
                <div className="grid grid-cols-4 text-[8px] bg-white">
                  <SignatureBlock label="Requested by:" title="Student/Instructor" signed={isApprovedStatus} name={localData.studentName} />
                  <SignatureBlock label="Endorsed by:" title="Instructor/Adviser" signed={isApprovedStatus} name={localData.instructor} />
                  <SignatureBlock label="Released by:" title="Laboratory Technician" signed={isReleasedStatus} name="CSR Personnel" />
                  <SignatureBlock label="Approved by:" title="Lab. Head/Prog. Chair" signed={isApprovedStatus} name="Engr. John Daniel Salbon" className="border-r-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Area (Print, Approve, Release, Void) */}
        <div className="p-6 bg-stone-50 border-t border-stone-200 flex flex-wrap gap-3 font-sans rounded-b-lg no-print items-center">
          
          <button onClick={downloadPDF} disabled={isDownloading} className="bg-stone-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-stone-900 transition-all flex items-center space-x-2 shadow-md disabled:opacity-50">
            {isDownloading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Reports />}
            <span>{isDownloading ? 'Processing...' : 'Print PDF'}</span>
          </button>

          {(localData.status === 'Reserved' || localData.status === 'Endorsed' || localData.status === 'Pending') && (
            <button onClick={() => onAction('approve')} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md">Approve Requisition</button>
          )}

          {localData.status === 'Approved' && (
            <div className="flex gap-2">
              <button onClick={() => onAction('release')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md">Release Equipment</button>
              <button onClick={() => onAction('undo_approve')} className="bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-bold hover:bg-stone-300 transition-all border border-stone-300 flex items-center gap-1.5" title="Undo Approval">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                <span>Undo Approval</span>
              </button>
            </div>
          )}

          {localData.status === 'Released' && (
            <div className="flex gap-2">
              <button onClick={() => onAction('complete')} className="bg-stone-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-stone-900 transition-all shadow-md">Complete Return</button>
              <button onClick={() => onAction('undo_release')} className="bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-bold hover:bg-stone-300 transition-all border border-stone-300 flex items-center gap-1.5" title="Undo Release">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                <span>Undo Release</span>
              </button>
            </div>
          )}
          
          {localData.status === 'Completed' && (
             <div className="flex gap-2 ml-auto">
               <button onClick={() => onAction('undo_complete')} className="bg-stone-200 text-stone-700 px-6 py-2.5 rounded-xl font-bold hover:bg-stone-300 transition-all border border-stone-300 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                 <span>Undo Return</span>
               </button>
             </div>
          )}
          
          {localData.status !== 'Completed' && localData.status !== 'Void' && localData.status !== 'Cancelled' && (
            <button onClick={() => onAction('void')} className="text-red-600 px-4 py-2 font-bold hover:underline ml-auto">Void</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: Time Selection Input
// ============================================================================
// This draws the small dropdown boxes where users pick what time they need 
// the items. It automatically figures out what times are available based on 
// the current time of day.
// ============================================================================
const TimeSelectionInput: React.FC<{ label: string, value: string, onChange: (val: string) => void, disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => {
  // Build a list of all possible times between 6 AM and 9 PM
  const allTimeOptions = [];
  for (let hour = 6; hour <= 21; hour++) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    
    // Add the top of the hour (e.g., 1:00)
    const time1 = `${displayHour}:00 ${ampm}`;
    allTimeOptions.push(time1);
    
    // Add the bottom of the hour (e.g., 1:30)
    if (hour < 21) {
      const time2 = `${displayHour}:30 ${ampm}`;
      allTimeOptions.push(time2);
    }
  }

  // Helper tool to turn a text time into pure minutes so we can do math with it
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [time, ampm] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Figure out what time it is right now
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = currentHour * 60 + now.getMinutes();

  // If it is too late at night, tell the user the lab is closed
  if (currentHour >= 21 || currentHour < 6) {
    return (
      <div className="flex text-[10px] sm:text-xs items-stretch h-full min-h-[2.5rem] border-b-2 border-black last:border-b-0 bg-white">
        <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black">
          <span className="leading-tight py-1 text-black">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-start px-2 text-red-500 font-bold italic text-[9px] sm:text-[10px]">
          No available times (after 9:00 PM)
        </div>
      </div>
    );
  }

  // Figure out the next available 30-minute block of time
  let nextSlotMinutes = Math.ceil(currentMinutes / 30) * 30;
  if (currentMinutes % 30 === 0) nextSlotMinutes = currentMinutes;

  // Filter the list to only show times that haven't passed yet
  const validStartOptions = allTimeOptions.filter(t => {
    const minutes = timeToMinutes(t);
    return minutes >= nextSlotMinutes && minutes <= 1260; // 1260 = 9:00 PM
  });

  // Split the user's choice into a 'start' and an 'end' time
  const parts = value.split(' - ');
  const start = parts[0] || '';
  const end = parts[1] || '';
  const startMinutes = timeToMinutes(start);

  // The end time obviously has to be after the start time, so filter that too
  const validEndOptions = allTimeOptions.filter(t => {
    const minutes = timeToMinutes(t);
    return minutes > startMinutes && minutes <= 1260;
  });

  // If the day is over but its not quite 9:00 PM yet
  if (validStartOptions.length === 0) {
    return (
      <div className="flex text-[10px] sm:text-xs items-stretch h-full min-h-[2.5rem] border-b-2 border-black last:border-b-0 bg-white">
        <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black">
          <span className="leading-tight py-1 text-black">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-start px-2 text-red-500 font-bold italic text-[9px] sm:text-[10px]">
          No available times (after 9:00 PM)
        </div>
      </div>
    );
  }

  // Draw the actual start and end dropdown boxes
  return (
    <div className="flex text-[10px] sm:text-xs items-stretch h-full min-h-[2.5rem] border-b-2 border-black last:border-b-0 bg-white">
      <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black">
        <span className="leading-tight py-1 text-black">{label}</span>
      </div>
      <div className="flex-1 flex items-center justify-start px-2 py-1">
        <div className="flex items-center space-x-1 sm:space-x-2 w-full max-w-[200px]">
          <div className="flex-1 border border-stone-300 rounded px-0.5 sm:px-1 bg-stone-50 h-[26px] flex items-center">
            <select
              disabled={disabled}
              className={`bg-transparent border-none outline-none font-bold w-full text-center appearance-none cursor-pointer text-[9px] sm:text-[10px] text-black ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{ fontFamily: 'Arial, sans-serif' }}
              value={start}
              onChange={(e) => {
                // When they pick a start time, reset the end time if it conflicts
                const newStart = e.target.value;
                const newStartMin = timeToMinutes(newStart);
                const currentEndMin = timeToMinutes(end);
                let newEnd = end;
                if (currentEndMin <= newStartMin) {
                  newEnd = '';
                }
                onChange(`${newStart} - ${newEnd}`);
              }}
            >
              <option value="" disabled className="not-italic font-normal">Start</option>
              {validStartOptions.map(t => (
                <option key={t} value={t} className="not-italic font-normal">{t}</option>
              ))}
            </select>
          </div>
          <span className="font-bold text-stone-500 text-[8px] sm:text-[9px]">to</span>
          <div className={`flex-1 border border-stone-300 rounded px-0.5 sm:px-1 bg-stone-50 h-[26px] flex items-center ${disabled || !start ? 'opacity-70' : ''}`}>
            <select
              disabled={disabled || !start}
              className={`bg-transparent border-none outline-none font-bold w-full text-center appearance-none cursor-pointer text-[9px] sm:text-[10px] text-black ${disabled || !start ? 'cursor-not-allowed' : ''}`}
              style={{ fontFamily: 'Arial, sans-serif' }}
              value={end}
              onChange={(e) => onChange(`${start} - ${e.target.value}`)}
            >
              <option value="" disabled className="not-italic font-normal">End</option>
              {validEndOptions.map(t => (
                <option key={t} value={t} className="not-italic font-normal">{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// SUB-COMPONENT: Detail Input
// ----------------------------------------------------------------------
// A simple reusable box for standard text typing (like Name, Room, etc). 
// It has a toggle to force the user to only type numbers if needed.
// ----------------------------------------------------------------------
const DetailInput: React.FC<{ 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  numericOnly?: boolean,
  disabled?: boolean
}> = ({ label, value, onChange, placeholder, numericOnly, disabled }) => (
  <div className="flex text-[10px] sm:text-xs items-stretch h-full min-h-[2.5rem] border-b-2 border-black last:border-b-0 bg-white">
    <div className="w-[110px] md:w-36 shrink-0 flex items-center pr-2 font-bold pl-2 sm:pl-2.5 border-r-2 border-black">
      <span className="leading-tight py-1 text-black">{label}</span>
    </div>
    <div className="flex-1 flex items-center">
      <input 
        disabled={disabled}
        className="block w-full h-full bg-transparent border-none outline-none font-bold px-2 placeholder:text-stone-300 placeholder:font-normal placeholder:italic py-2 text-left text-black disabled:opacity-75 disabled:cursor-not-allowed"
        style={{ fontFamily: 'Arial, sans-serif' }}
        value={value} 
        onChange={(e) => {
          // If we only want numbers (like for student IDs), filter out any letters typed
          if (numericOnly) {
            const val = e.target.value.replace(/[^0-9]/g, '');
            onChange(val);
          } else {
            onChange(e.target.value);
          }
        }} 
        placeholder={placeholder}
        inputMode={numericOnly ? "numeric" : undefined}
      />
    </div>
  </div>
);

// ----------------------------------------------------------------------
// SUB-COMPONENT: Signature Block
// ----------------------------------------------------------------------
// This draws the boxes at the very bottom of the document where people sign.
// If the form has been approved digitally, it stamps a "DIGITALLY SIGNED" label.
// ----------------------------------------------------------------------
const SignatureBlock: React.FC<{ label: string, title: string, signed: boolean, name?: string, className?: string }> = ({ label, title, signed, name, className }) => (
  <div className={`flex flex-col h-28 border-r-2 border-black last:border-r-0 p-2 text-left bg-white ${className || ''}`}>
    <p className="font-bold text-[9px] sm:text-[10px] text-black">{label}</p>
    <div className="mt-auto flex flex-col items-center w-full px-2">
      <div className="w-full border-b-2 border-black text-center pb-1 min-h-[24px] flex items-end justify-center relative">
         
         {/* Show the printed name, or the digital signature text */}
         {name ? (
            <span className="font-bold text-[10px] sm:text-[11px] uppercase text-black">{name}</span>
         ) : signed ? (
            <span className="font-serif italic text-stone-500 uppercase text-[8px] sm:text-[10px]">DIGITALLY SIGNED</span>
         ) : null}

      </div>
      <p className="font-bold mt-1 uppercase text-[8px] sm:text-[9px] text-black text-center">{title}</p>
      
      <div className="flex items-center justify-start mt-2 w-full">
        <span className="font-bold mr-1 text-[8px] sm:text-[9px] text-black">Date:</span>
        <div className="flex-1 border-b-2 border-black h-3"></div>
      </div>
    </div>
  </div>
);

export default RequisitionFormView;