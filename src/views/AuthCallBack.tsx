'use client';

import { useEffect } from 'react';
import { useNavigate } from '@/lib/navigation-compat';
import { supabase } from '@/integrations/supabase/client';
import { syncDomainSessionFromUser } from '@/lib/auth-domains/session';
import {
  buildSignupReferralPath,
  normalizeReferralCode,
  REFERRAL_STORAGE_KEY,
} from '@/lib/auth/referral-navigation';

function safeSeed(seed: string) {
  return encodeURIComponent(seed.trim().toLowerCase());
}

function buildDiceBearAvatarUrl(seed: string) {
  const style = 'bottts';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed(seed)}`;
}

function getSafeRedirectPath(raw: string | null): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 50));

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Failed to exchange code for session:', exchangeError);
        }
      }

      const hash = window.location.hash?.replace(/^#/, '');
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setSessionError) {
            console.error('Failed to set session from hash:', setSessionError);
          }
        }
      }

      const { data: s } = await supabase.auth.getSession();
      const { data: u } = await supabase.auth.getUser();

      if (u.user) {
        syncDomainSessionFromUser('member', u.user, 'member');

        const referralCode =
          normalizeReferralCode(url.searchParams.get('ref')) ??
          normalizeReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY));
        const signupPath = buildSignupReferralPath(referralCode);

        if (referralCode) {
          localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
        }

        // referralCode가 있을 때만(가입 전에 추천코드를 입력했거나 ?ref= 링크로 들어온 경우)
        // 여기서 즉시 귀속시킨다. 코드가 없으면 여기서 곧장 default_store로 귀속시키지
        // 않는다 — apply_referral_attribution은 referee당 1행만 허용해 재시도가 불가능한데,
        // SNS 최초 가입자는 아직 /signup의 "추가 정보 입력" 단계(추천코드 입력 포함)에
        // 도달하기도 전이었다. 여기서 먼저 default_store 행을 만들어 버리면 그 화면의
        // 추천코드 입력란이 "이미 귀속됨"으로 잠겨버리고, 이후 코드를 입력해도
        // 조용히 무시된다. 코드가 없는 경우의 최종 귀속(직접 입력 또는 default_store)은
        // handleCompleteSocialSignup()이 그 화면에서 처리한다.
        if (referralCode) {
          const { data: existingRelationship } = await supabase
            .from('referral_relationships')
            .select('id')
            .eq('referee_id', u.user.id)
            .maybeSingle();

          if (!existingRelationship) {
            const { error: referralError } = await supabase.rpc('process_referral_code', {
              p_referee_id: u.user.id,
              p_ref_code: referralCode,
            });
            if (referralError) {
              console.error('Failed to apply referral attribution:', referralError);
              navigate(signupPath, { replace: true });
              return;
            }
          }

          localStorage.removeItem(REFERRAL_STORAGE_KEY);
        }

        // ----------------------------
        // 2) ✅ Ensure avatar in profiles + user metadata (first-time only)
        // ----------------------------
        let needsPhoneVerification = false;
        try {
          const { data: profile, error: readErr } = await supabase
            .from('profiles')
            .select('avatar_url, phone_verified')
            .eq('id', u.user.id)
            .maybeSingle();

          if (readErr) throw readErr;

          needsPhoneVerification = !profile?.phone_verified;

          const hasAvatar = Boolean(profile?.avatar_url);
          if (!hasAvatar) {
            const seed = u.user.email ?? u.user.id;
            const avatarUrlToUse = buildDiceBearAvatarUrl(seed);

            const { error: upsertErr } = await supabase.from('profiles').upsert(
              {
                id: u.user.id,
                avatar_url: avatarUrlToUse,
              },
              { onConflict: 'id' }
            );

            if (upsertErr) throw upsertErr;

            await supabase.auth.updateUser({
              data: { avatar_url: avatarUrlToUse },
            });
          }
        } catch (e) {
          console.error('Failed to set avatar:', e);
        }

        // ----------------------------
        // 3) ✅ SNS 로그인은 이름은 자동으로 받아오지만 전화번호 인증은 거치지
        // 않으므로, 여기서 강제로 /signup으로 보낸다 — Signup.tsx가 로그인
        // 상태를 감지해 같은 페이지에서 "추가 정보 입력" 폼(Form 2)을 보여준다.
        // 그냥 nextPath(기본값 "/")로 보내면 그 경로는 (app) 그룹 밖이라 인증
        // 가드가 없어 그대로 서비스에 들어가 버린다 — 탈퇴 후 같은 SNS 계정으로
        // 재가입한 경우도 새 프로필의 phone_verified가 false이므로 여기서 걸린다.
        // ----------------------------
        if (needsPhoneVerification) {
          navigate(signupPath, { replace: true });
          return;
        }
      }

      if (s.session) {
        const nextPath = getSafeRedirectPath(url.searchParams.get('next'));
        navigate(nextPath, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    })();
  }, [navigate]);

  return <div className="p-6">Signing you in…</div>;
}
