export interface User {
  id: string;
  full_name: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Encounter {
  encountered: boolean;
  program_name?: string;
}

export interface Question {
  id: string;
  text: string;
  variants: string[];
  category: string;
  specialty?: string | null;
  program?: string | null;
  institutional_setting?: string | null;
  frequency?: string | null;
  year?: number | null;
  star: number;
  programs: string[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  encounter_count: number;
  my_rating?: number;
  my_encounter?: Encounter;
  saved: boolean;
}

export interface EncounterSummary {
  program_name: string;
  count: number;
}

export interface Comment {
  id: string;
  question_id: string;
  user_id: string;
  author_username: string;
  content: string;
  created_at: string;
  replies: Comment[];
}

export interface QuestionDetail {
  question: Question;
  comments: Comment[];
  encounters: EncounterSummary[];
}

export interface SearchResult {
  questions: Question[];
  comments: {
    id: string;
    question_id: string;
    question_text: string;
    author_username: string;
    content: string;
    created_at: string;
  }[];
}

export interface Meta {
  categories: string[];
  specialties: string[];
  programs: string[];
  institutional_settings: string[];
  frequencies: string[];
}