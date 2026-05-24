import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import {
  ShieldAlert,
  Terminal,
  Lock,
  Trash2,
  ArrowLeft,
  MessageSquare,
  CornerDownRight,
  Clapperboard,
  FolderHeart,
} from "lucide-react";

// =========================================================
// LIVE CUSTOM NICKNAME DISPLAY (COPIED FROM YOUR ARCHIVE)
// =========================================================
const UsernameDisplay = ({ userId, fallbackName, className }) => {
  const [displayName, setDisplayName] = useState(fallbackName || "Anonymous");

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

  return <span className={className}>{displayName}</span>;
};

const Admin = ({ user }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);

  const ADMIN_SECRET_PIN = "MASTER2026";

  const handleVerifyAccess = (e) => {
    e.preventDefault();
    if (secretInput === ADMIN_SECRET_PIN) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("ACCESS DENIED: INVALID QUANTUM INTERFACE CRYPTO-KEY.");
      setSecretInput("");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleExecuteAdminDestruction = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "post") {
        await deleteDoc(doc(db, "posts", itemToDelete.id));
      } else if (itemToDelete.type === "comment") {
        await deleteDoc(
          doc(db, "posts", itemToDelete.postId, "comments", itemToDelete.id),
        );
      } else if (itemToDelete.type === "reply") {
        await deleteDoc(
          doc(
            db,
            "posts",
            itemToDelete.postId,
            "comments",
            itemToDelete.commentId,
            "replies",
            itemToDelete.id,
          ),
        );
      }
      setItemToDelete(null);
    } catch (error) {
      console.error("Super-Admin deletion pipeline breached:", error);
      setItemToDelete(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121826] border border-white/5 rounded-[3rem] p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center justify-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" /> Vibe Control Vault
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Authorized System Architect Access Only
            </p>
          </div>
          <form onSubmit={handleVerifyAccess} className="space-y-4">
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="ENTER ARCHITECT ACCESS KEY..."
              className="w-full bg-black/40 border border-white/10 text-center p-4 rounded-2xl text-xs font-mono text-red-400 tracking-[0.4em] focus:border-red-500/50 focus:outline-none transition-all"
              autoFocus
            />
            {authError && (
              <p className="text-[9px] font-black text-red-500 uppercase tracking-wide bg-red-500/5 p-2.5 rounded-xl border border-red-500/10">
                {authError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer"
            >
              Initialize Override
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-4 sm:p-8 md:p-12 relative">
      <div className="max-w-xl mx-auto space-y-6">
        {/* HEADER CONTROL PANEL */}
        <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 p-5 rounded-[2rem] gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center text-red-500 border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-black uppercase italic tracking-tighter text-white">
                Admin Control Core
              </h1>
              <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest">
                Global Bypass Deletion Stream
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
          >
            <ArrowLeft className="w-3 h-3" /> Exit
          </button>
        </div>

        {/* POSTS FEED */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-red-500 font-black italic uppercase tracking-widest text-xs">
              Intercepting Database Matrix...
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-600 font-black uppercase tracking-widest text-xs">
              No active node streams broadcasted.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <AdminPostCard
                  key={post.id}
                  post={post}
                  onDeletePost={(id) => setItemToDelete({ type: "post", id })}
                  onDeleteComment={(id, postId) =>
                    setItemToDelete({ type: "comment", id, postId })
                  }
                  onDeleteReply={(id, commentId, postId) =>
                    setItemToDelete({ type: "reply", id, commentId, postId })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION OVERLAY */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-red-500/20 p-6 rounded-[2.5rem] max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-white">
                Execute Force Deletion?
              </h3>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed px-2">
                Sigurado ka ba? Permanenteng mabubura ang{" "}
                <span className="text-red-400 font-bold uppercase">
                  {itemToDelete.type}
                </span>{" "}
                na ito sa database at hindi na pwedeng i-undo.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAdminDestruction}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// MAIN POST CARD COMPONENT
// =========================================================
const AdminPostCard = ({
  post,
  onDeletePost,
  onDeleteComment,
  onDeleteReply,
}) => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [post.id]);

  const folderCover =
    post.watchlistMovies && post.watchlistMovies.length > 0
      ? `https://image.tmdb.org/t/p/w500${post.watchlistMovies[0].poster}`
      : null;

  return (
    <div className="w-full bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md text-left relative overflow-hidden">
      {/* POST HEADER */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {post.userPhoto ? (
            <img
              src={post.userPhoto}
              className="w-8 h-8 rounded-full object-cover border border-white/10"
              alt=""
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center font-black text-xs text-blue-400 uppercase">
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
              {post.createdAt?.seconds
                ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
                : "Just Now"}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDeletePost(post.id)}
          className="p-2.5 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* POST CONTENT TEXT */}
      {post.content && (
        <div className="text-left">
          <p className="text-gray-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      )}

      {/* MAIN POST MOVIE ATTACHMENTS */}
      {post.postType !== "watchlist" &&
        post.movies &&
        post.movies.length > 0 && (
          <div className="pt-2 border-t border-white/5 mt-4">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5 text-gray-600" /> Tagged
              Media ({post.movies.length}):
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
          </div>
        )}

      {/* MAIN POST WATCHLIST */}
      {post.postType === "watchlist" && (
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
      )}

      {/* COMMENTS LIST INTEGRATION */}
      {comments.length > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-1.5 text-gray-500 font-black uppercase tracking-widest text-[9px]">
            <MessageSquare className="w-3 h-3" /> System Discussion Index (
            {comments.length})
          </div>
          <div className="space-y-3 pl-2 border-l border-white/5">
            {comments.map((comment) => (
              <AdminCommentItem
                key={comment.id}
                comment={comment}
                postId={post.id}
                onDeleteComment={onDeleteComment}
                onDeleteReply={onDeleteReply}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// SUB-COMPONENT: COMMENTS WITH SINGULAR MOVIE ATTACHMENT
// =========================================================
const AdminCommentItem = ({
  comment,
  postId,
  onDeleteComment,
  onDeleteReply,
}) => {
  const [replies, setReplies] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "posts", postId, "comments", comment.id, "replies"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [postId, comment.id]);

  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl space-y-3 text-left">
      <div className="flex items-center justify-between w-full">
        <UsernameDisplay
          userId={comment.userId}
          fallbackName={comment.userName}
          className="text-[10px] font-black uppercase tracking-wide text-gray-200"
        />
        <button
          onClick={() => onDeleteComment(comment.id, postId)}
          className="text-gray-600 hover:text-red-500 p-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="pl-2">
        {comment.text && (
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            {comment.text}
          </p>
        )}
      </div>

      {/* 🍿 SINGULAR MOVIE ATTACHMENT RENDERING FOR COMMENTS */}
      {comment.movie && (
        <div className="pl-2 pt-1 max-w-[140px]">
          <MovieCard
            movie={{
              id: comment.movie.id,
              title: comment.movie.title,
              poster_path: comment.movie.poster_path,
              media_type: comment.movie.media_type || "movie",
            }}
          />
        </div>
      )}

      {/* REPLIES LOOP TREE */}
      {replies.length > 0 && (
        <div className="pl-4 space-y-3 border-l border-white/5 pt-1 ml-2">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="space-y-2 bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-1.5">
                  <CornerDownRight className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                  {/* REALIGNED TO reply.userId & reply.userDisplayName BASED ON YOUR FEED LOOP SPEC */}
                  <UsernameDisplay
                    userId={reply.userId}
                    fallbackName={reply.userDisplayName}
                    className="text-[9px] font-black uppercase text-gray-400"
                  />
                </div>
                <button
                  onClick={() => onDeleteReply(reply.id, comment.id, postId)}
                  className="text-gray-600 hover:text-red-500 p-0.5 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="pl-5">
                <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                  {reply.text}
                </p>
              </div>

              {/* 🍿 SINGULAR MOVIE ATTACHMENT RENDERING FOR REPLIES */}
              {reply.movie && (
                <div className="pl-5 pt-1 max-w-[120px]">
                  <MovieCard
                    movie={{
                      id: reply.movie.id,
                      title: reply.movie.title,
                      poster_path: reply.movie.poster_path,
                      media_type: reply.movie.media_type || "movie",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
