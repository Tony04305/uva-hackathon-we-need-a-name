export async function askTutor({ questionId, message, shownHintIds, mode, studentAnswer }, signal) {
  const response = await fetch('/api/tutor', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, message, shownHintIds, mode, ...(mode === 'review' ? { studentAnswer } : {}) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data.text !== 'string') {
    const error = new Error(data?.error || 'The AI helper couldn’t connect. Try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
