/** Validate a draft only. UVA AI grades the explanation on the server. */
export function checkEconomicsAnswer(answer, question) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer) || !question) return { status: 'invalid' };
  const fields = question.outcomes.map((outcome) => ({ id: outcome.id, choices: outcome.options.map((option) => option.value) }));
  if (fields.some((field) => !answer[field.id])) return { status: 'incomplete', message: 'Choose both predictions before submitting your reasoning.' };
  if (fields.some((field) => !field.choices.includes(answer[field.id]))) return { status: 'invalid', message: 'Choose one of the available predictions for each part.' };
  if (typeof answer.explanation !== 'string' || answer.explanation.trim().length < 12) return { status: 'incomplete', message: 'Explain the cause and effect in your own words (at least 12 characters).' };
  if (answer.explanation.length > 1600 || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(answer.explanation.replace(/[\n\r\t]/g, ''))) return { status: 'invalid', message: 'Keep your explanation under 1,600 characters and use plain text.' };
  return { status: 'ready' };
}
