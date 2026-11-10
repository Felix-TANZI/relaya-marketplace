// frontend/src/i18n/domains/mdp.fr.ts
// Domaine i18n — « Mot de passe oublié » et « Nouveau mot de passe », communs aux six portails (DEV-SRV-01 T07-5).
export default {
  mdp_oubli: {
    title: 'Mot de passe oublié',
    subtitle: 'Indiquez votre numéro de téléphone ou votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.',
    field: 'Numéro de téléphone ou e-mail',
    placeholder: '6XX XXX XXX ou nom@exemple.cm',
    submit: 'Recevoir le lien',
    sending: 'Envoi…',
    sent_title: 'Lien envoyé',
    sent_sms: 'Si un compte correspond, un lien vient de partir par SMS au {{destination}}. Il est valable {{minutes}} minutes, une seule fois.',
    sent_email: 'Si un compte correspond, un lien vient de partir à {{destination}}. Il est valable {{minutes}} minutes, une seule fois.',
    error: "La demande n'a pas pu être envoyée. Réessayez dans un instant.",
    back_to_login: 'Retour à la connexion',
    security_tip: 'BelivaY ne vous demande jamais votre mot de passe ni votre code Mobile Money par message.',

    new_title: 'Nouveau mot de passe',
    new_subtitle: 'Choisissez votre nouveau mot de passe. Vos autres sessions seront fermées.',
    new_field: 'Nouveau mot de passe',
    new_confirm: 'Confirmez le mot de passe',
    new_mismatch: 'Les deux mots de passe ne sont pas identiques.',
    new_submit: 'Enregistrer',
    new_saving: 'Enregistrement…',
    new_done_title: 'Mot de passe changé',
    new_done_body: 'Connectez-vous avec votre nouveau mot de passe.',
    new_missing_link: 'Ce lien est incomplet. Demandez un nouveau lien.',
    new_ask_again: 'Demander un nouveau lien',
    new_error: "Le mot de passe n'a pas pu être changé.",
  },
};
