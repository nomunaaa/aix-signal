'use client';

/**
 * REB-220: react-router-dom API를 Next App Router에 맞춘 얇은 호환 레이어.
 * 기존 `to` / `useNavigate()` / `useSearchParams()` 튜플 시그니처를 유지한다.
 */

import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams,
} from 'next/navigation';
import { useCallback, useMemo, type ComponentProps, type ReactNode } from 'react';

export { useParams };

type NextLinkProps = ComponentProps<typeof NextLink>;

/** react-router `to` — 문자열 또는 { pathname, search } */
export type CompatTo =
  | string
  | { pathname: string; search?: string; hash?: string };

function compatToHref(to: CompatTo): string {
  if (typeof to === 'string') return to;
  const { pathname, search = '', hash = '' } = to;
  const q = search
    ? search.startsWith('?')
      ? search
      : `?${search}`
    : '';
  const h = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `${pathname}${q}${h}`;
}

function pathnameFromCompatTo(to: CompatTo): string {
  if (typeof to === 'string') {
    const i = to.indexOf('?');
    return (i === -1 ? to : to.slice(0, i)) || '/';
  }
  return to.pathname || '/';
}

export type CompatLinkProps = Omit<NextLinkProps, 'href'> & {
  to: CompatTo;
  href?: string;
};

/** react-router `Link` — `to`를 Next `href`로 매핑 */
export function Link({ to, href, ...rest }: CompatLinkProps) {
  return <NextLink href={href ?? compatToHref(to)} {...rest} />;
}

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'number') {
        if (to === -1) router.back();
        return;
      }
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

/** react-router `location` 최소 호환 (pathname / search / hash) */
export function useLocation(): {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
} {
  const pathname = usePathname();
  const nextSp = useNextSearchParams();
  const search = useMemo(() => {
    const q = nextSp.toString();
    return q ? `?${q}` : '';
  }, [nextSp]);
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return useMemo(
    () => ({
      pathname: pathname ?? '',
      search,
      hash,
      state: null,
      key: 'default',
    }),
    [pathname, search, hash],
  );
}

export type SetURLSearchParams = (
  nextInit?:
    | URLSearchParams
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams | Record<string, string>),
  navigateOpts?: { replace?: boolean },
) => void;

/** react-router `useSearchParams()` 튜플 호환 */
export function useSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const nextSp = useNextSearchParams();
  const searchParams = useMemo(() => new URLSearchParams(nextSp.toString()), [nextSp]);

  const setSearchParams = useCallback<SetURLSearchParams>(
    (init, opts) => {
      let next: URLSearchParams;
      if (typeof init === 'function') {
        const prev = new URLSearchParams(nextSp.toString());
        const res = init(prev);
        next = res instanceof URLSearchParams ? res : new URLSearchParams(res);
      } else if (init instanceof URLSearchParams) {
        next = init;
      } else if (init) {
        next = new URLSearchParams(init);
      } else {
        next = new URLSearchParams();
      }
      const q = next.toString();
      const url = q ? `${pathname}?${q}` : pathname;
      // react-router의 setSearchParams는 스크롤 위치를 건드리지 않는다 — Next.js router의
      // 기본 scroll-to-top 동작은 이 호환 계층의 의미와 맞지 않으므로 명시적으로 끈다.
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, nextSp],
  );

  return [searchParams, setSearchParams];
}

export type CompatNavLinkRenderProps = { isActive: boolean; isPending: boolean };

export type CompatNavLinkProps = Omit<CompatLinkProps, 'className' | 'children'> & {
  className?: string | ((props: CompatNavLinkRenderProps) => string);
  children?: ReactNode | ((props: CompatNavLinkRenderProps) => ReactNode);
  end?: boolean;
  activeClassName?: string;
};

/** react-router `NavLink` — 활성 구간은 pathname prefix 매칭 */
export function NavLink({
  to,
  className,
  activeClassName,
  children,
  end,
  ...rest
}: CompatNavLinkProps) {
  const pathname = usePathname() ?? '';
  const pathOnly = pathnameFromCompatTo(to);
  const href = compatToHref(to);
  const isActive = end
    ? pathname === pathOnly
    : pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  const renderProps: CompatNavLinkRenderProps = { isActive, isPending: false };
  const cls = typeof className === 'function' ? className(renderProps) : className;
  const merged = [cls, isActive && (activeClassName ?? 'bg-primary/10 text-primary')]
    .filter(Boolean)
    .join(' ');
  const ch = typeof children === 'function' ? children(renderProps) : children;
  return (
    <NextLink href={href} className={merged || undefined} {...rest}>
      {ch}
    </NextLink>
  );
}
