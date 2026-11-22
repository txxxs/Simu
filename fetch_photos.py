"""Télécharge la photo Wikipédia/Commons de chaque candidat + auteur et licence.
Usage: python3 fetch_photos.py  → assets/candidats/<id>.jpg et assets/candidats/credits.json"""
from PIL import Image
import json, subprocess, time, urllib.parse, os, re
C = {"arthaud":"Nathalie_Arthaud","melenchon":"Jean-Luc_Mélenchon","roussel":"Fabien_Roussel",
     "glucksmann":"Raphaël_Glucksmann","zemmour":"Éric_Zemmour","lepen":"Marine_Le_Pen",
     "villepin":"Dominique_de_Villepin","attal":"Gabriel_Attal","philippe":"Édouard_Philippe",
     "retailleau":"Bruno_Retailleau","lisnard":"David_Lisnard",
     "tondelier":"Marine_Tondelier","dupontaignan":"Nicolas_Dupont-Aignan"}
OUT = "assets/candidats"; os.makedirs(OUT, exist_ok=True)
def curl(u, out=None):
    for i in range(6):
        a = ["curl","-sL","-m","40","-A","simu-templates/1.0","-w","%{http_code}"]
        if out: a += ["-o", out]
        r = subprocess.run(a+[u], capture_output=True)
        body, code = (r.stdout[:-3], r.stdout[-3:].decode()) if not out else (b"", r.stdout.decode()[-3:])
        if code == "200": return body
        time.sleep(20*(i+1))
    raise RuntimeError(u+" "+code)
credits = json.load(open(OUT+"/credits.json")) if os.path.exists(OUT+"/credits.json") else {}
def save(): json.dump(credits, open(OUT+"/credits.json","w"), ensure_ascii=False, indent=1)
for k, t in C.items():
  try:
      if os.path.exists(f"{OUT}/{k}.jpg") and k in credits: continue
      d = json.loads(curl("https://fr.wikipedia.org/api/rest_v1/page/summary/"+urllib.parse.quote(t)))
      fname = urllib.parse.unquote(d["originalimage"]["source"].split("?")[0].split("/")[-1])
      time.sleep(2)
      orig = d["originalimage"]["source"].split("?")[0]
      pre, name = orig.rsplit("/", 1); pre = pre.replace("/commons/", "/commons/thumb/")
      try: curl(f"{pre}/{name}/960px-{name}", f"{OUT}/{k}_raw")   # miniature 960px (moins limitée)
      except Exception: curl(orig, f"{OUT}/{k}_raw")
      im = Image.open(f"{OUT}/{k}_raw").convert("RGB"); im.thumbnail((1400,1400)); im.save(f"{OUT}/{k}.jpg", quality=90)
      os.remove(f"{OUT}/{k}_raw")
      time.sleep(2)
      m = json.loads(curl("https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata&format=json&titles=File:"+urllib.parse.quote(fname)))
      em = list(m["query"]["pages"].values())[0]["imageinfo"][0]["extmetadata"]
      strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
      credits[k] = {"nom": d["title"], "fichier": fname, "auteur": strip(em.get("Artist",{}).get("value")),
                    "licence": strip(em.get("LicenseShortName",{}).get("value"))}
      print(k, credits[k]); save(); time.sleep(2)
  except Exception as e:
    print("ECHEC", k, e)
json.dump(credits, open(OUT+"/credits.json","w"), ensure_ascii=False, indent=1)
