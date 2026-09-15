"""Offline Chromium UI checks. No remote navigation or production debug hooks.
Run after `node build.mjs`; requires Playwright and Chromium in the test environment.
"""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('QA_OUTPUT','/mnt/data/coinbattle-v51-qa'));out.mkdir(parents=True,exist_ok=True)
html=(root/'public/index.html').read_text()
fixture=json.loads(subprocess.check_output(['node',str(root/'tests/history-fixture.mjs')],text=True))
# The setter is injected into the in-memory test HTML only, never a shipped file.
hook="""window.__HISTORY_FIXTURE__=snapshot=>{mode='online';connection='connected';pausedAt=0;state=snapshot;render();resize();};\n"""
pos=html.rfind('})();');assert pos>=0
instrumented=html[:pos]+hook+html[pos:]
checks=[];errors=[]
def check(name,value):
    if not value: raise AssertionError(name)
    checks.append(name)
    print("PASS",name,flush=True)
def click(page,action):page.locator(f'[data-action="{action}"]:visible:enabled').first.click()
def inject(page,key):page.evaluate('(s)=>{s.phaseStartedAt=Date.now();s.phaseEndsAt=Date.now()+10000;window.__HISTORY_FIXTURE__(s)}',fixture[key]);page.wait_for_timeout(160)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    for width,height in [(320,720),(360,800),(390,844),(768,1024),(1024,900),(1440,1080)]:
        page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(instrumented);page.wait_for_function('window.__CLOUD_DEBUG__')
        check(f'{width}: no history or decorative headline on home',page.locator('.recent-choice').count()==0 and page.locator('h1').inner_text()=='구름 선택')
        inject(page,'first');check(f'{width}: R1 no observations',page.locator('.recent-choice').count()==0)
        inject(page,'second');check(f'{width}: R2 one per opponent',page.locator('.recent-choice').count()==3)
        inject(page,'third');check(f'{width}: R3 two per opponent',page.locator('.recent-choice').count()==6)
        check(f'{width}: no self history',page.locator('.is-me .recent-choices').count()==0)
        check(f'{width}: collision retains historical 6, not current 1 or gained 0',page.locator('.recent-choice[aria-label="2라운드, 가운데 구름, 당시 6코인, 겹침"]').count()==1)
        check(f'{width}: missed and collision have distinct words',page.locator('.history-outcome',has_text='미선택').count()==1 and page.locator('.history-outcome',has_text='겹침').count()>=1)
        check(f'{width}: each list is chronological',page.locator('.recent-choices').evaluate_all("xs=>xs.every(x=>[...x.children].map(e=>e.dataset.round).join(',')==='1,2')"))
        check(f'{width}: no page horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'{width}: all history tokens fit without clipping',page.locator('.recent-choice,.history-place,.history-outcome,.history-round,.history-coins').evaluate_all('xs=>xs.every(e=>e.scrollWidth<=e.clientWidth+1)'))
        check(f'{width}: exactly three enabled choices',page.locator('[data-action=select]:enabled').count()==3)
        check(f'{width}: current other destination stays private',page.evaluate("window.__CLOUD_DEBUG__.getState().players[2].selected===null"))
        check(f'{width}: no exposed fixture hook in production file','__HISTORY_FIXTURE__' not in html)
        if width in (320,390,1440):page.screenshot(path=str(out/f'history-{width}.png'),full_page=True)
        inject(page,'third');check(f'{width}: reconnect snapshot does not duplicate rows',page.locator('.recent-choice').count()==6)
        page.close()
    # Test real local bot play through two completed rounds, uninstrumented app.
    page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.__CLOUD_DEBUG__');click(page,'setup')
    check('Offline matching disabled, not faked',page.locator('[data-action=match]').is_disabled())
    page.locator('.alternate-modes summary').click();click(page,'kindSolo');click(page,'solo');click(page,'ready')
    for round_no in (1,2):
        page.wait_for_function(f'window.__CLOUD_DEBUG__.getState().phase==="choose"&&window.__CLOUD_DEBUG__.getState().round==={round_no}',timeout=20000)
        click(page,'select');click(page,'lock')
        page.wait_for_function('window.__CLOUD_DEBUG__.getState().phase==="reveal"',timeout=12000)
    page.wait_for_function('window.__CLOUD_DEBUG__.getState().phase==="choose"&&window.__CLOUD_DEBUG__.getState().round===3',timeout=16000)
    check('Real bot play R3 shows six historical records',page.locator('.recent-choice').count()==6)
    check('Real bot play preserves mixed roster labels',page.locator('.bot-tag').count()==3)
    click(page,'select');check('Real bot play selection still uses pressed state',page.locator('.pick-btn[aria-pressed=true]').count()==1)
    click(page,'menu');check('Menu contains no in-game complete-history control',page.locator('#dialog [data-action=history]').count()==0)
    page.close()
    # Complete all four original tutorial stages, uninstrumented app.
    page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.__CLOUD_DEBUG__');click(page,'tutorial')
    for step in (1,2):
        click(page,'select');page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext')
    buttons=page.locator('[data-action=select]:enabled');buttons.nth(0).click();buttons.nth(2).click();click(page,'lock')
    page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext');click(page,'lessonTimed');click(page,'select');click(page,'lock')
    page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext')
    check('Four tutorial stages still complete',page.locator('h1').inner_text()=='튜토리얼 완료')
    check('No historical roster added to tutorial',page.locator('#roster .recent-choice').count()==0)
    check('No JavaScript page exceptions',not errors)
    b.close()
report={'count':len(checks),'checks':checks,'errors':errors,'scope':'Local HTML only; static history fixtures plus unmodified actual solo/tutorial. HTTP/SSE tested separately using Node clients. No public-browser test.'}
(out/'browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'count':len(checks),'errors':errors},ensure_ascii=False))
