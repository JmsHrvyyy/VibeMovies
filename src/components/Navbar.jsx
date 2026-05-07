import { useState } from "react";
import { Link } from "react-router-dom"; // Import Link para sa navigation
import { loginWithGoogle, logout } from "../services/auth";

const Navbar = ({ onSearch, toggleSidebar, user }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-4 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
        {/* Logo Section */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <Link to="/">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent truncate max-w-[120px] md:max-w-none">
              VibeMovies
            </h1>
          </Link>
        </div>

        {/* Search Bar Section */}
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 max-w-md mx-2 md:mx-0"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-full border border-white/10"></div>
          <input
            type="text"
            placeholder="Search movies..."
            className="relative w-full bg-transparent text-white pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none placeholder:text-gray-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-500 absolute left-4 top-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </form>

        {/* User / Login Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-gray-300">
                {user.displayName.split(" ")[0]}
              </span>
              <Link to="/profile">
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-blue-500 hover:scale-105 transition-transform cursor-pointer"
                />
              </Link>
              <button
                onClick={logout}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-semibold text-sm transition-all active:scale-95"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
