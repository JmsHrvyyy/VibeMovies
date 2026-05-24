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
  getDoc,
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import MovieCard from "./MovieCard";
import { useNavigate } from "react-router-dom";
import {
  FolderHeart,
  Clapperboard,
  Heart,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Film,
  Trash2,
} from "lucide-react";

const triggerNotification = async (targetUserId, currentUser, type, postId) => {
  if (!targetUserId || targetUserId === currentUser.uid) return;

  try {
    // 1. Kukunin muna natin ang latest saved profile record ng kasalukuyang user sa Firestore
    const senderDocRef = doc(db, "users", currentUser.uid);
    const senderDocSnap = await getDoc(senderDocRef);

    // 2. Kung may custom nickname/displayName sa database, 'yun ang gagamitin. Kung wala, fallback sa Google Auth display name.
    let activeName = currentUser.displayName || "Someone";
    if (senderDocSnap.exists() && senderDocSnap.data().displayName) {
      activeName = senderDocSnap.data().displayName;
    }

    // 3. I-push na ang notification na may dalang tamang nickname!
    await addDoc(collection(db, "users", targetUserId, "notifications"), {
      senderId: currentUser.uid,
      senderName: activeName, // 🔥 Heto na ang tamang custom nickname paps!
      type: type,
      postId: postId,
      isRead: false,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed sending notification document:", error);
  }
};

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
      if (!hasLiked) {
        await triggerNotification(
          comment.userId,
          currentUser,
          "like_comment",
          post.id,
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyLike = async (replyId, replyUserId, currentLikes = []) => {
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
      if (!hasLiked) {
        await triggerNotification(
          replyUserId,
          currentUser,
          "like_reply",
          post.id,
        );
      }
    } catch (err) {
      console.error(err);
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

      // ✅ CRITICAL FIX: Pinalitan mula 'selectedCommentMovie' patungong 'selectedReplyMovie'
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
      await triggerNotification(
        comment.userId,
        currentUser,
        "reply_comment",
        post.id,
      );
      setReplyText("");
      setSelectedReplyMovie(null);
      setShowReplyForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isCommentLikedByMe = comment.likes?.includes(currentUser?.uid);

  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl space-y-2 text-left">
      <div className="flex items-center justify-between w-full">
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
          <UsernameDisplay
            userId={comment.userId}
            fallbackName={comment.userName}
            className="text-[10px] font-black uppercase tracking-wide text-gray-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-bold text-gray-600 uppercase">
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
              className="text-gray-600 hover:text-red-500 p-1"
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

      <div className="pl-7 flex items-center gap-4 text-[9px] font-black uppercase text-gray-500 pt-0.5">
        <button
          onClick={handleCommentLike}
          className={`flex items-center gap-1 ${isCommentLikedByMe ? "text-rose-500" : ""}`}
        >
          <Heart
            className={`w-2.5 h-2.5 ${isCommentLikedByMe ? "fill-rose-500" : ""}`}
          />{" "}
          Vibe ({comment.likes?.length || 0})
        </button>
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className={`flex items-center gap-1 hover:text-blue-400 ${showReplyForm ? "text-blue-400" : ""}`}
        >
          <MessageSquare className="w-2.5 h-2.5" /> Reply ({replies.length})
        </button>
      </div>

      {/* 🔥 ADDED: DITO MAPAPAKITA ANG MGA SUB-REPLIES AT REPLY INPUT FORM KAPAG HALOS BUKSAN */}
      {/* showReplyForm Box Layout */}
      {showReplyForm && (
        <div className="pl-7 mt-3 pt-3 border-t border-white/5 space-y-3">
          {/* Listahan ng Sub-replies */}
          {replies.length > 0 && (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {replies.map((reply) => {
                const isReplyLikedByMe = reply.likes?.includes(
                  currentUser?.uid,
                );
                return (
                  <div
                    key={reply.id}
                    className="bg-white/[0.01] border border-white/[0.02] p-2.5 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {reply.userPhoto ? (
                          <img
                            src={reply.userPhoto}
                            className="w-4 h-4 rounded-full object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-600/10 flex items-center justify-center text-[7px] font-black text-blue-400">
                            {reply.userName?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <UsernameDisplay
                          userId={reply.userId}
                          fallbackName={reply.userName}
                          className="text-[9px] font-black uppercase tracking-wide text-gray-300"
                        />
                      </div>
                      <span className="text-[6px] font-bold text-gray-600 uppercase">
                        {reply.createdAt?.seconds
                          ? new Date(
                              reply.createdAt.seconds * 1000,
                            ).toLocaleDateString()
                          : "Now"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium pl-5.5">
                      {reply.text}
                    </p>

                    {/* Render attached movie kung mayroon sa reply */}
                    {reply.movie && (
                      <div className="pl-5.5">
                        <AttachedMovieBadge movie={reply.movie} />
                      </div>
                    )}

                    <div className="pl-5.5 pt-0.5">
                      <button
                        onClick={() =>
                          handleReplyLike(reply.id, reply.userId, reply.likes)
                        }
                        className={`flex items-center gap-1 text-[8px] font-black uppercase ${isReplyLikedByMe ? "text-rose-500" : "text-gray-500"}`}
                      >
                        <Heart
                          className={`w-2 h-2 ${isReplyLikedByMe ? "fill-rose-500" : ""}`}
                        />
                        Vibe ({reply.likes?.length || 0})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply Form Input Field at Movie Search Integration */}
          <form onSubmit={handleAddReply} className="space-y-2">
            {/* Pakita ang napiling movie badge bago i-send */}
            {selectedReplyMovie && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl max-w-xs">
                <span className="text-[10px] font-black uppercase tracking-wide text-blue-400 truncate">
                  🎬 Selected:{" "}
                  {selectedReplyMovie.title || selectedReplyMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedReplyMovie(null)}
                  className="text-gray-500 hover:text-white text-xs font-black pl-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />

                {/* 🎬 MOVIE ATTACHMENT SEARCH INPUT FOR REPLY */}
                <input
                  type="text"
                  value={replyMovieQuery}
                  onChange={(e) => setReplyMovieQuery(e.target.value)}
                  placeholder="🍿 Attach a movie/show..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1 text-[10px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/30"
                />
              </div>

              <button
                type="submit"
                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase h-9 self-start"
              >
                Reply
              </button>
            </div>

            {/* Live Dropdown Search Results ng Movie */}
            {replyMovieResults.length > 0 && (
              <div className="bg-[#0e1420] border border-white/10 rounded-xl overflow-hidden shadow-2xl divide-y divide-white/5 max-w-xs animate-in fade-in slide-in-from-top-1 duration-150">
                {replyMovieResults.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => {
                      setSelectedReplyMovie(movie);
                      setReplyMovieQuery("");
                      setReplyMovieResults([]);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-white/5 text-left text-[10px] font-medium"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      className="w-6 h-9 object-cover rounded shadow"
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate">
                        {movie.title || movie.name}
                      </p>
                      <p className="text-gray-500 text-[8px] uppercase tracking-wider">
                        {movie.release_date
                          ? movie.release_date.split("-")[0]
                          : "N/A"}{" "}
                        • {movie.media_type || "Movie"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export const PostCard = ({
  post,
  currentUser,
  setItemToDelete,
  initialShowComments = false,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isCopying, setIsCopying] = useState(false);
  const [clonedListName, setClonedListName] = useState("");
  const [isCopySuccess, setIsCopySuccess] = useState(false);
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
      if (!hasLiked) {
        await triggerNotification(
          post.userId,
          currentUser,
          "like_post",
          post.id,
        );
      }
    } catch (err) {
      console.error(err);
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
      await triggerNotification(
        post.userId,
        currentUser,
        "comment_post",
        post.id,
      );
      setCommentText("");
      setSelectedCommentMovie(null);
    } catch (err) {
      console.error(err);
    }
  };

  const isLikedByMe = post.likes?.includes(currentUser?.uid);
  const folderCover =
    post.watchlistMovies && post.watchlistMovies.length > 0
      ? `https://image.tmdb.org/t/p/w500${post.watchlistMovies[0].poster}`
      : null;

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md hover:border-white/10 transition-all text-left w-full">
      <div
        onClick={() => navigate(`/profile/${post.userId}`)}
        className="flex items-center gap-3 cursor-pointer group"
      >
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
          <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">
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
              className="text-blue-500 text-xs font-black uppercase mt-1 block"
            >
              See More...
            </button>
          )}
        </div>
      )}

      {post.postType === "watchlist" ? (
        <div className="pt-2 border-t border-white/5 mt-4">
          <div
            onClick={() => setIsListModalOpen(true)}
            className="group cursor-pointer relative h-48 overflow-hidden rounded-[2rem] bg-[#0f172a] border border-white/10 max-w-md"
          >
            {folderCover && (
              <img
                src={folderCover}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                alt=""
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-6 z-10">
              <h3 className="text-xl font-black text-white truncate uppercase">
                {post.watchListName}
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest inline-block mt-1">
                {post.watchlistMovies?.length || 0} Movies • View List
              </span>
            </div>
          </div>
        </div>
      ) : (
        post.movies &&
        post.movies.length > 0 && (
          <div className="pt-2 border-t border-white/5 mt-4">
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
            className="px-6 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            {isExpanded ? "▲ Show Less" : `▼ View More content`}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
        <button
          onClick={handleLike}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase dynamic-btn ${isLikedByMe ? "bg-rose-600/10 border-rose-500/30 text-rose-500" : "bg-white/[0.02] border-white/5 text-gray-400"}`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${isLikedByMe ? "fill-rose-500" : ""}`}
          />{" "}
          Vibes ({post.likes?.length || 0})
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase ${showComments ? "bg-blue-600/10 border-blue-500/30 text-blue-400" : "bg-white/[0.02] border-white/5 text-gray-400"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Discuss ({comments.length})
        </button>
      </div>

      {showComments && (
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-center text-[10px] py-4 text-gray-600 font-bold uppercase tracking-widest">
                No discussion points yet.
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

          {/* 🎬 MAIN COMMENT FORM WITH MOVIE ATTACHMENT INTEGRATION */}
          <form onSubmit={handleAddComment} className="space-y-2">
            {/* Pakita ang napiling movie badge para sa main comment bago i-send */}
            {selectedCommentMovie && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl max-w-xs animate-in fade-in duration-150">
                <span className="text-[10px] font-black uppercase tracking-wide text-blue-400 truncate">
                  🎬 Attached:{" "}
                  {selectedCommentMovie.title || selectedCommentMovie.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCommentMovie(null)}
                  className="text-gray-500 hover:text-white text-xs font-black pl-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                {/* Text input ng comment */}
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />

                {/* 🍿 MOVIE SEARCH INPUT FOR MAIN COMMENT */}
                <input
                  type="text"
                  value={commentMovieQuery}
                  onChange={(e) => setCommentMovieQuery(e.target.value)}
                  placeholder="🍿 Attach a movie/show to this discussion..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/30"
                />
              </div>

              <button
                type="submit"
                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase h-10 self-start"
              >
                Send
              </button>
            </div>

            {/* Live Autocomplete Dropdown Search Results ng Movie para sa Main Comment */}
            {commentMovieResults.length > 0 && (
              <div className="bg-[#0e1420] border border-white/10 rounded-xl overflow-hidden shadow-2xl divide-y divide-white/5 max-w-xs absolute z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {commentMovieResults.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommentMovie(movie);
                      setCommentMovieQuery("");
                      setCommentMovieResults([]);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-white/5 text-left text-[10px] font-medium cursor-pointer"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      className="w-6 h-9 object-cover rounded shadow flex-shrink-0"
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate">
                        {movie.title || movie.name}
                      </p>
                      <p className="text-gray-500 text-[8px] uppercase tracking-wider">
                        {movie.release_date
                          ? movie.release_date.split("-")[0]
                          : "N/A"}{" "}
                        • {movie.media_type || "Movie"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
