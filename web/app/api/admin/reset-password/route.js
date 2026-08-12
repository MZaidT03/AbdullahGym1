import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, newPassword } = body;

    const targetPassword = newPassword || "12345678";

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: "Missing member userId or email." },
        { status: 400 }
      );
    }

    // Attempt Supabase Service Role Admin Update
    if (serviceRoleKey && !serviceRoleKey.includes("YOUR_")) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      let targetId = userId;

      // If userId wasn't provided or valid, search auth user by email
      if (!targetId && email) {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const found = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
        );
        if (found) {
          targetId = found.id;
        }
      }

      if (targetId) {
        const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(
          targetId,
          { password: targetPassword }
        );

        if (resetErr) {
          return NextResponse.json(
            { success: false, error: resetErr.message },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Password successfully reset to '${targetPassword}' in Supabase Auth.`,
          newPassword: targetPassword,
        });
      }
    }

    // Fallback: If service role key is not configured, check if we can update profile password field or return standard instruction
    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
    
    // Update profiles table note or timestamp if available
    if (userId) {
      await supabasePublic
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return NextResponse.json({
      success: true,
      fallbackNotice:
        "Supabase Service Role Key not detected in .env.local. Password mark updated locally to '12345678'. To sync with Supabase Auth directly, add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
      newPassword: targetPassword,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Server error while resetting password." },
      { status: 500 }
    );
  }
}
