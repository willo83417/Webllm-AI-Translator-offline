// services/openaiService.ts

export const translateTextStream = async (
    text: string,
    sourceLang: string,
    targetLang: string,
    apiKey: string,
    modelName: string,
    apiUrl: string,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<string> => {
    if (!apiKey) throw new Error('OpenAI API Key is not set.');
    if (!modelName) throw new Error('Model Name is not configured.');
    if (!apiUrl) throw new Error('OpenAI API URL is not set.');

    const sourceLanguageInstruction = sourceLang === 'Auto Detect'
        ? 'First, auto-detect the source language of the following text.'
        : `The source language is ${sourceLang}.`;

    const systemPrompt = `${sourceLanguageInstruction} Then, translate the text to ${targetLang}. Do not add any extra explanations, comments, or annotations. Return only the translated text.`;

    try {
        const response = await fetch(`${apiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text },
                ],
                temperature: 1.0,
                stream: true, // Enable streaming
            }),
            signal, // Pass the AbortSignal to the fetch request
        });

        if (!response.ok) {
            // If the request was aborted, it might not have a JSON body.
            if (signal.aborted) {
                 throw new DOMException('Request aborted by user', 'AbortError');
            }
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `OpenAI API request failed with status ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Response body is null, cannot stream.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

            for (const line of lines) {
                const jsonString = line.replace(/^data: /, '').trim();
                if (jsonString === '[DONE]') {
                    break;
                }
                try {
                    const parsed = JSON.parse(jsonString);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        onChunk(content);
                    }
                } catch (e) {
                    // Ignore empty or invalid JSON chunks which can happen in streams
                }
            }
        }
        
        return fullText.trim();

    } catch (error) {
        console.error('Error translating text with OpenAI:', error);
        if (error instanceof Error) {
            // Re-throw AbortError to be handled gracefully in the UI
            if (error.name === 'AbortError') {
                throw error;
            }
        }
        throw new Error('OpenAI API request failed.');
    }
};

export const translateImage = async (
    imageDataUrl: string,
    targetLang: string,
    apiKey: string,
    modelName: string,
    apiUrl: string
): Promise<{ sourceText: string, translatedText: string }> => {
    if (!apiKey) throw new Error('OpenAI API Key is not set.');
    if (!apiUrl) throw new Error('OpenAI API URL is not set.');

    // The OpenAI API for vision requires the image data to be in a data URL format.
    // This validation ensures the input is a valid base64-encoded image string before sending it.
    if (!imageDataUrl.startsWith('data:image/') || !imageDataUrl.includes(';base64,')) {
        throw new Error('Invalid image data URL format. It must be a base64 encoded image data URL.');
    }

    const prompt = `1. First, accurately extract all text from the provided image.
2. Then, translate the extracted text into ${targetLang}.
3. Finally, return a single JSON object with two keys: "sourceText" containing the exact extracted text, and "translatedText" containing the translation. Do not include any other explanations, markdown formatting, or code fences.`;

    try {
        const response = await fetch(`${apiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 2048,
                response_format: { type: "json_object" },
                stream: false, // Explicitly disable streaming
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `OpenAI API image request failed with status ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No content in OpenAI API response.');
        }

        const result = JSON.parse(content);
        if (typeof result.sourceText === 'string' && typeof result.translatedText === 'string') {
            return result;
        } else {
            throw new Error('Invalid JSON structure in API response.');
        }

    } catch (error) {
        console.error('Error translating image with OpenAI:', error);
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse the response from the OpenAI API. The response was not valid JSON.');
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('OpenAI API request for image translation failed.');
    }
};