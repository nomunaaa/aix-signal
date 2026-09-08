import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppClientScripts } from './AppClientScripts';
import './globals.css';
import { InitialLoadingScreen } from './InitialLoadingScreen';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AiXSignal - AI 교차검증 투자 시그널',
  description:
    '강력한 신호와 추세를 통해서 방향을 알아가는 Ai X Signal. 25+트레이딩 데스크 팀의 700+ 전략과 고유지표에서 100+ 인공지능 노드에서 찾아낸 하나의 시그널.',
  icons: [{ rel: 'icon', url: '/favicon.ico', sizes: 'any' }],
};

/**
 * Next 16 devtools는 unhandledrejection에 bubble 리스너만 등록함.
 * capture로 먼저 받고 stopImmediatePropagation() — preventDefault만으로는 오버레이가 여전히 뜸.
 * 인라인으로 hydration 이전 등록.
 */
const LOADING_SCRIPT_REJECTION_SWALLOW = `(function(){
function str(r){
  if(r==null)return'';
  if(typeof r==='string')return r;
  if(r instanceof Error){
    var m=r.message||(r.name||'');
    var c=typeof r.cause!=='undefined'?str(r.cause):'';
    return m+(c?' '+c:'');
  }
  if(typeof r==='object'&&'message' in r)return String(r.message);
  try{return String(r)}catch(e){return''}
}
function onRej(e){
  if(str(e.reason).toLowerCase().indexOf('loading script')!==-1){
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}
window.addEventListener('unhandledrejection',onRej,true);
})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: LOADING_SCRIPT_REJECTION_SWALLOW }}
        />
        {/* Heleket merchant/domain verification token (dashboard) */}
        <meta name="heleket" content="f509f9f0" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to font CDN — Pretendard font loaded via @font-face in CSS */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppClientScripts />
        <Providers>{children}</Providers>
        <InitialLoadingScreen />
      </body>
    </html>
  );
}
