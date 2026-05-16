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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import MovieCard from "../components/MovieCard";

const ManagePost = ({ user }) => {
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState("");

  // MGA BAGONG STATES PARA SA CUSTOM CONFIRMATION MODAL
  const [postToDelete, setPostToDelete] = useState(null);

  const navigate = useNavigate();

  // HILAHIN LANG ANG POSTS NG CURRENT USER
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

  // FINAL DELETE HANDLER (KAPAG PININDOT ANG "YES, DELETE")
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await deleteDoc(doc(db, "posts", postToDelete));
      setPostToDelete(null); // Isara ang modal pagkatapos mag-delete
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  // UPDATE HANDLER
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;

    try {
      const postDocRef = doc(db, "posts", editingPost.id);
      await updateDoc(postDocRef, {
        content: editText,
      });
      setEditingPost(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating post:", error);
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
        {/* HEADER SECTION */}
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

        {/* POSTS LIST */}
        <div className="space-y-4">
          {myPosts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.005]">
              <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
                You haven't posted anything yet.
              </p>
            </div>
          ) : (
            myPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-md"
              >
                {post.content && (
                  <p className="text-gray-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {post.movies && post.movies.length > 0 && (
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
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setEditingPost(post);
                      setEditText(post.content);
                    }}
                    className="flex-1 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
                  >
                    ✏️ Edit Text
                  </button>
                  <button
                    onClick={() => setPostToDelete(post.id)} // <--- Bagong Trigger: Itatabi ang ID para magbukas ang modal
                    className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
                  >
                    🗑️ Delete Post
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= EDIT POPUP MODAL ================= */}
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

      {/* ================= BAGONG DAGDAG: CUSTOM DELETE CONFIRMATION MODAL ================= */}
      {postToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e1626] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Warning Icon Graphic */}
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

            {/* Modal Choices Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setPostToDelete(null)} // Cancel Action
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete} // Proceed Action
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
