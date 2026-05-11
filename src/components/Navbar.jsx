// Navbar.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { loginWithGoogle } from "../services/auth";

const Navbar = ({ onSearch, toggleSidebar, user }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-4 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 md:gap-4 min-w-fit">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-800 rounded-lg lg:hidden"
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

        {/* MIDDLE: SEARCH BAR (DAGDAG ITO) */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 max-w-md relative group hidden md:block"
        >
          <input
            type="text"
            placeholder="Search for movies..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value); // Real-time search
            }}
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-12 py-2.5 rounded-full focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500"
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

        {/* Right Section: Profile */}
        <div className="flex items-center gap-4 min-w-fit">
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10">
              <Link to="/profile">
                <img
                  src={user.photoURL}
                  className="w-8 h-8 rounded-full border border-blue-500"
                  alt=""
                />
              </Link>
              <span className="text-sm font-medium text-gray-200 hidden sm:block">
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
