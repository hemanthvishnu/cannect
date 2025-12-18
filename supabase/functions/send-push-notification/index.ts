import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data } = (await req.json()) as PushPayload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's push token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("expo_push_token")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.expo_push_token) {
      return new Response(
        JSON.stringify({ error: "User has no push token", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Expo push token format
    if (!profile.expo_push_token.startsWith("ExponentPushToken[")) {
      return new Response(
        JSON.stringify({ error: "Invalid push token format", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notification via Expo
    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        sound: "default",
        badge: 1,
        data: data || {},
        priority: "high",
        channelId: "default",
      }),
    });

    const pushResult = await pushResponse.json();

    // Check for errors in the Expo response
    if (pushResult.data?.[0]?.status === "error") {
      console.error("Expo push error:", pushResult.data[0]);
      
      // If token is invalid, clear it from the profile
      if (pushResult.data[0].details?.error === "DeviceNotRegistered") {
        await supabaseAdmin
          .from("profiles")
          .update({ expo_push_token: null })
          .eq("id", userId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, result: pushResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
