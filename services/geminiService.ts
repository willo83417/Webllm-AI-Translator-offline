

import { GoogleGenAI, Type } from "@google/genai";

export const translateTextStream = async (
    text: string, 
    sourceLang: string, 
    targetLang: string, 
    apiKey: string,
    modelName: string,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<string> => {
    
    if (!apiKey) {
        throw new Error('API Key is not set. Please add it in the settings.');
    }
    if (!modelName) {
        throw new Error('Model Name is not configured. Please add it in the settings.');
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        const sourceLanguageInstruction = sourceLang === 'Auto Detect'
            ? 'First, auto-detect the source language of the following text.'
            : `The source language is ${sourceLang}.`;
        
        const systemInstruction = `${sourceLanguageInstruction} Then, translate the text to ${targetLang}.
Do not add any extra explanations, comments, or annotations. Return only the translated text.`;

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: text,
            config: {
                systemInstruction,
                // Disable thinking for faster, lower-latency translation
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        
        let fullText = '';
        for await (const chunk of responseStream) {
            if (signal.aborted) {
                throw new DOMException('Translation cancelled by user.', 'AbortError');
            }
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                onChunk(chunkText);
            }
        }
        return fullText.trim();

    } catch (error) {
        console.error('Error translating text:', error);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        throw new Error('Gemini API request failed.');
    }
};

export const translateImage = async (
    imageDataUrl: string,
    targetLang: string,
    apiKey: string,
    modelName: string
): Promise<{ sourceText: string, translatedText: string }> => {
    if (!apiKey) {
        throw new Error('API Key is not set. Please add it in the settings.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid image data URL format.');
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Data,
        },
    };

    const textPart = {
        text: `1. First, accurately extract all text from the provided image.
2. Then, translate the extracted text into ${targetLang}.
3. Finally, return a single JSON object with two keys: "sourceText" containing the exact extracted text, and "translatedText" containing the translation. Do not include any other explanations or markdown formatting.`,
    };

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sourceText: {
                            type: Type.STRING,
                            description: 'The text extracted from the image.'
                        },
                        translatedText: {
                            type: Type.STRING,
                            description: 'The translated text.'
                        },
                    },
                    required: ["sourceText", "translatedText"],
                },
            },
        });
        
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        if (typeof result.sourceText === 'string' && typeof result.translatedText === 'string') {
            return result;
        } else {
            throw new Error('Invalid JSON structure in API response.');
        }

    } catch (error) {
        console.error('Error translating image:', error);
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse the response from the Gemini API. The response was not valid JSON.');
        }
        throw new Error('Gemini API request for image translation failed.');
    }
};

const toBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

export const transcribeAudioGemini = async (
    audioBlob: Blob,
    language: string,
    apiKey: string,
    modelName: string,
    signal: AbortSignal
): Promise<string> => {
    if (!apiKey) throw new Error('API Key is not set.');
    if (!modelName) throw new Error('Model Name is not configured.');

    try {
        const ai = new GoogleGenAI({ apiKey });
        const base64Audio = await toBase64(audioBlob);

        const audioPart = {
            inlineData: {
                mimeType: audioBlob.type,
                data: base64Audio,
            },
        };
        const langInstruction = language === 'Auto Detect' 
            ? 'auto-detect the language and transcribe the speech' 
            : `transcribe the speech in ${language}`;
            
        const textPart = {
            text: `Please ${langInstruction}. Return ONLY the transcribed text, with no extra formatting, commentary, or any other text.`,
        };

        // Note: AbortSignal is not directly supported in the generateContent method of the SDK yet.
        // The request will run to completion on the server side even if the user navigates away.
        const response = await ai.models.generateContent({
             model: modelName,
             contents: { parts: [textPart, audioPart] },
        });
        
        if (signal.aborted) {
            throw new DOMException('Request aborted by user', 'AbortError');
        }

        return response.text.trim();

    } catch (error) {
        console.error('Error transcribing audio with Gemini:', error);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        throw new Error('Gemini API audio transcription request failed.');
    }
};
