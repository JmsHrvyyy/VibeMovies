import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import ArtistCard from "../components/ArtistCard";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, Theater, Users, Flame } from "lucide-react";

const Profile = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [profileData, setProfileData] = useState({
    bio: "",
    favoriteMovieCover: "",
    favGenres: [],
    favActors: [],
    favMovies: [],
    displayName: "",
    photoURL: "",
  });

  const { uid } = useParams();
  const navigate = useNavigate();
  const targetUid = uid || user?.uid;
  const isOwnProfile = targetUid === user?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, "users", targetUid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            bio: data.bio || "",
            favoriteMovieCover: data.favoriteMovieCover || "",
            favGenres: data.favGenres || [],
            favActors: data.favActors || [],
            favMovies: data.favMovies || [],
            displayName:
              data.displayName ||
              data.userName ||
              (isOwnProfile ? user?.displayName : "Movie Viber"),
            photoURL:
              data.photoURL ||
              data.userPhoto ||
              (isOwnProfile
                ? user?.photoURL
                : "https://via.placeholder.com/150"),
          });
        } else {
          setProfileData({
            bio: "",
            favoriteMovieCover: "",
            favGenres: [],
            favActors: [],
            favMovies: [],
            displayName: isOwnProfile
              ? user?.displayName
              : `Movie Viber (${targetUid.substring(0, 5)})`,
            photoURL: isOwnProfile
              ? user?.photoURL
              : "https://api.dicebear.com/7.x/bottts/svg?seed=" + targetUid,
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUid, user]);

  // ✅ SAFE REMOVE FUNCTION WITH INDEX FILTERING
  const removeMovie = async (movieId) => {
    try {
      const currentMovies = profileData.favMovies || [];
      const firstIndex = currentMovies.findIndex((m) => m.id === movieId);

      if (firstIndex === -1) return;

      const updatedMovies = currentMovies.filter(
        (_, index) => index !== firstIndex,
      );

      setProfileData((prev) => ({
        ...prev,
        favMovies: updatedMovies,
      }));

      if (user?.uid) {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { favMovies: updatedMovies }, { merge: true });
        console.log("Movie removed successfully!");
      }
    } catch (error) {
      console.error("Error removing movie:", error);
    }
  };

  const handleSaveBio = async () => {
    try {
      const userDoc = doc(db, "users", user.uid);
      await setDoc(userDoc, { bio: profileData.bio }, { merge: true });
      setIsEditingBio(false);
      console.log("Bio saved!");
    } catch (error) {
      console.error("Error saving bio:", error);
    }
  };

  const handleSearchCover = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) {
      const results = await searchMovies(e.target.value);
      setSearchResults(results);
    }
  };

  const selectCover = async (movie) => {
    const newCover = movie.backdrop_path;
    try {
      const userDoc = doc(db, "users", user.uid);
      await setDoc(userDoc, { favoriteMovieCover: newCover }, { merge: true });
      setProfileData((prev) => ({ ...prev, favoriteMovieCover: newCover }));
      setIsModalOpen(false);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error saving cover:", error);
    }
  };

  if (!user && !uid) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-wider text-white">
          Please Log In First
        </h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
          You need to be logged in to view and manage your profile.
        </p>
      </div>
    );
  }

  if (loading)
    return <div className="p-10 text-center">Loading Profile...</div>;

  const staticGenres = [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Romance",
    "Thriller",
    "Animation",
    "Documentary",
    "Fantasy",
  ];

  const saveData = async (newData) => {
    try {
      const userDoc = doc(db, "users", user.uid);
      await setDoc(userDoc, newData, { merge: true });
      setProfileData((prev) => ({ ...prev, ...newData }));
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleAddGenre = (genre) => {
    if (
      profileData.favGenres.length < 3 &&
      !profileData.favGenres.includes(genre)
    ) {
      const newGenres = [...profileData.favGenres, genre];
      saveData({ favGenres: newGenres });
    }
  };

  const removeGenre = (genre) => {
    const newGenres = profileData.favGenres.filter((g) => g !== genre);
    saveData({ favGenres: newGenres });
  };

  const searchPeople = async (query) => {
    setSearchTerm(query);
    if (query.length > 2) {
      try {
        const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
        const res = await fetch(
          `https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${query}`,
        );
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error("Actor search failed:", error);
      }
    }
  };

  const addActor = (person) => {
    if (profileData.favActors.length < 3) {
      const newActor = {
        id: person.id,
        name: person.name,
        image: person.profile_path
          ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
          : null,
      };
      saveData({ favActors: [...profileData.favActors, newActor] });
      setIsModalOpen(false);
    }
  };

  const removeActor = async (actorId) => {
    try {
      const updatedActors = profileData.favActors.filter(
        (a) => a.id !== actorId,
      );
      setProfileData((prev) => ({ ...prev, favActors: updatedActors }));
      if (user?.uid) {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { favActors: updatedActors }, { merge: true });
      }
    } catch (error) {
      console.error("Error removing actor:", error);
    }
  };

  // ✅ STRICT NO-DUPLICATE ENGINE
  const addMovie = (movie) => {
    const currentMovies = profileData.favMovies || [];

    if (currentMovies.length < 5) {
      const isAlreadyAdded = currentMovies.some(
        (m) => String(m.id) === String(movie.id),
      );

      if (isAlreadyAdded) {
        setIsModalOpen(false);
        setSearchTerm("");
        setSearchResults([]);
        return;
      }

      const newMovie = {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path,
        rating: movie.vote_average?.toFixed(1),
        year: movie.release_date?.split("-")[0],
      };

      const updatedMovies = [...currentMovies, newMovie];
      saveData({ favMovies: updatedMovies });
      setIsModalOpen(false);
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-10">
      {!isOwnProfile && (
        <button
          onClick={() => navigate("/feed")}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all duration-200 group w-fit"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform">
            ←
          </span>
          Back to Newsfeed
        </button>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] rounded-[2rem] p-6 md:p-10 border border-white/10 relative overflow-hidden flex items-center min-h-[250px] shadow-2xl">
        {isOwnProfile && (
          <button
            onClick={() => {
              setModalType("cover");
              setIsModalOpen(true);
            }}
            className="absolute top-5 right-5 z-30 p-3 bg-black/50 hover:bg-blue-600 backdrop-blur-md rounded-full border border-white/20 transition-all group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}

        {profileData.favoriteMovieCover && (
          <div className="absolute inset-0 z-0">
            <img
              src={`https://image.tmdb.org/t/p/original${profileData.favoriteMovieCover}`}
              className="absolute right-0 top-0 h-full w-full md:w-[80%] object-cover opacity-40 transition-opacity duration-700"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full">
          <img
            src={
              profileData.photoURL ||
              user?.photoURL ||
              "https://via.placeholder.com/150"
            }
            className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-blue-500 shadow-2xl object-cover shrink-0"
            alt=""
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {profileData.displayName || user?.displayName || "Movie Viber"}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
              {isEditingBio ? (
                <div className="flex gap-2">
                  <input
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    autoFocus
                  />
                  <button
                    onClick={handleSaveBio}
                    className="bg-blue-600 px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 italic text-sm md:text-lg">
                    {profileData.bio || "Movie Explorer"}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-500 hover:text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        {/* GENRES */}
        <div className="bg-[#0f172a] rounded-[2rem] p-8 border border-white/10 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="bg-blue-500/20 p-2 rounded-xl text-blue-500 text-base flex items-center justify-center">
                <Theater className="w-5 h-5 text-blue-500 stroke-[2.5]" />
              </span>
              Favorite Genres
            </h3>
            {isOwnProfile && (profileData.favGenres || []).length < 3 && (
              <button
                onClick={() => {
                  setModalType("genre");
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg"
              >
                + Add
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 flex-1">
            {profileData.favGenres?.map((genre, index) => (
              <div
                key={`genre-${genre}-${index}`}
                className="group relative bg-gradient-to-r from-white/5 to-transparent border border-white/5 p-5 rounded-2xl flex justify-between items-center hover:border-blue-500/50 hover:from-blue-500/10 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-1 h-8 bg-blue-500 rounded-full group-hover:h-10 transition-all"></div>
                  <span className="text-xl font-bold text-gray-200 tracking-tight">
                    {genre}
                  </span>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => removeGenre(genre)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors opacity-100 font-bold"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                )}
              </div>
            ))}
            {profileData.favGenres?.length === 0 && (
              <div className="border-2 border-dashed border-white/5 rounded-3xl p-10 text-center text-gray-600 font-bold uppercase tracking-widest text-xs">
                Empty Genre List
              </div>
            )}
          </div>
        </div>

        {/* ACTORS */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 shadow-xl flex flex-col">
          {/* Header Section: Inayos ang laki ng text at paddings para compact sa CP */}
          <div className="flex justify-between items-center mb-5 md:mb-8 px-1 md:px-4">
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-3">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-red-500 stroke-[2.5]" />{" "}
              Top 3 Favorite Actors
            </h3>
          </div>

          {/* ⚡ GRID PIPELINE OPTIMIZATION: Ginawang grid-cols-3 agad sa mobile view para magkatabi silang tatlo */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5 w-full flex-1">
            {profileData.favActors?.slice(0, 3).map((actor, index) => (
              <div
                key={`actor-${actor.id}-${index}`}
                className="relative group w-full h-full"
              >
                <ArtistCard artist={actor} />

                {isOwnProfile && (
                  /* ⚡ TOUCH OPTIMIZED REMOVE CONTROLS: Pinaliit ang buttons at margins para magkasya sa compact grid image layer nung card */
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeActor(actor.id);
                    }}
                    /* Inurong sa top-2 right-2 at pinalitan ang opacity para laging litaw sa CP (opacity-100 md:opacity-0) gaya ng watchlist fixes natin */
                    className="absolute right-2 top-2 z-20 text-gray-400 hover:text-red-500 transition-all bg-black/70 md:bg-black/40 backdrop-blur-sm p-1.5 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4" // pinaliit ang X icon sa mobile
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
                )}
              </div>
            ))}

            {/* Empty Slot Button Grid Box */}
            {isOwnProfile && profileData.favActors?.length < 3 && (
              <button
                onClick={() => {
                  setModalType("actor");
                  setIsModalOpen(true);
                }}
                /* Idinagdag ang gap-3 sa mobile (gap-6 sa desktop) at pinasok sa compact rounded corners */
                className="w-full aspect-[2/3] border-2 border-dashed border-white/10 rounded-xl md:rounded-[2.5rem] flex flex-col items-center justify-center gap-3 md:gap-6 hover:bg-white/5 transition-all group active:scale-95"
              >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-xl md:text-3xl text-gray-600 group-hover:text-red-500">
                    +
                  </span>
                </div>
                {/* Responsive Text Sizes: Itinago ang mahabang details sa pinakamaliliit na mobile tracking rules para hindi mag-overflow */}
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.3em] text-gray-500 group-hover:text-white text-center px-1">
                  Slot {profileData.favActors?.length + 1}
                </p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TOP 5 FAVORITE MOVIES */}
      <div className="bg-[#0f172a] rounded-[2rem] p-8 border border-white/10 shadow-xl mt-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-red-500/20 p-2 rounded-xl text-red-500 text-base flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-500 stroke-[2.5] fill-red-500/10" />
            </span>
            Top 5 Favorites
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {profileData.favMovies?.slice(0, 5).map((movie, index) => (
            <div key={`deck-${movie.id}-${index}`} className="relative group">
              <MovieCard
                movie={{
                  ...movie,
                  poster_path: movie.poster_path || movie.poster,
                }}
              />
              {isOwnProfile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMovie(movie.id);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs z-10 font-bold shadow-md opacity-100"
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
              )}
            </div>
          ))}

          {isOwnProfile && profileData.favMovies?.length < 5 && (
            <button
              onClick={() => {
                setModalType("movie");
                setIsModalOpen(true);
              }}
              className="aspect-[2/3] border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl text-gray-500">+</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center px-4">
                Add Favorite
              </span>
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => {
              setIsModalOpen(false);
              setSearchResults([]);
              setSearchTerm("");
            }}
          ></div>
          <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 relative z-10 max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-black mb-6 text-white uppercase tracking-tighter">
              {modalType === "cover"
                ? "Set Header Movie"
                : modalType === "genre"
                  ? "Select Genre"
                  : modalType === "movie"
                    ? "Add Favorite Movie"
                    : "Search Actor"}
            </h2>

            {modalType !== "genre" && (
              <input
                type="text"
                autoFocus
                placeholder={
                  modalType === "cover"
                    ? "Search for a movie cover..."
                    : modalType === "movie"
                      ? "Search for a movie title..."
                      : "Type actor name..."
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={
                  modalType === "cover" || modalType === "movie"
                    ? handleSearchCover
                    : (e) => searchPeople(e.target.value)
                }
              />
            )}

            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {/* ✅ MODAL MOVIE COVER SEARCH KEYS FIXED */}
              {modalType === "cover" && (
                <div className="space-y-2">
                  {searchResults.map((movie, index) => (
                    <button
                      key={`search-cover-${movie.id}-${index}`}
                      onClick={() => selectCover(movie)}
                      className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-xl transition-all text-left group"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        className="w-12 h-16 object-cover rounded-lg"
                        alt=""
                      />
                      <div>
                        <p className="font-bold text-white group-hover:text-blue-400">
                          {movie.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movie.release_date?.split("-")[0]}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {modalType === "genre" && (
                <div className="grid grid-cols-2 gap-2">
                  {staticGenres.map((g) => (
                    <button
                      key={`modal-genre-${g}`}
                      disabled={profileData.favGenres?.includes(g)}
                      onClick={() => {
                        handleAddGenre(g);
                        setIsModalOpen(false);
                      }}
                      className={`p-3 rounded-xl text-sm font-bold transition-all ${profileData.favGenres?.includes(g) ? "bg-gray-800 text-gray-600 cursor-not-allowed" : "bg-white/5 text-gray-300 hover:bg-blue-600 hover:text-white"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}

              {modalType === "actor" && (
                <div className="space-y-2">
                  {searchResults.map((person, index) => (
                    <button
                      key={`search-actor-${person.id}-${index}`}
                      onClick={() => addActor(person)}
                      className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all text-left group"
                    >
                      <img
                        src={
                          person.profile_path
                            ? `https://image.tmdb.org/t/p/w45${person.profile_path}`
                            : "https://via.placeholder.com/45"
                        }
                        className="w-10 h-10 rounded-full object-cover"
                        alt=""
                      />
                      <span className="text-white font-bold group-hover:text-yellow-500">
                        {person.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* ✅ MODAL FAV MOVIE SEARCH KEYS FIXED */}
              {modalType === "movie" && (
                <div className="space-y-2">
                  {searchResults.map((movie, index) => (
                    <button
                      key={`search-movie-${movie.id}-${index}`}
                      onClick={() => addMovie(movie)}
                      className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all text-left group"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        className="w-12 h-16 object-cover rounded-lg shadow-lg"
                        alt=""
                      />
                      <div>
                        <p className="font-bold text-white group-hover:text-red-500 transition-colors">
                          {movie.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movie.release_date?.split("-")[0]}
                        </p>
                      </div>
                    </button>
                  ))}
                  {searchResults.length === 0 && searchTerm.length > 2 && (
                    <p className="text-gray-500 text-center py-4 text-sm italic">
                      No movies found...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
