const Sidebar = ({ isOpen }) => {
  const menuItems = [
    { name: "Home", icon: "🏠" },
    { name: "Watchlist", icon: "📁" },
    { name: "Favorites", icon: "⭐" },
    { name: "Recommendations", icon: "🤖" },
    { name: "Settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Overlay Background para sa Mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" />
      )}

      <aside
        className={`bg-gray-900 h-[calc(100vh-73px)] sticky top-[73px] transition-all duration-300 border-r border-gray-800 overflow-hidden flex flex-col z-50
        fixed lg:sticky
        ${isOpen ? "w-full lg:w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0 lg:border-none lg:opacity-0"}`}
      >
        <div className="w-full lg:w-64 p-6 flex flex-col h-full">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">
            Menu
          </p>
          <nav className="flex flex-col gap-3">
            {menuItems.map((item) => (
              <button
                key={item.name}
                className="flex items-center gap-4 px-4 py-4 lg:py-3 rounded-2xl text-gray-400 hover:bg-blue-600 hover:text-white transition-all group"
              >
                <span className="text-2xl lg:text-xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-semibold lg:font-medium text-lg lg:text-base whitespace-nowrap">
                  {item.name}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pb-8 lg:pb-0">
            <div className="bg-gray-800 rounded-3xl p-5 border border-gray-700">
              <p className="text-base lg:text-sm text-blue-400 font-bold mb-2">
                AI Assistant
              </p>
              <p className="text-sm lg:text-xs text-gray-400 leading-relaxed">
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
