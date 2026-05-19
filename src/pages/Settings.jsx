// pages/Settings.jsx
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const Settings = ({ user }) => {
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchCurrentNickname = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNickname(docSnap.data().displayName || "");
        }
      } catch (error) {
        console.error("Error fetching nickname:", error);
      }
    };

    fetchCurrentNickname();
  }, [user]);

  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !user) return;

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        displayName: nickname.trim(),
      });

      setMessage({
        type: "success",
        text: "Vibe check passed! Nickname updated successfully. 🎉",
      });
    } catch (error) {
      console.error("Error updating nickname:", error);
      setMessage({
        type: "error",
        text: "Oops! Something went wrong. Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: DEACTIVATE ACCOUNT FUNCTION
  const handleDeactivateAccount = async () => {
    if (!user) return;

    const confirmAction = window.confirm(
      "⚠️ WARNING: Are you sure you want to deactivate your account? This will permanently wipe your profile data from Movie Vibe. This action cannot be undone!",
    );

    if (!confirmAction) return;

    setIsDeactivating(true);
    try {
      // 1. Burahin ang data sa Firestore database
      const docRef = doc(db, "users", user.uid);
      await deleteDoc(docRef);

      // 2. I-logout ang user gamit ang Firebase Auth
      await signOut(auth);

      alert(
        "Your account data has been wiped successfully. Safe travels, Viber! 🚀",
      );
    } catch (error) {
      console.error("Error wiping user data:", error);
      alert(
        "Failed to deactivate account. Please try logging out and logging back in before trying again.",
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center text-gray-400 text-sm">
        Please log in to view settings.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-white p-6 md:p-12 max-w-2xl">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
          ⚙️ App Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage your identity and configuration on Movie Vibe.
        </p>
      </div>

      <div className="space-y-6">
        {/* CARD 1: ACCOUNT PROFILE */}
        <div className="bg-[#0d1527] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-md font-bold text-gray-200 uppercase tracking-wide mb-1">
              Change Nickname
            </h2>
            <p className="text-xs text-gray-400">
              This controls your displayed name across the Newsfeed, Posts, and
              Profile Stalk mode.
            </p>
          </div>

          {/* FEEDBACK MESSAGE */}
          {message.text && (
            <div
              className={`p-4 rounded-xl text-xs font-bold transition-all ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleUpdateNickname} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                Your Current Display Name
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter new nickname..."
                maxLength={20}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none font-bold transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !nickname.trim()}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-blue-600/10 w-full sm:w-auto"
            >
              {isSaving ? "Updating Name..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* CARD 2: DANGER ZONE (DEACTIVATE) */}
        <div className="bg-[#0d1527] border border-red-500/10 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-4">
          <div>
            <h2 className="text-md font-bold text-red-400 uppercase tracking-wide mb-1">
              🚨 Danger Zone
            </h2>
            <p className="text-xs text-gray-400">
              Actions here are irreversible. Be extremely careful.
            </p>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">Deactivate Account</p>
              <p className="text-xs text-gray-500">
                Permanently delete your user document and preferences from the
                app.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeactivateAccount}
              disabled={isDeactivating}
              className="px-5 py-3 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-black uppercase tracking-wider text-xs transition-all duration-200 shrink-0"
            >
              {isDeactivating ? "Wiping Data..." : "Deactivate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
