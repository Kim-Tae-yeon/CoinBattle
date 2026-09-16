from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
from local_page import ROOT, html_for_test
checks=0
errors=[]
layouts=[]
def check(test,msg):
    global checks
    assert test,msg
    checks+=1
layout_js='''() => {
 const options=[...document.querySelectorAll('.option')];
 const bounds=options.map(o=>{const r=o.getBoundingClientRect();return {bottom:r.bottom,top:r.top,left:r.left,right:r.right,w:o.clientWidth,sw:o.scrollWidth,h:o.clientHeight,sh:o.scrollHeight,children:[...o.children].map(c=>{const b=c.getBoundingClientRect();return {top:b.top,bottom:b.bottom}})}});
 return {height:innerHeight,width:innerWidth,page:document.scrollingElement.scrollHeight,pageW:document.scrollingElement.scrollWidth,bounds};
}'''
def fits(page,label,count=3):
    d=page.evaluate(layout_js)
    check(len(d['bounds'])==count,label+' choice count')
    check(d['page']<=d['height']+1,label+' page scroll '+str(d))
    check(d['pageW']<=d['width']+1,label+' horizontal scroll')
    for b in d['bounds']:
        check(b['bottom']<=d['height']+1 and b['left']>=-1 and b['right']<=d['width']+1,label+' bounds')
        check(b['sh']<=b['h']+1 and b['sw']<=b['w']+1,label+' content overflow '+str(b))
        check(b['h']>=44,label+' tap height')
        check(all(c['top']>=b['top']-1 and c['bottom']<=b['bottom']+1 for c in b['children']),label+' child clipping')
    return d
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in json.loads(os.environ.get('SIZES','[[393,704]]')):
        ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce')
        page=ctx.new_page();page.on('pageerror',lambda er:errors.append(str(er)))
        page.set_content(html_for_test(),wait_until='load')
        print('start viewport',width,height,flush=True)
        check(page.locator('#fatal').is_hidden(),'boot error absent')
        for route in ['vocal','dance','audition','casting']:
            if page.locator('#start-form').count()==0:
                page.locator('#reset').click();page.locator('[data-confirm-reset]').click()
            page.locator('#player-name').fill('수아');page.locator('#start-form button').click()
            fits(page,str((width,height))+route+' routes',4)
            page.locator('[data-route='+route+']').click()
            check(page.locator('blockquote').is_visible(),'org intro visible')
            check(page.locator('[data-choice]').count()==0,'no surprise choices under dialogue')
            check('수아' in page.locator('blockquote').inner_text(),'name in dialogue')
            page.locator('[data-reveal]').click()
            fits(page,str((width,height))+route+' plan')
            before=page.evaluate('IdolApp.getState()')
            page.locator('[data-info=stats]').click();check(page.locator('#info').is_visible(),'stats opens')
            page.locator('#close-info').click();check(page.evaluate('IdolApp.getState()')==before,'information causes no reroll or time advance')
        count=page.evaluate('ILR.events.length')
        for index in range(count):
            page.evaluate('''idx=>{const ev=ILR.events[idx];const s=ILR.newGame('하린',14);ILR.start(s,'vocal');s.stage=ev.min;s.season=ev.minAge?(ev.minAge-13)*2:6;s.step='event';s.eventId=ev.id;s.eventCause='기획 교차검증';s.plan='v';s.fans=40;s.revealed=s.serial;IdolApp.load(s);}''',index)
            fits(page,f'{width}x{height} event {index}')
        for stage in [0,1,2]:
            for cond in [0,12,80]:
                page.evaluate('''x=>{const s=ILR.newGame('하린',22);ILR.start(s,'vocal');s.stage=x[0];s.cond=x[1];s.step='exam';ILR.startExam(s);s.revealed=s.serial;IdolApp.load(s);}''',[stage,cond])
                fits(page,f'{width}x{height} exam {stage}/{cond}')
        layouts.append({'width':width,'height':height,'eventLayouts':count,'routeFlows':4,'examLayouts':9})
        ctx.close()
        print('layout done',width,height,checks,flush=True)
    if os.environ.get('LAYOUT_ONLY'):
        (ROOT/('idol-qa/results/layout-'+os.environ.get('PART','1')+'.json')).write_text(json.dumps({'checks':checks,'errors':errors,'layouts':layouts}))
        browser.close()
        raise SystemExit(0)
    # Full lives using actual DOM button handlers; test AI reads only visible state/options.
    ctx=browser.new_context(viewport={'width':393,'height':704},is_mobile=True,has_touch=True,reduced_motion='reduce')
    page=ctx.new_page();page.on('pageerror',lambda er:errors.append(str(er)))
    page.set_content(html_for_test(),wait_until='load')
    page.evaluate('r=>globalThis.FLOW_ROUTE=r',os.environ.get('FLOW','vocal'))
    lives=page.evaluate('''async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=[];
      for(const route of [globalThis.FLOW_ROUTE||'vocal']){
       if(!document.querySelector('#start-form')){document.querySelector('#reset').click();document.querySelector('[data-confirm-reset]').click();}
       document.querySelector('#start-form').requestSubmit();document.querySelector('[data-route="'+route+'"]').click();let steps=0;
       while(IdolApp.getState().step!=='end'&&steps++<600){
        const s=IdolApp.getState();if(IdolApp.isBusy()){await sleep(65);continue;}
        if(s.step==='report')document.querySelector('[data-next]').click();
        else if(document.querySelector('[data-reveal]'))document.querySelector('[data-reveal]').click();
        else document.querySelector('[data-choice="'+ILR.autoChoice(s)+'"]').click();
       }
       const s=IdolApp.getState();out.push({route,steps,step:s.step,age:ILR.age(s),decisions:s.decisions,ending:s.ending});
      }return out;
    }''')
    for life in lives:check(life['step']=='end','full DOM life '+str(life))
    check(not errors,'JS errors '+str(errors))
    check(page.locator('#fatal').is_hidden(),'no fatal error')
    ctx.close();browser.close()
report={'checks':checks,'errors':errors,'layouts':layouts,'fullBrowserLives':lives,'environment':'Chromium local DOM with exact source files in defer-equivalent order. Network navigation blocked by container policy; not a public-device browser test.'}
(ROOT/('idol-qa/results/browser-'+os.environ.get('FLOW','vocal')+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
