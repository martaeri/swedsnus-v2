(() => {
  const DATA_URL='data/template-changelog.json';
  const READ_KEY='swedsnus-v2-devlog-read';
  const state={data:null,filter:'Alla'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const formatDate=value=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));

  function createPanel(){
    if(document.querySelector('[data-devlog]'))return;
    const panel=document.createElement('aside');
    panel.className='developer-log';
    panel.dataset.devlog='';
    panel.hidden=true;
    panel.innerHTML=`<div class="developer-log-backdrop" data-devlog-close></div><section class="developer-log-panel" role="dialog" aria-modal="true" aria-labelledby="developer-log-title"><header class="developer-log-head"><div><p class="kicker">Webbplatsmall</p><h2 id="developer-log-title">Mallens ändringslogg</h2></div><button type="button" data-devlog-close aria-label="Stäng ändringsloggen">×</button></header><div class="developer-log-intro" data-devlog-intro><p>Laddar ändringsloggen …</p></div><div class="developer-log-filters" data-devlog-filters hidden></div><div class="developer-log-entries" data-devlog-entries></div><footer><span>Öppna eller stäng med</span><kbd>Ctrl</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>L</kbd></footer></section>`;
    document.body.append(panel);
  }
  function types(){return ['Alla',...new Set((state.data?.entries||[]).map(entry=>entry.type))];}
  function render(){
    const intro=document.querySelector('[data-devlog-intro]');
    const filters=document.querySelector('[data-devlog-filters]');
    const entries=document.querySelector('[data-devlog-entries]');
    if(!intro||!filters||!entries||!state.data)return;
    intro.innerHTML=`<p>${escape(state.data.description)}</p><small>Loggen är offentlig och ska inte innehålla känslig information.</small>`;
    filters.hidden=false;
    filters.innerHTML=types().map(type=>`<button type="button" data-devlog-filter="${escape(type)}" class="${state.filter===type?'active':''}" aria-pressed="${state.filter===type}">${escape(type)}</button>`).join('');
    const visible=state.data.entries.filter(entry=>state.filter==='Alla'||entry.type===state.filter);
    entries.innerHTML=visible.length?visible.map(entry=>`<article class="developer-log-entry${entry.important?' important':''}"><div class="developer-log-meta"><span>${escape(entry.type)}</span><time datetime="${escape(entry.date)}">${formatDate(entry.date)}</time></div><h3>${escape(entry.title)}</h3><p>${escape(entry.summary)}</p><div class="developer-log-pages"><strong>Berör:</strong> ${entry.pages.map(escape).join(', ')}</div><details><summary>Information till utvecklare</summary><p>${escape(entry.developerNote)}</p></details></article>`).join(''):'<p class="developer-log-empty">Det finns inga poster i den här kategorin.</p>';
  }
  function updateUnread(){
    const latest=state.data?.entries?.[0]?.id;
    const unread=Boolean(latest&&localStorage.getItem(READ_KEY)!==latest);
    document.querySelectorAll('[data-devlog-unread]').forEach(badge=>badge.hidden=!unread);
  }
  function open(){
    createPanel();
    const panel=document.querySelector('[data-devlog]');
    panel.hidden=false;
    document.body.classList.add('developer-log-open');
    const latest=state.data?.entries?.[0]?.id;
    if(latest)localStorage.setItem(READ_KEY,latest);
    updateUnread();
    panel.querySelector('[data-devlog-close]')?.focus();
  }
  function close(){document.querySelector('[data-devlog]')?.setAttribute('hidden','');document.body.classList.remove('developer-log-open');}
  async function loadData(){
    createPanel();
    try{
      const response=await fetch(DATA_URL,{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data.entries))throw new Error('Poster saknas');
      state.data={...data,entries:[...data.entries].sort((a,b)=>b.date.localeCompare(a.date))};
      render();
      updateUnread();
    }catch(error){
      document.querySelector('[data-devlog-intro]').innerHTML='<p>Ändringsloggen kunde inte laddas.</p>';
      console.error('[Swedsnus V2 developer log]',error);
    }
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-devlog-open]'))open();
    if(event.target.closest('[data-devlog-close]'))close();
    const filter=event.target.closest('[data-devlog-filter]');
    if(filter){state.filter=filter.dataset.devlogFilter;render();}
  });
  document.addEventListener('keydown',event=>{
    if(event.key.toLowerCase()==='l'&&event.ctrlKey&&event.shiftKey){event.preventDefault();document.querySelector('[data-devlog]')?.hidden?open():close();}
    if(event.key==='Escape'&&!document.querySelector('[data-devlog]')?.hidden)close();
  });
  loadData();
})();
