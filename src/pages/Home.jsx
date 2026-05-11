import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { getTrendingMovies, getRecommendations } from "../services/api";
import MovieCard from "../components/MovieCard";

// Utility function sa labas ng component para iwas initialization error
const getDailyFeaturedMovie = (movieList) => {
  if (!movieList || movieList.length === 0) return null;
  const today = new Date().toISOString().split("T")[0];
  const seed = today.split("-").reduce((acc, val) => acc + parseInt(val), 0);
  const index = seed % movieList.length;
  return movieList[index];
};

const Home = ({ user, searchResults, searchLoading }) => {
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [featuredMovie, setFeaturedMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Home.jsx
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const trendingData = await getTrendingMovies();
      setTrending(trendingData);

      // Initial fallback: trending muna
      setFeaturedMovie(getDailyFeaturedMovie(trendingData));
      setLoading(false);
    };
    fetchData();

    if (user) {
      const q = query(
        collection(db, "users", user.uid, "watchlists"),
        orderBy("createdAt", "desc"),
        limit(1),
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const latestList = snapshot.docs[0].data();
          const moviesInList = latestList.movies || [];

          if (moviesInList.length > 0) {
            const lastMovieId = moviesInList[moviesInList.length - 1].id;
            const recs = await getRecommendations(lastMovieId);
            setRecommendations(recs);

            // DITO ANG MAGIC: Pumili ng isa mula sa Recommendations para maging Daily Best
            if (recs.length > 0) {
              const dailyRecPick = getDailyFeaturedMovie(recs);
              setFeaturedMovie(dailyRecPick);
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (searchResults && searchResults.length > 0) {
    return (
      <div className="p-8 animate-in fade-in duration-500">
        <header className="mb-8">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Search Results
          </h2>
          <div className="h-1.5 w-24 bg-blue-600 rounded-full mt-2" />
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {searchResults.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    );
  }

  if (searchLoading) {
    return (
      <div className="p-20 text-center font-black text-blue-500">
        SEARCHING...
      </div>
    );
  }

  if (loading || searchLoading)
    return (
      <div className="p-20 text-center font-black tracking-widest text-blue-500">
        VIBE LOADING...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#080d17] pb-20">
      {/* 1. HERO SECTION (Daily Best) */}
      {featuredMovie && (
        <section className="relative h-[80vh] w-full overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={`https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path}`}
              className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080d17] via-[#080d17]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080d17] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-16 max-w-4xl space-y-4">
            <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] w-fit">
              Today's Best Choice
            </span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">
              {featuredMovie.title}
            </h1>
            <p className="text-gray-300 text-lg line-clamp-3 max-w-2xl font-medium italic">
              "{featuredMovie.overview}"
            </p>
            <div className="flex gap-4 pt-4">
              <button className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-xl">
                Watch Now
              </button>
              <button className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-white/20 transition-all">
                + Details
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="p-8 space-y-20 relative z-20 -mt-10">
        {/* 2. RECOMMENDATIONS (Horizontal Scroll) */}
        {user && recommendations.length > 0 && (
          <section className="animate-in slide-in-from-bottom duration-700">
            <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
              <span className="w-8 h-[1px] bg-blue-500" /> Recommended For You
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-8 no-scrollbar scroll-smooth">
              {recommendations.slice(0, 15).map((movie) => (
                <div
                  key={movie.id}
                  className="min-w-[200px] md:min-w-[260px] hover:scale-105 transition-transform duration-500"
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. TRENDING NOW (Grid View) */}
        <section>
          <div className="mb-10">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              Trending Now
            </h2>
            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
              Global charts this week
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {trending.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
