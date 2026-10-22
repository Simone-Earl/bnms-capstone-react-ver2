// src/pages/Settings.jsx
import { useState } from 'react';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export default function Settings() {
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handlePasswordReset = async () => {
    if (currentUser?.email) {
      try {
        await sendPasswordResetEmail(auth, currentUser.email);
        setResetSent(true);
        setTimeout(() => setResetSent(false), 5000);
      } catch (error) {
        console.error("Error sending reset email", error);
        alert("Failed to send password reset email.");
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-cream text-ink font-sans antialiased overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-ink bg-opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onMenuClick={toggleSidebar} />

        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-cream p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-ink mb-6">Account Settings</h2>

            <div className="space-y-6">
              <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden">
                <div className="px-6 py-4 border-b border-line bg-cream/50">
                  <h3 className="font-bold text-ink"><i className="fa-solid fa-shield-halved text-maroon mr-2"></i>Security</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="mb-4 sm:mb-0">
                      <p className="font-medium text-ink">Change Password</p>
                      <p className="text-sm text-muted">A secure link will be sent to {currentUser?.email}</p>
                    </div>
                    <button 
                      onClick={handlePasswordReset}
                      disabled={resetSent}
                      className="px-4 py-2 bg-maroon hover:bg-maroon_dark text-paper rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                    >
                      {resetSent ? 'Email Sent!' : 'Send Reset Link'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-paper rounded-xl shadow-sm border border-line overflow-hidden">
                <div className="px-6 py-4 border-b border-line bg-cream/50">
                  <h3 className="font-bold text-ink"><i className="fa-solid fa-sliders text-maroon mr-2"></i>Preferences</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">Email Notifications</p>
                      <p className="text-sm text-muted">Receive alerts for severely wasted classifications.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand_green"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}