import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';
import { ChevronDownIcon } from './icons';

interface LanguageSelectorProps {
    selectedLang: Language;
    setSelectedLang: (lang: Language) => void;
    languages: Language[];
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLang, setSelectedLang, languages }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleSelect = (lang: Language) => {
        setSelectedLang(lang);
        setIsOpen(false);
    };
    
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            // max-h-60 is 15rem = 240px. Use this for calculation.
            const dropdownHeight = 240; 
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            
            // If not enough space below AND there is enough space above, open upwards.
            if (spaceBelow < dropdownHeight && buttonRect.top > dropdownHeight) {
                setPosition('top');
            } else {
                setPosition('bottom');
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const positionClasses = position === 'top' ? 'bottom-full mb-2' : 'mt-2';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 text-lg font-semibold text-gray-700 hover:text-blue-600"
            >
                <span>{t(selectedLang.name)}</span>
                <ChevronDownIcon className={`h-2.5 w-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute z-10 ${positionClasses} w-56 bg-white rounded-md shadow-lg border border-gray-100 max-h-60 overflow-y-auto`}>
                    <ul className="py-1">
                        {languages.map((lang) => (
                            <li key={lang.code}>
                                <button
                                    onClick={() => handleSelect(lang)}
                                    className={`w-full text-left px-4 py-2 text-sm ${
                                        selectedLang.code === lang.code
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {t(lang.name)}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;