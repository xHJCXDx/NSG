import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getAutomationStatus } from './api';
import { AutomationTriggers } from './AutomationTriggers';

describe('AutomationTriggers', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the automation state from the feature status contract', () => {
    const status = getAutomationStatus();

    render(<AutomationTriggers />);

    expect(screen.getByRole('heading', { name: status.title })).toBeInTheDocument();
    expect(screen.getByText(status.description)).toBeInTheDocument();
    expect(screen.getByText(status.scheduleLabel)).toBeInTheDocument();
  });

  it('keeps manual triggering unavailable until a dedicated webhook exists', () => {
    const status = getAutomationStatus();

    render(<AutomationTriggers />);

    const manualTrigger = screen.getByRole('button', { name: status.manualTriggerLabel });
    expect(manualTrigger).toBeDisabled();
    expect(status.manualTriggerEnabled).toBe(false);
  });
});
