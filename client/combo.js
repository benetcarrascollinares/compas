let combo = 0;

let maxCombo = 0;


export function addCombo(){

    combo++;

    if(combo > maxCombo){
        maxCombo = combo;
    }

    return combo;
}



export function resetCombo(){

    combo = 0;

}



export function getCombo(){

    return combo;

}



export function getMaxCombo(){

    return maxCombo;

}