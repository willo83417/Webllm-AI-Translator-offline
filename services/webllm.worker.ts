
import { CreateMLCEngine, AppConfig, deleteModelAllInfoInCache, MLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";

// --- WORKER STATE & CONFIG ---

let engine: MLCEngine | null = null;
let currentModelId: string | null = null;
let idleTimer: number | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// OPTIMIZATION: Use Cache API (false) for faster I/O on mobile compared to IndexedDB (true)
prebuiltAppConfig.useIndexedDBCache = false;

// --- UTILITY FUNCTIONS ---

const post = (message: { type: string, payload?: any }) => self.postMessage(message);

post({ type: 'log', payload: 'WebLLM worker started.' });

// Check WebGPU support
let hasF16Support = false;

const checkGPUSupport = async () => {
    if (!('gpu' in self.navigator)) {
        post({ type: 'log', payload: 'WebGPU is not supported. Falling back to WebGL/WASM.' });
        return;
    }

    try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
            hasF16Support = adapter.features.has('shader-f16');
            const info = `GPU: ${adapter.info.vendor} ${adapter.info.architecture || ''}`;
            post({ type: 'log', payload: `${info}. F16 Shader Support: ${hasF16Support ? 'YES (Enabled)' : 'NO (Using F32)'}` });
        } else {
            post({ type: 'log', payload: 'WebGPU Adapter not found.' });
        }
    } catch (e) {
        console.warn("Error checking GPU features:", e);
    }
};

// Perform check immediately on worker start
checkGPUSupport();

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
    await unloadEngine();

    try {
        post({ type: 'log', payload: `Initializing engine for model: ${modelId}` });
        
        // Re-check GPU support to ensure we have the latest flag before config
        if (!hasF16Support && 'gpu' in self.navigator) {
             await checkGPUSupport();
        }

        const baseConfig = appConfig || prebuiltAppConfig;
        
        // DYNAMIC CONFIGURATION:
        // 1. Force context_window_size to 2048 for VRAM savings.
        // 2. Inject 'required_features': ["shader-f16"] if hardware supports it.
        //    This forces WebLLM to request a device with F16 enabled.
        const optimizedConfig: AppConfig = {
            ...baseConfig,
            useIndexedDBCache: false,
            model_list: baseConfig.model_list.map(m => {
                const isTargetModel = m.model_id === modelId;
                
                // Prepare requirements array
                const requiredFeatures = m.required_features ? [...m.required_features] : [];
                if (hasF16Support && !requiredFeatures.includes("shader-f16")) {
                    requiredFeatures.push("shader-f16");
                }

                if (isTargetModel) {
                    return {
                        ...m,
                        required_features: requiredFeatures,
                        overrides: {
                            ...m.overrides,
                            context_window_size: 2048, 
                        }
                    };
                }
                
                // Also update other models in the list just in case, consistent config is better
                return {
                    ...m,
                    required_features: requiredFeatures
                };
            })
        };

        console.time("EngineInitialization");
        
        engine = await CreateMLCEngine(modelId, {
            appConfig: optimizedConfig,
            logLevel: "WARN",
            initProgressCallback: (progress) => {
                post({ type: 'progress', payload: progress });
            }
        });
        
        console.timeEnd("EngineInitialization");

        currentModelId = modelId;
        post({ type: 'loaded', payload: `Model ${modelId} loaded successfully.` });
        resetIdleTimer();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        post({ type: 'error', payload: `Failed to load model: ${message}` });
        await unloadEngine();
    }
};


const generate = async (prompt: string, options: any) => {
    if (!engine) {
        post({ type: 'error', payload: 'Offline model is not initialized.' });
        return;
    }

    try {
        let fullText = "";
        const tStart = performance.now();
        let tFirstToken = 0;
        
        const stream = await engine.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            stream_options: { include_usage: true },
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            presence_penalty: options.presencePenalty,
            frequency_penalty: options.frequencyPenalty,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta.content;
            
            if (!tFirstToken && content) {
                tFirstToken = performance.now();
            }

            if (content) {
                fullText += content;
                post({ type: 'chunk', payload: content });
            }
            
            if (chunk.usage) {
                const tEnd = performance.now();
                const usage = chunk.usage;
                
                const prefillTimeSec = (tFirstToken - tStart) / 1000;
                const decodeTimeSec = (tEnd - tFirstToken) / 1000;

                const prefillSpeed = prefillTimeSec > 0 ? (usage.prompt_tokens / prefillTimeSec) : 0;
                const decodeSpeed = decodeTimeSec > 0 ? (usage.completion_tokens / decodeTimeSec) : 0;

                post({ 
                    type: 'stats', 
                    payload: `prefill: ${prefillSpeed.toFixed(4)} tok/s, decoding: ${decodeSpeed.toFixed(4)} tok/s (Prompt: ${usage.prompt_tokens} / Gen: ${usage.completion_tokens}) [F16: ${hasF16Support ? 'ON' : 'OFF'}]`
                });
            }
        }

        post({ type: 'complete', payload: fullText.trim() });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('interrupted')) {
            post({ type: 'complete', payload: '' });
        } else {
             post({ type: 'error', payload: `Generation failed: ${message}` });
        }
    } finally {
        if (engine) {
            await engine.resetChat();
        }
    }
};

const deleteFromCacheAPI = async (modelUrlPart: string) => {
    try {
        if ('caches' in self) {
            const cacheKeys = await self.caches.keys();
            for (const key of cacheKeys) {
                const cache = await self.caches.open(key);
                const requests = await cache.keys();
                for (const request of requests) {
                    if (request.url.includes(modelUrlPart)) {
                        await cache.delete(request);
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Error attempting to clear Cache API:", e);
    }
}

const deleteCache = async (modelId: string, customModel?: { modelUrl: string, modelLibUrl: string }) => {
    if (engine && currentModelId === modelId) {
        await unloadEngine();
    }
    
    let appConfig: AppConfig | undefined = undefined;
    if (customModel) {
        appConfig = {
            model_list: [{
                "model_id": modelId,
                "model": customModel.modelUrl,
                "model_lib": customModel.modelLibUrl,
            }],
            useIndexedDBCache: false,
        };
    } else {
        appConfig = { ...prebuiltAppConfig, useIndexedDBCache: false };
    }

    try {
        await deleteModelAllInfoInCache(modelId, appConfig);
        const modelUrlHint = customModel ? customModel.modelUrl : modelId;
        await deleteFromCacheAPI(modelUrlHint);

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
        post({ type: 'log', payload: 'Clearing pre-built model caches...' });
        for (const model of prebuiltAppConfig.model_list) {
            await deleteModelAllInfoInCache(model.model_id, { ...prebuiltAppConfig, useIndexedDBCache: false });
        }

        post({ type: 'log', payload: 'Clearing custom model caches...' });
        for (const customModel of customModels) {
            const customAppConfig: AppConfig = {
                model_list: [{
                    "model_id": customModel.id,
                    "model": customModel.modelUrl,
                    "model_lib": customModel.modelLibUrl,
                }],
                useIndexedDBCache: false,
            };
            await deleteModelAllInfoInCache(customModel.id, customAppConfig);
        }
        
        if ('caches' in self) {
             const keys = await self.caches.keys();
             for (const key of keys) {
                 if (key.includes('webllm') || key.includes('model')) {
                     await self.caches.delete(key);
                 }
             }
        }

        post({ type: 'log', payload: 'All model caches cleared.' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        post({ type: 'error', payload: `Failed to clear all caches: ${message}` });
    }
};


// --- EVENT LISTENER ---

self.onmessage = async (event: MessageEvent) => {
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
            await initializeEngine(payload.modelId, { ...prebuiltAppConfig, useIndexedDBCache: false });
            break;
        case 'load-custom': {
            const { modelId, modelUrl, modelLibUrl } = payload;
            if (currentModelId === modelId) {
                post({ type: 'loaded', payload: `Custom model ${modelId} is already loaded.` });
                return;
            }

            // We construct the base config here, but initializeEngine will perform the F16 check and injection
            const customAppConfig: AppConfig = {
                model_list: [{
                    "model_id": modelId,
                    "model": modelUrl,
                    "model_lib": modelLibUrl,
                    "low_resource_required": true,
                    // Note: We don't hardcode required_features here anymore, 
                    // initializeEngine will add it dynamically based on support.
                    "overrides": {
                        "context_window_size": 2048,
                    }
                }],
                useIndexedDBCache: false, 
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
            break;
        default:
            post({ type: 'error', payload: `Unknown command: ${type}` });
            break;
    }
};
