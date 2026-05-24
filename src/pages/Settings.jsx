// pages/Settings.jsx
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  Lock,
  Settings as SettingsIcon,
  AlertOctagon,
  Loader2,
} from "lucide-react";

const Settings = ({ user }) => {
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // BAGONG STATE: Trigger para sa Custom Danger Zone Confirmation Modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

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
      setMessage({ type: "success", text: "Nickname updated dynamically! 🔄" });
    } catch (error) {
      console.error("Error updating nickname:", error);
      setMessage({ type: "error", text: "Failed to alter nickname context." });
    } finally {
      setIsSaving(false);
    }
  };

  // BAGONG LOGIC: Ito ang tatawagin ng Confirm button sa loob ng custom modal
  const handleExecuteDeactivation = async () => {
    if (!user) return;

    setIsDeactivating(true);
    setShowDeactivateModal(false); // Isara ang modal habang nagpo-process ang thread
    setMessage({ type: "", text: "" });

    try {
      // 1. Burahin ang profile document sa Firestore database asset pipeline
      const docRef = doc(db, "users", user.uid);
      await deleteDoc(docRef);

      // 2. I-sign out ang active session logs sa client identity terminal
      await signOut(auth);
    } catch (error) {
      console.error("Error deactivating account:", error);
      setMessage({
        type: "error",
        text: "Error deactivating account profile architecture.",
      });
      setIsDeactivating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-wider text-white">
          Access Restricted
        </h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs font-medium">
          Please log in to manage your core configuration parameters and network
          settings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-3xl mx-auto space-y-8 relative">
      {/* HEADER SECTION */}
      <div className="flex items-center gap-4">
        <div className="w-2.5 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-blue-500 animate-[spin_4s_linear_infinite]" />
            Control Center
          </h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            System Configuration & Account Preference Nodes
          </p>
        </div>
      </div>

      {/* FEEDBACK FLOATING BANNER */}
      {message.text && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-sm px-4">
          <div
            className={`px-4 py-3 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-2.5 shadow-2xl ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span className="text-xs">
              {message.type === "success" ? "✨" : "⚠️"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-center">
              {message.text}
            </span>
          </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS FORM CONTAINER */}
      <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wide mb-1">
            Profile Preferences
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Update your public alias inside the application pipeline.
          </p>
        </div>

        <form onSubmit={handleUpdateNickname} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
              Public Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your new custom alias..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
              disabled={isSaving || isDeactivating}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !nickname.trim() || isDeactivating}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing Parameters...
              </>
            ) : (
              "Save Modifications"
            )}
          </button>
        </form>
      </div>

      {/* DANGER ZONE CONTAINER */}
      <div className="bg-red-950/10 border border-red-500/10 rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-4">
        <div>
          <h2 className="text-md font-bold text-red-400 uppercase tracking-wide mb-1 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 stroke-[2.5] animate-pulse" />
            Danger Zone
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
            // BINAGO: Sa halip na window.confirm, bubuksan nito ang state modal window natin
            onClick={() => setShowDeactivateModal(true)}
            disabled={isDeactivating || isSaving}
            className="px-5 py-3 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDeactivating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate Account"
            )}
          </button>
        </div>
      </div>

      {/* 🚀 PROJECT INFO & CREDITS HUB */}
      <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 space-y-6 text-left">
        {/* About Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">
            🛸 About This Project
          </h3>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            This web application is a specialized community stream designed for
            film enthusiasts, cinephiles, and developers. It enables users to
            sync live commentary, share thoughts, curate personalized film
            watchlists, and attach cinematic references directly to discussions
            powered by a real-time TMDB pipeline ecosystem.
          </p>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">
            🛠️ Creator Credits
          </h3>
          <p className="text-xs text-gray-400 font-medium">
            Architected and Developed by{" "}
            <span className="text-white font-black hover:text-blue-400 transition-colors cursor-pointer">
              JmsHrvyyy
            </span>
            .
          </p>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">
            Built with React, Vite, Tailwind CSS, Firebase Firestore, and Lucide
            Icons.
          </p>
        </div>

        {/* Patch Notes Section */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">
              📦 Update Log & Patch Notes
            </h3>
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black tracking-widest text-emerald-400 rounded-md uppercase">
              v1.1.0 Stable
            </span>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {/* Patch 1 */}
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-wide">
                May 24, 2026 – Added Notification
              </p>
              <p className="text-xs text-gray-500 pl-2 leading-relaxed">
                • Added a new notification system that alerts users of new comments, replies, and mentions in real-time.
                <br />
                • Fixed the liked posts not updating immediately after liking or unliking a post.
                <br />
                • Fixed white screen issue on initial load and other pages.
                <br />
                • Fixed various minor bugs and consoles errors.
                <br />
                • Change alert into Modal notifation in MovieDetails.
                <br />
                • Added Admin Page to manage posts in newsfeed.
              </p>
            </div>

            {/* Patch 2 */}
            <div className="space-y-1 pt-1.5 border-t border-white/[0.02]">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-wide">
                May 22, 2026 – Login Bug Fixes
              </p>
              <p className="text-xs text-gray-500 pl-2 leading-relaxed">
                • Resolved whitescreen when logging in with new accounts that have no displayName set.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GLOBAL MODAL: CUSTOM ACCOUNT DEACTIVATION WINDOW */}
      {/* ========================================================= */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Warning Avatar Badge */}
            <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-500/20">
              <AlertOctagon className="w-5 h-5 stroke-[2.5] animate-bounce" />
            </div>

            {/* Modal Body Copy */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                Deactivate Account?
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                Sigurado ka ba? Permanenteng mabubura ang profile mo, mga
                settings, at pati ang iyong watchlists.{" "}
                <span className="text-red-400 font-bold">
                  Hindi na ito pwedeng bawiin o i-undo.
                </span>
              </p>
            </div>

            {/* Action Controller Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer border border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeactivation}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/30 cursor-pointer"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
