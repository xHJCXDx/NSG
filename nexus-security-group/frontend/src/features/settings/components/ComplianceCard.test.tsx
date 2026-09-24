import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { ComplianceCard } from './ComplianceCard';

const renderCard = () =>
  render(
    <LanguageProvider>
      <ThemeProvider>
        <ComplianceCard />
      </ThemeProvider>
    </LanguageProvider>,
  );

describe('ComplianceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the compliance card title', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Regulatory Compliance' })).toBeInTheDocument();
  });

  it('renders all 3 section headers', () => {
    renderCard();
    expect(screen.getByText('Implemented Compliance')).toBeInTheDocument();
    expect(screen.getByText('Declared Alignment')).toBeInTheDocument();
    expect(screen.getByText('Technical Reference')).toBeInTheDocument();
  });

  it('first section is open by default and shows its standards', () => {
    renderCard();
    expect(screen.getByText('Ley 25.326 (Personal Data Protection)')).toBeInTheDocument();
    expect(screen.getByText('Convention 108/108+ (Council of Europe)')).toBeInTheDocument();
  });

  it('second and third sections are collapsed by default', () => {
    renderCard();
    expect(screen.queryByText('GDPR (EU 2016/679)')).not.toBeInTheDocument();
    expect(screen.queryByText('ISO/IEC 27037:2012')).not.toBeInTheDocument();
  });

  it('clicking a collapsed section expands it', async () => {
    const user = userEvent.setup();
    renderCard();

    const alignedButton = screen.getByRole('button', { name: /Declared Alignment/i });
    expect(alignedButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('GDPR (EU 2016/679)')).not.toBeInTheDocument();

    await user.click(alignedButton);

    expect(alignedButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('GDPR (EU 2016/679)')).toBeInTheDocument();
    expect(screen.getByText('Ley 26.388 (Computer Crimes)')).toBeInTheDocument();
    expect(screen.getByText('Budapest Convention (Cybercrime)')).toBeInTheDocument();
  });

  it('clicking an open section collapses it', async () => {
    const user = userEvent.setup();
    renderCard();

    const implementedButton = screen.getByRole('button', { name: /Implemented Compliance/i });
    expect(implementedButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ley 25.326 (Personal Data Protection)')).toBeInTheDocument();

    await user.click(implementedButton);

    expect(implementedButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Ley 25.326 (Personal Data Protection)')).not.toBeInTheDocument();
  });

  it('renders the Technical Reference section with ISO/IEC 27037 when expanded', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /Technical Reference/i }));

    expect(screen.getByText('ISO/IEC 27037:2012')).toBeInTheDocument();
    expect(screen.getByText('ISO/IEC 27701:2019')).toBeInTheDocument();
    expect(screen.getByText('NIST CSF v1.1')).toBeInTheDocument();
    expect(screen.getByText('MITRE ATT&CK')).toBeInTheDocument();
  });
});
