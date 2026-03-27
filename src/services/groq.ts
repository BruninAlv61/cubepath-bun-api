import Groq from 'groq-sdk';

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "", // Provide fallback
});

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
