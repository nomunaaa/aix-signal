/**
 * Footer — 거래소·앱 셸형: 한 블록에 링크 + 법무 (과한 마케팅 카피 없음)
 */

import { Link } from "@/lib/navigation-compat";
import { Send, MessageCircle, Youtube } from 'lucide-react';

// lucide-react의 Twitter 아이콘은 구 트위터 새 로고라 X 리브랜딩과 맞지 않고,
// lucide의 범용 X(닫기) 아이콘은 브랜드 로고가 아니라서 공식 X 워드마크 path를 직접 그린다.
function XLogoIcon({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const socialLinks = [
  { href: 'https://twitter.com/aixsignal', icon: XLogoIcon, label: 'X' },
  { href: 'https://t.me/aixsignal', icon: Send, label: 'Telegram' },
  { href: 'https://discord.gg/aixsignal', icon: MessageCircle, label: 'Discord' },
  { href: 'https://www.youtube.com/@aixsignal', icon: Youtube, label: 'YouTube' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-1">
          <p className="text-[11px] tabular-nums text-muted-foreground">
            © {year} AiXSignal
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <Link
              to="/terms"
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              이용약관
            </Link>
            <Link
              to="/privacy"
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              개인정보처리방침
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:ml-auto">
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={label}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/90 sm:mt-2">
          투자자문이 아닌 정보 제공 목적입니다. 암호화폐 투자는 원금 손실 위험이 있으며 과거 수익이 미래를 보장하지 않습니다.
        </p>
      </div>
    </footer>
  );
}
