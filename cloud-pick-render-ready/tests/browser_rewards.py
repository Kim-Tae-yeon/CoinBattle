"""Offline UI regression: Python Playwright + installed Chromium. Build first.

Uses the unchanged standalone HTML in about:blank with a controlled clock.
This is not an online-browser connectivity test; npm test covers real HTTP/SSE.
Set CHROMIUM_PATH when using a system browser, or install Playwright Chromium.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('BROWSER_REPORT_DIR', str(ROOT/'tests/reports/early-rewards')))
OUT.mkdir(parents=True, exist_ok=True)
html=(ROOT/'public/index.html').read_text()
report={'environment':'Chromium about:blank + unmodified built HTML; native localhost navigation blocked by administrator. Network protocol tested separately by Node HTTP/SSE tests.','checks':[]}
def check(name,value):
 assert value,name
 report['checks'].append(name)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'],headless=True)
 for width,height,label in [(1360,1100,'desktop'),(390,844,'mobile'),(320,780,'narrow')]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.clock.install()
  page.set_content(html,wait_until='load')
  page.clock.run_for(100)
  check(label+' boot',page.evaluate('window.__CLOUD_DEBUG__.getMode()')=='home')
  page.locator('[data-action="setup"]').click()
  page.locator('summary').filter(has_text='다른 방식으로 플레이').click()
  page.locator('[data-action="kindSolo"]').click()
  check(label+' default10', '10라운드' in page.locator('body').inner_text())
  page.locator('[data-action="solo"]').click()
  for round_number in range(1,4):
   page.clock.fast_forward(3100)
   state=page.evaluate('__CLOUD_DEBUG__.getState()')
   check(label+f' R{round_number} choose',state['phase']=='choose' and state['round']==round_number)
   check(label+f' R{round_number} rewards',sorted(x for x in state['board'] if x)>=[1] and sorted(x for x in state['board'] if x)==([1,1,2,2,4] if round_number<3 else [1,2,3,5,6]))
   if round_number==3:
    check(label+' accessible amounts','6코인' in page.locator('#gameCanvas').get_attribute('aria-label') and '5코인' in page.locator('#gameCanvas').get_attribute('aria-label'))
    check(label+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    # Use the normal pointer control, not a mutation of the debug view.
    page.locator('.pick-btn').last.click()
    check(label+' selection marked',page.locator('.pick-btn[aria-pressed="true"]').count()==1)
    page.clock.run_for(250)
    check(label+' canvas painted',page.evaluate("document.querySelector('#gameCanvas').getContext('2d').getImageData(10,10,1,1).data[3] > 0"))
    page.screenshot(path=str(OUT/f'{label}-r3.png'),full_page=False)
    break
   page.locator('.pick-btn').first.click();page.locator('[data-action="lock"]').click()
   page.clock.fast_forward(7000)
   state=page.evaluate('__CLOUD_DEBUG__.getState()')
   check(label+f' R{round_number} reveals',state['phase']=='reveal')
   page.clock.fast_forward(7100)
  check(label+' no JS errors',not errors)
  page.close()
 # Complete all four tutorial lessons using only normal UI controls.
 page=browser.new_page(viewport={'width':390,'height':844})
 page.clock.install();page.set_content(html,wait_until='load');page.clock.run_for(100)
 page.locator('[data-action="tutorial"]').click()
 for step in [1,2]:
  page.locator('.pick-btn:enabled').click();page.clock.fast_forward(1400)
  result=page.evaluate('__CLOUD_DEBUG__.getState().results.find(r=>r.id==="you")')
  check('tutorial '+str(step),result['gain']==(2 if step==1 else 0))
  page.locator('[data-action="lessonNext"]').click()
 page.locator('.pick-btn').first.click();page.locator('.pick-btn').last.click()
 page.locator('[data-action="lock"]').click();page.clock.fast_forward(1400)
 page.locator('[data-action="lessonNext"]').click()
 page.locator('[data-action="lessonTimed"]').click();page.locator('.pick-btn').first.click()
 page.clock.fast_forward(10100);page.clock.fast_forward(1400)
 page.locator('[data-action="lessonNext"]').click()
 check('tutorial completion says10','10라운드' in page.locator('body').inner_text())
 page.locator('[data-action="learnSolo"]').click()
 for n in range(1,11):
  page.clock.fast_forward(3100)
  s=page.evaluate('__CLOUD_DEBUG__.getState()')
  check('full solo round '+str(n),s['phase']=='choose' and s['round']==n)
  page.locator('.pick-btn').first.click();page.locator('[data-action="lock"]').click()
  page.clock.fast_forward(7000);page.clock.fast_forward(7100)
 s=page.evaluate('__CLOUD_DEBUG__.getState()')
 check('solo completed10',s['phase']=='finished' and len(s['history'])==10)
 for player in s['players']:
  check('solo total '+player['id'],player['score']==sum(next(r['gain'] for r in h['results'] if r['id']==player['id']) for h in s['history']))
 page.locator('[data-action="start"]').click()
 check('solo rematch resets',page.evaluate('__CLOUD_DEBUG__.getState().round')==1)
 page.close()
 browser.close()
(OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
