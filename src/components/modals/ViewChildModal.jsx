// src/components/modals/ViewChildModal.jsx
export default function ViewChildModal({ child, onClose }) {
  if (!child) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "Normal": return "text-brand_green bg-brand_green/10 border-brand_green/20";
      case "Stunted": return "text-gold bg-gold/10 border-gold/20";
      case "Severely Wasted": 
      case "Wasted": return "text-maroon bg-maroon_light/10 border-maroon_light/20";
      case "Overweight": return "text-orange-600 bg-orange-100 border-orange-200";
      default: return "text-muted bg-line/50 border-line";
    }
  };

  // 🔥 NEW: Human-readable age formatter
  const formatAge = (months) => {
    if (months === undefined || months === null || isNaN(months)) return 'N/A';
    if (months < 12) return `${months} mo (Infant)`;
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    return `${yrs} yr${yrs > 1 ? 's' : ''}${mos > 0 ? ` ${mos} mo` : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-paper rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden transform transition-all border-t-8 border-maroon">
        
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper">
          <div>
            <h3 className="text-lg font-bold text-ink">Child Profile</h3>
            <p className="text-xs text-muted mt-0.5">Barangay Nutrition Database</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition focus:outline-none">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        <div className="px-6 py-6 bg-paper space-y-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-cream rounded-full border-2 border-line flex items-center justify-center text-maroon text-2xl">
              <i className={child.sex === 'M' ? "fa-solid fa-child" : "fa-solid fa-child-dress"}></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">{child.first_name} {child.last_name}</h2>
              <p className="text-sm text-muted font-mono">ID: #{child.display_id || child.id.substring(0,6).toUpperCase()}</p>
            </div>
          </div>

          <div className={`p-3 rounded-lg border flex justify-between items-center ${getStatusColor(child.current_status)}`}>
            <span className="text-sm font-bold uppercase tracking-wider">Current Status</span>
            <span className="font-bold">{child.current_status || 'Unassessed'}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cream p-3 rounded-lg border border-line">
              <p className="text-xs text-muted mb-1">Age</p>
              {/* Applied formatter here */}
              <p className="font-semibold text-ink">{formatAge(child.current_age_mo)}</p>
            </div>
            <div className="bg-cream p-3 rounded-lg border border-line">
              <p className="text-xs text-muted mb-1">Sex</p>
              <p className="font-semibold text-ink">{child.sex === 'M' ? 'Male' : child.sex === 'F' ? 'Female' : 'N/A'}</p>
            </div>
            <div className="bg-cream p-3 rounded-lg border border-line">
              <p className="text-xs text-muted mb-1">Date of Birth</p>
              <p className="font-semibold text-ink">{child.dob || 'N/A'}</p>
            </div>
            <div className="bg-cream p-3 rounded-lg border border-line">
              <p className="text-xs text-muted mb-1">Location</p>
              <p className="font-semibold text-ink">Purok {child.purok || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-cream p-3 rounded-lg border border-line">
            <p className="text-xs text-muted mb-1"><i className="fa-solid fa-house-user mr-1"></i> Parent / Guardian</p>
            <p className="font-semibold text-ink">{child.guardian || 'N/A'}</p>
          </div>

        </div>
      </div>
    </div>
  );
}