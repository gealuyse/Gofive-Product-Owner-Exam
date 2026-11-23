import {useEffect, useId, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import {ChevronRight, CircleAlert, Download, FileText, Paperclip} from 'lucide-react';
import {useLocale} from './locale';
import {label, Modal, ReviewForm, reviewData, type FieldErrors} from './form-controls';
import {canRemoveEvidence, demoDate, dimensions, evidenceDateError, isEmployeeEvidence} from './model.mjs';
import type {Cycle, EvidenceAttachment, Person, Review} from './types';

const attachmentTypes=['application/pdf','image/png','image/jpeg','image/webp'];
const maxAttachmentSize=1024*1024;
type EvidenceEntry={dimension:number;description:string;observed:string;attachment?:EvidenceAttachment};

export const emptyEvidence=():EvidenceEntry=>({dimension:0,description:'',observed:demoDate});

function FileSummary({file,download=false}:{file:EvidenceAttachment;download?:boolean}){
  const {t,locale}=useLocale();
  const [url,setUrl]=useState('');
  useEffect(()=>{
    if(!download||!attachmentTypes.includes(file.type))return;
    const prefix='data:'+file.type+';base64,';
    if(!file.dataUrl.startsWith(prefix))return;
    try {
      const bytes=Uint8Array.from(atob(file.dataUrl.slice(prefix.length)),character=>character.charCodeAt(0));
      const objectUrl=URL.createObjectURL(new Blob([bytes],{type:file.type}));
      setUrl(objectUrl);
      return ()=>URL.revokeObjectURL(objectUrl);
    } catch {
      setUrl('');
    }
  },[download,file]);
  const size=Math.max(1,Math.round(file.size/1024)).toLocaleString(locale);
  return <span className="evidence-file">
    <Paperclip size={17} aria-hidden="true"/>
    <span className="file-spec"><strong>{file.name}</strong><small>{size} KB</small></span>
    {url&&<a className="file-download" href={url} download={file.name}><Download size={16}/>{t("Download")}</a>}
  </span>;
}

export function EvidenceList({review,person,criterion,onRemove}:{review:Review;person:Person;criterion?:number;onRemove?:(id:string)=>boolean}){
  const {t,date}=useLocale();
  const [selectedId,setSelectedId]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [removalFailed,setRemovalFailed]=useState(false);
  const entries=review.evidence
    .filter(item=>criterion===undefined||item.dimension===criterion)
    .sort((a,b)=>(b.addedAt??'').localeCompare(a.addedAt??'')||b.observed.localeCompare(a.observed));
  const selected=entries.find(item=>item.id===selectedId);
  function close(){setSelectedId('');setConfirm(false);setRemovalFailed(false);}
  if(!entries.length)return <p className="muted">{t(criterion===undefined?"No evidence yet in this cycle":"No evidence yet for this criterion")}</p>;
  return <>
    <ul className="evidence-list">
      {entries.map(e=><li className="evidence" key={e.id}>
        <button className="evidence-open" type="button" onClick={()=>setSelectedId(e.id)}>
          <span className="mini-icon"><FileText size={17}/></span>
          <span className="evidence-preview">
            <span className="evidence-title">{t(e.description)}</span>
            <span className="muted">{criterion===undefined&&t(dimensions[e.dimension])+' · '}{date(e.observed)} · {t(e.actor)}</span>
            {e.addedAt&&isEmployeeEvidence(e,person)&&<span className="evidence-author">{t("Added by employee")}</span>}
          </span>
          {e.attachment&&<Paperclip size={16} aria-label={t("Attachment")}/>}
          <ChevronRight size={16} aria-hidden="true"/>
        </button>
      </li>)}
    </ul>
    {selected&&<Modal title={t("Evidence details")} close={close}>
      <dl className="evidence-details">
        <div><dt>{t("Related criterion")}</dt><dd>{t(dimensions[selected.dimension])}</dd></div>
        <div><dt>{t("Evidence description")}</dt><dd>{t(selected.description)}</dd></div>
        <div><dt>{t("Work date")}</dt><dd>{date(selected.observed)}</dd></div>
        <div><dt>{t("Added by")}</dt><dd>{t(selected.actor)}</dd></div>
        {selected.attachment&&<div><dt>{t("Attachment")}</dt><dd><FileSummary file={selected.attachment} download/></dd></div>}
        {selected.source&&<div><dt>{t("Evidence source")}</dt><dd>{t(selected.source)}</dd></div>}
        {selected.context&&<div><dt>{t("Work context")}</dt><dd>{t(selected.context)}</dd></div>}
      </dl>
      {confirm&&<p className="notice" role="status">{t(['submitted','verified','approved'].includes(review.stage)
        ?"Removing this evidence sends the review back to your manager for reassessment."
        :"Remove this evidence from the current review?")}</p>}
      {removalFailed&&<p className="notice confirmation-error" role="alert">{t("Could not remove the evidence. Try again.")}</p>}
      <div className="actions">
        <button onClick={confirm?()=>{setConfirm(false);setRemovalFailed(false);}:close}>{t(confirm?"Cancel":"Close")}</button>
        {onRemove&&canRemoveEvidence(review,person,selected)&&<button className={confirm?'danger':'danger-outline'} onClick={()=>{
          if(!confirm){setConfirm(true);return;}
          if(onRemove(selected.id))close();
          else setRemovalFailed(true);
        }}>{t(confirm?"Confirm removal":"Remove evidence")}</button>}
      </div>
    </Modal>}
  </>;
}
export function EvidenceForm({title,entry,update,cycle,close,save,reassessment=false}:{
  title:string;entry:EvidenceEntry;update:Dispatch<SetStateAction<EvidenceEntry>>;cycle:Cycle;close:()=>void;save:()=>boolean|void;reassessment?:boolean;
}){
  const {t,date}=useLocale();
  const attachmentId=useId();
  const readerRef=useRef<FileReader|null>(null);
  const [reading,setReading]=useState(false);
  const [attachmentError,setAttachmentError]=useState('');
  useEffect(()=>()=>{const reader=readerRef.current;readerRef.current=null;reader?.abort();},[]);

  function attach(file:File|undefined){
    if(!file)return;
    const previous=readerRef.current;
    readerRef.current=null;
    previous?.abort();
    setReading(false);
    setAttachmentError('');
    if(!attachmentTypes.includes(file.type)){setAttachmentError("Choose a PDF, JPG, PNG, or WebP file.");return;}
    if(file.size===0||file.size>maxAttachmentSize){setAttachmentError("Choose a non-empty file up to 1 MB.");return;}
    const reader=new FileReader();
    readerRef.current=reader;
    setReading(true);
    reader.onloadend=()=>{
      if(readerRef.current!==reader)return;
      readerRef.current=null;
      setReading(false);
      if(typeof reader.result!=='string'){setAttachmentError("Could not read the file. Try selecting it again.");return;}
      const dataUrl=reader.result;
      update(current=>({...current,attachment:{name:file.name,size:file.size,type:file.type,dataUrl}}));
    };
    reader.readAsDataURL(file);
  }

  function validate():FieldErrors{
    const errors:FieldErrors={};
    if(!entry.description.trim())errors.description='Describe the evidence.';
    const dateError=evidenceDateError(entry.observed,cycle);
    if(dateError)errors.observed=dateError;
    if(reading)errors.form='Wait for the attachment to finish loading.';
    if(attachmentError)errors.attachment=attachmentError;
    return errors;
  }
  return <ReviewForm title={title} confirmLabel="Save evidence" close={close} validate={validate} save={save}
    saveError="Could not save the evidence. Check browser storage or choose a smaller file."
    fields={errors=><>
      {label(t("Related criterion"),<select value={entry.dimension} onChange={e=>update({...entry,dimension:Number(e.target.value)})}>{dimensions.map((name,i)=><option key={name} value={i}>{t(name)}</option>)}</select>)}
      {label(t("Evidence description"),<textarea value={entry.description} onChange={e=>update({...entry,description:e.target.value})}/>,errors.description&&t(errors.description))}
      {label(t("Work date"),<input type="date" min={cycle.start} max={cycle.end} value={entry.observed} onInput={e=>{const observed=e.currentTarget.value;update(current=>({...current,observed}));}}/>,errors.observed&&t(errors.observed))}
      <div className="evidence-upload">
        <span className="upload-label">{t("Attachment (optional)")}</span>
        <small id={attachmentId+'-help'}>{t("One PDF, JPG, PNG, or WebP file · up to 1 MB")}</small>
        <input className="file-input" id={attachmentId} type="file" aria-label={t("Attachment (optional)")} accept={attachmentTypes.join(',')} aria-describedby={attachmentError?attachmentId+'-error':attachmentId+'-help'} aria-invalid={attachmentError?true:undefined} onChange={e=>{
          attach(e.currentTarget.files?.[0]);e.currentTarget.value='';
        }}/>
        <label className="file-picker" htmlFor={attachmentId}><Paperclip size={16} aria-hidden="true"/> {t("Choose file")}</label>
        {reading&&<small role="status">{t("Reading attachment…")}</small>}
        {attachmentError&&<div className="upload-error"><p className="field-error inline-field-error" id={attachmentId+'-error'} role="alert"><CircleAlert size={16} aria-hidden="true"/><span>{t(attachmentError)}</span></p>
          <button className="link-button" type="button" onClick={()=>setAttachmentError('')}>{t("Continue without this file")}</button></div>}
        {entry.attachment&&<div className="attached-file">
          <FileSummary file={entry.attachment}/>
          <button type="button" onClick={()=>{update(current=>({...current,attachment:undefined}));setAttachmentError('');}}>{t("Remove attachment")}</button>
        </div>}
      </div>
    </>}
    summary={<>{reassessment&&<p className="notice">{t("Saving this evidence returns the review to your manager for reassessment.")}</p>}
    {reviewData([
      [t("Related criterion"),t(dimensions[entry.dimension])],[t("Work date"),date(entry.observed)],
      [t("Evidence description"),entry.description,true],
      [t("Attachment"),entry.attachment?<FileSummary file={entry.attachment}/>:t("No attachment"),true],
    ])}</>}
  />;
}
