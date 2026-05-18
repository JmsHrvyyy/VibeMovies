import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import { useNavigate } from "react-router-dom";

// =========================================================
// MINI SUB-COMPONENT: INLINE MOVIE TAG BADGE (CLICKABLE FOR DETAILS)
// =========================================================
const AttachedMovieBadge = ({ movie }) => {
  const navigate = useNavigate();
  if (!movie) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/movie/${movie.id}`)}
      className="mt-2 flex items-center gap-2.5 bg-white/[0.03] hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/30 rounded-xl p-1.5 max-w-xs group relative overflow-hidden shadow-sm text-left w-full transition-all duration-200"
    >
      <img
        src={`https://image.tmdb.org/t/p/w92${movie.poster_path || movie.poster}`}
        className="w-8 h-12 object-cover rounded-lg shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
        alt=""
      />
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-white truncate group-hover:text-blue-400 transition-colors">
          {movie.title}
        </p>
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded mt-0.5 inline-block group-hover:bg-blue-500/20 transition-colors">
          🎬 {movie.media_type || "Movie"}
        </span>
      </div>
    </button>
  );
};

// =========================================================
// SUB-COMPONENT: INDIVIDUAL COMMENT BLOCK WITH LIKES AND REPLIES
// =========================================================
const CommentBlock = ({ post, comment, currentUser }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState([]);

  // Reply Movie Tag States
  const [replyMovieQuery, setReplyMovieQuery] = useState("");
  const [replyMovieResults, setReplyMovieResults] = useState([]);
  const [selectedReplyMovie, setSelectedReplyMovie] = useState(null);

  useEffect(() => {
    const repliesRef = collection(
      db,
      "posts",
      post.id,
      "comments",
      comment.id,
      "replies",
    );
    const q = query(repliesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [post.id, comment.id]);

  useEffect(() => {
    if (replyMovieQuery.trim().length < 2) {
      setReplyMovieResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchMovies(replyMovieQuery);
        setReplyMovieResults(data.filter((m) => m.poster_path).slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [replyMovieQuery]);

  const handleCommentLike = async () => {
    if (!currentUser) return alert("Please login to react!");
    const commentRef = doc(db, "posts", post.id, "comments", comment.id);
    const hasLiked = comment.likes?.includes(currentUser.uid);

    try {
      await updateDoc(commentRef, {
        likes: hasLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleReplyLike = async (replyId, currentLikes = []) => {
    if (!currentUser) return alert("Please login to react!");
    const replyRef = doc(
      db,
      "posts",
      post.id,
      "comments",
      comment.id,
      "replies",
      replyId,
    );
    const hasLiked = currentLikes.includes(currentUser.uid);

    try {
      await updateDoc(replyRef, {
        likes: hasLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error("Error liking reply:", err);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Please login to reply!");
    if (!replyText.trim() && !selectedReplyMovie) return;

    try {
      const replyData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || "",
        text: replyText.trim(),
        likes: [],
        createdAt: new Date(),
      };

      if (selectedReplyMovie) {
        replyData.movie = {
          id: selectedReplyMovie.id,
          title: selectedReplyMovie.title || selectedReplyMovie.name,
          poster_path: selectedReplyMovie.poster_path,
          media_type: selectedReplyMovie.media_type || "movie",
        };
      }

      await addDoc(
        collection(db, "posts", post.id, "comments", comment.id, "replies"),
        replyData,
      );

      setReplyText("");
      setSelectedReplyMovie(null);
      setReplyMovieQuery("");
      setShowReplyForm(false);
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  };

  const isCommentLikedByMe = comment.likes?.includes(currentUser?.uid);

  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl space-y-2">
      <div className="flex items-center gap-2">
        {comment.userPhoto ? (
          <img
            src={comment.userPhoto}
            className="w-5 h-5 rounded-full object-cover"
            alt=""
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center text-[9px] font-black text-blue-400">
            {comment.userName?.[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-[10px] font-black uppercase tracking-wide text-gray-200">
          {comment.userName}
        </span>
      </div>

      <div className="pl-7">
        {comment.text && (
          <p className="text-xs text-gray-400 font-medium">{comment.text}</p>
        )}
        {comment.movie && <AttachedMovieBadge movie={comment.movie} />}
      </div>

      <div className="pl-7 flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-gray-500 pt-0.5">
        <button
          onClick={handleCommentLike}
          className={`hover:text-white transition-colors flex items-center gap-1 ${isCommentLikedByMe ? "text-rose-500 hover:text-rose-400" : ""}`}
        >
          {isCommentLikedByMe ? "❤️Liked" : "🤍Vibe"} (
          {comment.likes?.length || 0})
        </button>
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="hover:text-blue-400 transition-colors flex items-center gap-1"
        >
          💬 Reply ({replies.length})
        </button>
      </div>

      {replies.length > 0 && (
        <div className="pl-7 pt-2 space-y-3 border-l border-white/5 ml-3 mt-1">
          {replies.map((reply) => {
            const isReplyLikedByMe = reply.likes?.includes(currentUser?.uid);
            return (
              <div
                key={reply.id}
                className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  {reply.userPhoto ? (
                    <img
                      src={reply.userPhoto}
                      className="w-4 h-4 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-300">
                      {reply.userName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-[9px] font-black uppercase text-gray-400">
                    {reply.userName}
                  </span>
                </div>

                <div className="pl-5">
                  {reply.text && (
                    <p className="text-[11px] text-gray-300 font-medium">
                      {reply.text}
                    </p>
                  )}
                  {reply.movie && <AttachedMovieBadge movie={reply.movie} />}
                </div>

                <div className="pl-5 pt-0.5">
                  <button
                    onClick={() => handleReplyLike(reply.id, reply.likes)}
                    className={`text-[8px] font-black uppercase tracking-widest transition-colors ${
                      isReplyLikedByMe
                        ? "text-rose-500 hover:text-rose-400"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {isReplyLikedByMe ? "❤️ Liked" : "🤍 Vibe"} (
                    {reply.likes?.length || 0})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showReplyForm && (
        <form
          onSubmit={handleAddReply}
          className="pl-7 pt-2 space-y-2 relative animate-in slide-in-from-top-1 duration-150"
        >
          {selectedReplyMovie && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-1.5 rounded-xl flex items-center justify-between text-[10px]">
              <span className="font-black uppercase tracking-wide text-blue-400">
                🍿 Tagged in Reply:{" "}
                {selectedReplyMovie.title || selectedReplyMovie.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedReplyMovie(null)}
                className="text-gray-400 hover:text-white text-[9px]"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-blue-500 text-gray-300 placeholder-gray-600"
                autoFocus
              />
              <input
                type="text"
                value={replyMovieQuery}
                onChange={(e) => setReplyMovieQuery(e.target.value)}
                placeholder="🎬 Tag film inside reply (optional)..."
                className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-3 py-1 text-[9px] focus:outline-none focus:border-blue-500/40 text-gray-500 placeholder-gray-700"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md mt-0.5"
            >
              Reply
            </button>
          </div>

          {replyMovieResults.length > 0 && (
            <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#121929] border border-white/10 rounded-xl max-h-32 overflow-y-auto z-[60] p-1.5 space-y-0.5 no-scrollbar shadow-2xl">
              {replyMovieResults.map((mv) => (
                <button
                  key={mv.id}
                  type="button"
                  onClick={() => {
                    setSelectedReplyMovie(mv);
                    setReplyMovieResults([]);
                    setReplyMovieQuery("");
                  }}
                  className="w-full flex items-center gap-2 p-1 hover:bg-white/5 rounded-lg text-left transition-all group"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w92${mv.poster_path}`}
                    className="w-4 h-6 object-cover rounded"
                    alt=""
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide truncate group-hover:text-blue-400 text-gray-400">
                    {mv.title || mv.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: REUSABLE POST CARD WITH WATCHLIST, LIKES & COMMENTS
// =========================================================
const PostCard = ({ post, currentUser }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);

  // Copy Watchlist & Custom Rename workflow states
  const [isCopying, setIsCopying] = useState(false);
  const [clonedListName, setClonedListName] = useState("");
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  // Comment Specific Movie Search States
  const [commentMovieQuery, setCommentMovieQuery] = useState("");
  const [commentMovieResults, setCommentMovieResults] = useState([]);
  const [selectedCommentMovie, setSelectedCommentMovie] = useState(null);

  const textLimit = 250;
  const isTextLong = post.content && post.content.length > textLimit;
  const isMovieCountLong = post.movies && post.movies.length > 3;

  const displayText =
    isTextLong && !isExpanded
      ? `${post.content.slice(0, textLimit)}...`
      : post.content;
  const displayMovies =
    isMovieCountLong && !isExpanded ? post.movies.slice(0, 3) : post.movies;
  const hasMoreToSee =
    isTextLong || (post.postType !== "watchlist" && isMovieCountLong);

  useEffect(() => {
    const commentsRef = collection(db, "posts", post.id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    if (commentMovieQuery.trim().length < 2) {
      setCommentMovieResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchMovies(commentMovieQuery);
        setCommentMovieResults(data.filter((m) => m.poster_path).slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [commentMovieQuery]);

  // Kapag binuksan ang modal, i-ready ang default clone name ng folder
  useEffect(() => {
    if (isListModalOpen && post.watchListName) {
      setClonedListName(`${post.watchListName} (Copy)`);
      setIsCopying(false);
      setIsCopySuccess(false);
    }
  }, [isListModalOpen, post.watchListName]);

  const handleLike = async () => {
    if (!currentUser) return alert("Please login to react!");
    const postRef = doc(db, "posts", post.id);
    const hasLiked = post.likes?.includes(currentUser.uid);

    try {
      await updateDoc(postRef, {
        likes: hasLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Please login to comment!");
    if (!commentText.trim() && !selectedCommentMovie) return;

    try {
      const commentData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userPhoto: currentUser.photoURL || "",
        text: commentText.trim(),
        likes: [],
        createdAt: new Date(),
      };

      if (selectedCommentMovie) {
        commentData.movie = {
          id: selectedCommentMovie.id,
          title: selectedCommentMovie.title || selectedCommentMovie.name,
          poster_path: selectedCommentMovie.poster_path,
          media_type: selectedCommentMovie.media_type || "movie",
        };
      }

      await addDoc(collection(db, "posts", post.id, "comments"), commentData);
      setCommentText("");
      setSelectedCommentMovie(null);
      setCommentMovieQuery("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // EXECUTE CORE DUPLICATION FLOW INTO USER'S OWN DB PATH
  const handleCloneWatchlist = async () => {
    if (!currentUser) return alert("Please login to copy this watchlist!");
    if (!clonedListName.trim()) return alert("Watchlist name cannot be empty!");

    setIsCopying(true);
    try {
      await addDoc(collection(db, "users", currentUser.uid, "watchlists"), {
        name: clonedListName.trim(),
        movies: post.watchlistMovies || [],
        createdAt: serverTimestamp(),
      });
      setIsCopySuccess(true);
      setIsCopying(false);
    } catch (err) {
      console.error("Error copying watchlist:", err);
      alert("Failed to clone watchlist. Try again.");
      setIsCopying(false);
    }
  };

  const isLikedByMe = post.likes?.includes(currentUser?.uid);
  const folderCover =
    post.watchlistMovies && post.watchlistMovies.length > 0
      ? `https://image.tmdb.org/t/p/w500${post.watchlistMovies[0].poster}`
      : null;

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

      {/* WATCHLIST / MOVIES GRID LINK CARD */}
      {post.postType === "watchlist" ? (
        <div className="pt-2 border-t border-white/5 mt-4">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            📂 Shared a Watchlist:
          </p>
          <div
            onClick={() => setIsListModalOpen(true)}
            className="group cursor-pointer relative h-48 overflow-hidden rounded-[2rem] bg-[#0f172a] border border-white/10 hover:border-blue-500/50 transition-all shadow-xl max-w-md"
          >
            {folderCover ? (
              <img
                src={folderCover}
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-500"
                alt=""
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-6 z-10">
              <h3 className="text-xl font-black text-white truncate mb-1 tracking-tighter uppercase group-hover:text-blue-400 transition-colors">
                {post.watchListName}
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest inline-block">
                {post.watchlistMovies?.length || 0} Movies • View List
              </span>
            </div>
          </div>
        </div>
      ) : (
        post.movies &&
        post.movies.length > 0 && (
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4">
              🎬 Tagged Media ({post.movies.length}):
            </p>
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
        )
      )}

      {/* VIEW MORE BOX */}
      {hasMoreToSee && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-6 py-2 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-400 transition-all shadow-md"
          >
            {isExpanded ? "▲ Show Less" : `▼ View More content`}
          </button>
        </div>
      )}

      {/* CORE INTERACTIONS PANEL */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
        <button
          onClick={handleLike}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            isLikedByMe
              ? "bg-rose-600/10 border-rose-500/30 text-rose-500 shadow-sm"
              : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {isLikedByMe ? "❤️" : "🤍"} Vibes ({post.likes?.length || 0})
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            showComments
              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-sm"
              : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          💬 Discuss ({comments.length})
        </button>
      </div>

      {/* DISCUSS DRAWER SYSTEM */}
      {showComments && (
        <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-200">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {comments.length === 0 ? (
              <p className="text-center text-[10px] py-4 text-gray-600 font-bold uppercase tracking-widest">
                No discussion points yet. Start the wave!
              </p>
            ) : (
              comments.map((comment) => (
                <CommentBlock
                  key={comment.id}
                  post={post}
                  comment={comment}
                  currentUser={currentUser}
                />
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="space-y-2 relative">
            {selectedCommentMovie && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl flex items-center justify-between text-xs">
                <span className="text-[10px] font-black uppercase tracking-wide text-blue-400">
                  🍿 Tagged:{" "}
                  {selectedCommentMovie.title || selectedCommentMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCommentMovie(null)}
                  className="text-gray-400 hover:text-white text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-gray-300 placeholder-gray-600"
                />
                <input
                  type="text"
                  value={commentMovieQuery}
                  onChange={(e) => setCommentMovieQuery(e.target.value)}
                  placeholder="🎬 Tag film inside comment (optional)..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-1.5 text-[10px] focus:outline-none focus:border-blue-500/50 text-gray-400 placeholder-gray-700"
                />
              </div>
              <button
                type="submit"
                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all h-10 shadow-md self-start"
              >
                Send
              </button>
            </div>

            {commentMovieResults.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#121929] border border-white/10 rounded-xl max-h-40 overflow-y-auto z-50 p-2 space-y-1 no-scrollbar shadow-2xl">
                {commentMovieResults.map((mv) => (
                  <button
                    key={mv.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommentMovie(mv);
                      setCommentMovieResults([]);
                      setCommentMovieQuery("");
                    }}
                    className="w-full flex items-center gap-2.5 p-1.5 hover:bg-white/5 rounded-lg text-left transition-all group"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${mv.poster_path}`}
                      className="w-5 h-7 object-cover rounded"
                      alt=""
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wide truncate group-hover:text-blue-400 text-gray-300">
                      {mv.title || mv.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {/* POPUP MODAL FOR SHARED WATCHLIST CONTENT (WITH CLONE & RENAME CAPABILITIES) */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
            onClick={() => setIsListModalOpen(false)}
          />
          <div className="bg-[#0b111e] border border-white/10 w-full max-w-4xl rounded-[2.5rem] p-6 md:p-8 relative z-10 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Top Context Control Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded mb-1 inline-block">
                  Curated List by {post.userName}
                </span>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {post.watchListName}
                </h2>
              </div>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white font-bold bg-white/5 w-10 h-10 rounded-full flex items-center justify-center md:static"
              >
                ✕
              </button>
            </div>

            {/* INTERACTIVE DUPLICATION WORKSPACE ACTION BAR */}
            {currentUser && currentUser.uid !== post.userId && (
              <div className="mb-6 bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                    Rename Watchlist Before Saving
                  </label>
                  <input
                    type="text"
                    disabled={isCopySuccess}
                    value={clonedListName}
                    onChange={(e) => setClonedListName(e.target.value)}
                    placeholder="Enter custom playlist name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  disabled={isCopying || isCopySuccess}
                  onClick={handleCloneWatchlist}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-end h-10 flex items-center justify-center gap-1.5 ${
                    isCopySuccess
                      ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-400"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg"
                  }`}
                >
                  {isCopying
                    ? "Cloning..."
                    : isCopySuccess
                      ? "✨ Watchlist Copied!"
                      : "📂 Copy Watchlist"}
                </button>
              </div>
            )}

            {/* Grid display of folder content loaded */}
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {post.watchlistMovies && post.watchlistMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-2">
                  {post.watchlistMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={{
                        id: movie.id,
                        title: movie.title,
                        poster_path: movie.poster,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                    This watchlist has no items.
                  </p>
                </div>
              )}
            </div>
          </div>
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

  const [composerTab, setComposerTab] = useState("tag");
  const [userWatchlists, setUserWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isComposerOpen) return;
    const q = query(
      collection(db, "users", user.uid, "watchlists"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserWatchlists(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsubscribe();
  }, [user, isComposerOpen]);

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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please login to post!");

    if (composerTab === "tag" && !text.trim() && taggedMovies.length === 0)
      return;
    if (composerTab === "watchlist" && !selectedWatchlist)
      return alert("Please select a watchlist folder to share!");

    try {
      const baseData = {
        userId: user.uid,
        userName: user.displayName || "Anonymous Viber",
        userPhoto: user.photoURL || "",
        content: text,
        postType: composerTab,
        likes: [],
        createdAt: serverTimestamp(),
      };

      if (composerTab === "watchlist") {
        baseData.watchlistId = selectedWatchlist.id;
        baseData.watchListName = selectedWatchlist.name;
        baseData.watchlistMovies = selectedWatchlist.movies || [];
      } else {
        baseData.movies = taggedMovies.map((m) => ({
          id: m.id,
          title: m.title || m.name,
          poster_path: m.poster_path,
          media_type: m.media_type || "movie",
        }));
      }

      await addDoc(collection(db, "posts"), { ...baseData });

      setText("");
      setTaggedMovies([]);
      setSelectedWatchlist(null);
      setComposerTab("tag");
      setIsComposerOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d17] text-white px-4 py-10 md:px-16 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-2.5 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Vibe Feed
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
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

          <button
            onClick={() => navigate("/manage-posts")}
            className="h-full sm:h-16 w-full sm:w-auto px-6 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-blue-400 transition-all shadow-xl py-4 sm:py-0"
          >
            ⚙️ Manage
          </button>
        </div>

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.005]">
              <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
                The feed is quiet... Be the first to shout!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={user} />
            ))
          )}
        </div>
      </div>

      {/* COMPOSER POPUP MODAL */}
      {isComposerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-shrink-0">
              <h3 className="text-sm font-black uppercase italic tracking-widest text-blue-500">
                Create Post
              </h3>
              <button
                onClick={() => {
                  setIsComposerOpen(false);
                  setTaggedMovies([]);
                  setSelectedWatchlist(null);
                  setText("");
                  setComposerTab("tag");
                }}
                className="text-gray-500 hover:text-white font-bold text-sm bg-white/5 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setComposerTab("tag");
                  setSelectedWatchlist(null);
                }}
                className={`py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${composerTab === "tag" ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
              >
                🎬 Tag Film/Show
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposerTab("watchlist");
                  setTaggedMovies([]);
                }}
                className={`py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all ${composerTab === "watchlist" ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
              >
                📂 Share Watchlist
              </button>
            </div>

            <form
              onSubmit={handleCreatePost}
              className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 no-scrollbar"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  composerTab === "watchlist"
                    ? "Write something about this watchlist folder..."
                    : "What's on your mind? Share your thoughts or tag a film..."
                }
                className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder-gray-600 resize-none h-24 flex-shrink-0 custom-scrollbar"
                autoFocus
              />

              {composerTab === "tag" && (
                <div className="space-y-4 flex-shrink-0">
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
                </div>
              )}

              {composerTab === "watchlist" && (
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex-shrink-0">
                    {selectedWatchlist
                      ? "Selected Watchlist Folder:"
                      : "Choose one of your Watchlist Folders to share:"}
                  </p>

                  {selectedWatchlist ? (
                    <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between shadow-inner animate-in fade-in duration-200 flex-shrink-0">
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-wide">
                          📁 {selectedWatchlist.name}
                        </h4>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                          {selectedWatchlist.movies?.length || 0} movies loaded
                          inside
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedWatchlist(null)}
                        className="bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-white/5"
                      >
                        Change Folder
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1 border border-white/5 rounded-2xl bg-white/[0.01] p-2 space-y-1.5 custom-scrollbar min-h-[120px]">
                      {userWatchlists.length === 0 ? (
                        <p className="text-center text-xs text-gray-600 py-8 font-bold uppercase tracking-wider">
                          No watchlists found. Go make one first!
                        </p>
                      ) : (
                        userWatchlists.map((list) => (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => setSelectedWatchlist(list)}
                            className="w-full p-3 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/20 rounded-xl flex items-center justify-between text-left transition-all group"
                          >
                            <span className="text-xs font-black uppercase tracking-wide text-gray-300 group-hover:text-white truncate max-w-[70%]">
                              📁 {list.name}
                            </span>
                            <span className="text-[9px] font-black bg-white/5 group-hover:bg-blue-500/20 px-2 py-0.5 rounded text-gray-500 group-hover:text-blue-400 uppercase tracking-widest">
                              {list.movies?.length || 0} Films
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.8rem] font-black uppercase italic tracking-widest text-xs transition-all shadow-lg flex-shrink-0 mt-auto"
              >
                {composerTab === "watchlist"
                  ? "🚀 Share Folder to Timeline"
                  : "Post to Timeline"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Newsfeed;
