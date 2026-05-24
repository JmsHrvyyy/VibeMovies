// Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../services/auth";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

const Navbar = ({ onSearch, isSidebarOpen, setIsSidebarOpen, user }) => {
  const [queryStr, setQueryStr] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // 1. Live listening sa notifications ng kasalukuyang user
  useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotifications(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.warn(
          "Navbar notification listener handled safely:",
          error.message,
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Auto-close dropdown kapag pumindot sa labas ng button/box
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasUnread = notifications.some((n) => !n.isRead);

  const handleNotifClick = async (notif) => {
    setIsOpen(false);
    try {
      if (!notif.isRead) {
        const notifRef = doc(db, "users", user.uid, "notifications", notif.id);
        await updateDoc(notifRef, { isRead: true });
      }
      navigate(`/post/${notif.postId}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // SVG ICON PICKER - FIXED LINE 94 CORRUPTED SVG STRING
  const getNotifContext = (type) => {
    switch (type) {
      case "like_post":
        return {
          msg: "liked your post",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-rose-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          ),
        };
      case "comment_post":
        return {
          msg: "commented on your post",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-blue-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501c1.153-.086 2.294-.213 3.423-.379 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          ),
        };
      case "like_comment":
        return {
          msg: "liked your comment",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-emerald-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          ),
        };
      case "reply_comment":
        return {
          msg: "replied to your comment",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-purple-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
              />
            </svg>
          ),
        };
      case "like_reply":
        return {
          msg: "liked your reply",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-amber-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9.75v6A1.5 1.5 0 0 1 12.75 17.25h-4.5"
              />
            </svg>
          ),
        };
      default:
        return {
          msg: "interacted with you",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 11.054 1.308l-.054-.027a.75.75 0 01-.041-1.261z"
              />
            </svg>
          ),
        };
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(queryStr);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-4 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* LEFT: LOGO & HAMBURGER */}
        <div className="flex items-center gap-2 md:gap-4 min-w-fit">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-gray-400 hover:text-white lg:hidden relative z-50 pointer-events-auto"
          >
            <span className="text-xl">☰</span>
          </button>
          <Link
            to="/"
            className="text-xl font-black text-white tracking-tighter"
          >
            VIBE<span className="text-blue-500">MOVIES</span>
          </Link>
        </div>

        {/* MIDDLE: SEARCH BAR */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 max-w-md relative group hidden md:block"
        >
          <input
            type="text"
            placeholder="Search for movies..."
            value={queryStr}
            onChange={(e) => {
              setQueryStr(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-12 py-2.5 rounded-full focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </form>

        {/* RIGHT SECTION: USER STATUS & NOTIFICATION BELL */}
        <div className="flex items-center gap-3 min-w-fit">
          {user ? (
            <>
              {/* NOTIFICATION BELL CONTAINER */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>

                  {/* 🔴 LIVE RED DOT INDICATOR */}
                  {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  )}
                </button>

                {/* NOTIFICATIONS DROPDOWN INBOX */}
                {isOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#0d1527] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-[999]">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Notifications
                      </h3>
                      {hasUnread && (
                        <span className="text-[10px] text-blue-500 font-bold px-2 py-0.5 bg-blue-500/10 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                      {notifications.length === 0 ? (
                        <p className="text-center py-8 text-xs text-gray-500 italic">
                          No vibe alerts yet... 🌌
                        </p>
                      ) : (
                        notifications.map((notif) => {
                          const context = getNotifContext(notif.type);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotifClick(notif)}
                              className={`p-4 flex items-start gap-3 cursor-pointer transition-colors text-left ${
                                notif.isRead
                                  ? "bg-transparent text-gray-400 hover:bg-white/5"
                                  : "bg-blue-500/5 text-white hover:bg-blue-500/10"
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0 bg-white/5 p-1.5 rounded-lg border border-white/5">
                                {context.icon}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-relaxed">
                                  <span className="font-black text-blue-400 uppercase tracking-tight mr-1">
                                    {notif.senderName}
                                  </span>
                                  {context.msg}
                                </p>
                                {/* 📅 FIXED LINE 312-313 FIRESTORE TIMESTAMP HANDLER */}
                                <span className="text-[9px] text-gray-500 font-bold uppercase mt-1 block">
                                  {notif.createdAt?.toDate
                                    ? notif.createdAt
                                        .toDate()
                                        .toLocaleDateString()
                                    : notif.createdAt
                                      ? new Date(
                                          notif.createdAt,
                                        ).toLocaleDateString()
                                      : ""}
                                </span>
                              </div>

                              {!notif.isRead && (
                                <span className="w-1.5 h-1.5 mt-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE CHIP */}
              <div className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10">
                <Link to="/profile">
                  <img
                    src={user.photoURL}
                    className="w-8 h-8 rounded-full border border-blue-500"
                    alt=""
                  />
                </Link>
                <span className="text-sm font-medium text-gray-200 hidden sm:block">
                  {user.displayName?.split(" ")[0] || "User"}
                </span>
              </div>
            </>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-blue-600 text-sm px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
