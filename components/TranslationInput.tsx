
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';
import { LANGUAGES } from '../constants';
import LanguageSelector from './LanguageSelector';
import { CameraIcon, TranslateIcon, XIcon, MicrophoneIcon, SettingsIcon, WifiIcon, WifiOffIcon, StopIcon } from './icons';

interface TranslationInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    sourceLang: Language;
    setSourceLang: (lang: Language) => void;
    isLoading: boolean;
    onTranslate: () => void;
    onCancel: () => void;
    isRecording: boolean;
    onToggleRecording: () => void;
    onOpenCamera: () => void;
    onOpenSettings: () => void;
    isOnline: boolean;
    isOfflineModeEnabled: boolean;
    isOfflineModelReady: boolean;
    isOfflineAsrEnabled: boolean;
    isAsrInitialized: boolean;
    asrModelId: string;
    isListening: boolean; // From Web Speech API
    recordingCountdown: number | null;
}

const MAX_CHARS = 3000;

const TranslationInput: React.FC<TranslationInputProps> = ({
    inputText,
    setInputText,
    sourceLang,
    setSourceLang,
    isLoading,
    onTranslate,
    onCancel,
    isRecording,
    onToggleRecording,
    onOpenCamera,
    onOpenSettings,
    isOnline,
    isOfflineModeEnabled,
    isOfflineModelReady,
    isOfflineAsrEnabled,
    isAsrInitialized,
    asrModelId,
    isListening,
    recordingCountdown,
}) => {
    const { t } = useTranslation();

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (e.target.value.length <= MAX_CHARS) {
            setInputText(e.target.value);
        }
    };

    const isTranslateDisabled = !inputText.trim() || 
                                isRecording || isListening ||
                                (isOfflineModeEnabled ? !isOfflineModelReady : !isOnline);
                                
    const isRecordingDisabled = isLoading || sourceLang.code === 'auto' || (isOfflineAsrEnabled && (!isAsrInitialized || !asrModelId));
    const isCurrentlyRecording = isRecording || isListening;

    const handleActionClick = () => {
        if (isLoading) {
            onCancel();
        } else {
            onTranslate();
        }
    };

    const getRecordingTitle = () => {
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
                return t('asrStatus.notReady');
            }
        }
        return isCurrentlyRecording ? t('translationInput.recordingStop') : t('translationInput.recordingStart');
    };

    return (
        <div className="bg-white rounded-xl shadow-md h-full flex flex-col p-4">
            <div className="flex justify-between items-center mb-2">
                <LanguageSelector
                    selectedLang={sourceLang}
                    setSelectedLang={setSourceLang}
                    languages={LANGUAGES}
                />
                <div className="flex items-center space-x-4 text-gray-500">
                    <div title={isOnline ? t('translationInput.online') : t('translationInput.offline')}>
                        {isOnline ? <WifiIcon className="text-green-500"/> : <WifiOffIcon className="text-gray-400"/>}
                    </div>
                    <button onClick={onOpenCamera} className="hover:text-blue-500" aria-label={t('translationInput.cameraAriaLabel')}><CameraIcon /></button>
                    <button onClick={onOpenSettings} className="hover:text-blue-500" aria-label={t('translationInput.settingsAriaLabel')}><SettingsIcon /></button>
                </div>
            </div>
            <div className="relative border border-gray-200 rounded-lg flex-grow">
                <textarea
                    value={inputText}
                    onChange={handleTextChange}
                    placeholder={isCurrentlyRecording ? t('translationInput.placeholderListening') : t('translationInput.placeholderEnterText')}
                    className="w-full h-full p-4 pr-12 text-lg border-none focus:ring-0 resize-none bg-transparent"
                    disabled={isCurrentlyRecording}
                />
                {inputText && !isCurrentlyRecording && (
                     <button onClick={() => setInputText('')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label={t('translationInput.clearText')}>
                        <XIcon />
                    </button>
                )}
            </div>
            <div className="flex justify-between items-center mt-2">
                 <p className="text-sm text-gray-400 w-32 text-left">
                    {isCurrentlyRecording && recordingCountdown !== null ? (
                        <span className="text-red-500 font-medium">{t('translationInput.countdown', { seconds: recordingCountdown })}</span>
                    ) : (
                        `${inputText.length}/${MAX_CHARS}`
                    )}
                </p>
                <div className="flex items-center space-x-2">
                     <button
                        onClick={onToggleRecording}
                        disabled={isRecordingDisabled}
                        className={`p-3 rounded-lg flex items-center justify-center transition-colors ${
                            isCurrentlyRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        } disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                        aria-label={isCurrentlyRecording ? t('translationInput.recordingStop') : t('translationInput.recordingStart')}
                        title={getRecordingTitle()}
                    >
                        <MicrophoneIcon />
                    </button>
                    <button
                        onClick={handleActionClick}
                        disabled={!isLoading && isTranslateDisabled}
                        title={isLoading ? t('translationInput.cancelTranslation') : (isOfflineModeEnabled ? t('translationInput.translateOffline') : t('translationInput.translate'))}
                        className={`text-white rounded-lg p-3 flex items-center justify-center transition-colors ${
                            isLoading 
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? <StopIcon /> : <TranslateIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranslationInput;
