"""Local Chromium UI regression. Does not navigate to or change the public service."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('QA_OUTPUT','/mnt/data/coinbattle-score-qa'));out.mkdir(parents=True,exist_ok=True)
html=(root/'public/index.html').read_text()
fixture=json.loads(subprocess.check_output(['node',str(root/'tests/score-only-fixture.mjs')],text=True))
hook="window.__SCORE_FIXTURE__=snapshot=>{mode='online';connection='connected';pausedAt=0;state=snapshot;render();resize();};\n"
pos=html.rfind('})();');assert pos>=0
instrumented=html[:pos]+hook+html[pos:]
checks=[];errors=[]
def check(label,ok):
    assert ok,label
    checks.append(label);print('PASS',label,flush=True)
def click(page,action):page.locator(f'[data-action="{action}"]:visible:enabled').first.click()
def inject(page,key):
    page.evaluate('(s)=>{s.phaseStartedAt=Date.now();s.phaseEndsAt=Date.now()+10000;window.__SCORE_FIXTURE__(s)}',fixture[key]);page.wait_for_timeout(150)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    for width,height in [(320,720),(360,800),(390,844),(768,1024),(1024,900),(1440,1080)]:
        page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(instrumented);page.wait_for_function('window.__CLOUD_DEBUG__')
        check(f'{width}: home preserved',page.locator('h1').inner_text()=='구름 선택')
        for key in ['first','second','third']:
            inject(page,key)
            check(f'{width}/{key}: no opponent or self history UI',page.locator('.recent-choice,.recent-choices,.previous-choice').count()==0)
            check(f'{width}/{key}: four total coin values',page.locator('#roster .player-score').count()==4)
        check(f'{width}: no opponent per-round status',page.locator('#roster .player-row:not(.is-me) .player-status').count()==0)
        expected=[x['score'] for x in fixture['third']['players']]
        check(f'{width}: accurate cumulative scores',page.locator('#roster .player-score span:not(.mini-coin)').all_text_contents()==list(map(str,expected)))
        check(f'{width}: no horizontal scroll',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'{width}: score numbers fit',page.locator('#roster .player-score').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
        check(f'{width}: three enabled choices',page.locator('[data-action=select]:enabled').count()==3)
        check(f'{width}: current choices remain private',page.evaluate('window.__CLOUD_DEBUG__.getState().players.slice(1).every(p=>p.selected===null&&!p.locked)'))
        check(f'{width}: API fixture history is personal',page.evaluate('window.__CLOUD_DEBUG__.getState().history.every(h=>h.results.every(r=>r.id==="p0"))'))
        if width in [320,390,1440]:page.screenshot(path=str(out/f'score-only-{width}.png'),full_page=True)
        inject(page,'ownLocked')
        check(f'{width}: own confirmation remains',page.locator('#choiceBar').inner_text().find('선택 확정됨')>=0)
        check(f'{width}: no ready count during selection','명 확정' not in page.locator('#choiceBar').inner_text())
        page.close()
    # Run real solo game rather than only fixtures.
    page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.__CLOUD_DEBUG__');click(page,'setup')
    check('Offline matchmaking is not fabricated',page.locator('[data-action=match]').is_disabled())
    page.locator('.alternate-modes summary').click();click(page,'kindSolo');click(page,'solo');click(page,'ready')
    for n in [1,2]:
        page.wait_for_function(f'window.__CLOUD_DEBUG__.getState().phase==="choose"&&window.__CLOUD_DEBUG__.getState().round==={n}',timeout=25000)
        click(page,'select');click(page,'lock')
        page.wait_for_function('window.__CLOUD_DEBUG__.getState().phase==="reveal"',timeout=15000)
        check(f'Real R{n} simultaneous reveal preserved',len(page.evaluate('window.__CLOUD_DEBUG__.getState().results'))==4)
    page.wait_for_function('window.__CLOUD_DEBUG__.getState().phase==="choose"&&window.__CLOUD_DEBUG__.getState().round===3',timeout=18000)
    check('Real R3 no history display',page.locator('.recent-choice,.recent-choices,.previous-choice').count()==0)
    check('Bots still labelled',page.locator('#roster .bot-tag').count()==3)
    check('Real R3 opponents show totals only',page.locator('#roster .player-row:not(.is-me) .player-status').count()==0)
    click(page,'select');check('Selection keeps bright pressed state',page.locator('.pick-btn[aria-pressed=true]').count()==1)
    click(page,'menu');check('No in-game history menu',page.locator('#dialog [data-action=history]').count()==0)
    page.close()
    page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.__CLOUD_DEBUG__');click(page,'tutorial')
    for _ in [1,2]:
        click(page,'select');page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext')
    buttons=page.locator('[data-action=select]:enabled');buttons.nth(0).click();buttons.nth(2).click();click(page,'lock')
    page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext');click(page,'lessonTimed');click(page,'select');click(page,'lock')
    page.locator('[data-action=lessonNext]:enabled').wait_for();click(page,'lessonNext')
    check('All four tutorial stages complete',page.locator('h1').inner_text()=='튜토리얼 완료')
    check('No shipped fixture hook','__SCORE_FIXTURE__' not in html)
    check('No JavaScript exceptions',not errors)
    b.close()
report={'count':len(checks),'checks':checks,'errors':errors,'scope':'Local HTML rendering at 320-1440px, injected Room snapshots and uninstrumented solo/tutorial. HTTP/SSE covered separately by Node tests. No public-browser test.'}
(out/'browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'count':len(checks),'errors':errors}))
