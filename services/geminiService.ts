
import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLanguage}. Provide only the translated text, without any additional explanations, introductions, or quotation marks: "${text}"`,
            config: {
                temperature: 0.3,
            }
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text. Please check your API key and network connection.");
    }
};
