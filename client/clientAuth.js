const API = "http://localhost:3000/api";

/*
=================================
REGISTRO
=================================
*/

export async function register(
  username,
  password
) {

  const res = await fetch(
    `${API}/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || "Error al registrarse"
    );
  }

  // Guardar token
  localStorage.setItem(
    "rb_token",
    data.token
  );

  localStorage.setItem(
    "rb_user",
    JSON.stringify(data.user)
  );

  return data;
}

/*
=================================
LOGIN
=================================
*/

export async function login(
  username,
  password
) {

  const res = await fetch(
    `${API}/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || "Error al iniciar sesión"
    );
  }

  localStorage.setItem(
    "rb_token",
    data.token
  );

  localStorage.setItem(
    "rb_user",
    JSON.stringify(data.user)
  );

  return data;
}

/*
=================================
LOGOUT
=================================
*/

export function logout() {

  localStorage.removeItem("rb_token");
  localStorage.removeItem("rb_user");

  // Recargar para reconectar socket sin token
  window.location.reload();
}

/*
=================================
USUARIO ACTUAL
=================================
*/

export function getCurrentUser() {

  const raw =
    localStorage.getItem("rb_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem("rb_token");
}

/*
=================================
PERFIL
=================================
*/

export async function fetchProfile(username) {

  const res = await fetch(
    `${API}/profile/${username}`
  );

  if (!res.ok) return null;

  return res.json();
}

/*
=================================
LEADERBOARD
=================================
*/

export async function fetchLeaderboard() {

  const res = await fetch(
    `${API}/leaderboard`
  );

  if (!res.ok) return [];

  return res.json();
}
