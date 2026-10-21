// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';

export default function Sidebar({ isOpen }) {
  return (
    <aside 
      className={`bg-maroon w-64 h-full border-r border-maroon_dark flex flex-col transition-transform duration-300 ease-in-out transform fixed lg:static z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-maroon_dark">
        <i className="fa-solid fa-child-reaching text-paper text-2xl mr-3"></i>
        <span className="text-xl font-bold tracking-tight text-paper">BNMS</span>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-chart-pie w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Dashboard
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/profiles" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-users w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Children Profiles
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/weigh-in" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-scale-balanced w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Weigh-in Entry
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/growth-charts" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-arrow-trend-up w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Growth Charts
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/referrals" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-notes-medical w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Referrals
                </>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group border-l-4 ${isActive ? 'bg-maroon_light text-paper border-gold' : 'text-paper/80 hover:bg-maroon_dark hover:text-paper border-transparent'}`}
            >
              {({ isActive }) => (
                <>
                  <i className={`fa-solid fa-file-contract w-6 text-center mr-2 ${isActive ? '' : 'text-paper/60 group-hover:text-paper'}`}></i>
                  Reports
                </>
              )}
            </NavLink>
          </li>
        </ul>
      </nav>
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-maroon_dark">
        <div className="bg-maroon_dark rounded-xl p-4">
          <div className="flex items-center text-paper mb-2">
            <i className="fa-solid fa-circle-info mr-2"></i>
            <h4 className="text-sm font-semibold">Help Center</h4>
          </div>
          <p className="text-xs text-paper/80 mb-3">Need assistance with the WHO standards or system?</p>
          <button className="text-xs font-medium bg-paper text-maroon px-3 py-1.5 rounded-lg w-full hover:bg-cream transition shadow-sm">
            Contact Admin
          </button>
        </div>
      </div>
    </aside>
  );
}