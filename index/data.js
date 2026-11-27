const API = "http://localhost:3000";

async function api(path, opts = {}) {
  const headers = {
    "x-admin-senha": sessionStorage.getItem("admin_senha") || "",
  };
  // com FormData (upload) o navegador define o Content-Type sozinho
  if (!(opts.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Erro no servidor");
  return data;
}
