import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { effectivePlanCode, type PlanCode } from "../_shared/plans.ts";
import {
  checkUserMembership,
  sendInviteLinkToUser,
  TELEGRAM_GROUPS,
} from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TelegramAction = "status" | "resend_invite";

type ProfileRow = {
  telegram_chat_id: string | null;
  telegram_group_access: boolean | null;
  telegram_last_synced_at: string | null;
  phone_number: string | null;
};

type SubscriptionRow = {
  plan_code: string | null;
  status: string | null;
  current_period_end: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function expectedGroupForPlan(plan: PlanCode) {
  if (plan === "pro") return TELEGRAM_GROUPS.PRO;
  return null;
}

function statusFromState(args: {
  linked: boolean;
  hasExpectedGroup: boolean;
  checked: boolean;
  isMember: boolean;
  checkError: string | null;
}) {
  if (!args.linked) return "not_linked";
  if (!args.hasExpectedGroup) return "no_group_expected";
  if (args.checkError) return "check_failed";
  if (!args.checked) return "unchecked";
  return args.isMember ? "member" : "not_member";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: TelegramAction = body?.action === "resend_invite" ? "resend_invite" : "status";
    const userId = userData.user.id;
    const nowIso = new Date().toISOString();

    const [{ data: profile, error: profileError }, { data: subscription }] = await Promise.all([
      supabase
        .from("profiles")
        .select("telegram_chat_id, telegram_group_access, telegram_last_synced_at, phone_number")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_code, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (profileError) {
      return json({ error: "Profile lookup failed" }, 500);
    }

    const profileRow = (profile ?? {
      telegram_chat_id: null,
      telegram_group_access: false,
      telegram_last_synced_at: null,
      phone_number: null,
    }) as ProfileRow;
    const subscriptionRow = subscription as SubscriptionRow | null;
    const plan = effectivePlanCode(subscriptionRow);
    const expectedGroup = expectedGroupForPlan(plan);
    const linked = Boolean(profileRow.telegram_chat_id);

    let membershipChecked = false;
    let isMember = false;
    let checkError: string | null = null;

    if (linked && expectedGroup) {
      const membership = await checkUserMembership(profileRow.telegram_chat_id!, expectedGroup.id);
      membershipChecked = true;
      isMember = membership.isMember;
      checkError = membership.error ?? null;

      if (!checkError) {
        await supabase
          .from("profiles")
          .update({
            telegram_group_access: isMember,
            telegram_last_synced_at: nowIso,
          })
          .eq("id", userId);
      }
    }

    if (linked && !expectedGroup && profileRow.telegram_group_access) {
      await supabase
        .from("profiles")
        .update({
          telegram_group_access: false,
          telegram_last_synced_at: nowIso,
        })
        .eq("id", userId);
    }

    let inviteSent = false;
    let inviteError: string | null = null;

    if (action === "resend_invite") {
      if (!linked) {
        return json({ error: "Telegram account is not linked" }, 400);
      }

      if (!expectedGroup) {
        return json({ error: "Current plan does not include Telegram group access" }, 403);
      }

      const invite = await sendInviteLinkToUser(profileRow.telegram_chat_id!, plan, userId);
      inviteSent = invite.success;
      inviteError = invite.error ?? null;
    }

    const groupAccess = !checkError && membershipChecked
      ? isMember
      : Boolean(profileRow.telegram_group_access);

    return json({
      phone_number: profileRow.phone_number,
      telegram: {
        linked,
        plan,
        subscription_status: String(subscriptionRow?.status ?? "free"),
        expected_group: expectedGroup
          ? {
              id: expectedGroup.id,
              name: expectedGroup.name,
            }
          : null,
        cached_group_access: groupAccess,
        last_synced_at: !checkError && (membershipChecked || !expectedGroup) ? nowIso : profileRow.telegram_last_synced_at,
        membership: {
          checked: membershipChecked,
          is_member: isMember,
          error: checkError,
        },
        status: statusFromState({
          linked,
          hasExpectedGroup: Boolean(expectedGroup),
          checked: membershipChecked,
          isMember,
          checkError,
        }),
        invite_sent: inviteSent,
        invite_error: inviteError,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
