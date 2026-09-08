'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBilingualText } from '@/hooks/useBilingualText';
import { getFunctionErrorMessage } from '@/lib/functionErrorMessage';

interface PhoneNumberSectionProps {
  userId: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  onUpdated: (phoneNumber: string) => void;
}

const PHONE_REGEX = /^0[0-9]{9,10}$/;

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/**
 * 번호를 완전히 끊는 "연결 해제"가 아니라, 새 번호를 인증해 곧바로 교체하는
 * 흐름이다 — profiles.phone_number의 부분 unique 인덱스(phone_verified=true인
 * 행만 대상)는 행 단위 최종 값만 보므로, 기존 번호를 먼저 비울 필요 없이 한
 * UPDATE로 원자적으로 바뀐다. verify-phone-otp 엣지 함수가 이미 이 케이스를
 * 지원한다(userId가 있으면 profiles.phone_number/phone_verified를 그 자리에서 갱신).
 */
export function PhoneNumberSection({
  userId,
  phoneNumber,
  phoneVerified,
  onUpdated,
}: PhoneNumberSectionProps) {
  const { tr, isKo } = useBilingualText();
  const [changing, setChanging] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const resetForm = () => {
    setChanging(false);
    setNewPhone('');
    setOtpSent(false);
    setOtpCode('');
  };

  const handleSend = async () => {
    const digits = newPhone.replace(/[^0-9]/g, '');
    if (!PHONE_REGEX.test(digits)) {
      toast.error(
        tr('올바른 휴대폰 번호를 입력하세요 (010으로 시작)', 'Enter a valid phone number (starting with 010)')
      );
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone: digits, countryCode: '+82' },
      });
      if (error) throw error;
      setOtpSent(true);
      setOtpCode('');
      toast.success(tr('인증번호가 발송되었습니다.', 'Verification code sent.'));
    } catch (e: unknown) {
      toast.error(
        await getFunctionErrorMessage(e, tr('발송 중 오류가 발생했습니다.', 'An error occurred while sending.'))
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const digits = newPhone.replace(/[^0-9]/g, '');
    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phone: digits, countryCode: '+82', code: otpCode, userId },
      });
      if (error) throw error;
      toast.success(tr('휴대폰 번호가 변경되었습니다.', 'Phone number updated.'));
      onUpdated(digits);
      resetForm();
    } catch (e: unknown) {
      toast.error(
        await getFunctionErrorMessage(e, tr('인증 중 오류가 발생했습니다.', 'An error occurred during verification.'))
      );
    } finally {
      setVerifying(false);
    }
  };

  const hasVerifiedPhone = phoneVerified && Boolean(phoneNumber);

  return (
    <div className="space-y-2">
      <Label>{tr('휴대폰 번호', 'Phone number')}</Label>

      {!changing ? (
        <div className="flex items-center gap-2">
          <Input
            value={
              hasVerifiedPhone
                ? maskPhone(phoneNumber as string)
                : tr('연결된 번호 없음', 'No number linked')
            }
            readOnly
            className="min-w-0 bg-muted/30"
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setChanging(true)}
          >
            {hasVerifiedPhone ? tr('번호 변경', 'Change') : tr('번호 등록', 'Add number')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="flex gap-2">
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-input bg-muted text-sm text-muted-foreground">
              +82
            </div>
            <Input
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value.replace(/[^0-9]/g, ''));
                setOtpSent(false);
              }}
              placeholder="01012345678"
              className="min-w-0"
              disabled={otpSent}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={sending || !newPhone}
              onClick={handleSend}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {otpSent ? tr('재발송', 'Resend') : tr('인증번호 발송', 'Send code')}
            </Button>
          </div>

          {otpSent && (
            <div className="flex gap-2">
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder={tr('6자리 인증번호', '6-digit code')}
                maxLength={6}
                className="min-w-0"
                disabled={verifying}
              />
              <Button
                type="button"
                className="shrink-0"
                disabled={verifying || otpCode.length !== 6}
                onClick={handleVerify}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {tr('확인', 'Confirm')}
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={resetForm}
            disabled={sending || verifying}
          >
            {tr('취소', 'Cancel')}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isKo
          ? '계정당 휴대폰 번호는 항상 1개만 연결됩니다. 새 번호를 인증하면 기존 번호는 자동으로 교체됩니다.'
          : 'Your account always keeps exactly one linked phone number. Verifying a new number automatically replaces the old one.'}
      </p>
    </div>
  );
}
