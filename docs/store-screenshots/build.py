import time
"""Pixy store screenshots, sky identity. Output: index.html.
App UI from appscreens.js (+ emotion-icons.js, real Hugeicons shapes). Serve folder over http.
Export one screen at store size: index.html?export=apple&n=1 or ?export=play&n=1 (see export.sh)."""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))


CSS = r"""
:root{--bg:#111;--cream:#fff;--mint:#fff;--peach:#fdba74;--orange:#f97316;--fg:#16181d;--muted:#5f6570;--acc:#3a2fb0}
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
.pfade{position:absolute;z-index:5;left:0;right:0;top:470px;bottom:0;background:var(--bg)}
.qcard{position:absolute;z-index:6;left:16px;right:16px;top:412px;background:#1c1c1e;border:1px solid rgba(255,247,237,.14);border-radius:16px;padding:14px 16px;font-size:14px;font-weight:600;line-height:1.38;box-shadow:0 16px 30px rgba(0,0,0,.4)}
.qcard small{display:flex;gap:8px;align-items:center;font-size:12px;font-weight:500;opacity:.85;margin-top:10px}
.lbar{position:absolute;z-index:6;left:0;right:0;bottom:18px;text-align:center}.lo2{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin-bottom:6px}
.logos2{display:flex;justify-content:center;align-items:center;gap:7px;padding:0 10px}.logos2 .lg{padding:0;font-size:10px;gap:4px;white-space:nowrap}.logos2 .lg img{height:13px;width:13px}.logos2 .div{height:14px;align-self:center}
.scr.center{justify-content:center;padding-bottom:20px}.scr.dark{background:#111;--cream:#fff}.scr.dark h4{font-weight:700}.scr.dark .subtle{text-align:left}.scr.dark .k,.scr.dark .sub{color:var(--mint)}
.k{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mint);margin-bottom:8px;text-align:center;display:flex;gap:6px;align-items:center}
.scr h4{margin:0;font-size:32px;line-height:1.06;font-weight:800;letter-spacing:-.03em;text-align:center}
.scr h4{white-space:nowrap}.scr h4.long{font-size:25px}.scr h4.xl{font-size:22px}.sub{font-size:14px;color:var(--mint);text-align:center;margin-top:10px;line-height:1.3}
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
.plist{margin-top:10px;width:100%;font-size:14.5px;font-weight:600}.plist div{display:flex;align-items:center;gap:11px;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,.1)}
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
.scr{--fit:.92}.android-set .scr{--fit:.83}

.zoom{position:absolute;z-index:7;background:#fff;border-radius:22px;padding:14px 14px 8px;display:flex;flex-wrap:wrap;align-content:flex-start;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 0 0 6px rgba(255,255,255,.18),0 24px 44px rgba(0,0,0,.55);font-family:-apple-system,system-ui;color:#111}
.zoom .zl{flex-basis:100%;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8e;margin-bottom:8px;display:flex;gap:6px;align-items:center}
.zoom .zc{display:inline-flex;align-items:center;gap:6px;border:1px solid #dcdcdc;border-radius:999px;padding:6px 11px;font-size:15px;font-weight:500;margin:0 6px 7px 0;background:#fff}
.zoom .zc.on{border:2px solid #0a7aff}
.zoom .zc i{width:10px;height:10px;border-radius:50%}
.lgtxt{color:var(--cream);opacity:.78;font-size:11px;font-weight:600;white-space:nowrap}
"""


SKY_CSS = r"""
/* Sky identity: website hero clouds (photos/sky.webp), ink type, white fade at the bottom. Privacy = night sky with moon. */
:root{--bg:#fff;--cream:#0a0a0a;--ink2:rgba(10,10,10,.66);--sky-shadow:0 0 0 1px rgba(10,40,90,.06),0 1px 1px -0.5px rgba(10,40,90,.06),0 3px 3px -1.5px rgba(10,40,90,.06),0 18px 36px rgba(20,60,120,.22)}
.scr{background:linear-gradient(180deg,rgba(255,255,255,0) 18%,rgba(255,255,255,.78) 70%,#fff 100%),url(photos/sky.webp) var(--sx,50%) 0/auto 100% no-repeat,#bcdcff;box-shadow:0 0 0 1px rgba(10,40,90,.08)}
.set .slot:nth-child(1) .scr{--sx:30%}.set .slot:nth-child(2) .scr{--sx:48%}.set .slot:nth-child(3) .scr{--sx:12%}.set .slot:nth-child(4) .scr{--sx:70%}.set .slot:nth-child(5) .scr{--sx:90%}.set .slot:nth-child(6) .scr{--sx:20%}.set .slot:nth-child(7) .scr{--sx:60%}
/* Privacy: night sky with moon, same airy depth as the day sky */
.scr.dark{--cream:#fff;box-shadow:none;background:radial-gradient(120% 40% at 50% 108%,rgba(70,110,190,.35),transparent 70%),linear-gradient(180deg,#050a1c 0%,#0a1431 55%,#0f1d44 100%)}
.scr.dark>*{position:relative;z-index:1}
.scr.dark:before{content:"";position:absolute;z-index:0;right:40px;top:196px;width:68px;height:68px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fffaf0,#f1e9d2 55%,#d9cfb2);box-shadow:0 0 28px 6px rgba(255,244,214,.28),0 0 110px 40px rgba(150,180,255,.16)}
.scr.dark:after{content:"";position:absolute;z-index:0;inset:0;pointer-events:none;background:
radial-gradient(1.4px 1.4px at 18% 10%,#fff,transparent),radial-gradient(1px 1px at 42% 6%,rgba(255,255,255,.8),transparent),radial-gradient(1.2px 1.2px at 63% 17%,#fff,transparent),radial-gradient(1px 1px at 84% 26%,rgba(255,255,255,.7),transparent),radial-gradient(1.4px 1.4px at 10% 30%,rgba(255,255,255,.85),transparent),radial-gradient(1px 1px at 36% 24%,rgba(255,255,255,.6),transparent),radial-gradient(1.2px 1.2px at 92% 8%,#fff,transparent),radial-gradient(1px 1px at 72% 4%,rgba(255,255,255,.7),transparent),radial-gradient(1px 1px at 52% 32%,rgba(255,255,255,.5),transparent),radial-gradient(1.2px 1.2px at 6% 52%,rgba(255,255,255,.5),transparent),radial-gradient(1px 1px at 95% 46%,rgba(255,255,255,.55),transparent)}
.scr:not(.dark) .sub{color:var(--ink2) !important}
.scr:not(.dark) .k{color:var(--ink2)}
.phA{box-shadow:0 26px 48px rgba(20,60,120,.28),inset 0 0 0 1px rgba(255,255,255,.35)}
.pop:not(.on){box-shadow:var(--sky-shadow)}
.pop.on{box-shadow:0 0 0 2.5px #0a7aff,var(--sky-shadow)}
.popcard{filter:none}.popcard .card,.tgcard{box-shadow:var(--sky-shadow) !important}
.zoom{box-shadow:0 0 0 1px rgba(10,40,90,.06),0 0 0 6px rgba(255,255,255,.55),0 22px 44px rgba(20,60,120,.28)}
.award svg{fill:#0a0a0a}.award svg path[stroke]{stroke:#0a0a0a}
.stats .div,.logos2 .div{background:rgba(10,10,10,.2)}
.pfade{background:linear-gradient(180deg,rgba(255,255,255,0),#fff 14%)}
.qcard{background:#fff;color:#0a0a0a;border:1px solid rgba(10,10,10,.08);box-shadow:var(--sky-shadow)}
.lgtxt{color:#0a0a0a;opacity:.6}
.scr.dark .subtle{background:rgba(255,255,255,.06)}

/* scrawl feedback round 1 */
:root{--orange:#fbbf24}
.award svg{height:46px}.award .mid b{margin-top:6px}.stats{margin-top:14px}
.qcard{top:428px}.pfade{top:486px}.lbar{bottom:22px}
.zoom{box-shadow:var(--sky-shadow);padding:14px 14px 7px;left:50% !important;right:auto !important;transform:translateX(-50%);width:max-content;max-width:262px}
.zoom:not(.faces){display:grid;grid-template-columns:repeat(2,auto);justify-content:start;justify-items:start;max-width:none}
.zoom.faces{display:flex;flex-wrap:nowrap;gap:14px;padding:16px 18px 12px}
.zf{display:flex;flex-direction:column;align-items:center;gap:6px;font:500 14px -apple-system,system-ui}
.zf img{width:58px;height:58px;border-radius:50%;object-fit:cover;padding:3px;border:2.5px solid #dedede;box-sizing:content-box}
.zf.on img{border-color:#0a7aff}.zf.on b{font-weight:600}.zf b{font-weight:500}
.android-set .zf{font-family:Roboto,system-ui}

/* scrawl feedback round 2 */
.ps .fab{display:none !important}
.zf img{border-color:transparent}
.award .mid b{margin-top:1px}.stats{margin-top:12px}
.scr.dark{background:radial-gradient(120% 34% at 50% 110%,rgba(40,62,120,.24),transparent 70%),linear-gradient(180deg,#000103 0%,#02040b 55%,#060b19 100%)}
.scr.dark:before{right:48px;top:204px;width:50px;height:50px;box-shadow:0 0 22px 6px rgba(255,244,214,.42),0 0 70px 26px rgba(255,236,190,.14),0 0 160px 70px rgba(150,180,255,.12)}
.scr.dark:after{background:radial-gradient(1px 1px at 33% 11%,rgba(255,255,255,0.45),transparent),radial-gradient(1.8px 1.8px at 80% 8%,rgba(255,255,255,0.45),transparent),radial-gradient(1px 1px at 89% 15%,rgba(255,255,255,0.9),transparent),radial-gradient(1.8px 1.8px at 42% 16%,rgba(255,255,255,0.9),transparent),radial-gradient(1px 1px at 9% 36%,rgba(255,255,255,1),transparent),radial-gradient(1.4px 1.4px at 92% 37%,rgba(255,255,255,0.45),transparent),radial-gradient(1px 1px at 95% 5%,rgba(255,255,255,0.75),transparent),radial-gradient(1.8px 1.8px at 42% 34%,rgba(255,255,255,0.75),transparent),radial-gradient(1px 1px at 56% 43%,rgba(255,255,255,1),transparent),radial-gradient(1px 1px at 57% 13%,rgba(255,255,255,1),transparent),radial-gradient(1.8px 1.8px at 70% 36%,rgba(255,255,255,0.6),transparent),radial-gradient(1.2px 1.2px at 50% 34%,rgba(255,255,255,0.9),transparent),radial-gradient(1.2px 1.2px at 58% 29%,rgba(255,255,255,0.6),transparent),radial-gradient(1px 1px at 78% 44%,rgba(255,255,255,0.45),transparent),radial-gradient(1.2px 1.2px at 57% 34%,rgba(255,255,255,0.9),transparent),radial-gradient(1px 1px at 30% 61%,rgba(255,255,255,1),transparent),radial-gradient(1px 1px at 42% 47%,rgba(255,255,255,0.9),transparent),radial-gradient(1px 1px at 43% 60%,rgba(255,255,255,1),transparent),radial-gradient(1.2px 1.2px at 57% 55%,rgba(255,255,255,0.75),transparent),radial-gradient(1.8px 1.8px at 68% 38%,rgba(255,255,255,0.9),transparent),radial-gradient(1.2px 1.2px at 9% 8%,rgba(255,255,255,0.9),transparent),radial-gradient(1.2px 1.2px at 69% 6%,rgba(255,255,255,1),transparent),radial-gradient(1.2px 1.2px at 96% 51%,rgba(255,255,255,0.9),transparent),radial-gradient(1.4px 1.4px at 86% 23%,rgba(255,255,255,0.75),transparent),radial-gradient(1px 1px at 19% 9%,rgba(255,255,255,0.6),transparent),radial-gradient(1px 1px at 75% 10%,rgba(255,255,255,0.9),transparent),radial-gradient(1px 1px at 40% 54%,rgba(255,255,255,0.6),transparent),radial-gradient(1px 1px at 45% 35%,rgba(255,255,255,0.9),transparent),radial-gradient(1.4px 1.4px at 84% 19%,rgba(255,255,255,0.75),transparent),radial-gradient(1px 1px at 67% 25%,rgba(255,255,255,0.6),transparent),radial-gradient(2.4px 2.4px at 22% 12%,#fff,transparent),radial-gradient(9px 9px at 22% 12%,rgba(200,215,255,.22),transparent),radial-gradient(2.4px 2.4px at 78% 6%,#fff,transparent),radial-gradient(9px 9px at 78% 6%,rgba(200,215,255,.22),transparent),radial-gradient(2.4px 2.4px at 90% 40%,#fff,transparent),radial-gradient(9px 9px at 90% 40%,rgba(200,215,255,.22),transparent),radial-gradient(2.4px 2.4px at 8% 44%,#fff,transparent),radial-gradient(9px 9px at 8% 44%,rgba(200,215,255,.22),transparent)}
.android-set .scr.dark:before{top:150px;right:36px}

/* round 2: quote + listed on (refs: Blinkist/Hers quotes, Calm/Daylio press rows) */
.qcard{font-weight:400;font-size:14px;line-height:1.42;color:rgba(10,10,10,.78);padding:14px 16px 12px}
.qcard b{font-weight:600;color:#0a0a0a}
.qcard small{font-size:11.5px;color:rgba(10,10,10,.55);opacity:1;margin-top:9px;gap:7px}
.lo2{font-size:9px;letter-spacing:.12em;opacity:.45;margin-bottom:7px}
.logos2{gap:14px}.logos2 .lg{font-size:10.5px;font-weight:600;gap:5px;opacity:1}
.lgtxt{color:#0a0a0a;opacity:.55 !important}
.logos2 .lg img.mono{filter:brightness(0);width:12px;height:12px;border-radius:2px}
.android-set .qcard{top:400px}.android-set .pfade{top:452px}.android-set .lbar{bottom:16px}

/* scrawl feedback round 3 */
.scr.dark:before{display:none}
.award{gap:6px}.award svg{height:58px;opacity:.5}
.award .rt .star{font-size:19px;letter-spacing:2px;color:#e0b546;opacity:.8}
.award .mid b{font-size:15px;margin-top:7px;opacity:.8}
.stats{margin-top:52px}
.qcard{top:478px;font-size:13.5px;padding:12px 15px 10px}.qcard small{margin-top:7px}.pfade{top:536px}.lbar{bottom:14px}
.logos2{gap:12px}.logos2 .lg{font-size:10px;gap:4px}
.logos2 .lg img{width:15px;height:15px;object-fit:contain;filter:grayscale(1);mix-blend-mode:multiply;opacity:.85;border-radius:3px}
.android-set .scr.proof .stats{margin-top:22px}.android-set .scr.proof .phA{top:242px !important}
.android-set .qcard{top:428px}.android-set .pfade{top:486px}.android-set .lbar{bottom:12px}

/* scrawl feedback round 4 */
.award svg{fill:#fff !important;opacity:.82;filter:drop-shadow(0 1px 2px rgba(20,60,120,.18))}.award svg path[stroke]{stroke:#fff !important}
.award .rt .star{color:#fff;opacity:.9;text-shadow:0 1px 2px rgba(20,60,120,.2)}
.stats{margin-top:40px}
.scr{--fit:.98}.android-set .scr{--fit:.88}

/* scrawl feedback round 5 */
.award .rt .star{color:#fbbf24;opacity:1;font-size:21px;text-shadow:0 1px 2px rgba(120,80,0,.18)}
.award svg{height:62px}
.lo2{margin-bottom:2px}.lbar{bottom:10px}.android-set .lbar{bottom:8px}
.plist .soon{color:rgba(255,255,255,.62);font-weight:500;border-bottom:0}
"""

SVG_LOCK = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="rgba(52,211,153,.18)"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3" fill="#34d399"/></svg>'
FACEID = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M8.5 9v1.5M15.5 9v1.5M12 9v4h-1"/><path d="M8.5 15.5c1.8 1.6 5.2 1.6 7 0"/></svg>'
CK = '<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="#34d399" stroke-width="1.6"/><path d="M6.5 11.5l3 3L15.5 8" stroke="#34d399" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
HEART = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.41 19.97C7.59 17.86 2 13.03 2 8.69 2 5.83 4.11 3.5 7 3.5c1.5 0 3 .5 5 2.5 2-2 3.5-2.5 5-2.5 2.89 0 5 2.33 5 5.19 0 4.34-5.59 9.17-8.41 11.28-.95.71-2.23.71-3.18 0Z" fill="rgba(52,211,153,.18)"/></svg>'
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


# ---- Per-store sets ----
# One frame library, separate copy and order per store. Rules for both sets:
# only features with status `available` in docs/app-facts.json; no price or "free",
# ratings, download counts, testimonials, awards, other app names, or time-sensitive text;
# never claim zero data collection (anonymous analytics + crash reports exist).
TILT_L = 'left:24%;transform:translateX(-50%) rotate(-5deg) scale(.85);transform-origin:50% 0;'
TILT_R = 'left:76%;transform:translateX(-50%) rotate(5deg) scale(.85);transform-origin:50% 0;z-index:2;'
FIT = 'transform:translateX(-50%) scale(var(--fit));transform-origin:50% 0;'
DOC = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M3 1h11l7 7v15a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="#fff"/><path d="M14 1v7h7" fill="rgba(0,0,0,.18)"/><path d="M5 13h12M5 17h12M5 21h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>'
# Generic export files from other apps: colored tile + file type, never a name or logo.
XFER = ('<div class="xfer" style="top:{t}px">' + "".join(
    f'<div class="xf" style="transform:rotate({r}deg)"><span class="xt" style="background:{c};color:{c}">{DOC}</span><span class="xc">{ext}</span></div>'
    for c, ext, r in (("#f97316", ".csv", -7), ("#8b5cf6", ".json", 0), ("#0ea5e9", ".zip", 7)))
    + '<div class="xa"><svg width="12" height="16" viewBox="0 0 14 22" fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1v19M1.5 14.5 7 20l5.5-5.5"/></svg><b>Pixy Switch</b></div></div>')

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

# App Store only: Google Play bans ratings, testimonials, and awards in screenshots.
LISTED = (("moodtrackers-org.png", "moodtrackers.org"), ("alternativeto.svg", "AlternativeTo"), ("medevel.png", "MEDevel"))
PROOF = (
    f'<div class="stats"><div class="award">{laurel()}<div class="mid"><div class="rt"><span class="star">★★★★★</span></div><b>4.9 on the App Store</b></div>{laurel(True)}</div></div>'
    + phone('calendar', '{t}')
    + '<div class="pfade"></div>'
    + '<div class="qcard">“No nonsense, clean and easy to use app for tracking mood.<br><b>I use it every day.</b>”<small><span class="star">★★★★★</span>Review by the guy, App Store</small></div>'
    + '<div class="lbar"><div class="lo2">Listed on</div><div class="logos2">'
    + "".join(f'<span class="lg lgtxt"><img src="logos/{f}" alt="">{n}</span>' for f, n in LISTED) + '</div></div>')

# Frame library: id -> (label, html with {t} phone top and {z} overlay top)
FRAMES = {
    "calendar": ("Pixel calendar: a month of moods, one pixel per day.", phone('calendar', '{t}', FIT)),
    "checkin": ("Check-in: sleep step behind, mood slide in front.",
                phone('sleep', '{t+36}', TILT_L) + phone('mood', '{t}', TILT_R)),
    "shapedby": ("Note slide behind, tags slide with shaped-by examples in front, tags popped out.",
                 phone('note', '{t+36}', TILT_L) + phone('shapedby', '{t}', TILT_R)
                 + '<div class="zoom" style="top:{z}px">' + "".join(f'<span class="zc on"><i style="background:{c}"></i>{n}</span>' for n, c in (("Coffee", "#a16207"), ("Took meds", "#8b5cf6"), ("Guitar", "#f59e0b"), ("Headache", "#ef4444"))) + '</div>'),
    "switch": ("Three unbranded export files (.csv, .json, .zip) flow through Pixy Switch into the calendar. No other app names or logos.",
               XFER + phone('calendar', '{t+148}', FIT)),
    "emotions": ("Logger emotions slide, Hopeful with its description popped out.",
                 phone('emotions', '{t}', FIT) + '<div class="zoom note" style="top:{z}px"><span class="zc on" data-emo="hopeful"></span><div>You feel optimistic that something good will happen</div></div>'),
    "proof": ("Social proof (App Store only): App Store rating, review card over the calendar, Listed on row.", PROOF),
    "stats": ("Statistics highlights: mood chart, tag peaks popped out.",
              phone('stats', '{t}', FIT) + '<div class="popcard" data-card="tagpeaks" style="left:50%;top:{z}px;transform:translateX(-50%) scale(.7);transform-origin:50% 0"></div>'),
    "year": ("Year Report: Year in Pixels.", phone('year', '{t}', FIT)),
    "privacy": ("Dark checklist frame (night sky), list mid-screen. No phone.", '<div class="plist">{checks}</div>'),
}

PRIVACY = ["No account", "Never shares your notes", "Analytics can be turned off", "Export or delete anytime", "Open source"]
# Frames and copy follow vision.md: lead with the why, statistics and Year in Pixels as proof.
# "f_<store>" swaps the frame for one store and keeps the copy.
COPY = [
    ("proof", {"h": "Loved for<br>being simple", "sub": "No ads · No account · Open source", "cls": "proof", "t": 234, "only": "apple"}),
    ("checkin", {"k": "Mood journal", "h": "Understand what<br>makes you feel<br>this way", "sub": "Log your mood and what shaped it.", "f_play": "calendar"}),
    ("shapedby", {"k": "Shaped by", "h": "Track what shapes<br>your mood", "hc": "fit", "sub": "Habits, meds, sleep, anything."}),
    ("switch", {"k": "Switch", "h": "Import from other<br>Mood Trackers", "sub": "21 apps or any CSV, in minutes."}),
    ("emotions", {"k": "Emotions", "h": "Name what<br>you feel", "sub": "72 emotions, each explained.", "z_play": 414}),
    ("stats", {"k": "Statistics", "h": "See how your<br>days add up", "sub": "Mood over time, tag peaks,<br>month and year reports.", "z_play": 416}),
    ("year", {"k": "Year in Pixels", "h": "Look back on<br>your year", "sub": "Every day, one glance."}),
    ("privacy", {"k": "Privacy", "h": "Your words<br>stay yours", "sub": "Text you write is never shared.", "cls": "dark", "checks": PRIVACY}),
]

STORES = {
    # App Store: first 3 frames show in search results (no app preview). Social proof is App Store only.
    "apple": {"title": "iPhone · App Store", "cls": "", "z": 500, "lh": 33.9,
              "frames": [(c.get("f_apple", f), c) for f, c in COPY if c.get("only", "apple") == "apple"]},
    # Google Play: no ratings, testimonials, or awards; captions stay under 20% of the image.
    "play": {"title": "Android · Google Play", "cls": "android-set", "z": 392, "lh": 30.7,
             "frames": [(c.get("f_play", f), c) for f, c in COPY if c.get("only", "play") == "play"]},
}


def phone_top(s, c):
    """Phone top in CSS px: right below the caption (padding, label, headline lines, subline lines, gap)."""
    lines = lambda x: x.count("<br>") + 1
    return round(34 + (25 if c.get("k") else 0) + s["lh"] * lines(c["h"]) + 10 + 18.2 * lines(c["sub"]) + 16)


if sys.argv[1:2] == ["--frames"]:  # export.sh: frame names in upload order
    print(" ".join(f for f, _ in STORES[sys.argv[2]]["frames"]))
    sys.exit()


def caption(c):
    k = f'<div class="k">{c["k"]}</div>' if c.get("k") else ""
    return f'{k}<h4 class="{c.get("hc", "")}">{c["h"]}</h4><div class="sub">{c["sub"]}</div>'


def store_set(key):
    s = STORES[key]
    slots = []
    for n, (fid, c) in enumerate(s["frames"], 1):
        lab, html = FRAMES[fid]
        t, z = c.get("t", phone_top(s, c)), c.get(f"z_{key}", c.get("z", s["z"]))
        checks = "".join(f'<div>{CK}{x}</div>' for x in c.get("checks", []))
        html = re.sub(r"\{t\+(\d+)\}", lambda m: str(t + int(m.group(1))), html + c.get("extra", ""))
        html = html.replace("{t}", str(t)).replace("{z}", str(z)).replace("{checks}", checks)
        slots.append(f'<div class="slot" data-name="{fid}"><div class="scr {c.get("cls", "")}">{caption(c)}{html}</div><div class="lab"><b>{n} · {fid}.</b> {lab}</div></div>')
    return f'<div class="platform"><h2>{s["title"]}</h2></div><div class="set {s["cls"]}" data-store="{key}">{"".join(slots)}</div>'


STORE_CSS = r"""
/* Per-store sets: 6.9" iPhone (1320x2868) and Play phone 9:16 (1080x1920) */
.set[data-store="apple"] .scr{height:651.82px}
.set[data-store="play"] .scr{height:533.33px}
.set .slot:nth-child(8) .scr{--sx:40%}
.zoom.note{display:block !important;width:256px !important;max-width:256px !important;font:400 15px/1.4 -apple-system,system-ui;padding:14px 16px}.zoom.note .zc{margin-bottom:8px}
.android-set .zoom.note{font-family:Roboto,system-ui}
.android-set .scr h4{font-size:29px}
.scr h4.fit{font-size:29px}
.scr.dark .plist{margin:auto 0}
.scr.proof .stats{margin-top:22px}.scr.proof .qcard small .star{font-size:11px;letter-spacing:1px}
.xfer{position:absolute;z-index:6;left:0;right:0;display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.xf{width:72px;background:#fff;border-radius:16px;padding:10px 0 8px;display:flex;flex-direction:column;align-items:center;gap:7px;box-shadow:var(--sky-shadow)}
.xt{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.xc{font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#0a0a0a;background:#f0f0f2;border-radius:6px;padding:2px 7px}
.xa{flex-basis:100%;display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:-4px}
.xa b{order:-1;font:600 11px Geist,system-ui;letter-spacing:.07em;text-transform:uppercase;color:#0a0a0a;background:#fff;border-radius:999px;padding:4px 10px;box-shadow:var(--sky-shadow)}
"""

# App Store creative assets (iOS 27+): product page header 21:9 and search results 3:2.
# CSS px x4 = store px. Header 960x411.5 -> 3840x1646. Search 960x640 -> 3840x2560.
CREATIVE_CSS = r"""
.cvset{display:flex;flex-direction:column;gap:22px;padding:10px 0 16px}.cvset .lab{margin-top:6px}
.cv{position:relative;overflow:hidden;width:960px;background:url(photos/sky.webp) 50% 30%/cover no-repeat,#bcdcff;box-shadow:0 0 0 1px rgba(10,40,90,.08);border-radius:14px;font-family:Geist,system-ui,sans-serif;color:#0a0a0a}
.cv.header{height:411.5px}.cv.search{height:640px;background:linear-gradient(180deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.7) 100%),url(photos/sky.webp) 50% 20%/cover no-repeat,#bcdcff}
.cv .phA{transform-origin:50% 0}
.cv h4{position:absolute;left:0;right:0;margin:0;text-align:center;font-weight:600;letter-spacing:-.03em;line-height:1.05}
.cv .sub{position:absolute;left:0;right:0;text-align:center;color:rgba(10,10,10,.66);font-size:19px}
.cv.feature{width:1024px;height:500px;background:url(photos/sky.webp) 50% 35%/cover no-repeat,#bcdcff}
.cv .fk{position:absolute;left:52px;top:98px;font-size:24px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:rgba(10,10,10,.66)}
.cv h4.fh{left:52px;right:auto;top:138px;width:500px;text-align:left;font-size:64px;line-height:1.02}
.cv .brand{position:absolute;z-index:3;left:0;right:0;top:26px;display:flex;justify-content:center;align-items:center;gap:12px}
.cv .brand svg{width:46px;height:46px;border-radius:11px;box-shadow:0 0 0 1px rgba(10,40,90,.06),0 8px 20px rgba(20,60,120,.2)}
.cv .brand b{font-size:38px;font-weight:600;letter-spacing:-.03em}
.cv .brand span{font-size:38px;font-weight:500;letter-spacing:-.03em;color:rgba(10,10,10,.6)}
.cv h4.ih{display:flex;justify-content:center;align-items:center;gap:18px}.cv h4.ih svg{width:66px;height:66px;border-radius:16px;box-shadow:0 0 0 1px rgba(10,40,90,.06),0 8px 20px rgba(20,60,120,.2)}
.cv .brand.fb{left:52px;right:auto;top:84px;justify-content:flex-start;gap:10px}.cv .brand.fb svg{width:40px;height:40px;border-radius:10px}.cv .brand.fb b,.cv .brand.fb span{font-size:30px}
.px{position:absolute;border-radius:22%;box-shadow:0 10px 24px rgba(20,60,120,.18)}
"""
def pixels(cells):
    return "".join(f'<i class="px" style="left:{x}px;top:{y}px;width:{w}px;height:{w}px;background:{c};opacity:{o};transform:rotate({r}deg)"></i>' for x, y, w, c, o, r in cells)

# Mood colors from appscreens.js default scale, floating like the year grid drifting through the clouds.
PX = [(70, 70, 34, "#34d399", .9, -8), (150, 210, 22, "#a7f3d0", .85, 6), (40, 270, 26, "#fdba74", .8, 10), (230, 110, 18, "#059669", .7, -4),
      (860, 60, 30, "#059669", .9, 8), (790, 200, 24, "#ffedd5", .85, -6), (890, 280, 20, "#34d399", .8, 4), (720, 90, 16, "#a7f3d0", .7, -10)]
# App icon: 4 mood dots on white (assets/images/icon.png).
PIXY_ICON = '<svg viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#fff"/><circle cx="345" cy="345" r="150" fill="#fdba74"/><circle cx="687" cy="345" r="150" fill="#34d399"/><circle cx="345" cy="687" r="150" fill="#ffedd5"/><circle cx="687" cy="687" r="150" fill="#059669"/></svg>'
FPX = [(40, 40, 26, "#34d399", .85, -8), (470, 60, 18, "#a7f3d0", .8, 6), (60, 420, 22, "#fdba74", .8, 10), (420, 400, 16, "#059669", .75, -4)]
CREATIVE = f"""
<div class="cvset">
 <div><div class="cv header" data-cv="header">
  {pixels(PX)}
  <div class="brand">{PIXY_ICON}<b>Pixy</b><span>Mood Journal</span></div>
  {phone('mood', 150, 'left:17%;transform:translateX(-50%) rotate(-8deg) scale(1.3);z-index:1;')}
  {phone('year', 150, 'left:83%;transform:translateX(-50%) rotate(8deg) scale(1.3);z-index:1;')}
  {phone('calendar', 106, 'transform:translateX(-50%) scale(1.5);z-index:2;')}
 </div><div class="lab"><b>Product page header</b> 21:9, 3840x1646. Pixy icon + "Pixy Mood Journal" on top, phones pushed down. Calendar in front, mood logger and year in pixels behind, phones run off the bottom edge.</div></div>
 <div><div class="cv search" data-cv="search">
  <h4 class="ih" style="top:30px;font-size:68px">{PIXY_ICON}Mood Journal</h4>
  <div class="sub" style="top:106px;font-size:28px;font-weight:500">Understand what makes you feel this way.</div>
  {phone('stats', 232, 'left:17%;transform:translateX(-50%) rotate(-8deg) scale(1.3);z-index:1;')}
  {phone('emotions', 232, 'left:83%;transform:translateX(-50%) rotate(8deg) scale(1.3);z-index:1;')}
  {phone('calendar', 194, 'transform:translateX(-50%) scale(1.5);z-index:2;')}
 </div><div class="lab"><b>Search results</b> 3:2, 3840x2560. Replaces the first 3 screenshots in search, shown small: big type, big phones (calendar front, statistics and emotions behind).</div></div>
 <div><div class="cv feature android-set" data-cv="feature">
  {pixels(FPX)}
  <div class="brand fb">{PIXY_ICON}<b>Pixy</b><span>Mood Journal</span></div>
  <h4 class="fh">Understand what<br>makes you feel<br>this way</h4>
  {phone('calendar', 40, 'left:auto;right:140px;transform:rotate(-6deg) scale(1.35);z-index:2;')}
  {phone('year', 96, 'left:auto;right:-190px;transform:rotate(7deg) scale(1.25);z-index:1;')}
 </div><div class="lab"><b>Google Play feature graphic</b> 1024x500 (rendered 2x, downsampled). Pixy Mood Journal lockup + headline left (no price, rating, or download claims), calendar and year in pixels right.</div></div>
</div>"""

# Export mode: index.html?export=apple|play&n=1..8 keeps one screen at 0,0 for headless capture (export.sh).
EXPORT = """<script>
(function () {{
  const q = new URLSearchParams(location.search), os = q.get('export'); if (!os) return;
  if (os === 'creative') {
    const cv = document.querySelector('[data-cv="' + q.get('n') + '"]');
    document.querySelectorAll('main > *').forEach((el) => { if (!el.contains(cv)) el.style.display = 'none'; });
    document.querySelectorAll('.cvset > div').forEach((el) => { if (!el.contains(cv)) el.style.display = 'none'; });
    document.querySelectorAll('.cvset .lab').forEach((el) => { el.style.display = 'none'; });
    document.body.style.margin = '0'; document.querySelector('main').style.padding = '0';
    cv.parentElement.parentElement.style.padding = '0';
    cv.style.borderRadius = '0'; cv.style.boxShadow = 'none';
    return;
  }
  // Hide everything except one slot; keep its set and position so set and slot CSS still apply.
  const set = document.querySelector('.set[data-store="' + os + '"]'), n = +q.get('n') || 1;
  document.querySelectorAll('main > *').forEach((el) => { if (el !== set) el.style.display = 'none'; });
  set.querySelectorAll('.slot').forEach((el, i) => { if (i !== n - 1) el.style.display = 'none'; });
  set.querySelectorAll('.lab').forEach((el) => { el.style.display = 'none'; });
  const scr = set.querySelectorAll('.slot')[n - 1].querySelector('.scr');
  document.body.style.margin = '0'; document.querySelector('main').style.padding = '0';
  set.style.padding = '0'; set.style.overflow = 'visible';
  scr.style.borderRadius = '0'; scr.style.boxShadow = 'none';
  // ?measure=1: caption text area as share of the image (Play: taglines max 20%), read by export.sh.
  if (q.get('measure')) addEventListener('load', () => setTimeout(() => {
    let a = 0; scr.querySelectorAll(':scope > .k, :scope > h4, :scope > .sub').forEach((el) => { const r = document.createRange(); r.selectNodeContents(el); for (const b of r.getClientRects()) a += b.width * b.height; });
    const m = document.createElement('meta'); m.name = 'caption-share'; m.content = (a / (scr.offsetWidth * scr.offsetHeight)).toFixed(3); document.head.appendChild(m);
    // Overflow: caption text wider than the canvas minus padding.
    const right = scr.getBoundingClientRect().right - 14, cut = [...scr.querySelectorAll(':scope > .k, :scope > h4, :scope > .sub')].filter((el) => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].some((b) => b.right > right); });
    const o = document.createElement('meta'); o.name = 'caption-overflow'; o.content = cut.length ? 'CUT' : 'ok'; document.head.appendChild(o);
  }, 500));
}})();
</script>""".replace("{{", "{").replace("}}", "}")

AGENTATION = """<div id="agentation-root"></div>
<script type="module">
import React from "https://esm.sh/react@18.3.1";
import {{ createRoot }} from "https://esm.sh/react-dom@18.3.1/client";
import {{ Agentation }} from "https://esm.sh/agentation@3.1.2?deps=react@18.3.1,react-dom@18.3.1";
if (!location.search.includes("export=")) createRoot(document.getElementById("agentation-root")).render(React.createElement(Agentation));
</script>""".replace("{{", "{").replace("}}", "}")

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pixy store screenshots (sky)</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>{CSS}{SKY_CSS}{CREATIVE_CSS}{STORE_CSS}</style></head><body><main>
<h1>Pixy store screenshots</h1>
<p class="muted">Separate sets for the App Store and Google Play (copy and order in <code>STORES</code> in build.py). Spec: <a href="app-screens.md">app-screens.md</a>. Rebuild: <code>python3 build.py</code>, export PNGs: <code>./export.sh</code>, then serve this folder (<code>python3 -m http.server</code>).</p>
{store_set("apple")}
{store_set("play")}
<div class="platform"><h2>App Store · header and search results</h2></div>{CREATIVE}</main>
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script><script src="emotion-icons.js?v={int(time.time())}"></script><script src="appscreens.js?v={int(time.time())}"></script><script>
document.head.insertAdjacentHTML('beforeend','<style>'+APP.css+'</style>');
document.querySelectorAll('[data-app]').forEach(el=>{{window.PIXY_OS=el.closest('.android-set')?'android':'ios';const a=(el.dataset.args||'').split(',').filter(Boolean);el.innerHTML=APP.render(el.dataset.app,a[0]||undefined,a[1]==='dark')}});window.PIXY_OS='ios';
document.querySelectorAll('[data-card]').forEach(el=>el.innerHTML='<div class="ps">'+APP.card(el.dataset.card)+'</div>');
document.querySelectorAll('[data-emo]').forEach(el=>el.innerHTML=APP.emo(el.dataset.emo,24)+APP.label(el.dataset.emo));APP.icons();
</script>{EXPORT}{AGENTATION}</body></html>"""
open(os.path.join(HERE, "index.html"), "w").write(page)
print("wrote index.html")
