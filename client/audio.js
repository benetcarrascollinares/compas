let audio = null;

const sfx = {};




export function loadAudio(src){


    audio =
    new Audio(src);



    audio.preload =
    "auto";


    audio.volume =
    1;



    audio.load();



    console.log(
        "🎵 Audio cargado"
    );



}






export function unlockAudio(){


    if(!audio)
        return;



    audio.play()
    .then(
        ()=>{


            audio.pause();


            audio.currentTime=0;



            console.log(
                "🔓 Audio desbloqueado"
            );



        }
    )
    .catch(
        err=>{


            console.log(
                "Error unlock:",
                err
            );


        }
    );


}







export function playAudio(){


    if(!audio)
        return;




    audio.currentTime=0;




    audio.play()
    .then(
        ()=>{


            console.log(
                "▶️ Música sonando"
            );


        }
    )
    .catch(
        err=>{


            console.log(
                "Play bloqueado:",
                err
            );


        }
    );


}







export function stopAudio(){


    if(!audio)
        return;



    audio.pause();


    audio.currentTime=0;



}








export function getAudioTime(){


    if(!audio)
        return 0;



    return (
        audio.currentTime * 1000
    );

}


export function loadSfx(){

    sfx.perfect =
    new Audio(
        "./assets/perfect.mp3"
    );

    sfx.good =
    new Audio(
        "./assets/good.mp3"
    );

    sfx.miss =
    new Audio(
        "./assets/miss.mp3"
    );

}

export function playSfx(type){

    if(!sfx[type])
        return;

    sfx[type].currentTime = 0;

    sfx[type]
    .play()
    .catch(()=>{});

}