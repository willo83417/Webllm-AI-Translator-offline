import type { InitProgressReport } from "@mlc-ai/web-llm";
import type { CustomOfflineModel } from "../types";
import { OFFLINE_MODELS } from '../constants';

const CACHED_MODELS_KEY = 'webllm-cached-models';

// --- Worker Communication Layer ---

let worker: Worker | null = null;
let onProgressCallback: ((progress: InitProgressReport) => void) | null = null;
let onChunkCallback: ((chunk: string) => void) | null = null;
let onCompleteCallback: ((result: string) => void) | null = null;
let onLoadedCallback: ((value: unknown) => void) | null = null;
let onErrorCallback: ((reason?: any) => void) | null = null;
let onIdleUnloadCallback: (() => void) | null = null;
let onUnloadedCallback: (() => void) | null = null;

const initializeWorker = () => {
    if (worker) return;

    worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), {
        type: 'module',
    });

    worker.onmessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        switch(type) {
            case 'progress':
                onProgressCallback?.(payload);
                break;
            case 'chunk':
                onChunkCallback?.(payload);
                break;
            case 'complete':
                onCompleteCallback?.(payload);
                // Clear callbacks for the completed stream
                onChunkCallback = null;
                onCompleteCallback = null;
                onErrorCallback = null;
                break;
            case 'loaded':
                onLoadedCallback?.(true);
                onLoadedCallback = null;
                onErrorCallback = null;
                break;
            case 'unloaded':
                onUnloadedCallback?.();
                onUnloadedCallback = null;
                onErrorCallback = null;
                break;
            case 'error':
                onErrorCallback?.(new Error(payload));
                // Clear all callbacks on error
                onProgressCallback = null;
                onChunkCallback = null;
                onCompleteCallback = null;
                onLoadedCallback = null;
                onErrorCallback = null;
                onUnloadedCallback = null;
                break;
            case 'idle-unload':
                onIdleUnloadCallback?.();
                break;
        }
    };
};

// --- Exported Service Functions ---

export const listCachedModels = (): Set<string> => {
    const cached = localStorage.getItem(CACHED_MODELS_KEY);
    return cached ? new Set(JSON.parse(cached)) : new Set();
};

export const initializeOfflineModel = (
    modelId: string,
    customModels: CustomOfflineModel[],
    onProgress: (progress: InitProgressReport) => void
): Promise<void> => {
    initializeWorker();
    onProgressCallback = onProgress;
    
    const predefinedModel = OFFLINE_MODELS.find(m => m.value === modelId);
    const userCustomModel = customModels.find(m => m.id === modelId);

    let modelToLoad: { id: string; modelUrl?: string; modelLibUrl?: string; isCustom?: boolean } | null = null;
    
    if (predefinedModel) {
        modelToLoad = {
            id: predefinedModel.value,
            modelUrl: predefinedModel.modelUrl,
            modelLibUrl: predefinedModel.modelLibUrl,
            isCustom: predefinedModel.isCustom,
        };
    } else if (userCustomModel) {
        modelToLoad = {
            id: userCustomModel.id,
            modelUrl: userCustomModel.modelUrl,
            modelLibUrl: userCustomModel.modelLibUrl,
            isCustom: true,
        };
    }

    if (modelToLoad && modelToLoad.isCustom) {
        worker?.postMessage({
            type: 'load-custom',
            payload: {
                modelId: modelToLoad.id,
                modelUrl: modelToLoad.modelUrl,
                modelLibUrl: modelToLoad.modelLibUrl,
            },
        });
    } else {
        worker?.postMessage({ type: 'load', payload: { modelId } });
    }

    return new Promise((resolve, reject) => {
        onLoadedCallback = () => {
            const cached = listCachedModels();
            cached.add(modelId);
            localStorage.setItem(CACHED_MODELS_KEY, JSON.stringify(Array.from(cached)));
            resolve();
        };
        onErrorCallback = reject;
    });
};

export const unloadOfflineModel = (): Promise<void> => {
    initializeWorker();
    return new Promise((resolve, reject) => {
        onUnloadedCallback = resolve;
        onErrorCallback = reject;
        worker?.postMessage({ type: 'unload' });
    });
};

export const deleteOfflineModel = (modelId: string, customModel?: CustomOfflineModel): Promise<void> => {
    initializeWorker();
    
    const predefinedModel = OFFLINE_MODELS.find(m => m.value === modelId);
    
    let customModelInfoForWorker;
    if (customModel) { // User-added model
        customModelInfoForWorker = customModel;
    } else if (predefinedModel && predefinedModel.isCustom) { // Pre-defined custom model
        customModelInfoForWorker = {
            id: predefinedModel.value,
            name: predefinedModel.name,
            modelUrl: predefinedModel.modelUrl!,
            modelLibUrl: predefinedModel.modelLibUrl!,
        };
    }

    worker?.postMessage({ type: 'delete-cache', payload: { modelId, customModel: customModelInfoForWorker } });
    
    const cached = listCachedModels();
    cached.delete(modelId);
    localStorage.setItem(CACHED_MODELS_KEY, JSON.stringify(Array.from(cached)));
    return Promise.resolve();
};

export const clearAllOfflineCache = (customModels: CustomOfflineModel[]): Promise<void> => {
    initializeWorker();
    worker?.postMessage({ type: 'clear-all-cache', payload: { customModels } });
    localStorage.removeItem(CACHED_MODELS_KEY);
    return Promise.resolve();
};

interface GenerationOptions {
    temperature: number;
    maxTokens: number;
    presencePenalty: number;
    frequencyPenalty: number;
}

export const translateOfflineStream = async (
    text: string, 
    sourceLang: string, 
    targetLang: string, 
    isTwoStepEnabled: boolean,
    options: GenerationOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<string> => {
    initializeWorker();

    const handleAbort = () => {
        worker?.postMessage({ type: 'abort' });
    };

    if (signal.aborted) {
        return Promise.reject(new DOMException('Translation cancelled before starting.', 'AbortError'));
    }
    
    signal.addEventListener('abort', handleAbort, { once: true });

    // Helper for streaming translation to the UI
    const _performStreamTranslation = (inputText: string, fromLang: string, toLang: string): Promise<string> => {
        const sourceInstruction = fromLang === 'auto' 
            ? 'auto-detect the source language'
            : `from ${fromLang}`;
        const prompt = `Translate the following ${sourceInstruction} text into concise ${toLang}: "${inputText}". \n Provide *only* the translated text. Do not include any additional explanations, commentary, or greetings.`;
        
        return new Promise((resolve, reject) => {
            onChunkCallback = onChunk;
            onCompleteCallback = resolve;
            onErrorCallback = reject;
            worker?.postMessage({ type: 'generate', payload: { prompt, options } });
        });
    };

    // Helper for getting a full translation result without streaming to UI
    const _performFullTranslation = (inputText: string, fromLang: string, toLang: string): Promise<string> => {
        // Fix: defined sourceInstruction inside function
        const sourceInstruction = fromLang === 'auto'
            ? 'auto-detect the source language'
            : `from ${fromLang}`;

        // Fix typos: tarn.get -> target, adaptatio -> adaptation
        const prompt =   `Translate the following ${sourceInstruction} text into ${toLang}: "${inputText}". \n Provide *only* the translated text. Do not include any additional explanations, commentary, or greetings.\n Ensure that your translation is accurate and reads naturally in the target language. Pay attention to idiomatic expressions and cultural nuances that may require adaptation and maintain the original text format.`;
        
        return new Promise((resolve, reject) => {
            onChunkCallback = null; // No UI streaming for intermediate steps
            onCompleteCallback = resolve;
            onErrorCallback = reject;
            worker?.postMessage({ type: 'generate', payload: { prompt, options } });
        });
    };

    try {
        // Updated check for language code (ja for Japanese, zh for Chinese)
        const isJpToCn = sourceLang === 'ja' && targetLang.startsWith('zh');

        if (isTwoStepEnabled && isJpToCn) {
            console.log('High-Accuracy Mode Activated: Starting two-step translation (JP -> EN -> ZH).');
            // Step 1: Translate from Japanese to English (no streaming to UI)
            console.log('Starting Step 1: Translating original Japanese to English...');
            const englishText = await _performFullTranslation(text, 'ja', 'en');
            
            // --- THIS IS THE KEY LOG YOU ASKED FOR ---
            console.log('--- Step 1 Result (Intermediate English) ---');
            console.log(englishText);
            console.log('-------------------------------------------');

            if (signal.aborted) {
                throw new DOMException('Translation cancelled by user.', 'AbortError');
            }

            if (!englishText || !englishText.trim()) {
                throw new Error('Intermediate English translation failed. The result was empty. This can happen with very short or unusual text. Try disabling High-Accuracy mode in settings.');
            }
            
            // Step 2: Translate from English to Chinese (with streaming to UI)
            console.log('Starting Step 2: Translating intermediate English to Chinese.');
            return await _performStreamTranslation(englishText, 'en', targetLang);

        } else {
            console.log('Standard Mode: Performing one-step translation.');
            // Standard one-step translation
            return await _performStreamTranslation(text, sourceLang, targetLang);
        }
    } catch (err) {
        console.error('An error occurred during the translation process:', err);
        // Re-throw the error to be handled by the caller
        throw err;
    } finally {
        // Cleanup the listener and callbacks to prevent memory leaks and race conditions
        signal.removeEventListener('abort', handleAbort);
        onChunkCallback = null;
        onCompleteCallback = null;
        onErrorCallback = null;
    }
};


export const registerOnIdleUnload = (callback: () => void) => {
    onIdleUnloadCallback = callback;
};

export const resetOfflineEngineIdleTimer = () => {
    worker?.postMessage({ type: 'reset-timer' });
};

// NOTE: These functions are not supported in offline mode with WebLLM,
// as it's a text-generation model. They are left here to throw informative errors.
export const extractTextFromImageOffline = async (imageUrl: string): Promise<string> => {
    throw new Error('Offline image processing is not supported with the current models.');
};

export const transcribeAudioOffline = async (audioUrl: string, sourceLang: string): Promise<string> => {
    throw new Error('Offline audio transcription is not supported with the current models.');
};