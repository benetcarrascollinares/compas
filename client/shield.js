let shield = false;


export function activateShield(){

    shield = true;

}


export function hasShield(){

    return shield;

}


export function consumeShield(){

    shield = false;

}


export function resetShield(){

    shield = false;

}