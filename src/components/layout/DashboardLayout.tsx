import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  PackagePlus,
  Search,
  Inbox,
  ShieldCheck,
  MessageSquare,
  Bell,
  Settings,
  PackageSearch,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { classNames } from "@/lib/utils";

const NAV = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "My Lost Items", to: "/dashboard/lost-items", icon: Search },
  { label: "My Found Items", to: "/dashboard/found-items", icon: PackagePlus },
  { label: "My Claims", to: "/dashboard/claims", icon: ShieldCheck },
  { label: "Messages", to: "/dashboard/messages", icon: MessageSquare },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell },
  { label: "Profile Settings", to: "/dashboard/profile", icon: Settings },
];

export function DashboardLayout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-navy-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-600">
                <PackageSearch className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">FindIt</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-navy-600 text-xs font-medium">
                Dashboard
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-navy-600 hover:bg-navy-500 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to site
              </Link>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-navy-700"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 flex-1 flex">
        {/* Sidebar */}
        <aside
          className={classNames(
            "fixed lg:sticky top-0 lg:top-16 left-0 z-40 lg:z-0 h-full lg:h-[calc(100vh-4rem)] w-64 flex-shrink-0 bg-white lg:bg-transparent border-r lg:border-r-0 border-slate-200 transition-transform duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-200">
            <span className="font-semibold text-navy-900">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  classNames(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-navy-50 text-navy-700"
                      : "text-navy-600 hover:bg-slate-50 hover:text-navy-800"
                  )
                }
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-navy-900/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 py-6 lg:pl-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
