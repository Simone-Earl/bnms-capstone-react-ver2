// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

// Export Libraries
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [previewSubtitle, setPreviewSubtitle] = useState("");
  const [toastMessage, setToastMessage] = useState({ show: false, title: "", message: "", type: "success" });

  const initialStats = {
    wfa: { Normal: { m: 0, f: 0 }, Underweight: { m: 0, f: 0 }, Severely_Underweight: { m: 0, f: 0 }, Overweight: { m: 0, f: 0 } },
    hfa: { Normal: { m: 0, f: 0 }, Stunted: { m: 0, f: 0 }, Severely_Stunted: { m: 0, f: 0 }, Tall: { m: 0, f: 0 } },
    wfl: { Normal: { m: 0, f: 0 }, Wasted: { m: 0, f: 0 }, Severely_Wasted: { m: 0, f: 0 }, Overweight: { m: 0, f: 0 }, Obese: { m: 0, f: 0 } }
  };

  const [stats, setStats] = useState(initialStats);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ show: true, title, message, type });
    setTimeout(() => setToastMessage({ show: false, title: "", message: "", type: "success" }), 3500);
  };

  // Generate Report Logic
  const generateReport = async () => {
    setIsGenerating(true);
    setPreviewSubtitle(new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' }));

    try {
      // 1. Fetch all children to map their genders
      const childrenSnap = await getDocs(collection(db, "children"));
      const childrenMap = {};
      childrenSnap.docs.forEach(doc => {
        childrenMap[doc.id] = doc.data().sex === 'Male' ? 'm' : 'f';
      });

      // 2. Fetch all raw anthropometric records
      const recordsSnap = await getDocs(collection(db, "anthropometric_records"));
      const allRecords = recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Filter records strictly within the selected month and year
      const filteredRecords = allRecords.filter(record => {
        const d = record.visit_date ? new Date(record.visit_date) : (record.created_at?.toDate ? record.created_at.toDate() : new Date(0));
        return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
      });

      // 4. Deduplicate (Keep only the latest record per child for this specific month)
      filteredRecords.sort((a, b) => new Date(b.visit_date || 0) - new Date(a.visit_date || 0));
      const uniqueRecordsMap = new Map();
      filteredRecords.forEach(record => {
        if (!uniqueRecordsMap.has(record.child_id)) uniqueRecordsMap.set(record.child_id, record);
      });
      const targetRecords = Array.from(uniqueRecordsMap.values());

      // 5. Fetch Classification Z-Scores
      const classSnap = await getDocs(collection(db, "nutrition_classifications"));
      const classifications = classSnap.docs.map(doc => doc.data());

      // 6. Aggregate the data into DOH/WHO Brackets
      const newStats = JSON.parse(JSON.stringify(initialStats)); // Deep copy to reset

      targetRecords.forEach(record => {
        const gender = childrenMap[record.child_id] || 'f'; // Default to female if missing
        const classData = classifications.find(c => c.record_id === record.id) || {};
        
        const waz = parseFloat(classData.waz ?? classData.wfa_z ?? record.waz ?? record.wfa_z ?? 0);
        const haz = parseFloat(classData.haz ?? classData.hfa_z ?? record.haz ?? record.hfa_z ?? 0);
        const whz = parseFloat(classData.whz ?? classData.whz_bmi ?? classData.wfl_z ?? record.whz ?? 0);

        // WFA Classification
        if (waz > 2) newStats.wfa.Overweight[gender]++;
        else if (waz >= -2) newStats.wfa.Normal[gender]++;
        else if (waz >= -3) newStats.wfa.Underweight[gender]++;
        else newStats.wfa.Severely_Underweight[gender]++;

        // HFA Classification
        if (haz > 2) newStats.hfa.Tall[gender]++;
        else if (haz >= -2) newStats.hfa.Normal[gender]++;
        else if (haz >= -3) newStats.hfa.Stunted[gender]++;
        else newStats.hfa.Severely_Stunted[gender]++;

        // WHZ Classification
        if (whz > 3) newStats.wfl.Obese[gender]++;
        else if (whz > 2) newStats.wfl.Overweight[gender]++;
        else if (whz >= -2) newStats.wfl.Normal[gender]++;
        else if (whz >= -3) newStats.wfl.Wasted[gender]++;
        else newStats.wfl.Severely_Wasted[gender]++;
      });

      setStats(newStats);
      showToast('Report Generated', `Data successfully aggregated for ${previewSubtitle || 'the selected period'}.`, 'success');

    } catch (error) {
      console.error("Error generating report:", error);
      showToast('Error', 'Failed to generate report data.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Run automatically on first load for current month
  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PDF Export
  const exportPDF = () => {
    showToast('Preparing PDF...', 'Compiling document, please wait.', 'info');
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Barangay Nutrition Summary - ${previewSubtitle}`, 14, 20);
    
    doc.autoTable({
      html: '#reportTable',
      startY: 30,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [122, 23, 35] }, // Maroon
    });
    
    doc.save(`BNMS_Report_${previewSubtitle.replace(' ', '_')}.pdf`);
    setTimeout(() => showToast('Export Successful', 'Report exported as PDF.', 'success'), 1000);
  };

  // Excel Export
  const exportExcel = () => {
    showToast('Preparing Excel...', 'Compiling document, please wait.', 'info');
    const table = document.getElementById("reportTable");
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Nutrition Report" });
    XLSX.writeFile(workbook, `BNMS_Report_${previewSubtitle.replace(' ', '_')}.xlsx`);
    setTimeout(() => showToast('Export Successful', 'Report exported as Excel.', 'success'), 1000);
  };

  // Helper component for table rows
  const DataRow = ({ label, data, isSevere }) => {
    const m = data.m;
    const f = data.f;
    const total = m + f;
    const colorClass = isSevere && total > 0 ? "text-red-600 font-bold" : "text-ink";
    
    return (
      <tr className="border-b border-line hover:bg-cream/50 transition-colors">
          <td className="px-6 py-3 pl-10 font-medium text-ink">{label}</td>
          <td className={`px-6 py-3 text-center ${colorClass}`}>{m}</td>
          <td className={`px-6 py-3 text-center ${colorClass}`}>{f}</td>
          <td className={`px-6 py-3 text-center font-bold ${colorClass}`}>{total}</td>
      </tr>
    );
  };

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F9F8F3; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7a1723; }
      `}</style>

      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-ink">Administrative Reports</h2>
                    <p className="text-sm text-muted mt-1">Generate required FHSIS-aligned summaries for DOH compliance.</p>
                </div>
            </div>

            <div className="bg-paper rounded-xl shadow-sm border border-line p-5 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-end">
                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Month</label>
                        <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-40 border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none bg-paper text-ink shadow-sm cursor-pointer">
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-full sm:w-28 border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none shadow-sm text-center bg-paper text-ink" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Report Type</label>
                        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none bg-paper text-ink shadow-sm cursor-pointer">
                            <option value="monthly">Monthly OPT Plus Summary</option>
                            <option value="quarterly">Quarterly Area Report</option>
                        </select>
                    </div>
                    
                    <div className="flex items-end w-full sm:w-auto mt-2 sm:mt-0">
                        <button onClick={generateReport} disabled={isGenerating} className="w-full bg-maroon hover:bg-maroon_dark text-paper px-5 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center disabled:opacity-50">
                            {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : <i className="fa-solid fa-arrows-rotate mr-2"></i>}
                            Generate
                        </button>
                    </div>
                </div>

                <div className="flex flex-row gap-3 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-line pt-4 lg:pt-0 lg:pl-6">
                    <button onClick={exportPDF} className="flex-1 lg:flex-none bg-paper border border-line hover:border-red-400 hover:bg-red-50 text-ink px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center group">
                        <i className="fa-solid fa-file-pdf text-red-500 mr-2 group-hover:scale-110 transition-transform"></i> PDF
                    </button>
                    <button onClick={exportExcel} className="flex-1 lg:flex-none bg-paper border border-line hover:border-green-400 hover:bg-green-50 text-ink px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center group">
                        <i className="fa-solid fa-file-excel text-green-600 mr-2 group-hover:scale-110 transition-transform"></i> Excel
                    </button>
                </div>
            </div>

            <div className="bg-paper rounded-xl shadow-sm border border-line flex flex-col flex-1 overflow-hidden relative">
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-paper/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                      <i className="fa-solid fa-circle-notch fa-spin text-maroon text-4xl mb-3"></i>
                      <p className="text-maroon font-medium">Aggregating records...</p>
                  </div>
                )}

                <div className="p-5 border-b border-line bg-cream flex justify-between items-center">
                    <h3 className="font-bold text-ink flex items-center">
                        <i className="fa-solid fa-table-list text-maroon mr-2"></i> Report Preview
                    </h3>
                    <span className="text-xs font-semibold text-muted bg-paper border border-line px-2 py-1 rounded">
                      {previewSubtitle}
                    </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-1 pb-10">
                    <table id="reportTable" className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                        <thead>
                            <tr className="bg-paper text-muted text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold border-b border-line">Nutritional Status</th>
                                <th className="px-6 py-4 font-semibold border-b border-line text-center w-32">Male</th>
                                <th className="px-6 py-4 font-semibold border-b border-line text-center w-32">Female</th>
                                <th className="px-6 py-4 font-semibold border-b border-line text-center w-32 text-maroon">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-ink">
                            
                            {/* WEIGHT FOR AGE */}
                            <tr className="bg-cream/50 border-y-2 border-line">
                                <td colSpan="4" className="px-6 py-2.5 font-bold text-ink text-xs uppercase tracking-wider">
                                    <i className="fa-solid fa-weight-scale mr-2 text-maroon/60"></i> Weight-for-Age (WFA)
                                </td>
                            </tr>
                            <DataRow label="Normal" data={stats.wfa.Normal} />
                            <DataRow label="Underweight" data={stats.wfa.Underweight} />
                            <DataRow label="Severely Underweight" data={stats.wfa.Severely_Underweight} isSevere={true} />
                            <DataRow label="Overweight" data={stats.wfa.Overweight} />

                            {/* HEIGHT FOR AGE */}
                            <tr className="bg-cream/50 border-y-2 border-line">
                                <td colSpan="4" className="px-6 py-2.5 font-bold text-ink text-xs uppercase tracking-wider">
                                    <i className="fa-solid fa-ruler-vertical mr-2 text-maroon/60"></i> Height-for-Age (HFA)
                                </td>
                            </tr>
                            <DataRow label="Normal" data={stats.hfa.Normal} />
                            <DataRow label="Stunted" data={stats.hfa.Stunted} />
                            <DataRow label="Severely Stunted" data={stats.hfa.Severely_Stunted} isSevere={true} />
                            <DataRow label="Tall" data={stats.hfa.Tall} />

                            {/* WEIGHT FOR LENGTH/HEIGHT */}
                            <tr className="bg-cream/50 border-y-2 border-line">
                                <td colSpan="4" className="px-6 py-2.5 font-bold text-ink text-xs uppercase tracking-wider">
                                    <i className="fa-solid fa-child mr-2 text-maroon/60"></i> Weight-for-Length/Height (WFL/WHZ)
                                </td>
                            </tr>
                            <DataRow label="Normal" data={stats.wfl.Normal} />
                            <DataRow label="Wasted" data={stats.wfl.Wasted} />
                            <DataRow label="Severely Wasted" data={stats.wfl.Severely_Wasted} isSevere={true} />
                            <DataRow label="Overweight" data={stats.wfl.Overweight} />
                            <DataRow label="Obese" data={stats.wfl.Obese} />
                            
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Toast */}
      <div className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl shadow-2xl flex items-center transform transition-all duration-300 z-50 pointer-events-none border ${toastMessage.show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'} ${toastMessage.type === 'error' ? 'bg-paper border-maroon' : toastMessage.type === 'info' ? 'bg-ink border-line' : 'bg-ink border-line'}`}>
          <div className={`${toastMessage.type === 'error' ? 'bg-maroon' : toastMessage.type === 'info' ? 'bg-blue-500' : 'bg-brand_green'} rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`}>
              <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-triangle-exclamation' : toastMessage.type === 'info' ? 'fa-circle-info' : 'fa-check'} text-sm text-paper`}></i>
          </div>
          <div>
              <p className="text-sm font-semibold mb-0.5 text-paper">{toastMessage.title}</p>
              <p className="text-xs text-paper/80">{toastMessage.message}</p>
          </div>
      </div>

    </div>
  );
}