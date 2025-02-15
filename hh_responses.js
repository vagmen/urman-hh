require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");

const BASE_URL = "https://api.hh.ru";
let accessToken = process.env.HH_ACCESS_TOKEN;
let refreshToken = process.env.HH_REFRESH_TOKEN;

const VACANCY_1_ID = "116135302";
const VACANCY_2_ID = "115988353";
const VACANCY_3_ID = "116877298";

const NEGOTIATION_STATUSES = {
  ALL: {
    id: "all",
    name: "Все",
  },
  ACTIVE: {
    id: "active",
    name: "Активные",
  },
  INVITATIONS: {
    id: "invitations",
    name: "Активные приглашения",
  },
  RESPONSE: {
    id: "response",
    name: "Активные отклики",
  },
  DISCARD: {
    id: "discard",
    name: "Отказ",
  },
  ARCHIVED: {
    id: "archived",
    name: "Архивированные",
  },
  NON_ARCHIVED: {
    id: "non_archived",
    name: "Все, кроме архивированных",
  },
  DELETED: {
    id: "deleted",
    name: "Скрытые",
  },
};

// Функция для обновления токена
async function refreshAccessToken() {
  try {
    const response = await axios.post("https://hh.ru/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        client_id: process.env.HH_CLIENT_ID,
        client_secret: process.env.HH_CLIENT_SECRET,
        refresh_token: refreshToken,
      },
    });

    if (response.data.access_token) {
      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      console.log("✅ Токен успешно обновлён!");
    }
  } catch (error) {
    console.error(
      "❌ Ошибка при обновлении токена:",
      error.response?.data || error.message
    );
  }
}

// Функция для получения откликов
async function getNewResponses() {
  try {
    // const response = await axios.get(`${BASE_URL}/negotiations/all`, {
    const response = await axios.get(`${BASE_URL}/negotiations/response`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "HH-User-Agent": "URMAN HH API/1.0 (proekt@urman.su)",
      },
      params: {
        status: NEGOTIATION_STATUSES.ALL.id,
        vacancy_id: VACANCY_2_ID,
        page: 0,
        per_page: 20,
        order: "asc",
      },
    });

    if (response.status === 200) {
      const items = response.data.items;
      console.log(response.data.items);

      if (!items) {
        console.log("🔎 Пока нет новых откликов...");
      } else if (items.length === 0) {
        console.log("🔎 Пока нет новых откликов...");
      } else {
        console.log("📩 Новые отклики:");
        items.forEach((item) => {
          console.log(
            `- ${item.resume.first_name} ${item.resume.last_name} (Резюме: ${item.resume.title})`
          );
        });
      }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("🔄 Токен истёк, обновляем...");
      await refreshAccessToken();
      await getNewResponses();
    } else {
      console.error(
        "❌ Ошибка при получении откликов:",
        error.response?.data || error.message
      );
    }
  }
}

// Добавляем cron-задачу
cron.schedule("*/5 * * * *", async () => {
  console.log("🕒 Запуск проверки откликов:", new Date().toLocaleString());
  await getNewResponses();
});

// Запускаем первую проверку сразу
console.log("🚀 Запуск сервиса проверки откликов HH");
getNewResponses();
