import re, sys, io
sys.path.insert(0, './mascot')  # folder maskot (gen.py) dari titik-maskot.zip
import gen
from playwright.sync_api import sync_playwright
from PIL import Image

gen.V['jurkon_dot'] = gen.V['jurkon']   # kepala antena titik kuning (versi kecil untuk favicon)

def titik_inner(variant):
    s = gen.titik(variant, 'idle', animate=False)
    s = re.sub(r'^<svg[^>]*>', '', s); s = s.replace('</svg>', '')
    return s

def mark(variant, s, tx, ty):
    return f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.4f})">{titik_inner(variant)}</g>'

def page(w, h, body, bg='transparent', css=''):
    return (f'<html><head><style>*{{margin:0;box-sizing:border-box}}'
            f'body{{width:{w}px;height:{h}px;background:{bg};overflow:hidden;font-family:Inter,sans-serif;'
            f'-webkit-font-smoothing:antialiased}}{css}</style></head><body>{body}</body></html>')

# ---------- IKON ----------
def icon_html(size, scale, variant='jurkon', radius=0, cy=96, cx=100):
    tx = size/2 - cx*scale; ty = size/2 - cy*scale
    rx = radius
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
           f'<defs><radialGradient id="bgi" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#3a2f86"/>'
           f'<stop offset=".55" stop-color="#1f1a4d"/><stop offset="1" stop-color="#110f2b"/></radialGradient></defs>'
           f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#bgi)"/>'
           f'{mark(variant, scale, tx, ty)}</svg>')
    return page(size, size, svg)

# ---------- LOGO ----------
def lockup(w, h, mark_h, text_html, fg, sub=None, subc=None, bg='transparent', gap=44, size=100, tag_size=40,
           two_line=False, base=None, text_w=None):
    s = mark_h/190.0
    mw = 152*s
    # lebar teks diukur dulu di browser; di sini diberi lewat text_w
    total = mw + gap + text_w
    x0 = (w-total)/2
    tx = x0 - 24*s; ty = (h-mark_h)/2 - 4*s
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">{mark("jurkon", s, tx, ty)}</svg>'
    return svg, x0 + mw + gap

def measure(pw, html, css):
    pg = pw.new_page(viewport={'width': 2000, 'height': 600})
    pg.set_content(f'<html><head><style>*{{margin:0}}body{{font-family:Inter,sans-serif}}{css}</style></head><body>{html}</body></html>')
    w = pg.evaluate('document.getElementById("t").getBoundingClientRect().width')
    pg.close(); return w

LIGHT = dict(fg='#231f1c', sub='#6b6359', bg='#fbf9f4')
DARK  = dict(fg='#ece6dc', sub='#a79f94', bg='#1c1917')

def shot(pw, html, w, h, scale=1, transparent=False):
    pg = pw.new_page(viewport={'width': w, 'height': h}, device_scale_factor=scale)
    pg.set_content(html)
    pg.wait_for_timeout(150)
    png = pg.screenshot(omit_background=transparent, clip={'x':0,'y':0,'width':w,'height':h})
    pg.close()
    return Image.open(io.BytesIO(png))

def build():
    out = './assets/'
    with sync_playwright() as p:
        pw = p.chromium.launch()
        # --- ikon ---
        icons = {
          'icon-512.png': (512, 2.0, 'jurkon', 0),
          'icon-maskable-512.png': (512, 1.68, 'jurkon', 0),
        }
        for name, (size, sc, var, rad) in icons.items():
            im = shot(pw, icon_html(size, sc, var, rad), size, size).convert('RGB')
            im.save(out+'icons/'+name, optimize=True)
        big = shot(pw, icon_html(512, 2.0), 512, 512).convert('RGB')
        big.resize((192,192), Image.LANCZOS).save(out+'icons/icon-192.png', optimize=True)
        big.resize((180,180), Image.LANCZOS).save(out+'icons/apple-touch-icon.png', optimize=True)
        # favicon: kepala saja, sudut membulat
        fav = shot(pw, icon_html(256, 1.62, 'jurkon_dot', radius=56, cy=92, cx=100), 256, 256, transparent=True)
        fav.resize((32,32), Image.LANCZOS).save(out+'icons/favicon-32.png', optimize=True)

        # --- logo header (408x138, transparan) ---
        for tag, pal in (('', LIGHT), ('-gelap', DARK)):
            css = f'.t{{font-weight:800;font-size:44px;line-height:1.04;letter-spacing:-.025em;color:{pal["fg"]};white-space:nowrap}}'
            tw = measure(pw, '<div id="t" class="t" style="display:inline-block">Connection</div>', css)
            W, H = 408, 138
            s = 136/190.0; tx = (138-152*s)/2 - 24*s; ty = 1 - 4*s
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" style="position:absolute;left:0;top:0">{mark("jurkon", s, tx, ty)}</svg>'
            txt = f'<div class="t" style="position:absolute;left:148px;top:{(H-2*44*1.04)/2:.1f}px">Journal<br>Connection</div>'
            im = shot(pw, page(W, H, svg+txt, css=css), W, H, scale=3, transparent=True)
            im = im.resize((W, H), Image.LANCZOS)
            im.save(out+f'logo-header{tag}.webp', quality=95, method=6)
            print('header text width', tw)

        # --- logo utama 1200x600 ---
        for tag, pal in (('', LIGHT), ('-gelap', DARK)):
            css = (f'.a{{font-weight:800;font-size:100px;letter-spacing:-.03em;line-height:1;color:{pal["fg"]};white-space:nowrap}}'
                   f'.b{{font-weight:500;font-size:38px;letter-spacing:.24em;color:{pal["sub"]};white-space:nowrap;margin-top:22px;padding-left:6px}}')
            tw = measure(pw, '<div id="t" class="a" style="display:inline-block">Let’s Connect</div>', css)
            W, H = 1200, 600
            s = 400/190.0; mw = 152*s; gap = 46
            total = mw + gap + tw; x0 = (W-total)/2
            tx = x0 - 24*s; ty = (H-400)/2 - 4*s
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" style="position:absolute;left:0;top:0">{mark("jurkon", s, tx, ty)}</svg>'
            txt = (f'<div style="position:absolute;left:{x0+mw+gap:.1f}px;top:50%;transform:translateY(-52%)">'
                   f'<div class="a">Let’s Connect</div><div class="b">Jurnal Koneksi</div></div>')
            im = shot(pw, page(W, H, svg+txt, bg=pal['bg'], css=css), W, H, scale=2).convert('RGB').resize((W,H), Image.LANCZOS)
            im.save(out+f'logo{tag}.webp', quality=94, method=6)
            print('logo text width', tw, 'x0', x0)

        # --- OG 1200x630 ---
        pal = LIGHT
        css = f'.a{{font-weight:800;font-size:112px;letter-spacing:-.03em;line-height:1.02;color:{pal["fg"]};white-space:nowrap}}'
        tw = measure(pw, '<div id="t" class="a" style="display:inline-block">Connection</div>', css)
        W, H = 1200, 630
        s = 420/190.0; mw = 152*s; gap = 52
        total = mw + gap + tw; x0 = (W-total)/2
        tx = x0 - 24*s; ty = (H-420)/2 - 4*s
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" style="position:absolute;left:0;top:0">{mark("jurkon", s, tx, ty)}</svg>'
        txt = f'<div class="a" style="position:absolute;left:{x0+mw+gap:.1f}px;top:50%;transform:translateY(-50%)">Journal<br>Connection</div>'
        im = shot(pw, page(W, H, svg+txt, bg=pal['bg'], css=css), W, H, scale=2).convert('RGB').resize((W,H), Image.LANCZOS)
        im.save(out+'og.jpg', quality=92, optimize=True, subsampling=0)
        print('og text width', tw)
        pw.close()

if __name__ == '__main__':
    build()
