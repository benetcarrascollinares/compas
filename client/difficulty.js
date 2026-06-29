let difficulty = "normal";

export function setDifficulty(value){
  difficulty = value;
}

export function getDifficulty(){
  return difficulty;
}

export function getWindows(){

  if(difficulty==="easy"){
    return {
      perfect:50,
      good:100,
      ok:180
    };
  }

  if(difficulty==="hard"){
    return {
      perfect:20,
      good:50,
      ok:100
    };
  }

  return {
    perfect:30,
    good:80,
    ok:150
  };
}

// export function getSpeedMultiplier(){

//   if(difficulty==="easy"){
//     return 0.8;
//   }

//   if(difficulty==="hard"){
//     return 1.3;
//   }

//   return 1;
// }