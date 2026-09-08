import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth';
import { DASHBOARD_COPY } from '../contract';
import { Dashboard } from './Dashboard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: ({ dataKey }: { dataKey: string }) => <span data-testid="x-axis">{dataKey}</span>,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: ({ dataKey }: { dataKey: string }) => <span data-testid="bar-series">{dataKey}</span>,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDashboard = () => {
  localStorage.setItem('token', 'fake-jwt');

  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('Dashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the dashboard summary metrics returned by the feature API contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        total_threats: 7,
        pending_threats: 2,
        total_alerts: 4,
        unacknowledged_alerts: 1,
        active_keywords: 9,
        execution_logs_count: 12,
        activity_count: 15,
      }),
    } as Response);

    renderDashboard();

    expect(screen.getByRole('heading', { name: DASHBOARD_COPY.page.title })).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toHaveTextContent('name');
    expect(screen.getByTestId('bar-series')).toHaveTextContent('value');
  });

  it('shows the no-data state when the dashboard summary request is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    renderDashboard();

    expect(await screen.findByText(DASHBOARD_COPY.chart.noData)).toBeInTheDocument();
  });
});
