import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getTrendingMovies, searchMovies } from "./services/api";
import Navbar from "./components/Navbar";
import MovieCard from "./components/MovieCard";
import Sidebar from "./components/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Profile from "./pages/Profile";

function App() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    const data = await getTrendingMovies();
    setMovies(data);
    setLoading(false);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      loadTrending();
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
          {/* Sa loob ng App.jsx return statement */}
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen} // ITO ANG DAGDAG
            user={user}
          />

          <main className="flex-1 min-w-0 bg-[#080d17]">
            <Routes>
              <Route
                path="/"
                element={
                  <div className="p-4 md:p-8">
                    <header className="mb-8 flex justify-between items-center">
                      <h2 className="text-2xl font-bold">Explore Movies</h2>
                      <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                        {movies.length} Movies Found
                      </div>
                    </header>

                    {loading ? (
                      <div className="flex justify-center h-64 items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {movies.map((movie) => (
                          <MovieCard key={movie.id} movie={movie} />
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
              <Route path="/profile" element={<Profile user={user} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
