#!/usr/bin/env python3
"""Revisa que un texto en español se lea fácil (sin IA). Uso: python3 legible.py archivo.txt | o por stdin.
Índice Fernández Huerta = 206.84 - 0.60*(sílabas por 100 palabras) - 1.02*(frases por 100 palabras)... versión usual: 206.84 - 60*(síl/pal) - 1.02*(pal/frase).
PASA: índice >= 70, ninguna frase > 25 palabras, cero palabras técnicas sin explicar."""
import re, sys, json
TEC = ["QA", "build", "commit", "merge", "deploy", "gzip", "kB", "MB", "fps", "FPS", "CPU", "API", "token", "tokens", "contexto", "subagente", "rig", "worktree", "branch", "rama", "master", "pipeline", "framework", "Phaser", "headless", "cache", "caché", "bug", "repo", "script", "prompt"]
def silabas(p):
    p = p.lower(); p = re.sub(r"[^a-záéíóúüñ]", "", p)
    if not p: return 0
    g = re.findall(r"[aeiouáéíóúü]+", p); n = 0
    for x in g:
        n += 1 + sum(1 for i in range(1, len(x)) if not (x[i-1] in "iuü" or x[i] in "iuü"))
    return max(1, n)
def revisar(t):
    t = re.sub(r"https?://\S+|\S+\.(com|mx)\S*", " ", t)
    frases = [f for f in re.split(r"[.!?¿¡:\n]+", t) if len(f.split()) > 0]
    pals = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", t)
    if not pals: return {"indice": 0, "pasa": False}
    ind = 206.84 - 60 * (sum(map(silabas, pals)) / len(pals)) - 1.02 * (len(pals) / max(1, len(frases)))
    largas = [f.strip()[:80] for f in frases if len(f.split()) > 25]
    tec = []
    for w in TEC:
        for m in re.finditer(r"\b" + re.escape(w) + r"\b", t):
            ventana = t[m.end():m.end() + 60]
            if not re.match(r"\s*[,(:]\s*(las|los|la|el|lo|que|o sea|es decir)", ventana): tec.append(w)
    return {"indice": round(ind), "palabras": len(pals), "frases": len(frases), "frases_largas": largas, "tecnicas_sin_explicar": sorted(set(tec)), "pasa": ind >= 70 and not largas and not tec}
if __name__ == "__main__":
    txt = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
    r = revisar(txt); print(json.dumps(r, ensure_ascii=False, indent=1)); sys.exit(0 if r["pasa"] else 1)
