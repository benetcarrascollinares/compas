// Recuperar token guardado en localStorage
const token =
  localStorage.getItem("rb_token");

export const socket = io(
  window.location.origin,
  {
    auth: {
      token: token || null
    }
  }
);