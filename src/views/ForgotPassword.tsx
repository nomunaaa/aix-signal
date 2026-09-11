'use client';

import { useState } from "react";
import { Link } from "@/lib/navigation-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { faIcon } from "@/lib/fontawesome";
import { RefreshCw } from "lucide-react";
import { z } from "zod";

// Validation schema
const emailSchema = z.string().email("올바른 이메일 주소를 입력하세요").max(255);

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email
      emailSchema.parse(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("비밀번호 재설정 이메일이 전송되었습니다!");
     
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "입력값을 확인해 주세요.");
      } else {
        toast.error(error.message || "이메일 전송 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Video Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/auth-background.mov" type="video/mp4" />
        </video>
        
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-transparent" />
        
        {/* Text Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            기관급 투자 인사이트를<br />일상에서 실현하세요.
          </h1>
          <p className="text-lg text-white/90 leading-relaxed">
            하나의 강력한 시그널과 차트로 여러분의 투자를 수익으로 전환하세요. 
            700개가 넘는 고품질 전략에 의해 백테스팅과 유니크한 지표가 있는 
            대시보드로 전환하세요.
          </p>
        </div>
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center">
                <i className={`${faIcon("lock")} icon-3xl text-primary mb-4`} />
                <h2 className="text-3xl font-bold text-foreground mb-2">암호 재설정</h2>
                <p className="text-muted-foreground">
                  가입하신 이메일 주소를 입력하시면<br />
                  비밀번호 재설정 링크를 보내드립니다.
                </p>
              </div>

              {/* 이 페이지는 이메일/비밀번호 계정 전용이다 — Google 등 소셜 계정은 애초에
                  비밀번호가 없어 여기서 재설정할 수 없다. 계정을 못 찾는다며 혼동하는
                  사용자 다수가 실은 소셜로 가입한 계정을 찾고 있는 경우라, 헤매기 전에
                  미리 안내한다. */}
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                <i className={`${faIcon("info-circle")} icon-sm mr-1.5`} />
                Google, Facebook, Apple 등 소셜 계정으로 가입하셨다면 별도의 비밀번호가 없습니다.
                이 페이지가 아닌{" "}
                <Link to="/auth" className="text-primary hover:underline">
                  로그인 화면
                </Link>
                에서 해당 소셜 버튼으로 바로 로그인해주세요.
              </div>

              {/* Reset Form */}
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                    disabled={isLoading}
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading && <i className={`${faIcon("fa-spinner")} fa-spin mr-2`} />}
                  재설정 링크 보내기
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                >
                  <i className={`${faIcon("arrow-left")} icon-sm`} />
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                  <i className={`${faIcon("check-circle")} icon-3xl text-success`} />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">이메일을 확인하세요</h2>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{email}</span>로<br />
                    비밀번호 재설정 링크를 보내드렸습니다.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <i className={`${faIcon("info-circle")} icon-sm mr-2`} />
                    이메일이 도착하지 않았나요?
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 text-left">
                    <li>• 스팸 폴더를 확인해주세요</li>
                    <li>• 입력하신 이메일 주소가 정확한지 확인해주세요</li>
                    <li>• 몇 분 정도 소요될 수 있습니다</li>
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  다른 이메일로 재전송
                </Button>

                <Link 
                  to="/auth" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                >
                  <i className={`${faIcon("arrow-left")} icon-sm`} />
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
