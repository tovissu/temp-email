
export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html: string;
  receivedAt: string | Date; // API often sends strings
  extractedOtp?: string;
  extractedLink?: string;
}

export interface Inbox {
  id: string;
  address: string;
  createdAt: string | Date;
  emailCount: number;
}

export interface AnalysisResult {
  otp?: string;
  link?: string;
  summary: string;
  isSpam: boolean;
}
