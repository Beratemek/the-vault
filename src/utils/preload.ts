
/**
 * Preloads critical application data to improve perceived performance.
 * Call this function when the app initializes or when the user is idle.
 */
export const preloadData = async (token: string) => {
    if (!token) return;

    // List of critical endpoints to prefetch
    const endpoints = [
        '/api/users/my-likes', // For Likes Page
        '/api/users/liked-me', // For Likes Page
        '/api/auth/me'         // For Profile/Membership check
        // '/api/users/feed'   // Add main feed endpoint here if identified
    ];

    console.log('[Performance] Starting background data preload...');

    endpoints.forEach(url => {
        fetch(url, { headers: { 'Authorization': token } })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Specific caching strategies
                    if (url === '/api/users/my-likes') {
                        // Update local backup for "Beğendiklerim"
                        localStorage.setItem('vault_likes_backup', JSON.stringify(data.users));
                    }
                    // We can add more caching logic here for other endpoints
                }
            })
            .catch(err => {
                // Silent fail for preload
                // console.warn('Preload failed for:', url);
            });
    });
};
