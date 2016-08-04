/**
 * Created by hutsh on 16.8.4.
 */
function qstorage(){
    var qinput = document.getElementById("question");
    var question=qinput.value;
    localStorage.removeItem("speakingq");
    localStorage.speakingq = question;
    responsiveVoice.speak(question, "US English Male");
}

function printq() {
    var question = localStorage.speakingq;
    if(question)
        document.write(localStorage.speakingq);
    else
        document.write("未输入题目！");

}

function readq() {
    var readqu = localStorage.speakingq;
    if(readqu){
        sessionStorage.readq=readqu;
        localStorage.removeItem("speakingq");
    }
    else
        readqu = "You haven't input questions.";


    responsiveVoice.speak(readqu, "US English Male", {onstart:test(),onend:progressbar()});

}

function progressbar() {

    alert("进度条");
}
function test() {

}

