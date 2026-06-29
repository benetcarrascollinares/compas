const game =
document.getElementById("game");

const lanes = {
  d: 0,
  f: 1,
  j: 2,
  k: 3
};

const TRAVEL_TIME = 2000;
const HIT_LINE    = 300;

let noteColor = "#ffcc00";

export function setNoteColor(color) {
  noteColor = color || "#ffcc00";
}

/*
=================================
NOTA NORMAL
=================================
*/

export function createNoteElement(note) {

  const el = document.createElement("div");
  el.className = "note";
  el.setAttribute("data-lane", note.lane);
  el.innerText = note.lane.toUpperCase();
  el.style.left       = `${lanes[note.lane] * 80 + 30}px`;
  el.style.background = noteColor;

  game.appendChild(el);
  note.element = el;

}

/*
=================================
HOLD NOTE
La nota entera viaja hacia abajo.
La cabeza es la parte inferior,
la cola es la parte superior.
=================================
*/

export function createHoldElement(note) {

  const wrapper = document.createElement("div");
  wrapper.className = "hold-wrapper";
  wrapper.setAttribute("data-lane", note.lane);

  // Altura del cuerpo = duración en pixels
  const bodyHeight = Math.round(
    (note.hold / TRAVEL_TIME) * HIT_LINE
  );

  wrapper.style.left = `${lanes[note.lane] * 80 + 30}px`;

  // Estructura: cola arriba, cuerpo en medio, cabeza abajo
  wrapper.innerHTML = `
    <div class="hold-tail" style="background:${noteColor}88"></div>
    <div class="hold-body" style="
      height:${bodyHeight}px;
      background:${noteColor}33;
      border-left:3px solid ${noteColor}88;
      border-right:3px solid ${noteColor}88;
    "></div>
    <div class="hold-head" style="background:${noteColor}">
      ${note.lane.toUpperCase()}
    </div>
  `;

  game.appendChild(wrapper);
  note.element = wrapper;

}

/*
=================================
ACTUALIZAR POSICIÓN
Para hold: posicionamos por la CABEZA (bottom)
=================================
*/

export function updateNotePosition(note) {

  if (!note.element) return;

  if (note.hold > 0) {

    // La cabeza debe estar en note.y
    // El wrapper crece hacia arriba (cola encima)
    // Usamos translateY en la cabeza como referencia
    note.element.style.top       = "0";
    note.element.style.transform =
      `translateY(${note.y}px)`;

  } else {

    note.element.style.transform =
      `translateY(${note.y}px)`;

  }

}

/*
=================================
HOLD ACTIVO — resaltar visualmente
=================================
*/

export function setHoldActive(note, active) {

  if (!note.element) return;

  const head = note.element.querySelector(".hold-head");
  const body = note.element.querySelector(".hold-body");

  if (active) {
    note.element.classList.add("holding");
    if (head) head.style.boxShadow = `0 0 16px ${noteColor}`;
    if (body) body.style.background = `${noteColor}55`;
  } else {
    note.element.classList.remove("holding");
    if (head) head.style.boxShadow = "";
    if (body) body.style.background = `${noteColor}33`;
  }

}

/*
=================================
ELIMINAR NOTA
=================================
*/

export function removeNoteElement(note) {

  if (!note.element) return;

  note.element.classList.add("note-hit");

  setTimeout(() => {
    note.element?.remove();
    note.element = null;
  }, 150);

}