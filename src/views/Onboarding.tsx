'use client';

/**
 * 처음 오셨나요? - 온보딩 가이드 페이지
 * 스텝 바이 스텝 사용 가이드
 * @route /support (고객센터 안의 '사용 가이드' 섹션)
 */

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft,
  Check,
  Zap,
  LineChart,
  Bell,
  Trophy,
  Wallet,
  ArrowRight,
  Sparkles,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

// 온보딩 스텝 데이터
const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'AiXSignal이란?',
    subtitle: '서비스 소개',
    icon: Sparkles,
    content: {
      heading: 'AI 기반 암호화폐 매매 시그널 서비스',
      description: 'AiXSignal은 인공지능이 실시간으로 분석한 암호화폐 매매 시그널을 제공합니다. PULSE™(1분봉)와 WAVE™(10분봉) 두 가지 시그널 타입으로 다양한 투자 스타일을 지원합니다.',
      features: [
        { icon: '⚡', title: 'PULSE™ 시그널', desc: '1분봉 기반 초단타 시그널' },
        { icon: '🌊', title: 'WAVE™ 시그널', desc: '10분봉 기반 추세 추종 시그널' },
        { icon: '🤖', title: 'AI 분석', desc: '24시간 실시간 시장 분석' },
      ],
    },
  },
  {
    id: 2,
    title: '시그널 보드 사용법',
    subtitle: '핵심 기능',
    icon: LineChart,
    content: {
      heading: '시그널 보드에서 실시간 매매 기회를 확인하세요',
      description: '시그널 보드는 현재 활성화된 모든 매매 시그널을 한눈에 보여줍니다. 각 시그널 카드에는 진입 방향, 가격, AI 신뢰도 등의 핵심 정보가 표시됩니다.',
      features: [
        { icon: '🟢', title: 'LONG 시그널', desc: '상승 예상, 매수 진입' },
        { icon: '🔴', title: 'SHORT 시그널', desc: '하락 예상, 매도 진입' },
        { icon: '📊', title: 'Signal DNA', desc: 'AI 신뢰도 시각화' },
      ],
    },
  },
  {
    id: 3,
    title: '알림 설정하기',
    subtitle: '놓치지 않기',
    icon: Bell,
    content: {
      heading: '중요한 시그널을 실시간으로 받아보세요',
      description: '텔레그램, 이메일, 푸시 알림을 통해 새로운 시그널이 발생할 때 즉시 알림을 받을 수 있습니다. 관심 종목만 선택하여 맞춤 알림을 설정하세요.',
      features: [
        { icon: '📱', title: '텔레그램 알림', desc: '가장 빠른 실시간 알림' },
        { icon: '📧', title: '이메일 알림', desc: '일일 요약 리포트' },
        { icon: '🔔', title: '푸시 알림', desc: '모바일 앱 알림' },
      ],
    },
  },
  {
    id: 4,
    title: '수익 추적하기',
    subtitle: '성과 관리',
    icon: Trophy,
    content: {
      heading: '나의 투자 성과를 체계적으로 관리하세요',
      description: '수익 보드에서 시그널 기반 투자 성과를 확인하고, 수익 인증 카드를 생성하여 SNS에 공유할 수 있습니다. 랭킹에서 다른 투자자들과 성과를 비교해보세요.',
      features: [
        { icon: '📈', title: '수익 대시보드', desc: 'PnL, 승률, 수익곡선' },
        { icon: '📸', title: '수익 인증', desc: '공유 가능한 카드 생성' },
        { icon: '🏆', title: '랭킹 시스템', desc: '유저 수익률 순위' },
      ],
    },
  },
  {
    id: 5,
    title: '플랜 선택하기',
    subtitle: '시작하기',
    icon: Wallet,
    content: {
      heading: '투자 스타일에 맞는 플랜을 선택하세요',
      description: 'Free 3-Day Trial로 시작한 뒤 Pro 플랜으로 모든 기능을 사용할 수 있습니다. 처음이시라면 체험 후 Pro 플랜을 추천드립니다.',
      features: [
        { icon: '💡', title: 'Free', desc: '3일 무료 체험' },
        { icon: '⭐', title: 'Pro (추천)', desc: '30종목, 전체 기능' },
      ],
    },
  },
];

// 빠른 링크
const QUICK_LINKS = [
  { title: 'PULSE 보드', href: '/signals/pulse', icon: Zap },
  { title: 'WAVE 보드', href: '/signals/wave', icon: LineChart },
  { title: '수익 대시보드', href: '/proof/board', icon: Trophy },
  { title: '플랜/가격', href: '/pricing', icon: Wallet },
];

const StepIndicator = ({ steps, currentStep, onStepClick }: { 
  steps: typeof ONBOARDING_STEPS; 
  currentStep: number;
  onStepClick: (step: number) => void;
}) => (
  <div className="flex items-center justify-center gap-2">
    {steps.map((step, idx) => (
      <button
        key={step.id}
        onClick={() => onStepClick(idx)}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          idx === currentStep 
            ? "bg-primary text-primary-foreground scale-110" 
            : idx < currentStep 
              ? "bg-semantic-bull text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {idx < currentStep ? (
          <Check className="w-5 h-5" />
        ) : (
          <span className="text-sm font-bold">{step.id}</span>
        )}
      </button>
    ))}
  </div>
);

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/*
        이 화면은 더 이상 독립 라우트가 아니다. /guide는 /support로 리다이렉트되고
        고객센터 페이지 안의 "사용 가이드" 섹션으로 렌더된다. 따라서 페이지 폭·여백은
        Support가 정하고 여기서는 자체 container / max-w를 두지 않는다.
      */}
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="px-4 py-1">
            <BookOpen className="w-4 h-4 mr-2" />
            사용 가이드
          </Badge>
          <h2 className="text-2xl font-bold">처음 오셨나요?</h2>
          <p className="text-muted-foreground">
            AiXSignal을 처음 사용하시는 분들을 위한 가이드입니다
          </p>
        </div>

        {/* 진행률 */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <StepIndicator 
            steps={ONBOARDING_STEPS} 
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* 메인 콘텐츠 카드 */}
        <Card className="glass overflow-hidden">
          {/* 스텝 헤더 */}
          <div className="bg-primary/10 border-b border-border/50 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <step.icon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-1">{step.subtitle}</Badge>
                <h2 className="text-2xl font-bold">{step.title}</h2>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* 설명 */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">{step.content.heading}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.content.description}
              </p>
            </div>

            {/* 기능 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {step.content.features.map((feature, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <div className="font-semibold mb-1">{feature.title}</div>
                  <div className="text-sm text-muted-foreground">{feature.desc}</div>
                </div>
              ))}
            </div>

            {/* 네비게이션 버튼 */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <Button 
                variant="outline" 
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {ONBOARDING_STEPS.length}
              </span>
              
              {currentStep === ONBOARDING_STEPS.length - 1 ? (
                <Button className="gap-2" asChild>
                  <Link href="/signals/pulse">
                    시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              ) : (
                <Button onClick={goNext} className="gap-2">
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 빠른 링크 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">바로 가기</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href} 
                href={link.href}
                className="block"
              >
                <Card className="glass hover:border-primary/50 transition-all h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <link.icon className="w-6 h-6 text-primary" />
                    <span className="font-medium text-sm">{link.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/*
          기존의 "더 궁금한 점이 있으신가요? → 고객센터" 카드는 제거했다.
          이 섹션 자체가 고객센터 안에 있으므로 자기 자신을 가리키는 링크가 된다.
          그 자리는 아래 1:1 문의 폼(Support.tsx)이 대신한다.
        */}
      </div>
    </>
  );
}
