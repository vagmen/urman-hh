import { config } from "dotenv";
import axios from "axios";
import { BASE_URL, NEGOTIATION_STATUSES } from "../config";
import type {
  HHResponse,
  HHVacancy,
  HHVacanciesResponse,
  HHResumeDetails,
} from "../types/hh";
import { handlePlanfixTaskCreation } from "./planfix";
import { isResponseProcessed, saveProcessedResponse } from "./storage";

config(); // Загружаем переменные окружения сразу

// let accessToken: string = process.env.HH_ACCESS_TOKEN || "";
let accessToken = process.env.HH_ACCESS_TOKEN;
let refreshToken: string = process.env.HH_REFRESH_TOKEN || "";

async function refreshAccessToken(): Promise<boolean> {
  try {
    console.log("🔄 Начинаем обновление токена...");
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
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      "❌ Ошибка при обновлении токена:",
      axios.isAxiosError(error) ? error.response?.data : error
    );
    return false;
  }
}

async function getCompanyVacancies(): Promise<HHVacancy[]> {
  console.log("🔄 Получаем список вакансий компании...");
  try {
    const response = await axios.get<HHVacanciesResponse>(
      `${BASE_URL}/vacancies`,
      {
        params: {
          employer_id: "2487043",
          per_page: 100,
        },
        headers: {
          "HH-User-Agent": "URMAN HH API/1.0 (proekt@urman.su)",
        },
      }
    );

    if (response.status === 200) {
      console.log(
        `✅ Получено ${response.data.items.length} активных вакансий`
      );
      return response.data.items;
    }
    console.log("❌ Не удалось получить вакансии: неверный статус ответа");
    return [];
  } catch (error) {
    console.error(
      "❌ Ошибка при получении вакансий:",
      axios.isAxiosError(error) ? error.response?.data : error
    );
    return [];
  }
}

async function getResumeDetails(
  resumeId: string
): Promise<HHResumeDetails | null> {
  try {
    if (!accessToken) {
      console.log("⚠️ Отсутствует токен доступа");
      return null;
    }

    const response = await axios.get<HHResumeDetails>(
      `${BASE_URL}/resumes/${resumeId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "HH-User-Agent": "URMAN HH API/1.0 (proekt@urman.su)",
        },
      }
    );

    if (response.status === 200) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(
      "❌ Ошибка при получении деталей резюме:",
      axios.isAxiosError(error) ? error.response?.data : error
    );
    return null;
  }
}

export async function getNewResponses(): Promise<void> {
  console.log("🔄 Начинаем проверку новых откликов...");
  try {
    const vacancies = await getCompanyVacancies();

    if (!vacancies.length) {
      console.log("⚠️ Нет активных вакансий для проверки");
      return;
    }

    console.log("📋 Список активных вакансий:");
    vacancies.forEach((v) => console.log(`- ${v.name} (ID: ${v.id})`));

    for (const vacancy of vacancies) {
      console.log(`\n🔍 Проверяем отклики на вакансию: ${vacancy.name}`);

      try {
        if (!accessToken) {
          console.log("⚠️ Отсутствует токен доступа");
          return;
        }

        const authHeader = `Bearer ${accessToken}`;

        const response = await axios.get<HHResponse>(
          `${BASE_URL}/negotiations/response`,
          {
            headers: {
              Authorization: authHeader,
              "HH-User-Agent": "URMAN HH API/1.0 (proekt@urman.su)",
            },
            params: {
              status: NEGOTIATION_STATUSES.ALL.id,
              vacancy_id: vacancy.id,
              page: 0,
              per_page: 20,
              order: "asc",
            },
          }
        );

        if (response.status === 200) {
          const { items } = response.data;
          if (!items?.length) {
            console.log(`🔎 Нет новых откликов на вакансию: ${vacancy.name}`);
            continue;
          }
          console.log(`📩 Новые отклики на вакансию: ${vacancy.name}`);
          for (const item of items) {
            // Проверяем, был ли этот отклик уже обработан
            const isProcessed = await isResponseProcessed(item.id);
            if (isProcessed) {
              console.log(
                `⏭️ Пропускаем отклик от ${item.resume.first_name} ${item.resume.last_name} (уже обработан)`
              );
              continue;
            }

            const { resume } = item;
            // console.log("\n📄 Данные отклика:");
            // console.log(JSON.stringify(item, null, 2));
            // console.log("\n📄 Данные резюме:");
            // console.log(JSON.stringify(resume, null, 2));

            // Получаем детальную информацию о резюме
            const resumeDetails = await getResumeDetails(
              resume.alternate_url.split("/").pop() || ""
            );
            let phone = "";

            if (resumeDetails?.contact) {
              const phoneContact = resumeDetails.contact.find(
                (c) => c.type.id === "cell" || c.type.id === "phone"
              );

              if (phoneContact && typeof phoneContact.value === "object") {
                phone = phoneContact.value.formatted;
              }
            }

            // console.log(
            //   "resumeDetails",
            //   JSON.stringify(resumeDetails?.contact, null, 2)
            // );

            // Создаем задачу в Planfix
            try {
              // Форматируем опыт работы с датами и отраслью
              const experience =
                resume.experience
                  ?.map((exp) => {
                    const dates = `${exp.start} - ${
                      exp.end || "по настоящее время"
                    }`;
                    const industry = exp.industries?.[0]?.name || "";
                    return `${dates}: ${exp.position} в ${exp.company} (${industry})`;
                  })
                  .join("\n") || "";

              // Форматируем образование
              const education =
                resume.education?.primary
                  ?.map(
                    (edu) =>
                      `${edu.year}: ${edu.name}, ${edu.organization}, ${edu.result}`
                  )
                  .join("\n") || "";

              // Получаем общий опыт в годах
              const totalExperienceYears = Math.floor(
                (resume.total_experience?.months || 0) / 12
              );

              await handlePlanfixTaskCreation({
                name: `Отклик на вакансию: ${vacancy.name}`,
                description: `
              <h2>Информация о кандидате</h2>
              <b>${resume.first_name} ${resume.middle_name || ""} ${
                  resume.last_name
                }</b>

              <h3>Основные данные</h3>
              <ul>
                <li>🎯 Позиция: ${resume.title}</li>
                <li>📍 Локация: ${resume.area?.name || "Не указана"}</li>
                <li>👤 Возраст: ${resume.age || "Не указан"}</li>
                <li>⏳ Общий опыт: ${totalExperienceYears} лет</li>
              </ul>

              <h3>Образование</h3>
              <pre>${education}</pre>

              <h3>Опыт работы</h3>
              <pre>${experience}</pre>

              <h3>Зарплатные ожидания</h3>
              ${
                resume.salary
                  ? `<p>💰 ${resume.salary.amount} ${resume.salary.currency}</p>`
                  : `<p>❌ Зарплатные ожидания не указаны</p>`
              }

              <p><a href="${
                resume.alternate_url
              }">🔗 Открыть резюме на HH.ru</a></p>
              `.trim(),
                priority: "2. На неделе",
                contactData: {
                  name: `${resume.first_name} ${resume.middle_name || ""} ${
                    resume.last_name
                  }`,
                  position: resume.title,
                  projects: [],
                  //   projects:
                  //     resume.experience
                  //       ?.map((exp) => exp.industries?.[0]?.name)
                  //       .filter(Boolean) || [],
                  software: [],
                  otherSkills: `Опыт работы: ${totalExperienceYears} лет\nОбразование: ${
                    resume.education?.level?.name || ""
                  }`,
                  phone: phone, // Теперь у нас есть реальный телефон
                },
              });

              // После успешного создания задачи сохраняем информацию об обработанном отклике
              await saveProcessedResponse(item.id, vacancy.id);
              console.log(
                `✅ Создана задача для ${resume.first_name} ${resume.last_name}`
              );
            } catch (error) {
              console.error(`❌ Ошибка создания задачи:`, error);
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ Ошибка при получении откликов для вакансии ${vacancy.name}:`,
          axios.isAxiosError(error) ? error.response?.data : error
        );
      }
    }
    console.log("\n✅ Проверка откликов завершена");
  } catch (error) {
    console.error(
      "❌ Критическая ошибка при получении откликов:",
      axios.isAxiosError(error) ? error.response?.data : error
    );
  }
}
