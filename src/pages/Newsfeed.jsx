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
  const navigate = useNavigate(); // Gagamitin natin ito para sa redirection

  if (!movie) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/movie/${movie.id}`)}
      className="mt-2 flex items-center gap-2.5 bg-white/[0.03] hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/30 rounded-xl p-1.5 max-w-xs group relative overflow-hidden shadow-sm text-left w-full transition-all duration-200"
    >
      <img
        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
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
// SUB-COMPONENT: INDIVIDUAL COMMENT ITEM (WITH LIKES, REPLIES & MOVIE TAGS)
// =========================================================
const CommentItem = ({ postId, comment, currentUser }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyCount, setReplyCount] = useState(0);

  // SEARCH STATES FOR REPLY MOVIE TAG
  const [replyMovie, setReplyMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const commentLikes = comment.likes || [];
  const isCommentLikedByMe = currentUser
    ? commentLikes.includes(currentUser.uid)
    : false;

  // TMDB DEBOUNCE FOR REPLY COMPOSER
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.filter((m) => m.poster_path).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    const repliesRef = collection(
      db,
      "posts",
      postId,
      "comments",
      comment.id,
      "replies",
    );
    const unsubscribe = onSnapshot(repliesRef, (snapshot) => {
      setReplyCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [postId, comment.id]);

  useEffect(() => {
    if (!showReplies) return;
    const repliesRef = collection(
      db,
      "posts",
      postId,
      "comments",
      comment.id,
      "replies",
    );
    const q = query(repliesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [showReplies, postId, comment.id]);

  const handleCommentLikeToggle = async () => {
    if (!currentUser) return alert("Please login to like this comment!");
    const commentRef = doc(db, "posts", postId, "comments", comment.id);
    try {
      if (isCommentLikedByMe) {
        await updateDoc(commentRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(commentRef, { likes: arrayUnion(currentUser.uid) });
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Please login to reply!");
    if (!replyText.trim() && !replyMovie) return;

    try {
      const repliesRef = collection(
        db,
        "posts",
        postId,
        "comments",
        comment.id,
        "replies",
      );
      await addDoc(repliesRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous Viber",
        userPhoto: currentUser.photoURL || "",
        text: replyText.trim(),
        movie: replyMovie
          ? {
              id: replyMovie.id,
              title: replyMovie.title || replyMovie.name,
              poster_path: replyMovie.poster_path,
              media_type: replyMovie.media_type || "movie",
            }
          : null,
        createdAt: serverTimestamp(),
      });
      setReplyText("");
      setReplyMovie(null);
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  return (
    <div className="bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl space-y-2">
      <div className="flex gap-3 items-start">
        {comment.userPhoto ? (
          <img
            src={comment.userPhoto}
            className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0"
            alt=""
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-[9px] text-blue-400 flex-shrink-0">
            {comment.userName?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 space-y-0.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white uppercase tracking-wide truncate pr-2">
              {comment.userName}
            </span>
            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tight flex-shrink-0">
              {comment.createdAt
                ? new Date(
                    comment.createdAt.seconds * 1000,
                  ).toLocaleDateString()
                : "Now"}
            </span>
          </div>
          {comment.text && (
            <p className="text-gray-300 text-xs font-normal leading-normal whitespace-pre-wrap break-words">
              {comment.text}
            </p>
          )}

          {/* TAGGED MOVIE INSIDE COMMENT */}
          <AttachedMovieBadge movie={comment.movie} />
        </div>
      </div>

      <div className="flex items-center gap-4 pl-9 text-[9px] font-black uppercase tracking-wider text-gray-500">
        <button
          onClick={handleCommentLikeToggle}
          className={`hover:text-white transition-colors flex items-center gap-1 ${isCommentLikedByMe ? "text-blue-400" : ""}`}
        >
          {isCommentLikedByMe ? "❤️ Liked" : "🤍 Like"} ({commentLikes.length})
        </button>
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          💬 Reply {replyCount > 0 && `(${replyCount})`}
        </button>
      </div>

      {showReplies && (
        <div className="pl-9 pt-2 space-y-3 border-l border-white/5 ml-3 animate-in fade-in duration-150">
          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="flex gap-2 bg-white/[0.01] p-2.5 rounded-xl items-start border border-white/[0.01]"
              >
                {reply.userPhoto ? (
                  <img
                    src={reply.userPhoto}
                    className="w-5 h-5 rounded-full object-cover border border-white/10 flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-[7px] text-blue-400 flex-shrink-0">
                    {reply.userName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-white uppercase tracking-wide truncate">
                      {reply.userName}
                    </span>
                    <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tight">
                      {reply.createdAt
                        ? new Date(
                            reply.createdAt.seconds * 1000,
                          ).toLocaleDateString()
                        : "Now"}
                    </span>
                  </div>
                  {reply.text && (
                    <p className="text-gray-400 text-xs font-normal leading-normal whitespace-pre-wrap break-words">
                      {reply.text}
                    </p>
                  )}

                  {/* TAGGED MOVIE INSIDE REPLY */}
                  <AttachedMovieBadge movie={reply.movie} />
                </div>
              </div>
            ))}
          </div>

          {/* REPLY FORM WITH INLINE MOVIE TAGGER */}
          <form onSubmit={handleAddReply} className="space-y-2 relative">
            {replyMovie && (
              <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-2 py-1 rounded-xl w-fit">
                <span className="text-[8px] font-black text-blue-400 uppercase truncate max-w-[120px]">
                  🎬 {replyMovie.title || replyMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyMovie(null)}
                  className="text-red-500 text-[10px] font-bold hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/5 rounded-xl flex items-center px-3 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    replyMovie
                      ? "Add context to movie reply..."
                      : "Write a reply or lookup movie below..."
                  }
                  className="flex-1 bg-transparent py-2 text-[11px] focus:outline-none text-gray-300 placeholder-gray-600"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🎬 Search film..."
                  className="w-20 sm:w-28 bg-white/5 border border-white/5 rounded-lg px-1.5 py-0.5 text-[8px] focus:outline-none focus:border-blue-500/30 text-gray-400 placeholder-gray-600 text-right"
                />

                {/* REPLY MEDIA SEARCH FLOATING DROPDOWN */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-[#141f35] border border-white/10 rounded-xl max-h-32 overflow-y-auto z-50 p-1 space-y-0.5 no-scrollbar shadow-xl">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setReplyMovie(m);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg text-left transition-all"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                          className="w-4 h-6 object-cover rounded"
                          alt=""
                        />
                        <span className="text-[9px] font-black text-gray-300 uppercase truncate">
                          {m.title || m.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!replyText.trim() && !replyMovie}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 text-white disabled:text-gray-600 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all"
              >
                Reply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: REUSABLE POST CARD (WITH LIKES & COMMENTS)
// =========================================================
const PostCard = ({ post, currentUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(0);

  // SEARCH STATES FOR MAIN COMMENT MOVIE TAG
  const [commentMovie, setCommentMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const textLimit = 250;
  const isTextLong = post.content && post.content.length > textLimit;
  const isMovieCountLong = post.movies && post.movies.length > 3;

  const displayText =
    isTextLong && !isExpanded
      ? `${post.content.slice(0, textLimit)}...`
      : post.content;
  const displayMovies =
    isMovieCountLong && !isExpanded ? post.movies.slice(0, 3) : post.movies;
  const hasMoreToSee = isTextLong || isMovieCountLong;

  const likesArray = post.likes || [];
  const isLikedByMe = currentUser
    ? likesArray.includes(currentUser.uid)
    : false;
  const likeCount = likesArray.length;

  // TMDB DEBOUNCE FOR COMMENT COMPOSER
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.filter((m) => m.poster_path).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    const commentsRef = collection(db, "posts", post.id, "comments");
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      setCommentCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    if (!showComments) return;
    const commentsRef = collection(db, "posts", post.id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleLikeToggle = async () => {
    if (!currentUser) return alert("Please login to like this post!");
    const postDocRef = doc(db, "posts", post.id);
    try {
      if (isLikedByMe) {
        await updateDoc(postDocRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postDocRef, { likes: arrayUnion(currentUser.uid) });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Please login to comment!");
    if (!commentText.trim() && !commentMovie) return;

    try {
      const commentsRef = collection(db, "posts", post.id, "comments");
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous Viber",
        userPhoto: currentUser.photoURL || "",
        text: commentText.trim(),
        likes: [],
        movie: commentMovie
          ? {
              id: commentMovie.id,
              title: commentMovie.title || commentMovie.name,
              poster_path: commentMovie.poster_path,
              media_type: commentMovie.media_type || "movie",
            }
          : null,
        createdAt: serverTimestamp(),
      });
      setCommentText("");
      setCommentMovie(null);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

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

      {/* TAGGED MOVIE CARDS */}
      {post.movies && post.movies.length > 0 && (
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
      )}

      {/* VIEW MORE TOGGLE BUTTON */}
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

      {/* INTERACTION ACTION PANEL */}
      <div className="flex items-center gap-3 pt-3 border-t border-white/5 mt-2">
        <button
          onClick={handleLikeToggle}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isLikedByMe ? "bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.15)]" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
        >
          {isLikedByMe ? "❤️ Liked" : "🤍 Like"}
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showComments ? "bg-white/10 border border-white/20 text-white" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
        >
          <span>💬 Comment</span>
          {commentCount > 0 && (
            <span className="bg-white/10 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md border border-white/5">
              {commentCount}
            </span>
          )}
        </button>

        <div className="flex-1 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 italic space-x-2">
          <span>
            {likeCount === 0
              ? "No vibes"
              : likeCount === 1
                ? "1 Vibe"
                : `${likeCount} Vibes`}
          </span>
          <span>•</span>
          <span>
            {commentCount === 0
              ? "0 Comments"
              : commentCount === 1
                ? "1 Comment"
                : `${commentCount} Comments`}
          </span>
        </div>
      </div>

      {/* EXPANDABLE COMMENT FEED BOX WITH FILM LOOKUP */}
      {showComments && (
        <div className="pt-4 border-t border-white/5 mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
            {comments.length === 0 ? (
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest py-2 pl-2 italic">
                No comments yet. Start the conversation...
              </p>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  postId={post.id}
                  comment={comment}
                  currentUser={currentUser}
                />
              ))
            )}
          </div>

          {/* COMMENT COMPOSER INPUT STRUCTURE */}
          <form onSubmit={handleAddComment} className="space-y-2 relative">
            {commentMovie && (
              <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-xl w-fit">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wide">
                  🎬 {commentMovie.title || commentMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setCommentMovie(null)}
                  className="text-red-500 font-bold hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl flex items-center px-4 relative">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    commentMovie
                      ? "Say something about this movie option..."
                      : "Write a comment or type on film search box..."
                  }
                  className="flex-1 bg-transparent py-3 text-xs focus:outline-none text-gray-300 placeholder-gray-600"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🎬 Search movie..."
                  className="w-24 sm:w-40 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-[10px] focus:outline-none focus:border-blue-500/30 text-gray-400 placeholder-gray-600 text-right"
                />

                {/* FLOATING MEDIA DROPDOWN OVERLAY */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#141f35] border border-white/10 rounded-2xl max-h-44 overflow-y-auto z-50 p-2 space-y-1 no-scrollbar shadow-2xl">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setCommentMovie(m);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-left transition-all group"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                          className="w-5 h-7 object-cover rounded shadow"
                          alt=""
                        />
                        <span className="text-xs font-black text-gray-300 uppercase truncate group-hover:text-blue-400">
                          {m.title || m.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!commentText.trim() && !commentMovie}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 text-white disabled:text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Send
              </button>
            </div>
          </form>
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

  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

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
        likes: [],
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
                The feed is quiet...
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
                placeholder="What's on your mind? Share your thoughts..."
                className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder-gray-600 resize-none h-32 custom-scrollbar"
                autoFocus
              />
              {taggedMovies.length > 0 && (
                <div>
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
