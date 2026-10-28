import base from './playwright.config'
// Configuration temporaire : tests contre le serveur de développement déjà lancé (5173), sans build.
export default { ...base, webServer: undefined, use: { ...base.use, baseURL: 'http://localhost:5173' }, outputDir: '/tmp/pw-dev' }
