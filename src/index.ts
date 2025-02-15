import { config } from "dotenv";
import { initCronJobs } from "./cron";
import { getNewResponses } from "./services/hh";

config();

// Инициализация cron-задач
initCronJobs();

// Первый запуск
console.log("🚀 Запуск сервиса проверки откликов HH");
getNewResponses();
