// supabase/functions/_shared/cors.ts
/** Echo request Origin when present so browser CORS checks pass (required for credentialed fetches). */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
