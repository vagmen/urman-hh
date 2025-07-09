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
  .then((result) => {
    console.log("✅ Скрипт выполнен успешно");
    // Отправляем уведомление об успехе (если есть результаты)
    notifySuccess(result?.processedCount || 0);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Критическая ошибка:", error);
    // Отправляем уведомление об ошибке
    notifyError(error, "Проверка откликов HH");
    process.exit(1);
  });
