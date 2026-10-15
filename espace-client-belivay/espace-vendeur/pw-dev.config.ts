import base from './playwright.config'
// Tests contre le serveur de développement déjà lancé (npm run dev, port 5174), sans construction.
export default { ...base, webServer: undefined, use: { ...base.use, baseURL: 'http://localhost:5174/vendeur/' }, outputDir: '/tmp/pw-dev-vendeur' }
