import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMovieDetails, getRecommendations } from "../services/api";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import MovieCard from "../components/MovieCard";
import ArtistCard from "../components/ArtistCard";

const MovieDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);

  // Watchlist States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlists, setWatchlists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [similarMovies, setSimilarMovies] = useState([]);

  useEffect(() => {
    const fetchDetails = async () => {
      // I-reset pareho para fresh start paglipat ng movie
      setDetails(null);
      setSimilarMovies([]);

      try {
        const data = await getMovieDetails(id);
        if (data) {
          setDetails(data);

          // Tawagin ang recommendations pagkatapos makuha ang main details
          const similarData = await getRecommendations(id);

          // I-filter lang yung mga movies na may poster para hindi pangit ang grid
          const filteredSimilar = similarData.filter((m) => m.poster_path);
          setSimilarMovies(filteredSimilar);
        }
      } catch (error) {
        console.error("Failed to fetch details:", error);
      }
    };

    fetchDetails();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "users", user.uid, "watchlists"),
        orderBy("createdAt", "desc"),
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setWatchlists(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleSaveToPlaylist = async (listId, existingMovies = []) => {
    // 1. I-check kung existing na yung movie ID sa array
    const isAlreadyAdded = existingMovies.some(
      (movie) => movie.id === details.id,
    );

    if (isAlreadyAdded) {
      // 2. Kapag nahanap, mag-show ng message at 'wag nang ituloy ang save
      alert("This movie is already in this playlist! 🎥");
      return; // Stop the function here
    }

    // 3. Kung wala pa, proceed sa pag-save
    const movieData = {
      id: details.id,
      title: details.title,
      poster: details.poster_path,
      addedAt: new Date().toISOString(),
    };

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", listId);
      await updateDoc(listRef, {
        movies: [...existingMovies, movieData],
      });

      setIsModalOpen(false);
      alert("Successfully added to playlist! ✅");
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newListName.trim()) return;
    await addDoc(collection(db, "users", user.uid, "watchlists"), {
      name: newListName,
      createdAt: new Date().toISOString(),
      movies: [
        { id: details.id, title: details.title, poster: details.poster_path },
      ],
    });
    setIsCreating(false);
    setNewListName("");
    setIsModalOpen(false);
  };

  if (!details)
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-blue-500 font-black italic uppercase tracking-widest">
        Loading Vibe...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-6 md:p-12">
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
                  alt={details.title}
                />
              </div>

              {/* Action Button: Add to Watchlist */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
              >
                + Add to Watchlist
              </button>

              {/* Quick Info - Vertically Stacked & Highlighted */}
              <div className="flex flex-col gap-4 px-2">
                {/* RATING HIGHLIGHT (TOP) */}
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

                {/* RUNTIME (BOTTOM) */}
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center">
                  <p className="text-gray-500 font-black text-[9px] uppercase tracking-[0.3em] mb-1">
                    Duration
                  </p>
                  <p className="text-white font-black text-xl italic tracking-tight">
                    {details.runtime}{" "}
                    <span className="text-[10px] text-gray-500 font-bold ml-1">
                      MINS
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT: TITLES, BIO, CAST, & RECOMMENDATIONS */}
          <div className="md:col-span-8 lg:col-span-8 pt-4 md:order-1 order-2">
            {/* MAIN INFO BOX */}
            <div className="bg-[#1a2235] border border-white/5 rounded-[3.5rem] p-10 md:p-14 mb-8">
              <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-4 leading-[0.85]">
                {details.title}
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
                  {details.release_date?.split("-")[0]}
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

              {/* NEW: TOP CAST SECTION USING ArtistCard */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                      Top Cast
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {details?.credits?.cast?.slice(0, 4).map((actor) => (
                    <div key={actor.id}>
                      <ArtistCard artist={actor} />
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">
                      No cast information available.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* MORE LIKE THIS SECTION */}
            <div className="px-4 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                  More Like This
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {similarMovies.slice(0, 6).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PLAYLIST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#080d17]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#121826] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                Save To...
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-white/5 p-3 rounded-full text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {isCreating ? (
              <div className="mb-8 space-y-4 animate-in slide-in-from-top duration-300">
                <input
                  autoFocus
                  type="text"
                  placeholder="Playlist Name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full bg-white/5 border border-blue-500/30 text-white p-5 rounded-[1.5rem] focus:border-blue-500 focus:outline-none transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateAndSave}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-600/30"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-8 py-5 bg-white/5 text-gray-400 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-5 mb-8 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all"
              >
                + Create New
              </button>
            )}

            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-2">
              {watchlists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleSaveToPlaylist(list.id, list.movies)}
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
