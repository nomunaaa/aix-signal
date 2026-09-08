// Telegram Bot API
// Функц: invite, remove, check membership, send message

import { logger } from "./logger.ts";
import { supa } from "./db.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_BOT_USERNAME = (
  Deno.env.get('TELEGRAM_BOT_USERNAME') ||
  Deno.env.get('TELEGRAM_BOT_NAME') ||
  ''
).replace(/^@/, '').trim();

export const TELEGRAM_GROUPS = {
  PRO: {
    id: parseInt(Deno.env.get('TELEGRAM_GROUP_PRO_ID') || '-1003183490140'),
    name: Deno.env.get('TELEGRAM_GROUP_PRO_NAME') || 'Ai X Signal Pro'
  },
  // LITE: {
  //   id: parseInt(Deno.env.get('TELEGRAM_GROUP_LITE_ID') || '-1003034226547'),
  //   name: Deno.env.get('TELEGRAM_GROUP_LITE_NAME') || 'Ai X Signal Lite'
  // },
  DEV: {
    id: parseInt(Deno.env.get('TELEGRAM_GROUP_DEV_ID') || '-1003321997325'),
    name: Deno.env.get('TELEGRAM_GROUP_DEV_NAME') || 'AiXSignal 개발방'
  },
  ERROR: {
    id: parseInt(Deno.env.get('TELEGRAM_GROUP_ERROR_ID') || '-5485965447'),
    name: Deno.env.get('TELEGRAM_GROUP_ERROR_NAME') || 'AiXSignal 알림방'
  }
};

if (!TELEGRAM_BOT_TOKEN) {
  logger.warn('TELEGRAM_BOT_TOKEN not configured');
}

/**
 * Subscription plan-аар Telegram group ID-г авах
 * @param subscriptionPlan - Subscription plan (pro only)
 * @returns Telegram group ID эсвэл null
 */
export function getGroupIdForSubscriptionPlan(subscriptionPlan: string | null): number | null {
  switch (subscriptionPlan) {
    case 'pro':
      return TELEGRAM_GROUPS.PRO.id;
    default:
      return null;
  }
}

/**
 * Telegram групп-ээс хэрэглэгчийг хасах
 * @param userId - Telegram хэрэглэгчийн ID
 * @param groupId - Telegram групп чат ID
 * @returns амжилттай эсэхийн статус болон алдаа мессеж
 */
export async function removeUserFromGroup(
  userId: number | string,
  groupId: number
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  try {
    // Хэрэглэгчийг group-с хасах
    const response = await fetch(`${TELEGRAM_API_URL}/kickChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userId
      })
    });

    const data = await response.json();

    if (!data.ok) {
      if (data.error_code === 400 && data.description?.includes('not found')) {
        logger.info(`User ${userId} not in group ${groupId} (already removed)`);
        return { success: true };
      }
      return { success: false, error: data.description || 'Unknown error' };
    }

    logger.info(`User ${userId} removed from group ${groupId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to remove user ${userId} from group ${groupId}:`, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Telegram group-д хэрэглэгч байгаа эсэхийг шалгах
 * @param userId - Telegram хэрэглэгчийн ID
 * @param groupId - Telegram групп чат ID
 * @returns гишүүн эсэхийн статус
 */
export async function checkUserMembership(
  userId: number | string,
  groupId: number
): Promise<{ isMember: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { isMember: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userId
      })
    });

    const data = await response.json();

    if (!data.ok) {
      if (data.error_code === 400) {
        // хэрэглэгч group-д олдоогүй
        return { isMember: false };
      }
      return { isMember: false, error: data.description || 'Unknown error' };
    }

    const status = data.result?.status;
    const isMember = status === 'member' || status === 'administrator' || status === 'creator';

    return { isMember };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error checking user ${userId} membership in group ${groupId}:`, { error: errorMessage });
    return { isMember: false, error: errorMessage };
  }
}

/**
 * Subscription-д үндэслэн Telegram group access олгох (invite link ашиглан)
 */
export async function grantTelegramAccess(
  telegramChatId: string | null,
  subscriptionPlan: string | null,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!telegramChatId) {
    return { success: false, error: 'telegram_chat_id not found' };
  }

  const groupId = getGroupIdForSubscriptionPlan(subscriptionPlan);
  if (!groupId) {
    return { success: false, error: `Subscription plan ${subscriptionPlan} not found` };
  }

  // Одоогийн гишүүнчлэлийг шалгах
  const { isMember } = await checkUserMembership(telegramChatId, groupId);
  
  if (isMember) {
    logger.info(`User ${telegramChatId} is already a member of group ${groupId}`);
    return { success: true };
  }

  // Invite link ашиглан нэмэх
  return await sendInviteLinkToUser(telegramChatId, subscriptionPlan, userId);
}

/**
 * Telegram group access-ийг хүчингүй болгох
 */
export async function revokeTelegramAccess(
  telegramChatId: string | null
): Promise<{ success: boolean; errors?: string[] }> {
  if (!telegramChatId) {
    return { success: false, errors: ['telegram_chat_id not found'] };
  }

  const errors: string[] = [];
  let allSuccess = true;

  // Pro group-с хасах.
  for (const group of [TELEGRAM_GROUPS.PRO]) {
    const result = await removeUserFromGroup(telegramChatId, group.id);
    if (!result.success && result.error) {
      errors.push(`${group.name}: ${result.error}`);
      allSuccess = false;
    }
  }

  return { success: allSuccess, errors: errors.length > 0 ? errors : undefined };
}

async function sendInviteInAppNotification(
  userId: string | undefined,
  inviteLink: string,
  groupName: string
): Promise<boolean> {
  if (!userId) {
    logger.warn('Cannot send in-app invite notification without userId');
    return false;
  }

  const botStartLink = TELEGRAM_BOT_USERNAME
    ? `\n\nBot start link: https://t.me/${TELEGRAM_BOT_USERNAME}?start=invite`
    : '';
  const message = `Telegram group invite link: ${groupName}\n\n${inviteLink}${botStartLink}`;

  const { error } = await supa
    .from('notifications')
    .insert({
      user_id: userId,
      symbol: 'TELEGRAM',
      kind: 'info',
      message,
    });

  if (error) {
    logger.error('Failed to create in-app Telegram invite notification', {
      userId,
      groupName,
      error,
    });
    return false;
  }

  logger.info('Created in-app Telegram invite notification', {
    userId,
    groupName,
  });
  return true;
}

/**
 * Хэрэглэгчийг private chat-д invite link илгээх
 * Telegram DM-ээр илгээнэ.
 */
export async function sendInviteLinkToUser(
  userTelegramId: number | string,
  subscriptionPlan: string | null,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const groupId = getGroupIdForSubscriptionPlan(subscriptionPlan);
  const group = Object.values(TELEGRAM_GROUPS).find(g => g.id === groupId);
  
  if (!groupId || !group) {
    return { success: false, error: `Group not found for plan ${subscriptionPlan}` };
  }

  try {
    // 1. UNBAN - эхлээд unban хийх
    const unbanResponse = await fetch(`${TELEGRAM_API_URL}/unbanChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        user_id: userTelegramId,
        only_if_banned: true
      })
    });

    const unbanData = await unbanResponse.json();
    if (!unbanData.ok && !unbanData.description?.includes('not found')) {
      logger.warn(`Failed to unban user ${userTelegramId} from group ${groupId}:`, { error: unbanData.description });      
    } else {
      logger.info(`Unbanned user ${userTelegramId} from group ${groupId}`);
    }

    // 2. Fresh invite link үүсгэх (10 минут хүчинтэй)
    const inviteLinkResponse = await fetch(`${TELEGRAM_API_URL}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 60 * 10 // 10 минут
      })
    });

    const inviteLinkData = await inviteLinkResponse.json();
    
    if (!inviteLinkData.ok) {
      logger.error(`Failed to create invite link for group ${groupId}:`, { error: inviteLinkData.description });
      return { success: false, error: `Failed to create invite link: ${inviteLinkData.description}` };
    }

    const inviteLink = inviteLinkData.result?.invite_link;
    if (!inviteLink) {
      logger.error(`No invite link returned for group ${groupId}`);
      return { success: false, error: 'No invite link returned' };
    }

    // Хэрэглэгчид DM илгээх
    const message = `🔗 Join ${group.name} group \n\n${inviteLink}\n\nYour subscription is active and you should have access.`;
        
    const messageResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userTelegramId,
        text: message
      })
    });

    const messageData = await messageResponse.json();
    
    if (!messageData.ok) {
      if (messageData.description?.includes("can't initiate conversation")) {
        logger.warn(`Cannot send DM to user ${userTelegramId} (user hasn't started conversation with bot).`);
        await sendInviteInAppNotification(userId, inviteLink, group.name);
        logger.info(`Invite link created for user ${userTelegramId}: ${inviteLink}`);
        return { success: true };
      }
      logger.warn(`Failed to send invite link to user ${userTelegramId}:`, { error: messageData.description });
      return { success: false, error: `Failed to send message: ${messageData.description}` };
    }

    logger.info(`Sent invite link to user ${userTelegramId} for group ${group.name}`);
    await sendInviteInAppNotification(userId, inviteLink, group.name);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error sending invite link to user ${userTelegramId}:`, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Telegram group-д мессеж илгээх
 * @param chatId - Telegram групп чат ID
 * @param message - Мессеж текст
 * @returns амжилттай эсэхийн статус
 */
export async function sendTelegramMessage(
  chatId: number,
  message: string,
  parseMode: 'HTML' | 'MarkdownV2' | 'none' = 'HTML'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    const errorMsg = 'TELEGRAM_BOT_TOKEN not configured';
    logger.error(`Error sending Telegram message to chat ${chatId}:`, { error: errorMsg });
    return false;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
    };

    if (parseMode !== 'none') {
      body.parse_mode = parseMode;
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!data.ok) {
      if (parseMode !== 'none' && data.error_code === 400 && data.description?.includes('parse')) {
        logger.warn('Telegram parse error, retrying without parse_mode...');
        
        const fallbackResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message
          }),
        });
        
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.ok) {
          logger.info(`Telegram message sent to chat ${chatId} (without HTML parse_mode)`);
          return true;
        }
      }
      
      logger.error(`Telegram API error for chat ${chatId}:`, data);
      return false;
    }

    logger.info(`Telegram message sent to chat ${chatId}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Error sending Telegram message to chat ${chatId}:`, { 
      error: errorMsg 
    });
    return false;
  }
}

/**
 * Telegram-д илгээх signal мессежийг format-лах
 */
export function formatSignalMessage(signal: { 
  symbol: string; 
  direction: string; 
  price: number; 
  type: string;
  barinterval?: string;
  entryTime?: number | null;
  exitTime?: number | null;
}): string {
  const { symbol, direction, price, type, barinterval, entryTime, exitTime } = signal;
  
  const directionText = direction.toUpperCase();
  let typeText = type.toUpperCase();
  if (type === 'partial_exit') typeText = 'PARTIAL EXIT';
  if (type === 'partial_exit_1') typeText = 'PARTIAL EXIT 1';
  if (type === 'partial_exit_2') typeText = 'PARTIAL EXIT 2';
  
  const priceText = price.toFixed(2);
  
  const domain = Deno.env.get('SITE_URL') || 'https://aixsignalpro.com';
  const chartRoute = barinterval === '10m' ? 'chart10m' : 'chart1m';
  const baseUrl = `${domain}/${chartRoute}?symbol=${symbol}`;
  
  let url = baseUrl;
  if (type === 'entry' && entryTime) {
    url = `${baseUrl}&entryTime=${entryTime}`;
  } else if ((type === 'exit' || type === 'partial_exit' || type === 'partial_exit_1' || type === 'partial_exit_2') && entryTime) {
    if (exitTime) {
      url = `${baseUrl}&entryTime=${entryTime}&exitTime=${exitTime}`;
    } else {
      url = `${baseUrl}&entryTime=${entryTime}`;
    }
  }
  
  return `${symbol} ${directionText} $${priceText} ${typeText}\n\n${url}`;
}
