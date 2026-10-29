import { Link } from "react-router-dom";
import { PackageSearch, Mail, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-700 text-white">
                <PackageSearch className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold text-navy-900">FindIt</span>
            </Link>
            <p className="mt-3 text-sm text-navy-500 max-w-sm">
              The smart lost-and-found platform that helps people report lost
              items, discover possible matches, and safely reconnect belongings
              with their owners.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-navy-500 hover:bg-navy-100 transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-navy-500 hover:bg-navy-100 transition-colors" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-navy-500 hover:bg-navy-100 transition-colors" aria-label="Email">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/items" className="text-navy-500 hover:text-navy-700">Browse Items</Link></li>
              <li><Link to="/report-lost" className="text-navy-500 hover:text-navy-700">Report Lost</Link></li>
              <li><Link to="/report-found" className="text-navy-500 hover:text-navy-700">Report Found</Link></li>
              <li><Link to="/about" className="text-navy-500 hover:text-navy-700">About</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-navy-500 hover:text-navy-700">Contact</a></li>
              <li><a href="#" className="text-navy-500 hover:text-navy-700">Privacy Policy</a></li>
              <li><a href="#" className="text-navy-500 hover:text-navy-700">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-navy-400">
            &copy; {new Date().getFullYear()} FindIt. All rights reserved.
          </p>
          <p className="text-xs text-navy-400">
            Made with care for communities everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
