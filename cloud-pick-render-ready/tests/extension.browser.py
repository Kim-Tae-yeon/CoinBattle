"""Rendering / local handler tests. Fake actions stay local; not a public browser test."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('QA_OUTPUT','/mnt/data/coinbattle-v6.0.0/qa-extension'));out.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node',str(root/'tests/extension-fixture.mjs')],text=True))
html=(root/'public/index.html').read_text()
hook="""window.__EXT_TEST__=s=>{mode='online';connection='connected';state=s;clockOffset=0;pausedAt=0;baitDraft=null;render();resize();};
window.__TEST_ACTIONS__=[];
action=async (actionName,extra)=>{window.__TEST_ACTIONS__.push({actionName,...extra});};
"""
pos=html.rfind('})();');assert pos>=0
instrumented=html[:pos]+hook+html[pos:]
checks=[];errors=[]
def check(label,condition):
    assert condition,label
    checks.append(label);print('PASS',label,flush=True)
def inject(page,key):
    page.evaluate('s=>{s.phaseStartedAt=Date.now();s.phaseEndsAt=Date.now()+(s.phase==="bait_reveal"?2000:s.phase==="choose"?10000:s.phase==="prepare"?20000:6000);s.serverNow=Date.now();if(s.rematch)s.rematch.endsAt=Date.now()+12000;window.__EXT_TEST__(s)}',fixture[key]);page.wait_for_timeout(140)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(320,800),(390,844),(768,1024),(1440,1080)]:
  page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(instrumented);page.wait_for_function('window.__CLOUD_DEBUG__')
  check(f'{width}: first screen has no expansion teaching',page.locator('[data-action=rematchVote]').count()==0)
  inject(page,'result')
  check(f'{width}: two clear rematch consent buttons',page.locator('[data-action=rematchVote]').count()==2)
  check(f'{width}: no default expansion consent',page.evaluate('window.__CLOUD_DEBUG__.getState().rematch.ownVote') is None)
  page.locator('[data-action=rematchVote][data-choice=bait]').click()
  check(f'{width}: consent submits match ID',page.evaluate('window.__TEST_ACTIONS__.at(-1).actionName==="rematch"&&window.__TEST_ACTIONS__.at(-1).choice==="bait"&&Number.isInteger(window.__TEST_ACTIONS__.at(-1).matchId)'))
  if width==390:page.screenshot(path=str(out/'rematch-mobile.png'),full_page=True)
  for key in ['prepare','input','confirmed','attributed','move']:
   inject(page,key)
   check(f'{width}/{key}: no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(f'{width}/{key}: scores only on opponent cards',page.locator('#roster .player-row:not(.is-me) .player-status').count()==(3 if key=='prepare' else 0))
   check(f'{width}/{key}: no historic opponent UI',page.locator('.recent-choice,.recent-choices,.previous-choice').count()==0)
   if key=='input':
    check(f'{width}: placement begins with no default',page.locator('[data-action=baitPick][aria-pressed=true]').count()==0)
    page.locator('[data-action=baitPick]').nth(1).click()
    check(f'{width}: draft is highlighted without sending',page.locator('[data-action=baitPick][aria-pressed=true]').count()==1)
    page.locator('[data-action=baitConfirm]').click()
    check(f'{width}: placement confirmation uses current round',page.evaluate('window.__TEST_ACTIONS__.at(-1).actionName==="bait"&&window.__TEST_ACTIONS__.at(-1).round===6&&window.__TEST_ACTIONS__.at(-1).cell===4'))
   if key=='confirmed':check(f'{width}: own confirmed placement waits privately','미끼 확정' in page.locator('#choiceBar').inner_text())
   if key=='attributed':
    check(f'{width}: attribution is shown only in reveal',page.locator('.bait-signals>span').count()==4)
    if width in (390,1440):page.screenshot(path=str(out/f'bait-reveal-{width}.png'),full_page=True)
   if key=='move':
    check(f'{width}: attribution disappears for movement',page.locator('.bait-signals').count()==0)
    check(f'{width}: exactly three movement controls',page.locator('[data-action=select]').count()==3)
    check(f'{width}: shared +1 bonus is in effective numbers',page.locator('[data-action=select][data-cell="4"] strong').inner_text()==str(fixture['move']['board'][4]))
    if width in (390,1440):page.screenshot(path=str(out/f'play-{width}.png'),full_page=True)
  page.close()
 check('Shipped HTML has no test action mock','__TEST_ACTIONS__' not in html)
 check('No JavaScript exceptions',not errors)
 b.close()
(out/'checks.json').write_text(json.dumps({'count':len(checks),'checks':checks,'errors':errors,'scope':'Injected genuine Room snapshots and local action mock. No public browser network used.'},ensure_ascii=False,indent=2))
print(json.dumps({'count':len(checks),'errors':errors}))
