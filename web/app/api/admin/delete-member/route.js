import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId for member deletion." },
        { status: 400 }
      );
    }

    const client =
      serviceRoleKey && !serviceRoleKey.includes("YOUR_")
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : createClient(supabaseUrl, supabaseAnonKey);

    // 1. Delete associated child records first
    try { await client.from("attendance").delete().eq("user_id", userId); } catch (e) {}
    try { await client.from("payments").delete().eq("user_id", userId); } catch (e) {}
    try { await client.from("addon_payments").delete().eq("user_id", userId); } catch (e) {}
    try { await client.from("member_addons").delete().eq("user_id", userId); } catch (e) {}
    try { await client.from("notifications").delete().eq("user_id", userId); } catch (e) {}

    // 2. Delete member profile
    const { error: profError } = await client.from("profiles").delete().eq("id", userId);
    if (profError) {
      console.warn("Error deleting profile:", profError.message);
    }

    // 3. Delete from Supabase Auth if service role client available
    if (serviceRoleKey && !serviceRoleKey.includes("YOUR_")) {
      try {
        await client.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.warn("Notice deleting auth user:", authErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete member exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete member." },
      { status: 500 }
    );
  }
}
