
export interface Language {
    code: string;
    name: string;
    asrCode?: string;
}

export interface TranslationHistoryItem {
    id: number;
    inputText: string;
    translatedText: string;
    sourceLang: Language;
    targetLang: Language;
}

export interface ModelLoadingProgress {
    progress: number;
    text: string;
}

export interface OfflineModel {
    name: string;
    value: string; // The model ID
    isCustom?: boolean;
    modelUrl?: string;
    modelLibUrl?: string;
}

export interface AsrModel {
    id: string;
    name: string;
    quantization: Record<string, string>;
    size: string;
}

export interface CustomOfflineModel {
    id: string;
    name: string;
    modelUrl: string;
    modelLibUrl: string;
}