
import { GoogleGenAI, Type } from "@google/genai";
import { ItemType } from "../types";

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

export interface AIGeneratedOrganization {
    category: string;
    tags: string[];
    title: string;
}

export const analyzeContentForOrganization = async (
    content: string, 
    type: ItemType,
    categories: string[]
): Promise<AIGeneratedOrganization> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }
    
    const categoryList = categories.join(', ');
    const basePrompt = `Analyze the following content and suggest an appropriate organization for it.
- Suggest one category from this list: [${categoryList}]. If none are suitable, suggest a new, concise category name.
- Generate up to 5 relevant keyword tags.
- Generate a short, descriptive title (5-10 words).
`;

    const parts = [];

    if (type === ItemType.Image) {
        const [header, base64Data] = content.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        
        parts.push({
            inlineData: {
                mimeType,
                data: base64Data,
            }
        });
        parts.push({ text: `${basePrompt}\nDescribe the image for the title and generate relevant tags and a category.` });
    } else {
        parts.push({ text: `${basePrompt}\nContent to analyze: "${content.substring(0, 500)}..."` }); // Truncate for safety
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        tags: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        title: { type: Type.STRING }
                    },
                    required: ["category", "tags", "title"]
                },
                temperature: 0.2,
            }
        });
        
        const parsed = JSON.parse(response.text.trim()) as AIGeneratedOrganization;
        return parsed;

    } catch (error) {
        console.error("Error analyzing content:", error);
        throw new Error("Failed to analyze content with AI.");
    }
};