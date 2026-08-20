import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, full_name, gender, plan, fee_paid, payment_method, avatar_url, phone, plan_id } = body;
    const memberGender = gender && ["Male", "Female"].includes(gender) ? gender : "Male";

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
        user_metadata: {
          full_name,
          phone: phone ? String(phone).trim() : "",
          gender: memberGender,
          role: "member",
          avatar_url: avatar_url || "",
        },
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
          data: {
            full_name,
            phone: phone ? String(phone).trim() : "",
            gender: memberGender,
            role: "member",
            avatar_url: avatar_url || "",
          },
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

    // Clean plan name (strip (PKR .../mo) while keeping add-on tags)
    let cleanPlanName = plan || "Pro Membership";
    if (cleanPlanName.includes(" (PKR")) {
      const parts = cleanPlanName.split(" (PKR");
      const baseName = parts[0];
      const afterPkr = parts[1] || "";
      if (afterPkr.includes("[Add-ons:")) {
        cleanPlanName = `${baseName} [Add-ons:${afterPkr.split("[Add-ons:")[1]}`;
      } else {
        cleanPlanName = baseName;
      }
    }

    // Active Addons payload with 30-day lifecycles
    const incomingAddons = Array.isArray(body.active_addons) ? body.active_addons : [];
    const activeAddonsPayload = incomingAddons.map((addon) => ({
      id: addon.id,
      addon_id: addon.id,
      name: addon.name,
      price: Number(addon.price) || 1500,
      icon: addon.icon || "🏃",
      start_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      days_remaining: 30,
      status: "Active",
    }));

    // Save/Upsert Profile in public.profiles
    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
    const profilePayload = {
      id: userId,
      email: cleanEmail,
      full_name: full_name,
      phone: phone ? String(phone).trim() : null,
      gender: memberGender,
      avatar_url: avatar_url || null,
      member_id: generatedMemberId,
      plan: cleanPlanName,
      plan_id: plan_id || body.plan_id || null,
      active_addons: activeAddonsPayload,
      days_remaining: 30,
      status: "Active",
      created_at: new Date().toISOString(),
    };

    let { error: profileErr } = await supabasePublic
      .from("profiles")
      .upsert([profilePayload], { onConflict: "id" });

    // Fallback: If 'phone' or 'plan_id' column does not exist yet in Supabase schema cache
    if (profileErr && profileErr.message && (profileErr.message.includes("phone") || profileErr.message.includes("schema cache") || profileErr.message.includes("plan_id"))) {
      console.warn("Retrying profile insert without missing column (database migration pending):", profileErr.message);
      const fallbackPayload = { ...profilePayload };
      if (profileErr.message.includes("phone")) delete fallbackPayload.phone;
      if (profileErr.message.includes("plan_id")) delete fallbackPayload.plan_id;
      const retryRes = await supabasePublic
        .from("profiles")
        .upsert([fallbackPayload], { onConflict: "id" });
      profileErr = retryRes.error;
    }

    if (profileErr) {
      return NextResponse.json({ success: false, error: `Profile error: ${profileErr.message}` }, { status: 400 });
    }

    // Sync member_addons table if any add-ons were assigned
    if (activeAddonsPayload.length > 0) {
      try {
        const memberAddonRows = activeAddonsPayload.map((a) => ({
          user_id: userId,
          addon_id: a.id,
          name: a.name,
          price: a.price,
          status: "Active",
          start_date: a.start_date,
          expiry_date: a.expiry_date,
        }));
        await supabasePublic.from("member_addons").insert(memberAddonRows);
      } catch (addonSyncErr) {
        console.warn("Member addons insert notice:", addonSyncErr);
      }
    }

    // Insert base membership payment into payments, and addon payments into addon_payments table
    try {
      const cleanPlanTitle = (plan || "Standard Monthly Pass").split(" [Add-ons:")[0].trim();
      const currentYear = new Date().getFullYear();

      // 1. Base membership payment row
      const parsedFee = parseFloat(String(fee_paid).replace(/,/g, ""));
      const totalNumericFee = !isNaN(parsedFee) ? parsedFee : 1600;

      let addonsSum = 0;
      if (activeAddonsPayload && activeAddonsPayload.length > 0) {
        addonsSum = activeAddonsPayload.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
      }
      const basePlanNumericFee = Math.max(0, totalNumericFee - addonsSum) || totalNumericFee;

      const gymPayment = {
        user_id: userId,
        amount: basePlanNumericFee,
        total_fee: basePlanNumericFee,
        status: "Paid",
        payment_method: payment_method || "Cash / Desk",
        payment_type: "membership",
        item_name: cleanPlanTitle,
        plan_id: plan_id || null,
        invoice_id: `INV-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
      };

      await supabasePublic.from("payments").insert([gymPayment]);

      // 2. Insert into dedicated addon_payments table for each active add-on
      if (activeAddonsPayload && activeAddonsPayload.length > 0) {
        const addonPaymentsToInsert = activeAddonsPayload.map((addon, idx) => {
          const addonPrice = Number(addon.price) || 1500;
          return {
            user_id: userId,
            addon_id: addon.addon_id || addon.id || `addon-${idx + 1}`,
            addon_name: addon.name || "Add-On Service",
            amount: addonPrice,
            status: "Paid",
            payment_method: payment_method || "Cash / Desk",
            invoice_id: `INV-ADD-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
          };
        });

        await supabasePublic.from("addon_payments").insert(addonPaymentsToInsert);
      }
    } catch (payErr) {
      console.warn("Payment insert notice:", payErr);
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
