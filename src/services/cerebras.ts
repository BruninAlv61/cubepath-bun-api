import Cerebras from '@cerebras/cerebras_cloud_sdk';

export const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY || "", // Provide falback to void runtime crashes if missing temporarily
});

export const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "llama3.1-8b";
