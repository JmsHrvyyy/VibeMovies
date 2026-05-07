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

  // Fetch user profile data
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
      setIsEditingBio(false); // Balik sa display mode pagkatapos i-save
    } catch (error) {
      alert("Error saving bio.");
    }
  };

  if (!user)
    return (
      <div className="text-center mt-20">Please login to view profile.</div>
    );

  // Search Logic for Modal
  const handleSearchCover = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) {
      const results = await searchMovies(e.target.value);
      setSearchResults(results.slice(0, 5)); // Top 5 results lang para malinis
    }
  };

  const selectCover = async (movie) => {
    const newPath = movie.backdrop_path || movie.poster_path;
    const updatedData = { ...profileData, favoriteMovieCover: newPath };
    setProfileData(updatedData);
    await setDoc(
      doc(db, "users", user.uid),
      { favoriteMovieCover: newPath },
      { merge: true },
    );
    setIsModalOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  // Idagdag sa handleSave para sa cover
  const saveCover = async (newPath) => {
    setProfileData({ ...profileData, favoriteMovieCover: newPath });
    await setDoc(
      doc(db, "users", user.uid),
      { favoriteMovieCover: newPath },
      { merge: true },
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 min-h-screen">
      {/* HEADER WITH DYNAMIC BACKGROUND */}
      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-8 mb-10 relative overflow-hidden group min-h-[300px]">
        {/* BACKGROUND IMAGE LAYER */}
        {profileData.favoriteMovieCover && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Ang Image: Ginawa nating 70% ang width at itinulak sa kanan */}
            <img
              src={`https://image.tmdb.org/t/p/original${profileData.favoriteMovieCover}`}
              className="absolute right-0 top-0 h-full w-full md:w-[70%] object-cover object-center opacity-60"
              alt="Cover Background"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a] via-[#0f172a]/95 to-transparent"></div>

            {/* Optional: Dagdag na subtle vignette sa ilalim para mas cinematic */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent"></div>
          </div>
        )}

        {/* Edit Cover Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-6 right-6 z-20 p-3 bg-black/40 hover:bg-blue-600 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
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

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 w-full">
          <img
            src={user?.photoURL}
            className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-blue-500 shadow-2xl"
            alt="Profile"
          />
          <div className="text-center md:text-left flex-1 min-w-0">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
              {user?.displayName}
            </h1>

            {/* Bio Section with Edit Button */}
            <div className="flex items-center justify-center md:justify-start gap-3 h-10">
              {isEditingBio ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <input
                    type="text"
                    autoFocus
                    className="bg-black/40 backdrop-blur-md border border-blue-500/50 rounded-lg px-3 py-1 text-gray-200 w-full focus:outline-none"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                  />
                  <button
                    onClick={handleSaveBio}
                    className="text-green-400 font-bold hover:text-green-300 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingBio(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-lg text-gray-300 italic opacity-90 drop-shadow-md truncate max-w-[80%]">
                    {profileData.bio || "Movie Explorer"}
                  </p>
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/edit"
                    title="Edit Bio"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400 group-hover/edit:text-blue-400 transition-colors"
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

      {/* SELECTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-gray-900 border border-white/10 w-full max-w-lg rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Set Header Movie</h2>
            <input
              type="text"
              autoFocus
              placeholder="Search for a movie cover..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all mb-4"
              value={searchTerm}
              onChange={handleSearchCover}
            />

            <div className="space-y-2">
              {searchResults.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => selectCover(movie)}
                  className="w-full flex items-center gap-4 p-2 hover:bg-white/5 rounded-xl transition-colors group"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    className="w-12 h-16 object-cover rounded-lg"
                    alt=""
                  />
                  <div className="text-left">
                    <p className="font-bold group-hover:text-blue-400 transition-colors">
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
