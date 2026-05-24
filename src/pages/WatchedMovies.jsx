import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import MovieCard from "../components/MovieCard";
import { Lock } from "lucide-react";

const WatchedMovies = ({ user }) => {
  const [watchedList, setWatchedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(
      collection(db, "users", user.uid, "watchedMovies"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWatchedList(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
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
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-wider text-white">
          Please Log In First!
        </h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
          You need to be logged in to view your watched movies. Join the
          community and start building your cinema history!
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
    // ✅ UI LAYOUT FIX: Pinalitan ang malalaking padding classes ng 'pt-6 lg:pt-8 pb-16' para umakyat ang content area
    <div className="w-full bg-[#080d17] text-white px-6 md:px-10 pt-6 lg:pt-8 pb-16 max-w-[1600px] mx-auto">
      {/* HEADER SECTION */}
      {/* ✅ UI LAYOUT FIX: Binabaan ang margin bottom ('mb-8') mula 'mb-12' para mas dikit at compact ang upper shell view */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
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
        // ✅ UI LAYOUT FIX: Dinagdagan ng 'gap-6 md:gap-8' para maging malinis at pantay ang grid gap sa screen scale mo
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
          {watchedList.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={{
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                media_type: movie.type || "movie",
              }}
              isWatched={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchedMovies;
