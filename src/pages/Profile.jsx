import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { searchMovies } from "../services/api";

const Profile = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [profileData, setProfileData] = useState({
    bio: "",
    favoriteMovieCover: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setProfileData(docSnap.data());
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSaveBio = async () => {
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { bio: profileData.bio },
        { merge: true },
      );
      setIsEditingBio(false);
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
    setProfileData({ ...profileData, favoriteMovieCover: newCover });
    await setDoc(
      doc(db, "users", user.uid),
      { favoriteMovieCover: newCover },
      { merge: true },
    );
    setIsModalOpen(false);
  };

  if (loading)
    return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] rounded-[2rem] p-6 md:p-10 border border-white/10 relative overflow-hidden flex items-center min-h-[250px] shadow-2xl">
        {/* EDIT COVER BUTTON (Top Right) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-5 right-5 z-30 p-3 bg-black/50 hover:bg-blue-600 backdrop-blur-md rounded-full border border-white/20 transition-all group"
          title="Change Cover"
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

        {/* BACKGROUND IMAGE & GRADIENT */}
        {profileData.favoriteMovieCover && (
          <div className="absolute inset-0 z-0">
            <img
              src={`https://image.tmdb.org/t/p/original${profileData.favoriteMovieCover}`}
              className="absolute right-0 top-0 h-full w-full md:w-[70%] object-cover opacity-50"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent"></div>
          </div>
        )}

        {/* PROFILE INFO */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img
            src={user?.photoURL}
            className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-blue-500 shadow-2xl object-cover"
            alt=""
          />
          <div className="min-w-0">
            <h1 className="text-3xl md:text-5xl font-black text-white">
              {user?.displayName}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH MODAL (Same as before but with better z-index) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="bg-gray-900 border border-white/10 w-full max-w-xl rounded-[2rem] p-6 relative z-10 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Set Header Movie</h2>
            <input
              type="text"
              autoFocus
              placeholder="Search movie cover..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4"
              value={searchTerm}
              onChange={handleSearchCover}
            />
            <div className="space-y-2">
              {searchResults.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => selectCover(movie)}
                  className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-xl transition-colors text-left group"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    className="w-12 h-16 object-cover rounded-lg"
                    alt=""
                  />
                  <div>
                    <p className="font-bold group-hover:text-blue-400">
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

export default Profile;
