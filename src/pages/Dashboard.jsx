// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import EntryModal from '../components/modals/EntryModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import ViewRecordModal from '../components/modals/ViewRecordModal';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, recordId: null });
  const [viewRecord, setViewRecord] = useState(null);
  
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  
  const [childStats, setChildStats] = useState({ total: 0, normal: 0, stunted: 0, wasted: 0, overweight: 0, flagged: 0, unassessed: 0 });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "children"), (snapshot) => {
      let normal = 0, stunted = 0, wasted = 0, overweight = 0, flagged = 0, unassessed = 0;
      const totalDocs = snapshot.docs.length;

      snapshot.docs.forEach(doc => {
        const status = doc.data().current_status || 'Unassessed';
        if (status === 'Normal') normal++;
        else if (status.includes('Stunted')) { stunted++; flagged++; }
        else if (status.includes('Wasted') || status.includes('Underweight')) { wasted++; flagged++; }
        else if (status.includes('Overweight') || status.includes('Obese')) overweight++;
        else unassessed++; 
      });
      setChildStats({ total: totalDocs, normal, stunted, wasted, overweight, flagged, unassessed });
    }, (error) => console.error("Error fetching summary stats: ", error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "anthropometric_records"), orderBy("created_at", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(recordsData);
      setLoadingRecords(false);
    }, (error) => {
      console.error("Error fetching records: ", error);
      setLoadingRecords(false);
    });
    return () => unsubscribe();
  }, []);

  const promptDeleteRecord = (recordId) => setConfirmDialog({ isOpen: true, recordId });

  const executeDeleteRecord = async () => {
    if (confirmDialog.recordId) {
      try {
        const batch = writeBatch(db);
        const recordRef = doc(db, "anthropometric_records", confirmDialog.recordId);
        batch.delete(recordRef);

        const classQuery = query(collection(db, "nutrition_classifications"), where("record_id", "==", confirmDialog.recordId));
        const classSnapshot = await getDocs(classQuery);
        classSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));

        await batch.commit();
      } catch (error) {
        console.error("Error deleting record:", error);
        alert("Failed to delete record.");
      }
    }
    setConfirmDialog({ isOpen: false, recordId: null });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Normal": return "bg-brand_green/20 text-brand_green";
      case "Stunted": return "bg-gold/20 text-ink";
      case "Severely Wasted": 
      case "Wasted": return "bg-maroon_light/20 text-maroon";
      case "Overweight": return "bg-gold/40 text-ink";
      case "Unassessed": return "bg-line/50 text-muted";
      default: return "bg-line text-ink";
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

  const getPercentage = (value) => {
    if (childStats.total === 0) return 0;
    return ((value / childStats.total) * 100).toFixed(1);
  };

  // 🔥 NEW: Human-readable age formatter
  const formatAge = (months) => {
    if (months === undefined || months === null || isNaN(months)) return '-';
    if (months < 12) return `${months} mo (Infant)`;
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    return `${yrs} yr${yrs > 1 ? 's' : ''}${mos > 0 ? ` ${mos} mo` : ''}`;
  };

  const chartData = {
    labels: ['Normal', 'Stunted', 'Wasted', 'Overweight', 'Unassessed'],
    datasets: [{
      data: [childStats.normal, childStats.stunted, childStats.wasted, childStats.overweight, childStats.unassessed],
      backgroundColor: ['#3f7d3a', '#d9a017', '#a83250', '#f97316', '#d9cfc2'], 
      borderWidth: 0, hoverOffset: 4
    }]
  };

  const summaryCards = [
    { title: "Total Children Monitored", value: childStats.total.toString(), icon: "fa-users", iconBg: "bg-maroon_light/10", iconColor: "text-maroon", footerIcon: "fa-arrow-up", footerText: "Live Sync", footerSubText: "real-time database", footerColor: "text-brand_green", borderClass: "border-t-4 border-maroon" },
    { title: "Normal Status", value: childStats.normal.toString(), icon: "fa-check-circle", iconBg: "bg-brand_green/10", iconColor: "text-brand_green", badgeText: "Growing well", badgeClass: "bg-brand_green/20 text-brand_green", borderClass: "border-t-4 border-brand_green" },
    { title: "Flagged / Wasted", value: childStats.flagged.toString(), icon: "fa-triangle-exclamation", iconBg: "bg-maroon_light/10", iconColor: "text-maroon_light", badgeText: "Needs check-up soon", badgeClass: "bg-maroon_light/20 text-maroon_light", borderClass: "border-t-4 border-maroon_light" },
    { title: "Overweight", value: childStats.overweight.toString(), icon: "fa-weight-scale", iconBg: "bg-orange-100", iconColor: "text-orange-500", badgeText: "Heavier than expected", badgeClass: "bg-orange-100 text-orange-600", borderClass: "border-t-4 border-orange-500" }
  ];

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}

      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-cream p-4 sm:p-6 lg:p-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">Overview</h2>
              <p className="text-sm text-muted">Track and manage children's nutrition status.</p>
            </div>
            <button onClick={toggleModal} className="bg-maroon hover:bg-maroon_dark text-paper px-4 py-2.5 rounded-lg font-medium text-sm flex items-center transition shadow-sm w-full sm:w-auto justify-center">
              <i className="fa-solid fa-plus mr-2"></i> New Anthropometric Entry
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card, index) => (
              <div key={index} className={`bg-paper rounded-xl shadow-sm border border-line p-5 flex flex-col justify-between hover:shadow-md transition duration-200 ${card.borderClass}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted mb-1">{card.title}</p>
                    <h3 className="text-3xl font-bold text-ink">{card.value}</h3>
                  </div>
                  <div className={`${card.iconBg} p-3 rounded-lg ${card.iconColor}`}><i className={`fa-solid ${card.icon} text-lg`}></i></div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  {card.badgeText ? <span className={`${card.badgeClass} px-2 py-0.5 rounded text-xs font-medium`}>{card.badgeText}</span> : <><span className={`${card.footerColor} font-medium`}><i className={`fa-solid ${card.footerIcon} mr-1`}></i> {card.footerText}</span><span className="text-muted ml-2">{card.footerSubText}</span></>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-paper rounded-xl shadow-sm border border-line lg:col-span-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center bg-maroon text-paper">
                <h3 className="font-bold text-paper">Barangay Nutrition Status</h3>
                <button className="text-paper/80 hover:text-paper transition"><i className="fa-solid fa-ellipsis-vertical"></i></button>
              </div>
              <div className="p-5 flex-1 relative w-full flex justify-center items-center min-h-[250px]">
                {childStats.total === 0 ? <p className="text-muted text-sm">No data available to chart.</p> : <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }} />}
              </div>
              <div className="px-5 pb-5 mt-2 grid grid-cols-2 gap-2 text-xs text-ink">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-brand_green mr-2"></span> Normal ({getPercentage(childStats.normal)}%)</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gold mr-2"></span> Stunted ({getPercentage(childStats.stunted)}%)</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-maroon_light mr-2"></span> Wasted ({getPercentage(childStats.wasted)}%)</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span> Overweight ({getPercentage(childStats.overweight)}%)</div>
                <div className="flex items-center col-span-2 text-muted mt-1 border-t border-line pt-2"><span className="w-3 h-3 rounded-full bg-line mr-2"></span> Unassessed ({getPercentage(childStats.unassessed)}%)</div>
              </div>
            </div>

            <div className="bg-paper rounded-xl shadow-sm border border-line lg:col-span-2 flex flex-col overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center bg-maroon text-paper">
                <h3 className="font-bold text-paper">Recent Anthropometric Records</h3>
                <a href="#" className="text-sm font-medium hover:underline text-paper/80 hover:text-paper">View All</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream text-muted text-xs uppercase tracking-wider border-b border-line">
                      <th className="px-5 py-3 font-semibold">Child Name</th>
                      {/* Changed Table Header */}
                      <th className="px-5 py-3 font-semibold text-center">Age</th>
                      <th className="px-5 py-3 font-semibold text-center">Ht (cm)</th>
                      <th className="px-5 py-3 font-semibold text-center">Wt (kg)</th>
                      <th className="px-5 py-3 font-semibold text-center">MUAC</th>
                      <th className="px-5 py-3 font-semibold">WHO Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-ink divide-y divide-line">
                    {loadingRecords ? (
                      <tr><td colSpan="7" className="px-5 py-8 text-center text-muted"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading records...</td></tr>
                    ) : records.length > 0 ? (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-cream transition">
                          <td className="px-5 py-4 font-medium">{record.child_name || 'Unknown'}</td>
                          {/* Applied Formatter */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">{formatAge(record.age_mo)}</td>
                          <td className="px-5 py-4 text-center">{record.height_cm ? record.height_cm.toFixed(1) : '-'}</td>
                          <td className="px-5 py-4 text-center">{record.weight_kg ? record.weight_kg.toFixed(1) : '-'}</td>
                          <td className={`px-5 py-4 text-center ${record.muac_cm < 11.5 ? 'text-maroon_light font-bold' : ''}`}>{record.muac_cm ? record.muac_cm.toFixed(1) : '-'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(record.classification_result)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(record.classification_result)}`}></span>
                              {record.classification_result || 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end space-x-3 items-center">
                              {record.classification_result === "Severely Wasted" && <button className="text-maroon_light hover:text-maroon font-medium text-xs border border-maroon_light/30 px-2 py-1 rounded" title="Refer to RHU">Refer</button>}
                              <button onClick={() => setViewRecord(record)} className="text-muted hover:text-maroon transition" title="View Details"><i className="fa-regular fa-eye"></i></button>
                              <button onClick={() => promptDeleteRecord(record.id)} className="text-muted hover:text-maroon_light transition" title="Delete Record"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" className="px-5 py-8 text-center text-muted">No records found in the database.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <footer className="mt-8 text-center text-sm text-muted pb-4">
             &copy; 2026 Barangay Nutrition Monitoring System (BNMS). Capstone Project.
          </footer>
        </div>
      </main>

      {isModalOpen && <EntryModal onClose={toggleModal} />}
      {viewRecord && <ViewRecordModal record={viewRecord} onClose={() => setViewRecord(null)} />}

      <ConfirmModal 
        isOpen={confirmDialog.isOpen}
        title="Delete Weigh-in Record"
        message="Are you sure you want to delete this record? This action cannot be undone and will remove the data from the child's growth history."
        confirmText="Delete Record"
        onConfirm={executeDeleteRecord}
        onCancel={() => setConfirmDialog({ isOpen: false, recordId: null })}
      />
    </div>
  );
}