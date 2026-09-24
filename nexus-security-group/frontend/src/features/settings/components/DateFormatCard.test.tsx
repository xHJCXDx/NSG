import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { DateFormatProvider } from '../../../shared/contexts/DateFormatContext';
import { DateFormatCard } from './DateFormatCard';

// ─── helpers ────────────────────────────────────────────────────────────────

const renderCard = () =>
  render(
    <LanguageProvider>
      <DateFormatProvider>
        <DateFormatCard />
      </DateFormatProvider>
    </LanguageProvider>,
  );

// ─── setup / teardown ───────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe('DateFormatCard — rendering', () => {
  it('renders the card title', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Date & Time' })).toBeInTheDocument();
  });

  it('renders the 3 selects (timezone, date format, time format)', () => {
    renderCard();
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Date format' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Time format' })).toBeInTheDocument();
  });
});

describe('DateFormatCard — defaults', () => {
  it('shows iso as the default date format', () => {
    renderCard();
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Date format' }).value).toBe('iso');
  });

  it('shows 24h as the default time format', () => {
    renderCard();
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Time format' }).value).toBe('24h');
  });

  it('shows local as the default timezone', () => {
    renderCard();
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Timezone' }).value).toBe('local');
  });
});

describe('DateFormatCard — interaction', () => {
  it('changing the timezone select updates the displayed value', async () => {
    const user = userEvent.setup();
    renderCard();

    const tzSelect = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Timezone' });
    await user.selectOptions(tzSelect, 'UTC');

    expect(tzSelect.value).toBe('UTC');
  });

  it('changing date format to ar updates the displayed value', async () => {
    const user = userEvent.setup();
    renderCard();

    const fmtSelect = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Date format' });
    await user.selectOptions(fmtSelect, 'ar');

    expect(fmtSelect.value).toBe('ar');
  });

  it('changing time format to 12h updates the displayed value', async () => {
    const user = userEvent.setup();
    renderCard();

    const timeSelect = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Time format' });
    await user.selectOptions(timeSelect, '12h');

    expect(timeSelect.value).toBe('12h');
  });
});
