import fs from "fs";
import path from "path";

const tokenPath = path.resolve(__dirname, "../../tokens.json");

export function loadTokens(): { access_token: string; refresh_token: string } {
  try {
    console.log("📂 Загрузка файла tokens.json...");
    if (fs.existsSync(tokenPath)) {
      const data = fs.readFileSync(tokenPath, "utf-8");
      const tokens = JSON.parse(data);
      console.log("✅ Файл tokens.json загружен");
      return tokens;
    } else {
      console.log("⚠️ Файл tokens.json не найден, используем значения из .env");
      return {
        access_token: process.env.HH_ACCESS_TOKEN || "",
        refresh_token: process.env.HH_REFRESH_TOKEN || "",
      };
    }
  } catch (error) {
    console.error("❌ Ошибка при чтении токенов:", error);
    // Если файл не существует или поврежден, используем значения из .env
    return {
      access_token: process.env.HH_ACCESS_TOKEN || "",
      refresh_token: process.env.HH_REFRESH_TOKEN || "",
    };
  }
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  try {
    const data = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
    fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2), "utf-8");
    console.log("✅ Токены успешно сохранены в tokens.json");
  } catch (error) {
    console.error("❌ Ошибка при сохранении токенов:", error);
  }
}

// Проверяем, нужно ли обновить refresh token
export function checkTokenExpiry(): void {
  try {
    if (fs.existsSync(tokenPath)) {
      const data = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
      const lastModified = fs.statSync(tokenPath).mtime;
      const daysSinceUpdate =
        (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > 25) {
        console.log("⚠️ ВНИМАНИЕ: Refresh token может истечь в ближайшие дни!");
        console.log(
          `📅 Последнее обновление: ${lastModified.toLocaleDateString()}`
        );
        console.log("🔄 Рекомендуется получить новые токены через hh.ru");
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при проверке срока действия токенов:", error);
  }
}
