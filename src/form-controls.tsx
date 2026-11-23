import React, {createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {ChevronLeft, CircleAlert, ClipboardCheck, X} from 'lucide-react';
import {useLocale} from './locale';

export const SaveConflictContext=createContext(false);

export type FieldErrors=Record<string,string>;
function Field({text,control,error}:{text:string;control:React.ReactElement<Record<string,unknown>>;error?:string}){
  const id=useId();
  return <div className={error?"field field-invalid":"field"}>
    <label htmlFor={id}>{text}</label>
    {React.cloneElement(control,{id,'aria-invalid':error?true:undefined,'aria-describedby':error?id+'-error':undefined})}
    {error&&<span id={id+'-error'} className="field-error inline-field-error"><CircleAlert size={16} aria-hidden="true"/><span>{error}</span></span>}
  </div>;
}
export const label=(text:string,control:React.ReactElement<Record<string,unknown>>,error?:string)=><Field text={text} control={control} error={error}/>;
export function useFocusInvalid(root:React.RefObject<HTMLElement|null>){
  const [attempt,setAttempt]=useState(0);
  useLayoutEffect(()=>{
    if(attempt)root.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-review-error]')?.focus();
  },[attempt,root]);
  return ()=>setAttempt(value=>value+1);
}
export const reviewData=(rows:[string,React.ReactNode,boolean?][]) => <dl className="review-confirmation-data">
  {rows.map(([name,value,wide])=><div className={wide?'review-data-wide':undefined} key={name}><dt>{name}</dt><dd>{value===''||value==null?'—':value}</dd></div>)}
</dl>;
export function ErrorsBox({errors}:{errors:string[]}){
  const {t}=useLocale();
  return errors.length>0&&<div className="errors" role="alert"><strong><CircleAlert size={18} aria-hidden="true"/>{t("Check the following details")}</strong><ul>{errors.map(error=><li key={error}>{t(error)}</li>)}</ul></div>;
}

export function Modal({title,children,close,variant}:{title:string;children:React.ReactNode;close:()=>void;variant?:'review'}){
  const {t}=useLocale();
  const dialog=useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(()=>{
    const element=dialog.current;
    const trigger=document.activeElement;
    element?.showModal();
    return ()=>{
      element?.close();
      if(trigger instanceof HTMLElement&&trigger.isConnected)trigger.focus({preventScroll:true});
    };
  },[]);
  return <dialog className={variant==='review'?'review-dialog':undefined} ref={dialog} onCancel={event=>{event.preventDefault();close();}} aria-labelledby={titleId}><div className="card-head"><div className="modal-title">
    {variant==='review'&&<span className="review-modal-icon"><ClipboardCheck size={20} aria-hidden="true"/></span>}
    <div>{variant==='review'&&<span className="review-kicker">{t("Step 2 of 2 · Check details")}</span>}<h2 id={titleId}>{t(title)}</h2></div>
  </div><button className="icon-button" aria-label={t("Close")} onClick={close}><X size={20}/></button></div>{children}</dialog>;
}

export function Confirmation({edit,confirm,label:confirmLabel,editLabel="Back to edit",error,children}:{edit:()=>void;confirm:()=>void;label:string;editLabel?:string;error?:string;children:React.ReactNode}){
  const {t}=useLocale();
  const conflict=useContext(SaveConflictContext);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>heading.current?.focus());
    return ()=>cancelAnimationFrame(frame);
  },[]);
  return <>
    <div className="confirmation-body">
      <h3 className="confirmation-heading" ref={heading} tabIndex={-1}>{t("Review the details below")}</h3>
      {children}
      {error&&<p className="notice confirmation-error" role="alert">{t(conflict?"This data changed in another tab. Copy your changes before reloading.":error)}</p>}
    </div>
    <div className="actions confirmation-actions">
      <button type="button" onClick={edit}>{editLabel==='Back to edit'&&<ChevronLeft size={16}/>} {t(editLabel)}</button>
      <button type="button" className="primary" onClick={confirm}>{t(confirmLabel)}</button>
    </div>
  </>;
}

export function ReviewForm({title,confirmLabel,close,validate,fields,summary,save,saveError,initialReview=false}:{
  title:string;confirmLabel:string;close:()=>void;validate:()=>FieldErrors;
  fields:(errors:FieldErrors)=>React.ReactNode;summary:React.ReactNode;save:()=>boolean|void;saveError?:string;initialReview?:boolean;
}){
  const {t}=useLocale();
  const [attempted,setAttempted]=useState(false);
  const [preview,setPreview]=useState(initialReview);
  const [couldNotSave,setCouldNotSave]=useState(false);
  const root=useRef<HTMLFormElement>(null);
  const focusInvalid=useFocusInvalid(root);
  const errors=attempted?validate():{};
  function next(event:React.FormEvent){
    event.preventDefault();
    setAttempted(true);
    const issues=validate();
    if(Object.keys(issues).length){focusInvalid();return;}
    setPreview(true);
  }
  return <Modal title={title} close={close} variant={preview?'review':undefined}>
    {preview?<Confirmation edit={initialReview?close:()=>{setPreview(false);setCouldNotSave(false);}}
       confirm={()=>setCouldNotSave(save()===false)} label={confirmLabel} editLabel={initialReview?"Cancel":undefined}
       error={couldNotSave?(saveError??"Could not save the changes. Try again."):undefined}>{summary}</Confirmation>:
      <form ref={root} onSubmit={next} noValidate>
        {fields(errors)}
        {errors.form&&<p className="field-error" role="alert" tabIndex={-1} data-review-error>{t(errors.form)}</p>}
        <div className="actions"><button type="button" onClick={close}>{t("Cancel")}</button><button type="submit" className="primary">{t("Review details")}</button></div>
      </form>}
  </Modal>;
}

