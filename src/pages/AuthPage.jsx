// src/pages/AuthPage.jsx
import { useState } from 'react';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; // Added getDoc
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    role: 'parent',
    inviteCode: '' // NEW FIELD
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        navigate('/dashboard');
      } else {
        
        // --- 🔒 SECURITY CHECK: VERIFY WORKER INVITE CODE ---
        if (formData.role === 'worker') {
          if (!formData.inviteCode) {
            setError("BNS Workers require an authorized Barangay Access Code.");
            setLoading(false);
            return;
          }

          // Try to fetch the specific code from the database
          const inviteRef = doc(db, "worker_invites", formData.inviteCode);
          const inviteSnap = await getDoc(inviteRef);

          if (!inviteSnap.exists()) {
            setError("Invalid or expired Barangay Access Code.");
            setLoading(false);
            return;
          }
        }
        // -----------------------------------------------------

        // Handle Registration
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Save identity and authorized role to Firestore
        await setDoc(doc(db, "users", user.uid), {
          full_name: formData.fullName,
          email: formData.email,
          role: formData.role, 
          created_at: serverTimestamp()
        });
        
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
      else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
      else setError("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-paper rounded-2xl shadow-xl overflow-hidden border-t-8 border-maroon">
        
        <div className="px-8 pt-8 pb-6 bg-maroon text-center">
          <i className="fa-solid fa-shield-halved text-4xl text-gold mb-3"></i>
          <h2 className="text-2xl font-bold text-paper">BNMS Portal</h2>
          <p className="text-paper/80 text-sm mt-1">Secure Barangay Nutrition Monitoring</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-maroon_light/10 border-l-4 border-maroon text-maroon p-3 rounded mb-6 text-sm flex items-center">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full border border-line rounded-lg px-4 py-2 focus:ring-2 focus:ring-maroon outline-none bg-paper text-ink" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Account Type</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-line rounded-lg px-4 py-2 focus:ring-2 focus:ring-maroon outline-none bg-paper text-ink">
                    <option value="parent">Parent / Guardian</option>
                    <option value="worker">BNS / RHU Health Worker</option>
                  </select>
                </div>

                {/* DYNAMIC FIELD: Only shows if they try to register as a worker */}
                {formData.role === 'worker' && (
                  <div className="bg-gold/10 p-4 rounded-lg border border-gold/30">
                    <label className="block text-sm font-bold text-ink mb-1">
                      <i className="fa-solid fa-lock text-gold mr-1"></i> Barangay Access Code
                    </label>
                    <p className="text-xs text-muted mb-2">Required for Health Worker clearance.</p>
                    <input type="text" name="inviteCode" value={formData.inviteCode} onChange={handleChange} placeholder="Enter security code" required className="w-full border border-gold/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gold outline-none bg-paper text-ink" />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border border-line rounded-lg px-4 py-2 focus:ring-2 focus:ring-maroon outline-none bg-paper text-ink" />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" className="w-full border border-line rounded-lg px-4 py-2 focus:ring-2 focus:ring-maroon outline-none bg-paper text-ink" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-maroon hover:bg-maroon_dark text-paper font-bold py-3 px-4 rounded-lg transition mt-6 disabled:opacity-50">
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-maroon font-bold hover:underline focus:outline-none">
              {isLogin ? 'Sign up here' : 'Sign in here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}