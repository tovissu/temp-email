
import { GoogleGenAI, Type } from "@google/genai";
import { Email, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeEmail(email: Email): Promise<AnalysisResult> {
  const prompt = `Analyze this email and extract the One-Time Password (OTP) or any verification magic links. 
  Email From: ${email.from}
  Subject: ${email.subject}
  Content: ${email.body}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          otp: { type: Type.STRING, description: "The numeric or alphanumeric OTP found." },
          link: { type: Type.STRING, description: "The verification link or magic login URL." },
          summary: { type: Type.STRING, description: "A brief summary of the email's purpose." },
          isSpam: { type: Type.BOOLEAN, description: "Whether the email looks like spam." },
        },
        required: ["summary", "isSpam"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      summary: "Could not analyze email.",
      isSpam: false
    };
  }
}
