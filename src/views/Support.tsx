'use client'

import { Send, MessageCircle, Mail, Bell, BookOpen, HelpCircle } from 'lucide-react'
import { Link } from '@/lib/navigation-compat'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useSupportTickets } from '@/hooks/useSupportTickets'
import { SupportTicketForm } from '@/components/support/SupportTicketForm'
import { SupportTicketList } from '@/components/support/SupportTicketList'
import Onboarding from '@/views/Onboarding'

const CONTACT_CHANNELS = [
  {
    href: 'https://t.me/aixsignal',
    icon: Send,
    title: 'Telegram',
    description: '가장 빠른 응답 · 실시간 문의',
  },
  {
    href: 'https://discord.gg/aixsignal',
    icon: MessageCircle,
    title: 'Discord',
    description: '커뮤니티 · 자주 묻는 질문',
  },
  {
    href: 'mailto:support@aixsignal.com',
    icon: Mail,
    title: '이메일',
    description: 'support@aixsignal.com',
  },
]

// '첫 사용자 안내'는 이제 별도 페이지가 아니라 이 페이지 안의 섹션이므로
// 외부 링크가 아닌 앵커(#guide)로 같은 화면 안에서 이동시킨다.
const HELP_LINKS = [
  { href: '#guide', icon: BookOpen, title: '첫 사용자 안내', description: '서비스 이용 가이드' },
  { href: '/notice', icon: Bell, title: '공지사항', description: '업데이트 및 안내' },
]

/**
 * 고객센터 — 안내 · 문의 채널 · 1:1 문의를 한 페이지로 통합.
 *
 * 통합 전에는 셋이 흩어져 있었다 — /guide(사용 가이드), /help(1:1 문의 폼),
 * /support(문의 채널). 이제 /guide·/help·/onboarding은 next.config.mjs의
 * 리다이렉트로 모두 이곳으로 오고, 세 내용이 한 화면의 섹션으로 합쳐진다.
 *
 * 주의: 리다이렉트의 단일 진실 원천은 next.config.mjs다.
 * src/config/redirects.ts는 어디에서도 import되지 않는 죽은 설정이라
 * 그 파일만 고치면 실제 라우팅은 바뀌지 않는다.
 */
export default function Support() {
  const { user } = useAuth()
  const { tickets, submitting, submitTicket } = useSupportTickets()

  return (
    <div className="w-full space-y-10 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">고객센터</h1>
        <p className="text-sm text-muted-foreground">
          무엇을 도와드릴까요? 아래 안내를 먼저 확인하고, 해결되지 않으면 문의를 남겨주세요.
        </p>
      </div>

      {/* 문의 채널 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CONTACT_CHANNELS.map((c) => (
          <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="glass h-full transition-all hover:border-primary/50">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <c.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{c.title}</span>
                <span className="text-xs text-muted-foreground">{c.description}</span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">도움말 바로가기</CardTitle>
          <CardDescription>문의하기 전에 아래 안내를 먼저 확인해 보세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HELP_LINKS.map((l) => (
            <Link key={l.href} to={l.href} className="block">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                <l.icon className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* 사용 가이드 — 구 /guide */}
      <section id="guide" className="scroll-mt-24">
        <Onboarding />
      </section>

      <Separator />

      {/* 1:1 문의 — 구 /help */}
      <section className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            <HelpCircle className="h-6 w-6 text-primary" />
            문의하기
          </h2>
          <p className="text-sm text-muted-foreground">
            궁금한 점이나 문제를 남겨주시면 확인 후 답변드립니다.
          </p>
        </div>

        <SupportTicketForm
          isAuthenticated={!!user}
          submitting={submitting}
          onSubmit={submitTicket}
        />
        <SupportTicketList tickets={tickets} />
      </section>
    </div>
  )
}
