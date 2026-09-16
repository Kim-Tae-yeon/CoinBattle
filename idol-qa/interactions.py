import json
from playwright.sync_api import sync_playwright
from local_page import ROOT,html_for_test
checks=0
def ok(v,m):
 global checks
 assert v,m
 checks+=1
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':393,'height':704},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html_for_test());page.locator('#start-form button').click();page.locator('[data-route=vocal]').click();page.locator('[data-reveal]').click()
 n=page.evaluate('''()=>{const b=document.querySelector('[data-choice]');b.click();b.click();document.querySelector('[data-next]').click();return {n:IdolApp.getState().decisions,step:IdolApp.getState().step,particles:document.querySelectorAll('.fx-dot').length};}''')
 ok(n['n']==1 and n['step']=='report','double input prevented');ok(n['particles']==8,'motion burst emitted')
 page.wait_for_timeout(950);ok(page.locator('.fx-dot,.fx-number').count()==0,'particles cleaned up');ok(page.locator('.changes').is_visible(),'result persists')
 page.locator('[data-next]').click();ok(page.locator('blockquote').is_visible(),'proposal intro')
 page.locator('#auto').click();page.wait_for_timeout(3100);ok(page.evaluate('IdolApp.getState().decisions')>=2,'actual autoplay runs')
 page.locator('#auto').click();a=page.evaluate('IdolApp.getState()');page.wait_for_timeout(1100);ok(page.evaluate('IdolApp.getState()')==a,'autoplay stops')
 page.locator('#reset').click();page.locator('[data-cancel]').click();ok(page.evaluate('IdolApp.getState()')==a,'reset cancel safe')
 page.locator('[data-info=history]').click();ok(page.locator('#info').is_visible(),'history opens');page.keyboard.press('Escape');ok(page.locator('#info').is_hidden(),'Escape closes sheet')
 page.set_viewport_size({'width':704,'height':393});ok(page.locator('#rotate').is_visible(),'landscape blocked');page.set_viewport_size({'width':393,'height':704});ok(page.locator('#rotate').is_hidden(),'portrait restored')
 page.emulate_media(reduced_motion='reduce')
 page.evaluate("()=>{const s=ILR.newGame('<b>하린',9);ILR.start(s,'vocal');s.revealed=s.serial;IdolApp.load(s);}")
 ok('<b>하린' in page.locator('.season-head').inner_text(),'player name is text')
 n=page.evaluate("()=>{document.querySelector('[data-choice]').click();return document.querySelectorAll('.fx-dot,.fx-number').length;}")
 ok(n==0,'reduced motion disables particles');page.wait_for_timeout(100);ok(not errors,'no script errors')
 b.close()
(ROOT/'idol-qa/results/interactions.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local Chromium button handlers, double input, motion cleanup, actual autoplay start/stop, reset cancel, sheet Escape, orientation, reduced motion, HTML escaping.'},indent=2))
print('Interaction checks passed:',checks)
