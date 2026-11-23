export const dimensions = ['Goal attainment','Work quality','Collaboration'];
export const anchors = ['Below expectations','Partially meets expectations','Meets expectations','Exceeds expectations','Outstanding'];
export const definitions = ['Missed key criteria, with supporting evidence.','Delivered some outcomes, with significant room for improvement.','Delivered the agreed outcomes and quality.','Significantly exceeded the agreed expectations.','Consistently exceeded expectations and made a clear impact.'];
export const stages = {draft:'Awaiting submission',submitted:'Pending HR review',verified:'Pending approval',approved:'Ready to publish',published:'Published',revision:'Changes requested'};
export const teams = ['Operations','Sales','Administration'];
export const managers = {'m1':'Natcha Wattanakul','m2':'Thanwa Tangjai','m3':'Rinlada Kiatchai'};
export const managerDepartments = {m1:0,m2:1,m3:2};
export const isCrossDepartment = (manager, person) => Object.hasOwn(managerDepartments,manager) && managerDepartments[manager]!==person.team;
export const demoDate = '2026-11-23';
export const baseWeights = [[50,30,20],[60,25,15],[45,35,20]];
export const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const criteria = [
  ['Pick and hand off orders to delivery on schedule','Check product codes and quantities before dispatch','Notify Sales and Delivery of stock issues promptly'],
  ['Meet the agreed sales target','Keep customer records and documents accurate','Hand off work and flag risks to the relevant teams'],
  ['Complete documentation by the deadline','Verify records and reduce document rework','Coordinate records with Accounting and the warehouse']
];
export const policySeed = () => ({version:1, labels:[...anchors], definitions:[...definitions], preset:'By department', weights:structuredClone(baseWeights), criteria:structuredClone(criteria)});
export const scoreLevel = score => score === null ? null : Math.min(5,Math.max(1,Math.floor(score+0.5)));
export function validWeights(weights) {
  return weights.length===3 && weights.every(w=>Number.isInteger(w)&&w>0) && weights.reduce((sum,w)=>sum+w,0)===100;
}
export function validatePolicy(policy) {
  const errors = [];
  if (policy.labels.length!==5 || policy.labels.some((name,i)=>!name.trim() || !policy.definitions[i]?.trim())) errors.push('Enter a name and description for all five ratings.');
  teams.forEach((team,i)=>{
    if (!validWeights(policy.weights[i])) errors.push(team+' must have positive weights totaling 100%.');
    if (policy.criteria[i].some(text=>!text.trim())) errors.push(team+' needs descriptions for all three criteria.');
  });
  return errors;
}
export function cycleErrors(draft, people, policy, {requireExclusionReasons=true}={}) {
  const errors = validatePolicy(policy);
  if (!draft.name.trim()) errors.push('Enter a review cycle name.');
  if (!draft.start || !draft.end || !draft.due || draft.start>draft.end || draft.due<draft.end) errors.push('Check that the start, end, and due dates are in order.');
  if (!draft.approver) errors.push('Select an approver.');
  if (!draft.participants.length) errors.push('Select at least one employee.');
  draft.participants.forEach(id=>{
    const person=people.find(item=>item.id===id);
    if (!person || !Object.hasOwn(managers,draft.managerMap[id]) || !Number.isInteger(draft.templateMap[id]) || !teams[draft.templateMap[id]]) errors.push((person?.name ?? id)+' needs a manager and a job template.');
    else if (isCrossDepartment(draft.managerMap[id],person) && !draft.crossDepartmentReasons?.[id]?.trim()) errors.push(person.name+' needs a reason for the cross-department reviewer.');
  });
  if (requireExclusionReasons) people.filter(person=>!draft.participants.includes(person.id)).forEach(person=>{
    if (!draft.exclusionReasons?.[person.id]?.trim()) errors.push('Enter a reason for excluding '+person.name+'  from this cycle.');
  });
  return errors;
}
export function calculateWeightedScore(items, weights) {
  if (!validWeights(weights) || items.length!==3 || items[0].na==='approved') return null;
  let total=0, eligible=0;
  for (const [index,item] of items.entries()) {
    if (item.na==='approved') continue;
    if (item.na==='pending' || ![1,2,3,4,5].includes(item.rating)) return null;
    total+=item.rating*weights[index];
    eligible+=weights[index];
  }
  return eligible ? total/eligible : null;
}
export function attainment(goal) {
  return goal.method==='higher' && Number.isFinite(goal.actual) && Number.isFinite(goal.target) && goal.target>0 ? goal.actual/goal.target*100 : null;
}
export function freshItems() {
  return dimensions.map(()=>({rating:null,note:'',evidenceIds:[],na:null,naReason:''}));
}
export function newReview(person,cycle,manager,template) {
  return {id:person.id, manager,template,due:cycle.due,stage:'draft',goal:{title:criteria[template][0],expected:'Deliver the results agreed with the reviewer',method:'qualitative',target:null,actual:null,unit:'',result:'',approved:false,history:[]},evidence:[],reflection:{},items:freshItems(),proposed:null,proposalReason:'',summary:'',development:'',final:null,finalReason:'',audit:[],acknowledged:false};
}
export function submitErrors(review, cycle, actor) {
  const errors=[];
  if (cycle.status!=='active') errors.push('Activate the review cycle before submitting.');
  if (actor!==review.manager || !managers[actor]) errors.push('Only the assigned manager can submit this review.');
  if (!['draft','revision'].includes(review.stage)) errors.push('This review is closed for editing.');
  if (review.goalSuggestion) errors.push('Review the employee’s goal proposal before submitting.');
  if (!review.goal.approved || !review.goal.title.trim() || !review.goal.expected.trim()) errors.push('Confirm the goal and success criteria before submitting.');
  if (!review.goal.result.trim() || (review.goal.method!=='qualitative' && !Number.isFinite(review.goal.actual))) errors.push('Record the actual outcome for the goal.');
  review.items.forEach((item,i)=>{
    const name=dimensions[i];
    if (item.na==='pending') errors.push(name+' is awaiting HR approval for N/A.');
    else if (item.na==='approved') {
      if (i===0) errors.push('Goal attainment is a required criterion.');
    } else {
      if (![1,2,3,4,5].includes(item.rating)) errors.push(name+' needs a rating of 1–5.');
      if (item.note.trim().length<8) errors.push(name+' needs a rationale of at least 8 characters.');
      if (!item.evidenceIds.some(id=>review.evidence.some(e=>e.id===id&&e.dimension===i))) errors.push(name+' needs evidence linked to this criterion.');
    }
  });
  const score=calculateWeightedScore(review.items,cycle.policy.weights[review.template]);
  if (review.proposed && review.proposed!==scoreLevel(score) && review.proposalReason.trim().length<8) errors.push('Explain why the proposed rating differs from the calculated rating.');
  if (!review.summary.trim() || !review.development.trim()) errors.push('Enter a performance summary and development plan.');
  return errors;
}
export const canVerify = review => review.stage==='submitted' && !review.items.some(item=>item.na==='pending');
export const canPublish = (review,cycle) => cycle.status==='active' && review.stage==='approved' && [1,2,3,4,5].includes(review.final) && !!review.finalReason?.trim() && (!cycle.requiresCalibration || cycle.calibrationLocked===true);
export const employeeResult = (review, id) => review?.id===id && review.stage==='published' && review.publishedAt ? {rating:review.final, reason:review.finalReason, summary:review.summary, development:review.development, publishedAt:review.publishedAt, acknowledged:review.acknowledged} : null;
export const overdue = review => review.due < demoDate && !['approved','published'].includes(review.stage);
export const missingEvidenceDimensions = review => review.items.flatMap((item,index)=>
  item.na!=='approved' && !review.evidence.some(e=>e.dimension===index) ? [index] : [],
);
export const lacksEvidence = review => missingEvidenceDimensions(review).length>0;
export function log(review,actor,action,reason='',details={}) {
  review.audit.unshift({at:new Date().toISOString(),actor,action,reason,...details});
}
export function invalidate(review,actor,reason) {
  if (!['submitted','verified','approved'].includes(review.stage)) return;
  review.stage='revision';
  review.revisionReason=reason;
  review.verifiedAt=null;
  review.approvedAt=null;
  review.final=null;
  review.finalReason='';
  log(review,actor,'Returned for reassessment',reason);
}
export function evidenceDateError(date, cycle) {
  if (!date) return 'Enter the work date.';
  if (date<cycle.start || date>cycle.end) return 'The work date must fall within the review period.';
  return '';
}

export function isEmployeeEvidence(evidence, person) {
  return evidence.employeeId ? evidence.employeeId===person.id : evidence.actor===person.name;
}

export function canRemoveEvidence(review, person, evidence) {
  return review.id===person.id && review.stage!=='published' && isEmployeeEvidence(evidence,person);
}

export function removeEmployeeEvidence(review, person, evidenceId) {
  const evidence=review.evidence.find(item=>item.id===evidenceId);
  if (!evidence || !canRemoveEvidence(review,person,evidence)) return false;
  review.evidence=review.evidence.filter(item=>item.id!==evidenceId);
  for (const item of review.items) {
    item.evidenceIds=item.evidenceIds.filter(id=>id!==evidenceId);
  }
  invalidate(review,person.name,'Evidence removed after submission');
  log(review,person.name,'Removed evidence','',{snapshot:{id:evidence.id,dimension:evidence.dimension}});
  return true;
}

export function seed() {
  const names=['Pimchanok Sriwat','Kittiphop Saengthong','Nichakorn Pongdee','Phakin Thanakit','Chonthicha Insuk','Thanakorn Rungrueang','Chanakan Phithak','Pakorn Sukdee','Waranya Saengchai','Chayanit Chandee','Natthaphon Thammasri','Manatsawi Wongkaew'];
  const configs=[
    [0,'submitted',4],[1,'published',5],[2,'published',2],[0,'draft',null],[1,'draft',3],[2,'verified',3],
    [0,'approved',4],[1,'submitted',3],[2,'submitted',4],[0,'published',3],[1,'draft',null],[2,'revision',3]
  ];
  const jobs=['Warehouse Associate','Sales Representative','Administrative Officer'];
  const colors=['peach','purple','mint','blue','pink','gold'];
  const people=names.map((name,i)=>({id:'e'+(i+1),name,team:configs[i][0],job:({3:'Packing Associate',5:'Accounting Officer',6:'Delivery Associate',7:'Customer Service Associate',9:'Purchasing Officer',10:'Sales Administrator',11:'HR Officer'}[i]??jobs[configs[i][0]]),color:colors[i%colors.length],level:i%4===1?'Senior':'Mid-level'}));
  const cycle={id:'cycle1',name:'2026 Annual Review',start:'2026-01-01',end:'2026-12-31',due:'2027-01-15',approver:'hr',policy:policySeed(),status:'active'};
  
  const roleExamples = {
    'Packing Associate':['Pack items according to purchase orders','Pack at least 98% of orders correctly','', 'Check quantities and protective packaging','Share packing status with Delivery','Log orders that need to be repacked'],
    'Accounting Officer':['Reconcile payments and receipts','Close monthly accounts by the 5th','Closed accounts by the deadline','Reconcile balances with bank statements each month','Flag missing documents to Sales and Purchasing','Prepare a month-end close checklist'],
    'Delivery Associate':['Deliver orders by the agreed time','Deliver at least 95% of trips on time','Completed 97% of trips on time','Retain proof of delivery for all orders','Notify customers and the warehouse about delays','Summarize the causes of late deliveries'],
    'Customer Service Associate':['Answer questions and track customer requests','Respond within four business hours','Met the first-response target this cycle','Verify details before responding and track each request','Escalate stock shortages to Sales and the warehouse','Group the reasons customers make repeat requests'],
    'Purchasing Officer':['Order goods against the replenishment plan','Issue all purchase orders on schedule','Issued all purchase orders as planned','Check prices and terms before approval','Flag delayed stock to the warehouse and Sales','Prepare backup suppliers for key products'],
    'Sales Administrator':['Record and confirm customer orders','Confirm orders within one business day','', 'Check products, quantities, and prices against the quote','Send purchase orders to the warehouse on schedule','Log the reasons orders need corrections'],
    'HR Officer':['Prepare employee data for payroll','Send payroll data to Accounting on time each month','Sent complete payroll data to Accounting on time','Check time and leave records before submission','Verify exceptions with team leads','Review corrections before closing payroll'],
  };
  const records=people.map((p,i)=>{
    const [team,stage,rating]=configs[i];
    const review=newReview(p,cycle,'m'+(team+1),team);
    review.stage=stage;
    if (i===4 || i===11) review.due='2026-11-18';
    review.goal.approved=true;
    if (team===1) {
      Object.assign(review.goal,{method:'higher',target:1000000,actual:rating ? (rating===5?1380000:1000000) : null,unit:'THB'});
      review.goal.result=rating ? 'Net sales reached '+(review.goal.actual/10000)+'% of target, per the CRM report.' : '';
    }
    if (team===0 && rating) review.goal.result=rating===3?'Met the 95% on-time dispatch target.':'Reached 98% on-time dispatch against a 95% target.';
    if (team===2) Object.assign(review.goal,{method:'lower',target:2,actual:rating ? (rating===2?5:2) : null,unit:'corrections'});
    if (team===0) review.goal.expected='Dispatch at least 95% of orders on time';
    if (team===2) review.goal.result=rating ? 'Document corrections: '+review.goal.actual + ', against a target of no more than 2 this cycle.' : '';
    const example=roleExamples[p.job];
    if (example) Object.assign(review.goal,{title:example[0],expected:example[1],result:rating?example[2]:'',method:'qualitative',target:null,actual:null,unit:''});
    if (rating) {
      const outcome=review.goal.result;
      const quality=example?.[3]??['Logged product code and quantity checks before dispatch','Checked customer records for completeness in the CRM','Reviewed document corrections in the administration log'][team];
      const collaboration=example?.[4]??['Shared stock status with Sales and Delivery before cutoff','Passed customer information to Operations on time','Sent purchase orders and delivery notes to Accounting'][team];
      review.evidence=[outcome,quality,collaboration].map((description,dimension)=>({id:p.id+'-'+dimension,dimension,description,observed:'2026-10-28',source:['Performance summary','Quality check log','Team notes'][dimension],context:'Recorded during the review period',actor:p.name}));
      review.items=freshItems().map((item,j)=>({...item,rating:i===0&&j===1?3:rating,note:review.evidence[j].description,evidenceIds:[review.evidence[j].id]}));
      review.summary=outcome;
      review.development=example?.[5]??['Review late dispatches and flag risks before cutoff','Track sales pipeline quality alongside revenue','Use a checklist before sending documents to Accounting'][team];
      if (stage!=='draft' && stage!=='revision') review.submittedAt='2026-11-16T03:00:00Z';
      if (['verified','approved','published'].includes(stage)) review.verifiedAt='2026-11-17T03:00:00Z';
      if (['approved','published'].includes(stage)) Object.assign(review,{final:rating, finalReason:outcome,approvedAt:'2026-11-18T03:00:00Z'});
      if (stage==='published') review.publishedAt='2026-11-20T03:00:00Z';
      if (stage==='revision') review.revisionReason='Explain the impact and context of the work in more detail.';
    }
    return review;
  });
  return {people,policy:policySeed(),cycles:[{...cycle,reviews:records}],activeId:cycle.id,draft:null};
}
