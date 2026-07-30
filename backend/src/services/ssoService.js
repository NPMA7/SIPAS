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

    const targetUrl = mode === "real" ? realUrl : mockUrl;
    const cleanUname = (username || "").trim();

    if (!targetUrl) {
      throw new Error(`URL SSO belum dikonfigurasi pada file .env (${mode === "real" ? "SSO_REAL_URL" : "SSO_MOCK_URL"}).`);
    }

    console.log(`[SSO SERVICE] Attempting ${mode.toUpperCase()} SSO login for user "${cleanUname}" at: ${targetUrl}`);

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

      if (!response.ok || data.status === false || data.status === "false") {
        throw new Error(data?.message || "Username atau password tidak valid.");
      }

      return data;
    } catch (error) {
      console.error("[SSO SERVICE ERROR]", error.message);
      throw error;
    }
  },
};

module.exports = ssoService;
