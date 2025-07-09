import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramNotification(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("⚠️ Telegram уведомления не настроены");
    return;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }
    );
    console.log("✅ Уведомление отправлено в Telegram");
  } catch (error) {
    console.error("❌ Ошибка отправки уведомления в Telegram:", error);
  }
}

export async function notifyError(
  error: Error,
  context: string
): Promise<void> {
  const message = `
🚨 <b>Ошибка в HH Bot</b>

<b>Контекст:</b> ${context}
<b>Ошибка:</b> ${error.message}
<b>Время:</b> ${new Date().toLocaleString("ru-RU")}

<i>Требуется проверка токенов или настроек</i>
  `.trim();

  await sendTelegramNotification(message);
}

export async function notifySuccess(processedCount: number): Promise<void> {
  if (processedCount === 0) return;

  const message = `
✅ <b>HH Bot - успешно</b>

Обработано новых откликов: ${processedCount}
Время: ${new Date().toLocaleString("ru-RU")}
  `.trim();

  await sendTelegramNotification(message);
}
