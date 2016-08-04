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
    localStorage.removeItem("speakingq");
    responsiveVoice.cancel();
}

function voice() {
    var q = "Describe a book that you believe is the most useful to you. Please explain the reason and include specific examples and details in your explanation.";
    responsiveVoice.speak(q, "US English Male");
}