#!/usr/bin/env python3
"""Calibre les partis français de Simu sur l'enquête d'experts CHES (Chapel Hill Expert Survey).

Usage :
    python3 tools/ches_calibrate.py CHES_2024_means.csv            # écrit data/fr-ches.js
    python3 tools/ches_calibrate.py CHES_2024_means.csv --check    # affiche seulement l'écart avec les estimations actuelles
    python3 tools/ches_calibrate.py fichier.csv --year 2024 --map tools/ches_party_map.json

Le fichier CSV est téléchargeable sur https://www.chesdata.eu (jeu « means »). Aucune dépendance externe.

Conventions d'échelle CHES (à VÉRIFIER avec le codebook de la vague utilisée, voir docs/CALIBRATION.md) :
  lrecon 0 gauche … 10 droite (marché)        -> eco   (0 = étatisme, 100 = libre marché)
  redistribution/spendvtax 0 pour … 10 contre -> fisc  (0 = forte redistribution, 100 = faible)
  sociallifestyle 0 libéral … 10 conservateur -> soc   (0 = conservateur, 100 = progressiste)
  civlib_laws 0 libertés … 10 ordre           -> lib   (0 = autoritaire, 100 = libertaire)
  eu_position 1 contre … 7 pour               -> eur   (0 = eurosceptique, 100 = fédéraliste)
  environment 0 protection … 10 croissance    -> env   (0 = productivisme, 100 = écologisme)
  immigrate_policy / multiculturalism 0 ouvert … 10 restrictif/assimilation -> imm (0 = fermeté, 100 = ouverture)
  nationalism 0 cosmopolite … 10 nationaliste -> nat   (0 = souverainiste, 100 = internationaliste)
  religious_principles 0 contre … 10 pour     -> laic  (indicatif : 0 = laïcité stricte, 100 = ouverte)
Axes non couverts par CHES (dem, jus, tech) : conservés depuis data/fr.js (estimations programmatiques).
"""
import argparse, csv, json, os, sys, unicodedata

AXES = ['eco', 'soc', 'lib', 'nat', 'eur', 'env', 'imm', 'dem', 'laic', 'jus', 'fisc', 'tech']
# (axe, [(colonne CHES, fonction de conversion 0..10 / 1..7 -> 0..100)])
inv10 = lambda x: 100 - x * 10
dir10 = lambda x: x * 10
MAPPING = {
    'eco':  [('lrecon', dir10), ('econ_interven', dir10)],
    'fisc': [('redistribution', dir10), ('spendvtax', dir10)],
    'soc':  [('sociallifestyle', inv10)],
    'lib':  [('civlib_laws', inv10)],
    'eur':  [('eu_position', lambda x: (x - 1) / 6 * 100)],
    'env':  [('environment', inv10)],
    'imm':  [('immigrate_policy', inv10), ('multiculturalism', inv10)],
    'nat':  [('nationalism', inv10)],
    'laic': [('religious_principles', dir10)],
}
# Correspondance sigle CHES -> code Simu (étendre avec --map si besoin)
DEFAULT_MAP = {
    'LFI': 'LFI', 'FI': 'LFI', 'PCF': 'PCF', 'PS': 'PS', 'EELV': 'LÉ', 'EE': 'LÉ', 'LE': 'LÉ',
    'LREM': 'RE', 'REM': 'RE', 'RE': 'RE', 'EPR': 'RE', 'MODEM': 'MD', 'MD': 'MD', 'HOR': 'HOR', 'H': 'HOR',
    'LR': 'LR', 'UDI': 'UDI', 'RN': 'RN', 'FN': 'RN', 'REC': 'REC', 'R!': 'REC', 'DLF': 'DLF',
    'LO': 'LO', 'NPA': 'NPAR', 'PP': 'PP', 'GE': 'GE', 'LP': 'LP', 'UPR': 'UPR', 'VOLT': 'VOLT',
}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper().strip()
    return s

def num(x):
    try:
        v = float(str(x).replace(',', '.'))
        return None if v != v or v < 0 else v
    except ValueError:
        return None

def is_france(row):
    for k in ('country', 'cname', 'country_name', 'cntry'):
        if k in row and norm(row[k]) in ('FRA', 'FRANCE', 'FR', '6'):
            return True
    return False

def convert(row):
    out = {}
    for axis, cols in MAPPING.items():
        vals = [conv(v) for col, conv in cols if (v := num(row.get(col))) is not None]
        if vals:
            out[axis] = round(max(0, min(100, sum(vals) / len(vals))), 1)
    return out

def load_simu_current(root):
    """Lit les vecteurs actuels (estimations) via node, pour l'écart --check."""
    import subprocess
    js = ("global.window=global;require('%s/data/axes.js');require('%s/data/fr.js');"
          "const o={};COUNTRIES.fr.parties.forEach(p=>o[p.code]=p.v);console.log(JSON.stringify(o))") % (root, root)
    try:
        return json.loads(subprocess.check_output(['node', '-e', js], text=True))
    except Exception:
        return {}

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv'); ap.add_argument('--year', type=int); ap.add_argument('--map'); ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    pmap = dict(DEFAULT_MAP)
    if a.map:
        pmap.update({norm(k): v for k, v in json.load(open(a.map, encoding='utf-8')).items()})
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rows = list(csv.DictReader(open(a.csv, encoding='utf-8-sig', errors='replace')))
    if not rows: sys.exit('CSV vide')
    fr = [r for r in rows if is_france(r)]
    if a.year:
        fr = [r for r in fr if str(r.get('year', a.year)) == str(a.year)]
    if not fr: sys.exit('Aucune ligne « France » trouvée (colonnes country/cname ?). Colonnes : ' + ', '.join(rows[0].keys()))
    if not a.year and 'year' in fr[0]:       # garde l'année la plus récente par parti
        latest = {}
        for r in fr:
            k = norm(r.get('party', r.get('party_name', '')))
            if k not in latest or str(r['year']) > str(latest[k]['year']): latest[k] = r
        fr = list(latest.values())
    result, unmatched = {}, []
    for r in fr:
        name = r.get('party') or r.get('party_name') or ''
        code = pmap.get(norm(name)) or pmap.get(norm(r.get('party_name', '')))
        if not code: unmatched.append(name); continue
        vals = convert(r)
        if vals: result[code] = vals
    cur = load_simu_current(root)
    print(f'{len(result)} partis calibrés ; sans correspondance : {sorted(set(unmatched)) or "aucun"}')
    for code, vals in sorted(result.items()):
        diff = []
        for ax, v in vals.items():
            c = cur.get(code, [None] * 12)[AXES.index(ax)]
            diff.append(f'{ax} {c if c is not None else "?"}→{round(v)}')
        print(f'  {code:5s} ' + '  '.join(diff))
    if a.check:
        return
    path = os.path.join(root, 'data', 'fr-ches.js')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('/* Généré par tools/ches_calibrate.py — ne pas éditer à la main. */\n')
        f.write('window.CHES_FR = ' + json.dumps(result, ensure_ascii=False, indent=1) + ';\n')
    print('écrit', path)

if __name__ == '__main__':
    main()
