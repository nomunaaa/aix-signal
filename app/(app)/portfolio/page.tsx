'use client';

import OpenPositionsPage from '@/views/positions/OpenPositionsPage';

/** 가상 포지션 허브 — /portfolio 단일 경로 (middleware의 /portfolio/* 리다이렉트와 구분) */
export default function Page() {
  return <OpenPositionsPage />;
}
