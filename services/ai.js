/**
 * AI Service Module for JobHunt
 * Handles integration with Google Gemini API for CV/Resume & Vacancy text polishing.
 */

const RESUME_SYSTEM_INSTRUCTION = `You are a professional CV and resume editor.

Correct spelling, grammar, punctuation and awkward sentence structures in the user's text.
Improve the text so it sounds professional and appropriate for a CV/resume.

IMPORTANT RULES:
* Preserve the original meaning.
* Do not add information that the user did not provide.
* Do not invent experience, skills, companies, dates, education or achievements.
* Do not change factual information.
* Keep the original language (Uzbek, Russian, or English).
* Do not translate unless explicitly requested.
* Return only the improved text without explanations.`;

const VACANCY_SYSTEM_INSTRUCTION = `You are a professional HR recruiter and job posting editor.

Correct spelling, grammar, punctuation and structure in the job vacancy text.
Make it sound attractive, clear, professional and structured for job seekers.

IMPORTANT RULES:
* Preserve the original requirements, responsibilities, salary, and contact info.
* Do not add fake requirements or invent benefits not present in the original.
* Keep bullet points clean and structured.
* Keep the original language (Uzbek, Russian, or English).
* Return only the improved text without explanations.`;

const { getSetting } = require('../database/db');

/**
 * Sends prompt and text to Gemini API.
 * @param {string} text 
 * @param {string} systemInstruction 
 * @returns {Promise<string>}
 */
async function callGeminiApi(text, systemInstruction) {
  const apiKey = (process.env.GEMINI_API_KEY || getSetting('gemini_api_key') || '').trim();
  const primaryModel = (process.env.GEMINI_MODEL || getSetting('gemini_model') || 'gemini-3.5-flash-lite').trim();

  if (!apiKey) {
    throw new Error('Serverda GEMINI_API_KEY sozlanmagan. Iltimos, .env fayliga GEMINI_API_KEY kiriting yoki Admin paneldan API kalitni kiriting.');
  }

  // Model fallback chain: try primaryModel first, then alternative v3 models
  const modelsToTry = Array.from(new Set([primaryModel, 'gemini-3.5-flash-lite', 'gemini-3.8-flash']));

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ],
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          return candidateText.trim();
        }
      }

      const errorBody = await response.json().catch(() => ({}));
      lastErrorMsg = errorBody?.error?.message || `Gemini API request failed with status ${response.status}`;
      console.warn(`[AI Model ${model} Warning]:`, lastErrorMsg);
    } catch (err) {
      lastErrorMsg = err.message;
      console.warn(`[AI Model ${model} Fetch Error]:`, err.message);
    }
  }

  throw new Error(lastErrorMsg || 'AI matnni qayta ishlashda xatolik yuz berdi.');
}

/**
 * Improves user resume text using Gemini API.
 * @param {string} text - User's resume text.
 * @returns {Promise<string>} - Improved text.
 */
async function improveResumeText(text) {
  return callGeminiApi(text, RESUME_SYSTEM_INSTRUCTION);
}

/**
 * Improves HR vacancy text using Gemini API.
 * @param {string} text - Vacancy text.
 * @returns {Promise<string>} - Improved text.
 */
async function improveVacancyText(text) {
  return callGeminiApi(text, VACANCY_SYSTEM_INSTRUCTION);
}

module.exports = {
  improveResumeText,
  improveVacancyText
};
