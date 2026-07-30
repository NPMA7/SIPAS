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

    const targetUrl =
      mode === "real"
        ? process.env.SSO_REAL_URL || "https://sso.bandungkab.go.id/api/login"
        : process.env.SSO_MOCK_URL ||
          `http://localhost:${port}/api/sso-mock/login`;

    console.log(`[SSO SERVICE] Attempting ${mode.toUpperCase()} SSO login for user "${username}" at: ${targetUrl}`);

    try {
      // Coba kirim data via x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append("username", username);
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
      } catch (jsonErr) {
        // Fallback jika SSO hanya menerima JSON payload
        const jsonResp = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });
        data = await jsonResp.json();
      }

      console.log(`[SSO SERVICE] Response status: ${data?.status}, message: "${data?.message}"`);

      if (!response.ok || data.status === false || data.status === "false") {
        throw new Error(
          data?.message || "Username atau password tidak valid."
        );
      }

      return data;
    } catch (error) {
      console.error("[SSO SERVICE ERROR]", error.message);
      throw error;
    }
  },
};

module.exports = ssoService;
