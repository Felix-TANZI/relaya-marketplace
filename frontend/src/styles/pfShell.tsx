// frontend/src/styles/pfShell.tsx
// Shell visuel de l'espace client : tokens --pf-*, fond aurora, panneaux en verre.
// Source unique — ProfilePage, CartPage, CheckoutPage et OrderDetailPage l'utilisent.

const PF_CSS = `
.pf-root{--pf-accent:#f4610f;--pf-accent2:#ff8a3d;--pf-text:#1a1420;--pf-text2:#5b5563;--pf-muted:#9b93a3;--pf-glass:rgba(255,255,255,.68);--pf-glass-border:rgba(255,255,255,.9);--pf-border:rgba(120,80,50,.14);--pf-bstrong:rgba(120,80,50,.22);--pf-s3:rgba(244,97,15,.10);--pf-asoft:rgba(244,97,15,.12);--pf-aring:rgba(244,97,15,.4);--pf-shadow:0 10px 40px rgba(244,97,15,.10),0 2px 10px rgba(20,10,5,.05);color:var(--pf-text);background:radial-gradient(1100px 620px at 6% -8%,rgba(255,176,110,.42),transparent 60%),radial-gradient(880px 520px at 96% -2%,rgba(255,138,190,.26),transparent 55%),radial-gradient(1000px 720px at 55% 108%,rgba(150,168,255,.20),transparent 60%),#f5f3f7;background-attachment:fixed;}
.dark .pf-root{--pf-accent:#ff8a3d;--pf-accent2:#ffa661;--pf-text:#f5f2f7;--pf-text2:#b3aec0;--pf-muted:#7f7990;--pf-glass:rgba(26,24,32,.55);--pf-glass-border:rgba(255,255,255,.09);--pf-border:rgba(255,255,255,.08);--pf-bstrong:rgba(255,255,255,.16);--pf-s3:rgba(255,255,255,.07);--pf-asoft:rgba(255,138,61,.16);--pf-aring:rgba(255,138,61,.45);--pf-shadow:0 14px 44px rgba(0,0,0,.5),0 2px 12px rgba(0,0,0,.35);background:radial-gradient(1100px 620px at 6% -8%,rgba(140,60,12,.55),transparent 60%),radial-gradient(880px 520px at 96% -2%,rgba(90,24,70,.45),transparent 55%),radial-gradient(1000px 720px at 55% 108%,rgba(34,34,90,.4),transparent 60%),#09080c;}
@keyframes pfUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pf-anim{opacity:0;animation:pfUp .55s cubic-bezier(.22,.61,.36,1) forwards}
.pf-anim:nth-child(1){animation-delay:0s}.pf-anim:nth-child(2){animation-delay:.06s}.pf-anim:nth-child(3){animation-delay:.12s}.pf-anim:nth-child(4){animation-delay:.18s}.pf-anim:nth-child(5){animation-delay:.24s}.pf-anim:nth-child(6){animation-delay:.3s}.pf-anim:nth-child(7){animation-delay:.36s}
.pf-glass-panel{border-radius:18px;padding:20px;background:var(--pf-glass);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow)}
.pf-ident{display:flex;align-items:center;gap:16px;flex-wrap:wrap;border-radius:22px;padding:20px 22px;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);position:relative;overflow:hidden}
.pf-ident::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(244,97,15,.1),transparent 42%);pointer-events:none}
.pf-avatar{width:58px;height:58px;border-radius:50%;flex-shrink:0;overflow:hidden;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;box-shadow:0 8px 22px rgba(244,97,15,.4);position:relative;z-index:1}
.pf-avatar img{width:100%;height:100%;object-fit:cover}
.pf-name{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--pf-text);position:relative;z-index:1}
.pf-meta{margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--pf-text2);position:relative;z-index:1}
.pf-meta span{display:inline-flex;align-items:center;gap:6px}.pf-meta svg{color:var(--pf-accent)}
.pf-chip{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;color:var(--pf-accent);background:var(--pf-asoft);border:1px solid var(--pf-aring);white-space:nowrap;position:relative;z-index:1}
.pf-btn-ghost{border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.4);color:var(--pf-text);border-radius:999px;padding:8px 15px;font-size:12.5px;font-weight:600;cursor:pointer;transition:.18s;font-family:inherit;display:inline-flex;align-items:center;gap:6px;position:relative;z-index:1}
.dark .pf-btn-ghost{background:rgba(255,255,255,.06)}
.pf-btn-ghost:hover{border-color:var(--pf-accent);color:var(--pf-accent);transform:translateY(-1px)}
.pf-grid{display:grid;grid-template-columns:242px minmax(0,1fr);gap:22px;margin-top:22px}
@media(max-width:1023px){.pf-grid{grid-template-columns:1fr}}
.pf-navcard{border-radius:22px;padding:9px;align-self:start;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow)}
.pf-sec{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--pf-muted);padding:13px 13px 6px}
.pf-nav{position:relative;display:flex;align-items:center;gap:11px;width:100%;padding:10px 13px;border-radius:13px;font-size:13.5px;font-weight:500;color:var(--pf-text2);cursor:pointer;background:transparent;border:none;text-align:left;transition:all .18s;font-family:inherit}
.pf-nav svg{width:18px;height:18px;color:var(--pf-muted);transition:color .18s}
.pf-nav:hover{background:var(--pf-asoft);color:var(--pf-text)}.pf-nav:hover svg{color:var(--pf-accent)}
.pf-nav.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;font-weight:600;box-shadow:0 8px 20px rgba(244,97,15,.34)}
.pf-nav.on svg{color:#fff}
.pf-badge{margin-left:auto;font-size:11px;font-weight:700;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--pf-accent);color:#fff}
.pf-nav.on .pf-badge{background:rgba(255,255,255,.28)}
.pf-navsep{height:1px;background:var(--pf-border);margin:8px 11px}
.pf-a11y{border-top:1px solid var(--pf-border);padding:13px 11px 6px;margin-top:5px}
.pf-a11y-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pf-a11y-l{font-size:12px;font-weight:600;color:var(--pf-text2)}
.pf-stack{display:flex;flex-direction:column;gap:16px}
.pf-hello{font-size:26px;font-weight:800;letter-spacing:-.03em;color:var(--pf-text)}
.pf-hello-sub{font-size:14px;color:var(--pf-text2);margin-top:4px}
.pf-card{border-radius:20px;padding:20px;background:var(--pf-glass);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);transition:transform .2s,box-shadow .2s}
.pf-card:hover{transform:translateY(-2px)}
.pf-row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pf-mb{margin-bottom:12px}.pf-mt{margin-top:10px}
.pf-k{font-size:11px;font-weight:700;color:var(--pf-accent);text-transform:uppercase;letter-spacing:.05em}
.pf-t{font-size:16px;font-weight:700;color:var(--pf-text);margin-top:3px}
.pf-sub{font-size:13px;color:var(--pf-text2);margin-top:3px}
.pf-card-title{font-size:14px;font-weight:700;color:var(--pf-text)}
.pf-muted-sm{font-size:12px;color:var(--pf-muted)}.pf-muted{color:var(--pf-muted)}
.pf-btn-accent{border:none;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;border-radius:999px;padding:9px 18px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:.18s;font-family:inherit;white-space:nowrap;box-shadow:0 8px 20px rgba(244,97,15,.34)}
.pf-btn-accent:hover{transform:translateY(-2px);filter:brightness(1.06)}
.pf-tk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px}
.pf-steps{position:relative;padding:0 2px}
.pf-track{position:absolute;top:10px;left:12.5%;right:12.5%;height:3px;border-radius:3px;background:var(--pf-s3)}
.pf-fill{position:absolute;top:10px;left:12.5%;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 0 14px rgba(244,97,15,.6);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}
.pf-steps-row{position:relative;display:flex}.pf-st{flex:1;text-align:center}
.pf-d{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto}
.pf-d.done,.pf-d.cur{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.45)}
.pf-d.cur{box-shadow:0 0 0 6px var(--pf-asoft),0 5px 14px rgba(244,97,15,.45)}
.pf-d.todo{background:var(--pf-s3);border:1.5px solid var(--pf-bstrong)}
.pf-lbl{font-size:11px;color:var(--pf-text2);margin-top:9px}.pf-lbl.cur{color:var(--pf-accent);font-weight:700}
.pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:640px){.pf-stats{grid-template-columns:repeat(2,1fr)}}
.pf-stat{display:flex;align-items:center;gap:13px;border-radius:18px;padding:16px;background:var(--pf-glass);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);transition:transform .2s}
.pf-stat:hover{transform:translateY(-3px)}
.pf-stat-ic{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.pf-stat-ic.o{background:linear-gradient(135deg,#ffa04d,#f4610f);box-shadow:0 6px 16px rgba(244,97,15,.4)}
.pf-stat-ic.b{background:linear-gradient(135deg,#5bb8ff,#2563eb);box-shadow:0 6px 16px rgba(37,99,235,.35)}
.pf-stat-ic.p{background:linear-gradient(135deg,#ff86bb,#e11d74);box-shadow:0 6px 16px rgba(225,29,116,.35)}
.pf-stat-ic.a{background:linear-gradient(135deg,#ffd45c,#f59e0b);box-shadow:0 6px 16px rgba(245,158,11,.35)}
.pf-stat-body{min-width:0}
.pf-stat-n{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--pf-text);line-height:1.1}
.pf-stat-l{font-size:12px;color:var(--pf-text2);margin-top:2px}
.pf-twoup{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}
@media(max-width:640px){.pf-twoup{grid-template-columns:1fr}}
.pf-bar{height:9px;border-radius:999px;background:var(--pf-s3);overflow:hidden}
.pf-bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--pf-accent2),var(--pf-accent));border-radius:999px;box-shadow:0 0 12px rgba(244,97,15,.5);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}
.pf-notif{display:flex;align-items:center;gap:13px;text-align:left;cursor:pointer;font-family:inherit;transition:transform .2s}
.pf-notif:hover{transform:translateY(-2px)}
.pf-notif-ic{position:relative;flex-shrink:0;width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent)}
.pf-notif-b{position:absolute;top:-5px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(244,97,15,.4)}
.pf-notif-t{display:block;font-size:13px;font-weight:700;color:var(--pf-text)}
.pf-order-line{display:flex;align-items:center;gap:13px;padding:12px 0;border-top:1px solid var(--pf-border)}
.pf-order-line:first-of-type{border-top:none}
.pf-order-ic{width:38px;height:38px;border-radius:12px;background:var(--pf-asoft);color:var(--pf-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pf-order-mid{flex:1;min-width:0}
.pf-order-id{font-size:13px;font-weight:700;color:var(--pf-text)}
.pf-order-total{font-size:13px;font-weight:700;color:var(--pf-accent);white-space:nowrap}
.pf-link{border:none;background:transparent;color:var(--pf-accent);font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.pf-supportrow{padding:6px 20px}
.pf-support-item{display:flex;align-items:center;gap:13px;width:100%;padding:13px 0;border:none;border-top:1px solid var(--pf-border);background:transparent;cursor:pointer;text-align:left;font-family:inherit;transition:padding-left .18s}
.pf-support-item:first-of-type{border-top:none}
.pf-support-item:hover{padding-left:4px}
.pf-support-ic{width:38px;height:38px;border-radius:12px;background:var(--pf-s3);color:var(--pf-text2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pf-support-ic.accent{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.35)}
.pf-support-txt{flex:1;min-width:0}
.pf-support-t{display:block;font-size:13.5px;font-weight:600;color:var(--pf-text)}
.pf-pill{display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:11.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 5px 14px rgba(244,97,15,.35);white-space:nowrap;flex-shrink:0}.pf-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media(max-width:640px){.pf-quick{grid-template-columns:repeat(2,1fr)}}.pf-quick-tile{display:flex;flex-direction:column;align-items:flex-start;gap:11px;padding:16px;border-radius:18px;background:var(--pf-glass);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:var(--pf-text);text-align:left;transition:transform .2s}.pf-quick-tile:hover{transform:translateY(-3px)}.pf-quick-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff}.pf-quick-ic.o{background:linear-gradient(135deg,#ffa04d,#f4610f);box-shadow:0 6px 16px rgba(244,97,15,.4)}.pf-quick-ic.b{background:linear-gradient(135deg,#5bb8ff,#2563eb);box-shadow:0 6px 16px rgba(37,99,235,.35)}.pf-quick-ic.p{background:linear-gradient(135deg,#ff86bb,#e11d74);box-shadow:0 6px 16px rgba(225,29,116,.35)}.pf-quick-ic.a{background:linear-gradient(135deg,#ffd45c,#f59e0b);box-shadow:0 6px 16px rgba(245,158,11,.35)}.pf-anim:nth-child(8){animation-delay:.42s}.pf-anim:nth-child(9){animation-delay:.48s}.pf-anim:nth-child(10){animation-delay:.54s}
.pf-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}.pf-panel-title{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--pf-text)}.pf-panel-sub{font-size:13px;color:var(--pf-text2);margin-top:2px}.pf-avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:22px;flex-wrap:wrap}.pf-avatar-lg{width:76px;height:76px;border-radius:50%;flex-shrink:0;overflow:hidden;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;box-shadow:0 10px 26px rgba(244,97,15,.4)}.pf-avatar-lg img{width:100%;height:100%;object-fit:cover}.pf-avatar-actions{display:flex;gap:9px;flex-wrap:wrap}.pf-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}@media(max-width:640px){.pf-form-grid{grid-template-columns:1fr}}.pf-field{display:flex;flex-direction:column;gap:6px}.pf-col2{grid-column:1/-1}.pf-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--pf-muted)}.pf-input{width:100%;border-radius:12px;border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.9);padding:11px 14px;font-size:13.5px;color:var(--pf-text);outline:none;font-family:inherit;transition:border-color .18s,box-shadow .18s}.dark .pf-input{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}.pf-input::placeholder{color:var(--pf-muted)}.pf-input:focus{border-color:var(--pf-accent);box-shadow:0 0 0 3px var(--pf-asoft)}.pf-textarea{min-height:92px;resize:vertical;line-height:1.6}.pf-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-top:1px solid var(--pf-border)}.pf-toggle-t{font-size:13.5px;font-weight:600;color:var(--pf-text)}.pf-switch{position:relative;width:44px;height:26px;border-radius:999px;border:none;cursor:pointer;background:var(--pf-bstrong);transition:background .2s;flex-shrink:0}.pf-switch.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 4px 12px rgba(244,97,15,.35)}.pf-switch span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}.pf-switch.on span{left:21px}.pf-form-actions{display:flex;gap:11px;margin-top:20px;flex-wrap:wrap}.pf-empty{text-align:center;padding:30px 16px}.pf-empty-ic{display:inline-flex;width:52px;height:52px;border-radius:16px;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent);margin-bottom:12px}.pf-empty-t{font-size:14px;font-weight:700;color:var(--pf-text)}.pf-addr-list{display:flex;flex-direction:column;gap:12px}.pf-addr{border-radius:16px;padding:16px;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.42);transition:border-color .2s}.dark .pf-addr{background:rgba(255,255,255,.04)}.pf-addr.def{border:1.5px solid var(--pf-accent);background:var(--pf-asoft)}.pf-addr-label{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--pf-text);margin-bottom:8px;flex-wrap:wrap}.pf-addr-ic{display:inline-flex;width:28px;height:28px;border-radius:9px;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent)}.pf-addr-line{font-size:13px;line-height:1.7;color:var(--pf-text2)}.pf-addr-edit{display:flex;flex-direction:column;gap:9px;margin-top:4px}.pf-addr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.pf-badge-soft{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;background:var(--pf-accent);color:#fff}.pf-btn-danger{display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(220,38,38,.4);background:rgba(220,38,38,.08);color:#dc2626;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.18s}.pf-btn-danger:hover{background:rgba(220,38,38,.16)}.pf-hero{position:relative;overflow:hidden;border-radius:22px;padding:26px;color:#fff;background:linear-gradient(120deg,#f4610f,#ff9d4d 60%,#ffb36b);box-shadow:0 16px 44px rgba(244,97,15,.4)}.pf-hero-glow{position:absolute;top:-40%;right:-8%;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 70%);pointer-events:none}.pf-hero-top{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;opacity:.92;position:relative;z-index:1}.pf-hero-pts{font-size:44px;font-weight:800;line-height:1.05;letter-spacing:-.02em;margin-top:4px;position:relative;z-index:1}.pf-hero-pts span{font-size:20px;font-weight:700;opacity:.85}.pf-hero-sub{font-size:13.5px;opacity:.92;margin:4px 0 18px;position:relative;z-index:1}.pf-hero-bar{position:relative;z-index:1;border-radius:14px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);padding:13px}.pf-hero-bar-head{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:8px}.pf-hero-track{height:8px;border-radius:999px;background:rgba(255,255,255,.28);overflow:hidden}.pf-hero-fill{height:100%;border-radius:999px;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.7);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}.pf-tier-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media(max-width:900px){.pf-tier-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.pf-tier-grid{grid-template-columns:1fr}}.pf-tier{border-radius:16px;padding:16px;text-align:center;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.4)}.dark .pf-tier{background:rgba(255,255,255,.04)}.pf-tier.on{border:1.5px solid var(--pf-accent);background:var(--pf-asoft);box-shadow:0 8px 22px rgba(244,97,15,.2)}.pf-tier-ic{display:inline-flex;width:48px;height:48px;border-radius:14px;align-items:center;justify-content:center;color:var(--pf-muted);margin-bottom:10px}.pf-tier.on .pf-tier-ic{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 6px 16px rgba(244,97,15,.4)}.pf-tier-name{font-size:15px;font-weight:800;color:var(--pf-text)}.pf-tier-range{font-size:11.5px;color:var(--pf-muted);margin-top:2px}.pf-tier-perk{font-size:12px;color:var(--pf-text2);margin-top:6px}.pf-tier-badge{display:inline-flex;margin-top:11px;padding:4px 11px;border-radius:999px;font-size:10px;font-weight:700;background:var(--pf-accent);color:#fff}.pf-hist{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--pf-border)}.pf-hist:first-of-type{border-top:none}.pf-hist-label{font-size:13px;font-weight:600;color:var(--pf-text)}.pf-hist-pts{font-size:13.5px;font-weight:800}.pf-hist-pts.pos{color:#16a34a}.pf-hist-pts.neg{color:#dc2626}
.pf-profile-grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start}@media(max-width:1023px){.pf-profile-grid{grid-template-columns:1fr}}.pf-summary{margin-top:16px;border-top:1px solid var(--pf-border);padding-top:14px;text-align:left}.pf-summary-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0}.pf-summary-v{font-size:12.5px;font-weight:700;color:var(--pf-text)}.pf-lang{display:inline-flex;gap:5px}.pf-lang-btn{border:1px solid var(--pf-bstrong);background:transparent;color:var(--pf-text2);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}.pf-lang-btn.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(244,97,15,.3)}.pf-addr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:768px){.pf-addr-grid{grid-template-columns:1fr}}.pf-type-toggle{display:flex;gap:8px}.pf-type-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--pf-bstrong);background:transparent;color:var(--pf-text2);border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}.pf-type-btn.on{background:var(--pf-asoft);color:var(--pf-accent);border-color:var(--pf-accent)}.pf-phone{display:flex;align-items:center;border-radius:12px;border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.9);overflow:hidden;transition:border-color .18s,box-shadow .18s}.dark .pf-phone{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}.pf-phone:focus-within{border-color:var(--pf-accent);box-shadow:0 0 0 3px var(--pf-asoft)}.pf-phone.invalid{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.12)}.pf-phone-country{display:flex;align-items:center;gap:6px;padding:11px 12px;background:var(--pf-asoft);border:none;border-right:1px solid var(--pf-bstrong);color:var(--pf-text);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}.pf-phone-input{flex:1;min-width:0;border:none;background:transparent;padding:11px 14px;font-size:13.5px;color:var(--pf-text);outline:none;font-family:inherit}.pf-phone-input::placeholder{color:var(--pf-muted)}.pf-phone-err{margin-top:6px;font-size:11.5px;font-weight:600;color:#dc2626}.pf-phone-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:30;max-height:240px;overflow-y:auto;border-radius:14px;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);padding:6px}.pf-phone-opt{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border:none;background:transparent;border-radius:10px;font-size:13px;color:var(--pf-text);cursor:pointer;font-family:inherit;text-align:left}.pf-phone-opt:hover{background:var(--pf-asoft)}.pf-phone-dial{font-size:12px;color:var(--pf-muted);font-weight:600}
.pf-pay-form{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;margin-bottom:6px}.pf-info-note{display:flex;gap:12px;align-items:flex-start;margin-top:18px;padding:14px;border-radius:14px;background:var(--pf-asoft);border:1px solid var(--pf-aring)}.pf-info-ic{display:inline-flex;width:34px;height:34px;flex-shrink:0;border-radius:10px;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff}.pf-vendor-active{display:flex;gap:13px;align-items:flex-start;padding:16px;border-radius:16px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);margin-bottom:6px}.pf-vendor-ic{display:inline-flex;width:44px;height:44px;flex-shrink:0;border-radius:13px;align-items:center;justify-content:center;background:linear-gradient(135deg,#34d399,#059669);color:#fff;box-shadow:0 6px 16px rgba(5,150,105,.35)}.pf-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}@media(max-width:768px){.pf-benefits{grid-template-columns:1fr}}.pf-benefit{display:flex;gap:11px;align-items:flex-start;padding:14px;border-radius:14px;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.4)}.dark .pf-benefit{background:rgba(255,255,255,.04)}.pf-benefit-ic{display:inline-flex;width:38px;height:38px;flex-shrink:0;border-radius:12px;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.35)}.pf-benefit-t{font-size:13.5px;font-weight:700;color:var(--pf-text)}.pf-ref-code{font-size:18px;font-weight:800;letter-spacing:.06em;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff}.pf-step{display:flex;align-items:flex-start;gap:11px;font-size:13px;color:var(--pf-text2);padding:7px 0}.pf-step-n{flex-shrink:0;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff}

/* ─── Ajouts pour les pages panier / paiement ─── */
.pf-page{min-height:100vh;padding:20px 14px 96px}
@media(min-width:640px){.pf-page{padding:28px 20px 60px}}
.pf-wrap{max-width:1160px;margin:0 auto}
.pf-flex{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.pf-main{flex:1 1 470px;min-width:0;display:flex;flex-direction:column;gap:16px}
.pf-side{flex:1 1 320px;max-width:100%;position:sticky;top:20px}

.pf-line{display:flex;gap:14px;padding:15px;border-top:1px solid var(--pf-border);transition:opacity .2s}
.pf-line:first-of-type{border-top:none}
.pf-line.off{opacity:.5}
.pf-thumb{width:74px;height:74px;flex-shrink:0;border-radius:16px;overflow:hidden;background:var(--pf-s3);
  border:1px solid var(--pf-border);display:flex;align-items:center;justify-content:center;color:var(--pf-accent)}
.pf-thumb img{width:100%;height:100%;object-fit:cover}
.pf-qty{display:inline-flex;align-items:center;border:1px solid var(--pf-bstrong);border-radius:999px}
.pf-qty button{width:30px;height:30px;border:0;background:none;color:var(--pf-text2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;border-radius:50%;font-family:inherit}
.pf-qty button:hover{background:var(--pf-asoft);color:var(--pf-accent)}
.pf-qty span{width:26px;text-align:center;font-size:13px;font-weight:700;color:var(--pf-text)}
.pf-tick{width:20px;height:20px;flex-shrink:0;margin-top:3px;border-radius:7px;border:1.5px solid var(--pf-bstrong);
  background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:transparent}
.pf-tick.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));border-color:transparent;color:#fff}
.pf-del{width:28px;height:28px;flex-shrink:0;border:0;border-radius:50%;background:none;color:var(--pf-muted);
  cursor:pointer;display:flex;align-items:center;justify-content:center}
.pf-del:hover{background:rgba(217,45,32,.1);color:#d92d20}
.pf-tag{font-size:10.5px;font-weight:600;color:var(--pf-text2);background:var(--pf-s3);
  border:1px solid var(--pf-border);padding:3px 10px;border-radius:999px}
.pf-total-row{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.pf-total-row b{font-size:25px;font-weight:800;color:var(--pf-accent);letter-spacing:-.02em}
.pf-btn-block{width:100%;justify-content:center;padding:14px 18px;font-size:13.5px;margin-top:10px}
.pf-xsell{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;overscroll-behavior-x:contain;
  scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:var(--pf-bstrong) transparent}
/* Rail discret, pouce arrondi qui prend l'accent au survol.
   Les fleches natives Windows sont retirees : elles cassaient le rythme. */
.pf-xsell::-webkit-scrollbar{height:8px}
.pf-xsell::-webkit-scrollbar-button{display:none;width:0;height:0}
.pf-xsell::-webkit-scrollbar-track{background:var(--pf-s3);border-radius:999px;margin:0 2px}
.pf-xsell::-webkit-scrollbar-thumb{background:var(--pf-bstrong);border-radius:999px;
  border:2px solid transparent;background-clip:padding-box;transition:background .2s}
.pf-xsell::-webkit-scrollbar-thumb:hover{background:linear-gradient(90deg,var(--pf-accent2),var(--pf-accent));
  background-clip:padding-box}
.pf-xsell:hover{scrollbar-color:var(--pf-accent) transparent}
.pf-xcard{width:132px;flex-shrink:0;scroll-snap-align:start}
.pf-xcard .img{height:96px;border-radius:14px;overflow:hidden;border:1px solid var(--pf-border);
  background:var(--pf-s3);display:flex;align-items:center;justify-content:center;margin-bottom:8px}
.pf-xcard .img img{width:100%;height:100%;object-fit:cover}

/* ─── Feuille modale de paiement ─── */
.pf-backdrop{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;
  background:rgba(20,10,5,.55);backdrop-filter:blur(6px)}
@media(min-width:640px){.pf-backdrop{align-items:center;padding:24px}}
.pf-sheet{width:100%;max-width:460px;max-height:94vh;overflow-y:auto;border-radius:28px 28px 0 0;padding:20px 18px 24px;
  background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);
  border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);animation:pfUp .38s cubic-bezier(.22,.61,.36,1) both}
@media(min-width:640px){.pf-sheet{border-radius:28px}}
.pf-sheet::before{content:"";display:block;width:42px;height:4px;border-radius:999px;background:var(--pf-bstrong);margin:0 auto 16px}
@media(min-width:640px){.pf-sheet::before{display:none}}
.pf-x{width:34px;height:34px;flex-shrink:0;border-radius:12px;border:1px solid var(--pf-bstrong);background:transparent;
  color:var(--pf-text);display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit}
.pf-x:hover{background:var(--pf-asoft);color:var(--pf-accent)}

.pf-hero{border-radius:24px;padding:20px;color:#fff;position:relative;overflow:hidden;
  background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 20px 44px -20px rgba(244,97,15,.75)}
.pf-hero i{position:absolute;top:-70px;right:-46px;width:190px;height:190px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.45),transparent 66%);animation:pfBlob 5.5s ease-in-out infinite}
@keyframes pfBlob{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.85;transform:scale(1.14)}}
.pf-hero-k{position:relative;font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.78}
.pf-hero-v{position:relative;margin-top:8px;font-size:36px;font-weight:800;letter-spacing:-.03em}
.pf-hero-v span{font-size:14px;opacity:.75;margin-left:6px}

.pf-opt{display:flex;align-items:center;gap:14px;width:100%;padding:15px;border-radius:20px;cursor:pointer;text-align:left;
  font-family:inherit;background:var(--pf-glass);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);
  transition:transform .18s,border-color .18s,box-shadow .18s;margin-bottom:11px}
.pf-opt:hover{transform:translateY(-2px)}
.pf-opt.on{border:1.5px solid var(--pf-accent);box-shadow:0 14px 32px -14px rgba(244,97,15,.5)}
.pf-opt:focus-visible{outline:2px solid var(--pf-accent);outline-offset:2px}
.pf-radio{width:26px;height:26px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:var(--pf-s3);color:transparent;transition:.2s}
.pf-opt.on .pf-radio{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.4)}

/* ─── Attente USSD ─── */
.pf-ring{position:relative;width:172px;height:172px;margin:26px auto 0;display:flex;align-items:center;justify-content:center}
.pf-ring i{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--pf-aring);animation:pfPulse 2.6s ease-out infinite}
.pf-ring i:nth-of-type(2){animation-delay:.9s}.pf-ring i:nth-of-type(3){animation-delay:1.8s}
@keyframes pfPulse{0%{transform:scale(.8);opacity:.6}75%,100%{transform:scale(1.5);opacity:0}}
.pf-ring svg.track{position:absolute;inset:0;transform:rotate(-90deg)}
.pf-ring .core{width:108px;height:108px;border-radius:50%;background:var(--pf-glass);border:1px solid var(--pf-glass-border);
  display:flex;align-items:center;justify-content:center;box-shadow:var(--pf-shadow);color:var(--pf-accent);
  animation:pfFloat 3.4s ease-in-out infinite}
@keyframes pfFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.pf-timer{margin-top:15px;display:inline-flex;align-items:center;gap:8px;background:var(--pf-glass);
  border:1px solid var(--pf-glass-border);padding:9px 16px;border-radius:999px;font-size:12.5px;color:var(--pf-text2)}
.pf-timer b{color:var(--pf-text);font-variant-numeric:tabular-nums}
.pf-flow{margin-top:22px;border-radius:20px;padding:16px;background:var(--pf-glass);border:1px solid var(--pf-glass-border);
  box-shadow:var(--pf-shadow);display:flex;flex-direction:column;gap:14px}
.pf-flow-row{display:flex;gap:12px;align-items:center;font-size:12.5px;color:var(--pf-text2)}
.pf-flow-row.now{color:var(--pf-text);font-weight:700}
.pf-flow-row.wait{opacity:.45}
.pf-flow-ic{width:24px;height:24px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:#128a45;color:#fff}
.dark .pf-flow-ic{background:#3ddc84;color:#0e0b12}
.pf-flow-ic.spin{background:transparent;border:2px solid var(--pf-asoft);border-top-color:var(--pf-accent);animation:pfSpin .8s linear infinite}
@keyframes pfSpin{to{transform:rotate(360deg)}}
.pf-flow-ic.idle{background:transparent;border:1.5px dashed var(--pf-bstrong)}

/* ─── Issues ─── */
.pf-ok-badge{width:106px;height:106px;margin:14px auto 0;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:var(--pf-glass);border:1px solid rgba(18,138,69,.24);box-shadow:var(--pf-shadow);color:#128a45;
  animation:pfBoing .55s cubic-bezier(.34,1.56,.64,1) both}
.dark .pf-ok-badge{color:#3ddc84}
@keyframes pfBoing{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
.pf-ok-badge path{stroke-dasharray:70;stroke-dashoffset:70;animation:pfTrace .7s ease-out .18s forwards}
.pf-ok-badge path:last-child{stroke-dasharray:26;stroke-dashoffset:26;animation:pfTrace .42s ease-out .62s forwards}
@keyframes pfTrace{to{stroke-dashoffset:0}}
.pf-err-badge{width:100px;height:100px;margin:14px auto 0;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:rgba(217,45,32,.1);border:1px solid rgba(217,45,32,.22);color:#d92d20;animation:pfBoing .48s cubic-bezier(.34,1.56,.64,1) both}
.dark .pf-err-badge{color:#ff6b5e;background:rgba(255,107,94,.12);border-color:rgba(255,107,94,.24)}
.pf-note-ok{display:flex;gap:12px;align-items:flex-start;margin-top:16px;padding:14px;border-radius:14px;
  background:rgba(18,138,69,.1);border:1px solid rgba(18,138,69,.22);font-size:11.5px;line-height:1.55;color:var(--pf-text2)}
.dark .pf-note-ok{background:rgba(61,220,132,.1);border-color:rgba(61,220,132,.22)}
.pf-note-ok b{color:var(--pf-text)}
.pf-badge-state{font-size:10.5px;font-weight:800;padding:6px 12px;border-radius:999px;white-space:nowrap}
.pf-badge-state.ok{color:#128a45;background:rgba(18,138,69,.12);border:1px solid rgba(18,138,69,.24)}
.dark .pf-badge-state.ok{color:#3ddc84}
.pf-badge-state.err{color:#d92d20;background:rgba(217,45,32,.1);border:1px solid rgba(217,45,32,.22)}
.dark .pf-badge-state.err{color:#ff6b5e}
.pf-badge-state.wait{color:var(--pf-accent);background:var(--pf-asoft);border:1px solid var(--pf-aring)}
.pf-badge-state.mut{color:var(--pf-muted);background:var(--pf-s3);border:1px solid var(--pf-border)}
/* .pf-btn-danger vient deja du CSS du profil : on n'ajoute que la variante
   sombre, absente jusqu'ici, sans toucher aux valeurs claires existantes. */
.dark .pf-btn-danger{color:#ff6b5e;border-color:rgba(255,107,94,.3);background:rgba(255,107,94,.1)}
.dark .pf-btn-danger:hover{background:rgba(255,107,94,.18)}

/* Sert uniquement de crochet a l'impression du recu. */
.pf-noprint{}

/* CORRECTIF : ne jamais laisser un élément animé invisible */
@media(prefers-reduced-motion:reduce){
  .pf-root *,.pf-sheet *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .pf-anim{opacity:1!important}
}

/* ─── Document A4 (reçu / facture) ─── */
/* A4 exact : 210×297 mm à 96 dpi = 794×1123 px. Cachée a l'ecran, sort a l'impression. */
.pf-a4{width:794px;height:1123px;background:#fff;color:#1a1420;border-radius:6px;overflow:hidden;
  box-shadow:0 40px 90px -30px rgba(0,0,0,.6);display:flex;flex-direction:column;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.pf-a4-head{padding:44px 52px 30px;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;
  position:relative;overflow:hidden}
.pf-a4-head i{position:absolute;top:-90px;right:-60px;width:260px;height:260px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.4),transparent 68%)}
.pf-a4-body{flex:1;padding:34px 52px 0;display:flex;flex-direction:column}
.pf-a4-foot{padding:22px 52px 34px;border-top:1px solid rgba(26,20,32,.1);display:flex;align-items:center;gap:16px}
.pf-a4-k{font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(26,20,32,.42)}
.pf-a4-v{margin-top:6px;font-size:13.5px;font-weight:700;color:#1a1420}
.pf-a4-tbl{width:100%;border-collapse:collapse;margin-top:8px}
.pf-a4-tbl th{text-align:left;font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(26,20,32,.42);padding:0 0 10px;border-bottom:1.5px solid rgba(26,20,32,.14)}
.pf-a4-tbl td{padding:13px 0;font-size:13px;border-bottom:1px solid rgba(26,20,32,.08);vertical-align:top}
.pf-a4-tbl td.num,.pf-a4-tbl th.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.pf-a4-sum{margin:22px 0 0 auto;width:290px}
.pf-a4-sum div{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:rgba(26,20,32,.62)}
.pf-a4-sum div b{color:#1a1420;font-weight:600}
.pf-a4-sum div.total{margin-top:8px;padding-top:13px;border-top:1.5px solid rgba(26,20,32,.14);font-size:15px;color:#1a1420;font-weight:700}
.pf-a4-sum div.total b{font-size:22px;font-weight:800;color:var(--pf-accent);letter-spacing:-.02em}
.pf-a4-stamp{position:absolute;right:52px;bottom:-26px;display:inline-flex;align-items:center;gap:8px;
  background:#fff;border-radius:999px;padding:10px 18px;font-size:12px;font-weight:800;color:#128a45;
  box-shadow:0 10px 30px -12px rgba(0,0,0,.35)}

.pf-print-only{display:none}
@page{size:A4;margin:0}
@media print{
  body>*{display:none!important}
  #pf-doc-root{display:block!important;position:static!important;background:#fff!important}
  #pf-doc-root .pf-screen-only{display:none!important}
  #pf-doc-root .pf-print-only{display:block!important}
  #pf-doc-root .pf-a4{width:210mm!important;height:297mm!important;border-radius:0!important;box-shadow:none!important}
}
`;

let injected = false;

/** Injecte le shell une seule fois. À monter en haut de chaque page de l'espace client. */
export function PfShellStyles() {
  if (typeof document !== "undefined" && !injected) {
    const el = document.createElement("style");
    el.id = "belivay-pf-shell";
    el.textContent = PF_CSS;
    document.head.appendChild(el);
    injected = true;
  }
  return null;
}
