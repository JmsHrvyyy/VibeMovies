import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import MovieCard from "../components/MovieCard";

const WatchedMovies = ({ user }) => {
  const [watchedList, setWatchedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Kinukuha natin ang buong listahan ng napanood na pelikula, naka-sort sa pinakabagong add
    const watchedRef = collection(db, "users", user.uid, "watchedMovies");
    const q = query(watchedRef, orderBy("watchedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const movies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWatchedList(movies);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching watched movies:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
        <span className="text-4xl mb-4">✅</span>
        <h3 className="text-lg font-black uppercase tracking-wider text-white">
          Please Log In First
        </h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
          Mag-sign in muna para makita ang listahan ng mga pelikulang natapos mo
          nang mapanood at ma-arkiba ang iyong kasaysayan!
        </p>
      </div>
    );
  }

  if (!user) {
  return (
    <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
      <span className="text-4xl mb-4">✅</span>
      <h3 className="text-lg font-black uppercase tracking-wider text-white">Please Log In First</h3>
      <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
        Mag-sign in muna para makita ang listahan ng mga pelikulang natapos mo nang mapanood at ma-arkiba ang iyong kasaysayan!
      </p>
    </div>
  );
}

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-green-500 font-black italic uppercase tracking-widest">
        Loading Watched Archive...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white px-6 py-10 lg:px-16 lg:py-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div className="flex items-center gap-4">
          {/* Neon Green Accent Pill */}
          <div className="w-2.5 h-10 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          <div>
            <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">
              Watched Movies
            </h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              Your Complete Cinema History
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 self-start md:self-auto">
          <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">
            Total Collection:
          </span>
          <span className="bg-green-500 text-black font-black text-xs px-2.5 py-0.5 rounded-lg italic">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {watchedList.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={{
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                media_type: movie.type || "movie", // Gumagamit ng fallback kung tv or movie
              }}
              isWatched={true} // Dahil galing sila sa listahang ito, automatic true na agad ito
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchedMovies;
