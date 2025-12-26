import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TranslationHistoryItem } from '../types';
import { XIcon, TrashIcon } from './icons';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: TranslationHistoryItem[];
    onSelectHistory: (item: TranslationHistoryItem) => void;
    onClearHistory: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelectHistory, onClearHistory }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[70vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 id="history-title" className="text-xl font-semibold text-gray-800">{t('history.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('history.closeAriaLabel')}>
                        <XIcon />
                    </button>
                </div>
                <div className="p-2 flex-grow overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {t('history.empty')}
                        </div>
                    ) : (
                        <ul>
                            {history.map((item) => (
                                <li key={item.id} className="border-b border-gray-200 last:border-b-0">
                                    <button
                                        onClick={() => onSelectHistory(item)}
                                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                                        aria-label={t('history.selectAriaLabel', { sourceLang: t(item.sourceLang.name), targetLang: t(item.targetLang.name) })}
                                    >
                                        <div className="mb-2">
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 py-1 px-2 rounded-full">{t(item.sourceLang.name)}</span>
                                            <p className="text-gray-800 mt-1 truncate">{item.inputText}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-blue-500 bg-blue-50 py-1 px-2 rounded-full">{t(item.targetLang.name)}</span>
                                            <p className="text-blue-700 font-medium mt-1 truncate">{item.translatedText}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {history.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end items-center">
                        <button
                            onClick={onClearHistory}
                            className="flex items-center space-x-2 text-red-600 font-medium py-2 px-4 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            aria-label={t('history.clearAriaLabel')}
                        >
                            <TrashIcon className="h-5 w-5" />
                            <span>{t('history.clearButton')}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryModal;