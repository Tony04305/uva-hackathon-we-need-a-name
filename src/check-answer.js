import { ComputeEngine } from '@cortex-js/compute-engine';

const engine = new ComputeEngine();

// Both sides are parsed as math, never run as JavaScript. Validate the raw tree
// before canonicalizing so an unknown variable cannot disappear in 0·y.
const symbols = new Set(['x', 'e', 'ExponentialE', 'Pi']);
const operators = new Set([
  'Add', 'Subtract', 'Negate', 'Multiply', 'Divide', 'Rational', 'Power',
  'Square', 'Sqrt', 'Root', 'Exp', 'Ln', 'Log', 'Log10', 'Log2',
  'Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc', 'Abs',
  'Arcsin', 'Arccos', 'Arctan', 'Sinh', 'Cosh', 'Tanh',
  'Delimiter', 'InvisibleOperator',
]);

// Non-integer values on both sides of zero avoid accepting a derivative that
// happens to match only at familiar points. Positive samples cover log domains.
const samplePoints = [
  -6.173, -3.719, -2.413, -1.827, -1.219, -0.763, -0.317, -0.079,
  0.043, 0.119, 0.237, 0.391, 0.583, 0.797, 0.941, 1.137,
  1.379, 1.631, 1.913, 2.173, 2.479, 2.831, 3.193, 3.617,
  4.031, 4.579, 5.137, 5.719, 6.317, 7.139,
];

function inDomain(x, domain) {
  switch (domain) {
    case 'x > 0': return x > 0;
    case 'x > 1': return x > 1;
    case '0 < x < π': return x > 0 && x < Math.PI;
    case 'x > −½': return x > -0.5;
    case 'x ≠ 0': return x !== 0;
    case 'x ≠ −1': return x !== -1;
    default: return true;
  }
}

function validateTree(node, budget = { count: 0 }, depth = 0) {
  if (++budget.count > 300 || depth > 30) throw new Error('Please use a shorter expression.');
  if (typeof node === 'number') {
    if (!Number.isFinite(node) || Math.abs(node) > 1e12) throw new Error('Use finite numbers in your answer.');
    return;
  }
  if (typeof node === 'string') {
    if (!symbols.has(node)) throw new Error('Use x as the only variable, and enter just the derivative.');
    return;
  }
  if (node && !Array.isArray(node) && typeof node === 'object' && 'num' in node) {
    validateTree(Number(node.num), budget, depth + 1);
    return;
  }
  if (!Array.isArray(node) || !operators.has(node[0])) {
    throw new Error('Enter a mathematical expression using x, without an equals sign.');
  }
  if (node[0] === 'Delimiter') {
    validateTree(node[1], budget, depth + 1);
    return;
  }
  for (const operand of node.slice(1)) validateTree(operand, budget, depth + 1);
}

// A small, explicit MathJSON interpreter keeps numerical checking predictable
// and prevents user input from invoking arbitrary engine functions or code.
function valueAt(node, x) {
  if (typeof node === 'number') return node;
  if (typeof node === 'string') return node === 'x' ? x : node === 'Pi' ? Math.PI : Math.E;
  if (!Array.isArray(node)) return Number(node.num);
  const [op, ...operands] = node;
  const args = operands.map((operand) => valueAt(operand, x));
  const [a, b] = args;
  switch (op) {
    case 'Add': return args.reduce((sum, value) => sum + value, 0);
    case 'Subtract': return a - b;
    case 'Negate': return -a;
    case 'Multiply': case 'InvisibleOperator': return args.reduce((product, value) => product * value, 1);
    case 'Divide': case 'Rational': return a / b;
    case 'Power': return Math.pow(a, b);
    case 'Square': return a * a;
    case 'Sqrt': return Math.sqrt(a);
    case 'Root': return a < 0 && Number.isInteger(b) && b % 2 !== 0 ? -Math.pow(-a, 1 / b) : Math.pow(a, 1 / b);
    case 'Exp': return Math.exp(a);
    case 'Ln': return Math.log(a);
    case 'Log': return b === undefined ? Math.log10(a) : Math.log(a) / Math.log(b);
    case 'Log10': return Math.log10(a);
    case 'Log2': return Math.log2(a);
    case 'Sin': return Math.sin(a);
    case 'Cos': return Math.cos(a);
    case 'Tan': return Math.tan(a);
    case 'Cot': return 1 / Math.tan(a);
    case 'Sec': return 1 / Math.cos(a);
    case 'Csc': return 1 / Math.sin(a);
    case 'Abs': return Math.abs(a);
    case 'Arcsin': return Math.asin(a);
    case 'Arccos': return Math.acos(a);
    case 'Arctan': return Math.atan(a);
    case 'Sinh': return Math.sinh(a);
    case 'Cosh': return Math.cosh(a);
    case 'Tanh': return Math.tanh(a);
    case 'Delimiter': return a;
    default: return NaN;
  }
}

function parseExpression(latex) {
  if (typeof latex !== 'string' || !latex.trim()) throw new Error('Type your derivative first.');
  if (latex.length > 1600) throw new Error('Please use a shorter expression.');
  if (/[=<>;]/.test(latex) || /[\^_]\s*\{\s*\}/.test(latex)) {
    throw new Error('Finish the expression and enter just the derivative, without an equals sign.');
  }
  const raw = engine.parse(latex, { canonical: false, form: 'raw' });
  if (!raw || !raw.isValid) throw new Error('Check your notation: a bracket, fraction, or exponent may be incomplete.');
  validateTree(raw.json);
  const canonical = raw.canonical;
  validateTree(canonical.json);
  return canonical;
}

/**
 * Check a MathLive LaTeX expression. Numeric equivalence is a fallback for
 * symbolic forms the engine cannot prove equal; it is not a formal CAS proof.
 */
export function checkAnswer(userLatex, expectedLatex, domain) {
  try {
    const actual = parseExpression(userLatex);
    const expected = parseExpression(expectedLatex);
    let comparable = 0;
    let actualFinite = 0;
    let mismatch = false;
    for (const x of samplePoints.filter((point) => inDomain(point, domain))) {
      const actualValue = valueAt(actual.json, x);
      const expectedValue = valueAt(expected.json, x);
      if (Number.isFinite(actualValue)) actualFinite++;
      if (!Number.isFinite(expectedValue)) continue;
      if (!Number.isFinite(actualValue)) {
        mismatch = true;
        continue;
      }
      comparable++;
      const tolerance = 1e-9 * Math.max(1, Math.abs(expectedValue), Math.abs(actualValue));
      if (Math.abs(actualValue - expectedValue) > tolerance) mismatch = true;
    }
    if (actualFinite === 0) return { status: 'invalid', message: 'Your expression needs a finite real value. Check fractions, roots, and logarithms.' };
    if (mismatch) return { status: 'incorrect' };
    // Canonical identity handles reordered terms and many algebraic forms.
    if (actual.isSame(expected)) return { status: 'correct' };
    // A symbolic difference catches tiny but genuinely nonzero errors that
    // floating-point tolerances could otherwise accept (e.g. 2x + 10^-10).
    const difference = engine.box(['Subtract', actual.json, expected.json]).simplify().json;
    if (typeof difference === 'number') return { status: difference === 0 ? 'correct' : 'incorrect' };
    if (difference && !Array.isArray(difference) && typeof difference === 'object' && 'num' in difference) {
      const exactZero = /^[+-]?(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?$/i.test(String(difference.num));
      return { status: exactZero ? 'correct' : 'incorrect' };
    }
    if (comparable < 10) return { status: 'invalid', message: 'We could not check this form reliably. Try simplifying your answer.' };
    return { status: 'correct' };
  } catch (error) {
    return { status: 'invalid', message: error.message || 'Check your mathematical notation and try again.' };
  }
}
