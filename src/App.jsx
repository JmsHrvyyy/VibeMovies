// App.jsx
import { useEffect, useState } from 'react';
import { getTrendingMovies, searchMovies } from './services/api';

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // State para sa input ng user
  const [loading, setLoading] = useState(false);    // State para sa loading spinner/text

  // Initial load: Trending movies muna ang ipakita
  useEffect(() => {
    const loadTrending = async () => {
      const data = await getTrendingMovies();
      setMovies(data);
    };
    loadTrending();
  }, []);

  // // Function for Handle Search Submit
  const handleSearch = async (e) => {
    e.preventDefault(); // Iwasan ang pag-refresh ng page
    if (!searchQuery.trim()) return; // Huwag mag-search kung empty ang input

    setLoading(true);
    const results = await searchMovies(searchQuery);
    setMovies(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-500">Vibe Movies</h1>
      
      {/* // Search Bar Section */}
      <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12 flex gap-2">
        <input 
          type="text"
          placeholder="Search for a movie..."
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} // Update state habang nag-tytype
        />
        <button 
          type="submit"
          className="bg-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
        >
          Search
        </button>
      </form>

      {/* Conditional Rendering: Loading indicator */}
      {loading ? (
        <p className="text-center text-xl">Searching...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {movies.length > 0 ? (
            movies.map((movie) => (
              <div key={movie.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl transition-all hover:scale-105 border border-gray-700">
                <img 
                  src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'} 
                  alt={movie.title}
                  className="w-full h-[400px] object-cover"
                />
                <div className="p-4">
                  <h2 className="font-bold text-lg leading-tight mb-2">{movie.title}</h2>
                  <div className="flex justify-between items-center text-gray-400 text-sm">
                    <span>{movie.release_date?.split('-')[0]}</span>
                    <span className="bg-yellow-500 text-black px-2 py-1 rounded font-bold">★ {movie.vote_average.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">No movies found. Try searching for something else!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;