import { config } from "dotenv";
import { getNewResponses } from "./services/hh";

config();

// Запуск проверки откликов
console.log("🚀 Запуск сервиса проверки откликов HH");
getNewResponses();
