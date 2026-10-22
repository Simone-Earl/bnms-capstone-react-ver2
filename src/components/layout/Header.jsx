// src/components/layout/Header.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }) {
  const { userProfile, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-maroon border-b border-maroon_dark flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
      <div className="flex items-center">
        <button onClick={onMenuClick} className="lg:hidden text-paper hover:text-gold focus:outline-none mr-4 transition">
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <h1 className="text-xl font-semibold text-paper hidden sm:block">BNMS Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4 sm:space-x-6">
        <button className="relative text-paper/80 hover:text-paper transition">
          <i className="fa-regular fa-bell text-xl"></i>
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-maroon"></span>
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-maroon_dark p-1.5 rounded-lg transition"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="h-9 w-9 rounded-full bg-paper flex items-center justify-center text-maroon font-bold text-sm shadow-sm">
              {getInitials(userProfile?.full_name)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <p className="font-semibold text-paper leading-tight text-sm">{userProfile?.full_name || 'Loading...'}</p>
              <p className="text-paper/80 text-xs font-medium">{userProfile?.role === 'worker' ? 'BNS Worker - Brgy. Epza' : 'Parent / Guardian'}</p>
            </div>
            <i className={`fa-solid fa-chevron-down text-paper/80 text-xs transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
          </div>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-paper rounded-lg shadow-xl border border-line py-1 z-50 overflow-hidden transform origin-top-right transition-all">
              <div className="px-4 py-3 border-b border-line md:hidden">
                <p className="text-sm font-semibold text-ink truncate">{userProfile?.full_name}</p>
                <p className="text-xs text-muted truncate">{userProfile?.email}</p>
              </div>
              
              {/* 🔥 UPDATED NAVIGATION LINKS */}
              <button 
                onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-cream transition flex items-center"
              >
                <i className="fa-regular fa-user mr-3 text-muted w-4 text-center"></i> My Profile
              </button>
              
              <button 
                onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-cream transition flex items-center"
              >
                <i className="fa-solid fa-gear mr-3 text-muted w-4 text-center"></i> Settings
              </button>
              
              <div className="border-t border-line my-1"></div>
              
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-maroon hover:bg-maroon_light/10 transition flex items-center font-bold"
              >
                <i className="fa-solid fa-arrow-right-from-bracket mr-3 w-4 text-center"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}