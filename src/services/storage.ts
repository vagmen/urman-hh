import fs from "fs";
import path from "path";

const STORAGE_FILE = path.resolve(__dirname, "../../processed_responses.json");

interface ProcessedResponse {
  processedAt: string;
  vacancyId: string;
}

interface Storage {
  responses: {
    [key: string]: ProcessedResponse;
  };
}

// Загружаем данные из файла
function loadStorage(): Storage {
  try {
    console.log("📂 Загрузка файла processed_responses.json...");
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      const storage = JSON.parse(data);
      console.log(
        `✅ Файл загружен, найдено ${
          Object.keys(storage.responses).length
        } обработанных откликов`
      );
      return storage;
    } else {
      console.log("⚠️ Файл processed_responses.json не найден, создаем новый");
      return { responses: {} };
    }
  } catch (error) {
    console.error("❌ Ошибка при загрузке файла:", error);
    return { responses: {} };
  }
}

// Сохраняем данные в файл
function saveStorage(storage: Storage): void {
  try {
    console.log("💾 Сохранение в файл processed_responses.json...");
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    console.log("✅ Файл успешно сохранен");
  } catch (error) {
    console.error("❌ Ошибка при сохранении файла:", error);
  }
}

// Проверяем, был ли отклик уже обработан
export async function isResponseProcessed(
  responseId: string
): Promise<boolean> {
  const storage = loadStorage();
  const isProcessed = !!storage.responses[responseId];
  console.log(
    isProcessed
      ? `✅ Отклик ${responseId} уже обработан`
      : `❌ Отклик ${responseId} еще не обработан`
  );
  return isProcessed;
}

// Сохраняем информацию об обработанном отклике
export async function saveProcessedResponse(
  responseId: string,
  vacancyId: string
): Promise<void> {
  const storage = loadStorage();
  storage.responses[responseId] = {
    processedAt: new Date().toISOString(),
    vacancyId,
  };
  saveStorage(storage);
  console.log(`✅ Сохранена информация об отклике ${responseId}`);
}
