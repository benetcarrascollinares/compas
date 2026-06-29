let energy = 0;

export function getEnergy(){
    return energy;
}

export function resetEnergy(){
    energy = 0;
}

export function addEnergy(value){

    energy += value;

    if(energy > 100){
        energy = 100;
    }

    return energy;
}

export function consumeEnergy(){

    energy = 0;

    return energy;

}