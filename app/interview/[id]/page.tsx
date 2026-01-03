"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type QA = {
  question: string;
  answer: string;
};

export default function InterviewPage({ params }: { params: { id: string } }) {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize speech recognition
    if (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentAnswer((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Get first question
    getNextQuestion();
  }, []);

  const getNextQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: params.id,
          action: "get-question",
          questionNumber,
          previousQA: qaHistory,
        }),
      });

      const data = await response.json();
      setCurrentQuestion(data.question);
      speakQuestion(data.question);
    } catch (error) {
      console.error("Error getting question:", error);
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer before continuing");
      return;
    }

    const newQA = { question: currentQuestion, answer: currentAnswer };
    const updatedHistory = [...qaHistory, newQA];
    setQaHistory(updatedHistory);
    setCurrentAnswer("");

    if (questionNumber >= 8) {
      // Complete interview and get evaluation
      await completeInterview(updatedHistory);
    } else {
      setQuestionNumber(questionNumber + 1);
      await getNextQuestionWithHistory(updatedHistory);
    }
  };

  const getNextQuestionWithHistory = async (history: QA[]) => {
    setLoading(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: params.id,
          action: "get-question",
          questionNumber: questionNumber + 1,
          previousQA: history,
        }),
      });

      const data = await response.json();
      setCurrentQuestion(data.question);
      speakQuestion(data.question);
    } catch (error) {
      console.error("Error getting question:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async (history: QA[]) => {
    setLoading(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: params.id,
          action: "evaluate",
          allQA: history,
        }),
      });

      const data = await response.json();
      setEvaluation(data.evaluation);
      setInterviewComplete(true);

      const message =
        data.evaluation.decision === "selected"
          ? `Congratulations! ${data.evaluation.nextSteps}`
          : `Thank you for your time. ${data.evaluation.nextSteps}`;

      speakQuestion(message);
    } catch (error) {
      console.error("Error evaluating interview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (interviewComplete && evaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-3xl w-full bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {evaluation.decision === "selected" ? "🎉" : "👋"}
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {evaluation.decision === "selected"
                ? "Interview Completed!"
                : "Thank You!"}
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                Overall Score
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-800 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-emerald-600 h-4 rounded-full transition-all"
                    style={{ width: `${evaluation.overallScore}%` }}
                  />
                </div>
                <span className="text-white font-bold">
                  {evaluation.overallScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-indigo-400">
                  {evaluation.technicalScore}%
                </div>
                <div className="text-sm text-slate-400 mt-1">Technical</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {evaluation.communicationScore}%
                </div>
                <div className="text-sm text-slate-400 mt-1">Communication</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-400">
                  {evaluation.cultureFitScore}%
                </div>
                <div className="text-sm text-slate-400 mt-1">Culture Fit</div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Feedback
              </h3>
              <p className="text-slate-300">{evaluation.feedback}</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Next Steps
              </h3>
              <p className="text-slate-300">{evaluation.nextSteps}</p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Interview</h1>
          <p className="text-slate-400">Question {questionNumber} of 8</p>
          <div className="mt-4 bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-600 to-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${(questionNumber / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl">{isSpeaking ? "🔊" : "🤖"}</div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-4">
                {loading ? "Thinking..." : currentQuestion}
              </h2>
            </div>
          </div>
        </div>

        {/* Answer Input */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 mb-8">
          <label className="block text-lg font-semibold text-white mb-4">
            Your Answer
          </label>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here or use voice input..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white min-h-[150px]"
            disabled={loading}
          />

          <div className="flex gap-4 mt-6">
            <button
              onClick={toggleListening}
              disabled={loading}
              className={`flex-1 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-slate-700 hover:bg-slate-600"
              } text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50`}
            >
              {isListening ? "🔴 Stop Recording" : "🎤 Voice Input"}
            </button>
            <button
              onClick={handleSubmitAnswer}
              disabled={loading || !currentAnswer.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {questionNumber >= 8 ? "Complete Interview" : "Next Question →"}
            </button>
          </div>
        </div>

        {/* Previous Q&A */}
        {qaHistory.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">
              Previous Questions
            </h3>
            <div className="space-y-4">
              {qaHistory.map((qa, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">
                    Q{index + 1}: {qa.question}
                  </p>
                  <p className="text-white">A: {qa.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
