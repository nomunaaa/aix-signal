/**
 * /help 문의 폼 — 본인 티켓 제출·조회 (RLS: auth.uid() = user_id).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SupportTicket } from '@/lib/support/types';

interface RawTicket {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  message: string;
  status: SupportTicket['status'];
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

function mapTicket(r: RawTicket): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    email: r.email,
    subject: r.subject,
    message: r.message,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useSupportTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setTickets([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id,user_id,email,subject,message,status,admin_note,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(((data ?? []) as RawTicket[]).map(mapTicket));
    } catch (err) {
      console.error('[useSupportTickets] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submitTicket = useCallback(
    async (subject: string, message: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: '로그인 후 이용해주세요.' };
      setSubmitting(true);
      try {
        const { error } = await supabase.from('support_tickets').insert({
          user_id: user.id,
          email: user.email ?? '',
          subject,
          message,
        });
        if (error) return { ok: false, error: error.message };
        await reload();
        return { ok: true };
      } finally {
        setSubmitting(false);
      }
    },
    [user, reload]
  );

  return { tickets, loading, submitting, submitTicket, reload };
}
