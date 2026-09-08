/**
 * 환경 변수 관리
 */

export const getEnv = {
  supabaseUrl: () => Deno.env.get('SUPABASE_URL')!,
  supabaseKey: () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  webhookSecret: () => Deno.env.get('WEBHOOK_SECRET') || '',
};
