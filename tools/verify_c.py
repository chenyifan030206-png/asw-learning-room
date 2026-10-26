"""Run on Linux/WSL. Tests the ZIP actually downloaded through the browser UI."""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess, zipfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--cmake', default='cmake')
parser.add_argument('--ctest', default='ctest')
args = parser.parse_args()
build = ROOT / '.test-build'
report = ROOT / 'reports/day09-v2'
report.mkdir(parents=True, exist_ok=True)
log = []

def run(cmd, *, cwd=None, input=None, expected=0):
    p = subprocess.run([str(x) for x in cmd], cwd=cwd or ROOT, input=input,
                       text=True, encoding='utf-8', capture_output=True)
    log.append('$ ' + ' '.join(str(x).replace(str(ROOT), '<repo>') for x in cmd)
               + ('\nstdin: ' + input.strip() if input else '')
               + '\n' + (p.stdout + p.stderr).replace(str(ROOT), '<repo>') + f'\nEXIT_CODE={p.returncode}\n')
    (report / 'c-tests.txt').write_text('\n'.join(log), encoding='utf-8')
    assert p.returncode == expected, log[-1]
    return p.stdout

def parse(text):
    result = {}
    for line in text.splitlines():
        if '=' not in line or line.startswith('TRACE='): continue
        k, v = line.split('=', 1)
        result[k] = [int(x) for x in v.split(',')] if ',' in v else float(v)
    return result

run(['gcc', '--version']);run([args.cmake, '--version']);run([args.ctest, '--version'])
zip_path = build / 'downloaded-project.zip'
dest = build / 'downloaded'
dest.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(zip_path) as z:
    for entry in z.infolist():
        target = (dest / entry.filename).resolve()
        assert target.is_relative_to(dest.resolve())
    z.extractall(dest)
source = next(p.parent for p in dest.rglob('timing.c'))
bundle = json.loads((ROOT / 'courses.json').read_text(encoding='utf-8'))
for a in bundle['lessons']['9']['assets']:
    assert (source / a['name']).read_text(encoding='utf-8') == a['text']
    assert (ROOT / 'examples/day09' / a['name']).read_text(encoding='utf-8') == a['text']
run(['gcc', '-std=c17', '-Wall', '-Wextra', '-Wpedantic', '-Wconversion', '-Werror',
     'demo.c', 'timing.c', '-o', 'timeline_demo', '-lm'], cwd=source)

# Instrument a COPY to log actual C variables; leave downloadable implementation unchanged.
original = (source / 'timing.c').read_text(encoding='utf-8')
instrumented = '#include <stdio.h>\n' + original.replace('int scheduled_ms = tick * 10;', 'int scheduled_ms = tick * 10;\n        int trace_last = last_control_ms;')
instrumented = instrumented.replace('            continue;', '''            printf("TRACE=%d,%d,1,-1,%d,-1,-1,0,0,%.9f,%.9f,%d,%d,%d\\n",
                tick,scheduled_ms,trace_last,(double)draft.fixed_distance_m,
                (double)draft.measured_distance_m,last_control_ms,draft.control_count,draft.control_count);
            continue;''')
instrumented = instrumented.replace('        ++draft.control_count;', '''        ++draft.control_count;
        printf("TRACE=%d,%d,0,%d,%d,%d,%d,%.9f,%.9f,%.9f,%.9f,%d,%d,%d\\n",
            tick,scheduled_ms,index,trace_last,now_ms,draft.dt_ms[index],
            (double)(index ? speed_mps * 0.010f : 0.0f),
            (double)(index ? speed_mps * ((float)draft.dt_ms[index] / 1000.0f) : 0.0f),
            (double)draft.fixed_distance_m,(double)draft.measured_distance_m,last_control_ms,index,draft.control_count);''')
(source / 'timing_trace.c').write_text(instrumented, encoding='utf-8')
run(['gcc', '-std=c17', '-Wall', '-Wextra', '-Wpedantic', '-Wconversion', '-Werror',
     'demo.c', 'timing_trace.c', '-o', 'timeline_trace', '-lm'], cwd=source)
fixtures = json.loads((build / 'browser-model.json').read_text(encoding='utf-8'))
comparisons = []
trace_keys = ['tick','planned_ms','skipped','index','last_before_ms','now_ms','dt_ms',
              'fixed_step_m','actual_step_m','fixed_total_m','actual_total_m',
              'last_after_ms','count_before','count_after']
for case in fixtures:
    stdin = ' '.join(str(v) for v in case['input']) + '\n'
    text = run([source / 'timeline_demo'], cwd=source, input=stdin)
    real = parse(text)
    for key, value in real.items():
        actual = case['result'][key]
        assert actual == value if isinstance(value, list) else abs(actual - value) < 0.000001, (key,actual,value)
    if case['result']['valid']:
        traced = run([source / 'timeline_trace'], cwd=source, input=stdin)
        rows = [dict(zip(trace_keys, map(float, l[6:].split(',')))) for l in traced.splitlines() if l.startswith('TRACE=')]
        assert len(rows) == 7
        for c, js in zip(rows,case['result']['trace']):
            for key in trace_keys:
                want = -1 if js[key] is None else js[key]
                assert abs(c[key] - want) < 0.000001, (case['input'],key,c[key],want)
    else:
        assert set(real) == {'status'}
    comparisons.append({'input':case['input'],'status':real['status'],'result_and_all_trace_fields':'PASS'})
run([source / 'timeline_demo'], cwd=source, input='bad -1 0\n', expected=1)
for name, appendix, count in [('main','OFF',1),('appendix','ON',2)]:
    out = build / ('cmake-' + name)
    run([args.cmake,'-S',source,'-B',out,'-DCMAKE_BUILD_TYPE=Release','-DBUILD_APPENDIX='+appendix])
    run([args.cmake,'--build',out])
    text = run([args.ctest,'--test-dir',out,'--output-on-failure','-V'])
    assert f'0 tests failed out of {count}' in text, text
    if name == 'main': assert 'checks_passed=12' in text
# Deliberately wrong dt must fail even under NDEBUG (the tests do not use assert).
mut = build / 'mutation';mut.mkdir(exist_ok=True)
for name in ['timing.h','test_timing.c']:shutil.copyfile(source/name,mut/name)
(mut/'timing.c').write_text(original.replace('now_ms - last_control_ms','10'),encoding='utf-8')
run(['gcc','-std=c17','-DNDEBUG','test_timing.c','timing.c','-o','wrong','-lm'],cwd=mut)
run([mut/'wrong'],cwd=mut,expected=2)
(report/'c-comparison.json').write_text(json.dumps({'compiler':'GCC (see c-tests.txt)','zip_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'cases':comparisons,'main_ctest':1,'appendix_ctest':2,'mutation_caught':True},indent=2)+'\n',encoding='utf-8')
print(f'C_TEST_PASS: {len(comparisons)} C/JS cases; 7 rows/all fields; CTest 1+2; mutation caught')
