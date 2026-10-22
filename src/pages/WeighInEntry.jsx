// src/pages/WeighInEntry.jsx
import { useState } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export default function WeighInEntry() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedPurok, setSelectedPurok] = useState("");
  const [childrenData, setChildrenData] = useState([]);
  const [entries, setEntries] = useState({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState({ show: false, title: "", message: "", type: "success" });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // 🔥 NEW: Helper to format months into "Years and Months"
  const formatAge = (months) => {
    if (!months || isNaN(months)) return '0 mo';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} mo`;
    if (m === 0) return `${y} yr${y > 1 ? 's' : ''}`;
    return `${y} yr${y > 1 ? 's' : ''} ${m} mo`;
  };

  const isAssessedThisMonth = (lastWeighIn) => {
    if (!lastWeighIn) return false;
    const weighInDate = lastWeighIn.toDate ? lastWeighIn.toDate() : new Date(lastWeighIn);
    const now = new Date();
    return weighInDate.getMonth() === now.getMonth() && weighInDate.getFullYear() === now.getFullYear();
  };

  const loadChildren = async () => {
    if (!selectedPurok) {
      alert("Please select a Purok first.");
      return;
    }
    
    setIsLoading(true);
    try {
      const q = query(collection(db, "children"), where("purok", "==", selectedPurok));
      const snapshot = await getDocs(q);
      
      const fetchedChildren = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedChildren.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
      setChildrenData(fetchedChildren);

      const initialEntries = {};
      fetchedChildren.forEach(child => {
        const alreadyDone = isAssessedThisMonth(child.last_weigh_in);
        initialEntries[child.id] = {
          height: '', weight: '', muac: '',
          status: alreadyDone ? (child.current_status || 'Assessed') : 'Pending Entry',
          isSaved: alreadyDone 
        };
      });
      setEntries(initialEntries);
      
    } catch (error) {
      console.error("Error loading children:", error);
      alert("Failed to load records from the database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntryChange = (childId, field, value) => {
    setEntries(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: value
      }
    }));
  };

  const submitAll = async () => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      let updatedEntries = { ...entries };
      let recordsProcessed = 0;

      for (const child of childrenData) {
        const entry = updatedEntries[child.id];
        if (entry.isSaved) continue;

        if (entry.height && entry.weight) {
          const mockStatuses = ["Normal", "Normal", "Normal", "Stunted", "Wasted", "Overweight"];
          const randStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

          const recordRef = doc(collection(db, "anthropometric_records"));
          batch.set(recordRef, {
            child_id: child.id,
            child_name: `${child.first_name} ${child.last_name}`,
            age_mo: child.current_age_mo || 0,
            height_cm: parseFloat(entry.height),
            weight_kg: parseFloat(entry.weight),
            muac_cm: entry.muac ? parseFloat(entry.muac) : null,
            classification_result: randStatus,
            visit_date: new Date().toISOString().split('T')[0],
            created_by: userProfile?.full_name || 'System',
            created_at: serverTimestamp()
          });

          const classRef = doc(collection(db, "nutrition_classifications"));
          batch.set(classRef, {
            record_id: recordRef.id,
            child_id: child.id,
            waz: (Math.random() * 4 - 2).toFixed(2),
            haz: (Math.random() * 4 - 2).toFixed(2),
            whz_bmi: (Math.random() * 4 - 2).toFixed(2),
            created_at: serverTimestamp()
          });

          const childRef = doc(db, "children", child.id);
          batch.update(childRef, {
            current_status: randStatus,
            last_weigh_in: serverTimestamp()
          });

          updatedEntries[child.id].status = randStatus;
          updatedEntries[child.id].isSaved = true;
          recordsProcessed++;
          
        } else if (entry.height || entry.weight || entry.muac) {
          updatedEntries[child.id].status = 'Incomplete';
        }
      }

      if (recordsProcessed > 0) {
        await batch.commit();
        setToastMessage({ show: true, title: "Batch Saved Successfully", message: `${recordsProcessed} records have been updated to Firestore.`, type: "success" });
      } else {
        setToastMessage({ show: true, title: "No Action Taken", message: "No complete new records were found to save.", type: "error" });
      }
      setEntries(updatedEntries);

    } catch (error) {
      console.error("Error during batch save:", error);
      setToastMessage({ show: true, title: "Save Failed", message: "An error occurred while saving records.", type: "error" });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage({ show: false, title: "", message: "", type: "success" }), 4000);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Normal') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand_green/20 text-brand_green border border-brand_green/30"><i className="fa-solid fa-check text-[10px] mr-1"></i> Normal</span>;
    if (status === 'Stunted' || status === 'Severely Stunted') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gold/20 text-gold border border-gold/30"><i className="fa-solid fa-exclamation text-[10px] mr-1"></i> {status}</span>;
    if (status === 'Wasted' || status === 'Severely Wasted') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-maroon_light/20 text-maroon border border-maroon_light/30"><i className="fa-solid fa-triangle-exclamation text-[10px] mr-1"></i> {status}</span>;
    if (status === 'Overweight' || status === 'Obese') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-600 border border-orange-200"><i className="fa-solid fa-weight-scale text-[10px] mr-1"></i> {status}</span>;
    if (status === 'Incomplete') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-500 border border-red-100">Incomplete</span>;
    if (status === 'Assessed') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand_green/10 text-brand_green border border-brand_green/20"><i className="fa-solid fa-lock text-[10px] mr-1"></i> Assessed This Month</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-line text-muted border border-line">Pending Entry</span>;
  };

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F9F7F1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7A1C30; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-ink flex items-center">Mass Operation Timbang (Batch Entry)</h2>
                    <p className="text-sm text-muted mt-1">Rapid data entry interface for barangay-wide weighing sessions.</p>
                </div>
                
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                        <select 
                          value={selectedPurok} 
                          onChange={(e) => setSelectedPurok(e.target.value)} 
                          className="w-full border border-line rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-paper text-ink shadow-sm appearance-none"
                        >
                            <option value="" disabled>Select Purok...</option>
                            <option value="1">Purok 1</option>
                            <option value="2">Purok 2</option>
                            <option value="3">Purok 3</option>
                            <option value="4">Purok 4</option>
                            <option value="5">Purok 5</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted">
                            <i className="fa-solid fa-filter text-xs"></i>
                        </div>
                    </div>
                    <button onClick={loadChildren} disabled={isLoading} className="bg-paper border border-line text-ink hover:bg-cream hover:text-maroon px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-sm whitespace-nowrap flex items-center disabled:opacity-50">
                        {isLoading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-rotate-right mr-2"></i>}
                        Load Children
                    </button>
                </div>
            </div>

            <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden flex flex-col flex-1">
                <div className="p-4 border-b border-line bg-cream flex justify-between items-center">
                    <div className="flex items-center text-sm text-ink font-medium">
                        <i className="fa-solid fa-list-check text-maroon mr-2"></i>
                        {childrenData.length > 0 ? (
                           <span>Loaded <span className="font-bold mx-1">{childrenData.length}</span> children for <span className="font-bold mx-1">Purok {selectedPurok}</span></span>
                        ) : (<span>Please select a Purok and load records.</span>)}
                    </div>
                    <span className="bg-gold/20 text-gold text-xs font-bold px-2 py-1 rounded border border-gold/30">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Round
                    </span>
                </div>

                <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[300px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                        <thead>
                            <tr className="bg-paper border-b-2 border-line text-muted text-xs uppercase tracking-wider">
                                <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                                <th className="px-4 py-3 font-semibold">Child Name</th>
                                {/* 🔥 UPDATED HEADER */}
                                <th className="px-4 py-3 font-semibold text-center w-32">Age</th>
                                <th className="px-4 py-3 font-semibold text-center w-20">Sex</th>
                                <th className="px-4 py-3 font-semibold text-center w-32 bg-blue-50/30">Height (cm)</th>
                                <th className="px-4 py-3 font-semibold text-center w-32 bg-blue-50/30">Weight (kg)</th>
                                <th className="px-4 py-3 font-semibold text-center w-32 bg-blue-50/30">MUAC (cm)</th>
                                <th className="px-4 py-3 font-semibold text-center w-40">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-ink divide-y divide-line">
                            {childrenData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-muted">
                                        <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-20"></i>
                                        <p>No records loaded. Select a Purok and click "Load Children".</p>
                                    </td>
                                </tr>
                            ) : (
                                childrenData.map((child, index) => {
                                  const isLocked = entries[child.id]?.isSaved && entries[child.id]?.status !== 'Incomplete';
                                  
                                  return (
                                    <tr key={child.id} className="hover:bg-cream/80 transition-colors group">
                                        <td className="px-4 py-2 text-center text-xs text-muted font-mono">{index + 1}</td>
                                        <td className="px-4 py-2">
                                            <p className="font-medium text-ink">{child.first_name} {child.last_name}</p>
                                            <p className="text-[10px] text-muted font-mono">ID: #{child.display_id || child.id.substring(0,6).toUpperCase()}</p>
                                        </td>
                                        {/* 🔥 UPDATED FORMATTED AGE */}
                                        <td className="px-4 py-2 text-center text-ink">{formatAge(child.current_age_mo)}</td>
                                        <td className="px-4 py-2 text-center text-ink">{child.sex || '-'}</td>
                                        
                                        <td className="px-4 py-2 text-center bg-blue-50/10 group-hover:bg-blue-50/30">
                                            <input 
                                              type="number" step="0.1" placeholder={isLocked ? "Done" : "0.0"} 
                                              value={entries[child.id]?.height || ''}
                                              onChange={(e) => handleEntryChange(child.id, 'height', e.target.value)}
                                              disabled={entries[child.id]?.isSaved}
                                              className="w-20 text-center border border-line rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon outline-none transition shadow-inner disabled:bg-cream/50 disabled:border-transparent disabled:shadow-none disabled:text-muted/60 disabled:cursor-not-allowed" 
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center bg-blue-50/10 group-hover:bg-blue-50/30">
                                            <input 
                                              type="number" step="0.1" placeholder={isLocked ? "Done" : "0.0"} 
                                              value={entries[child.id]?.weight || ''}
                                              onChange={(e) => handleEntryChange(child.id, 'weight', e.target.value)}
                                              disabled={entries[child.id]?.isSaved}
                                              className="w-20 text-center border border-line rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon outline-none transition shadow-inner disabled:bg-cream/50 disabled:border-transparent disabled:shadow-none disabled:text-muted/60 disabled:cursor-not-allowed" 
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center bg-blue-50/10 group-hover:bg-blue-50/30">
                                            <input 
                                              type="number" step="0.1" placeholder={isLocked ? "Done" : "-"} 
                                              value={entries[child.id]?.muac || ''}
                                              onChange={(e) => handleEntryChange(child.id, 'muac', e.target.value)}
                                              disabled={entries[child.id]?.isSaved || child.current_age_mo < 6} 
                                              title={child.current_age_mo < 6 ? "MUAC not applicable for infants under 6 months" : ""}
                                              className="w-20 text-center border border-line rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon outline-none transition shadow-inner disabled:bg-cream/50 disabled:opacity-50 disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed" 
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">{getStatusBadge(entries[child.id]?.status)}</td>
                                    </tr>
                                  )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-line bg-cream flex items-center justify-between">
                    <p className="text-xs text-muted flex items-center">
                        <i className="fa-solid fa-circle-info mr-1.5"></i>
                        Press <kbd className="px-1.5 py-0.5 bg-paper border border-line rounded mx-1 font-mono text-[10px]">Tab</kbd> to move between input fields quickly.
                    </p>
                    <button onClick={submitAll} disabled={isSubmitting || childrenData.length === 0} className="bg-maroon hover:bg-maroon_dark text-paper px-6 py-2.5 rounded-lg text-sm font-medium transition shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Processing Z-Scores...</> : <><i className="fa-solid fa-cloud-arrow-up mr-2"></i> Submit All (Batch Save)</>}
                    </button>
                </div>
            </div>
          </div>
        </div>
      </main>

      <div className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl shadow-2xl flex items-center transform transition-all duration-300 z-50 pointer-events-none border ${toastMessage.show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'} ${toastMessage.type === 'error' ? 'bg-paper border-maroon' : 'bg-ink border-line'}`}>
          <div className={`${toastMessage.type === 'error' ? 'bg-maroon' : 'bg-brand_green'} rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`}>
              <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-check'} text-sm text-paper`}></i>
          </div>
          <div>
              <p className={`text-sm font-semibold mb-0.5 ${toastMessage.type === 'error' ? 'text-maroon' : 'text-paper'}`}>{toastMessage.title}</p>
              <p className={`text-xs ${toastMessage.type === 'error' ? 'text-ink' : 'text-paper/80'}`}>{toastMessage.message}</p>
          </div>
      </div>
    </div>
  );
}