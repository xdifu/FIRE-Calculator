import { Locale, Region } from '../locales';

const withSign = (value: number, formatted: string) => (value < 0 ? `-${formatted}` : formatted);

const formatChineseLong = (value: number, symbol: string) => {
    const abs = Math.abs(value);
    if (abs >= 100000000) {
        return withSign(value, `${symbol}${(abs / 100000000).toFixed(2)}亿`);
    }
    if (abs >= 10000) {
        return withSign(value, `${symbol}${(abs / 10000).toFixed(0)}万`);
    }
    return withSign(value, `${symbol}${abs.toLocaleString('zh-CN')}`);
};

const formatChineseShort = (value: number, symbol: string) => {
    const abs = Math.abs(value);
    if (abs >= 100000000) {
        return withSign(value, `${symbol}${(abs / 100000000).toFixed(1)}亿`);
    }
    if (abs >= 10000) {
        return withSign(value, `${symbol}${(abs / 10000).toFixed(0)}万`);
    }
    return withSign(value, `${symbol}${abs.toFixed(0)}`);
};

const formatEnglishLong = (value: number, symbol: string) => {
    const abs = Math.abs(value);
    if (abs >= 1000000000) {
        return withSign(value, `${symbol}${(abs / 1000000000).toFixed(2)}b`);
    }
    if (abs >= 1000000) {
        return withSign(value, `${symbol}${(abs / 1000000).toFixed(2)}m`);
    }
    if (abs >= 1000) {
        return withSign(value, `${symbol}${(abs / 1000).toFixed(0)}k`);
    }
    return withSign(value, `${symbol}${abs.toLocaleString('en-US')}`);
};

const formatEnglishShort = (value: number, symbol: string) => {
    const abs = Math.abs(value);
    if (abs >= 1000000000) {
        return withSign(value, `${symbol}${(abs / 1000000000).toFixed(1)}b`);
    }
    if (abs >= 1000000) {
        return withSign(value, `${symbol}${(abs / 1000000).toFixed(1)}m`);
    }
    if (abs >= 1000) {
        return withSign(value, `${symbol}${(abs / 1000).toFixed(0)}k`);
    }
    return withSign(value, `${symbol}${abs.toFixed(0)}`);
};

export const formatCurrencyLong = (value: number, locale: Locale, _region: Region, symbol: string) => {
    return locale === 'zh'
        ? formatChineseLong(value, symbol)
        : formatEnglishLong(value, symbol);
};

export const formatCurrencyCompact = (value: number, locale: Locale, _region: Region, symbol: string) => {
    return locale === 'zh'
        ? formatChineseShort(value, symbol)
        : formatEnglishShort(value, symbol);
};
