import assert from 'node:assert/strict';
import test from 'node:test';
import {attainment, calculateWeightedScore, canPublish, canVerify, cycleErrors, employeeResult, evidenceDateError, invalidate, lacksEvidence, overdue, policySeed, removeEmployeeEvidence, scoreLevel, seed, submitErrors, validatePolicy} from '../src/model.mjs';

test('score boundaries use full precision',()=>{
  for(const [score,level] of [[1,1],[1.49,1],[1.5,2],[2.49,2],[2.5,3],[3.499,3],[3.5,4],[4.5,5],[5,5]]) assert.equal(scoreLevel(score),level);
});
test('weighted rating rejects invalid weights and handles exact example',()=>{
  const items=[{rating:4},{rating:3},{rating:4}];
  assert.equal(calculateWeightedScore(items,[50,30,20]),3.7);
  for(const weights of [[50,30,19],[50,51,-1],[100,0,0],[0,0,0],[50.1,29.9,20]]) assert.equal(calculateWeightedScore(items,weights),null);
});
test('null, pending N/A, approved optional N/A and mandatory N/A stay distinct',()=>{
  const items=[{rating:3},{rating:5},{rating:null}];
  assert.equal(calculateWeightedScore(items,[50,30,20]),null);
  items[2].na='pending';
  assert.equal(calculateWeightedScore(items,[50,30,20]),null);
  items[2].na='approved';
  assert.equal(calculateWeightedScore(items,[50,30,20]),3.75);
  for(const item of items)item.na='approved';
  assert.equal(calculateWeightedScore(items,[50,30,20]),null);
});
test('target math guards zero and lower-is-better / qualitative measures',()=>{
  assert.equal(attainment({method:'higher',actual:125,target:100}),125);
  assert.equal(attainment({method:'higher',actual:10,target:0}),null);
  assert.equal(attainment({method:'higher',actual:null,target:10}),null);
  assert.equal(attainment({method:'lower',actual:2,target:10}),null);
  assert.equal(attainment({method:'qualitative',actual:10,target:10}),null);
});
test('invalid policy and unassigned cycle participants block activation',()=>{
  const {people}=seed();
  const policy=policySeed();
  const participantIds=people.map(p=>p.id);
  const draft={name:'Test',start:'2026-01-01',end:'2026-07-01',due:'2026-08-01',approver:'hr',participants:participantIds,managerMap:Object.fromEntries(people.map(person=>[person.id,'m'+(person.team+1)])),templateMap:Object.fromEntries(participantIds.map(id=>[id,0])),exclusionReasons:{}};
  assert.deepEqual(cycleErrors(draft,people,policy),[]);
  draft.managerMap.e1='';
  draft.templateMap.e2=-1;
  draft.participants=participantIds.filter(id=>id!=='e3');
  policy.weights[0]=[50,20,20];
  assert.equal(validatePolicy(policy).length,1);
  assert.equal(cycleErrors(draft,people,policy).length,4);
});
test('cross-department review assignment requires a reason before activation',()=>{
  const {people,policy}=seed();
  const participant=people[0];
  const draft={name:'Test',start:'2026-01-01',end:'2026-07-01',due:'2026-08-01',approver:'hr',participants:[participant.id],managerMap:{[participant.id]:'m2'},templateMap:{[participant.id]:0},crossDepartmentReasons:{[participant.id]:'   '}};
  const options={requireExclusionReasons:false};
  assert.deepEqual(cycleErrors(draft,people,policy,options),[participant.name+' needs a reason for the cross-department reviewer.']);
  draft.crossDepartmentReasons[participant.id]='หัวหน้าฝ่ายไม่อยู่ในช่วงประเมิน';
  assert.deepEqual(cycleErrors(draft,people,policy,options),[]);
});
test('submission requires assigned manager, evidence for each criterion and valid justification',()=>{
  const cycle=seed().cycles[0];
  const review=cycle.reviews[0];
  review.stage='draft';
  assert.deepEqual(submitErrors(review,cycle,'m1'),[]);
  assert.ok(submitErrors(review,cycle,'m2').length);
  assert.ok(submitErrors(review,{...cycle,status:'closed'},'m1').length);
  review.items[0].evidenceIds=[review.evidence[1].id];
  review.items[1].note='';
  review.items[2].na='pending';
  assert.equal(submitErrors(review,cycle,'m1').length,3);
});
test('missing data is detectable without labelling the employee as below expectations',()=>{
  const cycle=seed().cycles[0];
  const incomplete=cycle.reviews[3];
  const below=cycle.reviews[2];
  assert.ok(lacksEvidence(incomplete));
  assert.equal(employeeResult(incomplete,incomplete.id),null);
  assert.equal(employeeResult(below,below.id).rating,2);
  assert.ok(overdue(cycle.reviews[4]));
});
test('publish is gated separately from verify, and future calibration lock is enforced',()=>{
  const cycle=seed().cycles[0];
  const submitted=cycle.reviews[0];
  const approved=cycle.reviews[6];
  assert.equal(canVerify(submitted),true);
  assert.equal(canVerify(approved),false);
  assert.equal(canPublish(submitted,cycle),false);
  assert.equal(canPublish(approved,cycle),true);
  const withCalibration={...cycle,requiresCalibration:true};
  assert.equal(canPublish(approved,withCalibration),false);
  assert.equal(canPublish(approved,{...withCalibration,calibrationLocked:true}),true);
  assert.equal(canPublish(submitted,{...withCalibration,calibrationLocked:true}),false);
});
test('employee-facing selector exposes only own published results',()=>{
  const cycle=seed().cycles[0];
  const review=cycle.reviews[1];
  assert.equal(employeeResult(review,'e1'),null);
  for(const stage of ['submitted','verified','approved','revision','draft']) assert.equal(employeeResult({...review,stage},review.id),null);
  const result=employeeResult(review,review.id);
  assert.equal(result.rating,5);
  assert.equal('items' in result,false);
});
test('new material evidence clears existing approval and requires a fresh review',()=>{
  const cycle=seed().cycles[0];
  const review=cycle.reviews[6];
  invalidate(review,'e7','เพิ่มหลักฐานจากงานปลายรอบ');
  assert.equal(review.stage,'revision');
  assert.equal(review.final,null);
  assert.equal(review.verifiedAt,null);
  assert.equal(review.approvedAt,null);
  assert.equal(review.audit.length,1);
  assert.equal(canPublish(review,cycle),false);
});

test('removing employee evidence unlinks ratings and returns an approved review for reassessment',()=>{
  const {people,cycles}=seed();
  const review=cycles[0].reviews.find(record=>record.stage==='approved');
  const employee=people.find(person=>person.id===review.id);
  const evidence=review.evidence[0];
  assert.ok(review.items.some(item=>item.evidenceIds.includes(evidence.id)));
  assert.equal(removeEmployeeEvidence(review,employee,evidence.id),true);
  assert.equal(review.evidence.some(item=>item.id===evidence.id),false);
  assert.equal(review.items.some(item=>item.evidenceIds.includes(evidence.id)),false);
  assert.equal(review.stage,'revision');
  assert.equal(review.final,null);
  assert.equal(review.audit[0].action,'Removed evidence');
  assert.equal(removeEmployeeEvidence(review,employee,evidence.id),false);
});

test('employee cannot remove manager evidence, another employee’s evidence, or published evidence',()=>{
  const {people,cycles}=seed();
  const draft=cycles[0].reviews.find(record=>record.stage==='draft');
  const employee=people.find(person=>person.id===draft.id);
  draft.evidence.push({id:'manager',actor:'Assigned manager',dimension:0});
  draft.evidence.push({id:'own',actor:'Old display name',employeeId:employee.id,dimension:0});
  const published=cycles[0].reviews.find(record=>record.stage==='published');
  const publishedEmployee=people.find(person=>person.id===published.id);
  assert.equal(removeEmployeeEvidence(draft,employee,'manager'),false);
  assert.equal(removeEmployeeEvidence(draft,publishedEmployee,'own'),false);
  assert.equal(removeEmployeeEvidence(published,publishedEmployee,published.evidence[0].id),false);
  assert.equal(removeEmployeeEvidence(draft,employee,'own'),true);
});

test('work dates must be present and within the review period, including both boundaries',()=>{
  const cycle={start:'2026-01-01',end:'2026-12-31'};
  assert.equal(evidenceDateError('',cycle),'Enter the work date.');
  for(const day of ['2025-12-31','2027-01-01']){
    assert.equal(evidenceDateError(day,cycle),'The work date must fall within the review period.');
  }
  for(const day of [cycle.start,'2026-06-15',cycle.end])assert.equal(evidenceDateError(day,cycle),'');
});
