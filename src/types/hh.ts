export interface HHResume {
  first_name: string;
  last_name: string;
  middle_name?: string;
  title: string;
  skills: string;
  experience: Array<{
    position: string;
    company: string;
    start: string;
    end?: string;
    industries?: Array<{ name: string }>;
  }>;
  education: {
    primary: Array<{
      name: string;
      organization: string;
      year: number;
      result?: string;
    }>;
    level?: {
      name: string;
    };
  };
  salary?: {
    amount: number;
    currency: string;
  };
  contacts: Array<{
    type: string;
    value?: string;
    number?: string;
    formatted?: string;
    country?: string;
    city?: string;
  }>;
  total_experience?: {
    months: number;
  };
  area?: {
    name: string;
  };
  age?: number;
  alternate_url: string;
}

export interface HHResponseItem {
  resume: HHResume;
  created_at: string;
  id: string;
}

export interface HHResponse {
  items: HHResponseItem[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
}

export interface NegotiationStatus {
  id: string;
  name: string;
}

export interface NegotiationStatuses {
  ALL: NegotiationStatus;
  ACTIVE: NegotiationStatus;
  INVITATIONS: NegotiationStatus;
  RESPONSE: NegotiationStatus;
  DISCARD: NegotiationStatus;
  ARCHIVED: NegotiationStatus;
  NON_ARCHIVED: NegotiationStatus;
  DELETED: NegotiationStatus;
}

export interface HHVacancy {
  id: string;
  name: string;
  alternate_url: string;
  salary?: {
    from?: number;
    to?: number;
    currency?: string;
  };
  area: {
    name: string;
  };
  experience: {
    name: string;
  };
  schedule: {
    name: string;
  };
  employer: {
    name: string;
    trusted: boolean;
  };
  snippet: {
    requirement?: string;
    responsibility?: string;
  };
  archived: boolean;
  created_at: string;
  published_at: string;
  retryCount?: number;
}

export interface HHVacanciesResponse {
  items: HHVacancy[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
}

interface HHContact {
  type: {
    id: string;
    name: string;
  };
  preferred: boolean;
  verified?: boolean;
  comment?: string | null;
  need_verification?: boolean;
  value:
    | string
    | {
        country: string;
        city: string;
        number: string;
        formatted: string;
      };
}

export interface HHResumeDetails {
  last_name: string;
  first_name: string;
  middle_name: string | null;
  title: string;
  age: number;
  gender: {
    id: string;
    name: string;
  };
  salary: {
    amount: number;
    currency: string;
  } | null;
  total_experience: {
    months: number;
  } | null;
  contact: HHContact[];
  area: {
    id: string;
    name: string;
    url: string;
  };
  birth_date: string;
  citizenship: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  education: {
    level: {
      id: string;
      name: string;
    };
    primary: Array<{
      name: string;
      organization: string;
      year: number;
      result: string;
    }>;
  };
  experience: Array<{
    start: string;
    end: string | null;
    company: string;
    position: string;
    description?: string;
    industries?: Array<{
      name: string;
    }>;
  }>;
  skill_set: string[];
  alternate_url: string;
}
