export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SUPPORT_TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: '대기',
  in_progress: '처리중',
  resolved: '완료',
};
