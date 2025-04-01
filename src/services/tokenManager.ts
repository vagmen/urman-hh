import fs from "fs";
import path from "path";

const tokenPath = path.resolve(__dirname, "../../tokens.json");

export function loadTokens(): { access_token: string; refresh_token: string } {
  try {
    const raw = fs.readFileSync(tokenPath, "utf-8");
    return JSON.parse(raw);
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
