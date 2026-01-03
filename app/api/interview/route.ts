import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  generateInterviewQuestion,
  evaluateInterviewPerformance,
  provideFeedback,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const {
      applicationId,
      action,
      questionNumber,
      previousQA,
      allQA,
      answer,
      currentQuestion,
    } = await request.json();

    // Get application with job details
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(
        `
        *,
        job:jobs(*)
      `
      )
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (action === "get-question") {
      const question = await generateInterviewQuestion({
        resumeText: application.resume_text || "",
        jobDescription: application.job.description,
        jobTitle: application.job.title,
        questionNumber,
        previousQA: previousQA || [],
      });

      return NextResponse.json({ question });
    }

    if (action === "provide-feedback") {
      const feedback = await provideFeedback({
        question: currentQuestion,
        answer,
        resumeText: application.resume_text || "",
        jobDescription: application.job.description,
        questionNumber,
      });

      return NextResponse.json({ feedback });
    }

    if (action === "evaluate") {
      const evaluation = await evaluateInterviewPerformance({
        resumeText: application.resume_text || "",
        jobDescription: application.job.description,
        jobTitle: application.job.title,
        allQA: allQA || [],
      });

      // Update application with interview results
      await supabase
        .from("applications")
        .update({
          interview_status: "completed",
          interview_result: JSON.stringify(evaluation),
          shortlisted: evaluation.decision === "selected",
        })
        .eq("id", applicationId);

      return NextResponse.json({ evaluation });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in interview:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process interview" },
      { status: 500 }
    );
  }
}
