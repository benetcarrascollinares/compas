export function getAttackDamage(combo){

    if(combo === 10)
        return 10;

    if(combo === 20)
        return 20;

    if(combo === 50)
        return 30;

    return 0;

}