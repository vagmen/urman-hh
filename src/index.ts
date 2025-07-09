import { config } from "dotenv";
import { getNewResponses } from "./services/hh";
import { checkTokenExpiry } from "./services/tokenManager";
import { notifyError, notifySuccess } from "./services/notifications";

config();

// Запуск проверки откликов
console.log("🚀 Запуск сервиса проверки откликов HH");

// Проверяем срок действия токенов
checkTokenExpiry();

getNewResponses()
  .then(async (result) => {
    console.log("✅ Скрипт выполнен успешно");
    // Отправляем уведомление об успехе (если есть результаты)
    try {
      await notifySuccess(result?.processedCount || 0);
      console.log("📱 Уведомление об успехе отправлено");
    } catch (notifyErr) {
      console.error("❌ Ошибка отправки уведомления:", notifyErr);
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Критическая ошибка:", error);
    // Отправляем уведомление об ошибке
    try {
      await notifyError(error, "Проверка откликов HH");
      console.log("📱 Уведомление об ошибке отправлено");
    } catch (notifyErr) {
      console.error("❌ Ошибка отправки уведомления:", notifyErr);
    }
    process.exit(1);
  });
