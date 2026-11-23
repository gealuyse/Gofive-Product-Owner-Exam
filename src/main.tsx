import React, {useEffect, useId, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Activity, Archive, Building2, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, ClipboardCheck, Clock3, ListChecks, LockKeyhole, Menu, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Target, Users, X} from 'lucide-react';
import '@fontsource-variable/noto-sans-thai';
import '@fontsource-variable/dm-sans';
import './style.css';
import {sampleAnnualWork} from './annual-work';
import {LocaleContext, useLocale, getSavedLanguage, saveLanguage} from './locale';
import {localizeSavedData} from './sample-translations';
import {Confirmation, ErrorsBox, Modal, ReviewForm, SaveConflictContext, useFocusInvalid, label, reviewData, type FieldErrors} from './form-controls';
import {emptyEvidence, EvidenceForm, EvidenceList} from './review-evidence';
import {GoalEditor, GoalSummary} from './review-goal';
import {ReviewTable, ReviewStatus, DeadlineWarning} from './review-queue';
import {StatusPill, reviewTones} from './status-pill';
import type {Cycle, Data, Draft, Person, Review} from './types';
import {calculateWeightedScore, canPublish, cycleErrors, demoDate, dimensions, employeeResult, invalidate, isCrossDepartment, missingEvidenceDimensions, log, makeId, managerDepartments, managers as managerNames, newReview, overdue, removeEmployeeEvidence, scoreLevel, seed, submitErrors, teams, validatePolicy} from './model.mjs';

const managers:Record<string,string>=managerNames;
const storeKey='performance-studio-mvp-v1';
const roles={hr:'HR Admin',manager:'Manager',employee:'Employee'};
type Role=keyof typeof roles;
const reviewers=Object.entries(managers);

const actorName=(actor:string)=>actor==='hr'?'HR Admin':managers[actor]??actor;
const readData=():Data=>{
  try {const raw=localStorage.getItem(storeKey);if(raw)return localizeSavedData(raw);}
  catch {}
  return seed() as Data;
};
const back=<ChevronLeft size={17}/>;
const note=(children:React.ReactNode)=><div className="notice"><CircleAlert size={18}/><div>{children}</div></div>;
function App(){
  const [language,setLanguage]=useState(getSavedLanguage);
  useEffect(()=>{
    document.documentElement.lang=language;
    saveLanguage(language);
  },[language]);
  return <LocaleContext.Provider value={language}><Workspace switchLanguage={setLanguage}/></LocaleContext.Provider>;
}

function Workspace({switchLanguage}:{switchLanguage:(language:'th'|'en')=>void}){
  const {t, language}=useLocale();
  const [data,setData]=useState<Data>(readData);
  const [role,setRole]=useState<Role>('hr');
  const [identity,setIdentity]=useState('e1');
  const [manager,setManager]=useState('m1');
  const [page,setPage]=useState('reviews');
  const [selected,setSelected]=useState('');
  const [mobile,setMobile]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [flash,setFlash]=useState<{message:string;kind:'success'|'error'}|null>(null);
  const [reset,setReset]=useState(false);
  const cycle=data.cycles.find(item=>item.id===data.activeId)??data.cycles[0];
  const person=data.people.find(item=>item.id===identity)??data.people[0];
  const actor=role==='hr'?'hr':role==='manager'?manager:person.name;
  const allowed=cycle.reviews.filter(item=>role==='hr'||(role==='manager'?item.manager===manager:item.id===identity));
  const review=allowed.find(item=>item.id===(role==='employee'?identity:selected));

  function commit(next:Data,message:string){
    try {
      const current=localStorage.getItem(storeKey);
      if(current&&JSON.stringify(localizeSavedData(JSON.stringify(data)))!==JSON.stringify(localizeSavedData(current))){setFlash({message:'This data changed in another tab. Reload before saving.',kind:'error'});return false;}
      localStorage.setItem(storeKey,JSON.stringify(next));
    }
    catch {setFlash({message:'Your browser could not save the data. Check its storage settings.',kind:'error'});return false;}
    setData(next);
    setFlash(message?{message,kind:'success'}:null);
    return true;
  }
  function updateReview(id:string,nextReview:Review,message:string){
    if(!allowed.some(item=>item.id===id))return false;
    return commit({...data,cycles:data.cycles.map(item=>item.id===cycle.id?{...item,reviews:item.reviews.map(old=>old.id===id?nextReview:old)}:item)},message);
  }
  function go(next:string,keepNotice=false){
    setPage(next);setSelected('');setMobile(false);
    if(!keepNotice)setFlash(null);
    window.scrollTo(0,0);
  }
  function open(id:string){go('review');setSelected(id);}
  function roleChange(value:Role){setRole(value);go(value==='employee'?'goals':'reviews');}
  const hrNav=[['reviews','HR Queue',ClipboardCheck],['create','Review Cycles',CalendarDays]] as const;
  const managerNav=[['reviews','My Team',Users]] as const;
  const employeeNav=[['goals','Goals and Evidence',Target],['result','My Review Result',ChartNoAxesColumnIncreasing]] as const;
  const nav=role==='hr'?hrNav:role==='manager'?managerNav:employeeNav;
  const crumb=page==='review'?'Review Details':nav.find(item=>item[0]===page)?.[1]??'Review Cycle';
  const changeCycle=(id:string)=>{commit({...data,activeId:id},'');setSelected('');};

  useEffect(()=>{
    if(flash?.kind!=='success')return;
    const timer=window.setTimeout(()=>setFlash(null),5000);
    return ()=>window.clearTimeout(timer);
  },[flash]);

  return <SaveConflictContext.Provider value={flash?.message==='This data changed in another tab. Reload before saving.'}><div className="shell" data-sidebar-collapsed={sidebarCollapsed}>
    <a href="#main" className="skip">{t("Skip to content")}</a>
    <aside id="workspace-sidebar" className={'sidebar '+(mobile?'open':'')}>
      <div className="brand"><span className="brand-mark"><Activity size={22} strokeWidth={2.6}/></span><span className="brand-name">Performance<span className="brand-studio"> Studio</span></span></div>
      <div className="workspace" title={t("Baandee Supply")}><span className="workspace-icon"><Building2 size={19}/></span><div className="workspace-name"><strong>{t("Baandee Supply")}</strong><small>{t("Demo wholesale company")}</small></div></div>
      <div className="nav-caption">{t("Workspace")}</div>
      <nav aria-label={t("Main navigation")}>{nav.map(([key,title,Icon])=><button key={key} className={page===key||(page==='review'&&key==='reviews')?'active':''} onClick={()=>go(key)} aria-label={t(title)} title={t(title)} aria-current={page===key?'page':undefined}><Icon size={19}/><span className="nav-text">{t(title)}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button className="reset-data" onClick={()=>setReset(true)} aria-label={t("Reset sample data")} title={t("Reset sample data")}><RotateCcw size={16}/><span className="nav-text">{t("Reset sample data")}</span></button>
      </div>
    </aside>
    <div className="frame">
      <header className="top"><div className="crumb"><button className="icon-button mobile-menu" aria-label={mobile?t("Close menu"):t("Open menu")} aria-expanded={mobile} aria-controls="workspace-sidebar" onClick={()=>setMobile(!mobile)}>{mobile?<X size={21}/>:<Menu size={21}/>}</button>
        <button className="icon-button sidebar-toggle" type="button" aria-controls="workspace-sidebar" aria-expanded={!sidebarCollapsed} aria-label={t(sidebarCollapsed?"Expand sidebar":"Collapse sidebar")} title={t(sidebarCollapsed?"Expand sidebar":"Collapse sidebar")} onClick={()=>setSidebarCollapsed(value=>!value)}>
          {sidebarCollapsed?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}
        </button><span>{t("Performance Management")}</span><ChevronRight size={14}/><strong>{t(crumb)}</strong></div>
        <div className="top-actions">
          <select className="language-switch" aria-label={t('Select language')} value={language} onChange={e=>switchLanguage(e.target.value==='en'?'en':'th')}>
            <option value="th" lang="th">ไทย</option><option value="en" lang="en">English</option>
          </select>
          {role==='manager'&&<select aria-label={t("Select demo manager")} value={manager} onChange={e=>{setManager(e.target.value);go('reviews');}}>{Object.entries(managers).map(([key,value])=><option key={key} value={key}>{t(value)}</option>)}</select>}
          {role==='employee'&&<select aria-label={t("Select demo employee")} value={identity} onChange={e=>{setIdentity(e.target.value);setFlash(null);}}>{data.people.map(p=><option key={p.id} value={p.id}>{t(p.name)}</option>)}</select>}
          <select id="role" className="role-switch" aria-label={t("Demo role")} value={role} onChange={e=>roleChange(e.target.value as Role)}>{Object.entries(roles).map(([key,name])=><option key={key} value={key}>{t(name)}</option>)}</select>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <div key={role+'-'+page} className="page-enter">
        {(role==='hr'||role==='manager')&&page==='reviews'&&<>
          <PageTitle title={role==='hr'?t("Review Queue"):t("My Team Reviews")} sub={t(cycle.name)} action={role==='hr'?<div className="actions left"><CyclePicker cycles={data.cycles} cycle={cycle} change={changeCycle}/><button className="primary" onClick={()=>go('create')}><Plus size={17}/>{data.draft?t("Edit cycle draft"):t("Create review cycle")}</button></div>:null}/>
          {role==='hr'&&<div className="queue-summary">
            <span className="queue-metric"><strong>{allowed.filter(r=>r.stage==='submitted'||r.stage==='verified').length}</strong>{t("To review")}</span>
            <span className="queue-metric"><strong>{allowed.filter(r=>r.stage==='approved').length}</strong>{t("Ready to publish")}</span>
            <span className="queue-metric"><DeadlineWarning decorative/><strong>{allowed.filter(overdue).length}</strong>{t("Overdue")}</span>
          </div>}
          <ReviewTable records={allowed} people={data.people} open={open} policy={cycle.policy} hr={role==='hr'}/>
        </>}
        {(role==='hr'||role==='manager')&&page==='review'&&review&&<ReviewPanel key={cycle.id+role+review.id} role={role} actor={actor} review={review} cycle={cycle} person={data.people.find(p=>p.id===review.id)!} save={(r,m)=>updateReview(review.id,r,m)} backTo={()=>go('reviews')}/>}
        {role==='hr'&&page==='create'&&<CycleEditor data={data} exit={()=>go('reviews')} saveDraft={draft=>commit({...data,draft},'Cycle draft saved.')} activate={draft=>{
          const next:Cycle={...draft,id:makeId(),status:'active',policy:structuredClone(data.policy),reviews:[],
            exclusions:Object.fromEntries(Object.entries(draft.exclusionReasons).filter(([id])=>!draft.participants.includes(id)).map(([id,reason])=>[id,{reason,actor:'hr',at:new Date().toISOString()}])),
          };
          next.reviews=draft.participants.map(id=>{
            const result=newReview(data.people.find(p=>p.id===id),next,draft.managerMap[id],draft.templateMap[id]) as Review;
            result.goal.title=next.policy.criteria[result.template][0];
            log(result,'hr','Added to review cycle');
            const reason=draft.crossDepartmentReasons?.[id]?.trim();
            if(reason&&isCrossDepartment(result.manager,data.people.find(p=>p.id===id)!)){
              result.crossDepartmentReason=reason;
              log(result,'hr','Assigned a cross-department reviewer',actorName(result.manager)+' · '+reason);
            }
            return result;
          });
          const saved=commit({...data,cycles:[next,...data.cycles],activeId:next.id,draft:null},'Review cycle activated.');
          if(saved)go('reviews',true);
          return saved;
        }}/>}
        {role==='employee'&&(review?<EmployeePanel key={cycle.id+review.id+page} page={page} cycle={cycle} review={review} person={person} go={go} save={(r,m)=>updateReview(review.id,r,m)}/>:<div className="card empty"><Archive size={32}/><h2>{t("No review is available for this employee.")}</h2></div>)}
        </div>
      </main>
    </div>
    {flash&&<div className={'toast-overlay toast-'+flash.kind}>
      {flash.kind==='success'?<CircleCheck size={20} aria-hidden="true"/>:<CircleAlert size={20} aria-hidden="true"/>}
      <span role={flash.kind==='success'?'status':'alert'}>{t(flash.message)}</span>
      <button className="icon-button" aria-label={t("Dismiss notification")} onClick={()=>setFlash(null)}><X size={16}/></button>
    </div>}
    {reset&&<Modal title={t("Reset sample data")} close={()=>setReset(false)}>
      <p>{t("This replaces your changes in this browser with the original sample data.")}</p>
      <div className="actions">
        <button onClick={()=>setReset(false)}>{t("Cancel")}</button>
        <button className="danger" onClick={()=>{
          if(!commit(seed() as Data,'Sample data reset.')){setReset(false);return;}
          setReset(false);setIdentity('e1');setManager('m1');setRole('hr');setPage('reviews');setSelected('');setMobile(false);
          window.scrollTo(0,0);
        }}>{t("Confirm reset")}</button>
      </div>
    </Modal>}
  </div></SaveConflictContext.Provider>;
}

function PageTitle({title,sub,action}:{title:string;sub:string;action?:React.ReactNode}){
  const {t}=useLocale();return <div className="page-title"><div><h1>{t(title)}</h1><p>{sub}</p></div>{action}</div>;}
function CyclePicker({cycles,cycle,change}:{cycles:Cycle[];cycle:Cycle;change:(id:string)=>void}){
  const {t}=useLocale();return <label className="cycle-picker"><CalendarDays size={17}/><select aria-label={t("Select review cycle")} value={cycle.id} onChange={e=>change(e.target.value)}>{cycles.map(item=><option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>;}

function CycleEditor({data,exit,saveDraft,activate}:{data:Data;exit:()=>void;saveDraft:(d:Draft)=>void;activate:(d:Draft)=>boolean}){
  const {t,date}=useLocale();
  const [draft,setDraft]=useState<Draft>(()=>data.draft?{...structuredClone(data.draft),exclusionReasons:data.draft.exclusionReasons??{}}:{
    name:'',start:'2026-01-01',end:'2026-10-31',due:'2026-11-30',approver:'hr',
    participants:data.people.map(p=>p.id),managerMap:Object.fromEntries(data.people.map(p=>[p.id,'m'+(p.team+1)])),templateMap:Object.fromEntries(data.people.map(p=>[p.id,p.team])),exclusionReasons:{},
  });
  const [attempt,setAttempt]=useState(false);
  const [confirmCycle,setConfirmCycle]=useState(false);
  const [cycleSaveError,setCycleSaveError]=useState(false);
  const cycleForm=useRef<HTMLDivElement>(null);
  const focusInvalid=useFocusInvalid(cycleForm);
  const selectionErrorId=useId();
  const [external,setExternal]=useState<{person:Person;manager:string;reason:string}|null>(null);
  function assign(person:Person,manager:string,reason=''){
    setDraft(previous=>{
      const crossDepartmentReasons={...previous.crossDepartmentReasons};
      if(reason)crossDepartmentReasons[person.id]=reason;
      else delete crossDepartmentReasons[person.id];
      return {...previous,managerMap:{...previous.managerMap,[person.id]:manager},crossDepartmentReasons};
    });
  }
  const errors=cycleErrors(draft,data.people,data.policy,{requireExclusionReasons:false});
  const setupIssues=[
    ...validatePolicy(data.policy),
    ...(!draft.approver?['Select an approver.']:[]),
    ...draft.participants.flatMap(id=>{
      const employee=data.people.find(person=>person.id===id);
      return !employee||!Number.isInteger(draft.templateMap[id])||!teams[draft.templateMap[id]]
        ?[(employee?.name??id)+' needs a manager and a job template.']:[];
    }),
  ];
  const dateIssues:FieldErrors={
    ...(!draft.start?{start:'Enter the start date.'}:{}),
    ...(!draft.end?{end:'Enter the end date.'}:draft.start&&draft.end<draft.start?{end:'End date must be on or after the start date.'}:{}),
    ...(!draft.due?{due:'Enter the deadline.'}:draft.end&&draft.due<draft.end?{due:'The deadline must be on or after the end date.'}:{}),
  };
  function reviewCycle(){
    setAttempt(true);
    if(errors.length){focusInvalid();return;}
    setCycleSaveError(false);
    setConfirmCycle(true);
  }
  const update=(key:keyof Draft,value:unknown)=>setDraft({...draft,[key]:value});
  return <><button className="link-button back" onClick={exit}>{back}{t(" Back to HR Queue")}</button><PageTitle title={t("Create review cycle")} sub={t("Set the review period and select participants. Templates are assigned automatically.")}/>
  <div className="columns" ref={cycleForm}><section className="card panel"><h2>{t("Cycle details")}</h2>
    {label(t("Review cycle name"),<input value={draft.name} onChange={e=>update('name',e.target.value)} placeholder={t("e.g. 2026 Annual Review")}/>,attempt&&!draft.name.trim()?t("Enter a review cycle name."):undefined)}
    <div className="form-grid">{(['start','end','due'] as const).map((key,i)=><React.Fragment key={key}>{label([t("Period start"),t("Period end"),t("HR submission deadline")][i],<input type="date" value={draft[key]} onChange={e=>update(key,e.target.value)}/>,attempt&&dateIssues[key]?t(dateIssues[key]):undefined)}</React.Fragment>)}</div>
    <h3>{t("Readiness check")}</h3>
    {errors.length?<p className={attempt?"field-error review-inline-error":"muted"}>{t("Check the required fields below before continuing.")}</p>:<p className="success"><Check size={18}/>{t(" Ready to activate")}</p>}
    {attempt&&<ErrorsBox errors={setupIssues}/>}
    {note(t("Activating this cycle saves policy v")+data.policy.version+t(" for this cycle. Employees can see results after HR publishes them."))}
    <div className="actions"><button onClick={()=>saveDraft(draft)}>{t("Save draft")}</button><button className="primary" onClick={reviewCycle}>{t("Review details")}</button></div>
  </section><section className="card panel"><h2>{t("Participants and reviewers")}</h2><p>{t("Selected ")}{draft.participants.length}{t(" employees. Assign a reviewer and template to each employee.")}</p>
    {attempt&&!draft.participants.length&&<p className="field-error" id={selectionErrorId}>{t("Select at least one employee.")}</p>}
    {teams.map((name,department)=><section className="participant-group" key={name}><h3>{t(name)}</h3>
      {data.people.filter(person=>person.team===department).map(person=>{
        const manager=draft.managerMap[person.id]??'';
        const cross=isCrossDepartment(manager,person);
        const reason=draft.crossDepartmentReasons?.[person.id]??'';
        const reviewerError=attempt&&(!Object.hasOwn(managers,manager)||cross&&!reason.trim());
        const reviewerErrorId=selectionErrorId+'-'+person.id;
        return <div className="participant" key={person.id}>
          <label><input type="checkbox" aria-invalid={attempt&&!draft.participants.length||undefined} aria-describedby={attempt&&!draft.participants.length?selectionErrorId:undefined} checked={draft.participants.includes(person.id)} onChange={e=>update('participants',e.target.checked?[...draft.participants,person.id]:draft.participants.filter(id=>id!==person.id))}/>{t(person.name)} · {t(person.job)}</label>
          {draft.participants.includes(person.id)&&<>
            <div className="reviewer-choice">
              <select aria-invalid={reviewerError||undefined} aria-describedby={reviewerError?reviewerErrorId:undefined} aria-label={t("Reviewer for ")+t(person.name)} value={manager} onChange={e=>assign(person,e.target.value)}>
                {cross&&<option value={manager}>{t(actorName(manager))} · {t("Cross-department assignment")}</option>}
                <option value="">{t("Select a reviewer within the department")}</option>
                {reviewers.filter(([id])=>!isCrossDepartment(id,person)).map(([id,name])=><option key={id} value={id}>{t(name)}</option>)}
              </select>
              <button aria-label={t("Add a cross-department reviewer for ")+t(person.name)} onClick={()=>setExternal({person,manager:cross?manager:'',reason})}><Plus size={16}/>{cross?t("Edit cross-department reviewer"):t("Add cross-department reviewer")}</button>
            </div>
            {reviewerError&&<p className="field-error" id={reviewerErrorId}>{t(cross?"Enter a reason.":"Select a reviewer")}</p>}
            {cross&&<p className="muted external-assignment"><strong>{t("Cross-department assignment")}</strong> · {t(actorName(manager))} · {reason||t("Enter a reason.")}</p>}
          </>}
        </div>;
      })}
    </section>)}
  </section></div>
  {confirmCycle&&<Modal title={t("Activate cycle")} variant="review" close={()=>setConfirmCycle(false)}>
    <Confirmation edit={()=>setConfirmCycle(false)} confirm={()=>{if(errors.length||!activate(draft))setCycleSaveError(true);}} label="Activate cycle" error={cycleSaveError?"Could not save the changes. Try again.":undefined}>
      {reviewData([
        [t("Review cycle name"),draft.name],[t("Period start"),date(draft.start)],[t("Period end"),date(draft.end)],
        [t("HR submission deadline"),date(draft.due)],[t("Participants and reviewers"),draft.participants.length],
      ])}
      <ul className="confirmation-participants">{data.people.filter(person=>draft.participants.includes(person.id)).map(person=><li key={person.id}>
        <strong>{t(person.name)}</strong><span>{t(actorName(draft.managerMap[person.id]))} · {t(teams[draft.templateMap[person.id]])}</span>
        {isCrossDepartment(draft.managerMap[person.id],person)&&<small>{draft.crossDepartmentReasons?.[person.id]}</small>}
      </li>)}</ul>
    </Confirmation>
  </Modal>}
  {external&&<ReviewForm title={t("Assign cross-department reviewer · ")+t(external.person.name)} confirmLabel="Confirm assignment" close={()=>setExternal(null)}
    validate={()=>({
      ...(!isCrossDepartment(external.manager,external.person)?{manager:'Select a reviewer'}:{}),
      ...(!external.reason.trim()?{reason:'Enter a reason.'}:{}),
    })}
    fields={issues=><>
      {label(t("Reviewer from another department"),<select value={external.manager} onChange={e=>setExternal({...external,manager:e.target.value})}><option value="">{t("Select a reviewer")}</option>{reviewers.filter(([id])=>isCrossDepartment(id,external.person)).map(([id,name])=><option key={id} value={id}>{t(name)} · {t(teams[managerDepartments[id as keyof typeof managerDepartments]])}</option>)}</select>,issues.manager&&t(issues.manager))}
      {label(t("Reason for cross-department assignment"),<textarea value={external.reason} onChange={e=>setExternal({...external,reason:e.target.value})}/>,issues.reason&&t(issues.reason))}
    </>}
    summary={reviewData([[t("Employee"),t(external.person.name)],[t("Reviewer"),external.manager?t(actorName(external.manager)):'—'],[t("Reason"),external.reason]])}
    save={()=>{assign(external.person,external.manager,external.reason.trim());setExternal(null);}}/>}
  </>;
}

function AnnualWork({cycle,review,department}:{cycle:Cycle;review:Review;department:number}){
  const {t, date}=useLocale();
  const sample=cycle.id==='cycle1'?sampleAnnualWork(department):[];
  const entries=[
    ...sample.map(item=>({...item,evidence:false})),
    ...review.evidence.map(item=>({observed:item.observed,project:'',description:item.description,evidence:true})),
  ].sort((a,b)=>a.observed.localeCompare(b.observed));
  const [mode,setMode]=useState<'quarter'|'project'>('quarter');
  const [quarter,setQuarter]=useState('1');
  const projects=[...new Set(sample.map(item=>item.project))];
  const [project,setProject]=useState<string>(projects[0]??'');
  const matches=entries.filter(item=>mode==='project'?item.project===project:Math.ceil(Number(item.observed.slice(5,7))/3)===Number(quarter));
  return <section className="card panel annual-work" aria-label={t("Work Across the Year")}>
    <div className="card-head compact-head"><div><h2>{t("Work Across the Year")}</h2><p>{sample.length?t("2026 demo data · Q4 in progress"):t("Evidence recorded in this cycle")}</p></div></div>
    <div className="annual-controls">
      <div className="tabs" aria-label={t("Work view")}><button aria-pressed={mode==='quarter'} onClick={()=>setMode('quarter')}>{t("By quarter")}</button>{projects.length>0&&<button aria-pressed={mode==='project'} onClick={()=>setMode('project')}>{t("By project")}</button>}</div>
      {mode==='quarter'?<select aria-label={t("Select quarter")} value={quarter} onChange={e=>setQuarter(e.target.value)}>
        {['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'].map((months,i)=><option key={t(months)} value={i+1}>{t("Q")}{i+1} · {t(months)}</option>)}
      </select>:<select aria-label={t("Select project")} value={project} onChange={e=>setProject(e.target.value)}>{projects.map(name=><option key={name} value={name}>{t(name)}</option>)}</select>}
    </div>
    {matches.length>0?<ul className="annual-list">{matches.map((item,i)=><li key={item.observed+item.description+i}><span className="muted">{date(item.observed)} · {t(item.evidence?"Review evidence":item.project)}</span><p>{t(item.description)}</p></li>)}</ul>:<p className="muted">{t("No entries in this quarter.")}</p>}
    {sample.length>0&&<p className="muted annual-note">{t("Project activity provides department context. Review scores use the evidence selected by the reviewer.")}</p>}
  </section>;
}

const employeeStages:Record<Review['stage'],{index:number;title:string;detail:string}>={
  draft:{index:0,title:"Preparing for review",detail:"Review your goal and add evidence for your manager."},
  revision:{index:1,title:"Manager revising the review",detail:"Your manager will resubmit the review to HR when it is ready."},
  submitted:{index:2,title:"HR review in progress",detail:"Your manager submitted the review. You can see your result after HR publishes it."},
  verified:{index:2,title:"Awaiting approval",detail:"HR has checked the review and approval is pending."},
  approved:{index:2,title:"Awaiting publication",detail:"Your review has been approved. You can see it after HR publishes it."},
  published:{index:3,title:"Result published",detail:"View your result and development feedback for this cycle."},
};

function EmployeeProgress({review}:{review:Review}){
  const {t}=useLocale();
  const current=employeeStages[review.stage];
  const steps=['Prepare evidence','Manager review','HR review and approval','Publish result'];
  return <section className="card panel employee-progress" aria-label={t("Review status")}>
    <div className="employee-section-head">
      <div><h2>{t("Review status")}</h2><p>{t(current.detail)}</p></div>
      <StatusPill label={t(current.title)} tone={reviewTones[review.stage]}/>
    </div>
    <details className="employee-steps">
      <summary>{t("Review steps")}</summary>
      <ol>{steps.map((name,index)=><li key={name} aria-current={index===current.index?'step':undefined}>
        <span className="employee-step-marker" aria-hidden="true">{index<current.index&&<Check size={12}/>}</span>
        <span>{t(name)}</span>
      </li>)}</ol>
    </details>
  </section>;
}

function EmployeePanel({page,cycle,review,person,go,save}:{page:string;cycle:Cycle;review:Review;person:Person;go:(page:string)=>void;save:(r:Review,m:string)=>boolean}){
  const {t, date}=useLocale();
  const [entry,setEntry]=useState(emptyEvidence);
  const [add,setAdd]=useState(false);
  const [suggest,setSuggest]=useState(false);
  const [proposal,setProposal]=useState(review.goalSuggestion??{title:review.goal.title,expected:review.goal.expected});
  const locked=review.stage==='published';
  const result=employeeResult(review,person.id);
  const canPropose=review.stage==='draft'||review.stage==='revision';
  const openEvidence=()=>{
    const dimension=missingEvidenceDimensions(review)[0]??0;
    const observed=cycle.start>demoDate?cycle.start:cycle.end<demoDate?cycle.end:demoDate;
    setEntry({...emptyEvidence(),dimension,observed});
    setAdd(true);
  };

  function removeEvidence(id:string){
    const next=structuredClone(review);
    if(!removeEmployeeEvidence(next,person,id))return false;
    return save(next,'Evidence removed.');
  }

  if(page==='result')return <>
    <PageTitle title={t("My Review Result")} sub={t(cycle.name)+' · '+t(person.name)}/>
    {!result?<>
      <EmployeeProgress review={review}/>
      <section className="card panel result-lock">
        <span className="stat-icon orange"><LockKeyhole size={23}/></span>
        <div><h2>{t("Result pending publication")}</h2>
        <p>{t("You can view your result and feedback after HR publishes this cycle’s result.")}</p></div>
        <div className="actions left"><button onClick={()=>go('goals')}>{t("Back to Goals and Evidence")}</button></div>
      </section>
    </>:<div className="columns employee-grid">
      <section className="card panel employee-result">
        <div className="employee-section-head">
          <div><h2>{t(cycle.policy.labels[result.rating-1])}</h2><p>{t("Published on")} {date(result.publishedAt)}</p></div>
          <span className="rating-circle large">{result.rating}<span className="sr"> {t("out of 5")}</span></span>
        </div>
        <p>{t(cycle.policy.definitions[result.rating-1])}</p>
        <dl className="employee-feedback">
          <div><dt>{t("Reason for this rating")}</dt><dd>{t(result.reason)||'—'}</dd></div>
          <div><dt>{t("Performance summary")}</dt><dd>{t(result.summary)||'—'}</dd></div>
          <div><dt>{t("Development priorities")}</dt><dd>{t(result.development)||'—'}</dd></div>
        </dl>
      </section>
      <section className="card panel employee-result-context">
        <h2>{t("Goal for this cycle")}</h2><GoalSummary review={review}/>
        <details><summary>{t("Evidence in this cycle")}</summary><EvidenceList review={review} person={person}/></details>
      </section>
    </div>}
  </>;
  return <>
    <PageTitle title={t("My Goals and Evidence")} sub={t(cycle.name)+' · '+t(person.name)} action={result?<button className="primary" onClick={()=>go('result')}>{t("View result")}</button>:undefined}/>
    <EmployeeProgress review={review}/>
    <div className="columns employee-grid">
      <section className="card panel employee-goal">
        <div className="employee-section-head">
          <h2>{t("Goal for this cycle")}</h2>
          {canPropose&&<button onClick={()=>{setSuggest(true);}}>{t(review.goalSuggestion?"Edit goal proposal":"Propose a goal")}</button>}
        </div>
        <GoalSummary review={review}/>
        {review.goalSuggestion&&<section className="goal-proposal">
          <h3>{t("Your proposed goal")}</h3>
          <StatusPill label={t("Awaiting manager review")} tone="blue"/>
          <p><strong>{t(review.goalSuggestion.title)}</strong></p>
          <dl><div><dt>{t("Success criteria")}</dt><dd>{t(review.goalSuggestion.expected)}</dd></div></dl>
        </section>}
      </section>
      <section className="card panel employee-evidence-card">
        <div className="employee-section-head">
          <h2>{t("Evidence in this cycle")}</h2>
          {!locked&&<button className="primary" onClick={openEvidence}><Plus size={16}/>{t("Add evidence")}</button>}
        </div>
        {dimensions.map((name,index)=><section key={name} className="employee-evidence">
          <h3>{t(name)}</h3>
          <p>{t(cycle.policy.criteria[review.template][index])}</p>
          <EvidenceList review={review} person={person} criterion={index} onRemove={removeEvidence}/>
        </section>)}
      </section>
    </div>
    <AnnualWork cycle={cycle} review={review} department={person.team}/>
    {suggest&&<ReviewForm title="Propose a goal to your manager" confirmLabel="Send proposal" close={()=>setSuggest(false)}
      validate={()=>({
        ...(!proposal.title.trim()?{title:'Enter a goal.'}:{}),
        ...(!proposal.expected.trim()?{expected:'Enter the success criteria.'}:{}),
      })}
      fields={errors=><>
        {label(t("Goal"),<input value={t(proposal.title)} onChange={e=>setProposal({...proposal,title:e.target.value})}/>,errors.title&&t(errors.title))}
        {label(t("Success criteria"),<textarea value={t(proposal.expected)} onChange={e=>setProposal({...proposal,expected:e.target.value})}/>,errors.expected&&t(errors.expected))}
      </>}
      summary={reviewData([[t("Reviewer"),t(actorName(review.manager))],[t("Goal"),t(proposal.title),true],[t("Success criteria"),t(proposal.expected),true]])}
      save={()=>{
        const next=structuredClone(review);
        next.goalSuggestion={title:proposal.title.trim(),expected:proposal.expected.trim()};
        log(next,person.name,'Proposed a goal',next.goalSuggestion.title);
        const saved=save(next,'Proposal sent to your manager.');
        if(saved)setSuggest(false);
        return saved;
      }}/>}
    {add&&<EvidenceForm title="Add performance evidence" reassessment={['submitted','verified','approved'].includes(review.stage)} entry={entry} update={setEntry} cycle={cycle} close={()=>setAdd(false)} save={()=>{
      const next=structuredClone(review);
      next.evidence.push({...entry,id:makeId(),actor:person.name,employeeId:person.id,addedAt:new Date().toISOString()});
      invalidate(next,person.name,'New evidence added after submission');
      log(next,person.name,'Add evidence',entry.description);
      const saved=save(next,'Evidence added.');
      if(saved){setEntry(emptyEvidence());setAdd(false);}
      return saved;
    }}/>}
  </>;
}
const actionMessages={return:"Review returned for changes.",approve:"Review approved.",publish:"Result published.",extend:"Deadline extended."};
const actionLabels={return:"Return for changes",approve:"Approve review",publish:"Publish result",extend:"Extend deadline"};
type Action=keyof typeof actionLabels;

function ReviewPanel({role,actor,review,cycle,person,save,backTo}:{role:'hr'|'manager';actor:string;review:Review;cycle:Cycle;person:Person;save:(r:Review,m:string)=>boolean;backTo:()=>void}){
  const {t, date, locale}=useLocale();
  const [draft,setDraft]=useState(()=>structuredClone(review));
  const [attempted,setAttempted]=useState(false);
  const [reviewSubmission,setReviewSubmission]=useState(false);
  const [submissionSaveError,setSubmissionSaveError]=useState(false);
  const reviewForm=useRef<HTMLDivElement>(null);
  const focusInvalid=useFocusInvalid(reviewForm);
  const evidenceErrorId=useId();
  const [tab,setTab]=useState('overview');
  const [action,setAction]=useState<Action|null>(null);
  const [reason,setReason]=useState('');
  const [value,setValue]=useState('');
  const [entry,setEntry]=useState(emptyEvidence);
  const [extra,setExtra]=useState<'evidence'|'goal'|'proposal'|null>(null);
  useEffect(()=>{setDraft(structuredClone(review));},[review]);
  const editable=role==='manager'&&['draft','revision'].includes(review.stage)&&review.manager===actor;
  const useDraft=editable?draft:review;
  const policy=cycle.policy;
  const weights=policy.weights[review.template];
  const score=calculateWeightedScore(useDraft.items,weights);
  const suggested=scoreLevel(score);
  function edit(mutator:(r:Review)=>void){const next=structuredClone(draft);mutator(next);setDraft(next);}
  const submissionErrors=editable&&attempted?submitErrors(draft,cycle,actor):[];
  const goalError=submissionErrors.find((error:string)=>error.includes('goal'));
  const criterionError=(index:number,topic:string)=>submissionErrors.find((error:string)=>error.startsWith(dimensions[index]+' ')&&error.includes(topic))??'';
  const summaryError=submissionErrors.find((error:string)=>error.includes('performance summary'));
  function begin(key:Action){
    setAction(key);
    setReason('');
    setValue(key==='approve'?String(suggested??''):key==='extend'?review.due:'');
  }
  function validateAction():FieldErrors{
    const errors:FieldErrors={};
    if(action!=='publish'&&reason.trim().length<8)errors.reason='Enter a reason of at least 8 characters.';
    if(action==='return'&&!['submitted','verified','approved'].includes(review.stage))errors.form='Select a review that has been submitted to HR.';
    if(action==='approve'){
      if(cycle.approver!==actor||!['submitted','verified'].includes(review.stage)||cycle.status!=='active'||review.items.some(item=>item.na==='pending'))errors.form='This review is not ready for approval.';
      if(![1,2,3,4,5].includes(Number(value)))errors.value='Select the approved rating.';
    }
    if(action==='publish'&&!canPublish(review,cycle))errors.form='Approve the review and provide a reason before publishing.';
    if(action==='extend'&&(!overdue(review)||!value||value<=review.due))errors.value='The new deadline must be after the original deadline.';
    return errors;
  }
  function runAction(){
    if(role!=='hr'||!action||Object.keys(validateAction()).length)return false;
    const next=structuredClone(review);
    const now=new Date().toISOString();
    if(action==='return')invalidate(next,actor,reason);
    if(action==='approve')Object.assign(next,{stage:'approved',verifiedAt:now,final:Number(value),finalReason:reason,approvedAt:now});
    if(action==='publish')Object.assign(next,{stage:'published',publishedAt:now});
    if(action==='extend')next.due=value;
    if(action!=='return')log(next,actor,actionLabels[action],reason,action==='extend'?{snapshot:{previous:review.due,next:value}}:{});
    const saved=save(next,actionMessages[action]);
    if(saved)setAction(null);
    return saved;
  }
  function submit(){
    setAttempted(true);
    if(submitErrors(draft,cycle,actor).length){focusInvalid();return;}
    setSubmissionSaveError(false);
    setReviewSubmission(true);
  }
  function confirmSubmission(){
    if(submitErrors(draft,cycle,actor).length){setReviewSubmission(false);return;}
    const next=structuredClone(draft);
    next.stage='submitted';next.submittedAt=new Date().toISOString();
    log(next,actor,'Submit review to HR','',{snapshot:{items:next.items,score,proposed:next.proposed,summary:next.summary,development:next.development}});
    if(save(next,'Review submitted to HR.')){
      setReviewSubmission(false);setAttempted(false);
    }else setSubmissionSaveError(true);
  }
  return <>
    <button className="link-button back" onClick={backTo}>{back}{t(" Back to Reviews")}</button>
    <div className="card person-header"><div><h1>{t(person.name)}</h1><p>{t(person.job)}  · {t(person.level)} · {t(teams[person.team])}</p></div><ReviewStatus review={review}/></div>
    <div className="meta-strip"><span><CalendarDays size={17}/> {t(cycle.name)}</span><span><Clock3 size={17}/>{t(" Deadline ")}<time dateTime={review.due}>{date(review.due)}</time>{overdue(review)&&<DeadlineWarning/>}</span><span><Users size={17}/>{t(" Reviewer ")}{t(actorName(review.manager))}</span></div>
    {review.crossDepartmentReason&&<p className="notice">{t("Cross-department assignment reason · ")}{review.crossDepartmentReason}</p>}
    {role==='hr'&&<section className="card panel review-actions" aria-label={t("HR actions")}>
      <div><h2>{t("HR actions")}</h2><p>{review.stage==='approved'?t("Approved. The employee can see the result after publication."):review.stage==='published'?t("The employee can now view the result."):['submitted','verified'].includes(review.stage)?t("Check the rationale and evidence before approving."):t("Awaiting the manager’s submission.")}</p></div>
      <div className="actions left">
        {overdue(review)&&<button onClick={()=>begin('extend')}>{t("Extend deadline")}</button>}
        {['submitted','verified','approved'].includes(review.stage)&&<button onClick={()=>begin('return')}>{t("Return for changes")}</button>}
        {['submitted','verified'].includes(review.stage)&&<button className="primary" onClick={()=>begin('approve')}>{t("Approve review")}</button>}
        {review.stage==='approved'&&<button className="primary" onClick={()=>begin('publish')}>{t("Publish result")}</button>}
      </div>
    </section>}
    {review.stage==='revision'&&note(t("Reason for return · ")+t(review.revisionReason??''))}
    <div className="tabs" aria-label={t("Review information")}>{[['overview','Review form'],['audit','Activity log']].map(([id,name])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{t(name)}</button>)}</div>
    {tab==='audit'?<section className="card panel"><h2>{t("Activity log")}</h2>{review.audit.length?review.audit.map((entry,i)=><div className="audit-entry" key={i}><span className="mini-icon"><ListChecks size={17}/></span><div><strong>{t(entry.action)}</strong><div className="muted">{t(actorName(entry.actor))}  · {date(entry.at)} · {new Date(entry.at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</div>{entry.reason&&<p>{t(entry.reason)}</p>}</div></div>):<p className="muted">{t("No activity recorded yet.")}</p>}</section>:<>
      <div className="review-grid" ref={reviewForm}>
        <section className="card panel">
          <div className="card-head compact-head"><h2>{t("Performance and evidence")}</h2>{editable&&<button onClick={()=>setExtra('goal')}>{t("Edit goal")}</button>}</div>
          {goalError&&<p className="field-error review-inline-error" data-review-error tabIndex={-1}>{t(goalError)}</p>}
          <GoalSummary review={useDraft}/>
          {review.goalSuggestion&&<section className="goal-proposal">
            <div className="employee-section-head">
              <h3>{t("Employee goal proposal")}</h3>
              {editable&&<button onClick={()=>setExtra('proposal')}>{t("Review proposal")}</button>}
            </div>
            <p><strong>{t(review.goalSuggestion.title)}</strong></p>
            <dl><div><dt>{t("Success criteria")}</dt><dd>{t(review.goalSuggestion.expected)}</dd></div></dl>
          </section>}
          <div className="card-head compact-head"><h3>{t("Evidence in this cycle")}</h3>{editable&&<button onClick={()=>{setEntry({...emptyEvidence(),observed:cycle.end});setExtra('evidence');}}><Plus size={16}/>{t("Add evidence")}</button>}</div>
          <EvidenceList review={useDraft} person={person}/>
        </section>
        <section className="card panel">
          <div className="card-head compact-head"><div><h2>{t("Criteria and ratings")}</h2><p>{t(teams[review.template])}  · {t("Policy v")}{policy.version}</p></div>{score!==null&&suggested!==null&&<div className="score-chip"><small>{t("Suggested rating")}</small><strong>{score.toFixed(2)} / 5</strong><small>{t("Level ")}{suggested} · {t(policy.labels[suggested-1])}</small></div>}</div>
          {score===null&&note(t("A suggested rating appears when all applicable criteria are rated."))}
          <details className="rubric"><summary>{t("Company rating scale 1–5")}</summary>{policy.labels.map((name,i)=><p key={name+i}><strong>{i+1} · {t(name)}</strong><br/>{t(policy.definitions[i])}</p>)}</details>
          {useDraft.items.map((item,i)=><div className="criterion" key={i}>
            <div className="criterion-title"><h3>{t(dimensions[i])}</h3><span className="weight">{weights[i]}%</span></div><p>{t(policy.criteria[review.template][i])}</p>
            {editable&&item.na!=='approved'?<>
              {item.na!=='pending'&&<>{label(t("Rating · ")+t(dimensions[i]),<select value={item.rating??''} onChange={e=>edit(r=>r.items[i].rating=Number(e.target.value)||null)}><option value="">{t("Select a rating")}</option>{policy.labels.map((name,j)=><option key={j} value={j+1}>{j+1} · {t(name)}</option>)}</select>,criterionError(i,'rating')&&t(criterionError(i,'rating')))}
              {label(t("Rationale · ")+t(dimensions[i]),<textarea rows={2} value={t(item.note)} onChange={e=>edit(r=>r.items[i].note=e.target.value)}/>,criterionError(i,'rationale')&&t(criterionError(i,'rationale')))}
              <fieldset className="evidence-checks" aria-invalid={criterionError(i,'evidence')?true:undefined} aria-describedby={criterionError(i,'evidence')?evidenceErrorId+i:undefined} tabIndex={criterionError(i,'evidence')?-1:undefined}><legend>{t("Supporting evidence")}</legend>{useDraft.evidence.filter(e=>e.dimension===i).map(e=><label key={e.id}><input type="checkbox" checked={item.evidenceIds.includes(e.id)} onChange={event=>edit(r=>{r.items[i].evidenceIds=event.target.checked?[...item.evidenceIds,e.id]:item.evidenceIds.filter(id=>id!==e.id);})}/>{t(e.description)}</label>)}{!useDraft.evidence.some(e=>e.dimension===i)&&<p className="muted">{t("No evidence for this criterion.")}</p>}{criterionError(i,'evidence')&&<p className="field-error" id={evidenceErrorId+i}>{t(criterionError(i,'evidence'))}</p>}</fieldset></>}
            </>:<>{item.na!=='approved'&&<p><strong>{item.rating?item.rating+' · '+t(policy.labels[item.rating-1]):t('Awaiting rating')}</strong>{item.note&&<><br/>{t(item.note)}</>}</p>}
              <div className="muted">{review.evidence.filter(e=>item.evidenceIds.includes(e.id)).map(e=><div key={e.id}>{t("Reference · ")}{t(e.description)}</div>)}</div>
            </>}
          </div>)}
          {editable?<>
            {label(t("Performance summary"),<textarea value={t(draft.summary)} onChange={e=>edit(r=>r.summary=e.target.value)}/>,summaryError&&!draft.summary.trim()?t("Enter a performance summary."):undefined)}
            {label(t("Development plan"),<textarea value={t(draft.development)} onChange={e=>edit(r=>r.development=e.target.value)}/>,summaryError&&!draft.development.trim()?t("Enter a development plan."):undefined)}
            {!action&&!extra&&<ErrorsBox errors={submissionErrors.filter((error:string)=>error!==goalError&&error!==summaryError&&!dimensions.some((_:string,index:number)=>['rating','rationale','evidence'].some(topic=>criterionError(index,topic)===error)))}/>}
            <div className="actions"><button onClick={()=>{const next=structuredClone(draft);log(next,actor,'Saved review draft');save(next,'Review draft saved.');setAttempted(false);}}>{t("Save draft")}</button><button className="primary" onClick={submit}>{t("Review before submitting")}</button></div>
          </>:<dl><div><dt>{t("Performance summary")}</dt><dd>{t(review.summary||'—')}</dd></div><div><dt>{t("Development plan")}</dt><dd>{t(review.development||'—')}</dd></div>{review.final&&<div><dt>{t("Approved result")}</dt><dd>{review.final} · {t(policy.labels[review.final-1])} · {t(review.finalReason)}</dd></div>}</dl>}
        </section>
      </div>
    </>}
    {tab==='overview'&&<AnnualWork cycle={cycle} review={review} department={person.team}/>}
    {reviewSubmission&&<Modal title={t("Submit to HR")} variant="review" close={()=>setReviewSubmission(false)}>
      <Confirmation edit={()=>setReviewSubmission(false)} confirm={confirmSubmission} label="Submit to HR" error={submissionSaveError?"Could not save the changes. Try again.":undefined}>
        {reviewData([[t("Employee"),t(person.name)],[t("Review cycle name"),t(cycle.name)],
          [t("Goal"),t(draft.goal.title),true],[t("Success criteria"),t(draft.goal.expected),true],
          [t("Actual outcome"),t(draft.goal.result),true],
          [t("Suggested rating"),score===null?'—':score.toFixed(2)+' / 5'],
          [t("Performance summary"),t(draft.summary),true],[t("Development plan"),t(draft.development),true]])}
        {draft.items.map((item,index)=><section className="confirmation-criterion" key={index}>
          <h4>{t(dimensions[index])}</h4>
          {reviewData([
            [t("Rating"),item.na==='approved'?'N/A':item.rating?item.rating+' · '+t(policy.labels[item.rating-1]):'—'],
            [t("Reason"),t(item.note),true],
            [t("Supporting evidence"),draft.evidence.filter(e=>item.evidenceIds.includes(e.id)).map(e=>t(e.description)).join('\n'),true],
          ])}
        </section>)}
      </Confirmation>
    </Modal>}
    {action&&<ReviewForm title={actionLabels[action]} confirmLabel={action==='publish'?"Confirm publication":"Confirm"} close={()=>setAction(null)}
      validate={validateAction} save={runAction} initialReview={action==='publish'&&canPublish(review,cycle)}
      fields={issues=><>
        {action==='approve'&&label(t("Approved rating"),<select value={value} onChange={e=>setValue(e.target.value)}><option value="">{t("Select a rating")}</option>{policy.labels.map((name,i)=><option key={i} value={i+1}>{i+1} · {t(name)}</option>)}</select>,issues.value&&t(issues.value))}
        {action==='extend'&&label(t("New deadline"),<input type="date" value={value} onChange={e=>setValue(e.target.value)}/>,issues.value&&t(issues.value))}
        {action!=='publish'&&label(t("Reason"),<textarea value={reason} onChange={e=>setReason(e.target.value)}/>,issues.reason&&t(issues.reason))}
      </>}
      summary={<>
        {action==='publish'&&note(t("After you publish, the employee can view their approved result and feedback."))}
        {reviewData([
          [t("Action"),t(actionLabels[action])],[t("Employee"),t(person.name)],[t("Review cycle name"),t(cycle.name)],
          ...(action==='approve'||action==='publish'?[[t("Approved rating"),(action==='approve'?value:review.final)+' · '+t(policy.labels[Number(action==='approve'?value:review.final)-1]??'—')] as [string,React.ReactNode]]:[]),
          ...(action==='extend'?[[t("Deadline"),date(review.due)],[t("New deadline"),value?date(value):'—']] as [string,React.ReactNode][]:[]),
          [t("Reason"),action==='publish'?t(review.finalReason):reason,true],
          ...(action==='publish'?[[t("Performance summary"),t(review.summary)],[t("Development plan"),t(review.development)]] as [string,React.ReactNode][]:[]),
        ])}
      </>}/>}
    {extra==='evidence'&&<EvidenceForm title="Add manager evidence" entry={entry} update={setEntry} cycle={cycle} close={()=>setExtra(null)} save={()=>{
      const next=structuredClone(draft);
      next.evidence.push({...entry,id:makeId(),actor:actorName(actor),addedAt:new Date().toISOString()});
      log(next,actor,'Add evidence',entry.description);
      const saved=save(next,'Evidence saved.');
      if(saved)setExtra(null);
      return saved;
    }}/>}
    {(extra==='goal'||extra==='proposal')&&<GoalEditor original={review.goal} suggestion={review.goalSuggestion} useProposal={extra==='proposal'} cycle={cycle} actor={actor} close={()=>setExtra(null)} saveGoal={goal=>{
      const next=structuredClone(draft);
      const changed=goal.history.length>review.goal.history.length;
      if(changed){
        const previous=structuredClone(next.items[0]);
        Object.assign(next.items[0],{rating:null,note:'',evidenceIds:[]});
        log(next,actor,'Changed goal criteria',goal.history[0].reason,{snapshot:{previousRating:previous}});
      }
      next.goal=goal;delete next.goalSuggestion;log(next,actor,'Confirmed goal');
      const saved=save(next,'Goal saved.');
      if(saved)setExtra(null);
      return saved;
    }}/>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App/>);
