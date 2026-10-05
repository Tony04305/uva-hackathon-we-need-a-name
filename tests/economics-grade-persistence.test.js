import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomicsProgress, submitEconomicsResult, restoreEconomicsProgress } from '../src/economics-progress.js';
import { restoreEconomicsGrade } from '../src/economics-grade.js';
const grade = { score: 5, maxScore: 6, passed: true, source: 'ai', feedback: 'You traced the shock clearly.', improvement: 'Name the unchanged supply curve.',
 criteria: ['shock','mechanism','assumptions'].map((id,i) => ({id,label:id,score:i===2?1:2,maxScore:2,feedback:'Specific criterion feedback.'})) };
const restore = (s) => restoreEconomicsProgress(JSON.stringify(s),id=>id==='econ-1-a');
test('a long typed or spoken draft survives reload without losing progress',()=>{
 const state=createEconomicsProgress('econ-1-a'); state.answer={demand:'right',price:'up',explanation:'An editable economic explanation. '.repeat(40)};
 assert.deepEqual(restore(state).answer,state.answer);
 assert.equal(restore({...state,answer:{explanation:'a'.repeat(1601)}}),null);
});
test('a completed AI grade and draft survive reload',()=>{
 const state=submitEconomicsResult(createEconomicsProgress('econ-1-a'),true);state.answer={explanation:'The campaign changes preferences so demand rises while supply stays fixed.'};state.result.grade=grade;
 const restored=restore(state);assert.deepEqual(restored.result.grade,grade);assert.equal(restored.streak,1);assert.deepEqual(restored.answer,state.answer);
});
test('invalid optional grade data is discarded without erasing earned progress',()=>{
 const state=submitEconomicsResult(createEconomicsProgress('econ-1-a'),true);
 for(const patch of [{score:6},{source:'fake'},{criteria:[]},{criteria:[grade.criteria[0],grade.criteria[0],grade.criteria[2]]},{passed:false}]){
  state.result.grade={...grade,...patch}; const restored=restore(state);assert.equal(restored.streak,1);assert.equal(restored.result.grade,undefined);
 }
 assert.equal(restoreEconomicsGrade(null),null);
});
