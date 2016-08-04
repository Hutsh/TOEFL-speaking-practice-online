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

	
	responsiveVoice.speak(readqu, "US English Male", {onstart:start,onend:end});
	
}



function change(){
    var q = document.getElementById('question').value;

    var pre = document.getElementById('prepare');
    pre.style.display="none";

    var question = document.getElementById('showq');
    question.style.display="block";

    if(q)
        question.innerHTML=q;
    else
        question.innerHTML="未输入题目，请刷新重新开始"

    voice(q);

}

function voice(text) {
    responsiveVoice.speak(text,'UK English Female',{onend:end});
}

function end() {
    console.log("end");
    var prepaudio = document.getElementById("speaking_prep");

}