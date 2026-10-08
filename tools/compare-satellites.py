# compares the branches found by tools/satellite-hunt.mjs with the satellites of Jankovic et al. (data/cpc-converted.json):
# distance of every satellite (T*, L*) from the (T*, L*) curve of every branch arm. arms are cut where the closure error passes 1e-7.
# python tools/compare-satellites.py   (reads data/satellite-results2.jsonl)
import json, math
cpc=[(c['N'],c['k'],c['ts_theirs'],c['ls_theirs']) for c in json.load(open('data/cpc-converted.json'))]
rs=[json.loads(l) for l in open(__import__('sys').argv[1] if len(__import__('sys').argv) > 1 else 'data/satellite-results2.jsonl')]
def segdist(p,a,b):
    ax,ay=a[0]/p[0],a[1]/p[1]; bx,by=b[0]/p[0],b[1]/p[1]
    dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
    t=0 if L==0 else max(0,min(1,((1-ax)*dx+(1-ay)*dy)/L))
    return math.hypot(ax+t*dx-1,ay+t*dy-1)
arms=[]
for r in rs:
    j=r['job']
    for b in r['branches']:
        if not b['ok'] or len(b['curve'])<3: continue
        c=[]
        for p in b['curve']:
            if p[3]>1e-7: break
            c.append((p[1],p[2],p[3],p[0]))
        if len(c)<3: continue
        # distance to every CPC satellite (same k first)
        res=[]
        for N,k,ts,ls in cpc:
            d=min(segdist((ts,ls),c[i],c[i+1]) for i in range(len(c)-1))
            res.append((d,N,k))
        res.sort()
        T=[p[0] for p in c]; Lx=[p[1] for p in c]
        inwin=[(N,k) for N,k,ts,ls in cpc if min(T)<=ts<=max(T) and min(Lx)<=ls<=max(Lx)]
        arms.append(dict(orbit=j['orbit'],k=j['k'],lamBP=b['lamBP'],sgn=b['sgn'],pts=len(c),total=len(b['curve']),Trange=(min(T),max(T)),Lrange=(min(Lx),max(Lx)),lam=(c[0][3],c[-1][3]),best=res[0],inwin=inwin,close=[x for x in res if x[0]<5e-3]))
print(len(arms),'arms with at least 3 good points')
for a in sorted(arms,key=lambda a:(a['orbit'],a['k'],a['lamBP'],a['sgn'])):
    print('orb',a['orbit'],'k',a['k'],'bp %.4f'%a['lamBP'],'sgn',a['sgn'],'pts %d/%d'%(a['pts'],a['total']),'T* %.2f..%.2f'%a['Trange'],'L* %.3f..%.3f'%a['Lrange'],'lam %.3f..%.3f'%a['lam'],'| best CPC dist %.4f N=%d k=%d'%a['best'],'| CPC inside window:',a['inwin'],'| close<5e-3:',[(N,k) for d,N,k in a['close']])
