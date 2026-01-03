"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [status, setStatus] = useState<"analyzing" | "success" | "rejected">(
    "analyzing"
  );
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeResume();
  }, []);

  const analyzeResume = async () => {
    try {
      // Start the analysis - this will take time
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      // Check the results
      if (data.matchAnalysis.matchScore >= 60) {
        setStatus("success");
        setAnalysis({
          score: data.matchAnalysis.matchScore,
          summary: `Great news! Your profile matches ${data.matchAnalysis.matchScore}% with our job requirements.`,
        });
      } else {
        setStatus("rejected");
        setAnalysis({
          score: data.matchAnalysis.matchScore,
          summary: `Thank you for applying. Unfortunately, your profile match score is ${data.matchAnalysis.matchScore}%, which is below our threshold.`,
        });
      }
    } catch (error: any) {
      console.error("Error analyzing resume:", error);
      setError(error.message);
      setStatus("rejected");
      setAnalysis({
        score: 0,
        summary:
          "We encountered an error analyzing your resume. Please try again later.",
      });
    }
  };

  const handleProceedToInterview = () => {
    router.push(`/interview/${applicationId}`);
  };

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {status === "analyzing" && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
            <div className="mb-8">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-4 border-emerald-500/20"></div>
                <div className="absolute inset-4 rounded-full border-4 border-t-transparent border-r-emerald-500 border-b-transparent border-l-transparent animate-spin-slow"></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  🤖
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Analyzing Your Profile...
            </h1>
            <p className="text-slate-300 text-lg mb-2">
              Our AI is reviewing your resume
            </p>
            <p className="text-slate-400">This will take just a moment</p>

            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}

        {status === "success" && analysis && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-6xl">
                ✓
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              You Look Great! 🎉
            </h1>

            <div className="mb-8">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 mb-2">
                {analysis.score}%
              </div>
              <p className="text-slate-300 text-lg">Profile Match Score</p>
            </div>

            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              {analysis.summary}
            </p>

            <div className="bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border border-indigo-500/20 rounded-xl p-6 mb-8">
              <p className="text-white font-semibold mb-2">
                Would you like to proceed with an AI interview?
              </p>
              <p className="text-slate-400 text-sm">
                Our AI interviewer will ask you 8 questions and provide
                real-time feedback
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGoHome}
                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200"
              >
                Maybe Later
              </button>
              <button
                onClick={handleProceedToInterview}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200"
              >
                Yes, Let's Do It! 🚀
              </button>
            </div>
          </div>
        )}

        {status === "rejected" && analysis && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-6xl">
                ✗
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Thank You for Applying
            </h1>

            <div className="mb-8">
              <div className="text-6xl font-bold text-red-400 mb-2">
                {analysis.score}%
              </div>
              <p className="text-slate-300 text-lg">Profile Match Score</p>
            </div>

            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              {analysis.summary}
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
              <p className="text-slate-300 text-sm">
                We appreciate your interest in this position. While your profile
                doesn't align with our current requirements, we encourage you to
                apply for other opportunities that may be a better fit.
              </p>
            </div>

            <button
              onClick={handleGoHome}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200"
            >
              View Other Jobs
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
