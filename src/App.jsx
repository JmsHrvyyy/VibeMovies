import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getTrendingMovies, searchMovies } from "./services/api";
import Navbar from "./components/Navbar";
import MovieCard from "./components/MovieCard";
import Sidebar from "./components/Sidebar";

function App() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    // Pakikinggan nito kung may nag-login o logout
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Navbar
        user={user} // Ipasa ang user sa Navbar[cite: 6]
        onSearch={handleSearch}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="flex-1 p-4 md:p-8 transition-all duration-300">
          <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-200">Explore Movies</h2>
            <div className="w-fit text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
              {movies.length} Movies Found
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
