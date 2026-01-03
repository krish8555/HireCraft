require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing environment variables!");
  console.error("Please ensure .env.local contains:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔄 Testing Supabase connection and fetching jobs...\n");

  try {
    // Fetch all jobs
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    console.log("✅ Supabase connection successful!");
    console.log(`📊 Total jobs in database: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
      console.log("📝 Jobs found:");
      data.forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Type: ${job.type}`);
        console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
      });
    } else {
      console.log("No jobs found in database.");
    }
  } catch (error) {
    console.log("❌ Connection failed!");
    console.log("Error:", error.message);
  }
}

testConnection();
