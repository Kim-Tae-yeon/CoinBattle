from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
SCRIPTS=['boot','data','events-early','events-career','events-longrun','core','season','exam','story','view','panels','motion','app']
def html_for_test():
    # Equivalent of defer order: execute source files only after the DOM exists.
    html=(ROOT/'verified-041.html').read_text()
    html=re.sub(r'<script defer[^>]*></script>','',html)
    for css in ['base','play']:
        html=re.sub(r'<link rel="stylesheet" href="ilr/'+css+r'\.css\?v=041">',lambda m:'<style>'+(ROOT/'ilr'/f'{css}.css').read_text()+'</style>',html)
    inline='<script>globalThis.ILR_TEST=true;</script>'+''.join('<script>'+(ROOT/'ilr'/f'{f}.js').read_text()+'</script>' for f in SCRIPTS)
    return html.replace('</body>',inline+'</body>')
