/** Keep optional saved feedback bounded without losing the learner's progress. */
export function restoreEconomicsGrade(grade) {
  if (!grade || typeof grade !== 'object' || grade.source !== 'ai' || grade.maxScore !== 6
      || !Number.isInteger(grade.score) || grade.score < 0 || grade.score > 6
      || typeof grade.passed !== 'boolean' || !Array.isArray(grade.criteria) || grade.criteria.length !== 3) return null;
  const ids = ['shock', 'mechanism', 'assumptions'];
  if (new Set(grade.criteria.map((c) => c?.id)).size !== 3) return null;
  const text = (value, limit) => typeof value === 'string' && value.length <= limit;
  if (!text(grade.feedback, 1600) || !text(grade.improvement, 1600)) return null;
  if (grade.criteria.some((criterion) => !criterion || !ids.includes(criterion.id)
    || criterion.maxScore !== 2 || !Number.isInteger(criterion.score) || criterion.score < 0 || criterion.score > 2
    || !text(criterion.label, 120) || !text(criterion.feedback, 1000))) return null;
  const score = grade.criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  if (score !== grade.score || grade.passed !== (score >= 5 && grade.criteria.every((criterion) => criterion.score > 0))) return null;
  return { score, maxScore: 6, passed: grade.passed, source: 'ai', feedback: grade.feedback, improvement: grade.improvement,
    criteria: grade.criteria.map(({ id, label, score, maxScore, feedback }) => ({ id, label, score, maxScore, feedback })) };
}
