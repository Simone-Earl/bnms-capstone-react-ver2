// src/components/modals/RegisterModal.jsx
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function RegisterModal({ onClose, onSave }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    sex: '',
    guardian: '',
    purok: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const generatedDisplayId = Math.floor(100000 + Math.random() * 900000).toString();

      // 🔥 FIX: Accurate initial age calculation
      let ageInMonths = 0;
      if (formData.dob) {
        const dobDate = new Date(formData.dob);
        const today = new Date();
        let months = (today.getFullYear() - dobDate.getFullYear()) * 12;
        months -= dobDate.getMonth();
        months += today.getMonth();
        if (today.getDate() < dobDate.getDate()) months--;
        ageInMonths = months < 0 ? 0 : months;
      }

      await addDoc(collection(db, "children"), {
        display_id: generatedDisplayId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dob,
        sex: formData.sex,
        guardian: formData.guardian,
        purok: formData.purok,
        current_status: 'Unassessed', 
        current_age_mo: ageInMonths, // Saves exact age!
        created_at: serverTimestamp()
      });

      onSave(); 
      
    } catch (error) {
      console.error("Error saving to database:", error);
      alert("Failed to register child. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex justify-center items-start pt-10 pb-10 sm:pt-20 px-4 overflow-y-auto">
      <div className="bg-paper rounded-xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden transform transition-all relative border-t-8 border-maroon">
        
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-ink">Register New Child</h3>
            <p className="text-xs text-muted mt-0.5">Enter demographics for the barangay database.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink hover:bg-cream rounded-full w-8 h-8 flex items-center justify-center transition focus:outline-none">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className="px-6 py-5 bg-paper">
          <form id="registrationForm" onSubmit={handleSubmit}>
            <h4 className="text-xs font-bold text-maroon uppercase tracking-wider mb-4 border-b border-line pb-2">
              <i className="fa-regular fa-id-card mr-1"></i> Child Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-ink mb-1">First Name <span className="text-maroon_light">*</span></label>
                <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required placeholder="e.g. Juan" className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-ink mb-1">Last Name <span className="text-maroon_light">*</span></label>
                <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required placeholder="e.g. Dela Cruz" className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink" />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-ink mb-1">Date of Birth <span className="text-maroon_light">*</span></label>
                <input type="date" id="dob" value={formData.dob} onChange={handleChange} required className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition text-ink bg-paper" />
              </div>
              <div>
                <label htmlFor="sex" className="block text-sm font-medium text-ink mb-1">Sex <span className="text-maroon_light">*</span></label>
                <select id="sex" value={formData.sex} onChange={handleChange} required className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink">
                  <option value="" disabled>Select sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            <h4 className="text-xs font-bold text-maroon uppercase tracking-wider mb-4 border-b border-line pb-2">
              <i className="fa-solid fa-house-user mr-1"></i> Household Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="guardian" className="block text-sm font-medium text-ink mb-1">Parent/Guardian Name <span className="text-maroon_light">*</span></label>
                <input type="text" id="guardian" value={formData.guardian} onChange={handleChange} required placeholder="Enter guardian's full name" className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink" />
              </div>
              <div>
                <label htmlFor="purok" className="block text-sm font-medium text-ink mb-1">Sitio / Purok <span className="text-maroon_light">*</span></label>
                <select id="purok" value={formData.purok} onChange={handleChange} required className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink">
                  <option value="" disabled>Select Purok</option>
                  <option value="1">Purok 1</option>
                  <option value="2">Purok 2</option>
                  <option value="3">Purok 3</option>
                  <option value="4">Purok 4</option>
                  <option value="5">Purok 5</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 bg-cream border-t border-line flex justify-end space-x-3 sticky bottom-0 rounded-b-xl -mx-6 -mb-5 px-6 pb-4">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink bg-paper hover:bg-cream focus:outline-none transition">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-maroon hover:bg-maroon_dark text-paper rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon transition shadow-sm flex items-center disabled:opacity-50">
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-check mr-2"></i>}
                Register Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}