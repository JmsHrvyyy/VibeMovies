import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import { useNavigate } from "react-router-dom";
import {
  FolderHeart,
  Clapperboard,
  Heart,
  MessageSquare,
  Film,
  Trash2,
  ArrowLeft,
  PencilLine,
  AlertTriangle,
  X,
} from "lucide-react";

// =========================================================
// 🚀 PIPELINE TRIGGER: Para mag-sync ang notification records
// =========================================================
const triggerNotification = async (targetUserId, currentUser, type, postId) => {
  if (!targetUserId || targetUserId === currentUser.uid) return;

  try {
    const senderDocRef = doc(db, "users", currentUser.uid);
    const senderDocSnap = await getDoc(senderDocRef);

    let activeName = currentUser.displayName || "Someone";
    if (senderDocSnap.exists() && senderDocSnap.data().displayName) {
      activeName = senderDocSnap.data().displayName;
    }

    await addDoc(collection(db, "users", targetUserId, "notifications"), {
      type,
      senderId: currentUser.uid,
      senderName: activeName,
      senderPhoto: currentUser.photoURL || "",
      postId,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to route interaction stream:", err);
  }
};

// =========================================================
// MICRO COMPONENT: LIVE CUSTOM NICKNAME DISPLAY
// =========================================================
const UsernameDisplay = ({ userId, fallbackName, className }) => {
  const [displayName, setDisplayName] = useState(fallbackName || "Anonymous");
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const fetchLatestName = async () => {
      try {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          setDisplayName(userDocSnap.data().displayName);
        }
      } catch (err) {
        console.error("Error fetching live nickname:", err);
      }
    };
    fetchLatestName();
  }, [userId, fallbackName]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/profile/${userId}`);
      }}
      className={`${className} hover:underline text-left cursor-pointer`}
      type="button"
    >
      {displayName}
    </button>
  );
};

// =========================================================
// MINI SUB-COMPONENT: INLINE MOVIE TAG BADGE
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
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded mt-0.5 inline-flex items-center gap-1 group-hover:bg-blue-500/20 transition-colors">
          <Clapperboard className="w-2 h-2 text-blue-500" />
          {movie.media_type || "Movie"}
        </span>
      </div>
    </button>
  );
};

// =========================================================
// SUB-COMPONENT: INDIVIDUAL COMMENT BLOCK WITH LIKES AND REPLIES
// =========================================================
const CommentBlock = ({ post, comment, currentUser, setItemToDelete }) => {
  const navigate = useNavigate();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState([]);

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

      // ⚡ Notification Trigger kapag ni-like mo ang comment ng iba
      if (!hasLiked) {
        await triggerNotification(
          comment.userId,
          currentUser,
          "liked your comment",
          post.id,
        );
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleReplyLike = async (reply) => {
    if (!currentUser) return alert("Please login to react!");
    const replyRef = doc(
      db,
      "posts",
      post.id,
      "comments",
      comment.id,
      "replies",
      reply.id,
    );
    const hasLiked = reply.likes?.includes(currentUser.uid);

    try {
      await updateDoc(replyRef, {
        likes: hasLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });

      // ⚡ Notification Trigger kapag ni-like mo ang reply ng iba
      if (!hasLiked) {
        await triggerNotification(
          reply.userId,
          currentUser,
          "liked your reply",
          post.id,
        );
      }
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

      // ⚡ Notification Trigger kapag nireplyan mo ang comment niya
      await triggerNotification(comment.userId, currentUser, "reply", post.id);

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
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/profile/${comment.userId}`)}
            className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
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
          </button>

          <UsernameDisplay
            userId={comment.userId}
            fallbackName={comment.userName}
            className="text-[10px] font-black uppercase tracking-wide text-gray-200"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tight">
            {comment.createdAt
              ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString()
              : "Now"}
          </span>

          {(currentUser?.uid === comment.userId ||
            currentUser?.uid === post.userId) && (
            <button
              onClick={() =>
                setItemToDelete({
                  type: "comment",
                  postId: post.id,
                  commentId: comment.id,
                })
              }
              className="text-gray-600 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
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
          <Heart
            className={`w-2.5 h-2.5 ${isCommentLikedByMe ? "text-rose-500 fill-rose-500" : "text-gray-500"}`}
          />
          {isCommentLikedByMe ? "Liked" : "Vibe"} ({comment.likes?.length || 0})
        </button>
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="hover:text-blue-400 transition-colors flex items-center gap-1"
        >
          <MessageSquare className="w-2.5 h-2.5 text-gray-500" />
          Reply ({replies.length})
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
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${reply.userId}`)}
                      className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                    >
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
                    </button>

                    <UsernameDisplay
                      userId={reply.userId}
                      fallbackName={reply.userName}
                      className="text-[9px] font-black uppercase text-gray-400"
                    />
                  </div>

                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tight flex-shrink-0">
                    {reply.createdAt
                      ? new Date(
                          reply.createdAt.seconds * 1000,
                        ).toLocaleDateString()
                      : "Now"}
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

                <div className="pl-5 pt-0.5 flex items-center justify-between w-full">
                  <button
                    onClick={() => handleReplyLike(reply)}
                    className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-colors ${
                      isReplyLikedByMe
                        ? "text-rose-500 hover:text-rose-400"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    <Heart
                      className={`w-2.5 h-2.5 ${isReplyLikedByMe ? "fill-rose-500" : ""}`}
                    />
                    <span>
                      {isReplyLikedByMe ? "Liked" : "Vibe"} (
                      {reply.likes?.length || 0})
                    </span>
                  </button>

                  {(currentUser?.uid === reply.userId ||
                    currentUser?.uid === post.userId) && (
                    <button
                      onClick={() =>
                        setItemToDelete({
                          type: "reply",
                          postId: post.id,
                          commentId: comment.id,
                          replyId: reply.id,
                        })
                      }
                      className="text-gray-600 hover:text-red-500 transition-colors p-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
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
                placeholder="Tag film inside reply (optional)..."
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
// SUB-COMPONENT: REUSABLE POST CARD (PANG-MANAGE EDITION)
// =========================================================
const PostCard = ({
  post,
  currentUser,
  setItemToDelete,
  onEditTrigger,
  onDeleteTrigger,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);

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
      // 💡 Tinanggal ang notification dito dahil sarili mong post ito
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
      // 💡 Tinanggal ang notification dito dahil sarili mong post ito

      setCommentText("");
      setSelectedCommentMovie(null);
      setCommentMovieQuery("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const isLikedByMe = post.likes?.includes(currentUser?.uid);
  const folderCover =
    post.watchlistMovies && post.watchlistMovies.length > 0
      ? `https://image.tmdb.org/t/p/w500${post.watchlistMovies[0].poster}`
      : null;

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md transition-all">
      <div className="flex items-center gap-3">
        {post.userPhoto ? (
          <img
            src={post.userPhoto}
            className="w-8 h-8 rounded-full object-cover border border-white/10"
            alt=""
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-xs text-blue-400">
            {post.userName?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div>
          <UsernameDisplay
            userId={post.userId}
            fallbackName={post.userName}
            className="text-xs font-black uppercase tracking-wider text-white"
          />
          <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5 tracking-widest">
            {post.createdAt
              ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
              : "Just Now"}
          </p>
        </div>
      </div>

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

      {post.postType === "watchlist" ? (
        <div className="pt-2 border-t border-white/5 mt-4">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <FolderHeart className="w-3.5 h-3.5 text-blue-500" /> Shared a
            Watchlist:
          </p>
          <div className="relative h-48 overflow-hidden rounded-[2rem] bg-[#0f172a] border border-white/10 shadow-xl max-w-md">
            {folderCover ? (
              <img
                src={folderCover}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                alt=""
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-6 z-10">
              <h3 className="text-xl font-black text-white truncate mb-1 tracking-tighter uppercase">
                {post.watchListName}
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest inline-block">
                {post.watchlistMovies?.length || 0} Movies
              </span>
            </div>
          </div>
        </div>
      ) : (
        post.movies &&
        post.movies.length > 0 && (
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5 text-gray-600" /> Tagged
              Media ({post.movies.length}):
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

      <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
        <button
          onClick={handleLike}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            isLikedByMe
              ? "bg-rose-600/10 border-rose-500/30 text-rose-500 shadow-sm"
              : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${isLikedByMe ? "fill-rose-500" : ""}`}
          />
          <span>Vibe ({post.likes?.length || 0})</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            showComments
              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-sm"
              : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comment ({comments.length})</span>
        </button>
      </div>

      {showComments && (
        <div className="pt-4 border-t border-white/5 space-y-4 animate-in fade-in duration-200">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 no-scrollbar">
            {comments.length === 0 ? (
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest py-2 pl-2 italic">
                No comments shared yet...
              </p>
            ) : (
              comments.map((comment) => (
                <CommentBlock
                  key={comment.id}
                  post={post}
                  comment={comment}
                  currentUser={currentUser}
                  setItemToDelete={setItemToDelete}
                />
              ))
            )}
          </div>

          <form
            onSubmit={handleAddComment}
            className="relative pt-2 border-t border-white/5 space-y-2"
          >
            {selectedCommentMovie && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-wide text-blue-400">
                  🍿 Tagged Film:{" "}
                  {selectedCommentMovie.title || selectedCommentMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCommentMovie(null)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2 items-start">
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this vibe..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-gray-300 placeholder-gray-600"
                />
                <input
                  type="text"
                  value={commentMovieQuery}
                  onChange={(e) => setCommentMovieQuery(e.target.value)}
                  placeholder="Attach a film card (optional)..."
                  className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-4 py-1.5 text-[10px] focus:outline-none focus:border-blue-500/40 text-gray-500 placeholder-gray-700"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md"
              >
                Send
              </button>
            </div>

            {commentMovieResults.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#121929] border border-white/10 rounded-2xl max-h-40 overflow-y-auto z-[60] p-2 space-y-1 no-scrollbar shadow-2xl">
                {commentMovieResults.map((mv) => (
                  <button
                    key={mv.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommentMovie(mv);
                      setCommentMovieResults([]);
                      setCommentMovieQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-1.5 hover:bg-white/5 rounded-xl text-left transition-all group"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${mv.poster_path}`}
                      className="w-6 h-9 object-cover rounded-lg shadow"
                      alt=""
                    />
                    <span className="text-xs font-bold uppercase tracking-wide truncate group-hover:text-blue-400 text-gray-400">
                      {mv.title || mv.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {/* CORE CONTROL PANEL: EDIT & DELETE BUTTONS AT THE BOTTOM */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-2">
        <button
          onClick={() => onEditTrigger(post)}
          className="flex-1 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <PencilLine className="w-3.5 h-3.5" />
          Edit Text
        </button>
        <button
          onClick={() => onDeleteTrigger(post.id)}
          className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Post
        </button>
      </div>
    </div>
  );
};

// =========================================================
// MAIN CONTAINER COMPONENT: MANAGE POST
// =========================================================
const ManagePost = ({ user }) => {
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState("");
  const [postToDelete, setPostToDelete] = useState(null);
  const navigate = useNavigate();
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [itemToDelete, setItemToDelete] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMyPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching your posts:", error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await deleteDoc(doc(db, "posts", postToDelete));
      setPostToDelete(null);
      showToast("Post removed from timeline! 👋", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to delete post.", "error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "posts", editingPost.id), { content: editText });
      setEditingPost(null);
      setEditText("");
      showToast("Post updated successfully! ✏️", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update post.", "error");
    }
  };

  const handleExecuteItemDelete = async () => {
    if (!itemToDelete) return;
    const { type, postId, commentId, replyId } = itemToDelete;

    try {
      if (type === "comment") {
        const commentDocRef = doc(db, "posts", postId, "comments", commentId);
        await deleteDoc(commentDocRef);
        showToast("Comment successfully deleted! 👋", "success");
      } else if (type === "reply") {
        const replyRef = doc(
          db,
          "posts",
          postId,
          "comments",
          commentId,
          "replies",
          replyId,
        );
        await deleteDoc(replyRef);
        showToast("Reply successfully deleted! 👋", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(`Hindi nabura ang ${type}. ⚠️`, "error");
    } finally {
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-blue-500 font-black italic uppercase tracking-widest">
        Loading Your Archive...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white px-4 py-6 sm:py-10 md:px-16 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* TOP LAYOUT: HEADER AND BACK BUTTON ONLY */}
        <div className="flex flex-row items-center justify-between gap-3 mt-2 sm:mt-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate("/feed")}
              className="bg-white/5 hover:bg-white/10 p-2.5 sm:p-3 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-300" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter truncate">
                Manage My Posts
              </h1>
              <p className="text-gray-500 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate">
                Edit or cleanup your feed presence
              </p>
            </div>
          </div>
          <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-[10px] sm:text-xs px-2.5 py-1.5 rounded-xl italic flex-shrink-0">
            {myPosts.length} Posts
          </span>
        </div>

        {/* FEED CARDS LIST ENCLOSURE */}
        <div className="space-y-4">
          {myPosts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.005]">
              <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
                You haven't posted anything yet.
              </p>
            </div>
          ) : (
            myPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                setItemToDelete={setItemToDelete}
                onEditTrigger={(p) => {
                  setEditingPost(p);
                  setEditText(p.content);
                }}
                onDeleteTrigger={(id) => setPostToDelete(id)}
              />
            ))
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-widest text-yellow-500">
                Edit Post Content
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-gray-500 hover:text-white font-bold bg-white/5 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder-gray-600 resize-none h-36 custom-scrollbar text-gray-300"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3.5 sm:py-4 bg-yellow-500 text-black rounded-[1.5rem] sm:rounded-[1.8rem] font-black uppercase italic tracking-widest text-xs transition-all shadow-lg"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POST DELETE MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-sm rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 text-center space-y-6 shadow-2xl">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-600/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-white">
                Delete this post?
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium leading-relaxed px-1">
                Are you sure? Once deleted, this post and all its tagged movie
                info will be removed permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ITEM (COMMENT/REPLY) DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setItemToDelete(null)}
          />
          <div className="bg-[#0b111e] border border-white/10 w-full max-w-sm rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 text-center space-y-5 relative z-10 shadow-2xl">
            <div className="w-12 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-white">
                Delete this {itemToDelete.type}?
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium leading-relaxed px-2">
                Sigurado ka ba? Permanenteng mawawala ito.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteItemDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] sm:w-auto pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-2xl border flex items-center justify-center gap-2 text-white ${
              toast.type === "success"
                ? "bg-emerald-600/90 border-emerald-500/30 backdrop-blur-md"
                : "bg-rose-600/90 border-rose-500/30 backdrop-blur-md"
            }`}
          >
            <span>{toast.type === "success" ? "⚡" : "⚠️"}</span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePost;
