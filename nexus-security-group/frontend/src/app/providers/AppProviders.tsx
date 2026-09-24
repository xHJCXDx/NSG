import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../features/auth';
import { ThemeProvider } from '../../shared/contexts/ThemeContext';
import { LanguageProvider } from '../../shared/contexts/LanguageContext';
import { PollingProvider } from '../../shared/contexts/PollingContext';
import { DateFormatProvider } from '../../shared/contexts/DateFormatContext';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <LanguageProvider>
      <ThemeProvider>
        <PollingProvider>
          <DateFormatProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>{children}</AuthProvider>
            </QueryClientProvider>
          </DateFormatProvider>
        </PollingProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
