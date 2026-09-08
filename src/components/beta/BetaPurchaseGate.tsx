'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@/lib/navigation-compat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BETA_TEST, BETA_MESSAGES } from '@/config/beta';

interface Props {
  /** 결제 화면 경로. 베타가 꺼져 있을 때만 실제로 이동한다. */
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * 결제 진입점 하나를 감싼다.
 *
 * 베타 기간에는 이동을 막고 안내 팝업을 띄우고, 끝나면 원래 링크로 돌아간다.
 * 진입점이 여러 곳(Pricing 2곳, Alerts, SignalsHistory)이라 각자 조건문을 두면
 * 나중에 하나를 빠뜨리기 쉬워서 한 컴포넌트로 모았다.
 *
 * 이건 화면 차단일 뿐이라 실제 방어는 /checkout 자체에서 한 번 더 한다.
 */
export function BetaPurchaseGate({ href, className, children }: Props) {
  const [open, setOpen] = useState(false);

  if (!BETA_TEST) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
      >
        {children}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{BETA_MESSAGES.purchaseBlockedTitle}</AlertDialogTitle>
            <AlertDialogDescription>{BETA_MESSAGES.purchaseBlocked}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOpen(false)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BetaPurchaseGate;
