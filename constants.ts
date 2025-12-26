
import type { Language, AsrModel, OfflineModel } from './types';

export const LANGUAGES: Language[] = [
    { code: 'auto', name: 'languages.autoDetect' },
    { code: 'en', name: 'languages.english', asrCode: 'en' },
    { code: 'zh-Hant', name: 'languages.chineseTraditional', asrCode: 'zh' },
    { code: 'zh-Hant-HK', name: 'languages.chineseTraditionalHK', asrCode: 'zh' },
    { code: 'zh-Hans', name: 'languages.chineseSimplified', asrCode: 'zh' },
    { code: 'es', name: 'languages.spanish', asrCode: 'es' },
    { code: 'ja', name: 'languages.japanese', asrCode: 'ja' },
    { code: 'fr', name: 'languages.french', asrCode: 'fr' },
    { code: 'de', name: 'languages.german', asrCode: 'de' },
    { code: 'ko', name: 'languages.korean', asrCode: 'ko' },
    { code: 'ru', name: 'languages.russian', asrCode: 'ru' },
];

export const OFFLINE_MODELS: OfflineModel[] = [
    { 
        name: 'Qwen3-4B (2.7 GB)', 
        value: 'Qwen3-4B-q4f16_1-MLC',
        isCustom: false,
    },
    { 
        name: 'Qwen2.5-3B-Instruct (1.9 GB)', 
        value: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        isCustom: false,
    },
    {
        name: 'GPT-5-Distill-Qwen3-4B (2.28 GB)',
        value: 'GPT-5-Distill-Qwen3-4B-Instruct-q4f16_1-MLC',
        isCustom: true,
        modelUrl: 'https://huggingface.co/willopcbeta/GPT-5-Distill-Qwen3-4B-Instruct-q4f16_1-MLC',
        modelLibUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Qwen3-4B-Instruct-2507-q4f16_1-ctx4k_cs1k-webgpu.wasm'
    },
    {
        name: 'Llama-Breeze2-3B (2.04 GB)',
        value: 'Llama-Breeze2-3B-Instruct-Text-q4f16_1-MLC',
        isCustom: true,
        modelUrl: 'https://huggingface.co/willopcbeta/Llama-Breeze2-3B-Instruct-Text-q4f16_1-MLC',
        modelLibUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
    },
    {
        name: 'EZO-gemma-2-2b-jpn-it (1.51 GB)',
        value: 'EZO-gemma-2-2b-jpn-it-q4f32_1-MLC',
        isCustom: true,
        modelUrl: 'https://huggingface.co/willopcbeta/EZO-gemma-2-2b-jpn-it-q4f32_1-MLC',
        modelLibUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/gemma-2-2b-jpn-it-q4f32_1-ctx4k_cs1k-webgpu.wasm'
    }
];

export const ASR_MODELS: AsrModel[] = [
    {
        id: 'nicky48/whisper-large-v3-turbo-ONNX',
        name: 'whisper-large-v3-turbo (q4f16)',
        quantization: {
            encoder_model: 'q4f16',
            decoder_model_merged: 'q4f16',
        },
        size: '~600 MB'
    },
	{
        id: 'Xenova/whisper-small',
        name: 'Whisper small (q4f16)',
        quantization: {
            encoder_model: 'q4',
            decoder_model_merged: 'q4',
        },
        size: '~200 MB'
    },
    {
        id: 'Xenova/whisper-base',
        name: 'Whisper Base (q4)',
        quantization: {
            encoder_model: 'q4',
            decoder_model_merged: 'q4',  //decoder_model_with_past: 'q4'
        },
        size: '~150 MB'
    }
];