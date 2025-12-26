import { env } from '@huggingface/transformers';

// --- Cache Configuration ---
const CACHE_NAME = 'transformers-cache';

// Configure transformers.js to use WebGPU and the browser's cache.
// This is done here to ensure it's configured on the main thread as well as the worker.
env.backends.onnx.executionProviders = ['webgpu', 'wasm'];
env.useBrowserCache = true;
env.cacheDir = CACHE_NAME;


/**
 * Checks if a specific ASR model is already present in the browser cache
 * by looking for its config.json file.
 * @param modelId The Hugging Face ID of the model to check.
 * @returns A promise that resolves to true if cached, false otherwise.
 */
export const checkAsrModelCacheStatus = async (modelId: string): Promise<boolean> => {
    if (!('caches' in window)) return false;

    try {
        const cache = await caches.open(CACHE_NAME);
        const modelUrl = `https://huggingface.co/${modelId}/resolve/main/config.json`;
        const match = await cache.match(modelUrl);
        return !!match;
    } catch (err)
 {
        console.error(`Error checking ASR cache status for ${modelId}:`, err);
        return false;
    }
};

/**
 * Deletes the entire transformers.js ASR model cache from the browser.
 */
export const clearAsrCache = async (): Promise<void> => {
    if (!('caches' in window)) return;

    try {
        await caches.delete(CACHE_NAME);
        console.log("ASR model cache cleared successfully.");
    } catch (err) {
        console.error("Error clearing ASR model cache:", err);
        throw err;
    }
};


/**
 * Converts, processes, and resamples an audio blob to a mono, 16kHz Float32Array
 * suitable for the Whisper model.
 * @param audioBlob The audio data captured from the microphone.
 * @param options Optional settings for audio processing like noise suppression and gain.
 * @returns A promise that resolves to the processed audio as a Float32Array.
 */
export const processAudioForTranscription = async (
    audioBlob: Blob,
    options: { noiseSuppression?: boolean; gain?: number } = {}
): Promise<Float32Array> => {
    const { noiseSuppression = false, gain = 1.0 } = options;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const OfflineAudioContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

    if (!AudioContext) {
        throw new Error("Your browser does not support the Web Audio API, which is required for transcription.");
    }
    
    const audioBlobArrayBuffer = await audioBlob.arrayBuffer();
    const tempAudioContext = new AudioContext();
    const decodedAudioBuffer = await tempAudioContext.decodeAudioData(audioBlobArrayBuffer);
    
    let monoChannelData: Float32Array;
    if (decodedAudioBuffer.numberOfChannels > 1) {
        monoChannelData = new Float32Array(decodedAudioBuffer.length);
        for (let i = 0; i < decodedAudioBuffer.length; i++) {
            let mixed = 0;
            for (let channel = 0; channel < decodedAudioBuffer.numberOfChannels; channel++) {
                mixed += decodedAudioBuffer.getChannelData(channel)[i];
            }
            monoChannelData[i] = mixed / decodedAudioBuffer.numberOfChannels;
        }
    } else {
        monoChannelData = decodedAudioBuffer.getChannelData(0);
    }
    
    const targetSampleRate = 16000;
    
    const monoBuffer = tempAudioContext.createBuffer(1, monoChannelData.length, decodedAudioBuffer.sampleRate);
    monoBuffer.copyToChannel(monoChannelData, 0);

    const offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(monoBuffer.duration * targetSampleRate),
        targetSampleRate
    );
    
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = monoBuffer;

    let lastNode: AudioNode = bufferSource;

    if (noiseSuppression) {
        const highpassFilter = offlineContext.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.value = 100; // Cut off frequencies below 100Hz
        lastNode.connect(highpassFilter);
        lastNode = highpassFilter;
    }

    if (gain && gain !== 1.0) {
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = gain;
        lastNode.connect(gainNode);
        lastNode = gainNode;
    }

    lastNode.connect(offlineContext.destination);
    
    bufferSource.start();
    
    const resampledAudioBuffer = await offlineContext.startRendering();
    
    await tempAudioContext.close();
    
    return resampledAudioBuffer.getChannelData(0);
};