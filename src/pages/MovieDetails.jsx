import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMovieDetails } from "../services/api";
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

const MovieDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);

  // Watchlist States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlists, setWatchlists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getMovieDetails(id);
        setDetails(data);
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      }
    };
    fetchDetails();
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
    const movieData = {
      id: details.id,
      title: details.title,
      poster: details.poster_path,
      addedAt: new Date().toISOString(),
    };
    const listRef = doc(db, "users", user.uid, "watchlists", listId);
    await updateDoc(listRef, { movies: [...existingMovies, movieData] });
    setIsModalOpen(false);
    alert("Saved to playlist!");
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
    <div className="min-h-screen bg-[#080d17] text-white pb-20">
      {/* 1. NAVIGATION BAR */}
      <div className="p-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="group bg-white/5 border border-white/10 px-8 py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500 group-hover:-translate-x-2 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            Back
          </span>
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-600/40"
        >
          + Add to Watchlist
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-4">
        <div className="grid lg:grid-cols-12 gap-16">
          {/* LEFT: POSTER & GIANT RATING */}
          <div className="lg:col-span-4 space-y-8">
            <div className="relative group">
              <img
                src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                className="w-full rounded-[3rem] shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500"
                alt=""
              />
            </div>

            {/* ENHANCED RATING CARD */}
            <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[2.5rem] p-6 flex flex-col items-center justify-center text-center">
              <span className="text-blue-500 font-black text-[9px] uppercase tracking-[0.3em] mb-1">
                Vibe Score
              </span>
              <div className="flex items-end gap-1">
                {/* Bawasan din natin ng kaunti yung 8xl na rating */}
                <span className="text-6xl font-black italic tracking-tighter leading-none">
                  {details.vote_average?.toFixed(1)}
                </span>
                <span className="text-blue-500 font-black text-xl mb-1">
                  /10
                </span>
              </div>
              <p className="text-gray-500 text-[9px] font-bold uppercase mt-3 tracking-widest">
                {details.vote_count} Reviews
              </p>
            </div>
          </div>

          {/* RIGHT: INFO & CAST */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-tight mb-6">
                {details.title}
              </h1>

              <div className="flex flex-wrap gap-3">
                {details.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="px-4 py-1.5 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest italic"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            {/* TRAILER */}
            {details.videos?.results[0] && (
              <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${details.videos.results[0].key}?autoplay=0&rel=0`}
                  className="w-full h-full"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em]">
                Storyline
              </h3>
              <p className="text-xl text-gray-300 leading-relaxed italic font-medium opacity-90">
                "{details.overview}"
              </p>
            </div>

            {/* CAST SECTION IS BACK */}
            <div className="space-y-8 pb-10">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em]">
                Featured Cast
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {details.credits?.cast.slice(0, 4).map((person) => (
                  <div key={person.id} className="group">
                    <div className="relative overflow-hidden rounded-[2rem] mb-4 border border-white/5 group-hover:border-blue-500/50 transition-colors">
                      <img
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        className="w-full aspect-[4/5] object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                        alt={person.name}
                      />
                    </div>
                    <p className="text-xs font-black uppercase text-white truncate tracking-tighter">
                      {person.name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase truncate tracking-widest mt-1">
                      {person.character}
                    </p>
                  </div>
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
