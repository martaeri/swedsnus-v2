(() => {
  const KEY='swedsnus-v2-theme';
  const allowed=new Set(['cool','warm','green','cool-terracotta','cool-ochre','cool-forest','cool-blue']);
  const saved=localStorage.getItem(KEY);
  const initial=allowed.has(saved)?saved:'cool-blue';
  document.documentElement.dataset.theme=initial;
  function apply(value) {
    const theme=allowed.has(value)?value:'cool-blue';
    document.documentElement.dataset.theme=theme;
    localStorage.setItem(KEY,theme);
    document.querySelectorAll('[data-theme-select]').forEach(select=>{ if(select.value!==theme) select.value=theme; });
  }
  document.addEventListener('change',event=>{
    const select=event.target.closest('[data-theme-select]');
    if(select) apply(select.value);
  });
  document.addEventListener('swedsnus-v2:layout-ready',()=>apply(document.documentElement.dataset.theme||initial));
})();
