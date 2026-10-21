// src/components/modals/EntryModal.jsx
import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { computeNutritionStatus } from '../../utils/whoCalculator';

export default function EntryModal({ onClose }) {
  const [formData, setFormData] = useState({
    childId: '',
    height: '',
    weight: '',
    muac: '',
    visitDate: new Date().toISOString().split('T')[0]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childrenList, setChildrenList] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // NEW STATES FOR THE SEARCHABLE DROPDOWN
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "children"), orderBy("first_name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChildren = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChildrenList(fetchedChildren);
      setLoadingChildren(false);
    }, (error) => {
      console.error("Error fetching children for dropdown: ", error);
      setLoadingChildren(false);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle standard number/date inputs
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Handle Search Input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(true);
    // Clear the selected childId if they start typing again so they don't submit mismatched data
    setFormData(prev => ({ ...prev, childId: '' })); 
  };

  // Handle clicking a child from the dropdown list
  const handleSelectChild = (child) => {
    setFormData(prev => ({ ...prev, childId: child.id }));
    setSearchQuery(`${child.first_name} ${child.last_name} (ID: #${child.display_id || child.id.substring(0, 6).toUpperCase()})`);
    setIsDropdownOpen(false);
  };

  // Filter children based on search query
  const filteredChildren = childrenList.filter(child => {
    const fullName = `${child.first_name || ''} ${child.last_name || ''}`.toLowerCase();
    const displayIdString = child.display_id || child.id;
    return fullName.includes(searchQuery.toLowerCase()) || displayIdString.includes(searchQuery);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedChild = childrenList.find(c => c.id === formData.childId);
      if (!selectedChild) {
        alert("Please select a valid child from the dropdown list.");
        setIsSubmitting(false);
        return; // Stop submission
      }

      let sex = selectedChild.sex === 'M' ? 'boys' : 'girls';
      let ageInMonths = 0; 

      if (selectedChild.dob) {
        const dobDate = new Date(selectedChild.dob);
        const visitDate = new Date(formData.visitDate);
        let months = (visitDate.getFullYear() - dobDate.getFullYear()) * 12;
        months -= dobDate.getMonth();
        months += visitDate.getMonth();
        if (visitDate.getDate() < dobDate.getDate()) months--;
        ageInMonths = months < 0 ? 0 : months;
      }

      const computedScores = computeNutritionStatus(
        ageInMonths, 
        sex, 
        parseFloat(formData.weight), 
        parseFloat(formData.height)
      );

      const recordDocRef = await addDoc(collection(db, "anthropometric_records"), {
        child_id: formData.childId,
        child_name: `${selectedChild.first_name} ${selectedChild.last_name}`,
        age_mo: ageInMonths,
        height_cm: parseFloat(formData.height),
        weight_kg: parseFloat(formData.weight),
        muac_cm: formData.muac ? parseFloat(formData.muac) : null,
        visit_date: formData.visitDate,
        classification_result: computedScores.classification_result,
        created_at: serverTimestamp()
      });

      await addDoc(collection(db, "nutrition_classifications"), {
        record_id: recordDocRef.id,
        haz: computedScores.haz,
        waz: computedScores.waz,
        whz_bmi: computedScores.whz_bmi,
        classification_result: computedScores.classification_result,
        created_at: serverTimestamp()
      });

      const childRef = doc(db, "children", formData.childId);
      await updateDoc(childRef, {
        current_status: computedScores.classification_result,
        current_age_mo: ageInMonths
      });

      alert(`Entry Saved! System classified status as: ${computedScores.classification_result}`);
      onClose(); 
    } catch (error) {
      console.error("Error saving record: ", error);
      alert("Error saving entry. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3a2c2c]/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-[#ffffff] rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden transform transition-all border-t-8 border-[#7a1330] overflow-visible">
        <div className="px-6 py-4 border-b border-[#d9cfc2] flex justify-between items-center bg-[#ffffff]">
          <h3 className="text-lg font-bold text-[#3a2c2c]">New Anthropometric Entry</h3>
          <button onClick={onClose} disabled={isSubmitting} className="text-[#8a7a72] hover:text-[#3a2c2c] transition focus:outline-none"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div className="px-6 py-5 bg-[#ffffff] overflow-visible">
          <form id="anthropometricForm" onSubmit={handleSubmit}>
            <div className="space-y-4">
              
              {/* SEARCHABLE CUSTOM DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <label htmlFor="childSearch" className="block text-sm font-medium text-[#3a2c2c] mb-1">Select Child</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <i className="fa-solid fa-magnifying-glass text-[#8a7a72] text-xs"></i>
                  </span>
                  <input 
                    type="text" 
                    id="childSearch" 
                    placeholder={loadingChildren ? "Loading children..." : "Type to search by name or ID..."}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    autoComplete="off"
                    required={!formData.childId} // Only requires typing if an ID isn't locked in
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 outline-none transition bg-[#ffffff] text-[#3a2c2c] ${formData.childId ? 'border-[#22c55e] focus:border-[#22c55e] focus:ring-[#22c55e]/30' : 'border-[#d9cfc2] focus:border-[#7a1330] focus:ring-[#7a1330]'}`}
                  />
                  {/* Show checkmark if successfully selected */}
                  {formData.childId && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#22c55e]">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </div>

                {/* DROPDOWN MENU */}
                {isDropdownOpen && (
                  <div className="absolute z-[70] w-full mt-1 bg-[#ffffff] border border-[#d9cfc2] rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredChildren.length > 0 ? (
                      <ul className="py-1 text-sm text-[#3a2c2c]">
                        {filteredChildren.map(child => (
                          <li 
                            key={child.id} 
                            onClick={() => handleSelectChild(child)}
                            className="px-3 py-2 hover:bg-[#faf6ee] hover:text-[#7a1330] cursor-pointer transition flex justify-between items-center"
                          >
                            <span className="font-medium">{child.first_name} {child.last_name}</span>
                            <span className="text-xs text-[#8a7a72]">#{child.display_id || child.id.substring(0, 6).toUpperCase()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-3 py-3 text-sm text-[#8a7a72] text-center">
                        No children found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-[#3a2c2c] mb-1">Height/Length</label>
                  <div className="relative">
                    <input type="number" id="height" step="0.1" placeholder="e.g. 85.5" value={formData.height} onChange={handleChange} required className="w-full border border-[#d9cfc2] rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-[#7a1330] focus:border-[#7a1330] outline-none transition text-[#3a2c2c] bg-[#ffffff]" />
                    <span className="absolute right-3 top-2 text-[#8a7a72] text-sm">cm</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-[#3a2c2c] mb-1">Weight</label>
                  <div className="relative">
                    <input type="number" id="weight" step="0.1" placeholder="e.g. 12.5" value={formData.weight} onChange={handleChange} required className="w-full border border-[#d9cfc2] rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-[#7a1330] focus:border-[#7a1330] outline-none transition text-[#3a2c2c] bg-[#ffffff]" />
                    <span className="absolute right-3 top-2 text-[#8a7a72] text-sm">kg</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="muac" className="block text-sm font-medium text-[#3a2c2c] mb-1">MUAC</label>
                <div className="relative">
                  <input type="number" id="muac" step="0.1" placeholder="e.g. 13.5" value={formData.muac} onChange={handleChange} required className="w-full border border-[#d9cfc2] rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-[#7a1330] focus:border-[#7a1330] outline-none transition text-[#3a2c2c] bg-[#ffffff]" />
                  <span className="absolute right-3 top-2 text-[#8a7a72] text-sm">cm</span>
                </div>
              </div>
              <div>
                <label htmlFor="visitDate" className="block text-sm font-medium text-[#3a2c2c] mb-1">Date of Visit</label>
                <input type="date" id="visitDate" value={formData.visitDate} onChange={handleChange} required className="w-full border border-[#d9cfc2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7a1330] focus:border-[#7a1330] outline-none transition text-[#3a2c2c] bg-[#ffffff]" />
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-[#d9cfc2] flex justify-end space-x-3 bg-[#faf6ee] -mx-6 -mb-5 px-6 py-4 rounded-b-xl">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-[#d9cfc2] rounded-lg text-sm font-medium text-[#3a2c2c] bg-[#ffffff] hover:bg-gray-50 transition focus:outline-none">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#7a1330] hover:bg-[#54001c] text-[#ffffff] rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50 focus:outline-none">
                {isSubmitting ? 'Saving...' : 'Calculate & Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}