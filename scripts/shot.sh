#!/bin/sh
# Capture frames of the built walkthrough without a server: scripts/shot.sh <out folder> <vh> [<vh> ...]
# Needs `npx vite build --base=./` first. Uses headless Chrome with software WebGL.
OUT="$1"; shift
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
for p in "$@"; do
  for try in 1 2 3 4 5 6; do # headless Chrome sometimes ends before the page has drawn; ask again
    "$CH" --headless=new --allow-file-access-from-files --enable-unsafe-swiftshader --window-size=1280,720 --virtual-time-budget=8000       --dump-dom "file:///D:/scrollstory-world/dist/index.html?at=$p" 2>/dev/null |
      python -c "import sys,re,base64;d=sys.stdin.read();m=re.search(r'<textarea id=\"shot\"[^>]*>data:image/jpeg;base64,([^<]+)',d);m and open(sys.argv[1],'wb').write(base64.b64decode(m.group(1)));sys.exit(0 if m else 1)" "$OUT/p$p.jpg" && break
    [ "$try" = 6 ] && echo "no frame for $p"
  done
done
