/**
 * ShadowNode Pricing Estimation Engine
 * Calculates estimated prices based on service type, complexity, and timeline
 */

export interface PricingFactors {
  serviceType: 'osint' | 'forensics' | 'ethical-hacking' | 'mixed';
  description: string;
  timeline: 'urgent' | 'standard' | 'flexible';
}

export interface PriceEstimate {
  basePrice: number;
  complexityMultiplier: number;
  urgencyMultiplier: number;
  estimatedPrice: number;
  breakdown: {
    baseService: string;
    complexity: string;
    urgency: string;
  };
}

// Base prices for each service type (in USD)
const BASE_PRICES: Record<string, { min: number; max: number; avg: number }> = {
  osint: { min: 2500, max: 5000, avg: 3750 },
  forensics: { min: 5000, max: 10000, avg: 7500 },
  'ethical-hacking': { min: 7500, max: 15000, avg: 11250 },
  mixed: { min: 10000, max: 20000, avg: 15000 },
};

/**
 * Calculate complexity multiplier based on description
 * Longer and more specific descriptions indicate more complex investigations
 */
function calculateComplexityMultiplier(description: string): number {
  const words = description.trim().split(/\s+/).length;

  // Keywords that indicate higher complexity
  const complexityKeywords = [
    'international',
    'multiple',
    'deep',
    'extensive',
    'comprehensive',
    'detailed',
    'investigation',
    'forensic',
    'analysis',
    'encrypted',
    'sophisticated',
    'complex',
    'networks',
    'infrastructure',
    'systems',
    'recovery',
    'evidence',
  ];

  const keywordCount = complexityKeywords.filter((keyword) =>
    description.toLowerCase().includes(keyword)
  ).length;

  // Base multiplier from word count (min 1.0, max 2.0)
  let multiplier = Math.min(2.0, 1.0 + (words / 500) * 0.5);

  // Boost from keywords (0.1 per keyword, max 0.5)
  const keywordBoost = Math.min(0.5, keywordCount * 0.1);
  multiplier = Math.min(2.0, multiplier + keywordBoost);

  return parseFloat(multiplier.toFixed(2));
}

/**
 * Calculate urgency multiplier based on timeline
 */
function calculateUrgencyMultiplier(timeline: string): number {
  switch (timeline) {
    case 'urgent':
      return 2.0; // 100% rush fee
    case 'standard':
      return 1.3; // 30% standard fee
    case 'flexible':
      return 1.0; // No urgency premium
    default:
      return 1.0;
  }
}

/**
 * Main pricing estimation function
 */
export function estimatePrice(factors: PricingFactors): PriceEstimate {
  const basePrice = BASE_PRICES[factors.serviceType].avg;
  const complexityMultiplier = calculateComplexityMultiplier(factors.description);
  const urgencyMultiplier = calculateUrgencyMultiplier(factors.timeline);

  const estimatedPrice = Math.round(
    basePrice * complexityMultiplier * urgencyMultiplier
  );

  const serviceNames: Record<string, string> = {
    osint: 'OSINT Intelligence',
    forensics: 'Digital Forensics',
    'ethical-hacking': 'Ethical Hacking Assessment',
    mixed: 'Multi-Service Investigation',
  };

  const timelineNames: Record<string, string> = {
    urgent: 'Urgent (Rush Fee Applied)',
    standard: 'Standard Timeline',
    flexible: 'Flexible Timeline',
  };

  return {
    basePrice,
    complexityMultiplier,
    urgencyMultiplier,
    estimatedPrice,
    breakdown: {
      baseService: `${serviceNames[factors.serviceType]}: $${basePrice.toLocaleString()}`,
      complexity: `Complexity Adjustment: ${complexityMultiplier}x`,
      urgency: `${timelineNames[factors.timeline]}: ${urgencyMultiplier}x`,
    },
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US')}`;
}

/**
 * Get price range for a service
 */
export function getPriceRange(
  serviceType: string
): { min: number; max: number } | null {
  const range = BASE_PRICES[serviceType];
  return range ? { min: range.min, max: range.max } : null;
}
