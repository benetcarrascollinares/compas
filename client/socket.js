// Recuperar token guardado en localStorage
const token =
  localStorage.getItem("rb_token");

export const socket = io(
  "http://localhost:3000",
  {
    auth: {
      token: token || null
    }
  }
);
