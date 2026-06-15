export const trackEvent = async (eventName: string, data: any = {}) => {
  // Generate a unique event ID for deduplication between Pixel and CAPI
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Browser Pixel Track
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, data, { eventID: eventId });
  }

  // 2. Server-side CAPI Track (via our proxy)
  try {
    const fbp = typeof document !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1] : '';
    const fbc = typeof document !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1] : '';

    const response = await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: typeof window !== 'undefined' ? window.location.href : '',
        user_data: {
          client_ip_address: '', // Server will handle if needed
          client_user_agent: navigator.userAgent,
          fbp: fbp,
          fbc: fbc,
        },
        custom_data: data,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Tracking API error:', response.status, errText);
    }
  } catch (error) {
    console.error('Tracking network error:', error);
  }
};
