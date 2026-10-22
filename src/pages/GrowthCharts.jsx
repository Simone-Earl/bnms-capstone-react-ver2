// src/pages/GrowthCharts.jsx
import { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import Chart from 'chart.js/auto';

export default function GrowthCharts() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childHistory, setChildHistory] = useState([]);
  
  const [currentTab, setCurrentTab] = useState('WFA');
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

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

  useEffect(() => {
    const fetchChildrenList = async () => {
      try {
        const snapshot = await getDocs(collection(db, "children"));
        const children = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        children.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
        setChildrenList(children);
      } catch (error) {
        console.error("Error fetching children list:", error);
      }
    };
    fetchChildrenList();
  }, []);

  const handleChildSelect = async (childId) => {
    if (!childId) return;
    
    const childObj = childrenList.find(c => c.id === childId);
    setSelectedChild(childObj);
    setIsLoading(true);
    setCurrentTab('WFA'); 

    try {
      const recordsQ = query(collection(db, "anthropometric_records"), where("child_id", "==", childId));
      const recordsSnap = await getDocs(recordsQ);
      const records = recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const mergedHistory = await Promise.all(records.map(async (record) => {
        let classData = {};
        try {
          const classQ = query(collection(db, "nutrition_classifications"), where("record_id", "==", record.id));
          const classSnap = await getDocs(classQ);
          if (!classSnap.empty) classData = classSnap.docs[0].data();
        } catch (err) {
          console.warn("Could not fetch classification for record:", record.id);
        }

        const waz = classData.waz ?? classData.wfa_z ?? record.waz ?? record.wfa_z ?? 0;
        const haz = classData.haz ?? classData.hfa_z ?? record.haz ?? record.hfa_z ?? 0;
        const whz = classData.whz ?? classData.whz_bmi ?? classData.wfl_z ?? record.whz ?? record.whz_bmi ?? record.wfl_z ?? 0;

        return { ...record, waz: parseFloat(waz), haz: parseFloat(haz), whz: parseFloat(whz) };
      }));

      mergedHistory.sort((a, b) => {
        const dateA = a.visit_date ? new Date(a.visit_date) : (a.created_at?.toDate ? a.created_at.toDate() : new Date(0));
        const dateB = b.visit_date ? new Date(b.visit_date) : (b.created_at?.toDate ? b.created_at.toDate() : new Date(0));
        return dateA - dateB;
      });
      
      setChildHistory(mergedHistory);

    } catch (error) {
      console.error("Error fetching child history:", error);
      alert("Failed to load historical data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChild || childHistory.length === 0 || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    // 🔥 UPDATED CHART LABELS: Now uses formatAge for the X-Axis
    const labels = childHistory.map(r => {
      const d = r.visit_date ? new Date(r.visit_date) : (r.created_at?.toDate ? r.created_at.toDate() : new Date());
      return `${d.toLocaleString('default', { month: 'short' })} '${d.getFullYear().toString().substring(2)} (${formatAge(r.age_mo)})`;
    });

    let dataPoints = [];
    let datasetLabel = '';
    
    if (currentTab === 'WFA') {
      dataPoints = childHistory.map(r => r.waz);
      datasetLabel = 'Weight-for-Age (WFA)';
    } else if (currentTab === 'HFA') {
      dataPoints = childHistory.map(r => r.haz);
      datasetLabel = 'Height-for-Age (HFA)';
    } else {
      dataPoints = childHistory.map(r => r.whz);
      datasetLabel = 'Weight-for-Length (WFL)';
    }

    const arrayLength = labels.length;
    const topBoundary = Array(arrayLength).fill(4);
    const line2SD = Array(arrayLength).fill(2);
    const lineMinus2SD = Array(arrayLength).fill(-2);
    const lineMinus3SD = Array(arrayLength).fill(-3);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
          labels: labels,
          datasets: [
              { label: 'Overweight Zone', data: topBoundary, fill: { value: 2 }, backgroundColor: 'rgba(251, 146, 60, 0.15)', borderColor: 'transparent', pointRadius: 0, tooltip: false, order: 10 },
              { label: 'Normal Zone', data: line2SD, fill: { value: -2 }, backgroundColor: 'rgba(74, 222, 128, 0.15)', borderColor: 'transparent', pointRadius: 0, tooltip: false, order: 10 },
              { label: 'Moderate Zone', data: lineMinus2SD, fill: { value: -3 }, backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'transparent', pointRadius: 0, tooltip: false, order: 10 },
              { label: 'Severe Zone', data: lineMinus3SD, fill: { value: -4 }, backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'transparent', pointRadius: 0, tooltip: false, order: 10 },
              { label: 'Median (0 SD)', data: Array(arrayLength).fill(0), borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false, tooltip: false, order: 5 },
              {
                  label: datasetLabel, data: dataPoints, borderColor: '#7C1A35', backgroundColor: '#ffffff',
                  borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#7C1A35', pointBorderColor: '#ffffff',
                  pointBorderWidth: 2, pointHoverRadius: 7, fill: false, tension: 0.3, order: 1
              }
          ]
      },
      options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
              legend: { display: false },
              tooltip: {
                  filter: (tooltipItem) => tooltipItem.datasetIndex === 5,
                  backgroundColor: 'rgba(124, 26, 53, 0.95)',
                  titleFont: { family: "'Inter', sans-serif", size: 13 },
                  bodyFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                  padding: 10, displayColors: false,
                  callbacks: { label: (context) => `Z-Score: ${context.parsed.y > 0 ? '+' : ''}${context.parsed.y.toFixed(2)}` }
              }
          },
          scales: {
              y: { min: -4, max: 4, title: { display: true, text: 'WHO Z-Score (SD)', font: { family: "'Inter', sans-serif", weight: 'bold' }, color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1, callback: (value) => value > 0 ? '+' + value : value } },
              x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" }, color: '#6b7280' } }
          },
          interaction: { mode: 'index', intersect: false },
      }
    });

  }, [childHistory, currentTab, selectedChild]);

  const getStatusDetails = (zScore) => {
    if (zScore >= 2) return { text: 'Overweight', bg: 'bg-orange-100', textCol: 'text-orange-600', border: 'border-orange-200' };
    if (zScore >= -2 && zScore < 2) return { text: 'Normal', bg: 'bg-brand_green/20', textCol: 'text-brand_green', border: 'border-brand_green/30' };
    if (zScore >= -3 && zScore < -2) return { text: 'Moderate', bg: 'bg-gold/20', textCol: 'text-gold', border: 'border-gold/30' };
    return { text: 'Severe', bg: 'bg-maroon_light/20', textCol: 'text-maroon', border: 'border-maroon_light/30' };
  };

  const getDisplayDate = (record) => {
    if (record.visit_date) return new Date(record.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (record.created_at?.toDate) return record.created_at.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return 'Unknown Date';
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

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            
            <div className="bg-paper rounded-xl shadow-sm border border-line p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-ink">Longitudinal Tracking</h2>
                    <p className="text-sm text-muted">Monitor individual growth trajectories over time.</p>
                </div>
                <div className="w-full md:w-96 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <select 
                      onChange={(e) => handleChildSelect(e.target.value)}
                      defaultValue=""
                      className="w-full border border-line rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper shadow-sm appearance-none cursor-pointer text-ink"
                    >
                        <option value="" disabled>Search and select a child...</option>
                        {childrenList.map(child => (
                          <option key={child.id} value={child.id}>
                            {child.first_name} {child.last_name} (ID: #{child.display_id || child.id.substring(0,6).toUpperCase()})
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                    </div>
                </div>
            </div>

            {!selectedChild ? (
              <div className="bg-paper rounded-xl shadow-sm border border-line p-12 text-center animate-fade-in">
                  <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mx-auto mb-4 border border-line">
                      <i className="fa-solid fa-chart-line text-3xl text-muted/50"></i>
                  </div>
                  <h3 className="text-lg font-medium text-ink mb-1">No Child Selected</h3>
                  <p className="text-muted text-sm">Please select a child from the dropdown above to view their growth charts and historical data.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                  
                  <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden">
                      <div className="bg-maroon px-6 py-3 border-b border-maroon_dark flex justify-between items-center">
                          <h3 className="text-paper font-semibold">Child Profile Summary</h3>
                          <span className="bg-paper/20 text-paper text-xs px-2.5 py-1 rounded-full font-mono">
                            ID: #{selectedChild.display_id || selectedChild.id.substring(0,6).toUpperCase()}
                          </span>
                      </div>
                      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-line">
                          <div className="px-2">
                              <p className="text-xs text-muted uppercase tracking-wider mb-1">Full Name</p>
                              <p className="text-base font-bold text-ink">{selectedChild.first_name} {selectedChild.last_name}</p>
                          </div>
                          <div className="px-4">
                              <p className="text-xs text-muted uppercase tracking-wider mb-1">Current Age</p>
                              {/* 🔥 UPDATED SUMMARY AGE */}
                              <p className="text-base font-bold text-ink">{formatAge(selectedChild.current_age_mo)}</p>
                          </div>
                          <div className="px-4">
                              <p className="text-xs text-muted uppercase tracking-wider mb-1">Sex</p>
                              <p className="text-base font-bold text-ink">{selectedChild.sex || 'N/A'}</p>
                          </div>
                          <div className="px-4">
                              <p className="text-xs text-muted uppercase tracking-wider mb-1">Latest Status (WFA)</p>
                              <div>
                                  {childHistory.length > 0 ? (
                                    (() => {
                                      const latestRecord = childHistory[childHistory.length - 1];
                                      const status = getStatusDetails(latestRecord.waz);
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${status.bg} ${status.textCol} ${status.border} border shadow-sm`}>
                                            {status.text} ({latestRecord.waz > 0 ? '+' : ''}{latestRecord.waz.toFixed(2)} SD)
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-sm font-medium text-muted">No records found</span>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-paper rounded-xl shadow-sm border border-line p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                          <h3 className="text-lg font-bold text-ink">WHO Standard Z-Score Trajectory</h3>
                          
                          <div className="inline-flex bg-cream p-1 rounded-lg border border-line" role="group">
                              <button onClick={() => setCurrentTab('WFA')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all focus:outline-none ${currentTab === 'WFA' ? 'bg-paper shadow-sm text-maroon font-bold' : 'text-muted hover:text-ink hover:bg-line/50'}`}>
                                  Weight-for-Age
                              </button>
                              <button onClick={() => setCurrentTab('HFA')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all focus:outline-none ${currentTab === 'HFA' ? 'bg-paper shadow-sm text-maroon font-bold' : 'text-muted hover:text-ink hover:bg-line/50'}`}>
                                  Height-for-Age
                              </button>
                              <button onClick={() => setCurrentTab('WFL')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all focus:outline-none ${currentTab === 'WFL' ? 'bg-paper shadow-sm text-maroon font-bold' : 'text-muted hover:text-ink hover:bg-line/50'}`}>
                                  Weight-for-Length
                              </button>
                          </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-4 border-b border-line pb-4 text-xs">
                          <span className="font-bold text-muted mr-2 uppercase tracking-wider">WHO Zones:</span>
                          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-400 mr-1.5"></span> Overweight</div>
                          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-400 mr-1.5"></span> Normal</div>
                          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-400 mr-1.5"></span> Moderate</div>
                          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-400 mr-1.5"></span> Severe</div>
                          <div className="ml-auto flex items-center font-bold text-ink"><span className="w-4 h-1 bg-maroon mr-1.5 rounded"></span> Child Trajectory</div>
                      </div>

                      {isLoading ? (
                        <div className="h-80 sm:h-96 flex items-center justify-center">
                          <i className="fa-solid fa-spinner fa-spin text-3xl text-maroon"></i>
                        </div>
                      ) : childHistory.length === 0 ? (
                        <div className="h-80 sm:h-96 flex flex-col items-center justify-center text-muted">
                          <i className="fa-solid fa-chart-line text-4xl mb-3 opacity-30"></i>
                          <p>No historical data to plot.</p>
                        </div>
                      ) : (
                        <div className="relative w-full h-80 sm:h-96">
                            <canvas ref={chartRef}></canvas>
                        </div>
                      )}
                  </div>

                  <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden">
                      <div className="px-6 py-4 border-b border-line bg-cream flex justify-between items-center">
                          <h3 className="font-bold text-ink">Historical Anthropometric Data</h3>
                          <button onClick={() => alert("CSV Export will be fully implemented in the Reports Module.")} className="text-maroon hover:text-maroon_dark text-sm font-medium transition flex items-center">
                              <i className="fa-solid fa-file-export mr-1.5"></i> Export CSV
                          </button>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                              <thead>
                                  <tr className="bg-paper text-muted text-xs uppercase tracking-wider border-b border-line">
                                      <th className="px-6 py-3 font-semibold">Date of Visit</th>
                                      {/* 🔥 UPDATED TABLE HEADER */}
                                      <th className="px-6 py-3 font-semibold text-center">Age</th>
                                      <th className="px-6 py-3 font-semibold text-center">Weight (kg)</th>
                                      <th className="px-6 py-3 font-semibold text-center">Height (cm)</th>
                                      <th className="px-6 py-3 font-semibold text-center bg-cream">
                                        {currentTab} Z-Score
                                      </th>
                                      <th className="px-6 py-3 font-semibold text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="text-sm text-ink divide-y divide-line">
                                  {childHistory.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-6 text-muted">No records found.</td></tr>
                                  ) : (
                                    [...childHistory].reverse().map((record, idx) => {
                                      
                                      let zScore = 0;
                                      if (currentTab === 'WFA') zScore = record.waz;
                                      if (currentTab === 'HFA') zScore = record.haz;
                                      if (currentTab === 'WFL') zScore = record.whz;
                                      
                                      const status = getStatusDetails(zScore);

                                      return (
                                        <tr key={idx} className="hover:bg-cream/50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-ink">
                                              {getDisplayDate(record)}
                                            </td>
                                            {/* 🔥 UPDATED TABLE CELL */}
                                            <td className="px-6 py-3 text-center text-muted">{formatAge(record.age_mo)}</td>
                                            <td className="px-6 py-3 text-center text-ink">{parseFloat(record.weight_kg).toFixed(1)}</td>
                                            <td className="px-6 py-3 text-center text-ink">{parseFloat(record.height_cm).toFixed(1)}</td>
                                            <td className="px-6 py-3 text-center font-mono font-medium bg-cream/50">
                                              {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${status.bg} ${status.textCol} border ${status.border}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                        </tr>
                                      )
                                    })
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}