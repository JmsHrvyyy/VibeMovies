import { Link } from "react-router-dom";

const Sidebar = ({ isOpen, user }) => {
  const menuItems = [
    { name: "Home", icon: "🏠", path: "/" },
    { name: "Watchlist", icon: "📁", path: "/watchlist" },
    { name: "Profile", icon: "👤", path: "/profile" },
    { name: "Settings", icon: "⚙️", path: "/settings" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" />
      )}

      <aside
        className={`bg-gray-900 h-[calc(100vh-73px)] sticky top-[73px] transition-all duration-300 border-r border-gray-800 flex flex-col z-50
        fixed lg:sticky overflow-hidden
        ${isOpen ? "w-full lg:w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0 lg:border-none lg:opacity-0"}`}
      >
        {/* 
           Importante: Ang wrapper na ito ay dapat may fixed width (w-64) 
           para hindi mag-squish ang text habang nag-ko-close ang sidebar.
        */}
        <div
          className={`w-64 p-6 flex flex-col h-full transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">
            Menu
          </p>
          <nav className="flex flex-col gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-blue-600 hover:text-white transition-all group whitespace-nowrap"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Preview Box */}
          {user && (
            <div className="mt-auto mb-4 bg-white/5 p-4 rounded-3xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 w-48">
                {" "}
                {/* Fixed width para hindi mag-wrap */}
                <img
                  src={user.photoURL}
                  className="w-10 h-10 rounded-full border-2 border-blue-500 shrink-0"
                  alt=""
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-white">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Premium</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Assistant Box */}
          <div className="mt-4 pb-8 lg:pb-0">
            <div className="bg-gray-800 rounded-3xl p-5 border border-gray-700 w-52">
              <p className="text-sm text-blue-400 font-bold mb-2">
                AI Assistant
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ready to help you find your next favorite movie.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
