import { BarChart3, LogIn, Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from "@/lib/navigation-compat";
import { cn } from '@/lib/utils';

export type EmptyStateVariant = 'default' | 'login-required' | 'no-signal';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  /** When set, overrides title/description/CTA per PULSE spec §2.5 */
  variant?: EmptyStateVariant;
  className?: string;
}

const VARIANT_CONTENT: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string; ctaText?: string; ctaHref?: string }
> = {
  default: {
    icon: BarChart3,
    title: '데이터 없음',
    description: '표시할 내용이 없습니다.',
  },
  'login-required': {
    icon: LogIn,
    title: '로그인이 필요합니다',
    description: '로그인하여 실시간 시그널을 확인하세요.',
    ctaText: '로그인',
    ctaHref: '/auth',
  },
  'no-signal': {
    icon: Inbox,
    title: '시그널 없음',
    description: '현재 활성 시그널이 없습니다. 시장 상황에 따라 시그널이 생성됩니다.',
  },
};

export function EmptyState({
  icon: IconProp,
  title: titleProp,
  description: descriptionProp,
  ctaText: ctaTextProp,
  ctaHref: ctaHrefProp,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const variantContent = VARIANT_CONTENT[variant];
  const Icon = IconProp ?? variantContent.icon;
  const title = titleProp ?? variantContent.title;
  const description = descriptionProp ?? variantContent.description;
  const ctaText = ctaTextProp ?? variantContent.ctaText;
  const ctaHref = ctaHrefProp ?? variantContent.ctaHref;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="text-base font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      {ctaText && ctaHref && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to={ctaHref}>{ctaText}</Link>
        </Button>
      )}
    </div>
  );
}
