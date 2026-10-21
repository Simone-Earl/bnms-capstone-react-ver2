// src/components/modals/ConfirmModal.jsx
export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  isDanger = true 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#3a2c2c]/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-[#ffffff] rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden transform transition-all border-t-4 border-[#7a1330]">
        
        <div className="p-6">
          <div className="flex items-start">
            {/* Dynamic Icon: Red warning for Danger, Gold question mark for standard confirm */}
            <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${isDanger ? 'bg-[#a83250]/10 text-[#a83250]' : 'bg-[#d9a017]/10 text-[#d9a017]'} sm:mx-0 sm:h-10 sm:w-10`}>
              <i className={`fa-solid ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-lg`}></i>
            </div>
            
            <div className="ml-4 mt-0 text-left">
              <h3 className="text-lg font-bold text-[#3a2c2c] leading-6">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-[#8a7a72]">{message}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#faf6ee] px-6 py-4 flex justify-end space-x-3 border-t border-[#d9cfc2]">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 border border-[#d9cfc2] rounded-lg text-sm font-medium text-[#3a2c2c] bg-[#ffffff] hover:bg-gray-50 transition focus:outline-none"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 rounded-lg text-sm font-medium text-[#ffffff] transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDanger ? 'bg-[#7a1330] hover:bg-[#54001c] focus:ring-[#7a1330]' : 'bg-[#d9a017] hover:bg-[#b08010] focus:ring-[#d9a017]'}`}
          >
            {confirmText}
          </button>
        </div>
        
      </div>
    </div>
  );
}