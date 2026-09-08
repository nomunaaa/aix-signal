/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [],

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async redirects() {
    return [
      { source: '/signals/pulse', destination: '/signals', permanent: false },
      { source: '/signals/wave', destination: '/signals', permanent: false },
      { source: '/signals/board', destination: '/signals', permanent: false },
      { source: '/signals/scan', destination: '/signals', permanent: false },
      { source: '/signals/cards', destination: '/signals', permanent: false },
      { source: '/signals/symbols', destination: '/signals', permanent: false },
      { source: '/signals/symbols/:symbol', destination: '/signals', permanent: false },
      { source: '/signals/analytics', destination: '/signals', permanent: false },
      { source: '/signals/statistics', destination: '/signals', permanent: false },
      { source: '/signal/pulse1', destination: '/signals', permanent: false },
      { source: '/signal/wave1', destination: '/signals', permanent: false },
      { source: '/signal-detail/:symbol/:anchorTs', destination: '/signals', permanent: false },
      { source: '/me/performance', destination: '/my', permanent: false },
      { source: '/dashboard', destination: '/signals', permanent: false },
      { source: '/home', destination: '/signals', permanent: false },
      { source: '/feed', destination: '/signals', permanent: false },
      { source: '/notices', destination: '/notice', permanent: false },

      // 페이지 통합 — 내용이 흡수된 쪽으로 보낸다.
      // 고객센터(/support)가 '사용 가이드'(구 /guide)와 1:1 문의(구 /help)를 모두 품는다.
      { source: '/guide', destination: '/support', permanent: false },
      { source: '/help', destination: '/support', permanent: false },
      { source: '/onboarding', destination: '/support', permanent: false },
      // 구독 취소 카드를 /billing으로 이관했고 나머지 섹션은 이미 /billing에 있었다.
      { source: '/manage-subscription', destination: '/billing', permanent: false },
      { source: '/asset/:symbol', destination: '/signals', permanent: false },
      // NOTE: redirects whose destination pointed at /chart, /chart/multi,
      // /insight/trend, /proof/board, /proof/cycles, /trend/feed were removed —
      // this repo only carries the confirmed-reachable MAIN+MORE nav closure,
      // and those destinations don't exist here. See migration notes.
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
