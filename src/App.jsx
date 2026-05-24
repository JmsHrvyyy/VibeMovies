// App.jsx
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getTrendingMovies, searchMovies } from "./services/api";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import ArtistDetails from "./pages/ArtistDetails";
import WatchedMovies from "./pages/WatchedMovies";
import Newsfeed from "./pages/Newsfeed";
import ManagePost from "./pages/ManagePost";
import Settings from "./pages/Settings";
import AiDiscover from "./pages/AiDiscover";
import ViewPost from "./pages/ViewPost";
import Admin from "./pages/Admin";

function App() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false); // Para sa movie search
  const [authLoading, setAuthLoading] = useState(true); // 🔥 PINALITAN/IDINAGDAG: Para harangin ang karera sa load
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  // MGA BAGONG STATES PARA SA NICKNAME MODAL
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);

          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // 🔥 FIX: I-check kung may 'displayName' OR 'nickname' sa database.
            // Kung mayroon kahit alin sa dalawa, HUWAG nang ipakita ang modal (setShowNicknameModal(false)).
            if (userData.displayName || userData.nickname) {
              setShowNicknameModal(false);
            } else {
              setShowNicknameModal(true);
            }
          } else {
            // Kung talagang walang record sa Firestore, gawan ng basehan
            await setDoc(
              userDocRef,
              {
                uid: currentUser.uid,
                email: currentUser.email,
                createdAt: new Date().toISOString(),
                displayName: "", // Consistent na tayo sa displayName
              },
              { merge: true },
            );

            setShowNicknameModal(true);
          }
        } else {
          setUser(null);
          setShowNicknameModal(false);
        }
      } catch (err) {
        console.error(
          "Safe catch: Error accessing user profile document on auth change:",
          err,
        );
        // 🔥 FALLBACK SAFETY net: Kung nagkaproblema sa pagbasa ng Firestore rules sa unang segundo,
        // huwag nating inisin ang user. Gamitin muna ang pangalan mula sa Google Auth account kung meron.
        if (currentUser?.displayName) {
          setShowNicknameModal(false);
        }
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // FUNCTION PARA I-SAVE ANG NICKNAME SA FIRESTORE
  const handleSaveNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !user) return;

    setIsSavingNickname(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: nickname.trim(),
          photoURL: user.photoURL || "",
        },
        { merge: true },
      );

      // I-update din ang lokal na user state para mag-reflect agad
      setUser({
        ...user,
        displayName: nickname.trim(),
      });

      setShowNicknameModal(false); // Isara ang modal kapag tapos na
      setNickname("");
    } catch (error) {
      console.error("Error saving nickname:", error);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setMovies([]);
      return;
    }
    loading(true);
    const results = await searchMovies(query);
    setMovies(results);
    loading(false);
  };

  // Safe blocker: Habang binabasa pa ng Firebase kung sino ang pumasok,
  // HUWAG munang i-render ang Navbar, Sidebar, at Routes para hindi magulo ang query listeners.
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080d17] text-white font-bold uppercase tracking-widest text-xs">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-xl">⏳</span>
          <span>Vibing with Firebase...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col h-screen overflow-hidden bg-[#080d17] font-sans antialiased selection:bg-blue-500/30">
        <div className="relative z-50">
          <Navbar
            onSearch={handleSearch}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            user={user}
          />
        </div>

        <div className="flex flex-1 relative h-[calc(100vh-70px)]">
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            user={user}
          />

          <main className="flex-1 min-w-0 bg-[#080d17] overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <Home
                    user={user}
                    searchResults={movies}
                    searchLoading={loading}
                  />
                }
              />
              <Route path="/tv/:id" element={<MovieDetails user={user} />} />
              <Route path="/movie/:id" element={<MovieDetails user={user} />} />
              <Route
                path="/artist/:id"
                element={<ArtistDetails user={user} />}
              />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/profile/:uid" element={<Profile user={user} />} />
              <Route path="/watchlist" element={<Watchlist user={user} />} />
              <Route path="/watched" element={<WatchedMovies user={user} />} />
              <Route path="/feed" element={<Newsfeed user={user} />} />
              <Route
                path="/manage-posts"
                element={<ManagePost user={user} />}
              />
              <Route path="/settings" element={<Settings user={user} />} />
              <Route path="/ai-discover" element={<AiDiscover user={user} />} />
              <Route path="/post/:postId" element={<ViewPost user={user} />} />
              <Route path="/Admin" element={<Admin user={user} />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FIRST TIME / MISSING NICKNAME POPUP MODAL */}
      {/* ======================================================== */}
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="w-full max-w-md bg-[#0d1527] border border-white/5 rounded-[2rem] p-6 text-center shadow-2xl">
            <span className="text-4xl block mb-3">🎬</span>

            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-1">
              Welcome to Movie Vibe!
            </h2>

            <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6">
              Please Enter a Nickname to Start Vibing with the Movie Community!
              You can always change this later in your Settings.
            </p>

            <form onSubmit={handleSaveNickname} className="space-y-4">
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname..."
                maxLength={20}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none transition-all text-center font-bold"
              />

              <button
                type="submit"
                disabled={isSavingNickname || !nickname.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-blue-600/20"
              >
                {isSavingNickname ? "Saving Vibe..." : "Let's Vibe! 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
