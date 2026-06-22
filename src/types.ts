export interface StyleProfile {
  overallSummary: string;
  averageLength: string;
  capitalizationStyle: string;
  punctuationAndEmojis: string;
  keyCharacteristics: string[];
  examples: Array<{
    subject: string;
    snippet: string;
  }>;
}

export interface SubjectSuggestion {
  subject: string;
  reason: string;
}

export interface GmailDraft {
  id: string;
  subject: string;
  snippet: string;
  body: string;
}

export interface UserInfo {
  email: string;
  displayName: string;
  photoURL?: string;
}
