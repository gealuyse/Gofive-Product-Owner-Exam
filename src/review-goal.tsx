import {useState, type ReactNode} from 'react';
import {label, ReviewForm, reviewData, type FieldErrors} from './form-controls';
import {useLocale} from './locale';
import {StatusPill} from './status-pill';
import {attainment, managers} from './model.mjs';
import type {Cycle, Review} from './types';

export function GoalSummary({review}:{review:Review}){
  const {t, date, locale}=useLocale();
  const g=review.goal;
  const pct=attainment(g);
  const numeric=g.method!=='qualitative';
  const number=(value:number|null)=>value?.toLocaleString(locale)??'—';
  return <div className="goal">
    <div className="goal-heading">
      <StatusPill label={t(g.approved?'Confirmed':'Awaiting confirmation')} tone={g.approved?'green':'gray'}/>
      <h3>{t(g.title)}</h3>
    </div>
    {numeric&&<dl className="goal-metrics">
      <div><dt>{t("Target")}</dt><dd>{g.method==='lower'?t("At most "):''}{number(g.target)} {t(g.unit)}</dd></div>
      <div><dt>{t("Actual")}</dt><dd>{number(g.actual)}{g.actual!==null?' '+t(g.unit):''}</dd></div>
      {pct!==null&&<div><dt>{t("Attainment")}</dt><dd>{pct.toFixed(0)}%</dd></div>}
    </dl>}
    <dl className="goal-details">
      <div><dt>{t("Success criteria")}</dt><dd>{t(g.expected)}</dd></div>
      <div><dt>{t("Actual outcome")}</dt><dd className={g.result?undefined:'muted'}>{t(g.result||"Awaiting an outcome")}</dd></div>
    </dl>
    {g.history.length>0&&<details><summary>{t("Goal history (")}{g.history.length})</summary>{g.history.map((h,i)=><p key={i}>{h.previous} → {h.next} · {t("Effective")} {date(h.effective)} · {h.reason} · {t((managers as Record<string,string>)[h.actor]??h.actor)}</p>)}</details>}
  </div>;
}

export function GoalEditor({original,suggestion,useProposal,cycle,actor,close,saveGoal}:{useProposal:boolean;original:Review['goal'];suggestion?:Review['goalSuggestion'];cycle:Cycle;actor:string;close:()=>void;saveGoal:(goal:Review['goal'])=>boolean}){
  const {t,date}=useLocale();
  const [goal,setGoal]=useState(()=>({...structuredClone(original),...(useProposal?suggestion:undefined)}));
  const [reason,setReason]=useState('');
  const [effective,setEffective]=useState(cycle.start);
  const baseline=(g:Review['goal'])=>[g.title,g.expected,g.method,g.target,g.unit].join(' · ');
  const changed=baseline(original)!==baseline(goal);
  const numeric=goal.method!=='qualitative';
  const requiresReason=changed&&original.approved;
  function validate():FieldErrors{
    const errors:FieldErrors={};
    if(!goal.title.trim())errors.title='Enter a goal.';
    if(!goal.expected.trim())errors.expected='Enter the success criteria.';
    if(numeric&&(goal.target===null||!Number.isFinite(goal.target)||goal.target<0))errors.target='Enter a valid target.';
    if(numeric&&!goal.unit.trim())errors.unit='Enter the unit of measure.';
    if(requiresReason&&(!effective||effective<cycle.start||effective>cycle.end))errors.effective='Enter an effective date within the review period.';
    if(requiresReason&&reason.trim().length<8)errors.reason='Enter a reason of at least 8 characters.';
    return errors;
  }
  function save(){
    const history=changed&&original.approved
      ? [{at:new Date().toISOString(),actor,reason,effective,previous:baseline(original),next:baseline(goal)},...original.history]
      : original.history;
    return saveGoal({...goal,history,approved:true});
  }
  const methodLabel=goal.method==='higher'?'Numeric · higher is better':goal.method==='lower'?'Numeric · lower is better':'Observable outcome';
  return <ReviewForm title="Set a goal and record results" confirmLabel="Confirm and save goal" close={close} validate={validate} save={save}
    fields={issues=><>
      {suggestion&&!useProposal&&<div className="actions left"><button type="button" onClick={()=>setGoal({...goal,...suggestion})}>{t("Use employee proposal")}</button></div>}
      {label(t("Goal"),<input value={t(goal.title)} onChange={e=>setGoal({...goal,title:e.target.value})}/>,issues.title&&t(issues.title))}
      {label(t("Success criteria"),<textarea value={t(goal.expected)} onChange={e=>setGoal({...goal,expected:e.target.value})}/>,issues.expected&&t(issues.expected))}
      {label(t("Measurement"),<select value={goal.method} onChange={e=>setGoal({...goal,method:e.target.value})}><option value="qualitative">{t("Observable outcome")}</option><option value="higher">{t("Numeric · higher is better")}</option><option value="lower">{t("Numeric · lower is better")}</option></select>)}
      {numeric&&<div className="form-grid">
        {label(t("Target"),<input type="number" value={goal.target??''} onChange={e=>setGoal({...goal,target:e.target.value===''?null:Number(e.target.value)})}/>,issues.target&&t(issues.target))}
        {label(t("Actual"),<input type="number" value={goal.actual??''} onChange={e=>setGoal({...goal,actual:e.target.value===''?null:Number(e.target.value)})}/>)}
        {label(t("Unit"),<input value={t(goal.unit)} onChange={e=>setGoal({...goal,unit:e.target.value})}/>,issues.unit&&t(issues.unit))}
      </div>}
      {label(t("Actual outcome (can be added later)"),<textarea value={t(goal.result)} onChange={e=>setGoal({...goal,result:e.target.value})}/>)}
      {requiresReason&&<>
        {label(t("New goal effective date"),<input type="date" min={cycle.start} max={cycle.end} value={effective} onChange={e=>setEffective(e.target.value)}/>,issues.effective&&t(issues.effective))}
        {label(t("Reason for changing the goal"),<textarea value={reason} onChange={e=>setReason(e.target.value)}/>,issues.reason&&t(issues.reason))}
      </>}
    </>}
    summary={<>{suggestion&&<p className="notice">{t("Saving this goal completes the pending proposal review.")}</p>}
    {reviewData([
      [t("Goal"),t(goal.title),true],[t("Success criteria"),t(goal.expected),true],[t("Measurement"),t(methodLabel)],
      ...(numeric?[[t("Target"),String(goal.target??'—')],[t("Actual"),String(goal.actual??'—')],[t("Unit"),t(goal.unit)]] as [string,ReactNode][]:[]),
      [t("Actual outcome"),t(goal.result),true],
      ...(requiresReason?[[t("New goal effective date"),date(effective)],[t("Reason for changing the goal"),reason]] as [string,ReactNode][]:[]),
    ])}</>}
  />;
}
