import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error: any) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch application" },
      { status: 500 }
    );
  }
}
