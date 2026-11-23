/** L'Oréal Project 9 — Cloudflare Worker AI relay.
 * Configure either OPENAI_API_KEY secret (assignment's OpenAI requirement),
 * or an AI binding named AI (Cloudflare Workers AI optional alternative).
 * The API key MUST remain server-side — never put it in GitHub Pages files.
 */
const SYSTEM = `You are the Routine Concierge, a helpful assistant for a L'Oréal-themed student beauty routine builder. Stay strictly on the user's selected beauty products and related skincare, haircare, makeup, fragrance, and beauty routines. If asked off-topic questions, politely redirect. When building a routine, rely ONLY on the user-supplied selected product JSON; never introduce unselected items as though selected. You may mention broad SPF sunscreen if missing as a suggestion, clearly NOT selected. Order skin care sensibly (cleanser, lighter treatment, moisturizer, morning SPF); warn that retinol is typically nighttime; follow package directions, avoid overconfident or medical claims. Identify any mismatch (e.g., hair dye as daily shampoo). For morning/evening routines, structure with brief headings and numbered steps. Be friendly, specific and concise. Preserve relevant conversation context on follow-ups. Never invent ingredients, performance claims, real-time prices, or product links.`;
function cors(origin,env){const permitted=String(env.ALLOWED_ORIGIN||'*').split(',').map(s=>s.trim()).filter(Boolean);const allowed=permitted.includes('*')?'*':permitted.includes(origin)?origin:'';return {'Access-Control-Allow-Origin':allowed||'null','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};}
function json(data,status,headers){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});}
function textFromOpenAI(data){const entries=[];const refs=new Set();
  for(const item of data.output||[]){if(item.type!=='message')continue;for(const content of item.content||[]){if(content.type==='output_text'&&typeof content.text==='string')entries.push(content.text);for(const ann of content.annotations||[]){if(ann.url&&ann.url.startsWith('https://'))refs.add(ann.url);}}}
  const result=entries.join('\n').trim();return refs.size?`${result}\n\nSources:\n${[...refs].slice(0,4).join('\n')}`:result;
}
export default {
  async fetch(request,env){const origin=request.headers.get('Origin')||'';const headers=cors(origin,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return json({error:'Send a POST request.'},405,headers);
    if(headers['Access-Control-Allow-Origin']==='null')return json({error:'This website origin is not allowed.'},403,headers);
    if(Number(request.headers.get('content-length')||0)>30000)return json({error:'Request is too large.'},413,headers);
    let body;try{body=await request.json();}catch{return json({error:'Invalid JSON.'},400,headers);}
    const type=body?.type;
    if(!['routine','chat'].includes(type))return json({error:'Invalid request type.'},400,headers);
    if(!Array.isArray(body.products)||!body.products.length||body.products.length>35)return json({error:'Choose between 1 and 35 products.'},400,headers);
    const products=body.products.map(p=>({brand:String(p.brand||'').slice(0,100),name:String(p.name||'').slice(0,150),category:String(p.category||'').slice(0,60),description:String(p.description||'').slice(0,500)}));
    const history=Array.isArray(body.messages)?body.messages.slice(-20).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,700)})):[];
    const goal=String(body.goal||'balanced').slice(0,60);const time=String(body.time||'both').slice(0,30);
    const context=`Chosen product JSON:\n${JSON.stringify(products)}\nUser's goal: ${goal}. Preferred time: ${time}. Only these products are selected.`;
    const messages=type==='routine'?[{role:'user',content:context+'\nPlease write a personalized morning/evening routine using these products.'}]:[{role:'user',content:context},...history];
    if(type==='chat'&&!history.some(m=>m.role==='user'))return json({error:'A follow-up question is required.'},400,headers);
    try{
      let answer='';
      if(env.OPENAI_API_KEY){
        const input=[{role:'user',content:context},...(type==='routine'?[{role:'user',content:'Please generate my routine with the selected products.'}]:history)];
        const reqBody={model:env.OPENAI_MODEL||'gpt-4.1-mini',instructions:SYSTEM,input,max_output_tokens:950};
        if(body.webSearch===true)reqBody.tools=[{type:'web_search_preview'}];
        const resp=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(reqBody)});
        const result=await resp.json();
        if(!resp.ok)throw Error('OpenAI API error: '+(result.error?.message||resp.status));
        answer=textFromOpenAI(result);
      }else if(env.AI){
        const resp=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{messages:[{role:'system',content:SYSTEM},...messages],max_tokens:900,temperature:0.45});
        answer=typeof resp==='string'?resp:String(resp?.response||'');
      }else return json({error:'No AI provider configured. Add an OPENAI_API_KEY secret or a Workers AI binding named AI.'},503,headers);
      if(!answer.trim())throw Error('AI produced an empty response.');
      return json({reply:answer,provider:env.OPENAI_API_KEY?'openai':'workers-ai'},200,headers);
    }catch(e){console.error('AI request error:',String(e));return json({error:'AI request failed. Check Worker logs, account quota and model configuration.'},502,headers);}
  }
};
