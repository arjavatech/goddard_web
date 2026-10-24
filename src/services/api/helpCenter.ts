import { authedFetch, z } from './common';

export const submitHelpMessage = (body: {
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string;
}) => authedFetch({ method: 'POST', url: '/help-center/messages', body }, z.any());
