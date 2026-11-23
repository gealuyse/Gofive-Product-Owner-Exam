import {Fragment, useEffect, useId, useRef, useState} from 'react';
import {ChevronDown, CircleAlert, ClipboardCheck, Search, TriangleAlert} from 'lucide-react';
import {useLocale} from './locale';
import {dimensions, missingEvidenceDimensions, overdue, stages, teams} from './model.mjs';
import {StatusPill, reviewTones} from './status-pill';
import type {Person, Policy, Review} from './types';

export function ReviewStatus({review}:{review:Review}){
  const {t}=useLocale();
  const missing=missingEvidenceDimensions(review);
  return <div className="review-status">
    <StatusPill label={t(stages[review.stage])} tone={reviewTones[review.stage]}/>
    {missing.length>0&&<MissingEvidence criteria={missing}/>}
  </div>;
}

function MissingEvidence({criteria}:{criteria:number[]}){
  const {t}=useLocale();
  const id=useId();
  const [dismissed,setDismissed]=useState(false);
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    if(!open)return;
    function dismissOutside(event:PointerEvent){
      if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);
    }
    document.addEventListener('pointerdown',dismissOutside);
    return ()=>document.removeEventListener('pointerdown',dismissOutside);
  },[open]);
  function dismiss(){setDismissed(true);setOpen(false);}
  return <span className="evidence-hint" ref={root} data-open={open} data-dismissed={dismissed}
    onPointerEnter={()=>setDismissed(false)} onFocus={()=>setDismissed(false)}>
    <button className="icon-button evidence-trigger" type="button" aria-label={t('Missing evidence')} aria-describedby={id}
      onClick={()=>{setDismissed(open);setOpen(!open);}}
      onKeyDown={event=>{if(event.key==='Escape')dismiss();}}>
      <CircleAlert size={16} aria-hidden="true"/>
    </button>
    <span id={id} className="evidence-tooltip" role="tooltip">
      <strong>{t('Missing evidence')}</strong>
      {criteria.map(index=><span key={index}>{t(dimensions[index])}</span>)}
    </span>
  </span>;
}

export function DeadlineWarning({decorative=false}:{decorative?:boolean}){
  const {t}=useLocale();
  return <span className="deadline-warning" role={decorative?undefined:'img'} aria-label={decorative?undefined:t("Overdue")} aria-hidden={decorative||undefined} title={t("Overdue")}><TriangleAlert size={14} aria-hidden="true"/></span>;
}

export function ReviewTable({records,people,open,policy,hr}:{records:Review[];people:Person[];open:(id:string)=>void;policy:Policy;hr:boolean}){
  const {t, date}=useLocale();
  const priority=(review:Review)=>overdue(review)?0:review.stage==='submitted'||review.stage==='verified'?1:review.stage==='approved'||review.stage==='revision'?2:review.stage==='published'?4:3;
  const [collapsed,setCollapsed]=useState<Set<string>>(()=>new Set());
  function toggleDepartment(name:string){
    setCollapsed(previous=>{
      const next=new Set(previous);
      if(next.has(name))next.delete(name);
      else next.add(name);
      return next;
    });
  }
  const peopleById=new Map(people.map(person=>[person.id,person]));
  const ordered=[...records].sort((a,b)=>priority(a)-priority(b)||a.due.localeCompare(b.due));
  const groups=teams.map((name,department)=>({name,rows:ordered.filter(record=>peopleById.get(record.id)?.team===department)})).filter(group=>group.rows.length);
  return <section className="card table-card">
    <div className="card-head"><h2>{t("Reviews ")}<span className="count">{records.length}</span></h2></div>
    <div className="table-scroll"><table className={'review-table'+(hr?' with-results':'')}>
      <colgroup><col/><col className="status-column"/><col className="deadline-column"/>{hr&&<col className="result-column"/>}</colgroup>
      <thead><tr><th scope="col">{t("Employee")}</th><th scope="col">{t("Status")}</th><th scope="col" className="deadline-cell">{t("Deadline")}</th>{hr&&<th scope="col" className="approved-result">{t("Approved result")}</th>}</tr></thead>
      {groups.map(({name,rows})=>{
        const expanded=!collapsed.has(name);
        const rowsId='department-'+name.toLowerCase();
        return <Fragment key={name}>
          <tbody><tr className="department-row"><th colSpan={hr?4:3}>
            <button className="department-toggle" aria-expanded={expanded} aria-controls={rowsId} onClick={()=>toggleDepartment(name)}>
              <span className="department-name">{t(name)}</span>
              <span className="department-count">{rows.length} {t(rows.length===1?'employee':'employees')}</span>
              <ChevronDown className="department-chevron" size={18} aria-hidden="true"/>
            </button>
          </th></tr></tbody>
          <tbody id={rowsId} className="department-reviews" aria-label={t(name)} data-expanded={expanded} inert={!expanded}>
            {rows.map(r=>{
              const person=peopleById.get(r.id)!;
              const rating=r.stage==='approved'||r.stage==='published'?r.final:null;
              return <tr key={r.id}>
                <td><div className="review-cell"><div className="review-cell-content"><button className="review-person" aria-label={t('Open review for')+' '+t(person.name)} onClick={()=>open(person.id)}>
                  <span className="review-person-text">
                    <span className="employee-name">{t(person.name)}<span className="review-search"><Search size={16} aria-hidden="true"/></span></span>
                    <small className="job-title">{t(person.job)}</small>
                    {!hr&&r.goalSuggestion&&<small className="queue-proposal">{t("Goal proposal pending")}</small>}
                  </span>
                </button></div></div></td>
                <td><div className="review-cell"><div className="review-cell-content"><ReviewStatus review={r}/></div></div></td>
                <td className="deadline-cell"><div className="review-cell"><div className="review-cell-content">
                  <span className="deadline"><time dateTime={r.due}>{date(r.due)}</time>{overdue(r)&&<DeadlineWarning/>}</span>
                </div></div></td>
                {hr&&<td className="approved-result" aria-label={rating?rating+" "+t("out of 5,")+" "+t(policy.labels[rating-1]):undefined}>
                  <div className="review-cell"><div className="review-cell-content"><span className="review-rating">{rating?rating+' / 5':'—'}</span></div></div>
                </td>}
              </tr>;
            })}
          </tbody>
        </Fragment>;
      })}
    </table>{!records.length&&<div className="empty"><ClipboardCheck size={24}/><p>{t("No reviews in this cycle.")}</p></div>}</div>
  </section>;
}

