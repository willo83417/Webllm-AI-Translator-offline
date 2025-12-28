
import { pipeline, env } from '@huggingface/transformers';

// --- Environment Configuration ---
env.backends.onnx.executionProviders = ['webgpu', 'wasm'];
env.useBrowserCache = true;
env.cacheDir = 'transformers-cache';

// --- Worker State & Communication ---
interface WorkerMessage {
    type: 'load' | 'transcribe' | 'unload';
    payload?: any;
}

interface AppMessage {
    type: 'log' | 'transcription' | 'loaded' | 'error' | 'progress' | 'unloaded';
    payload: any;
}

const post = (message: AppMessage) => self.postMessage(message);

// Maps specific language codes to prompts that guide the Whisper model's output format.
const PROMPT_MAP: Record<string, string> = {
    'zh-TW': '請使用繁體中文輸出。',
    'zh-HK': '請使用香港繁體中文輸出。',
    'zh-CN': '请使用简体中文输出。'
};

class Transcriber {
    private transcriber: any = null;
    private loading: boolean = false;
    private currentModelId: string | null = null;

    async load(payload: { modelId: string, quantization: any }) {
        const { modelId, quantization } = payload;
        
        if (this.loading) {
            post({ type: 'log', payload: `Already loading model: ${this.currentModelId}` });
            return;
        }

        if (this.transcriber && this.currentModelId === modelId) {
            post({ type: 'log', payload: `Model ${modelId} is already loaded.` });
            post({ type: 'loaded', payload: true });
            return;
        }

        this.loading = true;
        this.currentModelId = modelId;
        post({ type: 'log', payload: `Initializing pipeline for model: ${modelId} with quantization: ${JSON.stringify(quantization)}` });

        try {
            // Dispose previous transcriber if it exists to free memory
            if (this.transcriber) {
                post({ type: 'log', payload: `Disposing previous model: ${this.currentModelId}`});
                await this.transcriber.dispose();
                this.transcriber = null;
            }

            this.transcriber = await pipeline('automatic-speech-recognition', modelId, {
                progress_callback: (progress: any) => {
                     post({ type: 'progress', payload: progress });
                },
                dtype: quantization,
                device: "webgpu",
            });
            
            post({ type: 'loaded', payload: true });
            post({ type: 'log', payload: `Model ${modelId} loaded successfully on WebGPU.` });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('ASR Load Error:', error);
            post({ type: 'error', payload: `Error loading ASR model: ${errorMessage}` });
            this.currentModelId = null;
            this.transcriber = null;
        } finally {
            this.loading = false;
        }
    }

    async transcribe(audioData: Float32Array, asrLanguage: string, promptLanguage: string) {
        if (!this.transcriber) {
            const errorMsg = `Transcriber not ready. The pipeline was not initialized correctly. Current model ID: ${this.currentModelId}`;
            console.error(errorMsg);
            post({ type: 'error', payload: errorMsg });
            return;
        }

        post({ type: 'log', payload: `Starting transcription (ASR Lang: ${asrLanguage}, Prompt Lang: ${promptLanguage})...` });

        try {
            const generationOptions: any = {
                language: asrLanguage?.startsWith('zh') ? 'chinese' : (asrLanguage === 'auto' ? undefined : asrLanguage),
                task: 'transcribe',
                temperature: 0.3,
            };
    
            // Use the specific promptLanguage code to look up the correct prompt.
            const promptText = PROMPT_MAP[promptLanguage];
            if (promptText) {
                post({ type: 'log', payload: `Applying prompt for ${promptLanguage}: "${promptText}"` });
    
                const { input_ids } = await this.transcriber.tokenizer(promptText);
                
                // Remove the final token which is typically an EOS token.
                generationOptions.prompt_ids = input_ids.data.slice(0, -1);
            }
            
            const output = await this.transcriber(audioData, generationOptions);
            
            const text = Array.isArray(output) ? output[0].text : output.text;
            post({ type: 'transcription', payload: (text || '').trim() });
            post({ type: 'log', payload: 'Transcription completed successfully.' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('ASR Transcription Error:', error);
            post({ type: 'error', payload: `Transcription error: ${errorMessage}` });
        }
    }

    async unload() {
        if (!this.transcriber) {
            post({ type: 'log', payload: 'No ASR model is currently loaded. Nothing to unload.' });
            return;
        }

        post({ type: 'log', payload: `Unloading model: ${this.currentModelId}` });
        try {
            // Explicitly call dispose() to free up memory (including WebGPU/WebGL resources).
            await this.transcriber.dispose();
            this.transcriber = null;
            this.currentModelId = null;
            post({ type: 'unloaded', payload: true });
            post({ type: 'log', payload: 'ASR pipeline instance disposed and released.' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('ASR Unload Error:', error);
            post({ type: 'error', payload: `Error unloading ASR model: ${errorMessage}` });
        }
    }
}

const transcriber = new Transcriber();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;
    switch (type) {
        case 'load':
            if (payload && payload.modelId && payload.quantization) {
                transcriber.load(payload);
            } else {
                post({ type: 'error', payload: 'Invalid load payload: modelId and quantization are required.' });
            }
            break;
        case 'transcribe':
            const { audio, asrLanguage, promptLanguage } = payload;
            if (audio && asrLanguage !== undefined && promptLanguage !== undefined) {
                transcriber.transcribe(audio, asrLanguage, promptLanguage);
            } else {
                post({ type: 'error', payload: 'Invalid transcribe payload: audio, asrLanguage, and promptLanguage are required.' });
            }
            break;
        case 'unload':
            transcriber.unload();
            break;
        default:
            console.warn(`ASR Worker received unknown message type: ${type}`);
            break;
    }
};
