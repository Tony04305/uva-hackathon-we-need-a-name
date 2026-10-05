const math = String.raw;

export const LEVELS = [
  { id: 1, title: 'First principles', subtitle: 'Start with the essentials', difficulty: 'easy', timed: false, topics: ['Power rule', 'Constants', 'Polynomials'] },
  { id: 2, title: 'Find your rhythm', subtitle: 'The basics, a little faster', difficulty: 'easy', timed: true, topics: ['Power rule', 'Constants', 'Polynomials'] },
  { id: 3, title: 'Make connections', subtitle: 'Meet your next set of rules', difficulty: 'medium', timed: false, topics: ['Chain rule', 'Product rule', 'Quotient rule'] },
  { id: 4, title: 'Think on your feet', subtitle: 'Put your new skills to work', difficulty: 'medium', timed: true, topics: ['Chain rule', 'Product rule', 'Quotient rule'] },
  { id: 5, title: 'Go deeper', subtitle: 'Combine what you know', difficulty: 'hard', timed: false, topics: ['Combined rules', 'Nested functions', 'Logarithms'] },
  { id: 6, title: 'Beat the clock', subtitle: 'Keep your cool under pressure', difficulty: 'hard', timed: true, topics: ['Combined rules', 'Nested functions', 'Logarithms'] },
  { id: 7, title: 'The final ascent', subtitle: 'Your biggest challenge yet', difficulty: 'extreme', timed: false, topics: ['Variable powers', 'Log differentiation', 'Deep chain rule'] },
];

export const QUESTIONS = {
  easy: [
    { id: 'easy-1', latex: math`x^2`, answerLatex: math`2x`, rule: 'Power rule', explanation: 'Bring the power down in front, then subtract 1 from the exponent: 2x¹ = 2x.' },
    { id: 'easy-2', latex: math`x^3`, answerLatex: math`3x^2`, rule: 'Power rule', explanation: 'Multiply by the exponent 3, then reduce the exponent to 2.' },
    { id: 'easy-3', latex: math`3x^2+2x`, answerLatex: math`6x+2`, rule: 'Sum rule', explanation: 'Differentiate each term: 3x² becomes 6x and 2x becomes 2.' },
    { id: 'easy-4', latex: math`5x+7`, answerLatex: math`5`, rule: 'Constant rule', explanation: 'The derivative of 5x is 5. The constant 7 has derivative 0.' },
    { id: 'easy-5', latex: math`9`, answerLatex: math`0`, rule: 'Constant rule', explanation: 'A constant never changes, so its derivative is 0.' },
    { id: 'easy-6', latex: math`x^4`, answerLatex: math`4x^3`, rule: 'Power rule', explanation: 'Bring down the exponent 4, then lower the power to 3.' },
    { id: 'easy-7', latex: math`2x^3-4x+1`, answerLatex: math`6x^2-4`, rule: 'Sum rule', explanation: 'Apply the power rule to each term. The constant 1 disappears.' },
    { id: 'easy-8', latex: math`4x^2-3x+6`, answerLatex: math`8x-3`, rule: 'Sum rule', explanation: 'The three derivatives are 8x, −3, and 0.' },
    { id: 'easy-9', latex: math`\frac{1}{x}`, answerLatex: math`-\frac{1}{x^2}`, rule: 'Negative power rule', domain: 'x ≠ 0', explanation: 'Rewrite 1/x as x⁻¹, then apply the power rule to get −x⁻².' },
    { id: 'easy-10', latex: math`\sqrt{x}`, answerLatex: math`\frac{1}{2\sqrt{x}}`, rule: 'Fractional power rule', domain: 'x > 0', explanation: 'Rewrite the square root as x½. The power rule gives ½x⁻½.' },
    { id: 'easy-11', latex: math`\frac{x^3}{3}+x`, answerLatex: math`x^2+1`, rule: 'Power rule', explanation: 'The factor 3 from differentiating x³ cancels the denominator 3. The derivative of x is 1.' },
    { id: 'easy-12', latex: math`7x^5-2x^2`, answerLatex: math`35x^4-4x`, rule: 'Power rule', explanation: 'Apply the power rule separately: 7 × 5x⁴ − 2 × 2x.' },
  ],
  medium: [
    { id: 'medium-1', latex: math`(2x+1)^3`, answerLatex: math`6(2x+1)^2`, rule: 'Chain rule', explanation: 'Differentiate the outer cube, then multiply by 2, the derivative of the inner expression.' },
    { id: 'medium-2', latex: math`\sin(x)`, answerLatex: math`\cos(x)`, rule: 'Trig derivative', explanation: 'The derivative of sine is cosine.' },
    { id: 'medium-3', latex: math`\cos(3x)`, answerLatex: math`-3\sin(3x)`, rule: 'Chain rule', explanation: 'The derivative of cosine is negative sine. Multiply by the inner derivative 3.' },
    { id: 'medium-4', latex: math`e^{2x}`, answerLatex: math`2e^{2x}`, rule: 'Chain rule', explanation: 'An exponential keeps its form. Multiply by the derivative of its exponent, which is 2.' },
    { id: 'medium-5', latex: math`\ln(x)`, answerLatex: math`\frac{1}{x}`, rule: 'Log derivative', domain: 'x > 0', explanation: 'The natural logarithm has derivative 1/x.' },
    { id: 'medium-6', latex: math`x\sin(x)`, answerLatex: math`\sin(x)+x\cos(x)`, rule: 'Product rule', explanation: 'Differentiate the first factor and keep the second, then keep the first and differentiate the second.' },
    { id: 'medium-7', latex: math`x^2e^x`, answerLatex: math`2xe^x+x^2e^x`, rule: 'Product rule', explanation: 'Apply the product rule: (2x)eˣ + x²(eˣ).' },
    { id: 'medium-8', latex: math`\frac{x}{x+1}`, answerLatex: math`\frac{1}{(x+1)^2}`, rule: 'Quotient rule', domain: 'x ≠ −1', explanation: 'The quotient rule gives ((x + 1) − x)/(x + 1)², which simplifies to 1/(x + 1)².' },
    { id: 'medium-9', latex: math`\ln(2x+1)`, answerLatex: math`\frac{2}{2x+1}`, rule: 'Chain rule', domain: 'x > −½', explanation: 'For ln(u), divide the inner derivative u′ by u. Here u′ is 2.' },
    { id: 'medium-10', latex: math`\sqrt{x^2+1}`, answerLatex: math`\frac{x}{\sqrt{x^2+1}}`, rule: 'Chain rule', explanation: 'Differentiate the square root and multiply by 2x. The factor 2 cancels.' },
    { id: 'medium-11', latex: math`\sin(x^2)`, answerLatex: math`2x\cos(x^2)`, rule: 'Chain rule', explanation: 'Differentiate sine to cosine, then multiply by 2x, the derivative of x².' },
    { id: 'medium-12', latex: math`\frac{x^2}{x+1}`, answerLatex: math`\frac{x^2+2x}{(x+1)^2}`, rule: 'Quotient rule', domain: 'x ≠ −1', explanation: 'Use (2x(x + 1) − x²)/(x + 1)², then collect the numerator terms.' },
  ],
  hard: [
    { id: 'hard-1', latex: math`(x^2+1)^3\sin(x)`, answerLatex: math`6x(x^2+1)^2\sin(x)+(x^2+1)^3\cos(x)`, rule: 'Product + chain rules', explanation: 'Use the product rule. The first factor needs the chain rule: its derivative is 6x(x² + 1)².' },
    { id: 'hard-2', latex: math`e^{x^2}\cos(x)`, answerLatex: math`e^{x^2}(2x\cos(x)-\sin(x))`, rule: 'Product + chain rules', explanation: 'The first factor differentiates to 2xe^(x²). Differentiate cosine to negative sine and factor out the exponential.' },
    { id: 'hard-3', latex: math`\ln(x^2+1)`, answerLatex: math`\frac{2x}{x^2+1}`, rule: 'Chain rule', explanation: 'The derivative of ln(u) is u′/u. Substitute u = x² + 1 and u′ = 2x.' },
    { id: 'hard-4', latex: math`\frac{\sin(x)}{x^2+1}`, answerLatex: math`\frac{(x^2+1)\cos(x)-2x\sin(x)}{(x^2+1)^2}`, rule: 'Quotient rule', explanation: 'Multiply the denominator by the derivative of the numerator, subtract the numerator times 2x, and divide by the denominator squared.' },
    { id: 'hard-5', latex: math`\sin(\ln(x))`, answerLatex: math`\frac{\cos(\ln(x))}{x}`, rule: 'Nested chain rule', domain: 'x > 0', explanation: 'Differentiate the outer sine, then multiply by the derivative of ln(x), which is 1/x.' },
    { id: 'hard-6', latex: math`\ln(\sin(x))`, answerLatex: math`\frac{\cos(x)}{\sin(x)}`, rule: 'Nested chain rule', domain: '0 < x < π', explanation: 'Use u′/u for the logarithm, with u = sin(x) and u′ = cos(x).' },
    { id: 'hard-7', latex: math`(\sin(x^2))^3`, answerLatex: math`6x(\sin(x^2))^2\cos(x^2)`, rule: 'Nested chain rule', explanation: 'Work from outside inward: the cube contributes 3 sin²(x²), sine contributes cos(x²), and x² contributes 2x.' },
    { id: 'hard-8', latex: math`\frac{e^x}{x^2+1}`, answerLatex: math`\frac{e^x(x^2-2x+1)}{(x^2+1)^2}`, rule: 'Quotient rule', explanation: 'The quotient rule gives eˣ(x² + 1) − 2xeˣ in the numerator. Factor and collect like terms.' },
    { id: 'hard-9', latex: math`x^2\ln(x)`, answerLatex: math`2x\ln(x)+x`, rule: 'Product rule', domain: 'x > 0', explanation: 'Differentiate each factor in turn: 2x ln(x) + x²/x. The second term simplifies to x.' },
    { id: 'hard-10', latex: math`\sqrt{1+e^{2x}}`, answerLatex: math`\frac{e^{2x}}{\sqrt{1+e^{2x}}}`, rule: 'Nested chain rule', explanation: 'The square root contributes 1/(2√(1 + e²ˣ)); the inner exponential contributes 2e²ˣ.' },
    { id: 'hard-11', latex: math`e^{\sin(x)}`, answerLatex: math`e^{\sin(x)}\cos(x)`, rule: 'Nested chain rule', explanation: 'Keep the exponential and multiply by the derivative of its exponent sin(x), which is cos(x).' },
    { id: 'hard-12', latex: math`(\ln(x))^2\sin(x)`, answerLatex: math`\frac{2\ln(x)\sin(x)}{x}+(\ln(x))^2\cos(x)`, rule: 'Product + chain rules', domain: 'x > 0', explanation: 'Use the product rule. The derivative of (ln(x))² is 2ln(x)/x, and sine differentiates to cosine.' },
  ],
  extreme: [
    { id: 'extreme-1', latex: math`x^x`, answerLatex: math`x^x(\ln(x)+1)`, rule: 'Log differentiation', domain: 'x > 0', explanation: 'Take logs: ln(y) = x ln(x). Differentiate to get y′/y = ln(x) + 1, then multiply by y.' },
    { id: 'extreme-2', latex: math`(x^2+1)^{\sin(x)}`, answerLatex: math`(x^2+1)^{\sin(x)}\left(\cos(x)\ln(x^2+1)+\frac{2x\sin(x)}{x^2+1}\right)`, rule: 'Log differentiation', explanation: 'Take logs and apply the product rule to sin(x) ln(x² + 1). Multiply the resulting derivative by the original function.' },
    { id: 'extreme-3', latex: math`x^{\sin(x)}`, answerLatex: math`x^{\sin(x)}\left(\cos(x)\ln(x)+\frac{\sin(x)}{x}\right)`, rule: 'Log differentiation', domain: 'x > 0', explanation: 'Differentiate ln(y) = sin(x) ln(x) with the product rule, then multiply by y.' },
    { id: 'extreme-4', latex: math`(\ln(x))^x`, answerLatex: math`(\ln(x))^x\left(\ln(\ln(x))+\frac{1}{\ln(x)}\right)`, rule: 'Log differentiation', domain: 'x > 1', explanation: 'Take logs: ln(y) = x ln(ln(x)). The product rule gives ln(ln(x)) + 1/ln(x). Multiply by y.' },
    { id: 'extreme-5', latex: math`(x^2+1)^{e^x}`, answerLatex: math`(x^2+1)^{e^x}e^x\left(\ln(x^2+1)+\frac{2x}{x^2+1}\right)`, rule: 'Log differentiation', explanation: 'Differentiate ln(y) = eˣ ln(x² + 1). Factor eˣ from the result, then multiply by the original y.' },
    { id: 'extreme-6', latex: math`e^{\sin(x^2)}\ln(x)`, answerLatex: math`e^{\sin(x^2)}\left(2x\cos(x^2)\ln(x)+\frac{1}{x}\right)`, rule: 'Product + nested chain rules', domain: 'x > 0', explanation: 'Use the product rule. Differentiating the exponential requires multiplying by cos(x²) and then 2x. Factor out the exponential.' },
    { id: 'extreme-7', latex: math`\ln(\ln(x^2+1))`, answerLatex: math`\frac{2x}{(x^2+1)\ln(x^2+1)}`, rule: 'Deep chain rule', domain: 'x > 0', explanation: 'Differentiate each layer from outside inward: 1/ln(x² + 1), then 1/(x² + 1), then 2x.' },
    { id: 'extreme-8', latex: math`\frac{\ln(x)}{\sqrt{1+x^2}}`, answerLatex: math`\frac{1+x^2-x^2\ln(x)}{x(1+x^2)^{\frac{3}{2}}}`, rule: 'Quotient + chain rules', domain: 'x > 0', explanation: 'Use the quotient rule with the derivative x/√(1 + x²) for the denominator, then combine over x(1 + x²)^(3/2).' },
    { id: 'extreme-9', latex: math`(\sin(x))^x`, answerLatex: math`(\sin(x))^x\left(\ln(\sin(x))+\frac{x\cos(x)}{\sin(x)}\right)`, rule: 'Log differentiation', domain: '0 < x < π', explanation: 'Take logs: ln(y) = x ln(sin(x)). Apply the product and chain rules, then multiply by y.' },
    { id: 'extreme-10', latex: math`\sin(e^{x^2})`, answerLatex: math`2xe^{x^2}\cos(e^{x^2})`, rule: 'Deep chain rule', explanation: 'Work inward through sine, the exponential, and x². Their derivative factors are cos(e^(x²)), e^(x²), and 2x.' },
  ],
};

export function getQuestion(id) {
  return Object.values(QUESTIONS).flat().find((question) => question.id === id);
}

export function pickQuestion(levelId, excludeIds = []) {
  const level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
  const bank = QUESTIONS[level.difficulty];
  const fresh = bank.filter((question) => !excludeIds.includes(question.id));
  const candidates = fresh.length ? fresh : bank;
  if (level.id === 1 && excludeIds.length === 0) return bank[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}
