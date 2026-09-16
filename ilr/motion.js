'use strict';
(() => {
const I=ILR;
I.motion=(point,changes)=>{
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const finish=(el,frames,time)=>{document.body.append(el);const a=el.animate(frames,{duration:time,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});a.onfinish=()=>el.remove();setTimeout(()=>el.remove(),time+150);};
 if(point){for(let i=0;i<8;i++){const el=document.createElement('i');el.className='fx-dot';el.style.left=point.x+'px';el.style.top=point.y+'px';const angle=i*Math.PI/4;finish(el,[{transform:'translate(0,0) scale(.5)',opacity:1},{transform:`translate(${Math.cos(angle)*35}px,${Math.sin(angle)*35}px) scale(.1)`,opacity:0}],450);}}
 const x=changes[0];if(point&&x){const target=document.querySelector(`[data-result="${x.key}"]`);if(target){const r=target.getBoundingClientRect();const el=document.createElement('span');el.className='fx-number'+(I.good(x.key,x.delta)?'':' loss');el.textContent=(x.delta>0?'+':'')+I.value(x.key,x.delta);el.style.left=point.x+'px';el.style.top=point.y+'px';finish(el,[{transform:'translate(-50%,-50%) scale(.8)',opacity:1},{transform:`translate(${r.right-point.x-70}px,${r.top-point.y}px) scale(1)`,opacity:0}],580);}}
 try{navigator.vibrate?.(10);}catch{}
};
I.animateBars=()=>requestAnimationFrame(()=>document.querySelectorAll('[data-bar-after]').forEach(b=>{b.style.width=b.dataset.barAfter+'%';}));
})();
