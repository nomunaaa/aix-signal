import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SB_URL = Deno.env.get("SUPABASE_URL");
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function resolveBotUsername(): Promise<string | null> {
  const configured = (
    Deno.env.get("TELEGRAM_BOT_USERNAME") ||
    Deno.env.get("TELEGRAM_BOT_NAME") ||
    ""
  ).replace(/^@/, "").trim();

  if (configured) return configured;
  if (!TG_TOKEN) return null;

  const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getMe`);
  if (!response.ok) {
    console.error("Failed to resolve Telegram bot username:", await response.text());
    return null;
  }

  const result = await response.json();
  const username = typeof result?.result?.username === "string"
    ? result.result.username.replace(/^@/, "").trim()
    : "";

  return username || null;
}

function generateToken(length = 48): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SB_URL || !SRK) {
      console.error('Missing Supabase Edge Function configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) {
      console.error('Missing access token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SB_URL, SRK, { auth: { persistSession: false } });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating token for user:', user.id);

    // Generate unique token
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    // Store token through a public RPC so this does not depend on exposing the alerts schema.
    const { error: insertError } = await supabase.rpc('create_tg_link_token', {
      p_user_id: user.id,
      p_token: token,
      p_expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Error inserting token:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate token',
          code: insertError.code,
          details: insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botUsername = await resolveBotUsername();
    if (!botUsername) {
      console.error('Telegram bot username could not be resolved');
      return new Response(
        JSON.stringify({ error: 'Telegram bot username is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Telegram deep link
    const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
    
    console.log('Token generated successfully');

    return new Response(
      JSON.stringify({ deepLink, token }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in tg-link-token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
