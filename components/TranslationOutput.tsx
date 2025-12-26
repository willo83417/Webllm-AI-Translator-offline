

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';
import { LANGUAGES, OFFLINE_MODELS, ASR_MODELS } from '../constants';
import LanguageSelector from './LanguageSelector';
import { FemaleVoiceIcon, MaleVoiceIcon, CopyIcon, HistoryIcon, SwapIcon, FlipScreenIcon, XIcon, SpeakerIcon, MicrophoneIcon } from './icons';

interface TranslationOutputProps {
    translatedText: string;
    targetLang: Language;
    sourceLang: Language;
    setTargetLang: (lang: Language) => void;
    isLoading: boolean;
    onSpeak: (gender: 'female' | 'male') => void;
    onSwapLanguages: () => void;
    onOpenHistory: () => void;
    onClearText: () => void;
    isOfflineModeEnabled: boolean;
    isOfflineModelInitializing: boolean;
    isOfflineModelReady: boolean;
    offlineModelName: string;
    isSpeaking: boolean;
    speakingGender: 'female' | 'male' | null;
    onlineProvider: string;
    isOfflineTtsEnabled: boolean;
    isAstRecording: boolean;
    onToggleAstRecording: () => void;
    isOfflineAsrEnabled: boolean;
    isAsrInitialized: boolean;
    isAsrInitializing: boolean;
    asrModelId: string;
    asrLoadingProgress: { file: string; progress: number };
}

const TranslationOutput: React.FC<TranslationOutputProps> = ({
    translatedText,
    targetLang,
    sourceLang,
    setTargetLang,
    isLoading,
    onSpeak,
    onSwapLanguages,
    onOpenHistory,
    onClearText,
    isOfflineModeEnabled,
    isOfflineModelInitializing,
    isOfflineModelReady,
    offlineModelName,
    isSpeaking,
    speakingGender,
    onlineProvider,
    isOfflineTtsEnabled,
    isAstRecording,
    onToggleAstRecording,
    isOfflineAsrEnabled,
    isAsrInitialized,
    isAsrInitializing,
    asrModelId,
    asrLoadingProgress,
}) => {
    const { t } = useTranslation();
    const [isFlipped, setIsFlipped] = useState(false);

    const handleCopy = () => {
        if (translatedText) {
            navigator.clipboard.writeText(translatedText);
        }
    };
    
    const handleFlip = () => {
        setIsFlipped(prev => !prev);
    };
    
    const getCombinedStatus = () => {
        let modelStatus: string;
        if (!isOfflineModeEnabled) {
            const providerName = onlineProvider.charAt(0).toUpperCase() + onlineProvider.slice(1);
            modelStatus = t('translationOutput.modeOnline', { provider: providerName });
        } else {
            const model = OFFLINE_MODELS.find(m => m.value === offlineModelName);
            const modelDisplayName = model ? model.name.split(' ')[0] : '';

            if (isOfflineModelInitializing) {
                modelStatus = t('translationOutput.modeOfflineInitializing', { modelName: modelDisplayName });
            } else if (isOfflineModelReady) {
                modelStatus = t('translationOutput.modeOfflineReady', { modelName: modelDisplayName });
            } else if (offlineModelName) {
                modelStatus = t('translationOutput.modeOfflineNotReady', { modelName: modelDisplayName });
            } else {
                modelStatus = t('translationOutput.modeOfflineNoModel');
            }
        }

        let asrStatus: string;
        if (!isOfflineAsrEnabled) {
            asrStatus = t('asrStatus.webSpeech');
        } else {
            const asrModel = ASR_MODELS.find(m => m.id === asrModelId);
            const asrModelDisplayName = asrModel ? asrModel.name.split(' ')[1] : '';
            if (!asrModelId) {
                asrStatus = t('asrStatus.noModelSelected');
            } else if (isAsrInitializing) {
                asrStatus = t('asrStatus.initializing', { modelName: asrModelDisplayName, progress: Math.round(asrLoadingProgress.progress) });
            } else if (isAsrInitialized) {
                asrStatus = t('asrStatus.ready', { modelName: asrModelDisplayName });
            } else {
                asrStatus = t('asrStatus.notReady', { modelName: asrModelDisplayName });
            }
        }

        return `${modelStatus} | ASR: ${asrStatus}`;
    };
    
    const isAstRecordingDisabled = isLoading || sourceLang.code === 'auto' || (isOfflineAsrEnabled && (!isAsrInitialized || !asrModelId));

    const getAstTitle = () => {
        if (sourceLang.code === 'auto') {
            return t('notifications.selectLanguageError');
        }
        if (isOfflineAsrEnabled) {
            if (!isOfflineModeEnabled) {
                return t('notifications.asrOnlineUnavailable');
            }
            if (!asrModelId) {
                return t('asrStatus.noModelSelected');
            }
            if (!isAsrInitialized) {
                return t('asrStatus.notReadySimple');
            }
        }
        return t('translationOutput.astTitle');
    };

    return (
        <div className={`bg-white rounded-xl shadow-md p-4 h-full flex flex-col transition-transform duration-500 ease-in-out ${isFlipped ? 'rotate-180' : ''}`}>
            {/* Header section - fixed height */}
            <div className="flex-shrink-0">
                 <div className="flex justify-between items-center mb-1">
                    <LanguageSelector
                        selectedLang={targetLang}
                        setSelectedLang={setTargetLang}
                        languages={LANGUAGES.filter(l => l.code !== 'auto')}
                    />
                    <button onClick={onSwapLanguages} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                        <SwapIcon />
                    </button>
                    <div className="flex items-center space-x-4 text-gray-500">
                        <button onClick={handleFlip} className="hover:text-blue-500" aria-label={t('translationOutput.flipScreenAriaLabel')}><FlipScreenIcon /></button>
                        <button onClick={handleCopy} disabled={!translatedText} className="hover:text-blue-500 disabled:text-gray-300 disabled:cursor-not-allowed" aria-label={t('translationOutput.copyAriaLabel')}><CopyIcon /></button>
                        <button onClick={onOpenHistory} className="hover:text-blue-500" aria-label={t('translationOutput.historyAriaLabel')}><HistoryIcon /></button>
                        <button onClick={onClearText} disabled={!translatedText} className="hover:text-red-500 disabled:text-gray-300 disabled:cursor-not-allowed" aria-label={t('translationOutput.clearAriaLabel')}><XIcon /></button>
                    </div>
                </div>
                <div className="text-right text-xs text-gray-400 mb-2 px-1">
                    {getCombinedStatus()}
                </div>
            </div>
            {/* Content section - flexible height and scrollable */}
             <div className="text-2xl text-gray-800 break-words flex-grow overflow-y-auto min-h-0 whitespace-pre-wrap">
                {isLoading && !translatedText ? (
                     <div className="space-y-2 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ) : (
                    translatedText || <span className="text-gray-400">{t('translationOutput.placeholder')}</span>
                )}
            </div>
            {/* Footer section - fixed height */}
            <div className="flex items-center justify-start mt-4 space-x-2 flex-shrink-0">
                {isOfflineTtsEnabled ? (
                    <button
                        onClick={() => onSpeak('female')} // Gender is ignored but required by function signature
                        disabled={!translatedText}
                        className={`text-white rounded-lg p-3 flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${isSpeaking ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                        aria-label={isSpeaking ? t('translationOutput.speakStop') : t('translationOutput.speakCustomVoice')}
                    >
                        <SpeakerIcon />
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => onSpeak('female')}
                            disabled={!translatedText}
                            className={`text-white rounded-lg p-3 flex items-center justify-center disabled:bg-pink-200 disabled:cursor-not-allowed transition-colors ${isSpeaking && speakingGender === 'female' ? 'bg-pink-600 animate-pulse' : 'bg-pink-400 hover:bg-pink-500'}`}
                            aria-label={isSpeaking && speakingGender === 'female' ? t('translationOutput.speakStop') : t('translationOutput.speakFemale')}
                        >
                            <FemaleVoiceIcon />
                        </button>
                        <button
                            onClick={() => onSpeak('male')}
                            disabled={!translatedText}
                            className={`text-white rounded-lg p-3 flex items-center justify-center disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors ${isSpeaking && speakingGender === 'male' ? 'bg-blue-700 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
                            aria-label={isSpeaking && speakingGender === 'male' ? t('translationOutput.speakStop') : t('translationOutput.speakMale')}
                        >
                            <MaleVoiceIcon />
                        </button>
                    </>
                )}
                <button
                    onClick={onToggleAstRecording}
                    disabled={isAstRecordingDisabled}
                    className={`text-white rounded-lg p-3 flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                        isAstRecording
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-indigo-500 hover:bg-indigo-600'
                    }`}
                    aria-label={isAstRecording ? t('translationOutput.astStop') : t('translationOutput.astStart')}
                    title={getAstTitle()}
                >
                    <MicrophoneIcon />
                </button>
            </div>
        </div>
    );
};

export default TranslationOutput;