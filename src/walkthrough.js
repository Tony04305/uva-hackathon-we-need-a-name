import { getHintChoices } from './hints.js';

/** Reviewed teaching steps shared by server replies and offline review. */
export function reviewedWalkthrough(question, module) {
  if (module === 'economics') {
    const reason = question.reasonOptions.find((option) => option.id === question.reasonAnswer).text;
    const outcomes = question.outcomes.map((outcome) => ({
      title: outcome.label,
      text: `${outcome.options.find((option) => option.value === outcome.answer).label}. ${outcome.explanation}`,
    }));
    return {
      text: 'Follow the shock through this scenario, one step at a time.',
      steps: [
        { title: 'Start with the assumptions', text: question.assumptions.join(' ') },
        { title: 'Identify the mechanism', text: reason },
        ...outcomes,
      ],
      answerText: question.explanation,
      answerLatex: null,
      isReview: true,
    };
  }
  const hints = getHintChoices(question.id);
  return {
    text: 'Let’s work through the derivative, one step at a time.',
    steps: [
      { title: `Recognise the ${question.rule.toLowerCase()}`, text: hints[0].text },
      { title: 'Apply the method', text: question.explanation },
      { title: 'Check your reasoning', text: `${hints[2].text}${question.domain ? ` Work within the domain ${question.domain}.` : ''}` },
    ],
    answerText: null,
    answerLatex: question.answerLatex,
    isReview: true,
  };
}
