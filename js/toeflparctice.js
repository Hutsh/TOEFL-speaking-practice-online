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
    var question = document.getElementById('showq');
    question.style.display="block";

    if(q)
        question.innerHTML=q;
    else
        question.innerHTML="未输入题目，请刷新重新开始";

    voice(q);

}

function voice(text) {
    responsiveVoice.speak(text,'US English Male',{onend:end});
}

function end() {
    console.log("end");
    var pa = document.getElementById('prepaudio');
    var beepa = document.getElementById('beepaudio');
    pa.play();
    pa.onended = function () {
        beepa.play();
    }
    beepa.onended = function () {
        console.log("开始15");
        count15();
    }

}

var secondcountdown=15;
var flag45s=0;
function showtime() {
    if(secondcountdown>44) {
        flag45s = 1;
    }
    secondcountdown--;
    document.getElementById("time-count").style.display="inline-block";
    document.getElementById("time-count").innerHTML = secondcountdown + "s";
    if(secondcountdown==0){
        if(flag45s){
            document.getElementById("time-count").innerHTML = "This is the and of the practice, you can download your answer by clicking the button bellow. Thanks for using!";
        }
        else{
            document.getElementById("time-count").innerHTML = "Please begin speaking after the beep.";
        }

        return;
    }
    setTimeout("showtime()",1000);
}
function count15() {
    var bar = document.getElementById("timer15");
    var t = document.getElementById("time-count");
    bar.style.display="block";
    t.style.display="block";
    setTimeout(function(){
        var progressbar15 = document.getElementById("timer15-bar");
        progressbar15.style.width="100%";
    },100);

    secondcountdown=16;
    showtime();

    setTimeout("count45();",15000);//!!!!!!!!!!!应该15000
}



function count45() {
    var spa = document.getElementById('speakaudio');
    var beepa = document.getElementById('beepaudio');
    spa.play();
    spa.onended = function () {
        beepa.play();
    }
    beepa.onended = function () {

        console.log("开始45");
        record45();
    }
}

function record45() {
    var bar15 = document.getElementById("timer15");
    bar15.style.display="none";
    var bar = document.getElementById("timer45");
    bar.style.display="block";
    setTimeout(function(){
        var pbar45 = document.getElementById("timer45-bar");
        pbar45.style.width="100%";
    },100);

    console.log("recoding");
    var button = document.getElementById("record");
    toggleRecording(button);

    secondcountdown=46;
    showtime();
    setTimeout(function(){toggleRecording(button); showsave();},45000);//ying45000
}

function showsave() {
    var ana = document.getElementById("wavedisplay");
    ana.style.display="inline-block";
    var saveimg = document.getElementById("save");
    saveimg.style.display="block";
    var info = "This is the and of the practice, you can download your answer by clicking the button bellow. Thanks for using.";
    responsiveVoice.speak(info, "US English Male");
}
