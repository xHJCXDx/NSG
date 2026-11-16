export const THREATS_ENDPOINT = '/api/threats';
export const THREATS_DEFAULT_PAGE_SIZE = 25;

export const THREATS_COPY = {
  page: {
    eyebrow: 'OSINT monitoring',
    title: 'Detections',
    description: 'Review heuristic detections with severity, classification, normalized score, evidence, and optional mention context. A detection is a prefiltered signal for human review, not a confirmed threat.',
    loading: 'Loading detections...',
  },
  toolbar: {
    searchLabel: 'Search detections',
    searchPlaceholder: 'Search by evidence, summary, source, or mention',
    severityLabel: 'Filter by severity',
    severityPlaceholder: 'Severity',
    classificationLabel: 'Filter by classification',
    classificationPlaceholder: 'Classification',
  },
  error: {
    title: 'Detections could not be loaded',
    fallbackDetail: 'The information could not be loaded right now.',
    retryLabel: 'Retry',
  },
  empty: {
    initial: {
      title: 'No detections yet',
      description: 'Heuristic detections will appear here once available.',
    },
    noResults: {
      title: 'No matching detections',
      description: 'Try adjusting the search, severity, or classification filter.',
    },
  },
  list: {
    ariaLabel: 'Heuristic detections',
  },
  card: {
    unknownDate: 'Unknown date',
    fallbackCategory: 'Heuristic detection',
    detectedLabel: 'Detected',
    confidenceLabel: 'Normalized score',
    riskLabel: 'Risk score',
    evidenceLabel: 'Evidence',
    sourceLabel: 'Source',
    relatedMentionLabel: 'Related mention',
    relatedMentionIdLabel: 'Related mention ID',
    noRelatedMention: 'No related mention provided',
  },
  review: {
    unauthenticated: 'You must be logged in to review detections',
    forbidden: 'You do not have permission to review detections',
    notFound: 'Detection not found',
    validation: 'Invalid review data',
    fallback: 'Failed to save detection review',
    serviceUnavailable: 'Service is temporarily unavailable',
    withoutToken: 'Authentication required to review detections',
  },
} as const;
