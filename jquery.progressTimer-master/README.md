jQuery.progressTimer
====================

#Project Description
A simple jQuery plugin for using a Bootstrap progress bar as the visual representation for a timer.

#Main Features

* Use a Bootstrap progress bar to represent a timer.
* Invoke a callback once the timer has expired.

#Examples

```javascript

$("#someDiv").progressTimer({ timeLimit: 60 });

$(".myDivs").progressTimer({
	timeLimit: 120,
	warningThreshold: 10,
	baseStyle: 'progress-bar-warning',
	warningStyle: 'progress-bar-danger',
	completeStyle: 'progress-bar-info',
	onFinish: function() {
		console.log("I'm done");
	}
});

```
