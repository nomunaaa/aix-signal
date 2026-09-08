'use client';

/**
 * 공지사항/이벤트 페이지
 * Mock 데이터 기반 라이브 데모
 * @route /notice
 */

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Gift,
  Info,
  Calendar,
  ChevronRight,
  PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock 공지사항 데이터
const MOCK_NOTICES = [
  {
    id: 'notice-001',
    type: 'notice' as const,
    category: '서비스',
    title: '[업데이트] PULSE™ v2.0 출시 안내',
    summary: '더욱 정교해진 AI 분석 엔진과 새로운 Signal DNA 시각화 기능이 추가되었습니다.',
    content: `안녕하세요, AiXSignal입니다.

PULSE™ v2.0이 정식 출시되었습니다!

## 주요 업데이트 내용

### 1. AI 분석 엔진 강화
- 분석 정확도 15% 향상
- 새로운 머신러닝 모델 적용
- 실시간 시장 감지 속도 개선

### 2. Signal DNA 시각화
- 시그널 강도를 직관적으로 표현
- 6단계 DNA 바 시스템 도입
- 진입 타이밍 판단 보조

### 3. UI/UX 개선
- 모바일 최적화
- 다크모드 색상 개선
- 로딩 속도 50% 향상

더 나은 서비스를 위해 노력하겠습니다.
감사합니다.`,
    date: '2024-12-07',
    isPinned: true,
    isNew: true,
  },
  {
    id: 'notice-002',
    type: 'event' as const,
    category: '이벤트',
    title: '🎄 12월 크리스마스 이벤트 - Pro 플랜 50% 할인!',
    summary: '연말을 맞아 Pro 플랜을 50% 할인된 가격으로 만나보세요. 12월 31일까지!',
    content: `🎅 AiXSignal 크리스마스 특별 이벤트!

## 이벤트 내용
Pro 플랜 첫 3개월 **50% 할인**

## 이벤트 기간
2024년 12월 1일 ~ 12월 31일

## 참여 방법
1. 회원가입
2. Pro 플랜 선택
3. 결제 시 쿠폰 코드 입력: **XMAS2024**

## 혜택
- Pro 플랜 월 699,000원 → **349,500원**
- 30개 종목 실시간 시그널
- 텔레그램 즉시 알림
- AI 리스크 코치

※ 신규 가입자 한정
※ 기존 구독자는 갱신 시 20% 할인 적용`,
    date: '2024-12-01',
    isPinned: true,
    isNew: true,
    eventEndDate: '2024-12-31',
  },
  {
    id: 'notice-003',
    type: 'notice' as const,
    category: '점검',
    title: '[완료] 12월 5일 정기 점검 안내',
    summary: '서버 안정화를 위한 정기 점검이 완료되었습니다.',
    content: `정기 점검이 완료되었습니다.

## 점검 내용
- 서버 인프라 업그레이드
- 데이터베이스 최적화
- 보안 패치 적용

## 점검 시간
2024년 12월 5일 02:00 ~ 06:00 (KST)

서비스 이용에 불편을 드려 죄송합니다.`,
    date: '2024-12-05',
    isPinned: false,
    isNew: false,
  },
  {
    id: 'notice-004',
    type: 'event' as const,
    category: '이벤트',
    title: '📱 텔레그램 채널 구독 이벤트',
    summary: '텔레그램 공식 채널 구독 시 1주일 Pro 체험권을 드립니다.',
    content: `AiXSignal 공식 텔레그램 채널을 구독하세요!

## 이벤트 내용
텔레그램 채널 구독 시 **Pro 플랜 7일 체험권** 증정

## 참여 방법
1. 텔레그램에서 @AiXSignal_Official 검색
2. 채널 구독
3. 구독 인증 스크린샷 제출
4. 체험권 발급

## 채널 혜택
- 실시간 시그널 알림
- 시장 분석 리포트
- 이벤트 소식 우선 안내`,
    date: '2024-11-28',
    isPinned: false,
    isNew: false,
  },
  {
    id: 'notice-005',
    type: 'notice' as const,
    category: '안내',
    title: '[안내] 개인정보처리방침 개정 안내',
    summary: '개인정보처리방침이 일부 개정되었습니다.',
    content: `개인정보처리방침 개정 안내

## 개정 일자
2024년 11월 25일

## 주요 변경 사항
1. 개인정보 수집 항목 명확화
2. 제3자 제공 조항 추가
3. 보유 기간 상세화

자세한 내용은 개인정보처리방침 페이지를 참조해주세요.`,
    date: '2024-11-25',
    isPinned: false,
    isNew: false,
  },
];

type NoticeType = 'all' | 'notice' | 'event';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'event': return <Gift className="w-4 h-4 text-pink-400" />;
    case 'notice': return <Megaphone className="w-4 h-4 text-primary" />;
    default: return <Info className="w-4 h-4 text-muted-foreground" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case '이벤트': return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
    case '서비스': return 'bg-primary/10 text-primary border-primary/30';
    case '점검': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case '안내': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const NoticeListItem = ({ notice, onClick }: { 
  notice: typeof MOCK_NOTICES[0]; 
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    className={cn(
      "p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all cursor-pointer",
      notice.isPinned && "bg-primary/5 border-primary/30"
    )}
  >
    <div className="flex items-start gap-4">
      <div className="pt-1">
        {getTypeIcon(notice.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className={cn("text-xs", getCategoryColor(notice.category))}>
            {notice.category}
          </Badge>
          {notice.isPinned && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
              📌 고정
            </Badge>
          )}
          {notice.isNew && (
            <Badge className="text-xs bg-semantic-bear text-white dark:text-black">NEW</Badge>
          )}
        </div>
        <h3 className="font-semibold line-clamp-1">{notice.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {notice.summary}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{notice.date}</span>
          {notice.eventEndDate && (
            <>
              <span>~</span>
              <span>{notice.eventEndDate}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </div>
  </div>
);

export default function Notice() {
  const [filter, setFilter] = useState<NoticeType>('all');
  const [selectedNotice, setSelectedNotice] = useState<typeof MOCK_NOTICES[0] | null>(null);

  const filteredNotices = MOCK_NOTICES.filter(notice => {
    if (filter === 'all') return true;
    return notice.type === filter;
  }).sort((a, b) => {
    // 고정 글 먼저, 그 다음 날짜순
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const eventCount = MOCK_NOTICES.filter(n => n.type === 'event').length;
  const noticeCount = MOCK_NOTICES.filter(n => n.type === 'notice').length;

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            공지사항 / 이벤트
          </h1>
          <p className="text-sm text-muted-foreground">
            AiXSignal의 최신 소식과 이벤트를 확인하세요
          </p>
        </div>

        {/* 진행 중인 이벤트 배너 */}
        {MOCK_NOTICES.filter(n => n.type === 'event' && n.isNew).length > 0 && (
          <Card className="glass border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <PartyPopper className="w-6 h-6 text-pink-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">진행 중인 이벤트</span>
                    <Badge className="bg-pink-500 text-white">{eventCount}개</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    놓치지 마세요! 특별 혜택이 준비되어 있습니다.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilter('event')}
                  className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                >
                  보러가기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 필터 탭 */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as NoticeType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              전체 ({MOCK_NOTICES.length})
            </TabsTrigger>
            <TabsTrigger value="notice" className="gap-2">
              <Megaphone className="w-4 h-4" />
              공지 ({noticeCount})
            </TabsTrigger>
            <TabsTrigger value="event" className="gap-2">
              <Gift className="w-4 h-4" />
              이벤트 ({eventCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 공지사항 목록 */}
        <div className="space-y-3">
          {filteredNotices.map((notice) => (
            <NoticeListItem 
              key={notice.id} 
              notice={notice}
              onClick={() => setSelectedNotice(notice)}
            />
          ))}
        </div>

        {/* 상세보기 다이얼로그 */}
        <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedNotice && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getCategoryColor(selectedNotice.category)}>
                      {selectedNotice.category}
                    </Badge>
                    {selectedNotice.isNew && (
                      <Badge className="bg-semantic-bear text-white dark:text-black">NEW</Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">{selectedNotice.title}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{selectedNotice.date}</span>
                  </div>
                </DialogHeader>
                <div className="prose prose-sm prose-invert max-w-none mt-4">
                  {selectedNotice.content.split('\n').map((line, idx) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={idx} className="text-base font-semibold mt-3 mb-1">{line.replace('### ', '')}</h3>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={idx} className="text-muted-foreground">{line.replace('- ', '')}</li>;
                    }
                    if (line.match(/^\d+\./)) {
                      return <li key={idx} className="text-muted-foreground ml-4">{line}</li>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={idx} className="font-bold text-primary">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('※')) {
                      return <p key={idx} className="text-xs text-muted-foreground">{line}</p>;
                    }
                    if (line === '') {
                      return <br key={idx} />;
                    }
                    return <p key={idx} className="text-muted-foreground">{line}</p>;
                  })}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 안내 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>📢 중요 공지는 상단에 고정됩니다.</p>
        </div>
      </div>
    </>
  );
}
