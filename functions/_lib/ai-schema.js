const text = { type: 'string', minLength: 1, maxLength: 2400 };
const list = { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 600 } };

export const AI_READING_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    overall_judgment: text,
    question_connection: text,
    hexagram_synthesis: text,
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
    'overall_judgment', 'question_connection', 'hexagram_synthesis', 'current_situation',
    'development_path', 'future_tendency', 'favorable_factors', 'obstacles',
    'action_steps', 'avoid_actions', 'verification_signals', 'limitations'
  ]
});
