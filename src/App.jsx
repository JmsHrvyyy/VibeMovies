// App.jsx
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getTrendingMovies, searchMovies } from "./services/api";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import ArtistDetails from "./pages/ArtistDetails";

function App() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]); // Ito ang search results
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setMovies([]); // I-clear kung walang search
      return;
    }
    setLoading(true);
    const results = await searchMovies(query);
    setMovies(results);
    setLoading(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#080d17] text-white flex flex-col">
        <Navbar
          onSearch={handleSearch}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          user={user}
        />

        <div className="flex flex-1 relative">
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            user={user}
          />

          <main className="flex-1 min-w-0 bg-[#080d17]">
            <Routes>
              {/* GAMITIN ANG HOME COMPONENT DITO */}
              <Route
                path="/"
                element={
                  <Home
                    user={user}
                    searchResults={movies}
                    searchLoading={loading}
                  />
                }
              />
              <Route path="/tv/:id" element={<MovieDetails user={user} />} />
              <Route path="/movie/:id" element={<MovieDetails user={user} />} />
              <Route path="/artist/:id" element={<ArtistDetails />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/watchlist" element={<Watchlist user={user} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App; // Siguraduhing may default export
