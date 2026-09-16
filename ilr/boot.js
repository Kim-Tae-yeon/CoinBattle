'use strict';
(() => {
const fail=e=>{const box=document.getElementById('fatal');box.hidden=false;document.getElementById('fatal-detail').textContent=String(e.message||e.reason||'파일 로드 오류').slice(0,250);};
window.addEventListener('error',e=>{if(e.target?.tagName==='SCRIPT')fail({message:'파일 연결 오류: '+e.target.getAttribute('src')});else if(e.message)fail(e);},true);
window.addEventListener('unhandledrejection',fail);
setTimeout(()=>{if(!window.IdolApp)fail({message:'게임 초기화가 완료되지 않았습니다. 연결을 확인해주세요.'});},15000);
const resize=()=>{const v=window.visualViewport;if(!v||v.scale===1)document.documentElement.style.setProperty('--vh',Math.round(v?.height||innerHeight)+'px');document.getElementById('rotate').hidden=!(innerWidth>innerHeight&&innerHeight<550);};
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
})();
