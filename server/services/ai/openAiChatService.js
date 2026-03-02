const OPENAI_URL = "https://api.openai.com/v1/responses";

export const canUseOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

export const generateOpenAIReply = async ({ locale = "uk", message = "", structuredPayload }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const languageRule = locale === "uk" ? "Відповідай українською." : "Reply in English.";

  const prompt = [
    "You are GreenCart AI assistant.",
    languageRule,
    "Use only facts from STRUCTURED_DATA, do not invent products or prices.",
    "Be concise and practical.",
    `USER_MESSAGE: ${message}`,
    `STRUCTURED_DATA: ${JSON.stringify(structuredPayload)}`,
  ].join("\n");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.output_text?.trim() || null;
};
