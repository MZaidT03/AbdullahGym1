import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, full_name, gender, plan, fee_paid } = body;
    const memberGender = gender && ["Male", "Female", "Other"].includes(gender) ? gender : "Male";

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (email, password, full_name)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const generatedMemberId = `GP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;
    let userId = null;

    // Use Service Role Client if available (bypasses 429 rate limits & email confirmations!)
    if (serviceRoleKey && !serviceRoleKey.includes("YOUR_")) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: adminUserData, error: adminUserError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name, gender: memberGender, role: "member" },
      });

      if (adminUserError) {
        return NextResponse.json({ success: false, error: adminUserError.message }, { status: 400 });
      }

      userId = adminUserData?.user?.id;
    } else {
      // Fallback to standard client
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: { full_name, gender: memberGender, role: "member" },
        },
      });

      if (signUpError) {
        if (signUpError.status === 429 || signUpError.message.includes("rate limit")) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Supabase Signup Rate Limit (HTTP 429). Please turn OFF 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email.",
            },
            { status: 429 }
          );
        }
        return NextResponse.json({ success: false, error: signUpError.message }, { status: 400 });
      }

      userId = signUpData?.user?.id;
    }

    if (!userId) {
      userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    }

    // Save/Upsert Profile in public.profiles
    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
    const profilePayload = {
      id: userId,
      email: cleanEmail,
      full_name: full_name,
      gender: memberGender,
      member_id: generatedMemberId,
      plan: plan ? plan.split(" (")[0] : "Pro Membership",
      days_remaining: 30,
      status: "Active",
      created_at: new Date().toISOString(),
    };

    const { error: profileErr } = await supabasePublic
      .from("profiles")
      .upsert([profilePayload], { onConflict: "id" });

    if (profileErr) {
      return NextResponse.json({ success: false, error: `Profile error: ${profileErr.message}` }, { status: 400 });
    }

    // Insert fee in public.payments
    try {
      const numericFee = parseFloat(fee_paid) || 5000;
      await supabasePublic.from("payments").insert([
        {
          user_id: userId,
          amount: numericFee,
          status: "Paid",
          payment_method: "Cash / Desk",
          invoice_id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString(),
        },
      ]);
    } catch (payErr) {
      console.warn("Payment insert warning:", payErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: full_name,
        member_id: generatedMemberId,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || "Server Error" }, { status: 500 });
  }
}
