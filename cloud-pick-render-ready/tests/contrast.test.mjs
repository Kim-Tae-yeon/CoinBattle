import test from 'node:test';
import assert from 'node:assert/strict';
const rgb = h => h.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
const lum = h => rgb(h).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => {const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for (const [label,fg,bg,min] of [
 ['body','#f2e7d5','#171a29',4.5],['secondary panel text','#d0c6d3','#2b2e40',4.5],
 ['primary button','#1c2232','#e6b482',4.5],['selected choice','#1c2232','#f0c293',4.5],
 ['choice text','#f2e7d5','#202638',4.5],['control boundary','#ac98ae','#2b2e40',3],
 ['timer','#f2e7d5','#1c2232',4.5],['disabled label','#d0c6d3','#3c3b4d',4.5]
]) test(`contrast: ${label}`,()=>assert.ok(contrast(fg,bg)>=min,`${contrast(fg,bg).toFixed(2)} < ${min}`));
