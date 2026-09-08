export const webhookCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

const jsonHeaders = { ...webhookCorsHeaders, 'Content-Type': 'application/json' };

export type WebhookSuccessExtra = Record<string, unknown>;

export function webhookSuccess(extra?: WebhookSuccessExtra, httpStatus = 202): Response {
  const body: Record<string, unknown> = { status: 'Success', message: 'aix-ok' };
  if (extra) {
    Object.assign(body, extra);
  }
  return new Response(JSON.stringify(body), { status: httpStatus, headers: jsonHeaders });
}

export function webhookFail(
  reason: string,
  httpStatus = 400,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ status: 'Fail', success: false, message: reason, ...(extra ?? {}) }),
    { status: httpStatus, headers: jsonHeaders }
  );
}
