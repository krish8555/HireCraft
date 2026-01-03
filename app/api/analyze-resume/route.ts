import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { analyzeResumeWithPDF } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

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

    // Download resume PDF from Supabase storage
    const resumeFileName = application.resume_url.split("/").pop();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resumeFileName);

    if (downloadError) {
      console.error("Download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download resume" },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Send PDF directly to Gemini for analysis
    const matchAnalysis = await analyzeResumeWithPDF(
      buffer,
      resumeFileName!,
      application.job.description,
      application.job.title
    );

    // Update application with resume text and match score
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        resume_text: matchAnalysis.extractedText || "PDF content",
        jd_match_score: matchAnalysis.matchScore,
        interview_status:
          matchAnalysis.matchScore >= 60 ? "eligible" : "rejected",
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      resumeText: matchAnalysis.extractedText,
      matchAnalysis,
      eligible: matchAnalysis.matchScore >= 60,
    });
  } catch (error: any) {
    console.error("Error analyzing resume:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze resume" },
      { status: 500 }
    );
  }
}
