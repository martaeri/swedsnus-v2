(() => {
  const KEY = 'swedsnus-v2-subscriptions';
  const intervals = {2:'Varannan vecka',4:'Var 4:e vecka',6:'Var 6:e vecka',8:'Var 8:e vecka'};
  const seed = [{id:'SUB-2048',status:'active',intervalWeeks:4,nextDelivery:'2026-09-14',items:[{id:'original-white-portion__compact-20-dosor',packQty:2,qty:1}]}];
  const read = () => { try { const value=JSON.parse(localStorage.getItem(KEY)||'null'); return Array.isArray(value)?value:seed; } catch { return seed; } };
  const write = value => { localStorage.setItem(KEY,JSON.stringify(value)); render(); };
  const escape = value => window.SwedsnusV2?.escapeHtml(value)||String(value);
  const date = value => new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));
  const itemName = item => { const row=window.SwedsnusV2?.find(item.id); return row?window.SwedsnusV2.name(row):'Produkt'; };

  function selection(scope) {
    const choice=scope?.querySelector('[data-purchase-choice]');
    const mode=choice?.querySelector('input:checked')?.value||'once';
    return {purchaseMode:mode,intervalWeeks:mode==='subscription'?Number(choice.querySelector('select')?.value||4):null};
  }

  function updateChoice(choice) {
    const subscribed=choice.querySelector('input:checked')?.value==='subscription';
    choice.classList.toggle('subscribed',subscribed);
    choice.querySelector('[data-subscription-interval]').hidden=!subscribed;
    choice.querySelector('[data-subscription-copy]').hidden=!subscribed;
  }

  function card(subscription) {
    const active=subscription.status==='active';
    return `<article class="subscription-card"><div class="subscription-card-head"><div><span class="account-label">Prenumeration ${escape(subscription.id)}</span><h2>${active?'Aktiv':'Pausad'}</h2></div><span class="status-badge${active?' active':''}">${active?'Nästa leverans '+date(subscription.nextDelivery):'Inga leveranser planerade'}</span></div><div class="subscription-lines">${subscription.items.map(item=>`<div><strong>${escape(itemName(item))}</strong><span>${item.packQty}-pack · ${item.qty} st</span></div>`).join('')}</div><div class="subscription-settings"><label>Leveransintervall<select data-subscription-frequency="${escape(subscription.id)}" ${active?'':'disabled'}>${Object.entries(intervals).map(([value,label])=>`<option value="${value}"${Number(value)===subscription.intervalWeeks?' selected':''}>${label}</option>`).join('')}</select></label><div class="subscription-actions"><button class="btn" type="button" data-subscription-skip="${escape(subscription.id)}" ${active?'':'disabled'}>Hoppa över nästa</button><button class="btn" type="button" data-subscription-toggle="${escape(subscription.id)}">${active?'Pausa':'Återuppta'}</button><button class="subscription-cancel" type="button" data-subscription-cancel="${escape(subscription.id)}">Avsluta</button></div></div></article>`;
  }

  function render() {
    const root=document.querySelector('[data-subscriptions-root]');
    if(!root||!window.SwedsnusV2?.state.ready)return;
    if(window.SwedsnusAccount&&!window.SwedsnusAccount.loggedIn()){root.innerHTML=`<div class="account-login"><p class="kicker">Mina sidor</p><h1>Logga in</h1><p>Logga in för att se och hantera dina prenumerationer.</p><button class="btn primary" type="button" data-demo-login>Logga in</button></div>`;return;}
    const list=read();
    root.innerHTML=`${window.SwedsnusAccount?.nav?.('subscriptions')||''}<header class="account-hero compact"><div><p class="kicker">Återkommande leveranser</p><h1>Prenumerationer</h1><p>Ändra intervall, hoppa över en leverans, pausa eller avsluta. Ändringar påverkar kommande beställningar.</p></div></header><section class="subscription-notice"><strong>Så fungerar betalningen</strong><p>Du godkänner återkommande betalning hos Avarda när prenumerationen startas. Pris, lagerstatus, leveransadress och ålderskontroll behöver valideras inför varje kommande order.</p></section><div class="subscription-list">${list.length?list.map(card).join(''):'<div class="account-panel"><h2>Inga prenumerationer</h2><p>Välj Prenumerera på en produkt för att komma igång.</p><a class="btn primary" href="portion.html">Se produkter</a></div>'}</div><p class="form-feedback" data-subscription-feedback role="status"></p>`;
  }

  function update(id,callback,message) {
    const list=read(); const entry=list.find(item=>item.id===id); if(!entry)return;
    callback(entry); write(list);
    requestAnimationFrame(()=>{const el=document.querySelector('[data-subscription-feedback]');if(el)el.textContent=message;});
  }

  window.SwedsnusSubscriptions={read,write,selection,intervalLabel:value=>intervals[value]||`Var ${value}:e vecka`,render};
  document.addEventListener('change',event=>{
    const radio=event.target.closest('[data-purchase-choice] input[type="radio"]'); if(radio)updateChoice(radio.closest('[data-purchase-choice]'));
    const frequency=event.target.closest('[data-subscription-frequency]'); if(frequency)update(frequency.dataset.subscriptionFrequency,item=>item.intervalWeeks=Number(frequency.value),'Leveransintervallet har sparats.');
  });
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-subscription-toggle]'); if(toggle)update(toggle.dataset.subscriptionToggle,item=>item.status=item.status==='active'?'paused':'active',toggle.textContent==='Pausa'?'Prenumerationen är pausad.':'Prenumerationen är aktiv igen.');
    const skip=event.target.closest('[data-subscription-skip]'); if(skip)update(skip.dataset.subscriptionSkip,item=>{const next=new Date(`${item.nextDelivery}T12:00:00`);next.setDate(next.getDate()+item.intervalWeeks*7);item.nextDelivery=next.toISOString().slice(0,10);},'Nästa leverans har flyttats fram.');
    const cancel=event.target.closest('[data-subscription-cancel]'); if(cancel&&confirm('Vill du avsluta prenumerationen?')){write(read().filter(item=>item.id!==cancel.dataset.subscriptionCancel));}
  });
  document.addEventListener('swedsnus-v2:products-ready',render);
})();
