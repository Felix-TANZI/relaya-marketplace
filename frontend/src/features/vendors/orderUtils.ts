// frontend/src/features/vendors/orderUtils.ts
// Utilitaires pour l'export CSV et la génération de factures HTML imprimables.

import type { VendorOrder } from '@/services/api/vendors';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function fmtXAF(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
}
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}
export function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

const FULFILL_LABELS: Record<string, string> = {
  PENDING:    'Confirmée',
  PROCESSING: 'En préparation',
  SHIPPED:    'Prête',
  DELIVERED:  'Livrée',
  CANCELLED:  'Annulée',
};
const PAYMENT_LABELS: Record<string, string> = {
  PENDING:  'En attente',
  PAID:     'Payée',
  FAILED:   'Échouée',
  REFUNDED: 'Remboursée',
};

// ─────────────────────────────────────────────
// EXPORT CSV
// ─────────────────────────────────────────────

export function exportOrdersCSV(orders: VendorOrder[], shopName: string): void {
  const header = [
    'Référence',
    'Date',
    'Client',
    'Téléphone',
    'Ville',
    'Adresse',
    'Statut livraison',
    'Statut paiement',
    'Articles',
    'Sous-total (FCFA)',
    'Livraison (FCFA)',
    'Total vendeur (FCFA)',
  ];

  const rows = orders.map(o => {
    const articles = (o.items ?? [])
      .map(i => `${i.product_title} x${i.qty}`)
      .join(' | ');

    return [
      orderRef(o.id),
      fmtDate(o.created_at),
      o.customer_name,
      o.customer_phone ?? '',
      o.city,
      o.address ?? '',
      FULFILL_LABELS[o.fulfillment_status] ?? o.fulfillment_status,
      PAYMENT_LABELS[o.payment_status] ?? o.payment_status,
      articles,
      Math.round(o.subtotal_xaf ?? 0),
      Math.round(o.delivery_fee_xaf ?? 0),
      Math.round(o.vendor_total ?? 0),
    ];
  });

  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    `# Commandes — ${shopName} — ${new Date().toLocaleDateString('fr-FR')}`,
    header.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `commandes-belivay-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// FACTURE HTML IMPRIMABLE — design premium, compatible impression
// print-color-adjust: exact force les couleurs en PDF/impression.
// ─────────────────────────────────────────────

export function openInvoice(orders: VendorOrder[], shopName: string): void {

  // ── Génère le HTML d'une facture individuelle ──
  const buildInvoice = (o: VendorOrder, isLast: boolean): string => {
    const items    = o.items ?? [];
    const subtotal = o.subtotal_xaf     ?? 0;
    const delivery = o.delivery_fee_xaf ?? 0;
    const total    = o.vendor_total     ?? subtotal;
    const isPaid   = o.payment_status === 'PAID';
    const isDone   = o.fulfillment_status === 'DELIVERED';

    const rowsHtml = items.map(i => `
      <tr>
        <td class="td-product">${i.product_title ?? '—'}</td>
        <td class="td-center">${i.qty}</td>
        <td class="td-right">${Math.round(i.product_price ?? i.price_xaf_snapshot ?? 0).toLocaleString('fr-FR')} FCFA</td>
        <td class="td-right td-bold">${Math.round(i.line_total_xaf ?? 0).toLocaleString('fr-FR')} FCFA</td>
      </tr>`).join('');

    const statusPayHtml = isPaid
      ? `<span class="badge badge-green">Paiement : ${PAYMENT_LABELS[o.payment_status] ?? o.payment_status}</span>`
      : `<span class="badge badge-amber">Paiement : ${PAYMENT_LABELS[o.payment_status] ?? o.payment_status}</span>`;

    const statusFulHtml = isDone
      ? `<span class="badge badge-green">Livraison : ${FULFILL_LABELS[o.fulfillment_status] ?? o.fulfillment_status}</span>`
      : `<span class="badge badge-orange">Livraison : ${FULFILL_LABELS[o.fulfillment_status] ?? o.fulfillment_status}</span>`;

    return `
    <div class="invoice${isLast ? '' : ' page-break'}">

      <!-- ══ EN-TÊTE ══ -->
      <div class="header">
        <!-- Gauche : logo + marque -->
        <div class="header-brand">
          <div class="logo-box">B</div>
          <div>
            <div class="brand-name">BelivaY</div>
            <div class="brand-sub">Marketplace Cameroun</div>
          </div>
        </div>
        <!-- Droite : facture info -->
        <div class="header-info">
          <div class="facture-label">FACTURE</div>
          <div class="facture-ref">${orderRef(o.id)}</div>
          <div class="facture-date">Date : ${fmtDate(o.created_at)}</div>
        </div>
      </div>

      <!-- ══ LIGNE ORANGE ══ -->
      <div class="orange-bar"></div>

      <!-- ══ PARTIES ══ -->
      <div class="parties">
        <div class="party">
          <div class="party-label">VENDEUR</div>
          <div class="party-name">${shopName}</div>
          <div class="party-detail">BelivaY Marketplace</div>
          <div class="party-detail">belivay.com</div>
        </div>
        <div class="party-divider"></div>
        <div class="party">
          <div class="party-label">CLIENT</div>
          <div class="party-name">${o.customer_name}</div>
          ${o.customer_phone ? `<div class="party-detail">${o.customer_phone}</div>` : ''}
          ${o.customer_email ? `<div class="party-detail">${o.customer_email}</div>` : ''}
          <div class="party-detail">${o.city}${o.address ? `, ${o.address}` : ''}</div>
        </div>
      </div>

      <!-- ══ BADGES STATUT ══ -->
      <div class="statuses">
        ${statusPayHtml}
        ${statusFulHtml}
      </div>

      <!-- ══ TABLEAU ARTICLES ══ -->
      <table class="table">
        <thead>
          <tr>
            <th class="th-left">PRODUIT</th>
            <th class="th-center">QTÉ</th>
            <th class="th-right">PRIX UNIT.</th>
            <th class="th-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <!-- ══ TOTAUX ══ -->
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Sous-total</span>
          <span class="total-val">${Math.round(subtotal).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div class="total-row">
          <span class="total-label">Frais de livraison</span>
          <span class="total-val">${delivery === 0 ? 'Offerts' : Math.round(delivery).toLocaleString('fr-FR') + ' FCFA'}</span>
        </div>
        <div class="total-grand">
          <span class="grand-label">TOTAL</span>
          <span class="grand-val">${Math.round(total).toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <!-- ══ NOTE CLIENT ══ -->
      ${o.note ? `<div class="note"><strong>Note client :</strong> ${o.note}</div>` : ''}

      <!-- ══ PIED DE PAGE ══ -->
      <div class="footer">
        <span>Merci pour votre commande sur BelivaY !</span>
        <span>belivay.com · support@belivay.cm</span>
        <span>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>`;
  };

  const invoicesHtml = orders.map((o, i) => buildInvoice(o, i === orders.length - 1)).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Factures — ${shopName}</title>
  <style>
    /* ── RESET ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── VARIABLES ── */
    :root {
      --orange: #F47920;
      --dark:   #1A1209;
      --text:   #1A1209;
      --muted:  #7C6E5A;
      --light:  #F5F0E8;
      --border: #E0D8CE;
      --green:  #16A34A;
      --amber:  #D97706;
      --white:  #FFFFFF;
      --font:   'Segoe UI', Arial, Helvetica, sans-serif;
    }

    /* ── FORCER LES COULEURS À L'IMPRESSION ── */
    @media print {
      /* Forcer TOUS les backgrounds à s'imprimer */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      body {
        background: white !important;
        padding-top: 0 !important;
        margin: 0 !important;
      }

      .print-bar { display: none !important; }

      .invoice {
        box-shadow: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        page-break-after: always;
      }
      .invoice:last-child { page-break-after: avoid; }

      /* Header : forcer le dégradé à l'impression */
      .header {
        background: linear-gradient(135deg, #1C1209 0%, #3A200C 60%, #F47920 100%) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .brand-name { color: #FFFFFF !important; }
      .brand-sub  { color: rgba(255,255,255,0.65) !important; }
      .facture-label { color: rgba(255,255,255,0.55) !important; }
      .facture-ref   { color: #FFFFFF !important; }
      .facture-date  { color: rgba(255,255,255,0.7) !important; }

      /* Logo */
      .logo-box {
        background: #F47920 !important;
        color: #FFFFFF !important;
        border: 2px solid #F47920 !important;
      }

      /* Barre orange */
      .orange-bar { background: #F47920 !important; }

      /* Section parties */
      .parties { border-bottom: 1px solid #E0D8CE !important; }
      .party-divider { background: #E0D8CE !important; }
      .party-label   { color: #F47920 !important; }
      .party-name    { color: #1A1209 !important; }
      .party-detail  { color: #7C6E5A !important; }

      /* Badges statut */
      .statuses { background: #F5F0E8 !important; }
      .badge-green  { background: rgba(22,163,74,0.12)  !important; color: #16A34A !important; border: 1px solid rgba(22,163,74,0.2)  !important; }
      .badge-amber  { background: rgba(217,119,6,0.12)  !important; color: #D97706 !important; border: 1px solid rgba(217,119,6,0.2)  !important; }
      .badge-orange { background: rgba(244,121,32,0.12) !important; color: #F47920 !important; border: 1px solid rgba(244,121,32,0.2) !important; }

      /* Tableau */
      .table thead tr { background: #F5F0E8 !important; }
      .table th { color: #7C6E5A !important; }

      /* Total grand */
      .total-grand {
        background: #1A1209 !important;
        border-radius: 10px !important;
      }
      .grand-label { color: rgba(255,255,255,0.7) !important; }
      .grand-val   { color: #F47920 !important; }

      /* Note */
      .note {
        background: #F5F0E8 !important;
        border-left: 3px solid #F47920 !important;
      }

      /* Footer */
      .footer {
        background: #F5F0E8 !important;
        border-top: 1px solid #E0D8CE !important;
      }
    }

    /* ── BODY ── */
    body {
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
      background: #EBEBEB;
      padding-top: 56px;
    }

    /* ── BARRE D'ACTION (screen only) ── */
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: var(--dark);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; height: 56px;
      border-bottom: 3px solid var(--orange);
    }
    .print-bar-title { color: white; font-size: 13px; font-weight: 600; }
    .btn-print {
      background: var(--orange); color: white; border: none;
      padding: 9px 22px; border-radius: 10px;
      font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 0.02em;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #E06510; }
    .btn-close {
      background: transparent; color: rgba(255,255,255,0.6);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 9px 18px; border-radius: 10px;
      font-size: 13px; font-weight: 500; cursor: pointer; margin-left: 8px;
    }
    .btn-close:hover { color: white; border-color: rgba(255,255,255,0.5); }

    /* ── INVOICE WRAPPER ── */
    .invoice {
      background: var(--white);
      max-width: 760px;
      margin: 28px auto;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.14);
    }
    .page-break { page-break-after: always; }

    /* ── EN-TÊTE ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 32px 40px 28px;
      background: var(--white);
    }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .logo-box {
      width: 52px; height: 52px;
      background: var(--orange);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 900; color: white;
      flex-shrink: 0;
      /* Contour pour s'assurer que ça imprime bien */
      border: 2px solid var(--orange);
    }
    .brand-name { font-size: 26px; font-weight: 800; color: var(--dark); letter-spacing: -0.5px; }
    .brand-sub  { font-size: 11px; color: var(--muted); margin-top: 1px; }

    .header-info { text-align: right; }
    .facture-label {
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 4px;
    }
    .facture-ref {
      font-size: 28px; font-weight: 900;
      color: var(--dark); letter-spacing: -0.5px;
    }
    .facture-date { font-size: 12px; color: var(--muted); margin-top: 4px; }

    /* ── BARRE ORANGE ── */
    .orange-bar {
      height: 4px;
      background: var(--orange);
      margin: 0;
    }

    /* ── PARTIES ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      padding: 28px 40px;
      gap: 0;
      border-bottom: 1px solid var(--border);
    }
    .party-divider { background: var(--border); margin: 0 32px; }
    .party-label {
      font-size: 9.5px; font-weight: 800;
      letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--orange); margin-bottom: 10px;
    }
    .party-name   { font-size: 17px; font-weight: 700; color: var(--dark); margin-bottom: 6px; }
    .party-detail { font-size: 12.5px; color: var(--muted); line-height: 1.7; }

    /* ── BADGES STATUT ── */
    .statuses {
      padding: 14px 40px;
      background: var(--light);
      border-bottom: 1px solid var(--border);
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .badge {
      display: inline-block; font-size: 11.5px; font-weight: 700;
      padding: 5px 14px; border-radius: 999px;
    }
    .badge-green  { background: rgba(22,163,74,0.12);  color: var(--green);  border: 1px solid rgba(22,163,74,0.2);  }
    .badge-amber  { background: rgba(217,119,6,0.12);  color: var(--amber);  border: 1px solid rgba(217,119,6,0.2);  }
    .badge-orange { background: rgba(244,121,32,0.12); color: var(--orange); border: 1px solid rgba(244,121,32,0.2); }

    /* ── TABLEAU ARTICLES ── */
    .table { width: 100%; border-collapse: collapse; margin: 0; }
    .table thead tr {
      background: var(--light);
      border-top: 1px solid var(--border);
      border-bottom: 2px solid var(--border);
    }
    .table th {
      padding: 11px 12px;
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--muted);
    }
    .table th:first-child  { padding-left: 40px; text-align: left; }
    .table th:last-child   { padding-right: 40px; }
    .th-left   { text-align: left; }
    .th-center { text-align: center; }
    .th-right  { text-align: right; }

    .table td {
      padding: 14px 12px;
      font-size: 13.5px; color: var(--text);
      border-bottom: 1px solid var(--border);
    }
    .table td:first-child { padding-left: 40px; }
    .table td:last-child  { padding-right: 40px; }
    .td-product { font-weight: 500; }
    .td-center  { text-align: center; color: var(--muted); }
    .td-right   { text-align: right; }
    .td-bold    { font-weight: 700; }

    /* ── TOTAUX ── */
    .totals { padding: 20px 40px 8px; }
    .total-row {
      display: flex; justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid var(--border);
      font-size: 13.5px;
    }
    .total-label { color: var(--muted); }
    .total-val   { color: var(--text); font-weight: 500; }

    .total-grand {
      display: flex; justify-content: space-between; align-items: center;
      margin: 16px 0 20px;
      padding: 16px 24px;
      background: var(--dark);
      border-radius: 10px;
    }
    .grand-label {
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: rgba(255,255,255,0.7);
    }
    .grand-val {
      font-size: 24px; font-weight: 900;
      color: var(--orange); letter-spacing: -0.5px;
    }

    /* ── NOTE ── */
    .note {
      margin: 0 40px 20px;
      padding: 12px 16px;
      background: var(--light);
      border-left: 3px solid var(--orange);
      border-radius: 0 8px 8px 0;
      font-size: 12.5px; color: var(--muted);
    }

    /* ── PIED DE PAGE ── */
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 6px;
      padding: 16px 40px;
      background: var(--light);
      border-top: 1px solid var(--border);
      font-size: 11px; color: var(--muted);
    }
  </style>
</head>
<body>

  <!-- ── BARRE D'ACTION ── -->
  <div class="print-bar">
    <span class="print-bar-title">
      ${orders.length === 1
        ? `Facture — ${orderRef(orders[0].id)} · ${shopName}`
        : `${orders.length} factures · ${shopName}`}
    </span>
    <div>
      <button class="btn-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
      <button class="btn-close" onclick="window.close()">Fermer</button>
    </div>
  </div>

  ${invoicesHtml}
</body>
</html>`;

  // ── Injecter la facture dans un overlay plein écran (même onglet) ──

  // Supprimer un overlay précédent s'il existe déjà
  const existing = document.getElementById('blv-invoice-overlay');
  if (existing) existing.remove();

  // Créer l'iframe conteneur
  const overlay = document.createElement('div');
  overlay.id = 'blv-invoice-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:#EBEBEB',
    'display:flex', 'flex-direction:column',
    'overflow:hidden',
  ].join(';');

  // Barre d'actions native (hors iframe pour éviter les restrictions)
  const bar = document.createElement('div');
  bar.style.cssText = [
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'padding:0 24px', 'height:56px', 'flex-shrink:0',
    'background:#1A1209', 'border-bottom:3px solid #F47920',
  ].join(';');

  const title = document.createElement('span');
  title.style.cssText = 'color:white;font-size:13px;font-weight:600;font-family:inherit;';
  title.textContent = orders.length === 1
    ? `Facture — ${orderRef(orders[0].id)} · ${shopName}`
    : `${orders.length} factures · ${shopName}`;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:8px;';

  const btnPrint = document.createElement('button');
  btnPrint.textContent = 'Imprimer / Enregistrer en PDF';
  btnPrint.style.cssText = [
    'background:#F47920', 'color:white', 'border:none',
    'padding:9px 22px', 'border-radius:10px',
    'font-size:13px', 'font-weight:700', 'cursor:pointer',
    'font-family:inherit',
  ].join(';');

  const btnClose = document.createElement('button');
  btnClose.textContent = 'Fermer';
  btnClose.style.cssText = [
    'background:transparent', 'color:rgba(255,255,255,0.65)',
    'border:1px solid rgba(255,255,255,0.25)',
    'padding:9px 18px', 'border-radius:10px',
    'font-size:13px', 'font-weight:500', 'cursor:pointer',
    'font-family:inherit',
  ].join(';');

  btnGroup.appendChild(btnPrint);
  btnGroup.appendChild(btnClose);
  bar.appendChild(title);
  bar.appendChild(btnGroup);

  // iframe pour le contenu de la facture
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'flex:1;width:100%;border:none;background:#EBEBEB;';
  iframe.setAttribute('title', 'Facture BelivaY');

  // Assembler
  overlay.appendChild(bar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  // Écrire le HTML dans l'iframe (sans ouvrir de nouvel onglet)
  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // On retire la print-bar du HTML (on a la vraie barre native au-dessus)
  const htmlForIframe = html
    .replace(/<div class="print-bar[^>]*>[\s\S]*?<\/div>/, '')
    .replace(/body \{[^}]*padding-top: 56px[^}]*\}/, 'body { padding-top: 16px; }');

  iframeDoc.open();
  iframeDoc.write(htmlForIframe);
  iframeDoc.close();

  // Imprimer depuis l'iframe (préserve les styles @media print)
  btnPrint.addEventListener('click', () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  });

  // Fermer l'overlay
  const closeOverlay = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  btnClose.addEventListener('click', closeOverlay);

  // Bloquer le scroll de la page en dessous
  document.body.style.overflow = 'hidden';

  // Fermer avec Échap
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}