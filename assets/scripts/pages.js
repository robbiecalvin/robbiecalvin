(() => {
  'use strict';
  const money = value => new Intl.NumberFormat('en-CA', {style:'currency',currency:'CAD',maximumFractionDigits:0}).format(value);
  const form = document.querySelector('[data-estimator]');
  if (form) {
    const kind = form.dataset.estimator;
    const plan = form.elements.plan;
    const quantity = form.elements.quantity;
    const total = form.querySelector('[data-estimate-total]');
    const breakdown = form.querySelector('[data-estimate-breakdown]');
    let currentEstimate = '';
    function update() {
      let q = quantity ? Number(quantity.value) : 1;
      if (!Number.isFinite(q)) q = 1;
      q = Math.max(1, Math.min(Number(quantity?.max || 40), Math.floor(q)));
      const value = plan.value;
      let amount = Number(value);
      let detail = plan.selectedOptions[0].textContent;
      if (kind === 'personal-assistant') {
        amount = ({1:35,5:160,10:300})[value];
        detail = `${value} hour${value === '1' ? '' : 's'} of support: ${money(amount)}.`;
      } else if (kind === 'rtb-advocacy' && value === '40') {
        amount = 40 * q;
        detail = `${q} hour${q === 1 ? '' : 's'} × $40 = ${money(amount)}.`;
      } else if (kind === 'wp-managment') {
        amount *= q;
        detail = `${q} website${q === 1 ? '' : 's'} × ${money(Number(value))} per month = ${money(amount)} monthly.`;
      } else if (kind === 'web-design') {
        if (value === 'hourly') {
          amount = 50 * q;
          detail = `${q} hour${q === 1 ? '' : 's'} × $50 = ${money(amount)}.`;
        } else {
          const pages = Number(value);
          amount = pages === 1 ? 500 : 1250 + Math.max(0, pages - 5) * 250;
          detail = pages === 1 ? 'One landing page, up to six sections: from $500.' : `Up to ${pages} informational pages: $1,250 base${pages > 5 ? ` + ${pages - 5} additional page${pages === 6 ? '' : 's'} × $250` : ''}.`;
        }
      }
      if (kind === 'rtb-advocacy' && quantity) {
        quantity.disabled = value !== '40';
        quantity.closest('[data-quantity-control]')?.toggleAttribute('hidden', value !== '40');
      }
      if (kind === 'web-design' && quantity) {
        quantity.disabled = value !== 'hourly';
        quantity.closest('[data-hourly-controls]').hidden = value !== 'hourly';
      }
      total.textContent = money(amount);
      breakdown.textContent = detail;
      currentEstimate = `${detail} Estimate: ${money(amount)} CAD${kind === 'wp-managment' ? ' / month' : ''}, before applicable tax. Final scope and price to be confirmed.`;
    }
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    form.addEventListener('submit',event=>event.preventDefault());
    document.querySelectorAll('[data-select-plan]').forEach(button => {
      button.addEventListener('click',()=>{
        plan.value=button.dataset.selectPlan;
        update();
        form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
        plan.focus({preventScroll:true});
      });
    });
    form.querySelector('[data-use-estimate]').addEventListener('click',()=>{
      if (!form.reportValidity()) return;
      const brief = document.querySelector('[data-brief]');
      if (!brief) return;
      brief.elements.timing.value=currentEstimate;
      let note=brief.querySelector('.estimate-used');
      if(!note){note=document.createElement('p');note.className='estimate-used';note.setAttribute('role','status');brief.prepend(note);}
      note.textContent='Your estimate is included below. Add your project details before downloading.';
      brief.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      brief.elements.name.focus({preventScroll:true});
    });
    update();
  }
  const modeText={
    store:['Store Mode overview','Orders. Products. The bigger picture.','Bring orders, products, customer insights, and store notifications into a configurable dashboard.'],
    site:['Site Mode overview','Pages. Posts. A healthier website.','Bring content, site health, and management tools into the same desktop workspace. WordPress-side actions need the Quick Connector.']
  };
  const preview=document.querySelector('[data-mode-preview]');
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    const [label,title,text]=modeText[button.dataset.mode];
    preview.querySelector('.kicker').textContent=label;
    preview.querySelector('h3').textContent=title;
    preview.querySelector('p:last-child').textContent=text;
  }));
  const bundle=document.getElementById('fob-bundle');
  if(bundle)bundle.addEventListener('change',()=>document.getElementById('fob-total').textContent=`${money(Number(bundle.value))} CAD`);
})();
