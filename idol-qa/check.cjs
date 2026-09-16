'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'verified-041.html'),'utf8');
assert.ok(html.trim().endsWith('</html>'),'HTML must be complete');
const scripts=[...html.matchAll(/<script defer src="([^"?]+)/g)].map(m=>m[1]);
assert.equal(scripts.length,13,'bootstrap dependencies');
for(const p of scripts)new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p});
for(const m of html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g))assert.ok(fs.statSync(path.join(root,m[1])).size>0);
console.log('HTML complete; 13 JavaScript files parse; CSS files present.');
