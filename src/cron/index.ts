import cron from "node-cron";
import { getNewResponses } from "../services/hh";

export const initCronJobs = () => {
  // Проверка новых откликов каждые 5 минут
  cron.schedule("*/5 * * * *", async () => {
    console.log("🕒 Запуск проверки откликов:", new Date().toLocaleString());
    await getNewResponses();
  });

  // Здесь можно добавить другие cron-задачи
};
