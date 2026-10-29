import { Link } from "react-router-dom";
import {
  PackageSearch,
  Eye,
  ShieldCheck,
  MessageSquare,
  HandHeart,
  Search,
  PackagePlus,
  Lock,
  Users,
} from "lucide-react";

export function AboutPage() {
  return (
    <div>
      <section className="bg-navy-900 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-700 mb-4">
            <PackageSearch className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">About FindIt</h1>
          <p className="mt-4 text-navy-200 text-lg">
            FindIt is a smart lost-and-found platform built to help communities
            reconnect people with their belongings. We combine detailed
            reporting, an explainable matching engine, and a secure claim
            verification workflow to make returns safe and reliable.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Search,
              title: "Detailed Reporting",
              description:
                "Report lost or found items with photos, category, color, distinguishing characteristics, approximate location, and date.",
            },
            {
              icon: Eye,
              title: "Smart Matching",
              description:
                "Our rule-based scoring engine compares every report across category, title, color, description, date proximity, and location to surface likely matches.",
            },
            {
              icon: ShieldCheck,
              title: "Secure Claims",
              description:
                "Found items can be claimed through a private verification process. Identifying details are shared only with the reporter and admins.",
            },
            {
              icon: MessageSquare,
              title: "Private Messaging",
              description:
                "Communicate safely through in-app messaging. Your personal contact information is never exposed publicly.",
            },
            {
              icon: Lock,
              title: "Privacy First",
              description:
                "We never show exact addresses, phone numbers, or private details. Locations are approximate to protect everyone's safety.",
            },
            {
              icon: Users,
              title: "Community Driven",
              description:
                "Every report increases the chance of a match. The more people participate, the more items find their way home.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-600 mb-4">
                <f.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="font-semibold text-navy-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-navy-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 border-y border-slate-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-navy-900">
            Ready to get started?
          </h2>
          <p className="mt-3 text-navy-500">
            Join FindIt today and help reconnect people with their belongings.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-primary py-3 px-6">
              <PackagePlus className="h-5 w-5" /> Create an account
            </Link>
            <Link to="/items" className="btn-secondary py-3 px-6">
              <Search className="h-5 w-5" /> Browse items
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
