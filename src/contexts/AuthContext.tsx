import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizePlanCode, type PlanCode } from "@/config/plans";
import { clearDomainAuthCookie, syncDomainSessionFromUser } from "@/lib/auth-domains/session";
import { setSimulationSyncUserId } from "@/lib/simulationStorage";

interface SubscriptionInfo {
  subscribed: boolean;
  in_trial: boolean;
  plan: PlanCode;
  product_id: string | null;
  subscription_end: string | null;
}

/**
 * DEV-ONLY: override the subscription plan from the browser without Stripe.
 * In the console run e.g. `localStorage.setItem('dev_plan_override','pro')`
 * then reload. Values: 'free' | 'pro'. Remove with
 * `localStorage.removeItem('dev_plan_override')`. No-op in production.
 */
function applyDevPlanOverride(sub: SubscriptionInfo): SubscriptionInfo {
  if (process.env.NODE_ENV === "production") return sub;
  if (typeof window === "undefined") return sub;
  const override = normalizePlanCode(window.localStorage.getItem("dev_plan_override"), sub.plan);
  if (override === sub.plan) return sub;
  return { ...sub, plan: override, subscribed: override !== "free" };
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  /** OAuth 세션은 있지만 아직 전화번호 인증(추가 정보 입력)을 마치지 않은 상태 — Header 등에서
   *  "로그인됨"으로 보여줄지 판단할 때 isAuthenticated 대신 이 값을 함께 봐야 한다. */
  phoneVerified: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  subscription: SubscriptionInfo;
  refreshSubscription: () => Promise<void>;
  refreshPhoneVerified: () => Promise<void>;
}

 
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// ✅ simple timeout helper so nothing can hang forever
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    ),
  ]) as Promise<T>;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    in_trial: false,
    plan: "free",
    product_id: null,
    subscription_end: null,
  });

  const checkSubscription = async (userSession: Session | null) => {
    if (!userSession) {
      setSubscription({
        subscribed: false,
        in_trial: false,
        plan: "free",
        product_id: null,
        subscription_end: null,
      });
      return;
    }

    // Stripe (production source of truth). Failures here must NOT skip the
    // dev profiles override below, so this has its own try/catch and no early return.
    try {
      const invokePromise = supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      // ✅ if edge function is slow/hanging, don't block app
      const { data, error } = await withTimeout(
        invokePromise,
        4000,
        "check-subscription"
      );

      if (error) {
        console.error("Error checking subscription:", error);
      } else if (data) {
        const plan = normalizePlanCode(data.plan);
        setSubscription({
          subscribed: data.subscribed ?? plan !== "free",
          in_trial: data.in_trial ?? false,
          plan,
          product_id: data.product_id ?? null,
          subscription_end: data.subscription_end ?? null,
        });
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      // ✅ keep existing subscription state if it fails
    }

    // DEV-ONLY: let public.subscriptions.plan_code drive the plan without Stripe,
    // so local test accounts can exercise paid-plan UI. Runs regardless of the
    // Stripe call outcome. Never in prod.
    if (process.env.NODE_ENV !== "production") {
      try {
        const { data: sub } = await (supabase
          .from("subscriptions")
          .select("plan_code, status, current_period_end")
          .eq("user_id", userSession.user.id)
          .maybeSingle() as any);
        const status = String(sub?.status ?? "").trim().toLowerCase();
        const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
        const isActive =
          (status === "active" || status === "trialing") &&
          (periodEnd === null || Number.isNaN(periodEnd) || periodEnd >= Date.now());
        const plan = isActive ? normalizePlanCode(sub?.plan_code) : "free";
        setSubscription((prev) => ({
          ...prev,
          plan,
          subscribed: plan !== "free",
          in_trial: isActive && status === "trialing",
          subscription_end: isActive ? sub?.current_period_end ?? null : null,
        }));
      } catch {
        /* ignore in dev */
      }
    }
  };

  const refreshSubscription = async () => {
    await checkSubscription(session);
  };

  const refreshPhoneVerified = async () => {
    await checkPhoneVerified(session);
  };

  // ✅ OAuth 세션은 있어도 아직 추가 정보 입력(전화번호 인증)을 마치지 않은 사용자를
  // Header 등에서 "로그인됨"으로 잘못 보여주지 않기 위해 별도로 추적한다.
  const checkPhoneVerified = async (userSession: Session | null) => {
    if (!userSession) {
      setPhoneVerified(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("id", userSession.user.id)
        .maybeSingle();
      setPhoneVerified(Boolean(data?.phone_verified));
    } catch {
      setPhoneVerified(false);
    }
  };

  // ✅ main auth hydration
  useEffect(() => {
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // ✅ set auth state immediately
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setSimulationSyncUserId(newSession?.user?.id ?? null);
      if (newSession?.user) {
        syncDomainSessionFromUser('member', newSession.user, 'member');
      } else {
        syncDomainSessionFromUser('member', null, 'member');
      }

      // ✅ never block loading on subscription check
      setIsLoading(false);

      // background tasks
      void checkSubscription(newSession);
      void checkPhoneVerified(newSession);

    });

    // initial session load
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSimulationSyncUserId(session?.user?.id ?? null);
        if (session?.user) {
          syncDomainSessionFromUser('member', session.user, 'member');
        } else {
          syncDomainSessionFromUser('member', null, 'member');
        }

        // ✅ release loading immediately
        setIsLoading(false);

        // ✅ background check
        void checkSubscription(session);
        void checkPhoneVerified(session);

      })
      .catch((e) => {
        console.error("[auth] getSession error:", e);
        setIsLoading(false);
      });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  // ✅ Auto-refresh subscription periodically (non-blocking)
  useEffect(() => {
    if (!session?.access_token) return;

    const interval = setInterval(() => {
      void checkSubscription(session);
    }, 60000);

    return () => clearInterval(interval);
   
  }, [session?.access_token]);

  const signOut = async () => {
    try {
      // optional: clear sb-* storage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-")) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // localStorage cleanup error is non-critical
      }

      setUser(null);
      setSession(null);
      syncDomainSessionFromUser('member', null, 'member');
      clearDomainAuthCookie();

      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.error("[auth] signOut error:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        phoneVerified,
        isLoading,
        signOut,
        subscription: applyDevPlanOverride(subscription),
        refreshSubscription,
        refreshPhoneVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

 
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
