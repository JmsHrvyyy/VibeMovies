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

  // Dinagdagan natin ng (e) sa unahan
  const createList = async (e) => {
    if (e) e.preventDefault(); // 🔥 CRITICAL FIX: Pinipigilan nito ang page refresh!

    if (!newListName.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "watchlists"), {
        name: newListName.trim(),
        movies: [],
        createdAt: new Date().toISOString(),
      });
      setNewListName("");
      setIsCreating(false);
      await fetchWatchlist();
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">
                  My Watchlists
                </h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Your Curated Movie Collections & Folders
                </p>
              </div>
            </div>
          </div>

          {!isCreating ? (
            /* Ginawang full-width 'w-full' sa mobile pero babalik sa 'sm:w-auto' para sumunod sa screen grid */
            <button
              onClick={() => setIsCreating(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] sm:text-xs px-5 py-3 rounded-xl sm:rounded-2xl italic uppercase tracking-wider transition-all shadow-lg shadow-blue-600/10 cursor-pointer text-center"
            >
              + Add New List
            </button>
          ) : (
            /* Inalis ang hardcoded 'w-64' para maging mobile adaptive at binalot ang buttons sa isang non-shrinking div */
            <form
              onSubmit={(e) => createList(e)} // 👈 ITINAMA: 'createList' na ang tinatawag at ipinapasa ang 'e'
              className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl sm:rounded-2xl border border-white/5 w-full sm:w-72"
            >
              <input
                type="text"
                required
                placeholder="Folder name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 bg-transparent text-white text-xs px-2 focus:outline-none min-w-0"
                autoFocus
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg sm:rounded-xl text-white transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewListName("");
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg sm:rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
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
                    /* ⚡ RESPONSIVE FIX: 'opacity-100 md:opacity-0 md:group-hover:opacity-100' */
                    /* Ginawang mas matingkad ang background sa mobile (bg-black/70) at pinalaki ang touch target gamit ang p-3 para madaling matap ng daliri */
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-3 md:p-2.5 bg-black/70 md:bg-black/40 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all duration-300 cursor-pointer backdrop-blur-md border border-white/5 opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
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
          {/* ⚡ CRITICAL CONTAINER RE-PIPELINING: Pinag-stack nang patayo sa mobile (flex-col items-start) at pinahiga lang kapag abot na sa desktop (md:flex-row md:items-center) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            {" "}
            <button
              onClick={() => setSelectedList(null)}
              /* ⚡ UI WIDTH LATCH FIX: Idinagdag ang 'w-fit' at 'self-start' para hindi siya humaba sa mobile view */
              className="w-fit self-start flex items-center gap-2 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest bg-white/5 px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-white/5 active:scale-95"
            >
              {/* Kung gumagamit ka ng Lucide icon, kung hindi naman, safe kahit tanggalin ito */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-0.5"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>
            <div className="flex-1 w-full min-w-0">
              {isEditingName ? (
                /* ⚡ RESPONSIVE INPUT CONTAINER: Swabeng flex alignment na hindi umaapaw sa screen wrapper */
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl w-full max-w-md animate-in fade-in duration-200">
                  <input
                    type="text"
                    autoFocus
                    /* Nilagyan ng text-lg sm:text-xl para hindi masyadong dambuhala sa maliliit na screen */
                    className="flex-1 min-w-0 bg-transparent border-none text-lg sm:text-xl font-black text-white px-3 focus:outline-none uppercase"
                    value={editNameText}
                    onChange={(e) => setEditNameText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdateListName()
                    }
                  />
                  {/* Buttons block locked inside flex-shrink-0 para hindi sila pwedeng pitpitin o itulak palabas */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleUpdateListName}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer active:scale-90"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditNameText(selectedList.name);
                      }}
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer border border-white/5 active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* ⚡ RESPONSIVE TITLE WRAPPER: Pinigilan ang truncation blowout gamit ang min-w-0 at truncate utilities */
                <div className="flex items-center gap-2 group/title min-w-0 w-full">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase truncate">
                      {selectedList.name}
                    </h1>
                    <p className="text-gray-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest truncate mt-0.5">
                      {selectedList.movies?.length || 0} Movies in this list
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditNameText(selectedList.name);
                      setIsEditingName(true);
                    }}
                    className="p-2.5 bg-white/5 border border-white/5 text-gray-400 hover:text-blue-400 rounded-xl transition-all md:opacity-0 md:group-hover/title:opacity-100 cursor-pointer flex-shrink-0 active:scale-90"
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
                  /* ⚡ RESPONSIVE FIX: 'opacity-100 md:opacity-0 md:group-hover:opacity-100' */
                  /* Pinalaki rin ang touch target gamit ang p-2.5 sa mobile, p-2 sa desktop */
                  className="absolute top-3 right-3 md:top-4 md:right-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2.5 md:p-2 bg-black/80 md:bg-black/60 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all cursor-pointer border border-white/10 active:scale-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 md:h-3 md:w-3" // pinalaki rin nang bahagya ang icon sa mobile
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
                Do you want to delete the watchlist "
                <span className="text-blue-400 font-bold">
                  {listToDelete.name}
                </span>
                "?
              </p>
            </div>

            {/* ⚡ OPTIMIZED BUTTON ROW PIPELINE FOR MOBILE & DESKTOP */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setListToDelete(null)}
                /* Idinagdag ang hover:bg-white/10, sm:text-xs, at active:scale-[0.98] para sa touch tactile flow */
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all cursor-pointer border border-white/5 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteListDelete}
                /* Idinagdag ang hover:bg-red-500, sm:text-xs, at active:scale-[0.98] kasama ang shadow overlay glow */
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg shadow-red-900/20 cursor-pointer active:scale-[0.98]"
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
                Do you want to remove{" "}
                <span className="text-blue-400 font-bold">
                  "{movieToRemove.title || movieToRemove.name}"
                </span>{" "}
                from this list?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMovieToRemove(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all cursor-pointer border border-white/5 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMovieRemove}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg shadow-red-900/20 cursor-pointer active:scale-[0.98]"
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
