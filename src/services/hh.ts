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
import { loadTokens, saveTokens } from "./tokenManager";

config(); // Загружаем переменные окружения сразу

let { access_token: accessToken, refresh_token: refreshToken } = loadTokens();

async function refreshAccessToken(): Promise<boolean> {
  try {
    console.log("🔄 Начинаем обновление токена...");
    console.log(`📝 Client ID: ${process.env.HH_CLIENT_ID ? "есть" : "отсутствует"}`);
    console.log(`📝 Client Secret: ${process.env.HH_CLIENT_SECRET ? "есть" : "отсутствует"}`);
    console.log(`📝 Refresh Token: ${refreshToken ? "есть" : "отсутствует"}`);
    console.log(`📝 Refresh Token (первые 10 символов): ${refreshToken ? refreshToken.substring(0, 10) + "..." : "отсутствует"}`);
    
    const response = await axios.post("https://hh.ru/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        client_id: process.env.HH_CLIENT_ID,
        client_secret: process.env.HH_CLIENT_SECRET,
        refresh_token: refreshToken,
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
    });

    console.log("📡 Ответ от API:", response.status);
    console.log("📡 Данные ответа:", JSON.stringify(response.data, null, 2));
    
    if (response.data.access_token) {
      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      
      // Сохраняем токены в файл
      saveTokens(accessToken, refreshToken);
      
      console.log("✅ Токен успешно обновлён!");
      console.log(`📝 Новый Access Token (первые 10 символов): ${accessToken.substring(0, 10)}...`);
      console.log(`📝 Новый Refresh Token (первые 10 символов): ${refreshToken.substring(0, 10)}...`);
      return true;
    }
    console.log("❌ В ответе нет access_token");
    return false;
  } catch (error) {
    console.error("❌ Ошибка при обновлении токена:");
    if (axios.isAxiosError(error)) {
      console.error("Статус:", error.response?.status);
      console.error("Данные ошибки:", JSON.stringify(error.response?.data, null, 2));
    } else {
      console.error(error);
    }
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log("🔄 Токен истёк, обновляем...");
      const tokenRefreshed = await refreshAccessToken();
      if (tokenRefreshed) {
        // Повторяем запрос с новым токеном
        console.log("🔄 Повторяем запрос с новым токеном...");
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
      }
    }
    console.error(
      "❌ Ошибка при получении деталей резюме:",
      axios.isAxiosError(error) ? error.response?.data : error
    );
    return null;
  }
}

async function checkAndRefreshToken(): Promise<boolean> {
  console.log("🔍 Проверяем токены...");
  console.log(`📝 Access token: ${accessToken ? "есть" : "отсутствует"}`);
  console.log(`📝 Refresh token: ${refreshToken ? "есть" : "отсутствует"}`);
  
  if (!accessToken) {
    console.log("⚠️ Отсутствует токен доступа");
    return false;
  }

  try {
    console.log("🔍 Проверяем токен через API...");
    // Проверяем токен через запрос к вакансиям (не требует специальных прав)
    await axios.get(`${BASE_URL}/vacancies`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
      params: {
        per_page: 1,
      },
    });
    console.log("✅ Токен валиден!");
    return true;
  } catch (error) {
    console.log("❌ Токен невалиден, ошибка:", axios.isAxiosError(error) ? error.response?.status : error);
    
    // Пытаемся обновить токен при любых ошибках авторизации
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      console.log("🔄 Токен истёк или нет прав, обновляем...");
      return await refreshAccessToken();
    }
    return false;
  }
}

export async function getNewResponses(): Promise<{ processedCount: number }> {
  console.log("🔄 Начинаем проверку новых откликов...");

  // Проверяем наличие токенов
  if (!accessToken || !refreshToken) {
    throw new Error("Отсутствуют необходимые токены для работы с API hh.ru");
  }

  // Проверяем и обновляем токен перед началом работы
  const isTokenValid = await checkAndRefreshToken();
  if (!isTokenValid) {
    throw new Error(
      "Не удалось получить валидный токен для работы с API hh.ru"
    );
  }

  const vacancies = await getCompanyVacancies();

  if (!vacancies.length) {
    console.log("⚠️ Нет активных вакансий для проверки");
    return { processedCount: 0 };
  }

  console.log("📋 Список активных вакансий:");
  vacancies.forEach((v) => console.log(`- ${v.name} (ID: ${v.id})`));

  let processedCount = 0;

  for (const vacancy of vacancies) {
    console.log(`\n🔍 Проверяем отклики на вакансию: ${vacancy.name}`);

    try {
      if (!accessToken) {
        throw new Error("Отсутствует токен доступа");
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

            const isRemoteWork =
              vacancy.schedule?.id === "remote" ||
              vacancy.work_format?.some((format) => format.id === "REMOTE");

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
              <li>💻 Формат работы: ${
                isRemoteWork ? "Удаленная работа" : "Офис"
              }</li>
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
              isRemote: isRemoteWork,
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
            processedCount++;
          } catch (error) {
            console.error(`❌ Ошибка создания задачи:`, error);
          }
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("🔄 Токен истёк, обновляем...");
        const tokenRefreshed = await refreshAccessToken();
        if (tokenRefreshed) {
          // Повторяем запрос с новым токеном
          console.log("🔄 Повторяем запрос с новым токеном...");
          const response = await axios.get<HHResponse>(
            `${BASE_URL}/negotiations/response`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
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

                const isRemoteWork =
                  vacancy.schedule?.id === "remote" ||
                  vacancy.work_format?.some((format) => format.id === "REMOTE");

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
                  <li>💻 Формат работы: ${
                    isRemoteWork ? "Удаленная работа" : "Офис"
                  }</li>
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
                  isRemote: isRemoteWork,
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
                processedCount++;
              } catch (error) {
                console.error(`❌ Ошибка создания задачи:`, error);
              }
            }
          }
        } else {
          console.log("❌ Не удалось обновить токен, пропускаем вакансию");
        }
      } else {
        console.error(
          `❌ Ошибка при получении откликов для вакансии ${vacancy.name}:`,
          axios.isAxiosError(error) ? error.response?.data : error
        );
      }
    }
  }

  console.log("✅ Проверка откликов завершена");
  return { processedCount };
}
