(() => {
  const search=document.querySelector('[data-faq-search]');
  const buttons=[...document.querySelectorAll('[data-faq-category]')];
  const groups=[...document.querySelectorAll('[data-faq-group]')];
  const empty=document.querySelector('[data-faq-empty]');
  if(!search||!groups.length)return;
  let category='all';
  const normalize=value=>String(value||'').toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function filter(){const query=normalize(search.value.trim());let visibleCount=0;groups.forEach(group=>{const categoryMatch=category==='all'||group.dataset.faqGroup===category;let groupCount=0;group.querySelectorAll('.faq-item').forEach(item=>{const match=categoryMatch&&(!query||normalize(item.textContent).includes(query));item.hidden=!match;if(match)groupCount++;});group.hidden=groupCount===0;visibleCount+=groupCount;});empty.hidden=visibleCount>0;}
  function selectCategory(value){category=value;buttons.forEach(button=>{const active=button.dataset.faqCategory===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});filter();}
  buttons.forEach(button=>button.addEventListener('click',()=>selectCategory(button.dataset.faqCategory)));
  search.addEventListener('input',filter);
  document.querySelector('[data-faq-reset]')?.addEventListener('click',()=>{search.value='';selectCategory('all');search.focus();});
})();
