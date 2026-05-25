import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import MovieCard from "../components/MovieCard";
import { Lock, Film } from "lucide-react";

const WatchedMovies = ({ user }) => {
  const [watchedList, setWatchedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) return;

    // SAFE STREAM: Tinanggal muna ang strict orderBy("createdAt") para hindi ma-suppress ang data
    // kung sakaling walang 'createdAt' field ang ilang lumang records mo sa database.
    const q = query(collection(db, "users", user.uid, "watchedMovies"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const movies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // MANUAL SORT: Dito natin ise-sort sa client side para kung walang 'createdAt',
        // hindi mawawala ang pelikula, mapupunta lang siya sa dulo.
        movies.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : 0;
          const dateB = b.createdAt ? new Date(b.createdAt) : 0;
          return dateB - dateA; // Descending order (Pinakabago muna)
        });

        setWatchedList(movies);
        setLoading(false);
      },
      (error) => {
        console.warn("Watched movies stream suppressed safely:", error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-500 mb-4 shadow-xl shadow-blue-500/5">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
          ACCESS RESTRICTED
        </h2>
        <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-1 max-w-xs">
          Sign in to view your personal archived movie logs.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-70px)] items-center justify-center bg-[#080d17] text-white">
        <div className="flex flex-col items-center gap-5 p-8 rounded-[2.5rem] bg-[#0d1527]/50 border border-white/5 backdrop-blur-xl shadow-2xl">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
            <div className="absolute inset-1.5 rounded-full border-4 border-transparent border-b-purple-500 animate-[spin_1s_linear_infinite_reverse]" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-black text-[11px] uppercase tracking-[0.25em] text-blue-400 animate-pulse">
              Retrieving Archive
            </p>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
              Fetching Watched Node Stream...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 md:p-12 max-w-7xl mx-auto space-y-8 text-left">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-blue-500" /> Watched History
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Your personal catalog of completed films
          </p>
        </div>
        <div>
          <span className="bg-blue-500 text-black font-black text-xs px-3 py-1 rounded-full italic uppercase tracking-wider">
            {watchedList.length} {watchedList.length === 1 ? "Film" : "Films"}
          </span>
        </div>
      </div>

      {/* GRID LISTING */}
      {watchedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[3rem] p-16 text-center bg-white/[0.01]">
          <span className="text-4xl mb-4">🎬</span>
          <h3 className="text-lg font-black uppercase italic text-gray-400">
            No movies archived yet
          </h3>
          <p className="text-gray-600 text-xs mt-1 max-w-xs font-medium">
            Start marking movies as "Watched" from their details page to build
            your history!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
          {watchedList.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={{
                id: movie.id,
                title: movie.title || movie.name, // Fallback para sa TV Shows o Movies
                poster_path: movie.poster_path,
                media_type: movie.media_type || "movie",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchedMovies;
