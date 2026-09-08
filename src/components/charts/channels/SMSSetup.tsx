import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { faIcon } from '@/lib/fontawesome';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SMSSetupProps {
  userId: string;
  phoneNumber: string | null;
  onUpdate: () => void;
}

export const SMSSetup = ({ userId, phoneNumber, onUpdate }: SMSSetupProps) => {
  const [phone, setPhone] = useState(phoneNumber || '');
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const isLinked = !!phoneNumber;

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return;
    }

    // Basic validation for phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      toast.error('올바른 전화번호 형식이 아닙니다 (예: +821012345678)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
         
        .update({ phone_number: phone.trim() } as any)
        .eq('id', userId);

      if (error) throw error;

      toast.success('SMS 알림이 설정되었습니다');
      onUpdate();
    } catch (error) {
      console.error('Error saving phone number:', error);
      toast.error('전화번호 저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
         
        .update({ phone_number: null } as any)
        .eq('id', userId);

      if (error) throw error;

      setPhone('');
      toast.success('SMS 연결이 해제되었습니다');
      onUpdate();
    } catch (error) {
      console.error('Error unlinking SMS:', error);
      toast.error('연결 해제 중 오류가 발생했습니다');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="space-y-4">
      {isLinked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <i className={faIcon('fa-check', 'h-5 w-5 text-green-500 flex-shrink-0')} />
            <div className="flex-1">
              <div className="font-semibold text-green-500">연결됨</div>
              <div className="text-sm text-muted-foreground">
                {phoneNumber}로 SMS 알림을 받고 있습니다
              </div>
            </div>
            <Badge variant="outline">활성</Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex-1"
            >
              {unlinking ? (
                <>
                  <i className={faIcon('fa-spinner', 'mr-2 h-4 w-4 animate-spin')} />
                  처리중...
                </>
              ) : (
                '연결 해제'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="font-semibold">SMS 알림 설정:</div>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>국제 전화번호 형식으로 입력 (예: +821012345678)</li>
              <li>저장 버튼을 클릭하여 SMS 알림 활성화</li>
              <li>테스트 메시지가 전송됩니다</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Input
              type="tel"
              placeholder="+821012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              * 국제 전화번호 형식 (+ 국가번호 포함)
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !phone.trim()}
            size="lg"
            className="w-full"
          >
            {saving ? "저장 중..." : "SMS 알림 설정"}
          </Button>
        </div>
      )}
    </div>
  );
};
