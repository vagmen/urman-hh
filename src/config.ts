export const BASE_URL = "https://api.hh.ru";

export const VACANCY_IDS = {
  VACANCY_1: "116135302",
  VACANCY_2: "115988353",
  VACANCY_3: "116877298",
} as const;

export const NEGOTIATION_STATUSES = {
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
} as const;
