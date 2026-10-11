import time
"""Pixy store screenshots. Output: index.html.
App UI from appscreens.js (+ emotion-icons.js, real Hugeicons shapes). Serve folder over http."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
listings = json.load(open(os.path.join(HERE, "logos", "listings.json")))
NAMES = {"alternativeto.svg": "AlternativeTo", "github.svg": "GitHub", "apkpure.webp": "APKPure", "moodtrackers-org.png": "moodtrackers.org", "medevel.png": "MEDevel"}
ok = {l["logo"] for l in listings if l.get("confirmed") and l.get("logo")}
LOGOS = "".join(f'<span class="lg lgtxt">{n}</span>' for f, n in NAMES.items() if f in ok and f in ("alternativeto.svg", "moodtrackers-org.png", "medevel.png"))


def laurel(flip=False):
    """Laurel branch: thin curved stem, paired almond leaves shrinking to the tip."""
    import math
    def stem(t):  # quadratic bezier from bottom (40,94) via (2,58) to top (24,6)
        x = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 2 + t * t * 24
        y = (1 - t) ** 2 * 94 + 2 * (1 - t) * t * 58 + t * t * 6
        dx = 2 * (1 - t) * (2 - 40) + 2 * t * (24 - 2)
        dy = 2 * (1 - t) * (58 - 94) + 2 * t * (6 - 58)
        return x, y, math.degrees(math.atan2(dy, dx))
    leaf = "M0 0 C 6.5 -4 6.5 -14 0 -19 C -6.5 -14 -6.5 -4 0 0 Z"
    parts = ['<path d="M40 94 Q2 58 24 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>']
    n = 6
    for i in range(n):
        t = 0.08 + i * (0.86 / (n - 1))
        x, y, ang = stem(t)
        s = 1.0 - i * 0.08
        for side in (-1, 1):
            rot = ang + 90 + side * 48
            parts.append(f'<path d="{leaf}" transform="translate({x:.2f} {y:.2f}) rotate({rot:.1f}) scale({s:.2f})"/>')
    x, y, ang = stem(1.0)
    parts.append(f'<path d="{leaf}" transform="translate({x:.2f} {y:.2f}) rotate({ang + 90:.1f}) scale(0.8)"/>')
    tf = ' transform="scale(-1,1) translate(-48,0)"' if flip else ""
    return f'<svg width="44" height="82" viewBox="-10 -12 64 116" fill="#fff" shape-rendering="geometricPrecision"><g{tf}>{"".join(parts)}</g></svg>'



CSS = r"""
:root{--bg:#05392D;--cream:#FFF7ED;--mint:#34D399;--peach:#fdba74;--orange:#f97316;--fg:#16181d;--muted:#5f6570;--acc:#3a2fb0}
*{box-sizing:border-box}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}body{margin:0;font:14px/1.5 Geist,system-ui,sans-serif;color:var(--fg)}
main{max-width:2600px;margin:0 auto;padding:28px 28px 80px}h1{font-size:30px;letter-spacing:-.02em;margin:0 0 4px}p{margin:4px 0}.muted{color:var(--muted)}a{color:var(--acc)}
.warn{background:#fde4e4;border-radius:10px;padding:10px 14px;margin:12px 0}.warn ul{margin:4px 0 0 16px;padding:0}
.set{display:flex;gap:18px;overflow-x:auto;padding:10px 0 16px}.slot{flex:0 0 300px}.lab{font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.4}.lab b{color:var(--fg)}
.scr{width:300px;height:650px;border-radius:20px;background:var(--bg);color:var(--cream);position:relative;overflow:hidden;padding:34px 22px 0;display:flex;flex-direction:column;align-items:center}
.android-set .scr{height:600px}
.android-set .phA{width:248px;height:518px;border-radius:34px;padding:4px;background:linear-gradient(135deg,#3a3a3c,#1c1c1e 40%,#4a4a4c 70%,#2a2a2c)}
.android-set .phA .bz{border-radius:30px;padding:5px}.android-set .phA .sc{border-radius:25px}
.android-set .phA:before{display:none}.android-set .phA:after{right:-3px;top:110px;height:44px;background:#3a3a3c}
.android-set .ps,.android-set .pop,.android-set [style*="font-family:-apple-system"]{font-family:Roboto,system-ui !important}
.platform{display:flex;align-items:center;gap:10px;margin:36px 0 4px}.platform h2{margin:0;font-size:22px}
.scr.proof{padding:30px 22px 0}.scr.proof h4{font-size:32px;line-height:1.06}
.stats{align-self:stretch;display:flex;align-items:center;justify-content:center;margin-top:16px}.award{display:flex;align-items:center;gap:2px}.award svg{height:34px;width:auto}.award .mid{text-align:center;line-height:1.15}.award .mid b{display:block;font-size:13px;font-weight:600;opacity:.85;margin-top:3px}.award .rt{justify-content:center}
.stats .dl{display:flex;align-items:center;gap:2px}.stats .dl svg{height:46px;width:auto}.stats .dl div{text-align:center;line-height:1.05}.stats .dl b{font-size:19px;display:block}.stats .dl span{font-size:10.5px;opacity:.8}
.stats .div,.logos2 .div{width:1px;align-self:stretch;background:rgba(255,247,237,.22)}.stats .rt{display:flex;gap:6px;align-items:center;font-size:17px;font-weight:600}.stats .star{letter-spacing:1px;font-size:15px}
.pfade{position:absolute;z-index:5;left:0;right:0;top:490px;bottom:0;background:var(--bg)}
.qcard{position:absolute;z-index:6;left:16px;right:16px;top:480px;background:#1c1c1e;border:1px solid rgba(255,247,237,.14);border-radius:16px;padding:14px 16px;font-size:14px;font-weight:600;line-height:1.38;box-shadow:0 16px 30px rgba(0,0,0,.4)}
.qcard small{display:flex;gap:8px;align-items:center;font-size:12px;font-weight:500;opacity:.85;margin-top:10px}
.lbar{position:absolute;z-index:6;left:0;right:0;bottom:18px;text-align:center}.lo2{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin-bottom:6px}
.logos2{display:flex;justify-content:center;align-items:center;gap:7px;padding:0 10px}.logos2 .lg{padding:0;font-size:10px;gap:4px;white-space:nowrap}.logos2 .lg img{height:13px;width:13px}.logos2 .div{height:14px;align-self:center}
.scr.center{justify-content:center;padding-bottom:20px}.scr.dark{background:#0b0b0c;--cream:#FFF7ED}.scr.dark h4{font-weight:700}.scr.dark .subtle{text-align:left}.scr.dark .k,.scr.dark .sub{color:var(--mint)}
.k{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mint);margin-bottom:8px;text-align:center;display:flex;gap:6px;align-items:center}
.scr h4{margin:0;font-size:32px;line-height:1.06;font-weight:800;letter-spacing:-.03em;text-align:center}
.scr h4{white-space:nowrap}.scr h4.long{font-size:25px}.scr h4.xl{font-size:22px}.sub{font-size:17px;color:var(--mint);text-align:center;margin-top:12px;line-height:1.3}
.tag{position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;border-radius:5px;padding:2px 6px;z-index:9}
.tag.branch{background:#ffe08a;color:#3b2a00}.tag.flag{background:#c7c2ff;color:#1e1773}.tag.plan{background:var(--peach);color:#3b1d00}
.wreath{display:flex;align-items:center;gap:4px;margin-top:16px}.wreath div{text-align:center;line-height:1.1}.wreath b{font-size:26px;display:block;letter-spacing:-.01em}.wreath span{font-size:12px;opacity:.85}
.rate{display:flex;gap:6px;justify-content:center;margin-top:8px;font-size:12px;font-weight:600;white-space:nowrap}.star{color:var(--orange);letter-spacing:1px}
.quote{background:rgba(255,247,237,.08);border-radius:14px;padding:12px 14px;margin-top:14px;font-size:14.5px;font-weight:600;line-height:1.35;text-align:center}
.quote small{display:flex;gap:7px;align-items:center;justify-content:center;font-size:11.5px;font-weight:500;opacity:.85;margin-top:8px}
.lo{font-size:10.5px;opacity:.65;margin-top:28px;letter-spacing:.06em;text-transform:uppercase}
.logos{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;margin-top:8px}.lg{color:var(--cream);opacity:.78;height:24px;padding:0 6px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600}.lg img{height:16px;width:16px;object-fit:contain;border-radius:4px}.lg img.mono{filter:brightness(0) invert(1)}
.phA{position:absolute;left:50%;transform:translateX(-50%);width:252px;height:522px;border-radius:44px;padding:5px;background:linear-gradient(135deg,#d9d6d0,#8e8a83 30%,#e8e5df 55%,#7c786f 80%,#c9c5be);box-shadow:0 30px 50px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.35)}
.phA .bz{width:100%;height:100%;border-radius:39px;background:#000;padding:6px;overflow:hidden}
.phA .sc{width:230px;height:500px;border-radius:33px;overflow:hidden;position:relative}
.phA .sc .ps{transform:scale(.5722);transform-origin:0 0}
.phA:before,.phA:after{content:"";position:absolute;width:3px;border-radius:2px;background:#9a958d}.phA:before{left:-3px;top:110px;height:40px}.phA:after{right:-3px;top:140px;height:62px}
.pop{position:absolute;z-index:6;background:#fff;color:#111;border-radius:999px;padding:9px 15px 9px 11px;font:600 16px -apple-system,system-ui;display:flex;gap:8px;align-items:center;box-shadow:0 16px 30px rgba(0,0,0,.4)}
.pop.on{box-shadow:0 0 0 2.5px #0a7aff,0 16px 30px rgba(0,0,0,.4)}
.subtle svg{flex:0 0 26px}.subtle{margin-top:18px;display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.3;text-align:left;width:100%}
.subtle b{color:var(--cream);font-weight:700}.subtle span{opacity:.75}
.plist{margin-top:10px;width:100%;font-size:16px;font-weight:600}.plist div{display:flex;align-items:center;gap:14px;padding:11px 4px;border-bottom:1px solid rgba(255,255,255,.1)}.plist svg{width:26px;height:26px}
.popcard{position:absolute;z-index:6;filter:drop-shadow(0 16px 30px rgba(0,0,0,.4))}.popcard .ps{width:370px;height:auto;background:transparent;overflow:visible}
.biglock{width:66px;height:66px;border-radius:20px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.35);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.scr{align-items:flex-start}
.scr h4{text-align:left !important;font-weight:600 !important;align-self:flex-start}
.scr .sub{text-align:left !important;color:#fff !important;align-self:flex-start}
.scr .k{text-align:left;align-self:flex-start}
.pop:not(.on){border:1px solid rgba(0,0,0,.08);box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 1px 1px -0.5px rgba(0,0,0,0.06),0 3px 3px -1.5px rgba(0,0,0,0.06),0 16px 30px rgba(0,0,0,.4)}
.pop.on{box-shadow:0 0 0 2.5px #0a7aff,0 0 0 1px rgba(0,0,0,0.06),0 1px 1px -0.5px rgba(0,0,0,0.06),0 3px 3px -1.5px rgba(0,0,0,0.06),0 16px 30px rgba(0,0,0,.4)}
.popcard .card{border:1px solid rgba(0,0,0,.08) !important;box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 1px 1px -0.5px rgba(0,0,0,0.06),0 3px 3px -1.5px rgba(0,0,0,0.06),0 16px 30px rgba(0,0,0,.4)}
.tgcard{border:1px solid rgba(0,0,0,.08);box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 1px 1px -0.5px rgba(0,0,0,0.06),0 3px 3px -1.5px rgba(0,0,0,0.06),0 16px 30px rgba(0,0,0,.4) !important}
.scr{--fit:.86}.android-set .scr{--fit:.79}

.zoom{position:absolute;z-index:7;background:#fff;border-radius:22px;padding:14px 14px 8px;display:flex;flex-wrap:wrap;align-content:flex-start;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 0 0 6px rgba(255,255,255,.18),0 24px 44px rgba(0,0,0,.55);font-family:-apple-system,system-ui;color:#111}
.zoom .zl{flex-basis:100%;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8e;margin-bottom:8px;display:flex;gap:6px;align-items:center}
.zoom .zc{display:inline-flex;align-items:center;gap:6px;border:1px solid #dcdcdc;border-radius:999px;padding:6px 11px;font-size:15px;font-weight:500;margin:0 6px 7px 0;background:#fff}
.zoom .zc.on{border:2px solid #0a7aff}
.zoom .zc i{width:10px;height:10px;border-radius:50%}
.lgtxt{color:var(--cream);opacity:.78;font-size:11px;font-weight:600;white-space:nowrap}
"""

SVG_LOCK = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="rgba(52,211,153,.18)"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3" fill="#34d399"/></svg>'
FACEID = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M8.5 9v1.5M15.5 9v1.5M12 9v4h-1"/><path d="M8.5 15.5c1.8 1.6 5.2 1.6 7 0"/></svg>'
CK = '<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="#34d399" stroke-width="1.6"/><path d="M6.5 11.5l3 3L15.5 8" stroke="#34d399" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
PHONE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.7" stroke-linecap="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>'


def phone(screen, top, style="", args=""):
    return f'<div class="phA" style="top:{top}px;{style}"><div class="bz"><div class="sc" data-app="{screen}" data-args=\'{args}\'></div></div></div>'


def popcard(card, left, top, scale, rot=0):
    if isinstance(left, str):
        return f'<div class="popcard" data-card="{card}" style="right:{left[1:]}px;top:{top}px;transform:scale({scale}) rotate({rot}deg);transform-origin:100% 0"></div>'
    return f'<div class="popcard" data-card="{card}" style="left:{left}px;top:{top}px;transform:scale({scale}) rotate({rot}deg);transform-origin:0 0"></div>'


def _x(left):
    return f'right:{left[1:]}px' if isinstance(left, str) else f'left:{left}px'


def taggroup(title, tags, left, top):
    chips = "".join(f'<span style="display:inline-flex;align-items:center;gap:6px;border:{"1.5px solid #0a7aff" if on else "1px solid #dcdcdc"};border-radius:999px;padding:5px 11px;font-size:14px;margin:0 5px 6px 0;background:#fff"><i style="width:8px;height:8px;border-radius:50%;background:{c}"></i>{t}</span>' for t, c, on in tags)
    return f'<div class="tgcard" style="position:absolute;z-index:6;{_x(left)};top:{top}px;width:150px;background:#f4f4f4;color:#111;border-radius:16px;padding:10px 10px 4px;box-shadow:0 16px 30px rgba(0,0,0,.4);font-family:-apple-system,system-ui">{f'<div style="font-size:11px;font-weight:700;color:#8a8a8e;letter-spacing:.06em;text-transform:uppercase;margin-bottom:7px">{title}</div>' if title else ''}{chips}</div>'


def poptag(label, color, left, top, rot, cat=False):
    if cat:
        return f'<div class="pop" style="left:{left}px;top:{top}px;transform:rotate({rot}deg);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b70;padding:8px 14px">{label}</div>'
    return f'<div class="pop on" style="left:{left}px;top:{top}px;transform:rotate({rot}deg)"><i style="width:10px;height:10px;border-radius:50%;background:{color}"></i>{label}</div>'


def pop(key, left, top, rot, on=False):
    return f'<div class="pop{" on" if on else ""}" data-emo="{key}" style="{_x(left)};top:{top}px;transform:rotate({rot}deg)"></div>'


SLOTS = [
    ("<b>1 · Proof.</b> Left-aligned headline, downloads + rating row, calendar phone, review card over the phone, listed on at the bottom.", None, "proof", f"""
 <div class="k" style="align-self:flex-start">mood journal</div>
 <h4 style="text-align:left;align-self:flex-start;white-space:normal">Understand what makes you feel that way.</h4>
 <div class="stats"><div class="award">{laurel()}<div class="mid"><div class="rt"><span class="star">★★★★★</span></div><b>10,000+ downloads</b></div>{laurel(True)}</div></div>
 {phone('calendar', 244, 'transform:translateX(-50%) scale(0.85);transform-origin:50% 0;')}
 <div class="pfade"></div>
 <div class="qcard">“I am a mental health counselor and I love suggesting to my clients to use this for reflection.”<small><img src="photos/p-jenna.svg" width="22" height="22" style="border-radius:50%">Google Play User</small></div>
 <div class="lbar"><div class="lo2">Listed on</div><div class="logos2">{LOGOS.replace('</span><span class="lg lgtxt">', '</span><i class="div"></i><span class="lg lgtxt">')}</div></div>"""),
    ("<b>2 · Mood.</b> Logger mood slide behind, calendar in front and higher.", None, "", f"""
 <h4>Mood in<br>Pixels</h4><div class="sub">Your days turn into colors.</div>
 {phone('mood', 186, 'left:22%;transform:translateX(-50%) rotate(-5deg) scale(.68);transform-origin:50% 0;')}
 {phone('calendar', 150, 'left:78%;transform:translateX(-50%) rotate(5deg) scale(.68);transform-origin:50% 0;z-index:2;')}"""),
    ("<b>3 · Timeline.</b> Day 2 Oma hug + letter, day 1 Munich + puppy; day 2 popped out.", ("flag", "flag: calendar-timeline"), "", f"""
 <h4>Relive your<br>best days</h4><div class="sub">Every moment, photo and feeling in one timeline.</div>
 {phone('timeline2', 170, 'transform:translateX(-50%) scale(var(--fit));transform-origin:50% 0;')}"""),
    ("<b>4 · Emotions.</b> Logger emotions slide, Calm, Hopeful, Grateful, Anxious popped out.", None, "", f"""
 <h4>Name what<br>you feel.</h4><div class="sub">161 emotions, each explained.</div>
 {phone('emotions', 170, 'transform:translateX(-50%) scale(var(--fit));transform-origin:50% 0;')}
 <div class="zoom" style="left:22px;right:22px;top:420px"><div class="zl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a8a8e" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>Most felt</div><span class="zc" data-emo="happy"></span><span class="zc on" data-emo="calm"></span><span class="zc" data-emo="grateful"></span><span class="zc" data-emo="anxious"></span></div>"""),
    ("<b>5 · Tags.</b> Check-in tags, flat list (no categories), gray bg; popular tags popped out in gray cards.", None, "", f"""
 <h4>Tag what<br>matters</h4><div class="sub">Track what fills your days.</div>
 {phone('tags', 170, 'transform:translateX(-50%) scale(var(--fit));transform-origin:50% 0;')}
 <div class="zoom" style="left:22px;right:22px;top:420px"><div class="zl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a8a8e" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>Mental health</div><span class="zc on"><i style="background:#f59e0b"></i>Hyperfocus</span><span class="zc on"><i style="background:#8b5cf6"></i>Took meds</span><span class="zc"><i style="background:#8b5cf6"></i>Therapy</span><span class="zc"><i style="background:#f43f5e"></i>Social battery low</span></div>"""),
    ("<b>6 · People.</b> Check-in people step (3-column avatars + add tile); Add Person card popped out.", ("flag", "flag: people"), "", f"""
 <h4>Who makes<br>your day?</h4><div class="sub">Add the people in your life.</div>
 {phone('people', 170, 'transform:translateX(-50%) scale(var(--fit));transform-origin:50% 0;')}"""),
    ("<b>7 · Privacy.</b> Black, no lock icon, list mid-screen, on-device box at the bottom.", ("flag", "Face ID: flag app-lock"), "dark", f"""
 <h4 style="align-self:flex-start;text-align:left">Private by<br>design</h4><div class="sub" style="align-self:flex-start;text-align:left;color:#fff">We know it's hard to trust, but we truly care about your privacy.</div>
 <div class="plist" style="margin-top:32px"><div>{FACEID}Face ID lock</div><div>{CK}Stored on your device only</div><div>{CK}No account, no sign-up</div><div>{CK}No ads, no tracking of entries</div><div>{CK}Export your data anytime</div><div>{CK}Open source</div></div>
 {phone('lock', 360, 'transform:translateX(-50%) scale(0.72);transform-origin:50% 0;opacity:0.85;')}"""),
]

body = "".join(
    f'<div class="slot"><div class="scr {cls}">{h}</div><div class="lab">{lab.split("</b>")[0]}</b></div></div>'
    for lab, t, cls, h in SLOTS)


def to_android(html):
    """Android variant of the set: Play rating, biometric lock, no iOS widget."""
    out = html
    out = out.replace('Face ID lock', 'Fingerprint &amp; face unlock').replace('Face ID: flag app-lock', 'Biometric lock: flag app-lock')
    return out


android_body = to_android(body)

AGENTATION = """<div id="agentation-root"></div>
<script type="module">
import React from "https://esm.sh/react@18.3.1";
import {{ createRoot }} from "https://esm.sh/react-dom@18.3.1/client";
import {{ Agentation }} from "https://esm.sh/agentation@3.1.2?deps=react@18.3.1,react-dom@18.3.1";
createRoot(document.getElementById("agentation-root")).render(React.createElement(Agentation));
</script>""".replace("{{", "{").replace("}}", "}")

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pixy store screenshots</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>{CSS}</style></head><body><main>
<h1>Pixy store screenshots</h1>
<p class="muted">7 screens for the App Store and Google Play. Spec: <a href="app-screens.md">app-screens.md</a>. Rebuild: <code>python3 build.py</code>, then serve this folder (<code>python3 -m http.server</code>).</p>
<div class="platform"><h2>iPhone · App Store</h2></div>
<div class="set">{body}</div>
<div class="platform"><h2>Android · Google Play</h2></div>
<div class="set android-set">{android_body}</div></main>
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script><script src="emotion-icons.js?v={int(time.time())}"></script><script src="appscreens.js?v={int(time.time())}"></script><script>
document.head.insertAdjacentHTML('beforeend','<style>'+APP.css+'</style>');
document.querySelectorAll('[data-app]').forEach(el=>{{window.PIXY_OS=el.closest('.android-set')?'android':'ios';const a=(el.dataset.args||'').split(',').filter(Boolean);el.innerHTML=APP.render(el.dataset.app,a[0]||undefined,a[1]==='dark')}});window.PIXY_OS='ios';
document.querySelectorAll('[data-card]').forEach(el=>el.innerHTML='<div class="ps">'+APP.card(el.dataset.card)+'</div>');
document.querySelectorAll('[data-emo]').forEach(el=>el.innerHTML=APP.emo(el.dataset.emo,24)+APP.label(el.dataset.emo));APP.icons();
</script>{AGENTATION}</body></html>"""
open(os.path.join(HERE, "index.html"), "w").write(page)
open(os.path.join(HERE, "photos", "p-jenna.svg"), "w").write('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#fdba74"/><text x="20" y="26" font-family="system-ui" font-size="17" font-weight="700" text-anchor="middle" fill="#3b1d00">J</text></svg>')
print("wrote index.html")
