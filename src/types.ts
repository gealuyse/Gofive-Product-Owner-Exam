export type Person = {id:string;name:string;team:number;job:string;color:string;level:string}
export type Policy = {version:number;labels:string[];definitions:string[];preset:string;weights:number[][];criteria:string[][]}
export type Stage = 'draft'|'submitted'|'verified'|'approved'|'published'|'revision'
export type Goal = {title:string;expected:string;method:string;target:number|null;actual:number|null;unit:string;result:string;approved:boolean;history:{at:string;actor:string;reason:string;effective:string;previous:string;next:string}[]}
export type EvidenceAttachment = {name:string;size:number;type:string;dataUrl:string}
export type Evidence = {id:string;dimension:number;description:string;observed:string;source?:string;context?:string;attachment?:EvidenceAttachment;actor:string;employeeId?:string;addedAt?:string}
export type Review = {
  id:string;manager:string;crossDepartmentReason?:string;template:number;due:string;stage:Stage;goal:Goal;evidence:Evidence[];goalSuggestion?:{title:string;expected:string};
  reflection:{achievements?:string;challenges?:string;growth?:string;submitted?:boolean};
  reflectionDraft?:Review['reflection'];
  items:{rating:number|null;note:string;evidenceIds:string[];na:'pending'|'approved'|null;naReason:string}[];
  proposed:number|null;proposalReason:string;summary:string;development:string;final:number|null;finalReason:string;
  audit:{at:string;actor:string;action:string;reason:string;snapshot?:unknown}[];acknowledged:boolean;
  submittedAt?:string|null;verifiedAt?:string|null;approvedAt?:string|null;publishedAt?:string|null;revisionReason?:string;
}
export type Cycle = {id:string;name:string;start:string;end:string;due:string;approver:string;policy:Policy;status:string;reviews:Review[];requiresCalibration?:boolean;calibrationLocked?:boolean;exclusions?:Record<string,{reason:string;actor:string;at:string}>}
export type Draft = {name:string;start:string;end:string;due:string;approver:string;participants:string[];managerMap:Record<string,string>;templateMap:Record<string,number>;crossDepartmentReasons?:Record<string,string>;exclusionReasons:Record<string,string>}
export type Data = {people:Person[];policy:Policy;policyDraft?:Policy;cycles:Cycle[];activeId:string;draft:Draft|null}
