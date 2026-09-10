export async function getAuthStatus() {
  try {
    const response = await fetch("/api/auth", { headers: { Accept: "application/json" } });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

export async function login(password) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.ok);
}

export async function logout() {
  await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
}
