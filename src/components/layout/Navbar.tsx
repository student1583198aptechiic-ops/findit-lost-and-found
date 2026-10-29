import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  PackageSearch,
  Plus,
  User,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";
import { timeAgo, classNames } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Browse Items", to: "/items" },
  { label: "About", to: "/about" },
];

export function Navbar() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      setNotifications((data as Notification[]) ?? []);
      setUnreadCount(
        (data as Notification[])?.filter((n) => !n.read_at).length ?? 0
      );
    }
    load();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    if (!session?.user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", session.user.id)
      .is("read_at", null);
  }

  async function markOneRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }

  function handleSignOut() {
    signOut();
    navigate("/");
  }

  function searchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    navigate(`/items?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-white">
              <PackageSearch className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-navy-900 hidden sm:block">
              FindIt
            </span>
          </Link>

          {/* Desktop search */}
          <form
            onSubmit={searchSubmit}
            className="hidden md:flex flex-1 max-w-md relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="q"
              placeholder="Search items..."
              className="input pl-10 py-2"
            />
          </form>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={classNames(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === link.to
                    ? "text-navy-700 bg-navy-50"
                    : "text-navy-600 hover:text-navy-800 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {session ? (
              <>
                {/* Report button */}
                <Link to="/report-lost" className="hidden lg:inline-flex btn-primary py-2 text-sm">
                  <Plus className="h-4 w-4" /> Report
                </Link>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative p-2 rounded-lg text-navy-600 hover:bg-slate-50 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 card overflow-hidden animate-slide-up z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="font-semibold text-sm text-navy-900">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs font-medium text-navy-500 hover:text-navy-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-navy-400">
                            No notifications yet
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                if (!n.read_at) markOneRead(n.id);
                                if (n.related_resource_type === "item" && n.related_resource_id)
                                  navigate(`/items/${n.related_resource_id}`);
                                setNotifOpen(false);
                              }}
                              className={classNames(
                                "w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3",
                                !n.read_at && "bg-navy-50/50"
                              )}
                            >
                              {!n.read_at && (
                                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-navy-500" />
                              )}
                              <div className={n.read_at ? "pl-5" : ""}>
                                <p className="text-sm font-medium text-navy-900">
                                  {n.title}
                                </p>
                                <p className="text-xs text-navy-500 mt-0.5">
                                  {n.message}
                                </p>
                                <p className="text-xs text-navy-400 mt-1">
                                  {timeAgo(n.created_at)}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-navy-600 text-xs font-semibold">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 card py-1.5 animate-slide-up z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-semibold text-navy-900 truncate">
                          {profile?.full_name || "Account"}
                        </p>
                        <p className="text-xs text-navy-500 truncate">
                          {session.user.email}
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                      <Link
                        to="/dashboard/messages"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-slate-50 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" /> Messages
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-slate-50 transition-colors"
                        >
                          <Shield className="h-4 w-4" /> Admin
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost py-2 text-sm">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary py-2 text-sm">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-navy-600 hover:bg-slate-50"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 animate-slide-up">
            <form onSubmit={searchSubmit} className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="q"
                placeholder="Search items..."
                className="input pl-10 py-2"
              />
            </form>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={classNames(
                    "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === link.to
                      ? "text-navy-700 bg-navy-50"
                      : "text-navy-600 hover:bg-slate-50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <Link to="/dashboard" className="px-3 py-2.5 rounded-lg text-sm font-medium text-navy-600 hover:bg-slate-50">
                    Dashboard
                  </Link>
                  <Link to="/report-lost" className="btn-primary w-full mt-2">
                    <Plus className="h-4 w-4" /> Report Lost Item
                  </Link>
                  <Link to="/report-found" className="btn-secondary w-full mt-2">
                    <Plus className="h-4 w-4" /> Report Found Item
                  </Link>
                </>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Link to="/login" className="btn-secondary flex-1">
                    Login
                  </Link>
                  <Link to="/signup" className="btn-primary flex-1">
                    Sign up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
