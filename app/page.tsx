import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Disable caching completely

async function getJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return data || [];
}

export default async function HomePage() {
  const jobs = await getJobs();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-emerald-600/20 to-slate-600/20 blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-400 via-emerald-400 to-slate-400 bg-clip-text text-transparent">
              Find Your Dream Job
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
              Discover amazing opportunities and take the next step in your
              career journey
            </p>
          </div>
        </div>
      </div>

      {/* Jobs Listing */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">
            Available Positions
          </h2>
          <p className="text-slate-400">
            Browse our latest job openings and apply today
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-slate-300 mb-2">
              No jobs available yet
            </h3>
            <p className="text-slate-400">
              Check back soon for new opportunities!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      📍 {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      💼 {job.type}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 mb-4 line-clamp-3 text-sm">
                  {job.description}
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                  <span className="text-emerald-400 font-semibold text-sm">
                    {job.salary_range}
                  </span>
                  <span className="text-indigo-400 group-hover:text-indigo-300 font-medium text-sm flex items-center gap-1">
                    Apply Now →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Admin Link */}
      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <Link
            href="/admin"
            className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
