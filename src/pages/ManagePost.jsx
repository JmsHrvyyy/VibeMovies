import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { searchMovies } from "../services/api";
import { useNavigate } from "react-router-dom";
import MovieCard from "../components/MovieCard";

// =========================================================
// MINI SUB-COMPONENT: INLINE MOVIE TAG BADGE FOR DISCUSSIONS
// =========================================================
const AttachedMovieBadge = ({ movie }) => {
  if (!movie) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl p-1 max-w-xs group shadow-sm">
      <img
        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
        className="w-6 h-9 object-cover rounded-lg flex-shrink-0"
        alt=""
      />
      <div className="min-w-0 flex-1 pr-1">
        <p className="text-[9px] font-black uppercase tracking-wide text-white truncate">
          {movie.title}
        </p>
        <span className="text-[6px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded mt-0.5 inline-block">
          🎬 {movie.media_type || "Movie"}
        </span>
      </div>
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: INDIVIDUAL MANAGED COMMENT ITEM WITH ACTIONS
// =========================================================
const ManagedCommentItem = ({ postId, comment, currentUser }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyCount, setReplyCount] = useState(0);

  const [replyMovie, setReplyMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const commentLikes = comment.likes || [];
  const isCommentLikedByMe = currentUser
    ? commentLikes.includes(currentUser.uid)
    : false;

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.filter((m) => m.poster_path).slice(0, 4));
      } catch (err) {
        console.error(err);
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
      console.error(error);
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
      console.error(error);
    }
  };

  return (
    <div className="bg-white/[0.01] border border-white/[0.02] p-3 rounded-2xl space-y-1.5">
      <div className="flex gap-3 items-start">
        {comment.userPhoto ? (
          <img
            src={comment.userPhoto}
            className="w-5 h-5 rounded-full object-cover border border-white/10 flex-shrink-0"
            alt=""
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-[8px] text-blue-400 flex-shrink-0">
            {comment.userName?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 space-y-0.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-white uppercase tracking-wide truncate pr-2">
              {comment.userName}
            </span>
            <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tight">
              {comment.createdAt
                ? new Date(
                    comment.createdAt.seconds * 1000,
                  ).toLocaleDateString()
                : "Now"}
            </span>
          </div>
          {comment.text && (
            <p className="text-gray-300 text-xs font-normal leading-normal break-words">
              {comment.text}
            </p>
          )}
          <AttachedMovieBadge movie={comment.movie} />
        </div>
      </div>

      <div className="flex items-center gap-3 pl-8 text-[8px] font-black uppercase tracking-wider text-gray-500">
        <button
          onClick={handleCommentLikeToggle}
          className={`hover:text-white transition-colors flex items-center gap-0.5 ${isCommentLikedByMe ? "text-blue-400" : ""}`}
        >
          {isCommentLikedByMe ? "❤️ Liked" : "🤍 Like"} ({commentLikes.length})
        </button>
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="hover:text-white transition-colors"
        >
          💬 Reply {replyCount > 0 && `(${replyCount})`}
        </button>
      </div>

      {showReplies && (
        <div className="pl-8 pt-1.5 space-y-2 border-l border-white/5 ml-2.5">
          <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="flex gap-2 bg-white/[0.005] p-2 rounded-xl items-start"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-black text-white uppercase tracking-wide">
                    {reply.userName}
                  </span>
                  {reply.text && (
                    <p className="text-gray-400 text-xs font-normal break-words">
                      {reply.text}
                    </p>
                  )}
                  <AttachedMovieBadge movie={reply.movie} />
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddReply} className="space-y-1 relative">
            {replyMovie && (
              <div className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded-lg w-fit text-[8px] text-blue-400 font-bold">
                🎬 {replyMovie.title || replyMovie.name}{" "}
                <button
                  type="button"
                  onClick={() => setReplyMovie(null)}
                  className="text-red-500 pl-1"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 border border-white/5 rounded-xl flex items-center px-3 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply..."
                  className="flex-1 bg-transparent py-1.5 text-xs text-gray-300 focus:outline-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🎬 Film..."
                  className="w-16 bg-white/5 border border-white/5 rounded px-1 text-[7px] text-right"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#141f35] border border-white/10 rounded-xl max-h-24 overflow-y-auto z-50 p-1 space-y-0.5 no-scrollbar">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setReplyMovie(m);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-1.5 p-1 hover:bg-white/5 rounded text-left text-[8px] text-gray-300 truncate"
                      >
                        {m.title || m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!replyText.trim() && !replyMovie}
                className="px-3 bg-blue-600 text-white disabled:text-gray-600 rounded-xl text-[8px] font-black uppercase"
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
// SUB-COMPONENT: INNER MANAGEMENT CARD WITH LIKES & COMMENTS
// =========================================================
const ManagedPostCard = ({
  post,
  currentUser,
  onEditTrigger,
  onDeleteTrigger,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(0);

  const [commentMovie, setCommentMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const likesArray = post.likes || [];
  const isLikedByMe = currentUser
    ? likesArray.includes(currentUser.uid)
    : false;
  const likeCount = likesArray.length;

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.filter((m) => m.poster_path).slice(0, 4));
      } catch (err) {
        console.error(err);
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
      console.error(error);
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
      console.error(error);
    }
  };

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md">
      {post.content && (
        <p className="text-gray-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* DYNAMIC ATTACHMENTS FOR FOLDER OR MEDIA */}
      {post.postType === "watchlist" ? (
        <div className="pt-2 border-t border-white/5 mt-2">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">
            📂 Shared Watchlist Folder:
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 inline-block max-w-xs">
            <h4 className="text-xs font-black uppercase tracking-wide text-white truncate">
              📁 {post.watchListName}
            </h4>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              {post.watchlistMovies?.length || 0} films enclosed
            </p>
          </div>
        </div>
      ) : (
        post.movies &&
        post.movies.length > 0 && (
          <div className="pt-2 border-t border-white/5 mt-2">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">
              🎬 Tagged Media ({post.movies.length}):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {post.movies.map((mv) => (
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
            <div className="flex items-center justify-end text-[9px] font-black uppercase tracking-widest text-gray-500 italic pt-1">
              {post.likes && post.likes.length > 0
                ? `❤️ ${post.likes.length} ${post.likes.length === 1 ? "Vibe" : "Vibes"} received`
                : "🤍 No vibes received yet"}
            </div>
          </div>
        )
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          onClick={handleLikeToggle}
          className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isLikedByMe ? "bg-blue-600/20 border border-blue-500/40 text-blue-400" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
        >
          {isLikedByMe ? "❤️ Liked" : "🤍 Like"}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${showComments ? "bg-white/10 border border-white/20 text-white" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
        >
          <span>💬 Comment</span>
          {commentCount > 0 && (
            <span className="bg-white/10 text-white font-bold text-[8px] px-1 py-0.5 rounded">
              {commentCount}
            </span>
          )}
        </button>
        <div className="flex-1 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 italic space-x-1.5">
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

      {showComments && (
        <div className="pt-4 border-t border-white/5 mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-1">
            {comments.length === 0 ? (
              <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest py-1 pl-1 italic">
                No comments yet...
              </p>
            ) : (
              comments.map((comment) => (
                <ManagedCommentItem
                  key={comment.id}
                  postId={post.id}
                  comment={comment}
                  currentUser={currentUser}
                />
              ))
            )}
          </div>
          <form onSubmit={handleAddComment} className="space-y-2 relative">
            {commentMovie && (
              <div className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded-lg w-fit text-[9px] text-blue-400 font-bold">
                🎬 {commentMovie.title || commentMovie.name}{" "}
                <button
                  type="button"
                  onClick={() => setCommentMovie(null)}
                  className="text-red-500 pl-1"
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
                  placeholder="Write a comment..."
                  className="flex-1 bg-transparent py-2.5 text-xs focus:outline-none text-gray-300 placeholder-gray-600"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🎬 Search..."
                  className="w-20 bg-white/5 border border-white/5 rounded-xl px-2 py-1 text-[9px] text-right"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#141f35] border border-white/10 rounded-xl max-h-32 overflow-y-auto z-50 p-1 space-y-0.5 no-scrollbar">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setCommentMovie(m);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-xl text-left text-xs text-gray-300 truncate"
                      >
                        {m.title || m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!commentText.trim() && !commentMovie}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 text-white disabled:text-gray-600 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-2">
        <button
          onClick={() => onEditTrigger(post)}
          className="flex-1 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
        >
          ✏️ Edit Text
        </button>
        <button
          onClick={() => onDeleteTrigger(post.id)}
          className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
        >
          🗑️ Delete Post
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
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "posts", editingPost.id), { content: editText });
      setEditingPost(null);
      setEditText("");
    } catch (error) {
      console.error(error);
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
    <div className="min-h-screen bg-[#080d17] text-white px-4 py-10 md:px-16 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/feed")}
              className="bg-white/5 hover:bg-white/10 p-3 rounded-full text-xs font-black uppercase tracking-wider transition-all"
            >
              ⬅ Back
            </button>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter">
                Manage My Posts
              </h1>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                Edit or cleanup your feed presence
              </p>
            </div>
          </div>
          <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-xs px-3 py-1.5 rounded-xl italic">
            {myPosts.length} Total Posts
          </span>
        </div>

        <div className="space-y-4">
          {myPosts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.005]">
              <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
                You haven't posted anything yet.
              </p>
            </div>
          ) : (
            myPosts.map((post) => (
              <ManagedPostCard
                key={post.id}
                post={post}
                currentUser={user}
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

      {editingPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase italic tracking-widest text-yellow-500">
                Edit Post Content
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-gray-500 hover:text-white font-bold text-sm bg-white/5 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder-gray-600 resize-none h-36 custom-scrollbar"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-4 bg-yellow-500 text-black rounded-[1.8rem] font-black uppercase italic tracking-widest text-xs transition-all shadow-lg"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {postToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-600/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                Delete this post?
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-2">
                Are you sure? Once deleted, this post and all its tagged movie
                info will be removed from the Vibe Feed permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePost;
