(() => {
  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "padel-form") return;

    event.preventDefault();
    const status = form.querySelector("#form-status");
    const submit = form.querySelector('button[type="submit"]');
    const setMessage = (text, error = false) => {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle("error", error);
    };

    setMessage("");
    if (!form.reportValidity()) return;
    if (form.dataset.submitting === "true") return;

    const data = new FormData(form);
    const cfg = window.LUAN_SITE_CONFIG || {};
    const baseUrl = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
    const anonKey = String(cfg.supabaseAnonKey || "");
    if (!baseUrl || !anonKey) {
      setMessage("Não foi possível abrir o cadastro agora. Avise a equipe no estande para registrar seus dados.", true);
      return;
    }

    const payload = {
      p_nome: String(data.get("nome") || "").trim(),
      p_telefone: String(data.get("telefone") || "").trim(),
      p_email: String(data.get("email") || "").trim(),
      p_consentimento: data.get("consentimento") === "on",
      p_site: String(data.get("site") || "").trim(),
    };
    if (!payload.p_nome || !payload.p_telefone || !payload.p_email || !payload.p_consentimento) {
      setMessage("Confira nome, telefone, e-mail e a autorização para continuar.", true);
      return;
    }

    form.dataset.submitting = "true";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Enviando…";
    }
    try {
      const response = await fetch(`${baseUrl}/rest/v1/rpc/registrar_lead_evento`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = "Não foi possível concluir o cadastro. Tente novamente ou fale com a equipe no estande.";
        try {
          const body = await response.json();
          if (body?.message && /inválid|informe|telefone|e-mail/i.test(body.message)) message = body.message;
        } catch { /* mensagem de segurança genérica */ }
        throw new Error(message);
      }
      form.reset();
      setMessage("Cadastro recebido. Siga @solimoveis_penha e confira no estande as condições da promoção.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o cadastro. Fale com a equipe no estande.", true);
    } finally {
      delete form.dataset.submitting;
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Quero concorrer";
      }
    }
  });
})();
