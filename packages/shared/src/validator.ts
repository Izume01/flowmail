export const isValidRecipient = (email: string): boolean => {
  if (!email || !email.includes('@')) return false;
  
  const disposableDomains = [
    'mailinator.com',
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'trashmail.com'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  return !disposableDomains.includes(domain);
};
