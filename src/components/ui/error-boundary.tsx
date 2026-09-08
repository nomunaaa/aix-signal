/**
 * 에러 바운더리 컴포넌트
 * 
 * React 에러를 catch하여 사용자에게 안전한 UI를 표시합니다.
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 폴백 UI (optional) */
  fallback?: ReactNode;
  /** 에러 발생 시 콜백 (optional) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 에러 바운더리
 * 
 * 사용 예시:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="glass max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>오류가 발생했습니다</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                페이지를 표시하는 중 문제가 발생했습니다.
                페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </p>
              
              {this.state.error && (
                <details className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <summary className="cursor-pointer font-semibold mb-2">
                    기술 세부사항
                  </summary>
                  <pre className="whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3">
                <Button onClick={this.handleReset} className="flex-1 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 컴포넌트 에러 폴백 (작은 컴포넌트용)
 */
export function ComponentErrorFallback({ 
  error,
  resetError 
}: { 
  error?: Error;
  resetError?: () => void;
}) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-destructive">
            컴포넌트 로딩 실패
          </p>
          {error && (
            <p className="text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
          {resetError && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={resetError}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              다시 시도
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

