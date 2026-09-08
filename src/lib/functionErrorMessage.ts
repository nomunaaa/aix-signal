import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * supabase-js의 FunctionsHttpError.message는 항상 고정 문구
 * ("Edge Function returned a non-2xx status code")이고, 실제 에러 메시지는
 * error.context(원본 Response)를 다시 파싱해야만 얻을 수 있다. 그냥 error.message를
 * 쓰면 서버가 보낸 구체적인 안내(예: "이미 다른 계정에 등록된 전화번호입니다")가
 * 사용자에게 절대 보이지 않는다.
 */
export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      // 응답 본문이 JSON이 아니면 fallback으로.
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
