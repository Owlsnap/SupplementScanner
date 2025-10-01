// CookieBot integration utility
export const initCookieBot = () => {
  const cookiebotId = import.meta.env.VITE_COOKIEBOT_ID;
  
  // Only load if ID is provided and not placeholder
  if (!cookiebotId || cookiebotId === 'YOUR-COOKIEBOT-ID') {
    console.warn('CookieBot ID not configured. Cookie consent will use fallback mode.');
    return;
  }

  // Check if script is already loaded
  if (document.getElementById('Cookiebot')) {
    return;
  }

  // Create and inject CookieBot script
  const script = document.createElement('script');
  script.id = 'Cookiebot';
  script.src = 'https://consent.cookiebot.com/uc.js';
  script.setAttribute('data-cbid', cookiebotId);
  script.setAttribute('data-blockingmode', 'auto');
  script.type = 'text/javascript';
  
  // Add to document head
  document.head.appendChild(script);
  
  console.log('CookieBot script loaded with ID:', cookiebotId);
};

export const getCookiebotId = () => {
  return import.meta.env.VITE_COOKIEBOT_ID;
};