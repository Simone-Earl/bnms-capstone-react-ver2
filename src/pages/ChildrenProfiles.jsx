// src/pages/ChildrenProfiles.jsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import RegisterModal from '../components/modals/RegisterModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import EditChildModal from '../components/modals/EditChildModal';
import ViewChildModal from '../components/modals/ViewChildModal';

export default function ChildrenProfiles() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [toastMessage, setToastMessage] = useState({ show: false, text: "" });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, childId: null });
  const [editingChild, setEditingChild] = useState(null);
  const [viewingChild, setViewingChild] = useState(null);

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const showToast = (message) => {
    setToastMessage({ show: true, text: message });
    setTimeout(() => setToastMessage({ show: false, text: "" }), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, "children"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChildren(childrenData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching children: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const promptDeleteChild = (childId) => setConfirmDialog({ isOpen: true, childId });

  const executeDeleteChild = async () => {
    if (confirmDialog.childId) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "children", confirmDialog.childId));

        const recordsQuery = query(collection(db, "anthropometric_records"), where("child_id", "==", confirmDialog.childId));
        const recordsSnapshot = await getDocs(recordsQuery);

        for (const recordDoc of recordsSnapshot.docs) {
          batch.delete(recordDoc.ref);
          const classQuery = query(collection(db, "nutrition_classifications"), where("record_id", "==", recordDoc.id));
          const classSnapshot = await getDocs(classQuery);
          classSnapshot.forEach((classDoc) => batch.delete(classDoc.ref));
        }

        await batch.commit();
        showToast("Child profile deleted successfully.");
      } catch (error) {
        console.error("Error deleting child:", error);
        alert("Failed to delete child profile.");
      }
    }
    setConfirmDialog({ isOpen: false, childId: null });
  };

  const filteredChildren = children.filter(child => {
    const fullName = `${child.first_name || ''} ${child.last_name || ''}`.toLowerCase();
    const displayIdString = child.display_id || child.id;
    return fullName.includes(searchTerm.toLowerCase()) || displayIdString.includes(searchTerm);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Normal": return "bg-brand_green/20 text-brand_green border-brand_green/30";
      case "Stunted": return "bg-gold/20 text-ink border-gold/30";
      case "Severely Wasted": 
      case "Wasted": return "bg-maroon_light/20 text-maroon border-maroon_light/30";
      case "Overweight": return "bg-gold/40 text-ink border-gold/50";
      case "Unassessed": return "bg-line/50 text-muted border-line";
      default: return "bg-line text-ink border-line";
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case "Normal": return "bg-brand_green";
      case "Stunted": return "bg-gold";
      case "Severely Wasted": 
      case "Wasted": return "bg-maroon_light";
      case "Overweight": return "bg-gold";
      case "Unassessed": return "bg-muted";
      default: return "bg-muted";
    }
  };

  // 🔥 NEW: Human-readable age formatter
  const formatAge = (months) => {
    if (months === undefined || months === null || isNaN(months)) return '-';
    if (months < 12) return `${months} mo (Infant)`;
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    return `${yrs} yr${yrs > 1 ? 's' : ''}${mos > 0 ? ` ${mos} mo` : ''}`;
  };

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}

      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-cream p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">Registered Children</h2>
              <p className="text-sm text-muted">Manage and view profiles of all children currently monitored.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="fa-solid fa-magnifying-glass text-muted"></i>
                </span>
                <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-line rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper shadow-sm text-ink"/>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-maroon hover:bg-maroon_dark text-paper px-4 py-2 rounded-lg font-medium text-sm flex items-center transition shadow-sm justify-center flex-shrink-0">
                <i className="fa-solid fa-user-plus mr-2"></i> Register Child
              </button>
            </div>
          </div>

          <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                <thead>
                  <tr className="bg-maroon text-paper text-xs uppercase tracking-wider border-b border-line">
                    <th className="px-6 py-4 font-semibold">Child ID</th>
                    <th className="px-6 py-4 font-semibold">Full Name</th>
                    {/* Changed Table Header */}
                    <th className="px-6 py-4 font-semibold text-center">Age</th>
                    <th className="px-6 py-4 font-semibold text-center">Sex</th>
                    <th className="px-6 py-4 font-semibold">Purok</th>
                    <th className="px-6 py-4 font-semibold">Current Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-ink divide-y divide-line">
                  {loading ? (
                    <tr><td colSpan="7" className="px-6 py-10 text-center text-muted"><i className="fa-solid fa-spinner fa-spin text-2xl mb-3"></i><p>Loading database...</p></td></tr>
                  ) : filteredChildren.length > 0 ? (
                    filteredChildren.map((child) => (
                      <tr key={child.id} className="hover:bg-cream transition">
                        <td className="px-6 py-4 font-mono text-xs text-muted truncate max-w-[100px]">#{child.display_id || child.id.substring(0, 6).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium">{child.first_name} {child.last_name}</td>
                        {/* Applied Formatter */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">{formatAge(child.current_age_mo)}</td>
                        <td className="px-6 py-4 text-center">{child.sex || '-'}</td>
                        <td className="px-6 py-4 text-muted">Purok {child.purok || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(child.current_status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shadow-sm ${getStatusDot(child.current_status)}`}></span>
                            {child.current_status || 'Unassessed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-3 items-center">
                            <button onClick={() => setEditingChild(child)} className="text-muted hover:text-maroon transition p-1" title="Edit Profile">
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button onClick={() => promptDeleteChild(child.id)} className="text-muted hover:text-maroon_light transition p-1" title="Delete Profile">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                            <button onClick={() => setViewingChild(child)} className="text-muted hover:text-maroon transition p-1" title="View Profile">
                              <i className="fa-solid fa-chevron-right"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="px-6 py-10 text-center text-muted"><i className="fa-solid fa-magnifying-glass text-3xl mb-3 text-line"></i><p>{children.length === 0 ? "No children registered yet." : "No children found."}</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-line flex flex-col sm:flex-row items-center justify-between bg-cream">
              <p className="text-sm text-muted mb-4 sm:mb-0">Showing <span className="font-medium text-ink">{filteredChildren.length > 0 ? 1 : 0}</span> to <span className="font-medium text-ink">{filteredChildren.length}</span> of <span className="font-medium text-ink">{children.length}</span> results</p>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && <RegisterModal onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); showToast("Child profile registered successfully."); }} />}
      {editingChild && <EditChildModal child={editingChild} onClose={() => setEditingChild(null)} onSave={() => { setEditingChild(null); showToast("Child profile updated successfully."); }} />}
      {viewingChild && <ViewChildModal child={viewingChild} onClose={() => setViewingChild(null)} />}

      <ConfirmModal 
        isOpen={confirmDialog.isOpen}
        title="Delete Child Profile"
        message="Are you sure you want to delete this child's profile? This action cannot be undone and will permanently remove their records."
        confirmText="Delete Profile"
        onConfirm={executeDeleteChild}
        onCancel={() => setConfirmDialog({ isOpen: false, childId: null })}
      />

      <div className={`fixed bottom-5 right-5 bg-ink text-paper px-5 py-3 rounded-lg shadow-xl flex items-center transform transition-all duration-300 z-50 ${toastMessage.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-brand_green rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0"><i className="fa-solid fa-check text-xs"></i></div>
        <p className="text-sm font-medium">{toastMessage.text}</p>
      </div>
    </div>
  );
}