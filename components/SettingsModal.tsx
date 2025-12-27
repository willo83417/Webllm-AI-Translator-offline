

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, TrashIcon } from './icons';
import { OFFLINE_MODELS, ASR_MODELS, OCR_MODELS } from '../constants';
import type { Language, ModelLoadingProgress, CustomOfflineModel, OcrEngineStatus, OcrModelConfig } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        apiKey: string, 
        modelName: string, 
        offlineModelName: string,
        asrModelId: string,
        isOfflineEnabled: boolean,
        isOfflineAsrEnabled: boolean,
        isWebSpeechApiEnabled: boolean,
        onlineProvider: string,
        openaiApiUrl: string,
        isOfflineTtsEnabled: boolean,
        offlineTtsVoiceURI: string,
        offlineTtsRate: number,
        offlineTtsPitch: number,
        isTwoStepJpCnEnabled: boolean,
        offlineTemperature: number,
        offlineMaxTokens: number,
        offlinePresencePenalty: number,
        offlineFrequencyPenalty: number,
        isNoiseCancellationEnabled: boolean,
        audioGainValue: number,
        selectedOcrModel: keyof typeof OCR_MODELS
    ) => void;
    currentApiKey: string;
    currentModelName: string;
    currentOnlineProvider: string;
    currentOpenaiApiUrl: string;
    currentOfflineModelName: string;
    currentIsOfflineModeEnabled: boolean;
    currentIsOfflineAsrEnabled: boolean;
    currentIsWebSpeechApiEnabled: boolean;
    currentAsrModelId: string;
    currentIsTwoStepJpCnEnabled: boolean;
    modelLoadingProgress: ModelLoadingProgress;
    isOfflineModelInitializing: boolean;
    onClearCache: () => void;
    voices: SpeechSynthesisVoice[];
    targetLang: Language;
    currentIsOfflineTtsEnabled: boolean;
    currentOfflineTtsVoiceURI: string;
    currentOfflineTtsRate: number;
    currentOfflineTtsPitch: number;
    cachedModels: Set<string>;
    customModels: CustomOfflineModel[];
    onDownloadModel: (modelId: string) => void;
    loadingModelId: string | null;
    onDeleteModel: (modelId: string) => void;
    onLoadCustomModel: (modelUrl: string, modelLibUrl: string) => void;
    onDeleteCustomModel: (modelId: string) => void;
    currentOfflineTemperature: number;
    currentOfflineMaxTokens: number;
    currentOfflinePresencePenalty: number;
    currentOfflineFrequencyPenalty: number;
    asrModelsCacheStatus: Record<string, boolean>;
    isAsrInitializing: boolean;
    asrLoadingProgress: { file: string; progress: number };
    onDownloadAsrModel: (modelId: string) => void;
    onClearAsrCache: () => void;
    currentIsNoiseCancellationEnabled: boolean;
    currentAudioGainValue: number;
    // OCR Props
    ocrEngineStatus: OcrEngineStatus;
    onInitializeOcr: (modelConfig: OcrModelConfig) => Promise<void>;
    currentSelectedOcrModel: keyof typeof OCR_MODELS;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    currentApiKey,
    currentModelName,
    currentOnlineProvider,
    currentOpenaiApiUrl,
    currentOfflineModelName,
    currentIsOfflineModeEnabled,
    currentIsOfflineAsrEnabled,
    currentIsWebSpeechApiEnabled,
    currentAsrModelId,
    currentIsTwoStepJpCnEnabled,
    modelLoadingProgress,
    isOfflineModelInitializing,
    onClearCache,
    voices,
    targetLang,
    currentIsOfflineTtsEnabled,
    currentOfflineTtsVoiceURI,
    currentOfflineTtsRate,
    currentOfflineTtsPitch,
    cachedModels,
    customModels,
    onDownloadModel,
    loadingModelId,
    onDeleteModel,
    onLoadCustomModel,
    onDeleteCustomModel,
    currentOfflineTemperature,
    currentOfflineMaxTokens,
    currentOfflinePresencePenalty,
    currentOfflineFrequencyPenalty,
    asrModelsCacheStatus,
    isAsrInitializing,
    asrLoadingProgress,
    onDownloadAsrModel,
    onClearAsrCache,
    currentIsNoiseCancellationEnabled,
    currentAudioGainValue,
    ocrEngineStatus,
    onInitializeOcr,
    currentSelectedOcrModel,
}) => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('online');
    const [activeOfflineTab, setActiveOfflineTab] = useState('models');

    const [apiKey, setApiKey] = useState(currentApiKey);
    const [modelName, setModelName] = useState(currentModelName);
    const [onlineProvider, setOnlineProvider] = useState(currentOnlineProvider);
    const [openaiApiUrl, setOpenaiApiUrl] = useState(currentOpenaiApiUrl);
    const [offlineModelName, setOfflineModelName] = useState(currentOfflineModelName);
    const [isOfflineEnabled, setIsOfflineEnabled] = useState(currentIsOfflineModeEnabled);
    const [isOfflineAsrEnabled, setIsOfflineAsrEnabled] = useState(currentIsOfflineAsrEnabled);
    const [isWebSpeechApiEnabled, setIsWebSpeechApiEnabled] = useState(currentIsWebSpeechApiEnabled);
    const [asrModelId, setAsrModelId] = useState(currentAsrModelId);
    const [isTwoStepJpCnEnabled, setIsTwoStepJpCnEnabled] = useState(currentIsTwoStepJpCnEnabled);
    
    const [customModelUrl, setCustomModelUrl] = useState('');
    const [customModelLibUrl, setCustomModelLibUrl] = useState('');

    // Offline TTS State
    const [isOfflineTtsEnabled, setIsOfflineTtsEnabled] = useState(currentIsOfflineTtsEnabled);
    const [offlineTtsVoiceURI, setOfflineTtsVoiceURI] = useState(currentOfflineTtsVoiceURI);
    const [offlineTtsRate, setOfflineTtsRate] = useState(currentOfflineTtsRate);
    const [offlineTtsPitch, setOfflineTtsPitch] = useState(currentOfflineTtsPitch);
    const [filteredVoices, setFilteredVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Offline Model Params State
    const [offlineTemperature, setOfflineTemperature] = useState(currentOfflineTemperature);
    const [offlineMaxTokens, setOfflineMaxTokens] = useState(currentOfflineMaxTokens);
    const [offlinePresencePenalty, setOfflinePresencePenalty] = useState(currentOfflinePresencePenalty);
    const [offlineFrequencyPenalty, setOfflineFrequencyPenalty] = useState(currentOfflineFrequencyPenalty);

    // Offline ASR Audio Processing State
    const [isNoiseCancellationEnabled, setIsNoiseCancellationEnabled] = useState(currentIsNoiseCancellationEnabled);
    const [audioGainValue, setAudioGainValue] = useState(currentAudioGainValue);
    
    // OCR State
    const [selectedOcrModel, setSelectedOcrModel] = useState(currentSelectedOcrModel);

    useEffect(() => {
        if (isOpen) {
            setApiKey(currentApiKey);
            setModelName(currentModelName);
            setOnlineProvider(currentOnlineProvider);
            setOpenaiApiUrl(currentOpenaiApiUrl);
            setOfflineModelName(currentOfflineModelName);
            setIsOfflineEnabled(currentIsOfflineModeEnabled);
            setIsOfflineAsrEnabled(currentIsOfflineAsrEnabled);
            setIsWebSpeechApiEnabled(currentIsWebSpeechApiEnabled);
            setAsrModelId(currentAsrModelId);
            setIsTwoStepJpCnEnabled(currentIsTwoStepJpCnEnabled);
            setIsOfflineTtsEnabled(currentIsOfflineTtsEnabled);
            setOfflineTtsVoiceURI(currentOfflineTtsVoiceURI);
            setOfflineTtsRate(currentOfflineTtsRate);
            setOfflineTtsPitch(currentOfflineTtsPitch);
            setOfflineTemperature(currentOfflineTemperature);
            setOfflineMaxTokens(currentOfflineMaxTokens);
            setOfflinePresencePenalty(currentOfflinePresencePenalty);
            setOfflineFrequencyPenalty(currentOfflineFrequencyPenalty);
            setIsNoiseCancellationEnabled(currentIsNoiseCancellationEnabled);
            setAudioGainValue(currentAudioGainValue);
            setSelectedOcrModel(currentSelectedOcrModel);
        }
    }, [
        isOpen, currentApiKey, currentModelName, currentOnlineProvider, currentOpenaiApiUrl, 
        currentOfflineModelName, currentIsOfflineModeEnabled, currentIsOfflineAsrEnabled, currentIsWebSpeechApiEnabled, currentAsrModelId,
        currentIsTwoStepJpCnEnabled, currentIsOfflineTtsEnabled, currentOfflineTtsVoiceURI, currentOfflineTtsRate, 
        currentOfflineTtsPitch, currentOfflineTemperature, currentOfflineMaxTokens, currentOfflinePresencePenalty, 
        currentOfflineFrequencyPenalty, currentIsNoiseCancellationEnabled, currentAudioGainValue, currentSelectedOcrModel
    ]);
    
    useEffect(() => {
        if (isOpen && voices.length > 0 && targetLang) {
            const langVoices = voices.filter(v => v.lang.startsWith(targetLang.code));
            setFilteredVoices(langVoices);
            // If the currently selected voice is not compatible with the new target language, reset it.
            if (offlineTtsVoiceURI && !langVoices.some(v => v.voiceURI === offlineTtsVoiceURI)) {
                setOfflineTtsVoiceURI(langVoices[0]?.voiceURI || '');
            }
        }
    }, [isOpen, voices, targetLang, offlineTtsVoiceURI]);

    if (!isOpen) return null;

    const allOfflineModels = [
        ...OFFLINE_MODELS.map(model => ({
            name: model.name,
            value: model.value,
            // type determines UI behavior
            type: model.isCustom ? 'predefined-custom' : 'prebuilt',
        })),
        ...customModels.map(model => ({
            name: `${model.name} (Custom)`,
            value: model.id,
            type: 'user-custom',
        }))
    ];
    
    const handleSave = () => {
        onSave(
            apiKey, modelName, offlineModelName, asrModelId, isOfflineEnabled, isOfflineAsrEnabled, isWebSpeechApiEnabled, onlineProvider, openaiApiUrl,
            isOfflineTtsEnabled, offlineTtsVoiceURI, offlineTtsRate, offlineTtsPitch, isTwoStepJpCnEnabled,
            offlineTemperature, offlineMaxTokens, offlinePresencePenalty, offlineFrequencyPenalty,
            isNoiseCancellationEnabled, audioGainValue, selectedOcrModel
        );
        onClose();
    };

    const handleClear = () => {
        setApiKey('');
        setModelName('gemini-2.5-flash');
        setOnlineProvider('gemini');
        setOpenaiApiUrl('');
        setOfflineModelName('');
        setAsrModelId(ASR_MODELS[0].id);
        setIsOfflineEnabled(false);
        setIsOfflineAsrEnabled(false);
        setIsWebSpeechApiEnabled(true);
        setIsTwoStepJpCnEnabled(false);
        setIsOfflineTtsEnabled(false);
        setOfflineTtsVoiceURI('');
        setOfflineTtsRate(1);
        setOfflineTtsPitch(1);
        setOfflineTemperature(0.3);
        setOfflineMaxTokens(2048);
        setOfflinePresencePenalty(0.1);
        setOfflineFrequencyPenalty(0.1);
        setIsNoiseCancellationEnabled(false);
        setAudioGainValue(1.0);
        setCustomModelUrl('');
        setCustomModelLibUrl('');
        setSelectedOcrModel('ch_v5');

        onClearCache();
        onClearAsrCache();
        onSave('', 'gemini-2.5-flash', '', ASR_MODELS[0].id, false, false, true, 'gemini', '', false, '', 1, 1, false, 0.3, 2048, 0.1, 0.1, false, 1.0, 'ch_v5');
    };
    
    const handleLoadOcrModel = async () => {
        const modelConfig = {
            key: selectedOcrModel,
            ...OCR_MODELS[selectedOcrModel].paths,
        };
        await onInitializeOcr(modelConfig);
    };

    const handleLlmModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOfflineModelName(e.target.value);
    };

    const handleAsrModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAsrModelId(e.target.value);
    };

    const TabButton: React.FC<{tabName: string; label: string}> = ({tabName, label}) => (
        <button
           onClick={() => setActiveTab(tabName)}
           className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none ${
               activeTab === tabName
                   ? 'bg-blue-100 text-blue-700'
                   : 'text-gray-500 hover:text-gray-700'
           }`}
           aria-selected={activeTab === tabName}
           role="tab"
       >
           {label}
       </button>
   );

    const FloatInput: React.FC<{id: string, label: string, value: number, onChange: (val: number) => void, min: number, max: number, step: number}> = ({ id, label, value, onChange, min, max, step }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="number"
                id={id}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
    );

    const ToggleSwitch: React.FC<{id: string, isEnabled: boolean, setIsEnabled: (enabled: boolean) => void, title: string, description: string, disabled?: boolean}> = ({ id, isEnabled, setIsEnabled, title, description, disabled = false }) => (
        <div className="flex items-center justify-between">
            <label htmlFor={id} className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {title}
                <span className={`block text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>{description}</span>
            </label>
            <button
                id={id}
                onClick={() => !disabled && setIsEnabled(!isEnabled)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                role="switch"
                aria-checked={isEnabled}
                disabled={disabled}
            >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
        </div>
    );
    
    const SubTabButton: React.FC<{tabName: string; label: string}> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveOfflineTab(tabName)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex-1 text-center ${
                activeOfflineTab === tabName
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-selected={activeOfflineTab === tabName}
            role="tab"
        >
            {label}
        </button>
    );

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div className="bg-white rounded-lg shadow-xl h-full w-full max-w-md overflow-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 id="settings-title" className="text-xl font-semibold text-gray-800">{t('settings.title')}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('settings.closeAriaLabel')}>
                            <XIcon />
                        </button>
                    </div>
                    <div>
                        <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.languageLabel')}</label>
                        <select
                            id="language-select"
                            value={i18n.language}
                            onChange={(e) => i18n.changeLanguage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="zh-TW">繁體中文</option>
                        </select>
                    </div>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="flex space-x-2 p-2" role="tablist" aria-label="Settings tabs">
                       <TabButton tabName="online" label={t('settings.tabOnline')} />
                       <TabButton tabName="offline" label={t('settings.tabOffline')} />
                       <TabButton tabName="speech" label={t('settings.tabSpeech')} />
                       <TabButton tabName="ocr" label={t('settings.tabOcr')} />
                    </nav>
                </div>

                <div className="p-6 space-y-6 min-h-[350px]">
                    {activeTab === 'online' && (
                        <div role="tabpanel" id="online-settings" aria-labelledby="online-tab" className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.providerLabel')}</label>
                                <div className="flex space-x-4">
                                    <div className="flex items-center">
                                        <input id="provider-gemini" name="online-provider" type="radio" value="gemini" checked={onlineProvider === 'gemini'} onChange={(e) => setOnlineProvider(e.target.value)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                        <label htmlFor="provider-gemini" className="ml-2 block text-sm text-gray-900">{t('settings.providerGemini')}</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input id="provider-openai" name="online-provider" type="radio" value="openai" checked={onlineProvider === 'openai'} onChange={(e) => setOnlineProvider(e.target.value)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                        <label htmlFor="provider-openai" className="ml-2 block text-sm text-gray-900">{t('settings.providerOpenAI')}</label>
                                    </div>
                                </div>
                            </div>
                            {onlineProvider === 'openai' && (
                                <div>
                                    <label htmlFor="openai-api-url" className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.openaiUrlLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        id="openai-api-url"
                                        value={openaiApiUrl}
                                        onChange={(e) => setOpenaiApiUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={t('settings.openaiUrlPlaceholder')}
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('settings.apiKeyLabel')}
                                </label>
                                <input
                                    type="password"
                                    id="api-key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={t('settings.apiKeyPlaceholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="model-name" className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('settings.modelNameLabel')}
                                </label>
                                <input
                                    type="text"
                                    id="model-name"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    placeholder={onlineProvider === 'gemini' ? t('settings.modelNameGeminiPlaceholder') : t('settings.modelNameOpenAIPlaceholder')}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'offline' && (
                        <div role="tabpanel" id="offline-settings" aria-labelledby="offline-tab" className="space-y-6">
                            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1" role="tablist" aria-label="Offline LLM settings">
                                <SubTabButton tabName="models" label={t('settings.subTabModels')} />
                                <SubTabButton tabName="params" label={t('settings.subTabParameters')} />
                            </div>

                            {activeOfflineTab === 'models' && (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">{t('settings.manageModelsLabel')}</label>
                                        {allOfflineModels.map(model => {
                                            const isCached = cachedModels.has(model.value);
                                            const isLoadingThisModel = loadingModelId === model.value;

                                            return (
                                                <div key={model.value} className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                id={`model-${model.value}`}
                                                                name="offline-model-selection"
                                                                value={model.value}
                                                                checked={offlineModelName === model.value}
                                                                onChange={handleLlmModelSelect}
                                                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor={`model-${model.value}`} className="ml-3 text-sm font-medium text-gray-800">
                                                                {model.name}
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            {!isLoadingThisModel && (
                                                                isCached ? (
                                                                    <>
                                                                        <span className="text-sm font-medium text-green-600">{t('settings.modelCached')}</span>
                                                                        <button
                                                                            onClick={() => model.type === 'user-custom' ? onDeleteCustomModel(model.value) : onDeleteModel(model.value)}
                                                                            className="text-gray-400 hover:text-red-500"
                                                                            aria-label={t('settings.deleteModelAriaLabel', { modelName: model.name })}
                                                                        >
                                                                            <TrashIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    model.type !== 'user-custom' && (
                                                                        <button 
                                                                            onClick={() => onDownloadModel(model.value)} 
                                                                            disabled={isOfflineModelInitializing}
                                                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-wait"
                                                                        >
                                                                            {t('settings.modelDownload')}
                                                                        </button>
                                                                    )
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isLoadingThisModel && (
                                                        <div className="pt-1 text-center text-sm text-blue-600">
                                                            {modelLoadingProgress.text || t('settings.modelDownloading')}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-4 border-t pt-4">
                                        <h3 className="text-sm font-medium text-gray-700">{t('settings.addCustomModelTitle')}</h3>
                                        <div>
                                            <label htmlFor="custom-model-url" className="block text-xs font-medium text-gray-600 mb-1">{t('settings.customModelUrlLabel')}</label>
                                            <input type="text" id="custom-model-url" value={customModelUrl} onChange={e => setCustomModelUrl(e.target.value)} placeholder={t('settings.customModelUrlPlaceholder')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                                        </div>
                                         <div>
                                            <label htmlFor="custom-model-lib-url" className="block text-xs font-medium text-gray-600 mb-1">{t('settings.customModelLibUrlLabel')}</label>
                                            <input type="text" id="custom-model-lib-url" value={customModelLibUrl} onChange={e => setCustomModelLibUrl(e.target.value)} placeholder={t('settings.customModelLibUrlPlaceholder')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                                        </div>
                                        <button
                                            onClick={() => onLoadCustomModel(customModelUrl, customModelLibUrl)}
                                            disabled={isOfflineModelInitializing || !customModelUrl || !customModelLibUrl}
                                            className="w-full text-sm font-medium text-blue-600 py-2 px-4 rounded-lg border border-blue-200 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            {t('settings.addCustomModelButton')}
                                        </button>
                                    </div>
                                    
                                     <div>
                                        <button
                                            onClick={onClearCache}
                                            className="w-full flex items-center justify-center space-x-2 text-red-600 font-medium py-2 px-4 rounded-lg border border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                            <span>{t('settings.clearCacheButton')}</span>
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1">{t('settings.clearCacheDescription')}</p>
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <ToggleSwitch 
                                            id="offline-toggle"
                                            isEnabled={isOfflineEnabled}
                                            setIsEnabled={setIsOfflineEnabled}
                                            title={t('settings.enableOfflineLabel')}
                                            description={t('settings.enableOfflineDescription')}
                                        />
                                        <ToggleSwitch 
                                            id="twostep-toggle"
                                            isEnabled={isTwoStepJpCnEnabled}
                                            setIsEnabled={setIsTwoStepJpCnEnabled}
                                            title={t('settings.enableTwoStepLabel')}
                                            description={t('settings.enableTwoStepDescription')}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeOfflineTab === 'params' && (
                                 <div className="space-y-6">
                                     <FloatInput id="temperature" label={t('settings.temperatureLabel')} value={offlineTemperature} onChange={setOfflineTemperature} min={0} max={2} step={0.1} />
                                     <FloatInput id="max-tokens" label={t('settings.maxTokensLabel')} value={offlineMaxTokens} onChange={setOfflineMaxTokens} min={1} max={4096} step={1} />
                                     <FloatInput id="presence-penalty" label={t('settings.presencePenaltyLabel')} value={offlinePresencePenalty} onChange={setOfflinePresencePenalty} min={-2} max={2} step={0.1} />
                                     <FloatInput id="frequency-penalty" label={t('settings.frequencyPenaltyLabel')} value={offlineFrequencyPenalty} onChange={setOfflineFrequencyPenalty} min={-2} max={2} step={0.1} />
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'speech' && (
                         <div role="tabpanel" id="speech-settings" aria-labelledby="speech-tab" className="space-y-6">
                            <ToggleSwitch
                                id="web-speech-toggle"
                                isEnabled={isWebSpeechApiEnabled}
                                setIsEnabled={setIsWebSpeechApiEnabled}
                                title={t('settings.enableWebSpeechLabel')}
                                description={t('settings.enableWebSpeechDescription')}
                                disabled={isOfflineAsrEnabled}
                             />
                             <div className="border-t border-gray-200"></div>
                             <ToggleSwitch
                                id="asr-toggle"
                                isEnabled={isOfflineAsrEnabled}
                                setIsEnabled={(enabled) => {
                                    setIsOfflineAsrEnabled(enabled);
                                    // If enabling offline ASR, disable web speech API
                                    if (enabled) setIsWebSpeechApiEnabled(false);
                                }}
                                title={t('settings.enableOfflineAsrLabel')}
                                description={t('settings.enableOfflineAsrDescription')}
                             />
                            {/* ASR Model Management */}
                            <div className={`space-y-3 transition-opacity ${!isOfflineAsrEnabled ? 'opacity-50' : ''}`}>
                                <label className={`block text-sm font-medium ${!isOfflineAsrEnabled ? 'text-gray-400' : 'text-gray-700'}`}>{t('settings.asrModelLabel')}</label>
                                {ASR_MODELS.map(model => {
                                    const isCached = asrModelsCacheStatus[model.id] || false;
                                    const isLoadingThisModel = isAsrInitializing && asrModelId === model.id;
                                    return (
                                        <div key={model.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id={`asr-model-${model.id}`}
                                                        name="asr-model-selection"
                                                        value={model.id}
                                                        checked={asrModelId === model.id}
                                                        onChange={handleAsrModelSelect}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        disabled={!isOfflineAsrEnabled}
                                                    />
                                                    <label htmlFor={`asr-model-${model.id}`} className={`ml-3 text-sm font-medium ${!isOfflineAsrEnabled ? 'text-gray-400' : 'text-gray-800'}`}>
                                                        {model.name} <span className="text-gray-500 font-normal">({model.size})</span>
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {!isLoadingThisModel && (
                                                        isCached ? (
                                                            <span className="text-sm font-medium text-green-600">{t('settings.modelCached')}</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => onDownloadAsrModel(model.id)}
                                                                disabled={isAsrInitializing || !isOfflineAsrEnabled}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                {t('settings.modelDownload')}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            {isLoadingThisModel && (
                                                <div className="pt-1 text-center text-sm text-blue-600">
                                                    {asrLoadingProgress.file} ({Math.round(asrLoadingProgress.progress)}%)
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                 <div>
                                    <button
                                        onClick={onClearAsrCache}
                                        disabled={!isOfflineAsrEnabled}
                                        className="w-full flex items-center justify-center space-x-2 text-red-600 font-medium py-2 px-4 rounded-lg border border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                        <span>{t('settings.clearAsrCacheButton')}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-200"></div>

                            {/* Audio Processing Settings */}
                             <div className={`space-y-4 transition-opacity ${!isOfflineAsrEnabled ? 'opacity-50' : ''}`}>
                                <label className={`block text-sm font-medium -mb-2 ${!isOfflineAsrEnabled ? 'text-gray-400' : 'text-gray-700'}`}>{t('settings.audioProcessingLabel')}</label>
                                 <ToggleSwitch
                                    id="noise-cancellation-toggle"
                                    isEnabled={isNoiseCancellationEnabled}
                                    setIsEnabled={setIsNoiseCancellationEnabled}
                                    title={t('settings.enableNoiseCancellationLabel')}
                                    description={t('settings.enableNoiseCancellationDescription')}
                                    disabled={!isOfflineAsrEnabled}
                                 />
                                 <div>
                                    <label htmlFor="gain-slider" className={`flex justify-between items-center text-sm font-medium mb-1 ${!isOfflineAsrEnabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                        <span>{t('settings.audioGainLabel')}</span>
                                        <span className="font-normal text-gray-500">{audioGainValue.toFixed(1)}x</span>
                                    </label>
                                    <input
                                        type="range"
                                        id="gain-slider"
                                        min={0.5} max={5} step={0.1}
                                        value={audioGainValue}
                                        onChange={e => setAudioGainValue(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        disabled={!isOfflineAsrEnabled}
                                    />
                                 </div>
                            </div>
                            
                            <div className="border-t border-gray-200"></div>

                            {/* TTS Settings */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 -mb-2">{t('settings.ttsSettingsLabel')}</label>
                                 <ToggleSwitch
                                    id="tts-toggle"
                                    isEnabled={isOfflineTtsEnabled}
                                    setIsEnabled={setIsOfflineTtsEnabled}
                                    title={t('settings.enableCustomTtsLabel')}
                                    description={t('settings.enableCustomTtsDescription')}
                                 />
                                 <div>
                                    <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.voiceLabel')}</label>
                                    <select
                                        id="voice-select"
                                        value={offlineTtsVoiceURI}
                                        onChange={(e) => setOfflineTtsVoiceURI(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        disabled={filteredVoices.length === 0}
                                    >
                                        {filteredVoices.length > 0 ? (
                                            filteredVoices.map(voice => (
                                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                                    {voice.name} ({voice.lang})
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">{t('settings.voicePlaceholder', { languageName: t(targetLang.name) })}</option>
                                        )}
                                    </select>
                                 </div>
                                 <div>
                                    <label htmlFor="rate-slider" className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                                        <span>{t('settings.rateLabel')}</span>
                                        <span className="text-gray-500 font-normal">{offlineTtsRate.toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        id="rate-slider"
                                        min={0.5} max={2} step={0.1}
                                        value={offlineTtsRate}
                                        onChange={e => setOfflineTtsRate(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                 </div>
                                 <div>
                                    <label htmlFor="pitch-slider" className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                                        <span>{t('settings.pitchLabel')}</span>
                                        <span className="text-gray-500 font-normal">{offlineTtsPitch.toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        id="pitch-slider"
                                        min={0} max={2} step={0.1}
                                        value={offlineTtsPitch}
                                        onChange={e => setOfflineTtsPitch(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                 </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'ocr' && (
                        <div role="tabpanel" id="ocr-settings" aria-labelledby="ocr-tab" className="space-y-6">
                             <div>
                                <label htmlFor="ocr-model-select" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.ocrModelLabel')}</label>
                                <select 
                                    id="ocr-model-select"
                                    value={selectedOcrModel} 
                                    onChange={(e) => setSelectedOcrModel(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Object.entries(OCR_MODELS).map(([k, m]) => <option key={k} value={k}>{m.description}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={handleLoadOcrModel}
                                disabled={ocrEngineStatus === 'initializing'}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition disabled:bg-indigo-300 disabled:cursor-wait"
                            >
                                {ocrEngineStatus === 'initializing' 
                                    ? 'Initializing...' 
                                    : (ocrEngineStatus === 'ready' ? t('settings.switchOcr') : t('settings.initializeOcr'))
                                }
                            </button>
                             {ocrEngineStatus === 'ready' && <p className="text-sm text-center text-green-600">OCR Engine Ready.</p>}
                             {ocrEngineStatus === 'error' && <p className="text-sm text-center text-red-600">OCR Engine failed to initialize.</p>}
                        </div>
                    )}
                </div>
                <div className="p-6 bg-gray-50 rounded-b-lg flex justify-between items-center">
                     <button 
                        onClick={handleClear}
                        className="text-red-600 font-medium py-2 px-4 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        aria-label={t('settings.clearAllAriaLabel')}
                    >
                        {t('settings.clearSettingsButton')}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        {t('settings.saveSettingsButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
