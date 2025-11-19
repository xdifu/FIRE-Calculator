import React, { createContext, useContext, useState, useMemo } from 'react';
import { Locale, Region, Translation, zh, en } from '../locales';

interface LocaleContextType {
    locale: Locale;
    region: Region;
    t: Translation;
    setLocale: (l: Locale) => void;
    setRegion: (r: Region) => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('zh');
    const [region, setRegion] = useState<Region>('CN');

    const t = useMemo(() => (locale === 'zh' ? zh : en), [locale]);

    // Auto-switch currency symbol/unit based on region if needed, 
    // but for now we stick to the language's definition or override it.
    // Actually, if Region is AU, we might want English text but AUD currency.
    // If Region is CN, we want Chinese text and CNY.
    // But user asked for "Switch Language" AND "Switch Country".
    // So we can have Chinese UI with AU Logic (AUD).

    const activeTranslation = useMemo(() => {
        const base = locale === 'zh' ? zh : en;
        // Override currency symbol based on Region
        return {
            ...base,
            units: {
                ...base.units,
                currency: region === 'AU' ? 'AUD' : (locale === 'zh' ? '元' : 'CNY'),
                currencySymbol: region === 'AU' ? '$' : '¥',
            }
        };
    }, [locale, region]);

    return (
        <LocaleContext.Provider value={{ locale, region, t: activeTranslation, setLocale, setRegion }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = () => {
    const context = useContext(LocaleContext);
    if (!context) throw new Error('useLocale must be used within a LocaleProvider');
    return context;
};
