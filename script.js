/* L'Oréal Routine Atelier — Project 9 classroom implementation.
   Frontend never stores or reads an AI secret; optional AI requests go to a Worker. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE = 'loreal-routine-atelier-v1';
  const WORKER_URL = String(window.ROUTINE_CONFIG?.workerUrl || '').trim().replace(/\/$/, '');
  const state = {products: Array.isArray(window.LOREAL_PRODUCTS) ? window.LOREAL_PRODUCTS : [], selected:new Set(), messages:[], generated:false, loading:false, shown:8, search:'', category:'all', goal:'balanced', time:'both'};
  function save() {
    try {localStorage.setItem(STORAGE, JSON.stringify({selected:[...state.selected], messages:state.messages.slice(-36), generated:state.generated, goal:state.goal,time:state.time,dir:document.documentElement.dir}));} catch(_e){}
  }
  function loadSaved() {
    try {const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');
      if(Array.isArray(saved.selected)) state.selected=new Set(saved.selected.map(Number));
      if(Array.isArray(saved.messages)) state.messages=saved.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-36);
      state.generated=Boolean(saved.generated)&&state.messages.length>0;
      if(['hydration','brightening','gentle','balanced','easy'].includes(saved.goal))state.goal=saved.goal;
      if(['both','morning','evening'].includes(saved.time))state.time=saved.time;
      document.documentElement.dir=saved.dir==='rtl'?'rtl':'ltr';
    } catch(_e){}
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function titleCase(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}
  function selectedProducts(){return state.products.filter(p=>state.selected.has(p.id));}
  function filterProducts(){return state.products.filter(p=>{
    if(state.category!=='all'&&p.category!==state.category)return false;
    const term=state.search.trim().toLocaleLowerCase();return !term||[p.brand,p.name,p.category,p.description].join(' ').toLocaleLowerCase().includes(term);
  });}
  function initCategories(){const sel=$('categoryFilter');const previous=sel.value;sel.innerHTML='<option value="all">All categories</option>';
    const categories=[...new Set(state.products.map(p=>p.category))].sort();
    for(const cat of categories){const opt=document.createElement('option');opt.value=cat;opt.textContent=titleCase(cat);sel.appendChild(opt);}
    sel.value=categories.includes(previous)?previous:'all';state.category=sel.value;
  }
  function renderProducts(){const filtered=filterProducts(); const showing=filtered.slice(0,state.shown);
    $('productCounter').textContent=`${state.products.length} products`;
    $('resultLabel').textContent=state.search||state.category!=='all'?`${filtered.length} matching product${filtered.length===1?'':'s'}`:'Our most-loved essentials';
    $('resetFilters').hidden=!(state.search||state.category!=='all');
    $('productsContainer').innerHTML=showing.length?showing.map(p=>{
      const chosen=state.selected.has(p.id);
      return `<div class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="${esc(chosen?'Remove':'Select')} ${esc(p.name)}"><div class="product-photo"><div class="product-fallback" aria-hidden="true"><span>✳</span><small>BEAUTY ESSENTIAL</small></div><img src="${esc(p.image)}" alt="${esc(p.brand+' '+p.name)}" loading="lazy" onload="this.parentElement.classList.add('image-loaded')" onerror="this.parentElement.classList.add('image-unavailable');this.style.display='none'"><span class="select-bubble" aria-hidden="true">${chosen?'✓':'+'}</span></div><div class="card-text"><span class="product-brand">${esc(p.brand)}</span><h3>${esc(p.name)}</h3><span class="card-category">${esc(titleCase(p.category))}</span></div><div class="card-actions"><button type="button" class="details-btn" aria-expanded="false">View details</button><span class="toggle-label">${chosen?'Added ✓':'Select +'}</span></div><div class="details-text">${esc(p.description)}</div></div>`;
    }).join(''):`<div class="no-results"><h3>No matches found</h3><p>Try a different category or search phrase.</p></div>`;
    $('gridFooter').innerHTML=filtered.length>state.shown?`<button class="load-more" type="button" id="loadMore">Show more products (${filtered.length-state.shown} remaining) ↓</button>`:'';
    $('loadMore')?.addEventListener('click',()=>{state.shown+=8;renderProducts();});
  }
  function toggleProduct(id){if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);state.generated=false;save();renderProducts();renderSelected();updateChatState();}
  function renderSelected(){const items=selectedProducts();$('selectionCount').textContent=items.length;$('headerCount').textContent=items.length;
    $('clearSelections').hidden=items.length===0;$('generateRoutine').disabled=items.length===0||state.loading;
    $('selectedProducts').innerHTML=items.length?items.map(p=>`<div class="selected-row"><img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.style.display='none'"><div><div class="name">${esc(p.name)}</div><div class="brand">${esc(p.brand)}</div></div><button class="remove-product" type="button" data-remove="${p.id}" title="Remove ${esc(p.name)}" aria-label="Remove ${esc(p.name)}">×</button></div>`).join(''):'<div class="selected-empty"><span>♡</span>No products selected yet.<br>Tap any product card to add it.</div>';
    $('generateRoutine').textContent=state.loading?'Creating your routine…':'Generate my routine ↗';
    document.querySelector('.generate-hint').textContent=items.length?`${items.length} product${items.length>1?'s':''} ready for your routine.`:'Choose at least one product to get started.';
  }
  function updateChatState(){const enabled=state.generated&&state.messages.length>0&&!state.loading;
    $('chatInput').disabled=!enabled;$('sendChat').disabled=!enabled;
    $('chatInput').placeholder=enabled?'Ask a follow-up about your routine…':'Generate a routine to unlock chat…';
  }
  function appendTextWithLinks(node,str){
    for(const part of str.split(/(https?:\/\/[^\s<>]+|\*\*[^*]+\*\*)/g)){
      if(part.startsWith('**')&&part.endsWith('**')){const b=document.createElement('strong');b.textContent=part.slice(2,-2);node.append(b);}
      else if(/^https?:\/\//.test(part)){try{const url=new URL(part);if(!['http:','https:'].includes(url.protocol))throw Error();const a=document.createElement('a');a.href=url.href;a.textContent=part;a.target='_blank';a.rel='noopener noreferrer';node.append(a);}catch(_){node.append(document.createTextNode(part));}}
      else node.append(document.createTextNode(part));
    }
  }
  function renderChat(){const win=$('chatWindow');win.innerHTML='';
    if(!state.messages.length){win.innerHTML='<div class="chat-empty" id="chatEmpty"><div class="chat-sparkle">✳</div><span class="chat-overline">YOUR PERSONAL BEAUTY SPACE</span><h4>Let’s make something<br><em>beautiful.</em></h4><p>Pick a few favorites, then select “Generate my routine” to see how they fit together.</p><div class="chat-example">Try asking: “What order should I use these in?”</div></div>';return;}
    for(const m of state.messages){const outer=document.createElement('div');outer.className='message '+m.role;
      const bubble=document.createElement('div');bubble.className='bubble';
      if(m.role==='assistant'){const who=document.createElement('div');who.className='who';who.textContent='YOUR ROUTINE CONCIERGE';bubble.append(who);}
      appendTextWithLinks(bubble,m.content);outer.append(bubble);win.append(outer);
    }
    win.scrollTop=win.scrollHeight;
  }
  function addMessage(role,content){state.messages.push({role,content});if(state.messages.length>36)state.messages=state.messages.slice(-36);save();renderChat();}
  function demoRoutine(products,goal,time){
    const skincare=products.filter(p=>['cleanser','skincare','moisturizer','suncare',"men's grooming"].includes(p.category));
    const hair=products.filter(p=>['haircare','hair styling','hair color'].includes(p.category));
    const makeup=products.filter(p=>p.category==='makeup'); const fragrance=products.filter(p=>p.category==='fragrance');
    const cleanser=skincare.filter(p=>p.category==='cleanser');
    const actives=skincare.filter(p=>p.category==='skincare'&&!/sunscreen|spf/i.test(p.name));
    const retinol=actives.filter(p=>/retinol/i.test(p.name));
    const gentleActives=actives.filter(p=>!/retinol/i.test(p.name));
    const moist=skincare.filter(p=>p.category==='moisturizer'&&!/spf|sunscreen/i.test(p.name));
    const sunscreen=skincare.filter(p=>p.category==='suncare'||/spf|sunscreen/i.test(p.name));
    const aftershave=skincare.filter(p=>p.category==="men's grooming");
    const lines=['**YOUR PERSONAL ROUTINE — DEMO PREVIEW**','Created from your '+products.length+' selected product'+(products.length!==1?'s':'')+'. This is a rule-based preview, not an AI response.',''];
    const goals={balanced:'balanced everyday care',hydration:'extra hydration',brightening:'a brighter-looking finish',gentle:'a gentle, minimal approach',easy:'the simplest possible routine'};
    lines.push('Your focus: '+goals[goal]+'.');
    function group(label,items){if(!items.length)return;lines.push('',`**${label}**`);items.forEach((item,i)=>lines.push(`${i+1}. ${item}`));}
    const name=p=>`${p.brand} ${p.name}`;
    if(skincare.length){
      if(time!=='evening'){
        const morning=[...cleanser.map(p=>`Cleanse with ${name(p)}.`),...gentleActives.map(p=>`Apply ${name(p)} according to its label.`),...aftershave.map(p=>`Use ${name(p)} after shaving.`),...moist.map(p=>`Moisturize with ${name(p)}.`),...sunscreen.map(p=>`Finish with ${name(p)} as directed on the SPF label.`)];
        if(!sunscreen.length)morning.push('Finish with a separate broad-spectrum SPF 30+ sunscreen (not among your selections).');
        group('MORNING · SKINCARE',morning);
      }
      if(time!=='morning'){
        const evening=[...cleanser.map(p=>`Cleanse with ${name(p)}.`),...gentleActives.map(p=>`Use ${name(p)} if suitable for your skin and consistent with its label.`),...retinol.map(p=>`Consider ${name(p)} only at night, introducing it gradually and following its label.`),...aftershave.map(p=>`After shaving, soothe with ${name(p)}.`),...moist.map(p=>`Finish with ${name(p)} to hydrate.`)];
        if(evening.length)group('EVENING · SKINCARE',evening);
      }
    }
    group('HAIR RITUAL', hair.map(p=>/color/i.test(p.category)?`Follow all instructions and allergy warnings for ${name(p)}; do not use it as daily shampoo.`:/shampoo/i.test(p.name)?`Wash hair with ${name(p)} when needed.`:/conditioner/i.test(p.name)?`Condition with ${name(p)} after shampooing.`:`Style as directed with ${name(p)}.`));
    if(time!=='evening')group('MAKEUP & FINISHING TOUCHES', [...makeup.map(p=>`Apply ${name(p)} after skincare, following package directions.`),...fragrance.map(p=>`Finish with ${name(p)}; avoid irritated skin.`)]);
    if(!skincare.length&&!hair.length&&!makeup.length&&!fragrance.length)lines.push('Follow individual product instructions.');
    lines.push('','**A FEW BEAUTY NOTES**','• Avoid layering multiple strong actives at once, especially if your skin is sensitive.','• Introduce new products gradually and stop if irritation develops.','• Follow each product label, including sunscreen reapplication directions.');
    return lines.join('\n');
  }
  function demoReply(query){const q=query.toLowerCase();const items=selectedProducts();
    if(!/(routine|skin|care|face|wash|hair|makeup|fragrance|perfume|sunscreen|spf|retinol|serum|cream|cleanser|moistur|product|ingredient|morning|night|evening|order|use|apply|first|often|frequency|dry|oily|sensitive|acne|lash|foundation|shampoo|conditioner|step)/i.test(q))return 'This demo is focused on your selected products, your routine, and beauty-related questions. Try asking which product to use first or whether your routine needs sunscreen.';
    if(/(order|first|step|when|morning|night)/.test(q))return `In general, skincare goes from cleansing to treatment/serum to moisturizer, then sunscreen in the morning. Makeup follows sunscreen. For your picks, here is a fresh overview:\n\n${demoRoutine(items,state.goal,state.time)}`;
    if(/(sunscreen|spf|sun)/.test(q))return 'Use a broad-spectrum SPF 30 or higher in the morning as the last skincare step. Reapply according to the product label, especially when outdoors. A regular moisturizer without SPF is not a replacement for sunscreen.';
    if(/(retinol|sensitive|irritat|acne)/.test(q))return 'If you are using a retinol or acne treatment, introduce it gradually and follow the label. Avoid combining too many irritating treatments at once, and use sunscreen during the day. Stop use if irritation occurs; seek professional advice for persistent skin problems.';
    if(/(hair|shampoo|conditioner)/.test(q))return 'Use shampoo to clean hair and scalp, then conditioner on the lengths and ends. Styling products typically come afterward. Hair-color products have separate directions and safety precautions.';
    if(/(makeup|foundation|mascara|lash)/.test(q))return 'Start with your skincare and sunscreen, allow them to settle, then apply foundation and eye makeup. Remove makeup gently at night.';
    if(/(how often|frequency|daily)/.test(q))return 'Cleansers and basic moisturizers may often be used daily, while exfoliants, retinol, and other active treatments might need a slower introduction. Always check each selected product’s label.';
    return `I can help explain the order, timing, and basic use of your ${items.length} selected products. This response is from the local demo, not a live AI model. For your current selection:\n\n${items.map(p=>'• '+p.name+' — '+p.description).join('\n')}`;
  }
  async function workerReply(type){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
    try{
      const payload={type,products:selectedProducts().map(({id,brand,name,category,description})=>({id,brand,name,category,description})),messages:state.messages.slice(-20),goal:state.goal,time:state.time,webSearch:Boolean($('webSearchToggle').checked)};
      const response=await fetch(WORKER_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Worker returned ${response.status}`);
      if(typeof body.reply!=='string'||!body.reply.trim())throw new Error('Worker returned an empty message.');return body.reply.trim();
    }finally{clearTimeout(timer);}
  }
  async function handleGenerate(){if(!state.selected.size||state.loading)return;
    state.loading=true;state.messages=[];state.generated=false;renderChat();renderSelected();updateChatState();
    let response;let success=true;
    try{response=WORKER_URL?await workerReply('routine'):demoRoutine(selectedProducts(),state.goal,state.time);}
    catch(e){success=false;response=`I couldn't connect to the AI Worker: ${e.message}. Please check the Worker URL and AI configuration, or temporarily clear workerUrl in config.js to use the local demo.`;}
    finally{state.loading=false;state.generated=success;addMessage('assistant',response);renderSelected();updateChatState();}
  }
  async function handleChat(ev){ev.preventDefault();const q=$('chatInput').value.trim();if(!q||!state.generated||state.loading)return;
    $('chatInput').value='';addMessage('user',q);state.loading=true;updateChatState();
    let reply;
    try{reply=WORKER_URL?await workerReply('chat'):demoReply(q);}catch(e){reply=`The AI connection is unavailable: ${e.message}. Your product selections and conversation have been saved.`;}
    finally{state.loading=false;addMessage('assistant',reply);updateChatState();$('chatInput').focus();}
  }
  function syncMode(){const live=Boolean(WORKER_URL);$('webSearchToggle').disabled=!live;$('modeTag').textContent=live?'LIVE AI CONNECTED':'DEMO PREVIEW';$('chatDisclaimer').textContent=live?'Responses are generated by your configured Cloudflare Worker. Always check product labels.':'Demo replies are generated with local rules, not AI. Connect a Worker to enable live AI.';}
  function bind(){
    $('productsContainer').addEventListener('click',ev=>{const card=ev.target.closest('.product-card');if(!card)return;const btn=ev.target.closest('.details-btn');if(btn){ev.stopPropagation();card.classList.toggle('expanded');const expanded=card.classList.contains('expanded');btn.textContent=expanded?'Hide details':'View details';btn.setAttribute('aria-expanded',String(expanded));return;}toggleProduct(Number(card.dataset.id));});
    $('productsContainer').addEventListener('keydown',ev=>{if(ev.target.closest('button'))return;if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList.contains('product-card')){ev.preventDefault();toggleProduct(Number(ev.target.dataset.id));}});
    $('selectedProducts').addEventListener('click',ev=>{const btn=ev.target.closest('[data-remove]');if(btn)toggleProduct(Number(btn.dataset.remove));});
    $('clearSelections').addEventListener('click',()=>{state.selected.clear();state.generated=false;save();renderSelected();renderProducts();updateChatState();});
    $('categoryFilter').addEventListener('change',e=>{state.category=e.target.value;state.shown=8;renderProducts();});
    $('productSearch').addEventListener('input',e=>{state.search=e.target.value;state.shown=8;renderProducts();});
    $('resetFilters').addEventListener('click',()=>{$('productSearch').value='';state.search='';$('categoryFilter').value='all';state.category='all';state.shown=8;renderProducts();});
    $('goalSelect').addEventListener('change',e=>{state.goal=e.target.value;save();});
    $('timeSelect').addEventListener('change',e=>{state.time=e.target.value;save();});
    $('generateRoutine').addEventListener('click',handleGenerate);
    $('chatForm').addEventListener('submit',handleChat);
    $('clearChat').addEventListener('click',()=>{state.messages=[];state.generated=false;save();renderChat();updateChatState();});
    $('directionToggle').addEventListener('click',()=>{document.documentElement.dir=document.documentElement.dir==='rtl'?'ltr':'rtl';$('directionToggle').setAttribute('aria-pressed',String(document.documentElement.dir==='rtl'));save();});
    window.addEventListener('keydown',ev=>{if(ev.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){ev.preventDefault();$('productSearch').focus();}});
  }
  async function start(){loadSaved();state.selected=new Set([...state.selected].filter(id=>state.products.some(p=>p.id===id)));
    $('goalSelect').value=state.goal;$('timeSelect').value=state.time;
    $('directionToggle').setAttribute('aria-pressed',String(document.documentElement.dir==='rtl'));
    syncMode();initCategories();bind();renderProducts();renderSelected();renderChat();updateChatState();
    if(location.protocol!=='file:')try{const resp=await fetch('products.json',{cache:'no-store'});if(resp.ok){const data=await resp.json();if(Array.isArray(data.products)&&data.products.length){state.products=data.products;initCategories();renderProducts();renderSelected();}}}catch(e){console.warn('Using built-in fallback catalog:',e);}
  }
  start();
})();
