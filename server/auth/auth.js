const jwt = require("jsonwebtoken");

const SECRET =
  process.env.JWT_SECRET ||
  "rhythmbattle_dev_secret_changeme";

const EXPIRES_IN = "7d";

/*
=================================
GENERAR TOKEN
=================================
*/

function signToken(payload) {

  return jwt.sign(
    payload,
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/*
=================================
VERIFICAR TOKEN
=================================
*/

function verifyToken(token) {

  try {

    return jwt.verify(
      token,
      SECRET
    );

  } catch {

    return null;

  }
}

module.exports = {
  signToken,
  verifyToken
};
