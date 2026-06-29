let hp = 100;


export function resetHP(){

    hp = 100;

}



export function damage(value){

    hp -= value;

    if(hp < 0){
        hp = 0;
    }

    return hp;

}



export function heal(value){

    hp += value;


    if(hp > 100){
        hp = 100;
    }


    return hp;

}



export function getHP(){

    return hp;

}