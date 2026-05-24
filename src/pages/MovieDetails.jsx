import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getMovieDetails,
  getRecommendations,
  getTVDetails,
} from "../services/api";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import MovieCard from "../components/MovieCard";
import ArtistCard from "../components/ArtistCard";
import { AlertCircle, CheckCircle2, X } from "lucide-react"; // Pwede mong gamitin kung may lucide-react ka na sa setup

const MovieDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isTV = location.pathname.includes("/tv/");

  const [details, setDetails] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlists, setWatchlists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isWatched, setIsWatched] = useState(false);
  const [watchedIds, setWatchedIds] = useState([]);

  // 🚀 CUSTOM VIBE NOTIFICATION STATE (MODAL TOAST SUBSTITUTE)
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [modalError, setModalError] = useState(""); // Inline list validation feedback

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setDetails(null);
      setSimilarMovies([]);
      try {
        const data = isTV ? await getTVDetails(id) : await getMovieDetails(id);
        if (data) {
          setDetails(data);
          const similarData = await getRecommendations(
            id,
            isTV ? "tv" : "movie",
          );
          if (Array.isArray(similarData)) {
            setSimilarMovies(similarData.filter((m) => m.poster_path));
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDetails();
    window.scrollTo(0, 0);
  }, [id, isTV]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "watchlists"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWatchlists(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsubscribe();
  }, [user]);

  // Listener para sa CURRENT movie
  useEffect(() => {
    if (!user || !id) return;
    const watchedRef = doc(db, "users", user.uid, "watchedMovies", id);
    const unsubscribe = onSnapshot(watchedRef, (docSnap) => {
      setIsWatched(docSnap.exists());
    });
    return () => unsubscribe();
  }, [user, id]);

  // Listener para sa LAHAT ng watched IDs (para sa More Like This)
  useEffect(() => {
    if (!user) return;
    const watchedQuery = collection(db, "users", user.uid, "watchedMovies");
    const unsubscribe = onSnapshot(watchedQuery, (snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.id);
      setWatchedIds(ids);
    });
    return () => unsubscribe();
  }, [user]);

  // EARLY RETURN (Pagkatapos ng lahat ng Hooks)
  if (!details) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-blue-500 font-black italic uppercase tracking-widest">
        Loading Vibe...
      </div>
    );
  }

  const toggleWatched = async () => {
    if (!user) {
      showToast("Authentication Required: Please login first!", "error");
      return;
    }
    const watchedRef = doc(db, "users", user.uid, "watchedMovies", id);
    try {
      if (isWatched) {
        await deleteDoc(watchedRef);
        showToast("Removed from your Watched list", "success");
      } else {
        await setDoc(watchedRef, {
          id: id,
          title: details.title || details.name,
          poster_path: details.poster_path,
          type: isTV ? "tv" : "movie",
          watchedAt: new Date().toISOString(),
        });
        showToast("Marked as Watched!", "success");
      }
    } catch (error) {
      console.error(error);
      showToast("Firestore pipeline connection error", "error");
    }
  };

  const title = details.title || details.name;
  const releaseDate = details.release_date || details.first_air_date;
  const runtime = isTV
    ? `${details.number_of_seasons} Seasons`
    : `${details.runtime} min`;
  const genres = details.genres || [];
  const cast = details.credits?.cast || [];

  const handleSaveToPlaylist = async (listId, existingMovies = []) => {
    setModalError("");
    // I-check kung existing na yung movie ID sa array
    const isAlreadyAdded = existingMovies.some(
      (movie) => movie.id === details.id,
    );

    if (isAlreadyAdded) {
      setModalError("This item is already listed in this curation space! 🎥");
      return;
    }

    const movieData = {
      id: details.id,
      title: details.title || details.name,
      poster: details.poster_path,
      addedAt: new Date().toISOString(),
    };

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", listId);
      await updateDoc(listRef, {
        movies: [...existingMovies, movieData],
      });

      setIsModalOpen(false);
      showToast("Successfully added to playlist! ✅", "success");
    } catch (error) {
      console.error("Error adding movie:", error);
      setModalError("Failed to update database profile snapshot.");
    }
  };

  const handleCreateAndSave = async () => {
    if (!newListName.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "watchlists"), {
        name: newListName,
        createdAt: new Date().toISOString(),
        movies: [
          {
            id: details.id,
            title: details.title || details.name,
            poster: details.poster_path,
          },
        ],
      });
      setIsCreating(false);
      setNewListName("");
      setIsModalOpen(false);
      showToast("Playlist created and synced with attachment! 🍿", "success");
    } catch (error) {
      console.error(error);
      setModalError("Failed to instantiate new list.");
    }
  };

  const trailerVideo = details.videos?.results?.find(
    (vid) =>
      vid.site === "YouTube" &&
      (vid.type === "Trailer" || vid.type === "Teaser"),
  );

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-6 md:p-12 relative overflow-x-hidden">
      {/* 🔮 NEW ECOSYSTEM FLOATING TOAST SYSTEM */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-5 py-4 rounded-2xl border backdrop-blur-xl flex items-center gap-3 shadow-2xl ${
              toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-xs font-black uppercase tracking-wider flex-1 leading-normal">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="mb-10 flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors font-black text-[10px] uppercase tracking-[0.3em]"
        >
          <span className="text-lg">←</span> Back to Exploration
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20">
          {/* LEFT SIDEBAR: STICKY POSTER & QUICK ACTIONS */}
          <div className="md:col-span-4 lg:col-span-4">
            <div className="sticky top-12 space-y-6">
              <div className="bg-[#1a2235] p-4 rounded-[3.5rem] border border-white/5 shadow-2xl">
                <img
                  src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                  className="w-full aspect-[2/3] object-cover rounded-[3rem] shadow-2xl"
                  alt={details.title || details.name}
                />
              </div>

              {/* Action Button: Add to Watchlist */}
              <button
                onClick={() => {
                  if (!user) {
                    showToast(
                      "Authentication Required: Please login first!",
                      "error",
                    );
                    return;
                  }
                  setModalError("");
                  setIsModalOpen(true);
                }}
                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02] cursor-pointer"
              >
                + Add to Watchlist
              </button>

              <button
                onClick={toggleWatched}
                className={`w-full py-5 rounded-[2.5rem] font-black uppercase italic transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl border-2 flex items-center justify-center gap-2 cursor-pointer ${
                  isWatched
                    ? "bg-green-600/20 border-green-500 text-green-500"
                    : "bg-white/5 border-white/10 text-white hover:border-green-500"
                }`}
              >
                {isWatched ? "✓ Watched" : "Mark as Watched"}
              </button>

              {/* Quick Info */}
              <div className="flex flex-col gap-4 px-2">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center shadow-2xl">
                  <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                    Rating Score
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white text-6xl font-black italic tracking-tighter">
                      {details.vote_average?.toFixed(1)}
                    </span>
                    <span className="text-gray-500 font-black text-sm italic">
                      /10
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center">
                  <p className="text-gray-500 font-black text-[9px] uppercase tracking-[0.3em] mb-1">
                    {isTV ? "Series Length" : "Duration"}
                  </p>
                  <p className="text-white font-black text-xl italic tracking-tight">
                    {isTV ? (
                      <>
                        {details.number_of_seasons}{" "}
                        <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">
                          SEASONS
                        </span>
                      </>
                    ) : (
                      <>
                        {details.runtime}{" "}
                        <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">
                          MINS
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT: TITLES, BIO, CAST, & RECOMMENDATIONS */}
          <div className="md:col-span-8 lg:col-span-8 pt-4 md:order-1 order-2">
            <div className="bg-[#1a2235] border border-white/5 rounded-[3.5rem] p-10 md:p-14 mb-8">
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter mb-4 leading-[0.9] break-words overflow-hidden">
                {details.title || details.name}
              </h1>

              <div className="flex flex-wrap gap-3 mb-12">
                {details.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-5 py-2 bg-blue-600/10 border border-blue-600/30 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    {genre.name}
                  </span>
                ))}

                <span className="px-5 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {
                    (details.release_date || details.first_air_date)?.split(
                      "-",
                    )[0]
                  }
                </span>
              </div>

              {/* STORYLINE */}
              <div className="mt-8 mb-12">
                <h3 className="text-white font-black uppercase italic mb-4 tracking-widest text-sm flex items-center gap-3">
                  <span className="w-6 h-1 bg-blue-600 rounded-full" />
                  Overview
                </h3>
                <p className="text-gray-400 leading-relaxed font-medium text-lg italic">
                  "{details.overview}"
                </p>
              </div>

              {/* TRAILER VIDEO */}
              {trailerVideo && (
                <div className="mt-8 mb-12 space-y-4">
                  <h3 className="text-white font-black uppercase italic tracking-widest text-sm flex items-center gap-3">
                    <span className="w-6 h-1 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                    Official Trailer
                  </h3>
                  <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-black/40">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerVideo.key}?rel=0&modestbranding=1`}
                      title="Official Trailer"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* TOP CAST */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                      Top Cast
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(details?.credits?.cast || [])
                    .slice(0, 4)
                    .map((actor, index) => (
                      <div key={`cast-${actor.id}-${index}`} className="w-full">
                        <ArtistCard artist={actor} />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* MORE LIKE THIS */}
            <div className="px-4 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                  More Like This
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {(similarMovies || []).slice(0, 6).map((item, index) => (
                  <MovieCard
                    key={`rec-${item.id}-${index}`}
                    movie={{ ...item, media_type: isTV ? "tv" : "movie" }}
                    isWatched={watchedIds.includes(String(item.id))}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎬 MODAL PLAYLIST MANAGEMENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#080d17]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#121826] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                Save To...
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError("");
                }}
                className="bg-white/5 p-3 rounded-full text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* INLINE INTERNAL ERROR MODAL INSIDE BOX */}
            {modalError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[11px] font-black uppercase tracking-wide leading-tight animate-in fade-in duration-150">
                ⚠️ {modalError}
              </div>
            )}

            {isCreating ? (
              <div className="space-y-4 animate-in slide-in-from-top duration-300">
                <input
                  autoFocus
                  type="text"
                  placeholder="Playlist Name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full bg-white/5 border border-blue-500/30 text-white p-5 rounded-[1.5rem] focus:border-blue-500 focus:outline-none transition-all text-sm font-medium"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateAndSave}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setModalError("");
                    }}
                    className="px-8 py-5 bg-white/5 text-gray-400 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-5 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              >
                + Create New
              </button>
            )}

            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-2">
              {watchlists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleSaveToPlaylist(list.id, list.movies)}
                  className="w-full p-6 bg-white/5 hover:bg-blue-600/10 border border-transparent hover:border-blue-500/30 rounded-[1.8rem] text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-white font-black text-xs uppercase tracking-widest">
                      {list.name}
                    </p>
                    <p className="text-gray-500 text-[9px] font-bold uppercase mt-1 tracking-widest">
                      {list.movies?.length || 0} Movies
                    </p>
                  </div>
                  <span className="text-blue-500 font-black text-[11px] tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                    ADD
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
