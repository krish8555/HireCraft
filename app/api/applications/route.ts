import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    let query = supabase.from("applications").select("*");

    if (jobId) {
      query = query.eq("job_id", jobId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json({ applications: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received application data:", body);

    const {
      job_id,
      name,
      email,
      phone,
      current_ctc,
      expected_ctc,
      resume_url,
    } = body;

    // Validate required fields
    if (
      !job_id ||
      !name ||
      !email ||
      !phone ||
      !current_ctc ||
      !expected_ctc ||
      !resume_url
    ) {
      console.error("Missing required fields:", {
        job_id,
        name,
        email,
        phone,
        current_ctc,
        expected_ctc,
        resume_url,
      });
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          job_id,
          name,
          email,
          phone,
          current_ctc,
          expected_ctc,
          resume_url,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Application created successfully:", data[0]);
    return NextResponse.json({ application: data[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create application" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ shortlisted: body.shortlisted })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ application: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
