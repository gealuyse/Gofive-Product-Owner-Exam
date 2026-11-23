import type {Stage} from './types';

type StatusTone = 'gray'|'blue'|'purple'|'green'|'amber';
export const reviewTones:Record<Stage,StatusTone> = {
  draft:'gray',
  submitted:'blue',
  verified:'blue',
  approved:'purple',
  published:'green',
  revision:'amber',
};

export function StatusPill({label,tone}:{label:string;tone:StatusTone}){
  return <span className={'status-pill status-'+tone}>{label}</span>;
}
