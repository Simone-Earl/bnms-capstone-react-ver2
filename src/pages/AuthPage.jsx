// src/pages/AuthPage.jsx
import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    fullName: '', 
    role: '', 
    inviteCode: '' 
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setError('');
  }, [isLogin]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("The passwords you entered do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        navigate('/dashboard');
      } else {
        
        if (!formData.inviteCode) {
          setError(`Please enter your ${formData.role === 'worker' ? 'Barangay Access Code' : 'Household ID'}.`);
          setLoading(false);
          return;
        }

        const collectionName = formData.role === 'worker' ? 'worker_invites' : 'household_invites';
        const inviteRef = doc(db, collectionName, formData.inviteCode);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setError(`Invalid ${formData.role === 'worker' ? 'Access Code' : 'Household ID'}. Please check for typos.`);
          setLoading(false);
          return;
        }

        if (inviteSnap.data().is_used === true) {
          setError("This code has already been used to register an account.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          full_name: formData.fullName,
          email: formData.email,
          role: formData.role, 
          employee_id: formData.role === 'worker' ? formData.inviteCode : null, 
          household_id: formData.role === 'parent' ? formData.inviteCode : null,
          created_at: serverTimestamp()
        });

        await updateDoc(inviteRef, {
          is_used: true,
          used_by: user.uid,
          claimed_at: serverTimestamp()
        });
        
        navigate('/dashboard');
      }
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
        else if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
        else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
        else setError("An error occurred during authentication. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-sans antialiased flex items-center justify-center p-4 overflow-x-hidden">
      
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      <div className="max-w-4xl w-full bg-paper rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
        
        <div className="w-full md:w-5/12 bg-gradient-to-b from-maroon to-maroon_dark text-paper p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-paper opacity-5"></div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 rounded-full bg-gold opacity-10"></div>

            <div className="relative z-10">
                <div className="flex items-center mb-8">
                    <div className="bg-paper text-maroon w-10 h-10 rounded-full flex items-center justify-center mr-3 shadow-md">
                        <i className="fa-solid fa-child-reaching text-xl"></i>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">BNMS</span>
                </div>
                
                <h2 className="text-3xl font-bold mb-4 leading-tight">Barangay Nutrition<br />Monitoring System</h2>
                <p className="text-paper/80 mb-6 text-sm leading-relaxed">
                    Empowering local communities with digital tools to track, analyze, and improve child nutrition effectively.
                </p>
            </div>
            
            <div className="relative z-10 hidden md:block">
                <div className="bg-paper/10 backdrop-blur-sm p-4 rounded-xl border border-paper/20">
                    <p className="text-xs text-paper font-medium italic">
                        "Healthy children are the foundation of a prosperous community. Let's work together to end malnutrition."
                    </p>
                </div>
            </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-12 relative bg-paper min-h-[500px] flex flex-col justify-center">
            
            {error && (
              <div className="bg-maroon_light/10 border-l-4 border-maroon text-maroon p-3 rounded-lg mb-6 text-sm flex items-center shadow-sm animate-fade-in">
                <i className="fa-solid fa-triangle-exclamation mr-3 text-lg"></i> {error}
              </div>
            )}

            {isLogin ? (
              <div className="w-full animate-fade-in" key="login">
                  <div className="mb-8 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-ink mb-2">Welcome Back</h3>
                      <p className="text-sm text-muted">Please sign in to your account to continue.</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                      <div className="space-y-5">
                          <div>
                              <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-regular fa-envelope"></i>
                                  </div>
                                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" className="w-full border border-line rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                              </div>
                          </div>

                          <div>
                              <div className="flex items-center justify-between mb-1">
                                  <label className="block text-sm font-medium text-ink">Password</label>
                                  <a href="#" className="text-xs font-medium text-maroon hover:text-maroon_dark transition">Forgot password?</a>
                              </div>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-solid fa-lock"></i>
                                  </div>
                                  <input type={showLoginPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                                  <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink focus:outline-none">
                                      <i className={`fa-regular ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                  </button>
                              </div>
                          </div>

                          <div className="flex items-center">
                              <input id="remember-me" type="checkbox" className="h-4 w-4 text-maroon focus:ring-maroon border-line rounded cursor-pointer" />
                              <label htmlFor="remember-me" className="ml-2 block text-sm text-muted cursor-pointer">
                                  Remember me for 30 days
                              </label>
                          </div>

                          <button type="submit" disabled={loading} className="w-full bg-maroon hover:bg-maroon_dark text-paper font-medium rounded-lg py-2.5 transition shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50">
                              {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Authenticating...</> : 'Sign In'}
                          </button>
                      </div>
                  </form>

                  <div className="mt-8 text-center">
                      <p className="text-sm text-muted">
                          Don't have an account? 
                          <button onClick={() => setIsLogin(false)} className="ml-1 font-semibold text-maroon hover:text-maroon_dark transition focus:outline-none hover:underline underline-offset-2">
                              Create an account
                          </button>
                      </p>
                  </div>
              </div>
            ) : (
              <div className="w-full animate-fade-in" key="signup">
                  <div className="mb-6 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-ink mb-2">Create an Account</h3>
                      <p className="text-sm text-muted">Join BNMS to track and monitor child nutrition.</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-regular fa-user"></i>
                                  </div>
                                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Juan Dela Cruz" className="w-full border border-line rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-regular fa-envelope"></i>
                                  </div>
                                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" className="w-full border border-line rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-ink mb-1">Account Role</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-solid fa-users-gear"></i>
                                  </div>
                                  <select name="role" value={formData.role} onChange={handleChange} required className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper appearance-none text-ink cursor-pointer">
                                      <option value="" disabled>Select your role...</option>
                                      <option value="parent">Parent / Guardian</option>
                                      <option value="worker">BNS / Health Worker</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                                      <i className="fa-solid fa-chevron-down text-xs"></i>
                                  </div>
                              </div>
                          </div>

                          {formData.role && (
                            <div className={`p-4 rounded-lg border mt-2 animate-fade-in ${formData.role === 'worker' ? 'bg-gold/10 border-gold/30' : 'bg-brand_green/10 border-brand_green/30'}`}>
                                <label className="block text-sm font-bold text-ink mb-1">
                                    <i className={`fa-solid fa-lock mr-1 ${formData.role === 'worker' ? 'text-gold' : 'text-brand_green'}`}></i> 
                                    {formData.role === 'worker' ? 'Barangay Access Code' : 'Household ID'}
                                </label>
                                <p className="text-xs text-muted mb-2">
                                  {formData.role === 'worker' ? 'Required for Health Worker clearance.' : 'Required to link to your barangay household data.'}
                                </p>
                                <input 
                                  type="text" 
                                  name="inviteCode" 
                                  value={formData.inviteCode} 
                                  onChange={handleChange} 
                                  placeholder={formData.role === 'worker' ? 'e.g. BNS-XXXXXX' : 'e.g. HH-XXXXXX'} 
                                  required 
                                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 outline-none bg-paper text-ink uppercase ${formData.role === 'worker' ? 'border-gold/50 focus:ring-gold' : 'border-brand_green/50 focus:ring-brand_green'}`} 
                                />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-ink mb-1">Password</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                          <i className="fa-solid fa-lock"></i>
                                      </div>
                                      <input type={showSignupPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" minLength="6" className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                                      <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink focus:outline-none">
                                          <i className={`fa-regular ${showSignupPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                      </button>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-ink mb-1">Confirm Password</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                                          <i className="fa-solid fa-lock"></i>
                                      </div>
                                      <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" minLength="6" className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-maroon outline-none transition bg-cream focus:bg-paper text-ink" />
                                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink focus:outline-none">
                                          <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                      </button>
                                  </div>
                              </div>
                          </div>

                          <button type="submit" disabled={loading} className="w-full bg-maroon hover:bg-maroon_dark text-paper font-medium rounded-lg py-2.5 mt-2 transition shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50">
                              {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Registering...</> : 'Register Account'}
                          </button>
                      </div>
                  </form>

                  <div className="mt-6 text-center">
                      <p className="text-sm text-muted">
                          Already have an account? 
                          <button onClick={() => setIsLogin(true)} className="ml-1 font-semibold text-maroon hover:text-maroon_dark transition focus:outline-none hover:underline underline-offset-2">
                              Log in here
                          </button>
                      </p>
                  </div>
              </div>
            )}

        </div>
      </div>
    </div>
  );
}