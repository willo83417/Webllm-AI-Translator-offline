import { CreateMLCEngine, AppConfig, deleteModelAllInfoInCache, MLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";

// --- WORKER STATE & CONFIG ---

// FIX: 'CreateMLCEngine' is a factory function, not a type. The engine instance type is 'MLCEngine'.
let engine: MLCEngine | null = null;
let currentModelId: string | null = null;
let idleTimer: number | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
prebuiltAppConfig.useIndexedDBCache = true;
// --- UTILITY FUNCTIONS ---

const post = (message: { type: string, payload?: any }) => self.postMessage(message);

const unloadEngine = async () => {
    if (engine) {
        await engine.unload();
        engine = null;
        currentModelId = null;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = null;
        post({ type: 'log', payload: 'Engine unloaded.' });
    }
};

const unloadDueToIdle = () => {
    if (engine) {
        unloadEngine();
        post({ type: 'idle-unload', payload: 'Model unloaded due to inactivity.' });
    }
};

const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (engine) {
        idleTimer = self.setTimeout(unloadDueToIdle, IDLE_TIMEOUT);
    }
};

// --- CORE LOGIC ---

const initializeEngine = async (modelId: string, appConfig?: AppConfig) => {
    await unloadEngine(); // Always unload previous engine to ensure clean state

    try {
        post({ type: 'log', payload: `Initializing engine for model: ${modelId}` });
        
        // Use CreateMLCEngine as it's the recommended factory function.
        // It handles both instantiation and loading.
        engine = await CreateMLCEngine(modelId, {
            appConfig: appConfig, // if appConfig is undefined, it uses prebuilt models
            initProgressCallback: (progress) => {
                post({ type: 'progress', payload: progress });
            }
        });

        currentModelId = modelId;
        post({ type: 'loaded', payload: `Model ${modelId} loaded successfully.` });
        resetIdleTimer();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        post({ type: 'error', payload: `Failed to load model: ${message}` });
        await unloadEngine(); // Clean up on failure
    }
};


const generate = async (prompt: string, options: any) => {
    if (!engine) {
        post({ type: 'error', payload: 'Offline model is not initialized.' });
        return;
    }

    try {
        let fullText = "";
        const stream = await engine.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            presence_penalty: options.presencePenalty,
            frequency_penalty: options.frequencyPenalty,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta.content;
            if (content) {
                fullText += content;
                post({ type: 'chunk', payload: content });
            }
        }
        post({ type: 'complete', payload: fullText.trim() });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('interrupted')) {
            // This is an expected error on user cancellation, treat it as a completion of the abort.
            post({ type: 'complete', payload: '' }); // Send empty completion
        } else {
             post({ type: 'error', payload: `Generation failed: ${message}` });
        }
    } finally {
        if (engine) {
            await engine.resetChat();
        }
    }
};

const deleteCache = async (modelId: string, customModel?: { modelUrl: string, modelLibUrl: string }) => {
    if (engine && currentModelId === modelId) {
        await unloadEngine();
    }
    
    let appConfig: AppConfig | undefined = undefined;
    if (customModel) {
        // For custom models, create a specific, minimal appConfig.
        appConfig = {
            model_list: [{
                "model_id": modelId,
                "model": customModel.modelUrl,
                "model_lib": customModel.modelLibUrl,
            }],
            useIndexedDBCache: true,
        };
    } else {
        // For pre-built models, explicitly use the prebuiltAppConfig.
        appConfig = prebuiltAppConfig;
    }

    try {
        await deleteModelAllInfoInCache(modelId, appConfig);
        post({ type: 'log', payload: `Cache for ${modelId} deleted.` });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        post({ type: 'error', payload: `Failed to delete cache for ${modelId}: ${message}` });
    }
};

const clearAllCache = async (customModels: { id: string, modelUrl: string, modelLibUrl: string }[]) => {
    if (engine) {
        await unloadEngine();
    }
    try {
        // 1. Clear all pre-built models
        post({ type: 'log', payload: 'Clearing pre-built model caches...' });
        for (const model of prebuiltAppConfig.model_list) {
            await deleteModelAllInfoInCache(model.model_id, prebuiltAppConfig);
        }

        // 2. Clear all custom models
        post({ type: 'log', payload: 'Clearing custom model caches...' });
        for (const customModel of customModels) {
            const customAppConfig: AppConfig = {
                model_list: [{
                    "model_id": customModel.id,
                    "model": customModel.modelUrl,
                    "model_lib": customModel.modelLibUrl,
                }],
                useIndexedDBCache: true,
            };
            await deleteModelAllInfoInCache(customModel.id, customAppConfig);
        }
        post({ type: 'log', payload: 'All model caches cleared.' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        post({ type: 'error', payload: `Failed to clear all caches: ${message}` });
    }
};


// --- EVENT LISTENER ---

self.onmessage = async (event: MessageEvent) => {
    // Reset timer on any interaction from the main thread
    if (event.data.type !== 'unload') {
         resetIdleTimer();
    }
   
    const { type, payload } = event.data;

    switch (type) {
        case 'load':
            if (currentModelId === payload.modelId) {
                post({ type: 'loaded', payload: `Model ${payload.modelId} is already loaded.` });
                return;
            }
            // For prebuilt models, explicitly pass the prebuiltAppConfig to avoid potential
            // state conflicts after a custom model has been loaded.
            await initializeEngine(payload.modelId, prebuiltAppConfig);
            break;
        case 'load-custom': {
            const { modelId, modelUrl, modelLibUrl } = payload;
            if (currentModelId === modelId) {
                post({ type: 'loaded', payload: `Custom model ${modelId} is already loaded.` });
                return;
            }

            // For custom models, create a specific, minimal appConfig.
            const customAppConfig: AppConfig = {
                model_list: [{
                    "model_id": modelId,
                    "model": modelUrl,
                    "model_lib": modelLibUrl,
                    "overrides": {
                        "context_window_size": 4096
                    }
                }],
                useIndexedDBCache: true,
            };
            await initializeEngine(modelId, customAppConfig);
            break;
        }
        case 'generate':
            await generate(payload.prompt, payload.options);
            break;
        case 'abort':
            engine?.interruptGenerate();
            break;
        case 'unload':
            await unloadEngine();
            post({ type: 'unloaded' });
            break;
        case 'delete-cache':
            await deleteCache(payload.modelId, payload.customModel);
            break;
        case 'clear-all-cache':
            await clearAllCache(payload.customModels);
            break;
        case 'reset-timer':
            // Timer is already reset at the top of the handler.
            break;
        default:
            post({ type: 'error', payload: `Unknown command: ${type}` });
            break;
    }
};