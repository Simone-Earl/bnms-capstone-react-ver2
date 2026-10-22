// src/pages/AdminPanel.jsx
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // States for Access Management Generator
  const [generatedCode, setGeneratedCode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateConfirm, setGenerateConfirm] = useState({ isOpen: false, type: null });

  // States for System Users Table
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' });
  const [toastMessage, setToastMessage] = useState({ show: false, title: "", message: "", type: "success" });

  const rowsPerPage = 5;
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const isWorker = userProfile?.role === 'worker';

  // Fetch Users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      if (isWorker) {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort by newest first
          usersData.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
          setUsers(usersData);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoadingUsers(false);
        }
      }
    };
    fetchUsers();
  }, [isWorker]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ show: true, title, message, type });
    setTimeout(() => setToastMessage({ show: false, title: "", message: "", type: "success" }), 3500);
  };

  // Execute Code Generation
  const executeGenerateCode = async () => {
    if (!generateConfirm.type) return;

    setIsGenerating(true);
    setGeneratedCode(null);
    const typeToGenerate = generateConfirm.type;
    setGenerateConfirm({ isOpen: false, type: null });

    try {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCode = typeToGenerate === 'worker' ? `BNS-${randomString}` : `HH-${randomString}`;
      const collectionName = typeToGenerate === 'worker' ? 'worker_invites' : 'household_invites';

      await setDoc(doc(db, collectionName, newCode), {
        is_used: false,
        created_by: currentUser.uid,
        created_at: serverTimestamp()
      });

      setGeneratedCode({ type: typeToGenerate, code: newCode });
      showToast(`${typeToGenerate === 'worker' ? 'BNS' : 'Household'} Code Generated`, `The access code is ready to be copied.`, 'success');
    } catch (error) {
      console.error("Error generating code:", error);
      alert("Failed to generate access code. Check console permissions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode.code);
      showToast('Copied to Clipboard', `Code: ${generatedCode.code} copied successfully.`, 'success');
    }
  };

  // Execute User Deletion
  const executeDeleteUser = async () => {
    if (!deleteConfirm.userId) return;
    
    try {
      // Delete user document from Firestore (Note: Firebase Auth deletion requires Admin SDK on a backend, so this restricts their app access)
      await deleteDoc(doc(db, "users", deleteConfirm.userId));
      setUsers(users.filter(u => u.id !== deleteConfirm.userId));
      showToast('User Deleted', `${deleteConfirm.userName}'s profile has been removed.`, 'error');
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user profile.");
    } finally {
      setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(users.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentUsers = users.slice(startIndex, startIndex + rowsPerPage);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return 'N/A';
  };

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F7F6F1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7C1A35; }
      `}</style>

      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            
            <h2 className="text-2xl font-bold text-ink mb-6">Admin Panel</h2>

            {isWorker ? (
              <>
                {/* --- ACCESS MANAGEMENT CARD --- */}
                <div className="bg-paper rounded-xl shadow-sm border border-line mb-8 overflow-hidden">
                  <div className="p-5 sm:p-6 border-b border-line">
                    <h3 className="text-lg font-bold text-ink flex items-center mb-1">
                        <i className="fa-solid fa-key text-gold mr-2"></i>
                        Access Management
                    </h3>
                    <p className="text-sm text-muted">Generate secure registration codes for new parents and workers.</p>
                  </div>

                  <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 bg-cream/50">
                    <div 
                      onClick={() => setGenerateConfirm({ isOpen: true, type: 'parent' })}
                      className="bg-brand_green/5 border border-brand_green/20 hover:border-brand_green/50 hover:shadow-md cursor-pointer rounded-lg p-5 flex items-start transition-all duration-200 group"
                    >
                        <div className="bg-brand_green/20 text-brand_green w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-house-chimney"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-ink mb-0.5 group-hover:text-brand_green transition-colors">New Household</h4>
                            <p className="text-xs text-muted">Generate a code for a Parent</p>
                        </div>
                    </div>

                    <div 
                      onClick={() => setGenerateConfirm({ isOpen: true, type: 'worker' })}
                      className="bg-maroon_light/5 border border-maroon_light/20 hover:border-maroon_light/50 hover:shadow-md cursor-pointer rounded-lg p-5 flex items-start transition-all duration-200 group"
                    >
                        <div className="bg-maroon_light/20 text-maroon w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-user-nurse"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-ink mb-0.5 group-hover:text-maroon transition-colors">New BNS Worker</h4>
                            <p className="text-xs text-muted">Generate a code for Health Staff</p>
                        </div>
                    </div>
                  </div>

                  {generatedCode && (
                    <div className="p-5 sm:p-6 border-t border-line bg-paper animate-fade-in flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-muted uppercase tracking-wider">Generated {generatedCode.type === 'worker' ? 'Employee ID' : 'Household ID'}</p>
                          <p className="text-2xl font-mono font-bold text-ink tracking-widest mt-1">{generatedCode.code}</p>
                        </div>
                        <button onClick={copyToClipboard} className="bg-cream border border-line hover:bg-line px-4 py-2 rounded shadow-sm text-ink transition">
                          <i className="fa-regular fa-copy"></i> Copy
                        </button>
                    </div>
                  )}
                </div>

                {/* --- SYSTEM USERS LIST --- */}
                <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden flex flex-col mb-8">
                  <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row justify-between items-start sm:items-center bg-paper gap-4">
                      <div>
                          <h3 className="text-lg font-bold text-ink flex items-center mb-1">
                              <i className="fa-solid fa-users-gear text-maroon mr-2"></i>
                              System Users
                          </h3>
                          <p className="text-sm text-muted">Manage all registered accounts within the system.</p>
                      </div>
                  </div>
                  
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                          <thead>
                              <tr className="bg-cream text-muted text-xs uppercase tracking-wider border-b border-line">
                                  <th className="px-6 py-4 font-semibold">User Details</th>
                                  <th className="px-6 py-4 font-semibold">Role</th>
                                  <th className="px-6 py-4 font-semibold">Location</th>
                                  <th className="px-6 py-4 font-semibold text-center">Date Joined</th>
                                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="text-sm text-ink divide-y divide-line">
                              {loadingUsers ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Fetching users...</td></tr>
                              ) : currentUsers.length > 0 ? (
                                currentUsers.map(user => (
                                  <tr key={user.id} className="hover:bg-cream/80 transition-colors group">
                                      <td className="px-6 py-3">
                                          <div className="flex items-center">
                                              <div className="w-9 h-9 rounded-full bg-line text-ink flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                                                  {getInitials(user.full_name)}
                                              </div>
                                              <div>
                                                  <p className="font-medium text-ink">{user.full_name}</p>
                                                  <p className="text-xs text-muted">{user.email}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-3">
                                        {user.role === 'parent' ? (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Parent</span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-maroon_light/10 text-maroon border border-maroon_light/20">BNS Worker</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3 text-muted">{user.address || 'Epza Pulung Cacutud'}</td>
                                      <td className="px-6 py-3 text-center text-muted text-sm">{formatDate(user.created_at)}</td>
                                      <td className="px-6 py-3 text-right">
                                          <button 
                                            onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id, userName: user.full_name })}
                                            className="text-maroon_light hover:text-paper border border-maroon_light/30 hover:bg-maroon_light hover:border-maroon_light px-3 py-1.5 rounded transition-all duration-200 text-xs font-medium shadow-sm flex items-center justify-end ml-auto"
                                          >
                                              <i className="fa-regular fa-trash-can mr-1.5"></i> Delete
                                          </button>
                                      </td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted">No users found in database.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  
                  {/* Pagination */}
                  {users.length > 0 && (
                    <div className="px-6 py-4 border-t border-line flex flex-col sm:flex-row items-center justify-between bg-cream">
                        <p className="text-sm text-muted mb-4 sm:mb-0">
                            Showing <span className="font-medium text-ink">{startIndex + 1}</span> to <span className="font-medium text-ink">{Math.min(startIndex + rowsPerPage, users.length)}</span> of <span className="font-medium text-ink">{users.length}</span> users
                        </p>
                        <div className="flex space-x-1">
                            <button 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                              disabled={currentPage === 1}
                              className={`px-3 py-1 border border-line rounded text-sm font-medium transition ${currentPage === 1 ? 'text-muted bg-cream cursor-not-allowed' : 'text-ink bg-paper hover:bg-cream'}`}
                            >Prev</button>
                            
                            {[...Array(totalPages)].map((_, i) => (
                              <button 
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 py-1 border rounded text-sm transition ${currentPage === i + 1 ? 'border-maroon bg-maroon text-paper font-bold shadow-sm' : 'border-line bg-paper text-ink hover:bg-cream font-medium'}`}
                              >
                                {i + 1}
                              </button>
                            ))}

                            <button 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                              disabled={currentPage === totalPages}
                              className={`px-3 py-1 border border-line rounded text-sm font-medium transition ${currentPage === totalPages ? 'text-muted bg-cream cursor-not-allowed' : 'text-ink bg-paper hover:bg-cream'}`}
                            >Next</button>
                        </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-maroon_light/10 border-l-4 border-maroon text-maroon p-6 rounded-lg flex items-center shadow-sm">
                <i className="fa-solid fa-ban text-3xl mr-4"></i>
                <div>
                  <h3 className="font-bold text-lg">Access Denied</h3>
                  <p className="text-sm">You do not have the required administrative permissions to view this page.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- CONFIRMATION MODALS --- */}
      <ConfirmModal 
        isOpen={generateConfirm.isOpen}
        title={generateConfirm.type === 'worker' ? "Generate Worker Access Code" : "Generate Household ID"}
        message={`Are you sure you want to generate a new secure registration code for a ${generateConfirm.type === 'worker' ? 'BNS Health Worker' : 'Parent / Household'}?`}
        confirmText="Generate Code"
        isDanger={false} 
        onConfirm={executeGenerateCode}
        onCancel={() => setGenerateConfirm({ isOpen: false, type: null })}
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete User Account"
        message={`Are you sure you want to delete ${deleteConfirm.userName}'s account? This will permanently remove their access to the system.`}
        confirmText="Delete User"
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteConfirm({ isOpen: false, userId: null, userName: '' })}
      />

      {/* Custom Toast Notification */}
      <div className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl shadow-2xl flex items-center transform transition-all duration-300 z-50 pointer-events-none border ${toastMessage.show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'} ${toastMessage.type === 'error' ? 'bg-paper border-maroon' : 'bg-ink border-line'}`}>
          <div className={`${toastMessage.type === 'error' ? 'bg-maroon' : 'bg-brand_green'} rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`}>
              <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-trash-can' : 'fa-check'} text-sm text-paper`}></i>
          </div>
          <div>
              <p className={`text-sm font-semibold mb-0.5 ${toastMessage.type === 'error' ? 'text-maroon' : 'text-paper'}`}>{toastMessage.title}</p>
              <p className={`text-xs ${toastMessage.type === 'error' ? 'text-ink' : 'text-paper/80'}`}>{toastMessage.message}</p>
          </div>
      </div>

    </div>
  );
}