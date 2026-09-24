import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type TimezoneOption = 'UTC' | 'America/Argentina/Buenos_Aires' | 'local';
export type DateFormatOption = 'iso' | 'ar' | 'us';
export type TimeFormatOption = '24h' | '12h';

interface DateFormatContextType {
  timezone: TimezoneOption;
  dateFormat: DateFormatOption;
  timeFormat: TimeFormatOption;
  setTimezone: (tz: TimezoneOption) => void;
  setDateFormat: (fmt: DateFormatOption) => void;
  setTimeFormat: (fmt: TimeFormatOption) => void;
  formatDateTime: (isoString: string | null | undefined) => string;
  formatDate: (isoString: string | null | undefined) => string;
  formatTime: (isoString: string | null | undefined) => string;
}

const DateFormatContext = createContext<DateFormatContextType | null>(null);

const LS_TZ = 'nsg:date:timezone';
const LS_FMT = 'nsg:date:format';
const LS_TIME = 'nsg:date:timeFormat';

function readStorage<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  const raw = localStorage.getItem(key);
  if (raw && (valid as readonly string[]).includes(raw)) return raw as T;
  return fallback;
}

export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneOption>(() =>
    readStorage<TimezoneOption>(LS_TZ, 'local', ['UTC', 'America/Argentina/Buenos_Aires', 'local']),
  );
  const [dateFormat, setDateFormatState] = useState<DateFormatOption>(() =>
    readStorage<DateFormatOption>(LS_FMT, 'iso', ['iso', 'ar', 'us']),
  );
  const [timeFormat, setTimeFormatState] = useState<TimeFormatOption>(() =>
    readStorage<TimeFormatOption>(LS_TIME, '24h', ['24h', '12h']),
  );

  useEffect(() => { localStorage.setItem(LS_TZ, timezone); }, [timezone]);
  useEffect(() => { localStorage.setItem(LS_FMT, dateFormat); }, [dateFormat]);
  useEffect(() => { localStorage.setItem(LS_TIME, timeFormat); }, [timeFormat]);

  function setTimezone(tz: TimezoneOption) { setTimezoneState(tz); }
  function setDateFormat(fmt: DateFormatOption) { setDateFormatState(fmt); }
  function setTimeFormat(fmt: TimeFormatOption) { setTimeFormatState(fmt); }

  function formatDateTime(isoString: string | null | undefined): string {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const tz = timezone === 'local' ? undefined : timezone;
    const locale = dateFormat === 'ar' ? 'es-AR' : dateFormat === 'us' ? 'en-US' : 'sv-SE';
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      hour12: timeFormat === '12h',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const tz = timezone === 'local' ? undefined : timezone;
    const locale = dateFormat === 'ar' ? 'es-AR' : dateFormat === 'us' ? 'en-US' : 'sv-SE';
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  function formatTime(isoString: string | null | undefined): string {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const tz = timezone === 'local' ? undefined : timezone;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      hour12: timeFormat === '12h',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  return (
    <DateFormatContext.Provider
      value={{
        timezone,
        dateFormat,
        timeFormat,
        setTimezone,
        setDateFormat,
        setTimeFormat,
        formatDateTime,
        formatDate,
        formatTime,
      }}
    >
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat(): DateFormatContextType {
  const ctx = useContext(DateFormatContext);
  if (!ctx) throw new Error('useDateFormat must be used inside DateFormatProvider');
  return ctx;
}
