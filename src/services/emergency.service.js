import logger from '../utils/logger.js';

/**
 * Keywords that indicate an emergency situation
 */
const EMERGENCY_KEYWORDS = [
  'flood', 'flooding', 'flooded',
  'burst pipe', 'pipe burst', 'broken pipe',
  'no water', 'no hot water',
  'gas smell', 'gas leak', 'smell gas', 'smelling gas',
  'sewage', 'sewage backup', 'sewage overflow',
  'no heat', 'no heating', 'heating emergency',
  'overflowing', 'overflow', 'toilet overflow',
  'emergency', 'urgent', 'immediately',
  'carbon monoxide', 'co detector',
  'fire', 'smoke',
  'electrical', 'sparking', 'burning smell',
];

/**
 * Detects if a transcript contains emergency keywords
 * @param {string} transcript - The call transcript
 * @returns {{ isEmergency: boolean, keywords: string[] }}
 */
export function detectEmergency(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return { isEmergency: false, keywords: [] };
  }

  const lowerTranscript = transcript.toLowerCase();
  const foundKeywords = [];

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (lowerTranscript.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  const isEmergency = foundKeywords.length > 0;

  if (isEmergency) {
    logger.info('Emergency detected in call', {
      keywordsFound: foundKeywords,
    });
  }

  return {
    isEmergency,
    keywords: foundKeywords,
  };
}

/**
 * Gets all emergency keywords
 * @returns {string[]}
 */
export function getEmergencyKeywords() {
  return [...EMERGENCY_KEYWORDS];
}

/**
 * Adds a new emergency keyword
 * @param {string} keyword - Keyword to add
 */
export function addEmergencyKeyword(keyword) {
  if (keyword && !EMERGENCY_KEYWORDS.includes(keyword.toLowerCase())) {
    EMERGENCY_KEYWORDS.push(keyword.toLowerCase());
    logger.info('Added new emergency keyword', { keyword });
  }
}

export default {
  detectEmergency,
  getEmergencyKeywords,
  addEmergencyKeyword,
};
