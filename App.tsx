

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TranslationInput from './components/TranslationInput';
import TranslationOutput from './components/TranslationOutput';
import CameraView from './components/CameraView';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import { translateTextStream as translateTextGeminiStream, translateImage as translateImageGemini } from './services/geminiService';
import { translateTextStream as translateTextOpenAIStream, translateImage as translateImageOpenAI } from './services/openaiService';
import { 
    initializeOfflineModel, 
    unloadOfflineModel, 
    translateOfflineStream, 
    clearAllOfflineCache, 
    listCachedModels, 
    deleteOfflineModel,
    registerOnIdleUnload,
    resetOfflineEngineIdleTimer
} from './services/offlineService';
import { processAudioForTranscription, checkAsrModelCacheStatus, clearAsrCache } from './services/asrService';
import { useWebSpeech } from './hooks/useWebSpeech';
import type { Language, TranslationHistoryItem, ModelLoadingProgress, AsrModel, CustomOfflineModel } from './types';
import { LANGUAGES, ASR_MODELS } from './constants';

interface AppMessage {
    type: 'log' | 'transcription' | 'loaded' | 'error' | 'progress';
    payload: any;
}

const App: React.FC = () => {
    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [sourceLang, setSourceLang] = useState<Language>(LANGUAGES[0]); // Default to Auto Detect
    const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[6]); // Default to Japanese
    const [isLoading, setIsLoading] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const [isAstRecording, setIsAstRecording] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
    
    // Shared settings
    const [apiKey, setApiKey] = useState('');
    const [modelName, setModelName] = useState('gemini-2.5-flash');

    // Online provider settings
    const [onlineProvider, setOnlineProvider] = useState('gemini');
    const [openaiApiUrl, setOpenaiApiUrl] = useState('');
    
    // Offline settings
    const [offlineModelName, setOfflineModelName] = useState('');
    const [isTwoStepJpCn, setIsTwoStepJpCn] = useState(false);
    
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingGender, setSpeakingGender] = useState<'female' | 'male' | null>(null);

    // Offline TTS settings
    const [isOfflineTtsEnabled, setIsOfflineTtsEnabled] = useState(false);
    const [offlineTtsVoiceURI, setOfflineTtsVoiceURI] = useState('');
    const [offlineTtsRate, setOfflineTtsRate] = useState(1);
    const [offlineTtsPitch, setOfflineTtsPitch] = useState(1);

    const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState(false);
    const [modelLoadingProgress, setModelLoadingProgress] = useState<ModelLoadingProgress>({ text: '', progress: 0 });
    const [isOfflineModelInitializing, setIsOfflineModelInitializing] = useState(false);
    const [isOfflineModelInitialized, setIsOfflineModelInitialized] = useState(false);
    const [loadedOfflineModelId, setLoadedOfflineModelId] = useState<string | null>(null);
    
    // Offline model download management
    const [customModels, setCustomModels] = useState<CustomOfflineModel[]>([]);
    const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
    const [loadingModelId, setLoadingModelId] = useState<string | null>(null);

    // Offline model generation parameters
    const [offlineTemperature, setOfflineTemperature] = useState(0.3);
    const [offlineMaxTokens, setOfflineMaxTokens] = useState(2048);
    const [offlinePresencePenalty, setOfflinePresencePenalty] = useState(0.1);
    const [offlineFrequencyPenalty, setOfflineFrequencyPenalty] = useState(0.1);
    
    // ASR state
    const [isOfflineAsrEnabled, setIsOfflineAsrEnabled] = useState(false);
    const [asrModelId, setAsrModelId] = useState(ASR_MODELS[0].id); // Default to the first model
    const [isAsrInitializing, setIsAsrInitializing] = useState(false);
    const [isAsrInitialized, setIsAsrInitialized] = useState(false);
    const [asrModelsCacheStatus, setAsrModelsCacheStatus] = useState<Record<string, boolean>>({});
    const [asrLoadingProgress, setAsrLoadingProgress] = useState({ file: '', progress: 0 });
    const [isNoiseCancellationEnabled, setIsNoiseCancellationEnabled] = useState(false);
    const [audioGainValue, setAudioGainValue] = useState(1.0);
    const [recordingCountdown, setRecordingCountdown] = useState<number | null>(null);

    type NotificationType = 'error' | 'success' | 'info';
    interface Notification {
        message: string;
        type: NotificationType;
    }
    const [notification, setNotification] = useState<Notification | null>(null);
    const notificationTimerRef = useRef<number | null>(null);
    
    // Worker ref
    const worker = useRef<Worker | null>(null);
    const isReverseTranslate = useRef(false);
    const countdownTimerRef = useRef<number | null>(null);

    const showNotification = useCallback((message: string, type: NotificationType = 'error') => {
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
        setNotification({ message, type });
        notificationTimerRef.current = window.setTimeout(() => {
            setNotification(null);
        }, 5000);
    }, []);

    const translationAbortControllerRef = useRef<AbortController | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const onStopRecordingCallbackRef = useRef<((blob: Blob) => void) | null>(null);

    const checkAllAsrCacheStatus = useCallback(async () => {
        const statuses: Record<string, boolean> = {};
        for (const model of ASR_MODELS) {
            statuses[model.id] = await checkAsrModelCacheStatus(model.id);
        }
        setAsrModelsCacheStatus(statuses);
        return statuses;
    }, []);

    const handleModelLoadingProgress = useCallback((progress: { text: string, progress: number }) => {
        setModelLoadingProgress(progress);
    }, []);

    const isOfflineModelReady = isOfflineModeEnabled && !!offlineModelName && isOfflineModelInitialized;

    const performReverseTranslate = useCallback(async (textToTranslate: string) => {
        if (!textToTranslate.trim()) {
            setTranslatedText('');
            return;
        }
        
        if (translationAbortControllerRef.current) {
            translationAbortControllerRef.current.abort();
        }
        const controller = new AbortController();
        translationAbortControllerRef.current = controller;
    
        setIsLoading(true);
        setTranslatedText('');
    
        let finalResult = '';
        const onChunk = (chunk: string) => {
            finalResult += chunk;
            setTranslatedText(prev => prev + chunk);
        };
    
        const fromLang = targetLang;
        const toLang = sourceLang;

        try {
            if (isOfflineModeEnabled) {
                if (!offlineModelName) throw new Error('Please select an offline model in settings.');
                if (isOfflineModelInitializing) throw new Error('Offline model is still initializing.');
                if (!isOfflineModelReady) {
                    await initializeOfflineModel(offlineModelName, customModels, handleModelLoadingProgress);
                    setIsOfflineModelInitialized(true);
                    setLoadedOfflineModelId(offlineModelName);
                }
                
                finalResult = await translateOfflineStream(
                    textToTranslate, fromLang.code, toLang.code, isTwoStepJpCn, 
                    { temperature: offlineTemperature, maxTokens: offlineMaxTokens, presencePenalty: offlinePresencePenalty, frequencyPenalty: offlineFrequencyPenalty },
                    onChunk, controller.signal
                );
            } else {
                if (!isOnline) throw new Error("You are offline. Enable offline mode or connect to the internet.");
    
                if (onlineProvider === 'openai') {
                    if (!apiKey) throw new Error("OpenAI API Key is not set. Please add it in the settings.");
                    if (!openaiApiUrl) throw new Error("OpenAI API URL is not set. Please add it in the settings.");
                    finalResult = await translateTextOpenAIStream(textToTranslate, t(fromLang.name, { lng: 'en' }), t(toLang.name, { lng: 'en' }), apiKey, modelName, openaiApiUrl, onChunk, controller.signal);
                } else {
                    if (!apiKey) throw new Error("Gemini API Key is not set. Please add it in the settings.");
                    finalResult = await translateTextGeminiStream(textToTranslate, t(fromLang.name, { lng: 'en' }), t(toLang.name, { lng: 'en' }), apiKey, modelName, onChunk, controller.signal);
                }
            }
    
            const newHistoryItem: TranslationHistoryItem = {
                id: Date.now(), inputText: textToTranslate, translatedText: finalResult, sourceLang: fromLang, targetLang: toLang,
            };
            setHistory(prevHistory => {
                const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50);
                localStorage.setItem('translation-history', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
    
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log("Translation cancelled by user.");
                setTranslatedText(finalResult);
                return;
            }
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            showNotification(t('notifications.translationFailed', { errorMessage }), 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
            if (translationAbortControllerRef.current === controller) {
                translationAbortControllerRef.current = null;
            }
        }
    }, [targetLang, sourceLang, isOfflineModeEnabled, offlineModelName, isOfflineModelInitializing, isOfflineModelReady, customModels, handleModelLoadingProgress, isTwoStepJpCn, offlineTemperature, offlineMaxTokens, offlinePresencePenalty, offlineFrequencyPenalty, isOnline, onlineProvider, apiKey, openaiApiUrl, modelName, t, showNotification]);

    const performReverseTranslateRef = useRef(performReverseTranslate);
    useEffect(() => {
        performReverseTranslateRef.current = performReverseTranslate;
    }, [performReverseTranslate]);

    const onWorkerMessage = useCallback((e: MessageEvent<AppMessage>) => {
        const { type, payload } = e.data;
        switch (type) {
            case 'progress':
                if (payload.status === 'progress' || payload.status === 'download') {
                    setAsrLoadingProgress({ file: payload.file, progress: payload.progress });
                }
                break;
            case 'error':
                showNotification(payload, 'error');
                setIsAsrInitializing(false);
                break;
            case 'loaded':
                setIsAsrInitialized(true);
                setIsAsrInitializing(false);
                checkAllAsrCacheStatus();
                break;
            case 'transcription':
                setInputText(payload);
                if (isReverseTranslate.current) {
                    if (payload.trim()) {
                        performReverseTranslateRef.current(payload);
                    } else {
                        setInputText('');
                    }
                    isReverseTranslate.current = false;
                }
                break;
            case 'log':
                console.log('[ASR Worker]:', payload);
                break;
            default:
                break;
        }
    }, [showNotification, checkAllAsrCacheStatus]);

    const initializeWorker = useCallback(() => {
        // The underlying race condition that caused worker re-initialization has been fixed.
        // This code is now safe to run and is required for offline ASR to function.
        if (worker.current) {
            worker.current.terminate();
        }
        const newWorker = new Worker(new URL('./services/worker.ts', import.meta.url), {
            type: 'module',
        });
        newWorker.addEventListener('message', onWorkerMessage);
        worker.current = newWorker;
        console.log('ASR Worker initialized.');
    }, [onWorkerMessage]);

    useEffect(() => {
        initializeWorker();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        checkAllAsrCacheStatus();
        
        registerOnIdleUnload(() => {
            console.log("Offline model unloaded due to inactivity.");
            setIsOfflineModelInitialized(false);
            setLoadedOfflineModelId(null);
            showNotification(t('notifications.modelIdleUnloaded'), 'info');
        });

        return () => {
            worker.current?.terminate();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [initializeWorker, checkAllAsrCacheStatus, showNotification, t]);

    useEffect(() => {
        let throttleTimeout: number | null = null;
        const handleActivity = () => {
            if (isOfflineModelInitialized && !throttleTimeout) {
                throttleTimeout = window.setTimeout(() => {
                    resetOfflineEngineIdleTimer();
                    throttleTimeout = null;
                }, 10000);
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            if (throttleTimeout) {
                clearTimeout(throttleTimeout);
            }
        };
    }, [isOfflineModelInitialized]);
    
    useEffect(() => {
        const savedApiKey = localStorage.getItem('api-key');
        if (savedApiKey) setApiKey(savedApiKey);
        
        const savedModelName = localStorage.getItem('model-name');
        if (savedModelName) setModelName(savedModelName);

        const savedProvider = localStorage.getItem('online-provider');
        if (savedProvider) setOnlineProvider(savedProvider);

        const savedUrl = localStorage.getItem('openai-api-url');
        if (savedUrl) setOpenaiApiUrl(savedUrl);
        
        const savedOfflineModel = localStorage.getItem('offline-model-name');
        if (savedOfflineModel) setOfflineModelName(savedOfflineModel);

        const savedOfflineMode = localStorage.getItem('offline-mode-enabled');
        if (savedOfflineMode) setIsOfflineModeEnabled(JSON.parse(savedOfflineMode));
        
        const savedAsrEnabled = localStorage.getItem('is-offline-asr-enabled');
        if (savedAsrEnabled) setIsOfflineAsrEnabled(JSON.parse(savedAsrEnabled));

        const savedAsrModel = localStorage.getItem('asr-model-id');
        if (savedAsrModel) setAsrModelId(savedAsrModel);

        const savedNoiseCancellation = localStorage.getItem('is-noise-cancellation-enabled');
        if (savedNoiseCancellation) setIsNoiseCancellationEnabled(JSON.parse(savedNoiseCancellation));

        const savedAudioGain = localStorage.getItem('audio-gain-value');
        if (savedAudioGain) setAudioGainValue(JSON.parse(savedAudioGain));

        const savedTwoStep = localStorage.getItem('is-two-step-jp-cn-enabled');
        if (savedTwoStep) setIsTwoStepJpCn(JSON.parse(savedTwoStep));
        
        const savedTtsEnabled = localStorage.getItem('tts-enabled');
        if (savedTtsEnabled) setIsOfflineTtsEnabled(JSON.parse(savedTtsEnabled));

        const savedTtsVoice = localStorage.getItem('tts-voice-uri');
        if (savedTtsVoice) setOfflineTtsVoiceURI(savedTtsVoice);

        const savedTtsRate = localStorage.getItem('tts-rate');
        if (savedTtsRate) setOfflineTtsRate(JSON.parse(savedTtsRate));

        const savedTtsPitch = localStorage.getItem('tts-pitch');
        if (savedTtsPitch) setOfflineTtsPitch(JSON.parse(savedTtsPitch));

        const savedTemp = localStorage.getItem('offline-temperature');
        if (savedTemp) setOfflineTemperature(parseFloat(savedTemp));
        const savedMaxTokens = localStorage.getItem('offline-max-tokens');
        if (savedMaxTokens) setOfflineMaxTokens(parseInt(savedMaxTokens, 10));
        const savedPresence = localStorage.getItem('offline-presence-penalty');
        if (savedPresence) setOfflinePresencePenalty(parseFloat(savedPresence));
        const savedFrequency = localStorage.getItem('offline-frequency-penalty');
        if (savedFrequency) setOfflineFrequencyPenalty(parseFloat(savedFrequency));
        
        const savedCustomModels = localStorage.getItem('custom-offline-models');
        if (savedCustomModels) setCustomModels(JSON.parse(savedCustomModels));

        const prebuiltCached = listCachedModels();
        const customModelIds = savedCustomModels ? JSON.parse(savedCustomModels).map((m: CustomOfflineModel) => m.id) : [];
        setCachedModels(new Set([...prebuiltCached, ...customModelIds]));

        try {
            const savedHistory = localStorage.getItem('translation-history');
            if (savedHistory) setHistory(JSON.parse(savedHistory));
        } catch (err: any) {
            console.error('Failed to load translation history:', err);
        }
    }, []);

    useEffect(() => {
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, []);

    // Fixed auto-load effect for ASR
    useEffect(() => {
        const autoLoadAsr = async () => {
            if (isOfflineAsrEnabled && asrModelId && !isAsrInitialized && !isAsrInitializing && worker.current) {
                const isCached = await checkAsrModelCacheStatus(asrModelId);
                if (isCached) {
                    const model = ASR_MODELS.find(m => m.id === asrModelId);
                    if (model) {
                        console.log(`Auto-loading cached ASR model: ${model.id}`);
                        setIsAsrInitializing(true);
                        setAsrLoadingProgress({ file: '', progress: 0 });
                        worker.current.postMessage({
                            type: 'load',
                            payload: { modelId: model.id, quantization: model.quantization }
                        });
                    }
                }
            }
        };
        autoLoadAsr();
    }, [isOfflineAsrEnabled, asrModelId, isAsrInitialized, isAsrInitializing, !!worker.current]);

    useEffect(() => {
        const desiredModel = isOfflineModeEnabled ? offlineModelName : null;
    
        if (desiredModel && desiredModel !== loadedOfflineModelId) {
            const initModel = async () => {
                setIsOfflineModelInitializing(true);
                setIsOfflineModelInitialized(false);
                setLoadingModelId(desiredModel);
                try {
                    await initializeOfflineModel(desiredModel, customModels, handleModelLoadingProgress);
                    setIsOfflineModelInitialized(true);
                    setLoadedOfflineModelId(desiredModel);
                    
                    const isCustom = customModels.some(m => m.id === desiredModel);
                    if(!isCustom) {
                        setCachedModels(listCachedModels());
                    }
                    
                    showNotification(t('notifications.offlineModelInitSuccess', { modelIdentifier: desiredModel }), 'success');
                } catch (err) {
                    const message = err instanceof Error ? err.message : t('notifications.offlineModelInitFailed');
                    showNotification(message, 'error');
                    console.error('Offline model init failed', err);
                    setIsOfflineModelInitialized(false);
                    setLoadedOfflineModelId(null);
                } finally {
                    setIsOfflineModelInitializing(false);
                    setLoadingModelId(null);
                    setModelLoadingProgress({ text: '', progress: 0 });
                }
            };
            initModel();
        }
        else if (!desiredModel && loadedOfflineModelId) {
            const unload = async () => {
                await unloadOfflineModel();
                setIsOfflineModelInitialized(false);
                setIsOfflineModelInitializing(false);
                setLoadedOfflineModelId(null);
            };
            unload();
        }
    }, [offlineModelName, isOfflineModeEnabled, loadedOfflineModelId, customModels, handleModelLoadingProgress, showNotification, t]);


    const performTranslate = useCallback(async (textToTranslate: string) => {
        if (!textToTranslate.trim()) {
            setTranslatedText('');
            return;
        }

        if (translationAbortControllerRef.current) {
            translationAbortControllerRef.current.abort();
        }
        const controller = new AbortController();
        translationAbortControllerRef.current = controller;
    
        setIsLoading(true);
        setTranslatedText('');
    
        let finalResult = '';
        const onChunk = (chunk: string) => {
            finalResult += chunk;
            setTranslatedText(prev => prev + chunk);
        };
    
        try {
            if (isOfflineModeEnabled) {
                if (!offlineModelName) throw new Error('Please select an offline model in settings.');
                if (isOfflineModelInitializing) throw new Error('Offline model is still initializing.');
                if (!isOfflineModelReady) {
                    await initializeOfflineModel(offlineModelName, customModels, handleModelLoadingProgress);
                    setIsOfflineModelInitialized(true);
                    setLoadedOfflineModelId(offlineModelName);
                }
                
                finalResult = await translateOfflineStream(
                    textToTranslate, sourceLang.code, targetLang.code, isTwoStepJpCn, 
                    { 
                        temperature: offlineTemperature, 
                        maxTokens: offlineMaxTokens,
                        presencePenalty: offlinePresencePenalty,
                        frequencyPenalty: offlineFrequencyPenalty
                    },
                    onChunk, controller.signal
                );
            } else {
                if (!isOnline) throw new Error("You are offline. Enable offline mode or connect to the internet.");
    
                if (onlineProvider === 'openai') {
                    if (!apiKey) throw new Error("OpenAI API Key is not set. Please add it in the settings.");
                    if (!openaiApiUrl) throw new Error("OpenAI API URL is not set. Please add it in the settings.");
                    finalResult = await translateTextOpenAIStream(textToTranslate, t(sourceLang.name, { lng: 'en' }), t(targetLang.name, { lng: 'en' }), apiKey, modelName, openaiApiUrl, onChunk, controller.signal);
                } else {
                    if (!apiKey) throw new Error("Gemini API Key is not set. Please add it in the settings.");
                    finalResult = await translateTextGeminiStream(textToTranslate, t(sourceLang.name, { lng: 'en' }), t(targetLang.name, { lng: 'en' }), apiKey, modelName, onChunk, controller.signal);
                }
            }
    
            const newHistoryItem: TranslationHistoryItem = {
                id: Date.now(), inputText: textToTranslate, translatedText: finalResult, sourceLang, targetLang,
            };
            setHistory(prevHistory => {
                const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50);
                localStorage.setItem('translation-history', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
    
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log("Translation cancelled by user.");
                setTranslatedText(finalResult);
                return;
            }
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            showNotification(t('notifications.translationFailed', { errorMessage }), 'error');
            if (err instanceof Error && (err.message.includes('select an offline model') || err.message.includes('API Key is not set') || err.message.includes('API URL is not set'))) {
                setIsSettingsOpen(true);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
            if (translationAbortControllerRef.current === controller) {
                translationAbortControllerRef.current = null;
            }
        }
    }, [sourceLang, targetLang, apiKey, modelName, isOnline, isOfflineModeEnabled, offlineModelName, isOfflineModelReady, isOfflineModelInitializing, showNotification, onlineProvider, openaiApiUrl, isTwoStepJpCn, t, offlineTemperature, offlineMaxTokens, offlinePresencePenalty, offlineFrequencyPenalty, handleModelLoadingProgress, customModels]);

    const handleTranslate = useCallback(() => {
        performTranslate(inputText);
    }, [inputText, performTranslate]);

    const handleCancelTranslation = useCallback(() => {
        if (translationAbortControllerRef.current) {
            translationAbortControllerRef.current.abort();
        }
    }, []);

    const handleSwapLanguages = useCallback(() => {
        if (sourceLang.code === 'auto') return;
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setInputText(translatedText);
        setTranslatedText(inputText);
    }, [sourceLang, targetLang, inputText, translatedText]);

    const handleSpeak = useCallback((gender: 'female' | 'male') => {
        if (!translatedText || !('speechSynthesis' in window)) return;

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (isSpeaking && (isOfflineTtsEnabled || speakingGender === gender)) {
                return;
            }
        }

        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = targetLang.code;

        if (isOfflineTtsEnabled) {
            const selectedVoice = voices.find(v => v.voiceURI === offlineTtsVoiceURI);
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.rate = offlineTtsRate;
            utterance.pitch = offlineTtsPitch;
        } else {
            const langVoices = voices.filter(v => v.lang.startsWith(targetLang.code));
            
            if (langVoices.length > 0) {
                const femaleVoice = langVoices.find(v => /female|women|girl|mei-jia|zira|ayumi|kyoko/i.test(v.name));
                const maleVoice = langVoices.find(v => /male|men|boy|liang|ichiro/i.test(v.name));
                let selectedVoice: SpeechSynthesisVoice | undefined;
                if (gender === 'female') {
                    selectedVoice = femaleVoice || langVoices.find(v => v !== maleVoice) || langVoices[0];
                } else {
                    selectedVoice = maleVoice || langVoices.find(v => v !== femaleVoice) || langVoices[0];
                }
                utterance.voice = selectedVoice;
            }
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setSpeakingGender(isOfflineTtsEnabled ? null : gender);
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingGender(null);
        };
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            showNotification(t('notifications.speechError', { error: event.error }), 'error');
            setIsSpeaking(false);
            setSpeakingGender(null);
        };
        
        window.speechSynthesis.speak(utterance);

    }, [translatedText, targetLang, voices, isSpeaking, speakingGender, showNotification, isOfflineTtsEnabled, offlineTtsVoiceURI, offlineTtsRate, offlineTtsPitch, t]);

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleStartRecording = (onStop: (audioBlob: Blob) => void) => {
        if (isRecording || isAstRecording) return;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioChunksRef.current = [];
                onStopRecordingCallbackRef.current = onStop;
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = event => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                recorder.onstop = () => {
                    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    if (onStopRecordingCallbackRef.current) {
                        onStopRecordingCallbackRef.current(audioBlob);
                    }
                    stream.getTracks().forEach(track => track.stop());
                    mediaRecorderRef.current = null;
                    onStopRecordingCallbackRef.current = null;
                    setIsRecording(false);
                    setIsAstRecording(false);
                };

                recorder.onerror = (event: any) => {
                    showNotification(`Recording error: ${event.error.message}`, 'error');
                    setIsRecording(false);
                    setIsAstRecording(false);
                };

                recorder.start();
            })
            .catch(err => {
                showNotification(`Could not start recording: ${err.message}`, 'error');
                setIsRecording(false);
                setIsAstRecording(false);
            });
    };
    
    const webSpeech = useWebSpeech({
        onResult: (transcript, isFinal) => {
            setInputText(transcript);
            if (isFinal && isReverseTranslate.current) {
                performReverseTranslate(transcript);
                isReverseTranslate.current = false;
            }
        },
        onError: (error) => showNotification(t('notifications.speechRecognitionError', { error }), 'error'),
        onStart: () => {},
        onEnd: () => {
            setIsRecording(false);
            setIsAstRecording(false);
            isReverseTranslate.current = false;
        },
    });

    const stopAllRecordings = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        } else if (webSpeech.isListening) {
            webSpeech.stopRecognition();
        }
    }, [webSpeech]);

    const stopAllRecordingsRef = useRef(stopAllRecordings);
    useEffect(() => {
        stopAllRecordingsRef.current = stopAllRecordings;
    }, [stopAllRecordings]);

    useEffect(() => {
        if (isRecording || isAstRecording) {
            setRecordingCountdown(30);
            countdownTimerRef.current = window.setInterval(() => {
                setRecordingCountdown(prev => {
                    if (prev !== null && prev <= 1) {
                        if (countdownTimerRef.current) {
                            clearInterval(countdownTimerRef.current);
                            countdownTimerRef.current = null;
                        }
                        stopAllRecordingsRef.current();
                        return null;
                    }
                    return prev !== null ? prev - 1 : null;
                });
            }, 1000);
        } else {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
            setRecordingCountdown(null);
        }

        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
        };
    }, [isRecording, isAstRecording]);

    const handleToggleRecording = useCallback(() => {
        if (isRecording || (webSpeech.isListening && !isReverseTranslate.current)) {
            if (isOfflineAsrEnabled) {
                handleStopRecording();
            } else {
                webSpeech.stopRecognition();
            }
        } else {
            if (isAstRecording) handleStopRecording();
            
            if (sourceLang.code === 'auto') {
                showNotification(t('notifications.selectLanguageError'), 'info');
                return;
            }
            setIsRecording(true);
            setTranslatedText('');
            setInputText(isOfflineAsrEnabled ? t('translationInput.placeholderListening') : '');
            
            if (isOfflineAsrEnabled) {
                handleStartRecording(async (audioBlob) => {
                    setInputText(t('notifications.transcribing'));
                    try {
                        const audioData = await processAudioForTranscription(audioBlob, {
                            noiseSuppression: isNoiseCancellationEnabled,
                            gain: audioGainValue,
                        });
                        if (worker.current) {
                            worker.current.postMessage({
                                type: 'transcribe',
                                payload: { audio: audioData, language: sourceLang.code }
                            });
                        } else {
                            throw new Error('ASR Worker is not initialized.');
                        }
                    } catch (err) {
                        console.error(err);
                        setInputText('');
                        const message = err instanceof Error ? err.message : 'Transcription failed.';
                        showNotification(message, 'error');
                    }
                });
            } else { 
                webSpeech.startRecognition(sourceLang.code);
            }
        }
    }, [isRecording, isAstRecording, showNotification, t, sourceLang, isOfflineAsrEnabled, webSpeech, isNoiseCancellationEnabled, audioGainValue]);

    const handleToggleAstRecording = useCallback(() => {
        if (isAstRecording || (webSpeech.isListening && isReverseTranslate.current)) {
             if (isOfflineAsrEnabled) {
                handleStopRecording();
            } else {
                webSpeech.stopRecognition();
            }
        } else {
            if (isRecording) handleStopRecording();
            
            if (targetLang.code === 'auto') {
                showNotification(t('notifications.astSelectLanguage'), 'info');
                return;
            }

            setInputText('');
            setTranslatedText('');
            setIsAstRecording(true);
            isReverseTranslate.current = true;

            if (isOfflineAsrEnabled) {
                setInputText(t('translationInput.placeholderListening'));
                handleStartRecording(async (audioBlob) => {
                    setInputText(t('notifications.transcribing'));
                    try {
                        const audioData = await processAudioForTranscription(audioBlob, {
                            noiseSuppression: isNoiseCancellationEnabled,
                            gain: audioGainValue,
                        });
                        if (worker.current) {
                            worker.current.postMessage({
                                type: 'transcribe',
                                payload: { audio: audioData, language: targetLang.code }
                            });
                        } else {
                            throw new Error('ASR Worker is not initialized.');
                        }
                    } catch (err) {
                        console.error(err);
                        setInputText('');
                        isReverseTranslate.current = false;
                        const message = err instanceof Error ? err.message : 'Transcription failed.';
                        showNotification(message, 'error');
                    }
                });
            } else { 
                webSpeech.startRecognition(targetLang.code);
            }
        }
    }, [isAstRecording, isRecording, targetLang, showNotification, t, isOfflineAsrEnabled, webSpeech, isNoiseCancellationEnabled, audioGainValue]);

    const handleImageCaptured = useCallback(async (imageDataUrl: string) => {
        setIsCameraOpen(false);
        setIsLoading(true);
        setInputText(t('notifications.processingImage'));
        setTranslatedText('');

        try {
            if (isOfflineModeEnabled) {
                showNotification(t('notifications.offlineFeatureUnavailable'), 'info');
                setInputText('');
                return;
            }

            if (!isOnline) throw new Error(t('notifications.offlineImageTranslateError'));
            
            let result: { sourceText: string, translatedText: string };

            if (onlineProvider === 'openai') {
                if (!apiKey) throw new Error("OpenAI API Key is not set. Please add it in the settings.");
                if (!openaiApiUrl) throw new Error("OpenAI API URL is not set. Please add it in the settings.");
                result = await translateImageOpenAI(imageDataUrl, t(targetLang.name, { lng: 'en' }), apiKey, modelName, openaiApiUrl);
            } else { 
                if (!apiKey) throw new Error("Gemini API Key is not set. Please add it in the settings.");
                result = await translateImageGemini(imageDataUrl, t(targetLang.name, { lng: 'en' }), apiKey, modelName);
            }
            
            setInputText(result.sourceText);
            setTranslatedText(result.translatedText);

            const newHistoryItem: TranslationHistoryItem = {
                id: Date.now(), inputText: result.sourceText, translatedText: result.translatedText, sourceLang, targetLang,
            };
            setHistory(prevHistory => {
                const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50);
                localStorage.setItem('translation-history', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            showNotification(t('notifications.imageProcessingFailed', { errorMessage }), 'error');
            setInputText('');
        } finally {
            setIsLoading(false);
        }
    }, [isOfflineModeEnabled, isOnline, apiKey, modelName, targetLang, sourceLang, showNotification, onlineProvider, openaiApiUrl, t]);

    const handleSaveSettings = (
        newApiKey: string, 
        newModelName: string, 
        newOfflineModel: string, 
        newAsrModelId: string,
        isOfflineEnabled: boolean,
        newIsOfflineAsrEnabled: boolean,
        newOnlineProvider: string,
        newOpenaiApiUrl: string,
        newIsTtsEnabled: boolean,
        newTtsVoiceURI: string,
        newTtsRate: number,
        newTtsPitch: number,
        newIsTwoStepJpCn: boolean,
        newOfflineTemperature: number,
        newOfflineMaxTokens: number,
        newOfflinePresencePenalty: number,
        newOfflineFrequencyPenalty: number,
        newIsNoiseCancellationEnabled: boolean,
        newAudioGainValue: number
    ) => {
        setApiKey(newApiKey);
        setModelName(newModelName);
        setOnlineProvider(newOnlineProvider);
        setOpenaiApiUrl(newOpenaiApiUrl);
        setOfflineModelName(newOfflineModel);
        setAsrModelId(newAsrModelId);
        setIsOfflineModeEnabled(isOfflineEnabled);
        setIsOfflineAsrEnabled(newIsOfflineAsrEnabled);
        setIsTwoStepJpCn(newIsTwoStepJpCn);
        setIsOfflineTtsEnabled(newIsTtsEnabled);
        setOfflineTtsVoiceURI(newTtsVoiceURI);
        setOfflineTtsRate(newTtsRate);
        setOfflineTtsPitch(newTtsPitch);
        setOfflineTemperature(newOfflineTemperature);
        setOfflineMaxTokens(newOfflineMaxTokens);
        setOfflinePresencePenalty(newOfflinePresencePenalty);
        setOfflineFrequencyPenalty(newOfflineFrequencyPenalty);
        setIsNoiseCancellationEnabled(newIsNoiseCancellationEnabled);
        setAudioGainValue(newAudioGainValue);
        
        localStorage.setItem('api-key', newApiKey);
        localStorage.setItem('model-name', newModelName);
        localStorage.setItem('online-provider', newOnlineProvider);
        localStorage.setItem('openai-api-url', newOpenaiApiUrl);
        localStorage.setItem('offline-model-name', newOfflineModel);
        localStorage.setItem('asr-model-id', newAsrModelId);
        localStorage.setItem('offline-mode-enabled', JSON.stringify(isOfflineEnabled));
        localStorage.setItem('is-offline-asr-enabled', JSON.stringify(newIsOfflineAsrEnabled));
        localStorage.setItem('is-two-step-jp-cn-enabled', JSON.stringify(newIsTwoStepJpCn));
        localStorage.setItem('tts-enabled', JSON.stringify(newIsTtsEnabled));
        localStorage.setItem('tts-voice-uri', newTtsVoiceURI);
        localStorage.setItem('tts-rate', JSON.stringify(newTtsRate));
        localStorage.setItem('tts-pitch', JSON.stringify(newTtsPitch));
        localStorage.setItem('offline-temperature', newOfflineTemperature.toString());
        localStorage.setItem('offline-max-tokens', newOfflineMaxTokens.toString());
        localStorage.setItem('offline-presence-penalty', newOfflinePresencePenalty.toString());
        localStorage.setItem('offline-frequency-penalty', newOfflineFrequencyPenalty.toString());
        localStorage.setItem('is-noise-cancellation-enabled', JSON.stringify(newIsNoiseCancellationEnabled));
        localStorage.setItem('audio-gain-value', JSON.stringify(newAudioGainValue));
    };

    const handleSelectHistory = (item: TranslationHistoryItem) => {
        setInputText(item.inputText);
        setTranslatedText(item.translatedText);
        setSourceLang(item.sourceLang);
        setTargetLang(item.targetLang);
        setIsHistoryOpen(false);
    };

    const handleClearHistory = () => {
        setHistory([]);
        localStorage.removeItem('translation-history');
    };
    
    const handleClearCache = async () => {
        try {
            await clearAllOfflineCache(customModels);
            setCustomModels([]);
            localStorage.removeItem('custom-offline-models');
            setCachedModels(new Set());
            showNotification(t('notifications.cacheCleared'), 'success');
            setIsOfflineModelInitialized(false);
            setOfflineModelName('');
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            showNotification(t(message), 'info');
        }
    }
    
    const handleDownloadModel = async (modelId: string) => {
        if (isOfflineModelInitializing) {
            showNotification(t('notifications.downloadInProgress'), 'info');
            return;
        }
        setIsOfflineModelInitializing(true);
        setLoadingModelId(modelId);
        try {
            await initializeOfflineModel(modelId, customModels, handleModelLoadingProgress);
            setCachedModels(prev => new Set(prev).add(modelId));
            showNotification(t('notifications.modelDownloaded', { modelId }), 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : t('notifications.offlineModelInitFailed');
            showNotification(message, 'error');
        } finally {
            setIsOfflineModelInitializing(false);
            setLoadingModelId(null);
            setModelLoadingProgress({ text: '', progress: 0 });
        }
    };

    const handleDeleteModel = async (modelId: string) => {
        try {
            if (isOfflineModelInitialized && offlineModelName === modelId) {
                await unloadOfflineModel();
                setIsOfflineModelInitialized(false);
            }
            await deleteOfflineModel(modelId);
            setCachedModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
            });
            showNotification(t('notifications.modelDownloaded', { modelId }), 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            showNotification(message, 'error');
        }
    };
    
    const handleLoadCustomModel = useCallback(async (modelUrl: string, modelLibUrl: string) => {
        if (!modelUrl || !modelLibUrl) {
            showNotification(t('notifications.customModelUrlError'), 'error');
            return;
        }
        if (isOfflineModelInitializing) {
            showNotification(t('notifications.downloadInProgress'), 'info');
            return;
        }
    
        const modelId = modelUrl.substring(modelUrl.lastIndexOf('/') + 1);
        const name = modelId;
    
        setIsOfflineModelInitializing(true);
        setLoadingModelId(modelId);
        try {
            const newCustomModel = { id: modelId, name, modelUrl, modelLibUrl };
            const updatedCustomModels = customModels.some(m => m.id === modelId)
                ? customModels.map(m => m.id === modelId ? newCustomModel : m)
                : [...customModels, newCustomModel];
    
            await initializeOfflineModel(modelId, updatedCustomModels, handleModelLoadingProgress);
    
            setCustomModels(updatedCustomModels);
            localStorage.setItem('custom-offline-models', JSON.stringify(updatedCustomModels));
            setCachedModels(prev => new Set(prev).add(modelId));
            setOfflineModelName(modelId);
            setIsOfflineModeEnabled(true);
            showNotification(t('notifications.modelDownloaded', { modelId: name }), 'success');
            setIsSettingsOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('notifications.offlineModelInitFailed');
            showNotification(message, 'error');
        } finally {
            setIsOfflineModelInitializing(false);
            setLoadingModelId(null);
            setModelLoadingProgress({ text: '', progress: 0 });
        }
    }, [customModels, isOfflineModelInitializing, handleModelLoadingProgress, showNotification, t]);
    
    const handleDeleteCustomModel = useCallback(async (modelId: string) => {
        try {
            const updatedCustomModels = customModels.filter(m => m.id !== modelId);
            setCustomModels(updatedCustomModels);
            localStorage.setItem('custom-offline-models', JSON.stringify(updatedCustomModels));
    
            if (isOfflineModelInitialized && offlineModelName === modelId) {
                await unloadOfflineModel();
                setIsOfflineModelInitialized(false);
                setOfflineModelName('');
            }
    
            const customModelToDelete = customModels.find(m => m.id === modelId);
            await deleteOfflineModel(modelId, customModelToDelete);
    
            setCachedModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
            });
    
            showNotification(t('notifications.modelDeleted', { modelId }), 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            showNotification(message, 'error');
        }
    }, [customModels, isOfflineModelInitialized, offlineModelName, showNotification, t]);

    const handleDownloadAsrModel = useCallback(async (modelId: string) => {
        if (isAsrInitializing || !worker.current) return;
        
        const model = ASR_MODELS.find(m => m.id === modelId);
        if (!model) {
            showNotification(`ASR model ${modelId} not found.`, 'error');
            return;
        }
        
        setIsAsrInitializing(true);
        setAsrLoadingProgress({ file: '', progress: 0 });
        worker.current.postMessage({
            type: 'load',
            payload: { modelId: model.id, quantization: model.quantization }
        });
    }, [isAsrInitializing, showNotification]);

    const handleClearAsrCache = useCallback(async () => {
        try {
            setIsAsrInitialized(false);
            await clearAsrCache();
            await checkAllAsrCacheStatus();
            showNotification(t('notifications.asrModelDeleted'), 'success');
            initializeWorker();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            showNotification(message, 'error');
        }
    }, [checkAllAsrCacheStatus, showNotification, t, initializeWorker]);


    return (
        <div className="bg-slate-100 h-full flex flex-col">
             <div className="w-full h-full max-w-6xl mx-auto flex-grow flex flex-col landscape:flex-row p-2 landscape:p-4 gap-4">
                <main className="flex-1 landscape:h-full flex flex-col min-h-0 min-w-0">
                     <TranslationOutput
                        translatedText={translatedText}
                        targetLang={targetLang}
                        setTargetLang={setTargetLang}
                        sourceLang={sourceLang}
                        isLoading={isLoading}
                        onSpeak={handleSpeak}
                        onSwapLanguages={handleSwapLanguages}
                        onOpenHistory={() => setIsHistoryOpen(true)}
                        onClearText={() => setTranslatedText('')}
                        isOfflineModeEnabled={isOfflineModeEnabled}
                        isOfflineModelInitializing={isOfflineModelInitializing}
                        isOfflineModelReady={isOfflineModelReady}
                        offlineModelName={offlineModelName}
                        isSpeaking={isSpeaking}
                        speakingGender={speakingGender}
                        onlineProvider={onlineProvider}
                        isOfflineTtsEnabled={isOfflineTtsEnabled}
                        isAstRecording={isAstRecording || (webSpeech.isListening && isReverseTranslate.current)}
                        onToggleAstRecording={handleToggleAstRecording}
                        isOfflineAsrEnabled={isOfflineAsrEnabled}
                        isAsrInitialized={isAsrInitialized}
                        isAsrInitializing={isAsrInitializing}
                        asrLoadingProgress={asrLoadingProgress}
                        asrModelId={asrModelId}
                     />
                </main>
    
                <div className="flex-1 landscape:h-full flex flex-col min-h-0 min-w-0">
                    <TranslationInput
                        inputText={inputText}
                        setInputText={setInputText}
                        sourceLang={sourceLang}
                        setSourceLang={setSourceLang}
                        isLoading={isLoading || isOfflineModelInitializing || isAsrInitializing}
                        onTranslate={handleTranslate}
                        onCancel={handleCancelTranslation}
                        isRecording={isRecording}
                        onToggleRecording={handleToggleRecording}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        isOnline={isOnline}
                        isOfflineModeEnabled={isOfflineModeEnabled}
                        isOfflineModelReady={isOfflineModelReady}
                        isOfflineAsrEnabled={isOfflineAsrEnabled}
                        isAsrInitialized={isAsrInitialized}
                        asrModelId={asrModelId}
                        isListening={webSpeech.isListening && !isReverseTranslate.current}
                        recordingCountdown={recordingCountdown}
                    />
                </div>
            </div>
            
            {notification && (
                <div 
                    className={`fixed top-5 left-1/2 -translate-x-1/2 px-4 py-3 rounded z-20 shadow-lg text-white ${
                        notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} 
                    role="alert"
                >
                    {notification.message}
                </div>
            )}

            {isCameraOpen && <CameraView onClose={() => setIsCameraOpen(false)} onImageCaptured={handleImageCaptured} />}
            
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                currentApiKey={apiKey}
                currentModelName={modelName}
                currentOnlineProvider={onlineProvider}
                currentOpenaiApiUrl={openaiApiUrl}
                currentOfflineModelName={offlineModelName}
                currentIsOfflineModeEnabled={isOfflineModeEnabled}
                currentIsOfflineAsrEnabled={isOfflineAsrEnabled}
                currentAsrModelId={asrModelId}
                currentIsTwoStepJpCnEnabled={isTwoStepJpCn}
                modelLoadingProgress={modelLoadingProgress}
                isOfflineModelInitializing={isOfflineModelInitializing}
                onClearCache={handleClearCache}
                voices={voices}
                targetLang={targetLang}
                currentIsOfflineTtsEnabled={isOfflineTtsEnabled}
                currentOfflineTtsVoiceURI={offlineTtsVoiceURI}
                currentOfflineTtsRate={offlineTtsRate}
                currentOfflineTtsPitch={offlineTtsPitch}
                cachedModels={cachedModels}
                customModels={customModels}
                onDownloadModel={handleDownloadModel}
                loadingModelId={loadingModelId}
                onDeleteModel={handleDeleteModel}
                onLoadCustomModel={handleLoadCustomModel}
                onDeleteCustomModel={handleDeleteCustomModel}
                currentOfflineTemperature={offlineTemperature}
                currentOfflineMaxTokens={offlineMaxTokens}
                currentOfflinePresencePenalty={offlinePresencePenalty}
                currentOfflineFrequencyPenalty={offlineFrequencyPenalty}
                asrModelsCacheStatus={asrModelsCacheStatus}
                isAsrInitializing={isAsrInitializing}
                asrLoadingProgress={asrLoadingProgress}
                onDownloadAsrModel={handleDownloadAsrModel}
                onClearAsrCache={handleClearAsrCache}
                currentIsNoiseCancellationEnabled={isNoiseCancellationEnabled}
                currentAudioGainValue={audioGainValue}
            />

            <HistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
                onSelectHistory={handleSelectHistory}
                onClearHistory={handleClearHistory}
            />
        </div>
    );
};

export default App;