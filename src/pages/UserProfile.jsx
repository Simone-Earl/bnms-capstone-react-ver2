// src/pages/UserProfile.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function UserProfile() {
  const { currentUser, userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: ''
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const openEditModal = () => {
    setEditForm({
      fullName: userProfile?.full_name || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        full_name: editForm.fullName,
        phone: editForm.phone,
        address: editForm.address
      });
      
      setIsEditModalOpen(false);
      window.location.reload(); 
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getJoinedDate = () => {
    if (userProfile?.created_at?.toDate) {
      const date = userProfile.created_at.toDate();
      return `Joined ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    }
    return "Joined Recently";
  };

  const isWorker = userProfile?.role === 'worker';

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}

      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <div className="bg-paper rounded-2xl shadow-sm border border-line overflow-hidden relative">
                <div className="h-32 bg-gradient-to-r from-maroon to-maroon_dark w-full relative">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-paper opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="absolute right-20 top-10 w-16 h-16 bg-gold opacity-20 rounded-full"></div>
                </div>
                
                <div className="px-6 sm:px-8 pb-8 relative">
                    <div className="flex justify-between items-end -mt-12 mb-4">
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-paper shadow-md bg-cream flex items-center justify-center text-maroon text-4xl font-bold transition-all duration-300">
                                {getInitials(userProfile?.full_name)}
                            </div>
                            <button className="absolute bottom-0 right-0 bg-cream hover:bg-line text-ink rounded-full w-8 h-8 flex items-center justify-center border border-paper shadow-sm transition-colors">
                                <i className="fa-solid fa-camera text-xs"></i>
                            </button>
                        </div>
                        <button 
                          onClick={openEditModal}
                          className="bg-paper border border-line text-ink hover:bg-cream hover:text-maroon px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                        >
                            <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Profile
                        </button>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-ink transition-all duration-300">
                          {userProfile?.full_name || 'Loading...'}
                        </h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-y-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${isWorker ? 'bg-gold/20 text-gold border-gold/30' : 'bg-brand_green/20 text-brand_green border-brand_green/30'}`}>
                                <i className={`fa-solid ${isWorker ? 'fa-stethoscope' : 'fa-house-chimney-user'} mr-1.5`}></i> 
                                {isWorker ? 'BNS / RHU Worker' : 'Parent / Guardian'}
                            </span>
                            <span className="mx-3 text-muted/50 hidden sm:inline">|</span>
                            <span className="text-sm text-muted">
                              <i className="fa-regular fa-calendar mr-1"></i> {getJoinedDate()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-paper rounded-2xl shadow-sm border border-line p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-ink mb-6 flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-maroon_light/10 text-maroon flex items-center justify-center mr-3">
                            <i className="fa-regular fa-address-card"></i>
                        </div>
                        Personal Information
                    </h3>
                    
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Email Address</p>
                            <p className="text-base text-ink font-medium">{currentUser?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Phone Number</p>
                            <p className="text-base text-ink font-medium">{userProfile?.phone || '(Update in Edit Profile)'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Home Address</p>
                            <p className="text-base text-ink font-medium">{userProfile?.address || '(Update in Edit Profile)'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-paper rounded-2xl shadow-sm border border-line p-6 sm:p-8 h-full">
                    <h3 className="text-lg font-bold text-ink mb-6 flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors duration-300 ${isWorker ? 'bg-maroon_light/10 text-maroon' : 'bg-brand_green/10 text-brand_green'}`}>
                            <i className={`fa-solid ${isWorker ? 'fa-briefcase-medical' : 'fa-children'}`}></i>
                        </div>
                        <span>{isWorker ? 'Professional Details' : 'Household & Children'}</span>
                    </h3>
                    
                    <div className="space-y-5">
                        {isWorker ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Employee ID</p>
                                    <p className="text-sm text-ink font-medium font-mono truncate bg-cream p-1.5 rounded uppercase">
                                      {userProfile?.employee_id || currentUser?.uid.substring(0,8)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Assigned Area</p>
                                    <p className="text-base text-ink font-medium">Epza Pulung Cacutud</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-line">
                                <p className="text-sm font-medium text-muted mb-2">System Permissions</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-cream border border-line text-ink px-3 py-1 rounded-md text-xs font-semibold">Write Access</span>
                                    <span className="bg-cream border border-line text-ink px-3 py-1 rounded-md text-xs font-semibold">Generate Reports</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-line">
                                <div className="bg-brand_green/10 rounded-xl p-4 border border-brand_green/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-brand_green">System Status</p>
                                        <p className="text-xs text-brand_green/80 mt-0.5">Account is active and verified</p>
                                    </div>
                                    <div className="text-2xl font-black text-brand_green"><i className="fa-solid fa-check-circle"></i></div>
                                </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Household ID</p>
                                    <p className="text-sm text-ink font-medium font-mono truncate bg-cream p-1.5 rounded uppercase">
                                        {userProfile?.household_id || currentUser?.uid.substring(0,8)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Caregiver Role</p>
                                    <p className="text-base text-ink font-medium">Primary</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-line">
                                <p className="text-sm font-medium text-muted mb-2">Registered Children (Demo)</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-line hover:border-maroon/30 hover:bg-maroon_light/5 transition-colors group cursor-pointer">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-xs font-bold text-muted mr-3 group-hover:bg-maroon/10 group-hover:text-maroon">MT</div>
                                            <div>
                                                <p className="text-sm font-bold text-ink">Miguel Torres</p>
                                                <p className="text-xs text-muted">48 Months • Male</p>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-muted group-hover:text-maroon text-xs"></i>
                                    </div>
                                </div>
                            </div>
                          </>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300">
            <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden transform transition-transform duration-300 border-t-8 border-maroon">
                <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-cream/50">
                    <h3 className="text-lg font-bold text-ink flex items-center">
                        <i className="fa-solid fa-pen-to-square text-maroon mr-2"></i> Edit Profile
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="text-muted hover:text-ink hover:bg-line/50 rounded-full w-8 h-8 flex items-center justify-center transition focus:outline-none">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="px-6 py-5">
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
                                <input 
                                  type="text" 
                                  value={editForm.fullName} 
                                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                                  required 
                                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
                                <input type="email" defaultValue={currentUser?.email} readOnly className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none transition bg-line/30 text-muted cursor-not-allowed" title="Email cannot be changed here" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Phone Number</label>
                                <input 
                                  type="tel" 
                                  value={editForm.phone}
                                  onChange={(e) => setEditForm({...editForm, phone: e.target.value.replace(/\D/g, '')})}
                                  placeholder="09113334444"
                                  maxLength="11"
                                  pattern="09[0-9]{9}"
                                  title="Please enter a valid 11-digit Philippine mobile number starting with 09"
                                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Home Address</label>
                                <textarea 
                                  rows="2" 
                                  value={editForm.address}
                                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                  placeholder="Enter complete address"
                                  className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink resize-none"
                                ></textarea>
                            </div>
                        </div>
                        
                        <div className="mt-8 flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink bg-paper hover:bg-cream focus:outline-none transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-maroon hover:bg-maroon_dark text-paper rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon transition shadow-sm flex items-center disabled:opacity-50">
                                {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk mr-2"></i> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}