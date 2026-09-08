import { Bell, CreditCard, User } from 'lucide-react';

export const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    label: '내 프로필',
    labelEn: 'My Profile',
    description: '이름, 이메일, 아바타 설정',
    icon: User,
    path: '/profile',
  },
  {
    id: 'alerts',
    label: '알림 설정',
    labelEn: 'Notification Settings',
    description: '시그널 알림, DND, 채널 설정',
    icon: Bell,
    path: '/alerts',
  },
  {
    id: 'billing',
    label: '구독 관리',
    labelEn: 'Subscription Management',
    description: '플랜, 결제 내역, 구독 변경',
    icon: CreditCard,
    path: '/billing',
  },
] as const;
