import {createContext, useContext} from 'react';
import {thaiCopy} from './thai-copy';

export type Language = 'th' | 'en';

export const LocaleContext = createContext<Language>('th');
const preferenceKey = 'performance-studio-language';
const locales = {th:'th-TH', en:'en-GB'};
const dateFormat = (locale:string) => new Intl.DateTimeFormat(locale, {
  day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Bangkok',
});
const dates = {th:dateFormat(locales.th), en:dateFormat(locales.en)};

export function getSavedLanguage():Language {
  try {return localStorage.getItem(preferenceKey) === 'en' ? 'en' : 'th';}
  catch {return 'th';}
}

export function saveLanguage(language:Language) {
  try {localStorage.setItem(preferenceKey,language);}
  catch {}
}

const errorEndings = [
  'must have positive weights totaling 100%.',
  'needs descriptions for all three criteria.',
  'needs a manager and a job template.',
  'needs a reason for the cross-department reviewer.',
  'is awaiting HR approval for N/A.',
  'needs a rating of 1–5.',
  'needs a rationale of at least 8 characters.',
  'needs evidence linked to this criterion.',
];

function translateThai(value:string):string {
  const key=value.trim();
  if(Object.hasOwn(thaiCopy,key))return value.replace(key,()=>thaiCopy[key]);
  const ending=errorEndings.find(ending=>key.endsWith(' '+ending));
  if(ending)return translateThai(key.slice(0,-ending.length-1))+' '+thaiCopy[ending];
  return value;
}

export function useLocale() {
  const language=useContext(LocaleContext);
  return {
    language,
    locale:locales[language],
    t:language==='th'?translateThai:(value:string)=>value,
    date:(value:string)=>value?dates[language].format(new Date(value)):'—',
  };
}
