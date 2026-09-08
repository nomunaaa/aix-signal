/**
 * 문의(지원 티켓) 제출 폼 — subject + message, 로그인 사용자만 제출 가능.
 */
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export interface SupportTicketFormProps {
  readonly isAuthenticated: boolean;
  readonly submitting: boolean;
  readonly onSubmit: (subject: string, message: string) => Promise<{ ok: boolean; error?: string }>;
}

export function SupportTicketForm({ isAuthenticated, submitting, onSubmit }: SupportTicketFormProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: '입력 오류',
        description: '제목과 문의 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const result = await onSubmit(subject.trim(), message.trim());
    if (!result.ok) {
      toast({
        title: '접수 실패',
        description: result.error ?? '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: '문의가 접수되었습니다', description: '영업일 기준 1-2일 내에 답변드리겠습니다.' });
    setSubject('');
    setMessage('');
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">1:1 문의하기</CardTitle>
        <CardDescription>문의를 남겨주시면 관리자가 확인 후 답변드립니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isAuthenticated ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            로그인 후 문의를 남길 수 있습니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="문의 제목을 입력해주세요"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>문의 내용</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="문의 내용을 자세히 작성해주세요..."
                rows={6}
              />
            </div>
            <Button type="submit" className="gap-2" disabled={submitting}>
              <Send className="h-4 w-4" />
              {submitting ? '접수 중...' : '문의 접수'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
