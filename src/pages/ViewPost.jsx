import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { PostCard } from "../components/PostCard";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";

const ViewPost = ({ user }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    if (!postId) return;

    // Live sync sa target post doc
    const unsubscribe = onSnapshot(
      doc(db, "posts", postId),
      (docSnap) => {
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPost(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching single post layout:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [postId]);

  const handleExecuteItemDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "comment") {
        await deleteDoc(
          doc(
            db,
            "posts",
            itemToDelete.postId,
            "comments",
            itemToDelete.commentId,
          ),
        );
      }
      setItemToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs uppercase tracking-widest font-black mt-2 text-gray-500">
          Loading context stream...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white px-4 py-10 md:px-16 flex flex-col items-center w-full">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation Action Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-blue-400 transition-colors cursor-pointer mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </button>

        {post ? (
          <div className="animate-in fade-in duration-300 w-full">
            {/* Ginamit ang pinag-isang PostCard component! */}
            <PostCard
              post={post}
              currentUser={user}
              setItemToDelete={setItemToDelete}
              initialShowComments={true} // 👈 PAREHO NATING GAWING TRUE DITO PARA LAGING BUKAS SA PAGE NA ITO!
            />
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem]">
            <p className="text-gray-500 font-black text-sm uppercase italic tracking-widest">
              This post has been removed or does not exist.
            </p>
          </div>
        )}
      </div>

      {/* INNER COMMENT DELETION PORTAL MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Delete this {itemToDelete.type}?
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Sigurado ka ba? Permanenteng mawawala ito.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteItemDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase"
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

export default ViewPost;
