export const THREATS_ENDPOINT = '/api/threats';
export const THREATS_DEFAULT_LIMIT = 50;

export const THREATS_COPY = {
  page: {
    eyebrow: 'OSINT monitoring',
    title: 'Threats',
    description: 'Review detected threats with severity, classification, confidence, evidence, and optional mention context.',
    loading: 'Loading threats...',
  },
  toolbar: {
    searchLabel: 'Search threats',
    searchPlaceholder: 'Search by evidence, summary, source, or mention',
    severityLabel: 'Filter by severity',
    severityPlaceholder: 'Severity',
    classificationLabel: 'Filter by classification',
    classificationPlaceholder: 'Classification',
  },
  error: {
    title: 'Threats could not be loaded',
    fallbackDetail: 'The information could not be loaded right now.',
    retryLabel: 'Retry',
  },
  empty: {
    initial: {
      title: 'No threats detected yet',
      description: 'Detected OSINT threats will appear here when the backend exposes them.',
    },
    noResults: {
      title: 'No matching threats',
      description: 'Try adjusting the search, severity, or classification filter.',
    },
  },
  list: {
    ariaLabel: 'Detected threats',
  },
  card: {
    unknownDate: 'Unknown date',
    fallbackCategory: 'Threat detection',
    detectedLabel: 'Detected',
    confidenceLabel: 'Confidence',
    riskLabel: 'Risk',
    evidenceLabel: 'Evidence',
    sourceLabel: 'Source',
    relatedMentionLabel: 'Related mention',
    relatedMentionIdLabel: 'Related mention ID',
    noRelatedMention: 'No related mention provided',
  },
} as const;
