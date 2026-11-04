(() => {
  'use strict';
  const config=window.RC_ACCOUNT||{enabled:false};
  window.rcRequest=async(path,method='GET',body)=>{
    if(!config.enabled)throw Error('Accounts are being prepared. The account service is not connected to this site yet.');
    const response=await fetch((config.apiBaseUrl||'')+path,{method,credentials:'include',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw Error('The account service is unavailable.');}
    if(!response.ok)throw Error(data.error||'This request could not be completed.');return data;
  };
  document.querySelectorAll('[data-track-app]').forEach(link=>link.addEventListener('click',async event=>{
    if(!config.enabled||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    // A public app launch remains available even if the visitor is signed out.
    try{await window.rcRequest('/api/activity','POST',{product:link.dataset.trackApp});}catch{}
    location.assign(link.href);
  }));
})();
