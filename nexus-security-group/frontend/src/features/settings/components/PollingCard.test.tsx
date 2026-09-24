import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { PollingProvider } from '../../../shared/contexts/PollingContext';
import { PollingCard } from './PollingCard';

function renderCard() {
  localStorage.clear();

  return render(
    <LanguageProvider>
      <ThemeProvider>
        <PollingProvider>
          <PollingCard />
        </PollingProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('PollingCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('Dashboard Refresh')).toBeInTheDocument();
  });

  it('shows a select with 5 options', () => {
    renderCard();
    const select = screen.getByRole('combobox', { name: 'Refresh interval' });
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(5);
  });

  it('defaults to 30 seconds', () => {
    renderCard();
    const select = screen.getByRole('combobox', { name: 'Refresh interval' }) as HTMLSelectElement;
    expect(select.value).toBe('30000');
  });

  it('changing selection updates context and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderCard();

    const select = screen.getByRole('combobox', { name: 'Refresh interval' }) as HTMLSelectElement;
    await user.selectOptions(select, 'false');

    expect(select.value).toBe('false');
    expect(localStorage.getItem('nsg:polling:interval')).toBe('false');
  });
});
