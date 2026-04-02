/**
 * js/api/auth.js
 * Handles AniList OAuth2 Implicit Grant authentication.
 */

const CLIENT_ID = import.meta.env.VITE_AL_CLIENT_ID;
const REDIRECT_URI = window.location.origin + window.location.pathname;

export const auth = {
  /**
   * Initiates the AniList login redirect.
   */
  login() {
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token`;
    window.location.href = authUrl;
  },

  /**
   * Checks for and parses an access token from the URL hash.
   * If found, saves it and cleans the URL.
   */
  handleCallback() {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    
    if (token) {
      sessionStorage.setItem('al_access_token', token);
      // Clean URL hash without reloading
      history.replaceState(null, null, window.location.pathname + window.location.search);
      return token;
    }
    return null;
  },

  /**
   * Retrieves the current stored access token.
   */
  getToken() {
    return sessionStorage.getItem('al_access_token');
  },

  /**
   * Clears the stored access token.
   */
  logout() {
    sessionStorage.removeItem('al_access_token');
  },

  /**
   * Returns true if a token exists.
   */
  isLoggedIn() {
    return !!this.getToken();
  }
};
