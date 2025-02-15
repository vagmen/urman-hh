import fs from "fs/promises";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "processed_responses.json");

interface ProcessedResponses {
  responses: {
    [id: string]: {
      processedAt: string;
      vacancyId: string;
    };
  };
}

export async function loadProcessedResponses(): Promise<ProcessedResponses> {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { responses: {} };
  }
}

export async function saveProcessedResponse(
  responseId: string,
  vacancyId: string
): Promise<void> {
  const data = await loadProcessedResponses();
  data.responses[responseId] = {
    processedAt: new Date().toISOString(),
    vacancyId,
  };
  await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
}

export async function isResponseProcessed(
  responseId: string
): Promise<boolean> {
  const data = await loadProcessedResponses();
  return !!data.responses[responseId];
}
