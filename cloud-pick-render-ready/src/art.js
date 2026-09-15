  function ellipse(x,y,rx,ry,fill) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill(); }
  function rounded(x,y,w,h,r,fill,stroke,lineWidth=1) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
  const artPathCache=new Map();
  function path(d,fill,stroke='',width=1,c=ctx){let p=artPathCache.get(d);if(!p){p=new Path2D(d);if(artPathCache.size<900)artPathCache.set(d,p);}if(fill&&fill!=='none'){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
  function poly(points,fill,c=ctx){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
  function circ(x,y,rx,ry,fill,c=ctx){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function line(points,stroke,width=1,c=ctx){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  function star(x,y,s,fill,c=ctx){poly([[x,y-s],[x+s*.28,y-s*.22],[x+s,y],[x+s*.26,y+s*.2],[x,y+s],[x-s*.22,y+s*.25],[x-s,y],[x-s*.28,y-s*.22]],fill,c);}
  let backdrop=null,backdropKey='',grainPattern=null;
  function backdropCanvas() {
    const H=view.height,key=`${Math.round(H)}:${canvas.width}`;
    if(backdrop&&backdropKey===key)return backdrop;
    backdropKey=key;backdrop=document.createElement('canvas');
    const density=Math.min(2,Math.max(1,canvas.width/1000));
    backdrop.width=Math.ceil(1000*density);backdrop.height=Math.ceil(H*density);
    const c=backdrop.getContext('2d');c.scale(density,density);
    c.fillStyle='#262d47';c.fillRect(0,0,1000,H);
    // Broad, flat planes of midnight indigo; no 3D gradients or airbrushed bloom.
    poly([[0,H*.51],[216,H*.44],[548,H*.50],[780,H*.43],[1000,H*.51],[1000,H],[0,H]],'#323249',c);
    poly([[0,H*.69],[160,H*.67],[375,H*.74],[561,H*.66],[820,H*.65],[1000,H*.71],[1000,H],[0,H]],'#3b3346',c);
    for(let i=0;i<73;i++){
      const x=(i*179.33+57)%1000,y=28+((i*91.77+6)%(H*.61));
      if(i%11===0)star(x,y,3.5,'#a7aab0',c);else{c.globalAlpha=.35+(i%3)*.14;circ(x,y,.7+i%2*.45,.7+i%2*.45,'#d6c5a8',c);c.globalAlpha=1;}
    }
    // A crescent, deliberately imperfect, above the town.
    const moonY=H*.166,moonX=H>850?705:823;
    circ(moonX,moonY,39,42,'#d9bd91',c);circ(moonX+14,moonY-11,34,37,'#262d47',c);
    star(757,moonY-32,4,'#aeaaad',c);star(888,moonY+29,2.6,'#c4b398',c);
    // Drifting-looking strips are cached; a handful of leaves move over them.
    poly([[142,H*.195],[223,H*.187],[336,H*.195],[397,H*.208],[274,H*.211],[171,H*.206]],'#3b3c54',c);
    poly([[626,H*.36],[700,H*.343],[801,H*.351],[852,H*.366],[754,H*.372]],'#444058',c);
    // Far ridge, tiny pines, disused water tower, and sleepy windows.
    poly([[0,H*.78],[118,H*.7],[233,H*.80],[381,H*.83],[493,H*.8],[674,H*.83],[812,H*.69],[1000,H*.75],[1000,H],[0,H]],'#27293e',c);
    for(let i=0;i<27;i++){
      const x=i*40-27,base=H*.88+Math.sin(i*2.1)*28,hei=39+(i*29%68);
      poly([[x-21,base],[x-8,base-hei*.42],[x-18,base-hei*.42],[x-5,base-hei*.68],[x-11,base-hei*.66],[x+1,base-hei],[x+12,base-hei*.63],[x+6,base-hei*.66],[x+21,base-hei*.38],[x+12,base-hei*.41],[x+24,base]],'#1e2539',c);
    }
    const towerX=125,towerY=H*.68;
    line([[towerX-20,towerY+95],[towerX-13,towerY+8]],'#252339',4,c);line([[towerX+20,towerY+95],[towerX+13,towerY+8]],'#252339',4,c);
    line([[towerX-17,towerY+28],[towerX+17,towerY+67],[towerX-20,towerY+88]],'#252339',3,c);
    c.fillStyle='#383047';c.fillRect(towerX-22,towerY-21,44,45);
    poly([[towerX-28,towerY-21],[towerX-2,towerY-36],[towerX+27,towerY-21]],'#22243a',c);
    line([[towerX-20,towerY+2],[towerX+22,towerY+2]],'#605164',1,c);
    const townY=H*.91;
    [[45,96,48],[148,78,67],[768,91,60],[872,121,75],[994,80,49]].forEach(([x,w,h],j)=>{
      c.fillStyle=['#383045','#2e2b40','#312a40'][j%3];c.fillRect(x-w/2,townY-h,w,h+55);
      poly([[x-w/2-9,townY-h],[x-4,townY-h-29],[x+w/2+8,townY-h]],'#171e30',c);
      c.fillStyle='#514050';c.fillRect(x+w/4,townY-h-26,9,24);
      for(let k=0;k<3;k++){c.fillStyle=(j+k)%3===0?'#b18055':'#67505a';c.fillRect(x-w/2+17+k*(w-23)/3,townY-h+18,10,16);c.fillStyle='#302b3d';c.fillRect(x-w/2+21+k*(w-23)/3,townY-h+18,2,16);}
    });
    // Town telegraph wires: thin diagonals keep the composition slightly uneasy.
    line([[934,H*.47],[922,H]],'#151e30',7,c);line([[902,H*.55],[958,H*.55]],'#151e30',6,c);
    path(`M0 ${H*.65} Q385 ${H*.97} 930 ${H*.54} Q982 ${H*.58} 1040 ${H*.61}`,'none','#171d30',2,c);
    path(`M0 ${H*.67} Q435 ${H*.97} 930 ${H*.56}`,'none','#171d30',1,c);
    // A tiny bird on the wire; two amber pixels, not a borrowed character.
    poly([[850,H*.69],[846,H*.66],[853,H*.642],[865,H*.65],[869,H*.66],[883,H*.659],[871,H*.67],[874,H*.683],[865,H*.7]],'#121b2a',c);
    circ(863,H*.657,1.3,1.3,'#b18a65',c);
    // Crooked oak trunks make a side-view paper theatre around the cloud board.
    poly([[-50,H],[32,H],[43,H*.79],[29,H*.61],[42,H*.43],[31,H*.19],[68,-15],[32,-17],[3,H*.22],[-5,H*.43],[-32,H*.65]],'#141d2d',c);
    line([[17,H*.5],[72,H*.30],[94,H*.18],[111,H*.13]],'#141d2d',9,c);
    line([[27,H*.3],[139,H*.12],[217,H*.067]],'#141d2d',7,c);
    line([[70,H*.24],[75,H*.09],[48,H*.02]],'#141d2d',5,c);
    line([[34,H*.70],[110,H*.63],[143,H*.56]],'#141d2d',9,c);
    line([[71,H*.64],[103,H*.54]],'#141d2d',5,c);
    poly([[981,H],[1040,H],[1035,H*.08],[1009,H*.27],[987,H*.44],[1001,H*.69]],'#172032',c);
    line([[1012,H*.22],[940,H*.08],[869,H*.052]],'#172032',9,c);
    line([[1000,H*.43],[940,H*.31],[910,H*.25]],'#172032',8,c);
    line([[988,H*.78],[939,H*.70],[892,H*.67]],'#172032',8,c);
    // Angular clusters of burnt-orange leaves, deliberately kept at the edges.
    const foliage=[[-4,H*.025,1.22],[49,H*.047,1.0],[103,H*.072,.76],[157,H*.06,.65],[202,H*.049,.4],[-9,H*.32,.75],[57,H*.20,.40],[1001,H*.12,.7],[962,H*.046,.75],[900,H*.036,.48],[945,H*.27,.4],[-7,H*.64,.7],[1030,H*.62,.8]];
    foliage.forEach(([x,y,s],i)=>{
      c.save();c.translate(x,y);c.scale(s,s);
      poly([[-51,-18],[-38,-42],[-9,-35],[9,-51],[40,-32],[43,-11],[64,8],[42,31],[14,28],[-5,42],[-29,21],[-54,17]],['#995e4d','#ad704e','#785047','#95624c'][i%4],c);
      for(let k=0;k<4;k++){c.save();c.translate(-32+k*23,(k%2?3:-15));c.rotate(k*.8+i);poly([[-10,0],[-2,-7],[12,0],[0,7]],['#bd824f','#ca9357','#8b5449','#c17f4d'][k],c);c.restore();}
      c.restore();
    });
    // A low, ragged foreground bank keeps dark feet and moonlit clouds legible.
    poly([[0,H*.955],[122,H*.927],[243,H*.964],[389,H*.99],[617,H*.979],[811,H*.943],[1000,H*.954],[1000,H],[0,H]],'#151c2c',c);
    for(let i=0;i<44;i++){
      const x=(i*97+3)%1000,y=H-((i*17)%32);c.save();c.translate(x,y);c.rotate(i*.49);
      poly([[-5,0],[1,-2],[7,1],[0,3]],['#735143','#956247','#b17b51','#4d454d'][i%4],c);c.restore();
    }
    return backdrop;
  }
  function drawBackground(t){
    ctx.drawImage(backdropCanvas(),0,0,1000,view.height);
    // Leaves drift independently of gameplay: soft movement, not glowing particles.
    for(let i=0;i<12;i++){
      const speed=7+i%4*2,x=((i*197+73+t*speed)%1160)-80,y=((i*117+t*(9+i%3*3))%(view.height+70))-30;
      if(x>185&&x<815&&y>view.height*.24&&y<view.height*.91)continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.45+i)*.65+i);ctx.globalAlpha=.65;
      poly([[-7,0],[-1,-3],[8,0],[0,4]],['#c9945e','#ac7151','#bf8562'][i%3]);ctx.restore();
    }
    // Sparse eyes in the trees. They stay behind the interactive board.
    if(!reducedMotion&&Math.sin(t*.29)>.30){const a=Math.min(.65,(Math.sin(t*.29)-.3));ctx.save();ctx.globalAlpha=a;ellipse(80,view.height*.43,2.2,1.3,'#cba56b');ellipse(90,view.height*.43,2.2,1.3,'#cba56b');ctx.restore();}
  }
  const CLOUD_PATH=new Path2D('M-77 14Q-104 13-98-9Q-96-23-72-26Q-76-43-55-47Q-36-54-19-40Q-3-54 14-45Q31-57 52-43Q63-36 62-25Q84-31 96-14Q108 3 88 16L70 20Q49 33 28 26L5 30-17 27Q-38 36-56 24Z');
  function cloudShape(){return CLOUD_PATH;}
  function drawCloud(cell,t){
    const c=view.cells[cell],target=state.board[cell]>0;
    const reachable=(mode==='tutorial'?tutorialAllowed():options()).includes(cell)&&!['home','lobby','finished'].includes(state.phase), selected=currentCell()===cell&&state.phase==='choose';
    const hover=hoverCell===cell&&reachable&&state.phase==='choose'&&!me().locked;
    const e=(now()-state.phaseStartedAt)/1000, revealed=state.phase==='finished'||(state.phase==='reveal'&&(reducedMotion||e>=NIGHT_TIMING.land));
    const occupants=state.results.filter(r=>r.cell===cell),collision=revealed&&occupants.length>1;
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.s,c.s);
    const bob=reducedMotion?0:Math.sin(t*.9+cell*.65)*1.8;ctx.translate(0,bob);
    // One offset silhouette and one flat paper surface; no pillow shading.
    ctx.save();ctx.translate(0,11);ctx.scale(1,.83);ctx.fillStyle=collision?'#654555':'#41465e';ctx.fill(CLOUD_PATH);ctx.restore();
    ctx.save();ctx.scale(1,.83);
    ctx.fillStyle=collision?'#917174':selected?'#c0aa9b':reachable&&['home','choose','countdown'].includes(state.phase)?'#a39aa7':target?'#817c96':'#696880';
    ctx.fill(CLOUD_PATH);
    if(reachable&&['home','choose','countdown'].includes(state.phase)){ctx.strokeStyle=selected?'#efc183':hover?'#d9c5a2':'#c9b6ad';ctx.lineWidth=selected?3.8:hover?2.6:1.2;ctx.stroke(CLOUD_PATH);}
    ctx.restore();
    path('M-66 5L-40 12-11 10 8 15 37 10 65 12','none',selected?'#d9c2aa':'#b8a9b36b',1.4);
    if(selected){path('M-9-61L-2-54 12-69','none','#fff0d8',3.5);}
    if(target&&(!revealed||!occupants.length)){
      const count=state.board[cell],big=count>=5;
      // The number is the reward; the small lower badge is the keyboard shortcut.
      // Equal styling for centre and edge clouds. Selection outranks reward size.
      rounded(-53,-48,106,47,4,selected?'#f2e7d5':'#1c2232',selected?'#fff0d8':'#ac98ae',selected?3:1.5);
      drawCoin(-30,-24,.67,t+cell);
      ctx.font=`800 ${big?39:35}px ui-monospace,monospace`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=selected?'#1c2232':'#f2e7d5';
      ctx.fillText(String(count),13,-23);
    }
    if(options().includes(cell)&&target&&!revealed&&!['home','lobby'].includes(state.phase)){
      rounded(67,7,24,23,2,selected?'#d6a871':'#292e44',selected?'#efc48c':'#c2a895',1);
      ctx.font='600 12px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=selected?'#242b3d':'#e0c7a6';ctx.fillText(String(options().indexOf(cell)+1),79,19);
    }
    if(collision){path('M-25-2L-11 3-4-5 4 9 14-1 23 5','none','#d7a080',2);}
    ctx.restore();
  }
  function drawCoin(x,y,scale,t=0){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const rx=10+(reducedMotion?0:Math.sin(t*1.5)*.8);
    ellipse(3,1,rx,15.5,'#ab714d');ellipse(0,-1,rx,15.5,'#deb773');
    ctx.beginPath();ctx.ellipse(0,-1,rx-2.5,12,0,0,Math.PI*2);ctx.strokeStyle='#f0cd91';ctx.lineWidth=1;ctx.stroke();
    path('M1-8L-2 5','none','#8e5b47',2.5);
    ctx.restore();
  }
  function character(slot,x,y,scale,t,expression='idle',squash=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.scale(1/Math.sqrt(squash),squash);
    const step=reducedMotion?0:Math.floor(t*8)/8,bob=expression==='idle'?Math.sin(step*1.7+slot)*1.3:0;
    ctx.translate(0,bob);
    const blink=!reducedMotion&&((step+slot*1.33)%5.3<.16);
    animalLayers(slot,expression,blink).forEach(p=>{if(p.fill!=='none'){ctx.fillStyle=p.fill;ctx.fill(p.path);}if(p.stroke){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width;ctx.lineCap='round';ctx.stroke(p.path);}});
    ctx.restore();
  }
  function tag(text,x,y,fill,ink,size=12,border=''){
    ctx.save();const portrait=view.height>850;size*=portrait?1.5:1;ctx.font=`550 ${size}px "Malgun Gothic",system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const width=Math.min(220,ctx.measureText(text).width+19);
    rounded(x-width/2,y-(portrait?15:11),width,portrait?31:23,2,fill,border||undefined,1);ctx.fillStyle=ink;ctx.fillText(text,x,y,width-11);ctx.restore();
  }
  function drawPlayers(t){
    const reveal=state.phase==='reveal'||state.phase==='finished',elapsed=(now()-state.phaseStartedAt)/1000;
    const moves=state.players.filter(p=>mode!=='queue'||p.id===state.yourId).map(p=>{
      const home=view.cells[G.HOMES[p.slot]],r=state.results.find(r=>r.id===p.id),destination=reveal&&r&&r.cell!==null?view.cells[r.cell]:home;
      const progress=reveal?(reducedMotion?1:Math.min(1,Math.max(0,(elapsed-NIGHT_TIMING.anticipation)/NIGHT_TIMING.jump))):0;
      const ease=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;
      const peers=r?.cell!==null?state.results.filter(x=>x.cell===r?.cell):[],rank=peers.findIndex(x=>x.id===p.id);
      const spread=peers.length>1?(rank-(peers.length-1)/2)*43*progress:0;
      const x=home.x+(destination.x-home.x)*ease+spread;
      const y=home.y+(destination.y-home.y)*ease-(reducedMotion?0:Math.sin(progress*Math.PI)*105)-6;
      return{p,home,r,x,y,s:(home.s+(destination.s-home.s)*ease)*(view.height>850?1.0:.85),progress};
    });
    moves.sort((a,b)=>a.y-b.y).forEach(({p,home,r,x,y,s,progress})=>{
      const self=p.id===state.yourId;
      if(!reveal){
        ellipse(home.x,home.y+4,25*home.s,6.5*home.s,'#33384b');
        if(self){ctx.strokeStyle='#e0b780';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(home.x,home.y+5,37*home.s,10*home.s,0,0,Math.PI*2);ctx.stroke();}
      }
      const landed=reveal&&(reducedMotion||elapsed>=NIGHT_TIMING.land),expression=landed?(r?.gain?'happy':'sad'):'idle';
      let squash=1;
      if(reveal&&!reducedMotion){if(elapsed<NIGHT_TIMING.anticipation)squash=1-.08*Math.sin(Math.min(1,elapsed/NIGHT_TIMING.anticipation)*Math.PI/2);else if(elapsed>=NIGHT_TIMING.land&&elapsed<NIGHT_TIMING.land+.23)squash=.87+.13*((elapsed-NIGHT_TIMING.land)/.23);}
      character(p.slot,x,y,s,t,expression,squash);
      if(!reveal){
        if(!['home','lobby'].includes(state.phase))tag(`${p.name}${self&&p.name!=='나'?' · 나':''}`,home.x,home.y+37*home.s,self?'#bb895f':'#252b40',self?'#1a2131':'#d5c4ad',11.5,self?'':'#645768');
        if(state.phase==='choose'&&p.locked)tag('✓',home.x+57*home.s,home.y-120*s,'#38483f','#c7d0a2',13,'#81947c');
      }else if(landed&&r){
        const gainY=y-153*s,group=state.results.filter(z=>z.cell===r.cell);
        if(!r.collision||group[0]?.id===p.id)tag(r.missed?'놓쳤다.':r.collision?`${group.length}명 충돌 · 빈손`:`+${r.gain} COINS`,r.collision?view.cells[r.cell].x:x,gainY,r.gain?'#3c3439':'#4c303b',r.gain?'#edc78d':'#edb096',12,r.gain?'#af895c':'#a36b59');
      }
    });
  }
  function drawSelectedPath(){
    if(state.phase!=='choose'||currentCell()===null)return;
    const home=view.cells[G.HOMES[me().slot]],dest=view.cells[currentCell()];
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#d4a773aa';ctx.setLineDash([3,9]);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(home.x,home.y-7);ctx.quadraticCurveTo((home.x+dest.x)/2,(home.y+dest.y)/2-48,dest.x,dest.y-7);ctx.stroke();ctx.restore();
  }
  function makeParticles(){
    particles=[];
    state.results.forEach(r=>{
      if(r.missed||r.cell===null)return;
      if(r.collision&&state.results.find(z=>z.cell===r.cell)?.id!==r.id)return;
      for(let i=0;i<(r.gain?13:9);i++)particles.push({cell:r.cell,angle:i*2.399+r.slot,speed:50+(i*31%83),size:2+i%4,delay:NIGHT_TIMING.land+(i%3)*.025,color:r.gain?['#dfb371','#eed4a1','#b38a61'][i%3]:['#b8806b','#8b7087','#d6a586'][i%3],bad:r.collision});
    });
  }
  function drawParticles(){
    if(state.phase!=='reveal'||reducedMotion)return;
    const elapsed=(now()-state.phaseStartedAt)/1000;
    particles.forEach(p=>{const t=elapsed-p.delay;if(t<0||t>1.7)return;const c=view.cells[p.cell],x=c.x+Math.cos(p.angle)*p.speed*t,y=c.y-24+Math.sin(p.angle)*p.speed*t-85*t+90*t*t;
      ctx.save();ctx.globalAlpha=Math.max(0,1-t/1.7);ctx.translate(x,y);ctx.rotate(t*3+p.angle);poly([[-p.size,0],[0,-p.size*.6],[p.size,0],[0,p.size*.55]],p.color);ctx.restore();
    });
  }
  function drawAtmosphere(t){
    // A subtle paper print, generated once. This never touches UI text/hit areas.
    if(!grainPattern){const g=document.createElement('canvas');g.width=g.height=128;const gc=g.getContext('2d'),id=gc.createImageData(128,128);let seed=98731;for(let i=0;i<id.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;id.data[i]=id.data[i+1]=id.data[i+2]=((seed>>>17)&255)>127?236:8;id.data[i+3]=(seed>>>24)%6;}gc.putImageData(id,0,0);grainPattern=ctx.createPattern(g,'repeat');}
    ctx.fillStyle=grainPattern;ctx.fillRect(0,0,1000,view.height);
    const remaining=Math.max(0,state.phaseEndsAt-now())/1000;
    if(state.phase==='choose'&&remaining<=3&&!reducedMotion){ctx.strokeStyle=`rgba(191,116,78,${.18+.12*Math.sin(t*6.5)})`;ctx.lineWidth=5;ctx.strokeRect(2,2,996,view.height-4);}
    if(state.phase==='reveal'&&!reducedMotion){const e=(now()-state.phaseStartedAt)/1000;if(e<NIGHT_TIMING.anticipation){ctx.fillStyle=`rgba(10,17,31,${.12*Math.sin(e/NIGHT_TIMING.anticipation*Math.PI)})`;ctx.fillRect(0,0,1000,view.height);}}
  }
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    view.width=1000;view.height=r.height/r.width*1000;
    ctx.setTransform(canvas.width/1000,0,0,canvas.width/1000,0,0);
    const H=view.height,ys=H>850?[H*.445,H*.64,H*.835]:[H*.39,H*.607,H*.819];
    view.cells=Array.from({length:9},(_,i)=>{const row=Math.floor(i/3),col=i%3;return{x:500+(col-1)*[236,247,258][row],y:ys[row],s:[.92,1,1.055][row]};});
  }
  let previousPaint=0;
  function frame(ms){
    requestAnimationFrame(frame);
    if(!view.cells.length||screenName()==='result'||document.hidden||(reducedMotion&&ms-previousPaint<80)||(!reducedMotion&&ms-previousPaint<15))return;
    previousPaint=ms;const t=reducedMotion?0:ms/1000;
    ctx.clearRect(0,0,1000,view.height);drawBackground(t);
    // Tiny camera impulse on a pile-up, never on selection or pointer targeting.
    ctx.save();const e=(now()-state.phaseStartedAt)/1000;
    if(state.phase==='reveal'&&e>=NIGHT_TIMING.land&&e<NIGHT_TIMING.land+.23&&state.results.some(r=>r.collision)&&!reducedMotion){const strength=1-(e-NIGHT_TIMING.land)/.23;ctx.translate(Math.sin(e*83)*3.6*strength,Math.cos(e*67)*1.8*strength);}
    drawSelectedPath();for(let i=0;i<9;i++)drawCloud(i,t);drawPlayers(t);drawParticles();ctx.restore();drawAtmosphere(t);drawTimerAndBanner();
  }
