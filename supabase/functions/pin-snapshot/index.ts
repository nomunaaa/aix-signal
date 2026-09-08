import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { getEnv } from '../_shared/env.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PINATA_JWT = Deno.env.get('PINATA_JWT') || '';
const SNAP_BUCKET = Deno.env.get('SNAP_BUCKET') || 'aix-bucket';
const SITE_URL = Deno.env.get('SITE_URL') || '';
const SERVICE_ROLE_KEY = getEnv.supabaseKey();

serve(async (req) => {
    const log = (step: string, extra: Record<string, unknown> = {}) => {
        console.log(JSON.stringify({ tag: 'pin-snapshot', step, ...extra }));
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {


        const dbClient = createClient(getEnv.supabaseUrl(), SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

        log('START', {
            contentType: req.headers.get('content-type'),
            contentLength: req.headers.get('content-length'),
        });

        const form = await req.formData();
        const snapshotId = String(form.get('snapshotId') || '').trim();
        const signalId = String(form.get('signalId') || '').trim();
        const userId = String(form.get('userId') || '').trim();
        const file = form.get('file');
        const roePctRaw = form.get('roePct');
        const leverageRaw = form.get('leverage');
        const pnlAmountRaw = form.get('pnlAmount');
        const countDownload = String(form.get('countDownload') || '').trim() === '1';

        if (!snapshotId) {
            return new Response(JSON.stringify({ error: 'snapshotId required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        if (!signalId) {
            return new Response(JSON.stringify({ error: 'signalId required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }



        const origin = req.headers.get('origin') || '';
        const baseUrl = SITE_URL || origin;
        const { data: existingBySignal } = await dbClient
            .from('snapshot_ownership')
            .select('snapshot_id, signal_id, owner_user_id, pinata_cid, pinata_url, download_count')
            .or(`signal_id.eq.${signalId},snapshot_id.eq.${snapshotId}`)
            .maybeSingle();

        if (existingBySignal) {
            if (countDownload && existingBySignal.snapshot_id) {
                const currentCount = Number((existingBySignal as any).download_count ?? 0) || 0;
                await dbClient
                    .from('snapshot_ownership')
                    .update({ download_count: currentCount + 1 })
                    .eq('snapshot_id', existingBySignal.snapshot_id);
            }
            const existingCid = String(existingBySignal.pinata_cid || '');
            const existingPinataUrl = String(existingBySignal.pinata_url || '');
            const shareUrl = existingCid && baseUrl
                ? `${baseUrl}/${existingCid}`
                : (existingPinataUrl || null);
            return new Response(
                JSON.stringify({
                    isOwner: userId ? existingBySignal.owner_user_id === userId : false,
                    ownerUserId: existingBySignal.owner_user_id,
                    snapshotId: existingBySignal.snapshot_id,
                    signalId: existingBySignal.signal_id,
                    cid: existingBySignal.pinata_cid,
                    pinataUrl: existingBySignal.pinata_url,
                    shareUrl,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!userId) {
            return new Response(JSON.stringify({ status: 'NO_OWNERSHIP' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!PINATA_JWT) {
            return new Response(JSON.stringify({ error: 'PINATA_JWT not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!(file instanceof File)) {
            return new Response(JSON.stringify({ error: 'file required for pin' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        log('DB_INSERT_START');
        const roePct = roePctRaw === null ? null : Number(roePctRaw);
        const leverage = leverageRaw === null ? null : Number(leverageRaw);
        const pnlAmount = pnlAmountRaw === null ? null : Number(pnlAmountRaw);

        const { data: inserted, error: insertErr } = await dbClient
            .from('snapshot_ownership')
            .insert({
                snapshot_id: snapshotId,
                signal_id: signalId,
                owner_user_id: userId,
                roe_pct: Number.isFinite(roePct) ? roePct : null,
                leverage: Number.isFinite(leverage) ? Math.trunc(leverage) : null,
                pnl_amount: Number.isFinite(pnlAmount) ? pnlAmount : null,
                download_count: 1,
            })
            .select('*');
        log('DB_INSERT_DONE', { insertErr });

        if (insertErr && insertErr.code === '23505') {
            const { data: existing } = await dbClient
                .from('snapshot_ownership')
                .select('snapshot_id, signal_id, owner_user_id, pinata_cid, pinata_url, download_count')
                .or(`signal_id.eq.${signalId},snapshot_id.eq.${snapshotId}`)
                .maybeSingle();

            if (existing) {
                if (countDownload && existing.snapshot_id) {
                    const currentCount = Number((existing as any).download_count ?? 0) || 0;
                    await dbClient
                        .from('snapshot_ownership')
                        .update({ download_count: currentCount + 1 })
                        .eq('snapshot_id', existing.snapshot_id);
                }
                return new Response(
                    JSON.stringify({
                        isOwner: userId ? existing.owner_user_id === userId : false,
                        ownerUserId: existing.owner_user_id,
                        snapshotId: existing.snapshot_id,
                        signalId: existing.signal_id,
                        cid: existing.pinata_cid,
                        pinataUrl: existing.pinata_url,
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        if (!insertErr && inserted?.length) {
            const pinataForm = new FormData();
            pinataForm.append('file', file, `snapshot-${snapshotId}.png`);
            pinataForm.append(
                'pinataMetadata',
                JSON.stringify({
                    name: `snapshot-${snapshotId}`,
                    keyvalues: { snapshotId, ownerUserId: userId },
                })
            );

            const pinRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}` },
                body: pinataForm,
            });

            if (!pinRes.ok) {
                const errText = await pinRes.text();
                return new Response(JSON.stringify({ error: 'Pinata upload failed', detail: errText }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const pinJson = await pinRes.json();
            const cid = String(pinJson.IpfsHash || '');
            const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
            const shareUrl = cid && baseUrl ? `${baseUrl}/${cid}` : pinataUrl;

            await dbClient
                .from('snapshot_ownership')
                .update({ pinata_cid: cid, pinata_url: pinataUrl })
                .eq('snapshot_id', snapshotId);

            try {
                const uploadPath = `pinata/${cid}.png`;
                const { error: uploadErr } = await dbClient.storage
                    .from(SNAP_BUCKET)
                    .upload(uploadPath, file, {
                        contentType: file.type || 'image/png',
                        upsert: true,
                    });
                if (uploadErr) {
                    log('BUCKET_UPLOAD_FAILED', { uploadErr });
                } else {
                    log('BUCKET_UPLOAD_DONE', { uploadPath });
                }
            } catch (e) {
                log('BUCKET_UPLOAD_ERROR', { error: String(e) });
            }

            return new Response(
                JSON.stringify({ isOwner: true, ownerUserId: userId, cid, pinataUrl, shareUrl }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(JSON.stringify({ error: 'Ownership insert failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.log(JSON.stringify({ tag: 'pin-snapshot', step: 'UNHANDLED_ERROR', error: String(e) }));
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
