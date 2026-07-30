/**
 * Service untuk mengurus Autentikasi SSO 
 * Mendukung mode MOCK (Pengujian Lokal) dan REAL (Production)
 */
const ssoService = {
  /**
   * Authenticate user dengan SSO / Mock SSO
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} Respon data user dari SSO
   */
  async loginSSO(username, password) {
    const mode = (process.env.SSO_MODE || "mock").toLowerCase();
    const port = process.env.PORT || 3001;

    const realUrl = (process.env.SSO_REAL_URL || "").trim();
    const mockUrl = (process.env.SSO_MOCK_URL || `http://localhost:${port}/api/sso-mock/login`).trim();

    // Jika mode 'real' ATAU format NIP 18 digit -> Prioritaskan Real SSO dari .env
    const cleanUname = (username || "").trim();
    const isNipFormat = /^\d{18}$/.test(cleanUname);
    const useRealFirst = mode === "real" || isNipFormat;

    const rawUrls = useRealFirst ? [realUrl, mockUrl] : [mockUrl, realUrl];
    const urlsToTry = [...new Set(rawUrls.filter(Boolean))];

    if (urlsToTry.length === 0) {
      throw new Error("URL SSO belum dikonfigurasi pada file .env (SSO_REAL_URL).");
    }

    let lastError = null;

    for (const targetUrl of urlsToTry) {
      console.log(`[SSO SERVICE] Attempting login for user "${cleanUname}" at: ${targetUrl}`);

      try {
        const formData = new URLSearchParams();
        formData.append("username", cleanUname);
        formData.append("password", password);

        let response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        let data;
        try {
          data = await response.json();
        } catch (_) {
          const jsonResp = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: cleanUname, password }),
          });
          data = await jsonResp.json();
        }

        console.log(`[SSO SERVICE] [${targetUrl}] Status: ${data?.status}, Message: "${data?.message}"`);

        if (response.ok && data && (data.status === true || data.status === "true")) {
          return data;
        }

        lastError = new Error(data?.message || "Username atau password tidak valid.");
      } catch (err) {
        console.warn(`[SSO SERVICE WARNING] Failed at ${targetUrl}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Username atau password tidak valid.");
  },
};

module.exports = ssoService;
