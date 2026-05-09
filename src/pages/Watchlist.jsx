import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc, // Dagdag import
  setDoc, // Dagdag import
  deleteDoc, // Dagdag import
} from "firebase/firestore";
import { searchMovies } from "../services/api";

const WatchlistPage = ({ user }) => {
  const [watchlists, setWatchlists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Load playlists real-time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "watchlists"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snapshot) => {
      setWatchlists(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
  }, [user]);

  const createList = async () => {
    if (!newListName.trim()) return;
    await addDoc(collection(db, "users", user.uid, "watchlists"), {
      name: newListName,
      movies: [],
      createdAt: new Date(),
    });
    setNewListName("");
    setIsCreating(false);
  };

  const addMovieToList = async (movie) => {
    if (!selectedList) return;

    const newMovie = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path,
      rating: movie.vote_average?.toFixed(1) || "0.0",
      year: movie.release_date?.split("-")[0] || "N/A",
    };

    // Iwasan ang duplicate sa loob ng same playlist
    if (selectedList.movies?.some((m) => m.id === movie.id)) {
      alert("Movie already in playlist!");
      return;
    }

    const updatedMovies = [...(selectedList.movies || []), newMovie];

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", selectedList.id);
      await setDoc(listRef, { movies: updatedMovies }, { merge: true });

      // Update local states
      setSelectedList((prev) => ({ ...prev, movies: updatedMovies }));
      setIsModalOpen(false);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  const handleSearchMovie = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (query.length > 2) {
      const results = await searchMovies(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Para burahin ang buong playlist/folder
  const deletePlaylist = async (e, listId) => {
    e.stopPropagation(); // Mahalaga ito para hindi bumukas ang folder pag-click sa X
    if (window.confirm("Delete this watchlist?")) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "watchlists", listId));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  // Para mag-tanggal ng movie sa loob ng napiling playlist
  const removeMovieFromList = async (movieId) => {
    const updatedMovies = selectedList.movies.filter((m) => m.id !== movieId);

    try {
      const listRef = doc(db, "users", user.uid, "watchlists", selectedList.id);
      await setDoc(listRef, { movies: updatedMovies }, { merge: true });

      // Update local state para mawala agad sa screen
      setSelectedList((prev) => ({ ...prev, movies: updatedMovies }));
    } catch (error) {
      console.error("Error removing movie:", error);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
      {!selectedList ? (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              My Watchlists
            </h1>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg"
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
                className="bg-white text-black px-6 py-2 rounded-xl font-black uppercase text-xs"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 font-bold text-xs px-2"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlists.map((list) => {
              // Kunin ang unang movie poster kung mayroon, otherwise null
              const coverPoster =
                list.movies && list.movies.length > 0
                  ? `https://image.tmdb.org/t/p/w500${list.movies[0].poster}`
                  : null;

              return (
                <div
                  key={list.id}
                  onClick={() => setSelectedList(list)}
                  className="group cursor-pointer relative h-64 overflow-hidden rounded-[2.5rem] bg-[#0f172a] border border-white/10 hover:border-blue-500/50 transition-all shadow-2xl"
                >
                  {/* DYNAMIC COVER PHOTO */}
                  {coverPoster ? (
                    <img
                      src={coverPoster}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                      alt={list.name}
                    />
                  ) : (
                    /* Placeholder kung empty ang folder */
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                  )}

                  {/* GRADIENT OVERLAY - Para mabasa ang text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

                  {/* DELETE BUTTON */}
                  <button
                    onClick={(e) => deletePlaylist(e, list.id)}
                    className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-lg backdrop-blur-md"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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

                  {/* PLAYLIST INFO */}
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
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedList(null)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                {selectedList.name}
              </h1>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
                {selectedList.movies?.length || 0} Movies in this list
              </p>
            </div>

            {/* ITO YUNG BUTTON NA INAYOS NATIN */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all"
            >
              + Add Movie
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {selectedList.movies?.map((movie) => (
              <div
                key={movie.id}
                className="bg-[#1a2235] border border-white/5 rounded-[2rem] p-3 group relative overflow-hidden"
              >
                {/* REMOVE MOVIE BUTTON */}
                <button
                  onClick={() => removeMovieFromList(movie.id)}
                  className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 p-2 bg-black/60 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all"
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

                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                  className="w-full aspect-[2/3] object-cover rounded-[1.5rem] group-hover:scale-105 transition-transform duration-500"
                  alt={movie.title}
                />
                <div className="p-3">
                  <h4 className="text-white font-bold truncate text-sm">
                    {movie.title}
                  </h4>
                  <p className="text-gray-500 text-[10px] font-bold uppercase">
                    {movie.year}
                  </p>
                </div>
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
                  className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all text-left group"
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
