import { config } from "dotenv";
import { getNewResponses } from "./services/hh";
import { checkTokenExpiry } from "./services/tokenManager";

config();

// Запуск проверки откликов
console.log("🚀 Запуск сервиса проверки откликов HH");

// Проверяем срок действия токенов
checkTokenExpiry();

getNewResponses()
  .then(() => {
    console.log("✅ Скрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Критическая ошибка:", error);
    process.exit(1);
  });
