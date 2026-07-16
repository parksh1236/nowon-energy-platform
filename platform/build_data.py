# -*- coding: utf-8 -*-
# 노원구 에너지 데이터 통합 스크립트
# 전기/가스/총괄표제부 JSON을 지번주소 기준으로 매칭해 data.json 생성
import json, glob, re, os

BASE = '/Users/psh/nowon1'

def norm_addr(a):
    """주소 정규화: '번지' 제거, 공백 정리"""
    if not a: return None
    a = a.replace('번지', '').strip()
    a = re.sub(r'\s+', ' ', a)
    return a

buildings = {}  # 정규화 주소 -> 건물 정보

def get(addr):
    if addr not in buildings:
        buildings[addr] = {
            'addr': addr, 'road': None, 'usage': None,
            'siar': None, 'bdar': None, 'gfa': None,
            'elec': {}, 'gas': {}
        }
    return buildings[addr]

# 1) 총괄표제부 (건물 용도/면적) — 폴더의 모든 표제부 파일 사용
for f in glob.glob(os.path.join(BASE, '02. 총괄표제부_*.json')):
    with open(f) as fp: pyo = json.load(fp)['Data']
    for r in pyo:
        a = norm_addr(r['PLOT_PSTN'])
        if not a: continue
        b = get(a)
        b['usage'] = r.get('MN_USG_CD_NM') or b['usage']
        b['siar'] = r.get('SIAR') or b['siar']
        b['bdar'] = r.get('BDAR') or b['bdar']
        b['gfa'] = r.get('GFA') or b['gfa']

# 2) 전기 사용량 (KWh)
for f in glob.glob(os.path.join(BASE, '01.전기에너지_*.json')):
    with open(f) as fp: rows = json.load(fp)['Data']
    for r in rows:
        a = norm_addr(r['PLOT_PSTN'])
        if not a: continue
        b = get(a)
        ym = r['USE_YM']
        b['elec'][ym] = b['elec'].get(ym, 0) + (r['USGQTY'] or 0)
        if r.get('ROAD_NM_PLOT_PSTN') and not b['road']:
            b['road'] = r['ROAD_NM_PLOT_PSTN'].strip()

# 3) 가스 사용량 (MJ 단위로 표기되는 경우가 많으나 원본 필드명 기준 사용량)
for f in glob.glob(os.path.join(BASE, '02. 가스에너지_*.json')):
    with open(f) as fp: rows = json.load(fp)['Data']
    for r in rows:
        a = norm_addr(r['PLOT_PSTN'])
        if not a: continue
        b = get(a)
        ym = r['USE_YM']
        b['gas'][ym] = b['gas'].get(ym, 0) + (r['USGQTY'] or 0)
        if r.get('ROAD_NM_PLOT_PSTN') and not b['road']:
            b['road'] = r['ROAD_NM_PLOT_PSTN'].strip()

# 매칭 통계
n_all = len(buildings)
n_usage = sum(1 for b in buildings.values() if b['usage'])
n_elec = sum(1 for b in buildings.values() if b['elec'])
n_gas = sum(1 for b in buildings.values() if b['gas'])
n_both = sum(1 for b in buildings.values() if b['elec'] and b['gas'])
n_energy_usage = sum(1 for b in buildings.values() if (b['elec'] or b['gas']) and b['usage'])
print(f'총 주소 {n_all} / 용도있음 {n_usage} / 전기 {n_elec} / 가스 {n_gas} / 둘다 {n_both} / 에너지+용도 {n_energy_usage}')

months = sorted({ym for b in buildings.values() for ym in list(b['elec'])+list(b['gas'])})
out = {'months': months, 'buildings': sorted(buildings.values(), key=lambda b: b['addr'])}
with open(os.path.join(BASE, 'platform', 'data.json'), 'w') as f:
    json.dump(out, f, ensure_ascii=False)
print('data.json 저장 완료, months=', months)
