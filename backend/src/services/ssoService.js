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
        ? process.env.SSO_REAL_URL || ""
        : process.env.SSO_MOCK_URL ||
          `http://localhost:${port}/api/sso-mock/login`;

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.status === false || data.status === "false") {
        throw new Error(
          data.message || "Username atau password tidak valid.",
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
