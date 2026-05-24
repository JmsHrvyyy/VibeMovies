import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs, // ✅ CRITICAL FIX: Idinagdag para mawala ang ReferenceError
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import { Lock, Edit3, Check, X, Loader2 } from "lucide-react";

const WatchlistPage = ({ user }) => {
  const [watchlists, setWatchlists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [watchedIds, setWatchedIds] = useState([]);
  const [listToDelete, setListToDelete] = useState(null);

  // MGA BAGONG STATES PARA SA MGA DETALYADONG FEATURES
  const [movieToRemove, setMovieToRemove] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameText, setEditNameText] = useState("");
  const [wToast, setWToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Helper function para sa Toast/Banner notification
  const triggerToast = (message, type = "success") => {
    setWToast({ show: true, message, type });
    setTimeout(() => {
      setWToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // ✅ DISKARTENG PRODUKTIBO: Ginawang reusable function para matawag ulit tuwing may mutation (Add/Delete/Rename)
  const fetchWatchlist = async () => {
    if (!user || !user.uid) return;
    try {
      const q = query(
        collection(db, "users", user.uid, "watchlists"),
        orderBy("createdAt", "desc"),
      );

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setWatchlists(items);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    }
  };

  useEffect(() => {
    if (user && user.uid) {
      fetchWatchlist();
    }
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
          You need to be logged in to view and manage your watchlists. Join the
          community and start creating your personalized movie playlists!
        </p>
      </div>
    );
  }

  const deleteList = (list) => {
    setListToDelete(list);
  };

  const handleExecuteListDelete = async () => {
    if (!listToDelete || !user) return;
    try {
      const listRef = doc(db, "users", user.uid, "watchlists", listToDelete.id);
      await deleteDoc(listRef);
      setListToDelete(null);

      // ✅ UI SYNC FIX: Kung ang binura ay ang kasalukuyang nakabukas na listahan, i-close ito
      if (selectedList && selectedList.id === listToDelete.id) {
        setSelectedList(null);
      }

      await fetchWatchlist(); // ✅ UI SYNC: Re-fetch agad para magbago ang listahan sa screen
      triggerToast("Watchlist deleted successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete watchlist.", "error");
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "watchlists"), {
        name: newListName.trim(),
        movies: [],
        createdAt: new Date().toISOString(), // Ligtas na string timestamp kesa raw Object
      });
      setNewListName("");
      setIsCreating(false);
      await fetchWatchlist(); // ✅ UI SYNC: Re-fetch agad para lumitaw ang bagong folder
      triggerToast("Created new movie collection folder! 📁");
    } catch (error) {
      console.error("Error creating list:", error);
      triggerToast("Failed to create watchlist folder.", "error");
    }
  };

  const addMovieToList = async (movie) => {
    if (!selectedList) return;

    const newMovie = {
      id: movie.id,
      title: movie.title || movie.name,
      poster: movie.poster_path || "",
      backdrop_path: movie.backdrop_path || "",
      overview: movie.overview || "",
      rating: movie.vote_average?.toFixed(1) || "0.0",
      year: movie.release_date?.split("-")[0] || "N/A",
    };

    if (selectedList.movies?.some((m) => String(m.id) === String(movie.id))) {
      triggerToast("Movie is already in this playlist! ⚠️", "error");
      return;
    }

    const updatedMovies = [...(selectedList.movies || []), newMovie];

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", selectedList.id);
      await setDoc(listRef, { movies: updatedMovies }, { merge: true });

      setSelectedList((prev) => ({ ...prev, movies: updatedMovies }));
      setIsModalOpen(false);
      setSearchTerm("");
      setSearchResults([]);

      await fetchWatchlist(); // ✅ UI SYNC: I-sync ang kabuuang grid cards sa likod ng modal
      triggerToast(
        `Successfully added "${movie.title || movie.name}"! 🎬`,
        "success",
      );
    } catch (error) {
      console.error("Error adding movie:", error);
      triggerToast("Error linking movie to pipeline.", "error");
    }
  };

  const handleSearchMovie = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (query.length > 2) {
      const results = await searchMovies(query);
      setSearchResults(results || []);
    } else {
      setSearchResults([]);
    }
  };

  const removeMovieFromList = (movie) => {
    setMovieToRemove(movie);
  };

  const handleExecuteMovieRemove = async () => {
    if (!movieToRemove || !selectedList) return;

    const updatedMovies = selectedList.movies.filter(
      (m) => String(m.id) !== String(movieToRemove.id),
    );

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", selectedList.id);
      await setDoc(listRef, { movies: updatedMovies }, { merge: true });

      setSelectedList((prev) => ({ ...prev, movies: updatedMovies }));
      setMovieToRemove(null);
      await fetchWatchlist(); // ✅ UI SYNC: I-update ang home screen counter at list properties
      triggerToast("Removed movie from collection pipeline.", "success");
    } catch (error) {
      console.error("Error removing movie:", error);
      triggerToast("Failed to disconnect movie asset.", "error");
    }
  };

  const handleUpdateListName = async () => {
    if (!editNameText.trim() || editNameText.trim() === selectedList.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", selectedList.id);
      await updateDoc(listRef, { name: editNameText.trim() });

      setSelectedList((prev) => ({ ...prev, name: editNameText.trim() }));
      setIsEditingName(false);
      await fetchWatchlist(); // ✅ UI SYNC: Dynamic update sa main folder tab view names
      triggerToast("Watchlist renamed dynamically! 🔄", "success");
    } catch (err) {
      console.error("Error updating layout name:", err);
      triggerToast("Failed to alter name context.", "error");
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 relative">
      {!selectedList ? (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-white uppercase italic tracking-tighter">
                  My Watchlists
                </h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Your Curated Movie Collections & Folders
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg cursor-pointer"
            >
              + New Playlist
            </button>
          </div>

          {isCreating && (
            <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[2rem] flex gap-4 shadow-2xl animate-in fade-in zoom-in duration-300">
              <input
                autoFocus
                placeholder="Watchlist Name (e.g. Anime Favorites)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 text-white outline-none focus:border-blue-500 transition-all"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
              <button
                onClick={createList}
                className="bg-white text-black px-6 py-2 rounded-xl font-black uppercase text-xs cursor-pointer"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 font-bold text-xs px-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlists.map((list) => {
              const coverPoster =
                list.movies && list.movies.length > 0
                  ? `https://image.tmdb.org/t/p/w500${list.movies[0].poster}`
                  : null;

              return (
                <div
                  key={list.id}
                  onClick={() => {
                    setSelectedList(list);
                    setEditNameText(list.name); // Pre-fill para sa edit function mamaya
                  }}
                  className="group cursor-pointer relative h-64 overflow-hidden rounded-[2.5rem] bg-[#0f172a] border border-white/10 hover:border-blue-500/50 transition-all shadow-2xl"
                >
                  {coverPoster ? (
                    <img
                      src={coverPoster}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                      alt={list.name}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteList(list);
                    }}
                    className="absolute top-6 right-6 z-20 p-2.5 bg-black/40 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all duration-300 cursor-pointer backdrop-blur-md border border-white/5 opacity-0 group-hover:opacity-100"
                    title="Delete Watchlist"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>

                  <div className="absolute bottom-0 left-0 w-full p-8 z-10">
                    <h3 className="text-3xl font-black text-white truncate mb-1 tracking-tighter uppercase">
                      {list.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        {list.movies?.length || 0} Movies
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ========================================================= */
        /* INSIDE WATCHLIST COMPONENT VIEW - MGA BAGONG CODES */
        /* ========================================================= */
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            <button
              onClick={() => {
                setSelectedList(null);
                setIsEditingName(false);
              }}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all cursor-pointer border border-white/5"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              {isEditingName ? (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl max-w-md w-full animate-in fade-in duration-200">
                  <input
                    type="text"
                    autoFocus
                    className="flex-1 bg-transparent border-none text-xl font-black text-white px-3 focus:outline-none uppercase"
                    value={editNameText}
                    onChange={(e) => setEditNameText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdateListName()
                    }
                  />
                  <button
                    onClick={handleUpdateListName}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditNameText(selectedList.name);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                      {selectedList.name}
                    </h1>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
                      {selectedList.movies?.length || 0} Movies in this list
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditNameText(selectedList.name);
                      setIsEditingName(true);
                    }}
                    className="p-2 bg-white/5 border border-white/5 text-gray-500 hover:text-blue-400 rounded-xl transition-all md:opacity-0 md:group-hover/title:opacity-100 cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer shadow-lg"
            >
              + Add Movie
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {selectedList.movies?.map((movie) => (
              <div key={movie.id} className="relative group">
                <MovieCard
                  movie={{
                    ...movie,
                    poster_path: movie.poster,
                  }}
                  isWatched={watchedIds.includes(String(movie.id))}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMovieFromList(movie); // Trinigger ang bagong confirmation modal state
                  }}
                  className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 p-2 bg-black/60 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all cursor-pointer border border-white/5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
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
            ))}

            {(!selectedList.movies || selectedList.movies.length === 0) && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <p className="text-gray-600 font-bold uppercase tracking-widest text-sm">
                  This playlist is empty
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GLOBAL MODALS & FLOATING BANNERS FOR THIS VIEW */}
      {/* ========================================================= */}

      {/* FLOATING BANNER NOTIFICATION (CENTER TOP) */}
      {wToast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-sm px-4">
          <div
            className={`px-4 py-3 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-2.5 shadow-2xl ${
              wToast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span className="text-xs">
              {wToast.type === "success" ? "✨" : "⚠️"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-center">
              {wToast.message}
            </span>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING WHOLE WATCHLIST */}
      {listToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <span className="text-lg">🗑️</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                Delete Watchlist?
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                Sigurado ka ba? Permanenteng mabubura ang folder na{" "}
                <span className="text-blue-400 font-bold">
                  "{listToDelete.name}"
                </span>
                .
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setListToDelete(null)}
                className="flex-1 py-3.5 bg-white/5 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteListDelete}
                className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAGONG CUSTOM MODAL: CONFIRMATION FOR REMOVING A MOVIE FROM THE LIST */}
      {movieToRemove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <span className="text-sm">🎬</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                Remove Movie?
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                Gusto mo bang alisin si{" "}
                <span className="text-blue-400 font-bold">
                  "{movieToRemove.title || movieToRemove.name}"
                </span>{" "}
                sa listahang ito?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMovieToRemove(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer border border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMovieRemove}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/20 cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVIE SEARCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => {
              setIsModalOpen(false);
              setSearchTerm("");
              setSearchResults([]);
            }}
          />
          <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 relative z-10 max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-black mb-6 text-white uppercase tracking-tighter">
              Add to {selectedList?.name}
            </h2>
            <input
              type="text"
              autoFocus
              placeholder="Search movie title..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4 text-white focus:outline-none focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={handleSearchMovie}
            />
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-2">
              {searchResults.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => addMovieToList(movie)}
                  className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all text-left group cursor-pointer"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    className="w-12 h-16 object-cover rounded-lg shadow-lg"
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-white group-hover:text-blue-500 transition-colors">
                      {movie.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {movie.release_date?.split("-")[0]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
