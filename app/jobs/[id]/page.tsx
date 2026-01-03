"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  type: string;
  salary_range: string;
};

export default function ApplyPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    current_ctc: "",
    expected_ctc: "",
  });
  const router = useRouter();

  useState(() => {
    fetchJob();
  });

  async function fetchJob() {
    try {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();

      setJob(data);
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setResume(file);
      } else {
        alert("Please upload a PDF file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setResume(file);
      } else {
        alert("Please upload a PDF file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resume) {
      alert("Please upload your resume");
      return;
    }

    setSubmitting(true);

    try {
      // Upload resume to Supabase storage
      const fileExt = resume.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      console.log("Uploading resume:", fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resume);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(
          `Resume upload failed: ${uploadError.message}. Please make sure the 'resumes' bucket exists in Supabase Storage and is public.`
        );
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("resumes").getPublicUrl(fileName);

      console.log("Public URL:", publicUrl);

      // Submit application
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: params.id,
          ...formData,
          resume_url: publicUrl,
        }),
      });

      if (response.ok) {
        const { application } = await response.json();

        // Trigger resume analysis in background
        fetch("/api/analyze-resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: application.id,
          }),
        }).catch(console.error);

        // Redirect to analysis page immediately
        router.push(`/analysis/${application.id}`);
      } else {
        const errorData = await response.json();
        console.error("API error:", errorData);
        alert(
          `Failed to submit application: ${errorData.error || "Unknown error"}`
        );
        throw new Error("Failed to submit application");
      }
    } catch (error: any) {
      console.error("Error submitting application:", error);
      if (!error.message?.includes("bucket")) {
        alert(
          `Failed to submit application: ${
            error.message || "Please try again."
          }`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Job not found</h1>
          <button
            onClick={() => router.push("/")}
            className="text-indigo-400 hover:text-indigo-300"
          >
            ← Back to jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white mb-8 flex items-center gap-2 transition-colors"
        >
          ← Back to all jobs
        </button>

        {/* Job Details */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-slate-400 mb-6">
            <span className="flex items-center gap-2">📍 {job.location}</span>
            <span className="flex items-center gap-2">💼 {job.type}</span>
            <span className="flex items-center gap-2 text-emerald-400">
              💰 {job.salary_range}
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-3">
              About the Role
            </h2>
            <p className="text-slate-300 whitespace-pre-line">
              {job.description}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Requirements
            </h2>
            <p className="text-slate-300 whitespace-pre-line">
              {job.requirements}
            </p>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">
            Apply for this position
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current CTC *
                </label>
                <input
                  type="text"
                  value={formData.current_ctc}
                  onChange={(e) =>
                    setFormData({ ...formData, current_ctc: e.target.value })
                  }
                  placeholder="e.g., ₹12 LPA"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Expected CTC *
                </label>
                <input
                  type="text"
                  value={formData.expected_ctc}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_ctc: e.target.value })
                  }
                  placeholder="e.g., ₹18 LPA"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
                />
              </div>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Resume * (PDF only)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {resume ? (
                  <div className="space-y-2">
                    <div className="text-4xl">📄</div>
                    <p className="text-emerald-400 font-medium">
                      {resume.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {(resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => setResume(null)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📤</div>
                    <p className="text-slate-300 font-medium">
                      Drag and drop your resume here
                    </p>
                    <p className="text-sm text-slate-400">or click to browse</p>
                    <p className="text-xs text-slate-500">
                      PDF files only, max 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-600 via-emerald-600 to-indigo-600 hover:from-indigo-700 hover:via-emerald-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/30"
            >
              {submitting ? "Submitting Application..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
