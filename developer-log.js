(() => {
  const DATA_URL='data/template-changelog.json';
  const GITHUB_EDIT_URL='https://github.com/martaeri/swedsnus-v2/edit/main/data/template-changelog.json';
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
  function createEditor(){
    if(document.querySelector('[data-devlog-editor]'))return;
    const editor=document.createElement('aside');
    editor.className='developer-log-editor';
    editor.dataset.devlogEditor='';
    editor.hidden=true;
    editor.innerHTML=`<div class="developer-log-backdrop" data-devlog-editor-close></div><section class="developer-log-editor-panel" role="dialog" aria-modal="true" aria-labelledby="developer-log-editor-title"><header class="developer-log-head"><div><p class="kicker">Endast mallansvarig</p><h2 id="developer-log-editor-title">Skapa loggpost</h2></div><button type="button" data-devlog-editor-close aria-label="Stäng redigeringsverktyget">×</button></header><div class="developer-log-editor-body"><p>Fyll i formuläret och kopiera sedan den kompletta JSON-filen. Ingen information sparas automatiskt från templatesidan.</p><form data-devlog-editor-form><div class="developer-log-form-grid"><label>Datum<input type="date" name="date" required></label><label>Kategori<select name="type" required><option>Design</option><option selected>Funktion</option><option>Innehåll</option><option>Produktdata</option><option>Buggrättning</option></select></label></div><label>Rubrik<input name="title" required maxlength="100" placeholder="Kort beskrivande rubrik"></label><label>Berörda sidor<input name="pages" required placeholder="Exempel: index.html, product.html"></label><label>Vad har ändrats?<textarea name="summary" rows="4" required placeholder="Beskriv ändringen och varför den gjordes"></textarea></label><label>Kommentar<textarea name="developerNote" rows="4" required placeholder="Vad behöver utvecklarna ta hänsyn till?"></textarea></label><label class="developer-log-checkbox"><input type="checkbox" name="important" checked> Markera som viktig ändring</label><button class="btn primary" type="submit">Skapa förhandsvisning</button></form><section class="developer-log-output" data-devlog-output hidden><div><h3>Färdig JSON-fil</h3><p>Kopiera innehållet, öppna filen på GitHub, ersätt filens innehåll och välj <strong>Commit changes</strong>.</p></div><textarea data-devlog-json-output rows="12" readonly aria-label="Färdig JSON"></textarea><div class="developer-log-editor-actions"><button class="btn primary" type="button" data-devlog-copy>Kopiera JSON</button><a class="btn" href="${GITHUB_EDIT_URL}" target="_blank" rel="noopener">Öppna filen på GitHub</a></div><p class="form-feedback" data-devlog-editor-feedback role="status"></p></section></div><footer><span>Öppna eller stäng redigeraren med</span><kbd>Ctrl</kbd><b>+</b><kbd>Alt</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>L</kbd></footer></section>`;
    editor.querySelector('[name="date"]').value=new Date().toISOString().slice(0,10);
    document.body.append(editor);
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
    entries.innerHTML=visible.length?visible.map(entry=>`<article class="developer-log-entry${entry.important?' important':''}"><div class="developer-log-meta"><span>${escape(entry.type)}</span><time datetime="${escape(entry.date)}">${formatDate(entry.date)}</time></div><h3>${escape(entry.title)}</h3><p>${escape(entry.summary)}</p><div class="developer-log-pages"><strong>Berör:</strong> ${entry.pages.map(escape).join(', ')}</div><details><summary>Kommentar</summary><p>${escape(entry.developerNote)}</p></details></article>`).join(''):'<p class="developer-log-empty">Det finns inga poster i den här kategorin.</p>';
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
  function openEditor(){createEditor();close();document.querySelector('[data-devlog-editor]').hidden=false;document.body.classList.add('developer-log-open');document.querySelector('[data-devlog-editor-form] [name="title"]')?.focus();}
  function closeEditor(){document.querySelector('[data-devlog-editor]')?.setAttribute('hidden','');document.body.classList.remove('developer-log-open');}
  function slugify(value){return String(value||'').toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'andring';}
  function createJson(form){
    const values=new FormData(form);
    const date=String(values.get('date'));
    const entry={id:`${date}-${slugify(values.get('title'))}`,date,type:String(values.get('type')),title:String(values.get('title')).trim(),pages:String(values.get('pages')).split(',').map(page=>page.trim()).filter(Boolean),summary:String(values.get('summary')).trim(),developerNote:String(values.get('developerNote')).trim(),important:values.get('important')==='on'};
    const current=state.data||{title:'Mallens ändringslogg',description:'Väsentliga ändringar som påverkar utvecklingen av den fullständiga webbplatsen.',entries:[]};
    return JSON.stringify({title:current.title,description:current.description,entries:[entry,...current.entries.filter(item=>item.id!==entry.id)]},null,2);
  }
  async function copyJson(){
    const output=document.querySelector('[data-devlog-json-output]');
    const feedback=document.querySelector('[data-devlog-editor-feedback]');
    if(!output?.value)return;
    try{await navigator.clipboard.writeText(output.value);feedback.textContent='JSON-filen har kopierats.';}
    catch{output.focus();output.select();document.execCommand('copy');feedback.textContent='JSON-filen har markerats och kopierats.';}
  }
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
    if(event.target.closest('[data-devlog-editor-close]'))closeEditor();
    if(event.target.closest('[data-devlog-copy]'))copyJson();
    const filter=event.target.closest('[data-devlog-filter]');
    if(filter){state.filter=filter.dataset.devlogFilter;render();}
  });
  document.addEventListener('submit',event=>{
    if(!event.target.matches('[data-devlog-editor-form]'))return;
    event.preventDefault();
    const output=document.querySelector('[data-devlog-output]');
    const textarea=document.querySelector('[data-devlog-json-output]');
    textarea.value=createJson(event.target);
    output.hidden=false;
    textarea.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  document.addEventListener('keydown',event=>{
    if(event.key.toLowerCase()==='l'&&event.ctrlKey&&event.altKey&&event.shiftKey){event.preventDefault();document.querySelector('[data-devlog-editor]')?.hidden?openEditor():closeEditor();return;}
    if(event.key.toLowerCase()==='l'&&event.ctrlKey&&event.shiftKey&&!event.altKey){event.preventDefault();document.querySelector('[data-devlog]')?.hidden?open():close();}
    if(event.key==='Escape'&&!document.querySelector('[data-devlog-editor]')?.hidden)closeEditor();
    else if(event.key==='Escape'&&!document.querySelector('[data-devlog]')?.hidden)close();
  });
  createEditor();
  loadData();
})();
