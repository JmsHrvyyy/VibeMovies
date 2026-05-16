import { Link } from "react-router-dom";
import { logout } from "../services/auth";

const Sidebar = ({ isOpen, setIsOpen, user }) => {
  const menuItems = [
    { name: "Home", icon: "🏠", path: "/" },
    { name: "Newsfeed", icon: "📰", path: "/feed" },
    { name: "Watchlist", icon: "📁", path: "/watchlist" },
    { name: "Watched Movies", icon: "✅", path: "/watched" },
    { name: "Profile", icon: "👤", path: "/profile" },
    { name: "Settings", icon: "⚙️", path: "/settings" },
  ];

  return (
    <>
      {/* 1. BLUR OVERLAY (Mobile Only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 2. SIDEBAR CONTAINER */}
      <aside
        className={`bg-gray-900 border-r border-gray-800 flex flex-col z-[70] transition-transform duration-300 ease-in-out
        /* Mobile: Fixed overlay */
        fixed inset-y-0 left-0 w-64
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        /* Desktop: Persistent & Sticky */
        lg:static lg:h-[calc(100vh-73px)] lg:sticky lg:top-[73px]`}
      >
        {/* 3. CONTENT WRAPPER - Dito natin ilalagay ang fixed width */}
        <div className="w-full flex flex-col h-full p-4 overflow-y-auto">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 px-4">
            Menu
          </p>

          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-white/5 transition-all whitespace-nowrap"
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* 4. USER SECTION */}
          {user && (
            <div className="mt-auto mb-4 bg-white/5 p-4 rounded-3xl border border-white/10 mx-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={user.photoURL}
                  className="w-10 h-10 rounded-full border-2 border-blue-500 shrink-0 object-cover"
                  alt="Profile"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-white">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                    Premium
                  </p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="w-full py-2.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-all"
              >
                Logout Account
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
