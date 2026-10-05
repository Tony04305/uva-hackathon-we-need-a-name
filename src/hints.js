import { getQuestion } from './questions.js';

// These reviewed texts are the only hints that may reach the student. An AI
// may select a hint ID; its free-form response must never become hint content.
// Keep even the final hint as a strategy or check, never a worked derivative.
const HINTS = {
  'easy-1': [
    'This is a power of the variable. Start by identifying its exponent.',
    'Use the power rule: the original exponent affects the coefficient, and the power decreases.',
    'Check both parts of your result: the new coefficient and the new exponent. Changing only one misses part of the rule.',
  ],
  'easy-2': [
    'Look for the rule that differentiates a variable raised to a fixed power.',
    'Write down the original coefficient and exponent separately before applying the power rule.',
    'Use the old exponent when finding the new coefficient, then check that you have also reduced the power.',
  ],
  'easy-3': [
    'You can handle the terms of this polynomial separately.',
    'Keep each constant coefficient attached to its term while applying the power rule.',
    'Check the squared term and the linear term individually before combining your results.',
  ],
  'easy-4': [
    'Separate the changing part of this function from its constant offset.',
    'Sketch the straight line and think about what determines its slope.',
    'Your derivative should describe how the line changes as the input changes, rather than where the line crosses the vertical axis.',
  ],
  'easy-5': [
    'Before choosing a rule, look for whether this expression contains the variable at all.',
    'Picture the graph of the function and compare its output at nearby input values.',
    'Recall what a derivative measures: a change in output compared with a change in input. Apply that idea to your sketch.',
  ],
  'easy-6': [
    'A single power of the variable calls for the power rule.',
    'The power rule changes both the coefficient and the exponent. Keep track of those changes separately.',
    'Check that you used the original exponent in the coefficient calculation before reducing the exponent.',
  ],
  'easy-7': [
    'Break the polynomial into its cubic term, linear term, and constant term.',
    'Apply the power rule to the variable terms and the constant rule to the remaining term.',
    'Keep the subtraction sign with the linear term, and check that every original term has been considered.',
  ],
  'easy-8': [
    'Differentiate this polynomial term by term.',
    'Handle the quadratic term with the power rule; treat the linear term and constant separately.',
    'Check the sign of the linear term and think carefully about what the constant contributes.',
  ],
  'easy-9': [
    'A reciprocal can be written as a negative power of the variable.',
    'After rewriting it, use the same power rule you would use for a positive exponent.',
    'Be careful when decreasing a negative exponent. Check the coefficient sign before rewriting your answer as a fraction.',
  ],
  'easy-10': [
    'A square root can be written as a fractional power.',
    'Rewrite the root using an exponent, then apply the power rule without changing the rule for fractions.',
    'Check your fraction arithmetic when reducing the exponent. You can return to root notation after differentiating.',
  ],
  'easy-11': [
    'Treat the fraction as a constant coefficient multiplying a power of the variable.',
    'Differentiate the cubic term and the linear term separately.',
    'Simplify constant factors only after applying the power rule, then check that you included the linear term.',
  ],
  'easy-12': [
    'This is a difference of powers, so you can differentiate each term separately.',
    'For each term, keep its coefficient while applying the power rule to its variable part.',
    'Check each coefficient calculation and preserve the subtraction between the terms.',
  ],
  'medium-1': [
    'A linear expression sits inside a cube. This is a composition of functions.',
    'Use the chain rule: work with the outer power while temporarily treating the inner expression as one object.',
    'After handling the outer layer, remember the derivative of the inner linear expression. Simplify only after both layers are included.',
  ],
  'medium-2': [
    'This uses a standard trigonometric differentiation rule.',
    'Recall the basic trig derivative table, or think about how the slope of a sine curve changes through a cycle.',
    'Check your candidate against where the sine curve has turning points and where it is increasing or decreasing.',
  ],
  'medium-3': [
    'The trigonometric function has an inner linear expression, so look for the chain rule.',
    'Recall the derivative rule for the outer trig function, leaving its input unchanged while you apply it.',
    'Check the sign from the trig rule and make sure you have accounted for the inner expression as well.',
  ],
  'medium-4': [
    'This is an exponential function with a variable expression in its exponent.',
    'Use the exponential differentiation rule for the outer function, then consider the inner linear expression.',
    'Check that the chain rule accounts for the exponent. Do not apply the polynomial power rule to this exponential.',
  ],
  'medium-5': [
    'Start with the standard differentiation rule for the natural logarithm.',
    'The input to the logarithm is already the variable itself, so this is the basic log rule without an extra inner layer.',
    'The logarithm rises more slowly as its positive input grows. Check that your candidate is consistent with that behaviour.',
  ],
  'medium-6': [
    'Two functions of the variable are multiplied together.',
    'Use the product rule rather than multiplying the individual derivatives.',
    'Make a pair of terms: differentiate a different factor in each term and keep the other factor unchanged.',
  ],
  'medium-7': [
    'Identify the polynomial factor and the exponential factor before starting.',
    'Use the product rule and work out each factor derivative separately on scratch paper.',
    'Check that both product-rule terms are present. Any common factor can be collected after differentiation.',
  ],
  'medium-8': [
    'The numerator and denominator both depend on the variable.',
    'Use the quotient rule, keeping the numerator and denominator roles clearly labelled.',
    'Check the order of subtraction in the quotient-rule numerator and the power on its denominator before simplifying.',
  ],
  'medium-9': [
    'A linear function sits inside the logarithm.',
    'Use the natural-log rule together with the chain rule for its inner expression.',
    'Keep the whole inner expression together, and check that its derivative has been included before simplifying.',
  ],
  'medium-10': [
    'A square root surrounds a polynomial, so there are outer and inner layers.',
    'Rewrite the outer square root as a fractional power if that makes the chain rule easier to organize.',
    'Check the outer power-rule step and the inner polynomial step separately, then simplify any constant factors.',
  ],
  'medium-11': [
    'A squared expression is the input to a trigonometric function.',
    'Apply the outer trig rule while keeping its input intact, then account for the inner power.',
    'The inner expression stays inside the trig function. Check that you also included its derivative as a separate chain-rule factor.',
  ],
  'medium-12': [
    'This is a quotient of variable expressions, not a constant multiple of the numerator.',
    'Label the numerator and denominator, then apply the quotient rule to those two pieces.',
    'Keep the subtraction grouped when expanding the numerator; check the denominator before collecting like terms.',
  ],
  'hard-1': [
    'At the outermost level, this expression is a product.',
    'Plan a product-rule term for each factor. The powered polynomial factor also needs the chain rule.',
    'Check that the polynomial inside the power has been differentiated, and that the untouched factor appears in each product-rule term.',
  ],
  'hard-2': [
    'The exponential and trigonometric parts are separate factors.',
    'Use the product rule, and apply the chain rule inside the exponential factor.',
    'Check the trig sign and the derivative of the exponent separately. Factor common pieces only after both product-rule terms are present.',
  ],
  'hard-3': [
    'A polynomial appears inside a natural logarithm.',
    'Treat that polynomial as a single inner function while using the logarithm rule.',
    'Check that the whole inner expression stays together and that the chain-rule contribution from it has not been omitted.',
  ],
  'hard-4': [
    'Start by labelling the trigonometric numerator and polynomial denominator.',
    'The quotient rule combines derivatives of those two parts; work them out separately before assembling anything.',
    'Check subtraction order, brackets around the denominator expression, and the denominator power before expanding.',
  ],
  'hard-5': [
    'Read this as a trigonometric function whose input is a logarithm.',
    'Use the chain rule from the outside inward, leaving the logarithm intact during the outer step.',
    'Check that your work includes both layers and that you have kept the original logarithmic input inside the outer trig result.',
  ],
  'hard-6': [
    'The logarithm is the outer function; the trigonometric expression is its input.',
    'Apply the logarithm rule to that entire input, then handle the inner trig function with the chain rule.',
    'Check the order of the layers. Differentiating the inner function first and then taking its logarithm is a different operation.',
  ],
  'hard-7': [
    'There are several layers: an outer power, a trig function, and an inner power.',
    'Apply the chain rule from the outer power inward, writing a separate contribution for each layer.',
    'Trace your expression back through the original layers and make sure none was skipped before combining constant factors.',
  ],
  'hard-8': [
    'An exponential is divided by a polynomial, so start with the quotient rule.',
    'Work out the numerator and denominator derivatives separately, then assemble the quotient-rule structure.',
    'Check the subtraction before factoring any common exponential term. Keep the denominator grouped throughout.',
  ],
  'hard-9': [
    'The polynomial and logarithm form a product.',
    'Apply the product rule, using the power rule for one factor and the natural-log rule for the other.',
    'Check that each product-rule term contains an unchanged factor. Simplify products and fractions only after assembling both terms.',
  ],
  'hard-10': [
    'A square root surrounds an expression that contains an exponential.',
    'Plan the chain rule in layers: the outer root, the inner sum, and the exponential with its own exponent.',
    'Check which parts of the inner sum vary, and make sure you have accounted for the exponent as well as the root.',
  ],
  'hard-11': [
    'The exponential is the outer function, with a trigonometric expression as its exponent.',
    'Start with the exponential rule while leaving the exponent unchanged, then apply the chain rule to the exponent.',
    'Check that the trig expression remains inside the exponential and that its derivative has been handled as a separate factor.',
  ],
  'hard-12': [
    'At the outermost level, you have a product of a squared logarithm and a trig function.',
    'Use the product rule first. The squared logarithm requires a chain-rule step of its own.',
    'Check that the logarithm itself was differentiated inside that squared factor, and keep the other factor unchanged in each product-rule term.',
  ],
  'extreme-1': [
    'Both the base and exponent depend on the variable, so the fixed-exponent power rule does not directly apply.',
    'Name the function and take a natural logarithm of both sides. Use the logarithm power property before differentiating.',
    'Differentiate the transformed product, then remember to undo the logarithmic derivative of your named function. Keep the original function available for that step.',
  ],
  'extreme-2': [
    'The base and trigonometric exponent both vary. Logarithmic differentiation can separate them.',
    'Take the logarithm of the named function so the exponent becomes a multiplier of a logarithm of the base.',
    'Use the product rule on that transformed expression, including the chain rule inside the logarithm. Then isolate the derivative of the original function.',
  ],
  'extreme-3': [
    'This is a variable raised to a variable-dependent power, which suggests logarithmic differentiation.',
    'After naming the function and taking logs, use the logarithm power property to expose a product.',
    'Differentiate both factors of the transformed product in turn, and remember the original function when isolating its derivative.',
  ],
  'extreme-4': [
    'The logarithmic base and the exponent both vary, so consider taking a logarithm of the whole function.',
    'Use the log power property, then plan a product-rule step. A logarithm of a logarithm will need the chain rule.',
    'Check that both nested logarithm layers were handled before isolating the original function derivative. Stay within the stated domain.',
  ],
  'extreme-5': [
    'A changing polynomial base and a changing exponential power make logarithmic differentiation useful.',
    'Take logs of the named function, move the exponent using the log power property, and identify the resulting product.',
    'Check the exponential factor and the logarithm-of-polynomial factor separately during the product rule, then isolate the original derivative.',
  ],
  'extreme-6': [
    'Begin with the product at the outermost level: an exponential factor and a logarithmic factor.',
    'Use the product rule. Within the exponential factor, trace the chain through the trig function to the inner power.',
    'Check that every nested layer contributed before collecting any common factor, and make sure the logarithmic factor has its own product-rule term.',
  ],
  'extreme-7': [
    'This is a logarithm containing another logarithm, which in turn contains a polynomial.',
    'Label the layers and work from the outside inward with the chain rule.',
    'Keep each inner expression intact while handling its outer layer. Trace your result through both logarithms and the polynomial before simplifying.',
  ],
  'extreme-8': [
    'At the outermost level, a logarithm is divided by a square root.',
    'Use the quotient rule. The denominator derivative needs a separate chain-rule calculation for the root and its inner polynomial.',
    'Keep the subtraction grouped while assembling the quotient rule. Combine fractions and powers only after both numerator contributions are present.',
  ],
  'extreme-9': [
    'The trigonometric base and exponent both vary. Use the stated domain and consider logarithmic differentiation.',
    'Take logs of a named function and use the log power property to turn the exponent into a multiplier.',
    'The transformed product contains a logarithm of a trig function. Include its chain rule, then remember to isolate the original function derivative.',
  ],
  'extreme-10': [
    'Trace the layers before calculating: a trig function surrounds an exponential with a powered input.',
    'Apply the chain rule from the outside inward, preserving each inner expression during its outer step.',
    'Check for a contribution from each layer and keep the nested inputs in their original order before simplifying.',
  ],
};

const HINT_IDS = ['start', 'method', 'check'];

/** Return fresh, vetted choices. Unknown or newly unreviewed questions fail closed. */
export function getHintChoices(questionId) {
  const question = getQuestion(questionId);
  const texts = question && HINTS[question.id];
  return texts ? texts.map((text, index) => ({ id: HINT_IDS[index], text })) : [];
}

// Match a whole, direct conversational admission, optionally paired with an
// answer request. Never search for a surrender phrase inside a longer message:
// hypotheticals, quotations, and negations must remain ordinary tutor messages.
const ADMISSION = "(?:i (?:don't|dont|do not) know(?: (?:the answer|this one|how to (?:do|solve) (?:this|it)))?|idk(?: the answer)?|i give up|i dunno)";
const REQUEST = '(?:(?:please )?(?:show|tell|give) me (?:the )?answer(?: please)?|(?:can|could) you (?:please )?(?:show|tell|give) me (?:the )?answer(?: please)?|(?:please )?walk me through (?:it|this|this question)(?: step by step)?|(?:please )?show me (?:a|the|the full) walkthrough)';
const JOIN = '(?:\\s*[,;.!?—–]\\s*|\\s+(?:and|so)\\s+|\\s+)';
const POLITE = '(?:(?:sorry|please)[, ]+)?';
const END = '(?:[, ]+please)?[.!?]*';
const GIVE_UP = new RegExp(`^${POLITE}(?:${ADMISSION}(?:${JOIN}${REQUEST})?|${REQUEST}${JOIN}${ADMISSION})${END}$`, 'u');

export function isGiveUpMessage(text) {
  if (typeof text !== 'string' || text.length > 300) return false;
  const normalized = text.normalize('NFKC').replace(/[’‘]/gu, "'").trim().toLowerCase().replace(/\s+/gu, ' ');
  return GIVE_UP.test(normalized);
}
