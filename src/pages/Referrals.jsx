// src/pages/Referrals.jsx
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export default function Referrals() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Data States
  const [flaggedChildren, setFlaggedChildren] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [activeCase, setActiveCase] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [modalStatus, setModalStatus] = useState("pending");
  const [toastMessage, setToastMessage] = useState({ show: false, title: "", message: "" });

  const formatAge = (months) => {
    if (!months || isNaN(months)) return '0 mo';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} mo`;
    if (m === 0) return `${y} yr${y > 1 ? 's' : ''}`;
    return `${y} yr${y > 1 ? 's' : ''} ${m} mo`;
  };

  const showToast = (title, message) => {
    setToastMessage({ show: true, title, message });
    setTimeout(() => setToastMessage({ show: false, title: "", message: "" }), 3500);
  };

  useEffect(() => {
    const unsubChildren = onSnapshot(collection(db, "children"), (snap) => {
      const allChildren = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const flagged = allChildren.filter(c => 
        c.current_status && (c.current_status.includes('Wasted') || c.current_status.includes('Stunted') || c.current_status.includes('Underweight'))
      );
      setFlaggedChildren(flagged);
      setLoading(false); 
    }, (error) => {
      console.error("Firebase Error (Children):", error);
      setLoading(false); 
    });

    const unsubInterventions = onSnapshot(collection(db, "interventions"), (snap) => {
      const ints = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInterventions(ints);
    }, (error) => {
      console.error("Firebase Error (Interventions):", error);
      setLoading(false); 
    });

    return () => {
      unsubChildren();
      unsubInterventions();
    };
  }, []);

  useEffect(() => {
    const mergedCases = flaggedChildren.map(child => {
      const intData = interventions.find(i => i.id === child.id);
      return {
        ...child,
        intervention_status: intData?.status || 'pending',
        logs: intData?.logs || [{
          date: new Date().toISOString(),
          author: 'System',
          text: `Automatically flagged during OPT+ due to ${child.current_status} classification.`
        }]
      };
    });

    setCases(mergedCases);
    
    // Auto-update the active modal if it's open
    if (activeCase) {
      const updatedActive = mergedCases.find(c => c.id === activeCase.id);
      if (updatedActive) setActiveCase(updatedActive);
    }
  }, [flaggedChildren, interventions]); 

  // 🔥 UPDATED: Optimistic UI Update for Instant Visual Feedback
  const updateStatus = async (childId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;

    const statusNames = { pending: 'Pending Review', referred: 'Referred to RHU', feeding: 'Enrolled in Feeding Program', resolved: 'Resolved' };
    const caseObj = cases.find(c => c.id === childId);
    if (!caseObj) return;
    
    const newLog = {
      date: new Date().toISOString(),
      author: 'System',
      text: `Status updated to: ${statusNames[newStatus]}.`
    };

    const updatedLogs = [...caseObj.logs, newLog];

    // 🔥 Force the UI to update instantly before Firestore replies
    setCases(prevCases => prevCases.map(c => 
      c.id === childId ? { ...c, intervention_status: newStatus, logs: updatedLogs } : c
    ));

    try {
      await setDoc(doc(db, "interventions", childId), {
        status: newStatus,
        logs: updatedLogs,
        updated_at: serverTimestamp()
      }, { merge: true });
      
      showToast('Status Updated', `${caseObj.first_name} moved to ${statusNames[newStatus]}.`);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // 🔥 UPDATED: Optimistic UI Update for Modal Notes
  const handleAddNote = async () => {
    if (!noteText.trim() || !activeCase) return;

    const newLog = {
      date: new Date().toISOString(),
      author: userProfile?.full_name || 'Health Worker',
      text: noteText.trim()
    };

    const updatedLogs = [...activeCase.logs, newLog];

    // 🔥 Instantly show note in the modal
    setActiveCase(prev => ({ ...prev, logs: updatedLogs }));

    try {
      await setDoc(doc(db, "interventions", activeCase.id), {
        status: modalStatus, 
        logs: updatedLogs,
        updated_at: serverTimestamp()
      }, { merge: true });
      
      setNoteText("");
      showToast('Log Added', 'Intervention log recorded successfully.');
    } catch (error) {
      console.error("Error adding log:", error);
    }
  };

  const handleModalSave = () => {
    if (modalStatus !== activeCase.intervention_status) {
      updateStatus(activeCase.id, modalStatus, activeCase.intervention_status);
    }
    setActiveCase(null);
  };

  // 🔥 UPDATED: Standardized HTML5 Drag and Drop Handlers
  const handleDragStart = (e, childId) => {
    e.dataTransfer.setData("text/plain", childId);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => e.target.classList.add('opacity-50', 'scale-95'), 0);
  };
  
  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50', 'scale-95');
  };
  
  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };
  
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const childId = e.dataTransfer.getData("text/plain");
    if (!childId) return;
    
    const caseObj = cases.find(c => c.id === childId);
    if (caseObj) {
      updateStatus(childId, newStatus, caseObj.intervention_status);
    }
  };

  const columns = [
    { id: 'pending', title: 'Pending Review', icon: 'fa-inbox', headerCol: 'text-ink border-line', iconCol: 'text-muted', badge: 'bg-line text-ink' },
    { id: 'referred', title: 'Referred to RHU', icon: 'fa-truck-medical', headerCol: 'text-blue-800 border-blue-100', iconCol: 'text-blue-500', badge: 'bg-blue-100 text-blue-800' },
    { id: 'feeding', title: 'Feeding Program', icon: 'fa-bowl-food', headerCol: 'text-yellow-800 border-gold/30', iconCol: 'text-gold', badge: 'bg-yellow-100 text-yellow-800' },
    { id: 'resolved', title: 'Resolved', icon: 'fa-circle-check', headerCol: 'text-green-800 border-green-100', iconCol: 'text-green-500', badge: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7C1A35; }
      `}</style>

      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar bg-cream flex flex-col">
          <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink">Referrals & Triage Board</h2>
              <p className="text-sm text-muted mt-1">Track and manage interventions for children classified as at-risk during OPT+.</p>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6 overflow-x-auto custom-scrollbar pb-4 min-h-[500px]">
              {columns.map(col => (
                <div 
                  key={col.id}
                  onDrop={(e) => handleDrop(e, col.id)} 
                  onDragOver={handleDragOver}
                  className={`flex flex-col min-w-[300px] flex-1 bg-paper/60 border ${col.id === 'pending' ? 'border-line' : col.headerCol.split(' ')[1]} rounded-xl p-4 transition-colors`}
                >
                    <div className={`flex items-center justify-between mb-4 border-b pb-2 ${col.headerCol}`}>
                        <h3 className={`font-bold flex items-center ${col.id === 'pending' ? 'text-ink' : col.headerCol.split(' ')[0]}`}>
                            <i className={`fa-solid ${col.icon} mr-2 ${col.iconCol}`}></i> {col.title}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${col.badge}`}>
                          {cases.filter(c => c.intervention_status === col.id).length}
                        </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 min-h-[100px]">
                        {loading ? (
                          <div className="text-center py-8 text-muted"><i className="fa-solid fa-spinner fa-spin"></i></div>
                        ) : (
                          cases.filter(c => c.intervention_status === col.id).map(child => {
                            const isSevere = child.current_status.includes('Severely');
                            const borderClass = isSevere ? 'border-maroon_light' : 'border-orange-500';
                            const badgeClass = isSevere ? 'bg-maroon_light/10 text-maroon border-maroon_light/20' : 'bg-orange-100 text-orange-800 border-orange-200';

                            return (
                              <div 
                                key={child.id}
                                draggable="true" 
                                onDragStart={(e) => handleDragStart(e, child.id)} 
                                onDragEnd={handleDragEnd}
                                className={`bg-paper rounded-lg p-3 shadow-sm border border-line border-l-4 ${borderClass} cursor-grab active:cursor-grabbing relative group transition-all`}
                              >
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h4 className="font-bold text-ink text-sm leading-tight">{child.first_name} {child.last_name}</h4>
                                          <p className="text-[11px] text-muted">{formatAge(child.current_age_mo)} &bull; Purok {child.purok}</p>
                                      </div>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                          {child.current_status}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-cream">
                                      <span className="text-[10px] text-muted/60 flex items-center">
                                          <i className="fa-regular fa-comment-dots mr-1"></i> {child.logs.length} logs
                                      </span>
                                      <button 
                                        onClick={() => { setActiveCase(child); setModalStatus(child.intervention_status); }} 
                                        className="text-xs font-medium text-maroon hover:text-paper bg-maroon/5 hover:bg-maroon px-2 py-1 rounded transition"
                                      >
                                          Manage Case
                                      </button>
                                  </div>
                              </div>
                            )
                          })
                        )}
                    </div>
                </div>
              ))}
          </div>
        </div>
      </main>

      {/* --- Action Log Modal --- */}
      {activeCase && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in">
            <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-cream shrink-0">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-maroon/10 text-maroon flex items-center justify-center mr-3">
                            <i className="fa-solid fa-clipboard-user text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-ink leading-tight">{activeCase.first_name} {activeCase.last_name}</h3>
                            <div className="mt-0.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${activeCase.current_status.includes('Severely') ? 'bg-maroon_light/10 text-maroon border-maroon_light/20' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                    {activeCase.current_status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setActiveCase(null)} className="text-muted hover:text-ink hover:bg-line/50 rounded-full w-8 h-8 flex items-center justify-center transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 custom-scrollbar">
                    <div className="w-full md:w-1/2 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-ink mb-1">Current Status</label>
                            <select 
                              value={modalStatus} 
                              onChange={(e) => setModalStatus(e.target.value)} 
                              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper shadow-sm"
                            >
                                <option value="pending">Pending Review</option>
                                <option value="referred">Referred to RHU</option>
                                <option value="feeding">Enrolled in Feeding Program</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>

                        <div className="border-t border-line pt-4">
                            <label className="block text-sm font-semibold text-ink mb-2">Record Intervention</label>
                            <textarea 
                              rows="3" 
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Describe the action taken (e.g., Given micronutrient powder)..." 
                              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition resize-none shadow-inner bg-cream focus:bg-paper"
                            ></textarea>
                            <button onClick={handleAddNote} disabled={!noteText.trim()} className="mt-2 w-full bg-maroon hover:bg-maroon_dark text-paper text-sm font-medium py-2 rounded-lg transition shadow-sm flex items-center justify-center disabled:opacity-50">
                                <i className="fa-solid fa-plus mr-2"></i> Add Log Entry
                            </button>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 bg-cream rounded-xl p-4 border border-line">
                        <h4 className="text-sm font-bold text-ink mb-4 flex items-center">
                            <i className="fa-solid fa-clock-rotate-left mr-2 text-muted"></i> Action History
                        </h4>
                        
                        <div className="relative border-l-2 border-line ml-3 pl-6 space-y-6 py-1">
                            {activeCase.logs.length === 0 ? (
                                <p className="text-xs text-muted italic">No logs recorded yet.</p>
                            ) : (
                                [...activeCase.logs].reverse().map((log, index) => {
                                  const dateObj = new Date(log.date);
                                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                  const isNewest = index === 0;

                                  return (
                                    <div key={index} className="relative z-10">
                                        <div className={`absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${isNewest ? 'bg-maroon border-maroon_dark ring-4 ring-maroon/20' : 'bg-line border-muted'}`}></div>
                                        <div className="bg-paper rounded-lg p-3 shadow-sm border border-line">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-ink">{log.author}</span>
                                                <span className="text-[10px] text-muted">{formattedDate}</span>
                                            </div>
                                            <p className="text-sm text-ink leading-snug">{log.text}</p>
                                        </div>
                                    </div>
                                  );
                                })
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-line bg-paper flex justify-end space-x-3 shrink-0">
                    <button onClick={() => setActiveCase(null)} className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition">
                        Close
                    </button>
                    <button onClick={handleModalSave} className="px-5 py-2 bg-maroon hover:bg-maroon_dark text-paper rounded-lg text-sm font-medium transition shadow-sm">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Custom Toast */}
      <div className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl shadow-2xl flex items-center transform transition-all duration-300 z-50 pointer-events-none border bg-ink border-line ${toastMessage.show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
          <div className="bg-brand_green rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm">
              <i className="fa-solid fa-check text-sm text-paper"></i>
          </div>
          <div>
              <p className="text-sm font-semibold mb-0.5 text-paper">{toastMessage.title}</p>
              <p className="text-xs text-paper/80">{toastMessage.message}</p>
          </div>
      </div>

    </div>
  );
}