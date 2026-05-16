import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import { useNavigate } from "react-router-dom";

// =========================================================
// SUB-COMPONENT: REUSABLE POST CARD WITH EXPANDABLE CONTENT
// =========================================================
const PostCard = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const textLimit = 250;
  const isTextLong = post.content && post.content.length > textLimit;
  const isMovieCountLong = post.movies && post.movies.length > 3;

  // Kung hindi pa expanded, puputulin ang text at movie lists
  const displayText =
    isTextLong && !isExpanded
      ? `${post.content.slice(0, textLimit)}...`
      : post.content;
  const displayMovies =
    isMovieCountLong && !isExpanded ? post.movies.slice(0, 3) : post.movies;

  // Handler kung may kailangang i-expand sa post
  const hasMoreToSee = isTextLong || isMovieCountLong;

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md hover:border-white/10 transition-all">
      {/* USER PROFILE HEADER */}
      <div className="flex items-center gap-3">
        {post.userPhoto ? (
          <img
            src={post.userPhoto}
            className="w-8 h-8 rounded-full object-cover border border-white/10"
            alt=""
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-xs text-blue-400">
            {post.userName?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            {post.userName}
          </h4>
          <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5 tracking-widest">
            {post.createdAt
              ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
              : "Just Now"}
          </p>
        </div>
      </div>

      {/* POST CONTENT TEXT */}
      {post.content && (
        <div className="space-y-1">
          <p className="text-gray-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">
            {displayText}
          </p>
          {isTextLong && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-500 hover:text-blue-400 text-xs font-black uppercase tracking-wider mt-1 block"
            >
              See More...
            </button>
          )}
        </div>
      )}

      {/* TAGGED MOVIE CARDS GRID DISPLAY */}
      {post.movies && post.movies.length > 0 && (
        <div className="pt-2 border-t border-white/5 mt-4">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4">
            🎬 Tagged Media ({post.movies.length}):
          </p>

          {/* Grid layout for visible movies */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {displayMovies.map((mv) => (
              <MovieCard
                key={mv.id}
                movie={{
                  id: mv.id,
                  title: mv.title,
                  poster_path: mv.poster_path,
                  media_type: mv.media_type,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* VIEW MORE / SHOW LESS OVERALL TOGGLE BUTTON AT THE BOTTOM */}
      {hasMoreToSee && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-6 py-2 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-400 transition-all shadow-md"
          >
            {isExpanded
              ? "▲ Show Less"
              : `▼ View More content (${post.movies.length > 3 ? `${post.movies.length - 3} more films` : ""})`}
          </button>
        </div>
      )}
    </div>
  );
};

// =========================================================
// MAIN CORE COMPONENT: NEWSFEED
// =========================================================
const Newsfeed = ({ user }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [taggedMovies, setTaggedMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // FETCH NEWSFEED POSTS (REAL-TIME)
  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // LIVE SEARCH DEBOUNCER
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.filter((m) => m.poster_path));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectMovie = (movie) => {
    if (taggedMovies.some((m) => m.id === movie.id)) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    setTaggedMovies([...taggedMovies, movie]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveTag = (movieId) => {
    setTaggedMovies(taggedMovies.filter((m) => m.id !== movieId));
  };

  // SUBMIT POST TO FIRESTORE
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please login to post!");
    if (!text.trim() && taggedMovies.length === 0) return;

    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous Viber",
        userPhoto: user.photoURL || "",
        content: text,
        movies: taggedMovies.map((m) => ({
          id: m.id,
          title: m.title || m.name,
          poster_path: m.poster_path,
          media_type: m.media_type || "movie",
        })),
        createdAt: serverTimestamp(),
      });

      setText("");
      setTaggedMovies([]);
      setIsComposerOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d17] text-white px-4 py-10 md:px-16 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Vibe Feed
          </h1>
        </div>

        {/* CREATE POST & MANAGE POST TRIGGER BARS */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
          {/* YUNG DATING CREATE POST BAR MO */}
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 shadow-xl w-full">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
                alt=""
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-sm text-blue-400">
                {user?.displayName?.[0]?.toUpperCase() || "V"}
              </div>
            )}
            <button
              onClick={() => setIsComposerOpen(true)}
              className="flex-1 bg-white/5 hover:bg-white/10 transition-all rounded-full py-3 px-6 text-left text-gray-400 text-xs font-medium border border-white/5"
            >
              What's on your mind, {user?.displayName?.split(" ")[0] || "Viber"}
              ? Share a movie...
            </button>
          </div>

          {/* BAGONG MGA MANAGEMENT BUTTON SA TABI */}
          <button
            onClick={() => navigate("/manage-posts")}
            className="h-full sm:h-16 w-full sm:w-auto px-6 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-blue-400 transition-all shadow-xl py-4 sm:py-0"
          >
            ⚙️ Manage
          </button>
        </div>

        {/* TIMELINE TIMELINE LIST */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.005]">
              <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
                The feed is quiet... Be the first to shout!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              // Ginagamit na natin ang bagong sub-component na may "View More" logic
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>

      {/* COMPOSER POPUP MODAL */}
      {isComposerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase italic tracking-widest text-blue-500">
                Create Post
              </h3>
              <button
                onClick={() => {
                  setIsComposerOpen(false);
                  setTaggedMovies([]);
                  setText("");
                }}
                className="text-gray-500 hover:text-white font-bold text-sm bg-white/5 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind? Share your thoughts or tag a film..."
                className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder-gray-600 resize-none h-32 custom-scrollbar"
                autoFocus
              />

              {/* SELECTED MEDIA PREVIEW (Mula sa nakaraang fix natin) */}
              {taggedMovies.length > 0 && (
                <div className="pt-2">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">
                    Selected Media Preview:
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-3 pt-1 no-scrollbar max-w-full">
                    {taggedMovies.map((m) => (
                      <div
                        key={m.id}
                        className="relative flex-shrink-0 w-24 bg-white/5 border border-white/10 rounded-2xl p-1.5 flex flex-col items-center group shadow-md"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                          className="w-full aspect-[2/3] object-cover rounded-xl shadow-inner"
                          alt=""
                        />
                        <p className="text-[9px] font-black uppercase tracking-tight text-gray-300 text-center truncate w-full mt-1.5 px-0.5">
                          {m.title || m.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(m.id)}
                          className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[8px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-[#0e1626]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEARCH BOX FOR TAGGING */}
              <div className="relative pt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Tag movies or TV shows..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all text-gray-300"
                />

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#141f35] border border-white/10 rounded-2xl max-h-48 overflow-y-auto z-50 p-2 space-y-1 no-scrollbar">
                    {searchResults.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        onClick={() => handleSelectMovie(movie)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-left transition-all group"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          className="w-6 h-9 object-cover rounded shadow-md"
                          alt=""
                        />
                        <span className="text-xs font-black uppercase tracking-wide truncate group-hover:text-blue-400 transition-colors">
                          {movie.title || movie.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.8rem] font-black uppercase italic tracking-widest text-xs transition-all shadow-lg mt-2"
              >
                Post to Timeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Newsfeed;
