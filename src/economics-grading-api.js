/** A failed AI request is retryable; it must never be treated as a wrong answer. */
export async function gradeEconomics({ questionId, predictions, explanation }, signal) {
  const response = await fetch('/api/economics/grade', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, predictions, explanation }),
  });
  const data = await response.json().catch(() => null);
  const grade = data?.grade;
  const valid = ['correct', 'incorrect'].includes(data?.status) && grade?.source === 'ai'
    && Number.isInteger(grade.score) && grade.score >= 0 && grade.score <= 6 && grade.maxScore === 6
    && typeof grade.passed === 'boolean' && Array.isArray(grade.criteria) && grade.criteria.length === 3
    && ['shock', 'mechanism', 'assumptions'].every((id) => grade.criteria.filter((criterion) => criterion?.id === id).length === 1)
    && grade.criteria.every((criterion) => Number.isInteger(criterion.score) && criterion.score >= 0 && criterion.score <= 2
      && criterion.maxScore === 2 && typeof criterion.label === 'string' && typeof criterion.feedback === 'string')
    && grade.score === grade.criteria.reduce((sum, criterion) => sum + criterion.score, 0)
    && grade.passed === (grade.score >= 5 && grade.criteria.every((criterion) => criterion.score > 0))
    && (data.status !== 'correct' || grade.passed)
    && typeof grade.feedback === 'string' && typeof grade.improvement === 'string';
  if (!response.ok || !valid) {
    const error = new Error(data?.error || 'UVA AI couldn’t grade this explanation. Your answer and streak are unchanged. Please try again.');
    error.status = response.ok ? 503 : response.status;
    throw error;
  }
  return data;
}
