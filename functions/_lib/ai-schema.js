const text = { type: 'string', minLength: 1, maxLength: 2400 };
const list = { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 600 } };
const foundationPoints = { ...list, minItems: 3, maxItems: 6 };
const trendBranches = { ...list, minItems: 2, maxItems: 6 };
const conclusions = { ...list, minItems: 3, maxItems: 5 };
const comprehensiveHexagramReading = {
  type: 'object',
  additionalProperties: false,
  properties: {
    foundation_summary: text,
    foundation_points: foundationPoints,
    core_summary: text,
    strengths: list,
    weaknesses: list,
    key_risks: list,
    trend_summary: text,
    trend_branches: trendBranches,
    conclusions,
    disclaimer: text
  },
  required: [
    'foundation_summary', 'foundation_points', 'core_summary', 'strengths', 'weaknesses',
    'key_risks', 'trend_summary', 'trend_branches', 'conclusions', 'disclaimer'
  ]
};

export const AI_READING_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    overall_judgment: text,
    question_connection: text,
    hexagram_synthesis: text,
    comprehensive_hexagram_reading: comprehensiveHexagramReading,
    current_situation: text,
    development_path: text,
    future_tendency: text,
    favorable_factors: list,
    obstacles: list,
    action_steps: list,
    avoid_actions: list,
    verification_signals: list,
    limitations: text
  },
  required: [
    'overall_judgment', 'question_connection', 'hexagram_synthesis', 'comprehensive_hexagram_reading', 'current_situation',
    'development_path', 'future_tendency', 'favorable_factors', 'obstacles',
    'action_steps', 'avoid_actions', 'verification_signals', 'limitations'
  ]
});
