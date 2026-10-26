"""Non-personal content contract; no writes or migration of user data."""
from pathlib import Path
import hashlib, json, subprocess
from build_day09_v2 import build, release
ROOT=Path(__file__).resolve().parent.parent
baseline='dd198f1bf26cc8f175f025319c6fb257fd86f4a7'
bundle=json.loads((ROOT/'courses.json').read_text(encoding='utf-8'))
old=json.loads(subprocess.check_output(['git','show',baseline+':courses.json'],cwd=ROOT))
for d in range(1,9):
    assert bundle['lessons'][str(d)]==old['lessons'][str(d)]
    assert bundle['rules'][str(d)]==old['rules'][str(d)]
assert bundle['curriculum']==old['curriculum']
lesson=bundle['lessons']['9']
files={a['name']:a['text'].splitlines() for a in lesson['assets']}
for s in lesson['code_sections']:
    assert 1<=s['start_line']<=s['focus_line']<=s['end_line']<=len(files[s['file']])
    assert files[s['file']][s['focus_line']-1]==s['expected']
for s in lesson['v2']['symbols']:
    for key in ['definition','use']:
        ref=s[key];assert files[ref['file']][ref['line']-1]==ref['expected']
assert len(lesson['run_fields'])==3 and len(bundle['rules']['9']['needed'])==4
assert lesson['v2']['legacy']==old['lessons']['9']
# Compare logical text because Windows Git checkout may use CRLF.
assert (ROOT/'cloud-sync.js').read_text(encoding='utf-8')==subprocess.check_output(['git','show',baseline+':cloud-sync.js'],cwd=ROOT).decode().replace('\r\n','\n')
snapshot={name:(ROOT/name).read_text(encoding='utf-8') for name in ['courses.json','index.html']}
build();release()
for name,text in snapshot.items():assert (ROOT/name).read_text(encoding='utf-8')==text, name+' is not reproducible'
print('CONTENT_STRUCTURE_PASS: D01-D08/rules/curriculum/cloud unchanged; 11 steps, 19 origins, 3 inputs, 4 cases; reproducible bundle')
print('REVIEW_REQUIRED: learner comprehension and ChatGPT content acceptance are not automated PASS')
