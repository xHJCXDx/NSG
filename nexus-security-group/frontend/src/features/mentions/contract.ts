export const MENTIONS_ENDPOINT = '/api/metrics/mentions';
export const MENTIONS_DEFAULT_LIMIT = 50;

export const MENTIONS_COPY = {
  page: {
    eyebrow: 'OSINT monitoring',
    title: 'Mentions',
    description: 'Review collected mentions with source, content, timestamp, and optional operational metadata.',
    loading: 'Loading mentions...',
  },
  toolbar: {
    searchLabel: 'Search mentions',
    searchPlaceholder: 'Search by text, platform, or author',
    platformLabel: 'Filter by platform',
    platformPlaceholder: 'Platform',
  },
  error: {
    title: 'Mentions could not be loaded',
    fallbackDetail: 'The information could not be loaded right now.',
  },
  empty: {
    initial: {
      title: 'No mentions collected yet',
      description: 'Collected OSINT mentions will appear here once available.',
    },
    noResults: {
      title: 'No matching mentions',
      description: 'Try adjusting the search or platform filter.',
    },
  },
  list: {
    ariaLabel: 'Collected mentions',
  },
  card: {
    unknownDate: 'Unknown date',
    authorLabel: 'Author',
    sourceLabel: 'Source',
  },
} as const;
