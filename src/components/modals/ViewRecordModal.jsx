// src/components/modals/ViewRecordModal.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ViewRecordModal({ record, onClose }) {
  const [zScores, setZScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const q = query(
          collection(db, "nutrition_classifications"),
          where("record_id", "==", record.id)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setZScores(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error fetching Z-Scores:", error);
      } finally {
        setLoading(false);
      }
    };

    if (record) {
      fetchClassifications();
    }
  }, [record]);

  if (!record) return null;

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-paper rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden transform transition-all border-t-8 border-maroon">
        
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper">
          <div>
            <h3 className="text-lg font-bold text-ink">Weigh-in Details</h3>
            <p className="text-xs text-muted mt-0.5">{record.visit_date} • {record.child_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition focus:outline-none">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        <div className="px-6 py-5 bg-paper space-y-6">
          
          {/* Raw Measurements */}
          <div>
            <h4 className="text-xs font-bold text-maroon uppercase tracking-wider mb-3 border-b border-line pb-2">
              Raw Measurements
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-cream p-3 rounded-lg border border-line">
                <p className="text-xs text-muted mb-1">Height</p>
                <p className="font-bold text-ink">{record.height_cm} <span className="text-xs font-normal">cm</span></p>
              </div>
              <div className="bg-cream p-3 rounded-lg border border-line">
                <p className="text-xs text-muted mb-1">Weight</p>
                <p className="font-bold text-ink">{record.weight_kg} <span className="text-xs font-normal">kg</span></p>
              </div>
              <div className="bg-cream p-3 rounded-lg border border-line">
                <p className="text-xs text-muted mb-1">MUAC</p>
                <p className="font-bold text-ink">{record.muac_cm || '--'} <span className="text-xs font-normal">cm</span></p>
              </div>
            </div>
          </div>

          {/* Computed Z-Scores */}
          <div>
            <h4 className="text-xs font-bold text-maroon uppercase tracking-wider mb-3 border-b border-line pb-2">
              WHO Z-Scores (LMS Method)
            </h4>
            
            {loading ? (
              <div className="text-center py-4 text-muted text-sm">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Fetching calculations...
              </div>
            ) : zScores ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded hover:bg-cream transition">
                  <span className="text-sm font-medium text-ink">Weight-for-Age (WAZ)</span>
                  <span className={`font-mono text-sm font-bold ${zScores.waz < -2 ? 'text-maroon_light' : 'text-brand_green'}`}>
                    {zScores.waz > 0 ? '+' : ''}{zScores.waz}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded hover:bg-cream transition">
                  <span className="text-sm font-medium text-ink">Height-for-Age (HAZ)</span>
                  <span className={`font-mono text-sm font-bold ${zScores.haz < -2 ? 'text-gold' : 'text-brand_green'}`}>
                    {zScores.haz > 0 ? '+' : ''}{zScores.haz}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded hover:bg-cream transition">
                  <span className="text-sm font-medium text-ink">Weight-for-Height (WHZ)</span>
                  <span className={`font-mono text-sm font-bold ${zScores.whz_bmi < -2 ? 'text-maroon_light' : zScores.whz_bmi > 2 ? 'text-orange-500' : 'text-brand_green'}`}>
                    {zScores.whz_bmi > 0 ? '+' : ''}{zScores.whz_bmi}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-2">No classification data found.</p>
            )}
          </div>

          {/* Final Classification Badge */}
          <div className="bg-maroon_light/10 p-4 rounded-lg flex justify-between items-center border border-maroon_light/20">
            <span className="text-sm font-bold text-maroon">Final Status</span>
            <span className="font-bold text-ink">{record.classification_result}</span>
          </div>

        </div>
      </div>
    </div>
  );
}