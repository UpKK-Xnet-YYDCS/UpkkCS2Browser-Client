import {useEffect, useState} from 'react';
import {fetchApi, getBaseUrl} from '../api/client';
import {defaultSearchConfig, parseSearchConfig, type SearchConfig} from '../../../shared/server-search.ts';

export function useServerSearchConfig() {
  const base=getBaseUrl();
  const [snapshot,setSnapshot]=useState<{base:string;config:SearchConfig;error:string}>({base,config:defaultSearchConfig,error:''});
  useEffect(()=>{
    const controller=new AbortController();let running=false;
    const refresh=async()=>{if(running)return;running=true;try{const value=await fetchApi<unknown>('/api/servers/search/config',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(4000)]),cache:'no-store'});const config=parseSearchConfig(value);if(!controller.signal.aborted)setSnapshot({base,config,error:''});}catch(error){if(!controller.signal.aborted)setSnapshot(current=>({...current,error:String(error)}));}finally{running=false;}};
    void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{controller.abort();clearInterval(timer);};
  },[base]);
  return {config:snapshot.base===base?snapshot.config:defaultSearchConfig,error:snapshot.error};
}
