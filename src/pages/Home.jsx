import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import {
  getTrendingMovies,
  getRecommendations,
  getMovieDetails,
} from "../services/api";
import MovieCard from "../components/MovieCard";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlists, setWatchlists] = useState([]); // Listahan ng mga folder/playlists

  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  const [watchedIds, setWatchedIds] = useState([]);

  const navigate = useNavigate();

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setWatchedIds([]);
      return;
    }
    const watchedQuery = collection(db, "users", user.uid, "watchedMovies");
    const unsubscribe = onSnapshot(
      watchedQuery,
      (snapshot) => {
        setWatchedIds(snapshot.docs.map((doc) => doc.id));
      },
      (error) => {
        console.warn("Watched sub-collection link held safely:", error.message);
      },
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) {
      setWatchlists([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "watchlists"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWatchlists(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.warn(
          "Firestore Watchlist Stream halted safely:",
          error.message,
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const trendingData = await getTrendingMovies();
        if (!active) return;
        setTrending(trendingData);
        setFeaturedMovie(getDailyFeaturedMovie(trendingData));
      } catch (err) {
        console.error("Trending dynamic build blocked:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();

    let unsubscribeRecommendations = () => {};

    if (user && user.uid) {
      const q = query(
        collection(db, "users", user.uid, "watchlists"),
        orderBy("createdAt", "desc"),
        limit(1),
      );

      unsubscribeRecommendations = onSnapshot(
        q,
        async (snapshot) => {
          if (!snapshot.empty && active) {
            const latestList = snapshot.docs[0].data();
            const moviesInList = latestList.movies || [];

            if (moviesInList.length > 0) {
              const lastMovieId = moviesInList[moviesInList.length - 1].id;
              try {
                const recs = await getRecommendations(lastMovieId);
                if (!active) return;
                setRecommendations(recs);

                if (recs.length > 0) {
                  setFeaturedMovie(getDailyFeaturedMovie(recs));
                }
              } catch (err) {
                console.error("Recommendations async trap caught:", err);
              }
            }
          }
        },
        (error) => {
          console.warn(
            "Recommendations snapshot detached safely:",
            error.message,
          );
        },
      );
    } else {
      setRecommendations([]);
    }

    return () => {
      active = false;
      unsubscribeRecommendations();
    };
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

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSaveToPlaylist = async (playlistId, currentMovies = []) => {
    const activeMovie = selectedDetails || featuredMovie;

    if (!activeMovie) {
      showToast("No movie selected! 🍿", "error");
      return;
    }

    const movieExists = currentMovies.some(
      (m) => String(m.id) === String(activeMovie.id),
    );

    if (movieExists) {
      showToast("This movie is already in the watchlist! 👀", "warning");
      return;
    }

    const updatedMovies = [
      ...currentMovies,
      {
        id: activeMovie.id,
        title: activeMovie.title || activeMovie.name,
        poster_path: activeMovie.poster_path,
        release_date:
          activeMovie.release_date || activeMovie.first_air_date || "",
      },
    ];

    try {
      const playlistRef = doc(db, "users", user.uid, "watchlists", playlistId);
      await updateDoc(playlistRef, { movies: updatedMovies });
      setIsModalOpen(false);
      showToast("Successfully added to playlist! 🎬", "success");
    } catch (error) {
      console.error("Error adding movie to playlist:", error);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newListName.trim() || !user || !featuredMovie) return;

    const movieData = {
      id: featuredMovie.id,
      title: featuredMovie.title || featuredMovie.name,
      poster_path: featuredMovie.poster_path,
      release_date:
        featuredMovie.release_date || featuredMovie.first_air_date || "",
      addedAt: new Date().toISOString(),
    };

    try {
      const newList = {
        name: newListName.trim(),
        createdAt: new Date().toISOString(),
        movies: [movieData],
      };

      await addDoc(collection(db, "users", user.uid, "watchlists"), newList);
      setIsCreating(false);
      setNewListName("");
      setIsModalOpen(false);
      showToast("New playlist created and movie saved! 🎉", "success");
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const handleViewDetails = async () => {
    if (!featuredMovie) return;
    try {
      const details = await getMovieDetails(featuredMovie.id);
      setSelectedDetails(details);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }
  };
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
              <div className="flex gap-4 pt-4">
                {/* Home.jsx - Hero Section Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      if (!user) {
                        setIsLoginModalOpen(true); // Buksan ang login confirmation modal
                        return;
                      }
                      setIsModalOpen(true); // BUBUKSAN ANG MODAL KAPAG NAKA-LOGIN
                    }}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-blue-900/20"
                  >
                    + Add to Watchlist
                  </button>

                  <button
                    onClick={() => navigate(`/movie/${featuredMovie.id}`)}
                    className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-white/20 transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>
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
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isWatched={watchedIds.includes(String(movie.id))} // Dagdag ito
                  />
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
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={(movieData) => {
                  // Dito natin ise-set kung anong movie ang isa-save
                  setFeaturedMovie(movieData); // Gamitin natin yung existing state mo for selected movie
                  setIsModalOpen(true);
                }}
                isWatched={watchedIds.includes(String(movie.id))}
              />
            ))}
          </div>
        </section>

        {/* Playlist Selection Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#121826] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                  Save to...
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {isCreating ? (
                <div className="mb-4 space-y-2 animate-in slide-in-from-top">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Playlist Name (e.g. Action Favorites)"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="w-full bg-white/5 border border-blue-500/50 text-white p-4 rounded-2xl focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateAndSave}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase"
                    >
                      Create & Save
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-3 bg-white/5 text-gray-400 rounded-xl font-black text-[10px] uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-4 mb-4 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <span>+</span> New Playlist
                </button>
              )}

              <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-2">
                {watchlists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() =>
                      handleSaveToPlaylist(list.id, list.movies || [])
                    }
                    className="w-full p-6 bg-white/5 hover:bg-blue-600/10 border border-transparent hover:border-blue-500/30 rounded-[1.8rem] text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <p className="text-white font-black text-xs uppercase tracking-widest">
                        {list.name}
                      </p>
                      <p className="text-gray-500 text-[9px] font-bold uppercase mt-1 tracking-widest">
                        {list.movies?.length || 0} Movies
                      </p>
                    </div>
                    <span className="text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-all">
                      ADD...
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isDetailOpen && selectedDetails && (
          <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#080d17]/95 backdrop-blur-xl animate-in fade-in duration-500">
            {/* Navigation/Close Bar */}
            <div className="sticky top-0 z-[120] p-6 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="bg-white/5 border border-white/10 p-4 rounded-2xl text-white hover:bg-white/10 hover:rotate-90 transition-all duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-w-7xl mx-auto px-6 pb-20">
              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-12 gap-12">
                {/* LEFT: Poster & Quick Info (3 Cols) */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="relative group">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${selectedDetails.poster_path}`}
                      className="w-full rounded-[2.5rem] shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500"
                      alt=""
                    />
                    <div className="absolute top-6 left-6">
                      <div className="bg-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/40">
                        ⭐ {selectedDetails.vote_average?.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <span>Runtime</span>
                      <span className="text-blue-400">
                        {selectedDetails.runtime} MINS
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 border-t border-white/5 pt-4">
                      <span>Status</span>
                      <span className="text-white">
                        {selectedDetails.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Trailer & Deep Details (8 Cols) */}
                <div className="lg:col-span-8 space-y-12">
                  {/* Header Info */}
                  <div className="space-y-4">
                    <h2 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.8] mb-6">
                      {selectedDetails.title}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedDetails.genres?.map((g) => (
                        <span
                          key={g.id}
                          className="px-5 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-blue-600/20 hover:border-blue-600/50 transition-colors"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Trailer Player */}
                  {selectedDetails.videos?.results[0] && (
                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedDetails.videos.results[0].key}?autoplay=0&showinfo=0&controls=1`}
                        className="w-full h-full"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {/* Storyline */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em]">
                      The Storyline
                    </h3>
                    <p className="text-2xl text-gray-300 leading-relaxed font-medium italic opacity-80">
                      "{selectedDetails.overview}"
                    </p>
                  </div>

                  {/* Cast Section */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em]">
                      Featured Cast
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedDetails.credits?.cast
                        .slice(0, 4)
                        .map((person) => (
                          <div
                            key={person.id}
                            className="bg-white/5 p-3 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group"
                          >
                            <img
                              src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                              className="w-full aspect-square object-cover rounded-2xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500"
                              alt={person.name}
                            />
                            <p className="text-[10px] font-black uppercase text-white truncate">
                              {person.name}
                            </p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase truncate tracking-widest mt-1">
                              {person.character}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ========================================================= */}
      {/* 1. DYNAMIC TOAST BANNER SYSTEM (LALABAS SA TAAS, MAGFA-FADE) */}
      {/* ========================================================= */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs shadow-2xl border flex items-center gap-2 text-white ${
              toast.type === "success"
                ? "bg-emerald-600/90 border-emerald-500/30 backdrop-blur-md"
                : toast.type === "error" || toast.type === "warning"
                  ? "bg-rose-600/90 border-rose-500/30 backdrop-blur-md"
                  : "bg-blue-600/90 border-blue-500/30 backdrop-blur-md"
            }`}
          >
            <span>
              {toast.type === "success"
                ? "⚡"
                : toast.type === "error"
                  ? "⚠️"
                  : "ℹ️"}
            </span>
            {toast.message}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CONFIRMATION LOGIN REQUIRED MODAL (UPDATED FOR SIGN UP) */}
      {/* ========================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop / Dilim sa likod */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsLoginModalOpen(false)}
          />

          {/* Modal Box */}
          <div className="bg-[#0b111e] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 text-center space-y-5 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                Please Login First!
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                You need to be logged in to create customized playlists or save
                your favorite movie vibes.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              {/* CANCEL BUTTON */}
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>

              {/* DIRECT SIGN UP ACTION BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsLoginModalOpen(false);

                  // TIP: Kung may state ka para buksan ang login overlay sa top right,
                  // pwede mo itong tawagin dito (Halimbawa: setIsAuthOpen(true))

                  // O kaya naman i-scroll natin sila sa pinakataas para mapansin yung Sign In box:
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
