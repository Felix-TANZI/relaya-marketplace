// frontend/src/i18n/domains/mdp.en.ts
// i18n domain — "Forgot password" and "New password", shared by the six portals (DEV-SRV-01 T07-5).
export default {
  mdp_oubli: {
    title: 'Forgot password',
    subtitle: 'Enter your phone number or your email: we will send you a link to choose a new one.',
    field: 'Phone number or email',
    placeholder: '6XX XXX XXX or name@example.cm',
    submit: 'Get the link',
    sending: 'Sending…',
    sent_title: 'Link sent',
    sent_sms: 'If an account matches, a link has just been sent by SMS to {{destination}}. It is valid for {{minutes}} minutes, once.',
    sent_email: 'If an account matches, a link has just been sent to {{destination}}. It is valid for {{minutes}} minutes, once.',
    error: 'The request could not be sent. Please try again in a moment.',
    back_to_login: 'Back to sign in',
    security_tip: 'BelivaY never asks for your password or your Mobile Money code by message.',

    new_title: 'New password',
    new_subtitle: 'Choose your new password. Your other sessions will be closed.',
    new_field: 'New password',
    new_confirm: 'Confirm the password',
    new_mismatch: 'The two passwords do not match.',
    new_submit: 'Save',
    new_saving: 'Saving…',
    new_done_title: 'Password changed',
    new_done_body: 'Sign in with your new password.',
    new_missing_link: 'This link is incomplete. Ask for a new link.',
    new_ask_again: 'Ask for a new link',
    new_error: 'The password could not be changed.',
  },
};
