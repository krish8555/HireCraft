"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  type: string;
  salary_range: string;
  created_at: string;
};

type Application = {
  id: string;
  job_id: string;
  name: string;
  email: string;
  phone: string;
  current_ctc: string;
  expected_ctc: string;
  resume_url: string;
  shortlisted: boolean;
  created_at: string;
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "shortlisted">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    location: "",
    type: "Full-time",
    salary_range: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchApplications(selectedJob.id);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId: string) => {
    try {
      const response = await fetch(`/api/applications?job_id=${jobId}`);
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          title: "",
          description: "",
          requirements: "",
          location: "",
          type: "Full-time",
          salary_range: "",
        });
        setShowForm(false);
        fetchJobs();
      }
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const response = await fetch(`/api/jobs?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedJob?.id === id) {
          setSelectedJob(null);
        }
        fetchJobs();
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const toggleShortlist = async (
    applicationId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(`/api/applications?id=${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shortlisted: !currentStatus }),
      });

      if (response.ok && selectedJob) {
        fetchApplications(selectedJob.id);
      }
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const filteredApplications = applications.filter((app) =>
    activeTab === "all" ? true : app.shortlisted
  );

  if (selectedJob) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700/50 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-slate-400 hover:text-white mb-2 flex items-center gap-2"
                >
                  ← Back to Jobs
                </button>
                <h1 className="text-3xl font-bold text-white">
                  {selectedJob.title}
                </h1>
                <p className="text-slate-400 mt-1">
                  {applications.length} applications ·{" "}
                  {applications.filter((a) => a.shortlisted).length} shortlisted
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 mb-8">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  activeTab === "all"
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                All Candidates ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab("shortlisted")}
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  activeTab === "shortlisted"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Shortlisted ({applications.filter((a) => a.shortlisted).length})
              </button>
            </div>

            <div className="p-6">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {activeTab === "all"
                    ? "No applications yet for this job"
                    : "No shortlisted candidates yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold text-white">
                              {app.name}
                            </h3>
                            {app.shortlisted && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/30">
                                ⭐ Shortlisted
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-slate-400">Email:</span>
                              <p className="text-white">{app.email}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Phone:</span>
                              <p className="text-white">{app.phone}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Current CTC:
                              </span>
                              <p className="text-white">{app.current_ctc}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Expected CTC:
                              </span>
                              <p className="text-white">{app.expected_ctc}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Applied:</span>
                              <p className="text-white">
                                {new Date(app.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <a
                              href={app.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                            >
                              📄 View Resume
                            </a>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            toggleShortlist(app.id, app.shortlisted)
                          }
                          className={`ml-4 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                            app.shortlisted
                              ? "bg-slate-700 hover:bg-slate-600 text-white"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {app.shortlisted ? "Remove" : "Shortlist"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700/50 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-emerald-400 to-slate-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                Manage your job postings and applications
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/30"
              >
                {showForm ? "Cancel" : "Add New Job"}
              </button>
              <button
                onClick={handleLogout}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Add Job Form */}
        {showForm && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Post New Job</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Job Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    value={formData.salary_range}
                    onChange={(e) =>
                      setFormData({ ...formData, salary_range: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    placeholder="e.g., $80,000 - $120,000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  rows={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Requirements
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) =>
                    setFormData({ ...formData, requirements: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  rows={6}
                  placeholder="List requirements (one per line)"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-600 via-emerald-600 to-indigo-600 hover:from-indigo-700 hover:via-emerald-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/30"
              >
                {submitting ? "Posting..." : "Post Job"}
              </button>
            </form>
          </div>
        )}

        {/* Jobs List */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">Posted Jobs</h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400">
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No jobs posted yet. Click "Add New Job" to create your first
              posting.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          📍 {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          💼 {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          💰 {job.salary_range}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-4 line-clamp-2 text-sm">
                        {job.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Posted: {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        View Applications
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(job.id);
                        }}
                        className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
