// frontend/src/services/api/contact.ts
// Service API pour l'envoi de messages de contact

import { http } from './http';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export const contactApi = {
  /**
   * Envoyer un message de contact
   */
  async sendMessage(data: ContactFormData): Promise<ContactResponse> {
    return http<ContactResponse>('/api/contact/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};