export default function Header({ onMenuClick }) {
  return (
    <header className="h-16 bg-maroon shadow-md flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick} 
          className="lg:hidden text-paper/80 hover:text-paper focus:outline-none mr-4"
        >
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <h1 className="text-xl font-semibold text-paper hidden sm:block">BNMS Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Notification */}
        <button className="relative text-paper/80 hover:text-paper transition">
          <i className="fa-regular fa-bell text-xl"></i>
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-maroon"></span>
        </button>
        
        {/* Profile */}
        <div className="flex items-center space-x-3 cursor-pointer">
          <img 
            src="https://placehold.co/100x100/ffffff/7a1330?text=JD" 
            alt="User Profile" 
            className="h-9 w-9 rounded-full object-cover border-2 border-paper/20 shadow-sm"
          />
          <div className="hidden md:block text-sm">
            <p className="font-semibold text-paper leading-tight">Juan Dela Cruz</p>
            <p className="text-paper/70 text-xs">BNS Worker - Brgy. Epza</p>
          </div>
          <i className="fa-solid fa-chevron-down text-paper/70 text-xs hidden md:block"></i>
        </div>
      </div>
    </header>
  );
}