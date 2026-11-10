// Ruban « Démonstration » des espaces vendeur, entreprise, livreur, relais et console — DEV-SRV-01, règle R6 :
// « Bandeau « Démonstration » sur la vitrine ». Le client a déjà son bandeau (BandeauDemo) ; les cinq autres espaces,
// que les agents montrent aux vendeurs et aux partenaires, n'avaient rien. Toujours visible, il ne se ferme pas et ne
// gêne aucun geste (pointer-events: none). Rien hors du déploiement de démonstration (VITE_DEMO=1).

export function RubanDemo() {
  if (import.meta.env.VITE_DEMO !== '1') return null
  const anglais = typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')
  return (
    <div
      role="status"
      data-ruban-demo
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, pointerEvents: 'none',
        background: '#B45309', color: '#fff', textAlign: 'center',
        font: '700 11px/1.6 system-ui, sans-serif', letterSpacing: '.04em',
        padding: 'calc(env(safe-area-inset-top) + 1px) 8px 1px',
      }}
    >
      {anglais
        ? 'DEMO — examples only: no real account, order or payment'
        : 'DÉMONSTRATION — exemples seulement : aucun compte, aucune commande, aucun paiement réels'}
    </div>
  )
}
