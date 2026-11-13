import json,re,os,subprocess,glob,sys  # VERIFY-01 row checker, run from the repository: python3 tools/verify01_legacy_rows.py evidence/verify01-legacy-rows.json
root=subprocess.check_output(['git','rev-parse','--show-toplevel']).decode().strip(); os.chdir(root)
d=json.load(open('docs/plan/legacy-task-map.json'))
ids={x['legacy_id'] for x in d['mappings'] if x['work_package']=='VERIFY-01'}
rows={}
for ln in open('docs/plan/archive/PLAN_TRACKER_2026-11-03.md',encoding='utf8'):
    if ln.startswith('|'):
        c=[x.strip() for x in ln.strip().strip('|').split(' | ')]
        if c and c[0] in ids: rows[c[0]]=c
print('rows found',len(rows),'of',len(ids),'missing',sorted(ids-set(rows))[:10])
src=''
files=[f for f in subprocess.check_output(['git','ls-files']).decode().split('\n') if f.startswith(('src/','tests/','tools/','public/'))]
blob={f:open(f,encoding='utf8',errors='ignore').read() for f in files if os.path.getsize(f)<3_000_000}
allsrc='\n'.join(blob.values())
tracked=set(subprocess.check_output(['git','ls-files']).decode().split('\n'))
base={os.path.basename(t) for t in tracked}
bad={}; stats={'paths':0,'symbols':0}
for i,c in rows.items():
    text=' '.join(c[1:])
    issues=[]
    for tok in re.findall(r'`([^`]+)`',text):
        for p in re.split(r'[,;]\s*',tok):
            p=p.strip()
            if re.match(r'^[\w./*-]+\.(ts|tsx|mjs|cjs|json|md|css|jpg|png|html|xlsx|py)$',p) or re.match(r'^(evidence|tests|src|docs|tools|public)/',p):
                stats['paths']+=1
                q=p.rstrip(',')
                if '*' in q:
                    if not glob.glob(q): issues.append('nopath:'+q)
                elif '<' in q: pass
                elif '/' not in q and q in base: pass
                elif q not in tracked and not os.path.exists(q): issues.append('nopath:'+q)
            elif re.match(r'^[A-Za-z_][\w]{3,}(\(\))?$',p) and not p.isupper():
                stats['symbols']+=1
                n=p.rstrip('()')
                if re.fullmatch(r'[0-9a-f]{7}',n):
                    if subprocess.run(['git','cat-file','-e',n],capture_output=True).returncode: issues.append('nocommit:'+n)
                elif n not in allsrc: issues.append('nosym:'+n)
    for m in re.findall(r'\b(tests/[\w./-]+\.ts)',text):
        pass
    if issues: bad[i]=issues
print(stats,'rows with unresolved refs',len(bad))
for i,v in bad.items(): print(i,v[:6])
json.dump({'checked':len(rows),'stats':stats,'unresolved':bad},open(sys.argv[1],'w'),indent=1)
