'use client';

import { useState } from "react";
import { useNavigate } from "@/lib/navigation-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { faIcon } from "@/lib/fontawesome";
import { z } from "zod";

// Validation schema
const passwordSchema = z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다").max(100);

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords
      passwordSchema.parse(password);
      
      if (password !== confirmPassword) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("비밀번호가 성공적으로 변경되었습니다!");
      navigate("/auth");
     
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "입력값을 확인해 주세요.");
      } else {
        toast.error(error.message || "비밀번호 변경 중 오류가 발생했습니다.");
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

      {/* Right Side - New Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <i className={`${faIcon("key")} icon-3xl text-primary mb-4`} />
            <h2 className="text-3xl font-bold text-foreground mb-2">새 비밀번호 설정</h2>
            <p className="text-muted-foreground">
              새로운 비밀번호를 입력하세요
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <Label htmlFor="password">새 비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              비밀번호 변경
            </Button>
          </form>

          {/* Password Requirements */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              <i className={`${faIcon("shield-check")} icon-sm mr-2`} />
              비밀번호 요구사항
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 최소 6자 이상</li>
              <li>• 영문, 숫자, 특수문자 조합 권장</li>
              <li>• 이전 비밀번호와 다르게 설정</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
