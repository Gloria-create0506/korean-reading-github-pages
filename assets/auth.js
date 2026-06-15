(function () {
  const form = document.getElementById("authForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginBtn");
  const signupButton = document.getElementById("signupBtn");
  const message = document.getElementById("message");
  const params = new URLSearchParams(window.location.search);
  const nextUrl = params.get("next") || "/";

  function setBusy(isBusy) {
    loginButton.disabled = isBusy;
    signupButton.disabled = isBusy;
  }

  function showMessage(text) {
    message.textContent = text;
  }

  async function submitAuth(mode) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showMessage("请先填写邮箱和密码。");
      return;
    }

    setBusy(true);
    showMessage(mode === "signup" ? "正在注册..." : "正在登录...");

    try {
      const response = await fetch(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage(data.error || "操作失败，请稍后重试。");
        return;
      }

      if (data.needsConfirmation) {
        showMessage(data.message || "注册成功，请先到邮箱中确认账号。");
        return;
      }

      showMessage("验证成功，正在进入网页...");
      window.location.href = nextUrl;
    } catch {
      showMessage("网络连接失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuth("login");
  });

  signupButton.addEventListener("click", () => submitAuth("signup"));
})();
