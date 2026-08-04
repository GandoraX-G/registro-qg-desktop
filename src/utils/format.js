export function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

export function escapeHtml(s){
  const d = document.createElement("div"); d.textContent = s||""; return d.innerHTML;
}

export function fmtMo(n){
  return (Math.round(n*10)/10).toFixed(1).replace(/\.0$/,"");
}
