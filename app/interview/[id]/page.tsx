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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerPaused, setTimerPaused] = useState(true);
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    getNextQuestion();
  }, []);

  // Timer effect - starts after speech ends
  useEffect(() => {
    if (loading || interviewComplete || timerPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading, interviewComplete, timerPaused, questionNumber]);

  const startTimer = () => {
    setTimerPaused(false);
  };

  const resetTimer = () => {
    setTimeLeft(180);
    setTimerPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft > 120) return "text-emerald-400";
    if (timeLeft > 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getNextQuestion = async () => {
    setLoading(true);
    resetTimer();
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
      await speakQuestion(data.question);
    } catch (error) {
      console.error("Error getting question:", error);
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = async (text: string) => {
    if (!voiceEnabled) {
      startTimer();
      return;
    }

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setIsSpeaking(true);
      const words = text.split(" ");
      setHighlightedWords(words);
      setCurrentWordIndex(-1);

      // Get audio from ElevenLabs
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Wait for metadata to load
      await new Promise<void>((resolve) => {
        audio.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });
      });

      const audioDuration = audio.duration;
      const wordDuration = audioDuration / words.length;

      // Highlight words as they're spoken
      let wordIndex = 0;
      let highlightInterval: NodeJS.Timeout;

      audio.onplay = () => {
        highlightInterval = setInterval(() => {
          if (wordIndex < words.length) {
            setCurrentWordIndex(wordIndex);
            wordIndex++;
          } else {
            clearInterval(highlightInterval);
          }
        }, wordDuration * 1000);
      };

      audio.onended = () => {
        if (highlightInterval) clearInterval(highlightInterval);
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        startTimer();
      };

      await audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      startTimer();
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setCurrentWordIndex(-1);
    if (!timerPaused) return;
    startTimer();
  };

  const toggleVoice = () => {
    if (voiceEnabled && isSpeaking) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.transcription) {
        setCurrentAnswer((prev) =>
          prev ? `${prev} ${data.transcription}` : data.transcription
        );
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Failed to transcribe audio");
    } finally {
      setLoading(false);
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
    resetTimer();
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
      await speakQuestion(data.question);
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

      await speakQuestion(message);
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

        {/* Question with Word Highlighting */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl">{isSpeaking ? "🔊" : "🤖"}</div>
            <div className="flex-1">
              {loading ? (
                <h2 className="text-xl font-semibold text-white">
                  Thinking...
                </h2>
              ) : (
                <h2 className="text-xl font-semibold text-white leading-relaxed">
                  {highlightedWords.map((word, index) => (
                    <span
                      key={index}
                      className={`transition-all duration-200 ${
                        index === currentWordIndex
                          ? "text-emerald-400 bg-emerald-400/20 px-1 rounded"
                          : ""
                      }`}
                    >
                      {word}{" "}
                    </span>
                  ))}
                </h2>
              )}
            </div>
          </div>

          {/* Timer */}
          {!loading && !timerPaused && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-slate-400 text-sm">Time Left:</span>
              <span className={`text-2xl font-bold ${getTimerColor()}`}>
                ⏱️ {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {isSpeaking && (
            <div className="mt-4">
              <button
                onClick={stopSpeaking}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                Stop Speaking
              </button>
            </div>
          )}
        </div>

        {/* Answer Input */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 mb-8">
          <label className="block text-lg font-semibold text-white mb-4">
            Your Answer
          </label>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here or use voice recording..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white min-h-[150px]"
            disabled={loading || isRecording}
          />

          <div className="flex gap-4 mt-6">
            <button
              onClick={toggleVoice}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                voiceEnabled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`flex-1 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-slate-700 hover:bg-slate-600"
              } text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50`}
            >
              {isRecording ? "🔴 Recording..." : "🎙️ Record Answer"}
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
