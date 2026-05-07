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
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo & Hamburger */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-800 rounded-lg lg:hidden transition-colors"
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
          <Link
            to="/"
            className="text-xl font-black text-white tracking-tighter"
          >
            VIBE<span className="text-blue-500">MOVIES</span>
          </Link>
        </div>

        {/* Right Section: Profile Shortcut (Visible only on Desktop) */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden lg:flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10">
              <Link to="/profile">
                <img
                  src={user.photoURL}
                  className="w-8 h-8 rounded-full border border-blue-500"
                  alt=""
                />
              </Link>
              <span className="text-sm font-medium text-gray-200">
                {user.displayName.split(" ")[0]}
              </span>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-blue-600 text-sm px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
