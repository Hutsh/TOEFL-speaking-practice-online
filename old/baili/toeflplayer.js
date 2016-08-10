paper.iCount = location.href.split("/").length;
paper.iServerDir = (paper.iCount==6?"/"+location.href.split("//")[1].split("/")[1]:"");

soundManager.url = paper.iServerDir + "/soundmanager2/swf/";
soundManager.onload = function(){
	//paper.media.init();
	paper.media.smLoaded = true;
	paper.media.init();
	//alert(paper.media.smLoaded);
}
soundManager.onerror = function(){
	window.clearInterval(paper.readyTimer);
	//paper.widget.xalert.init("错误提示","系统初始化失败！",{okbtn:"重试",okfunc:function(){location.reload();},nobtn:""});
	//location.reload();
}
soundManager.debugMode = false;
//媒体对象
paper.media = {
	startTimer:null,
	setTimer:null,//setTimeout
	stateTimer:null,//检测播放器状态
	playQueAudios:true,//加载时是否播放试题录音
	readyCount:0,
	initCount:0,
	init:function(){
		paper.media.start();
	},
	start:function()	{
		try {
			if(paper.media.player) soundManager.destroySound('bgPlayer');
			var vol = 80;
			if($("defVolumeSize") && $("defVolumeSize").value) vol = $("defVolumeSize").value;
			paper.media.player = soundManager.createSound({
				id: 'bgPlayer',
				url: 'init.mp3',
				volume:vol,
				autoPlay:false,
				whileplaying:function(){
					//var html = "whileplaying:"+paper.media.getTimeStr(this.position,true)+"/"+paper.media.getTimeStr(this.duration,true)+"/"+paper.media.getTimeStr(this.durationEstimate,true);
					//html += "/readyState:"+this.readyState+"/loaded:"+this.loaded+","+this.durationEstimate;
	//				var wa = parseInt((this.position/this.durationEstimate)*175);
	//				var wb = parseInt((this.duration/this.durationEstimate)*175);
					//var pa = parseInt((this.position/this.durationEstimate)*306);
					//var pb = parseInt((this.duration/this.durationEstimate)*302);
	//				if(!wa) wa = 1;
	//				if(!wb) wb = 1;
					//if(!pa) pa = 1;
					//if(!pb) pb = 1;
	//				$("stateLoading").setStyle("width",wb+"px");
	//				$("statePosition").setStyle("width",wa+"px");
					//$("positionload").setStyle("width",pb+"px");
					//$("positionbar").setStyle("width",pa+"px");
					//paper.debug(html+","+wa);
				}
			});
			paper.media.volume.init();
		} catch (e) {
			paper.debug("paper.media.init().error:"+e);
		}
	},
	getHttp:function(){return "http://"},
	getServer:function(){return location.href.split("//")[1].split("/")[0];},
	getServierDir:function(){
		return paper.iServerDir;
	},
	getServerUrl:function(){
		return paper.media.getHttp()+paper.media.getServer()+paper.media.getServierDir();
	},
	//getFileServerDir:function(){return "tanlu"},
	getFileServerUrl:function(){
		return paper.media.getHttp()+paper.media.getServer()+paper.media.getServierDir();
	},
	getReqUrl:function(){
		var reqUrl = paper.media.getServerUrl()+"/toefl/test.do?method=saveRec&id="+paper.data.id+"&no="+paper.bakno;
		var m = paper.model.get(paper.current.no);
		reqUrl += "&questionId="+m.qid;
		if(paper.current.no>=paper.no) reqUrl += "&isFinished=true";
		paper.debug("paper.media.getReqUrl():"+reqUrl);
		return reqUrl;
	},
	play:function(){
		if(paper.media.getState()==3) return;
		paper.media.player.play();
		paper.media.setStateTimer();
		paper.media.showVolume();
	},
	pause:function(){
		//try {paper.media.player.controls.pause();} catch (e) {}
		paper.media.player.pause();
	},
	stop:function(){
		//try {paper.media.player.stop();} catch (e) {}
		try {
			paper.media.player.stop();
		} catch (e) {}
		paper.media.clearStateTimer();
		paper.media.hideVolume();
		//if(paper.media.player) soundManager.destroySound('bgPlayer');
	},
//	setUrl:function(url){
//		paper.media.clearTimer();
//		if(!url) return;
//		paper.media.player[Browser.Engine.gecko?"src":"url"] = paper.media.getServerUrl() + url;
//		//if(Browser.Engine.gecko) paper.media.player.src = paper.media.getServerUrl() + url;
//		paper.media.clearStateTimer();
//		paper.debug("paper.media.setUrl():"+url);
//		//paper.media.volume.init();
//	},
	setUrl:function(url){
		url = (url.indexOf("http://")>=0?"":paper.media.getServerUrl()) + url;
		paper.debug("paper.media.setUrl():"+url);
		if(paper.media.player) soundManager.destroySound('bgPlayer');
		paper.media.player = soundManager.createSound({
			id: 'bgPlayer',
			url: url,
			autoPlay:false,
			volume:paper.media.volume.len,
			onfinish:function(){
			},
			ondataerror:function(){
			},
			whileplaying:function(){
				//var html = "whileplaying:"+paper.media.getTimeStr(this.position,true)+"/"+paper.media.getTimeStr(this.duration,true)+"/"+paper.media.getTimeStr(this.durationEstimate,true);
				//html += "/readyState:"+this.readyState+"/loaded:"+this.loaded+","+this.durationEstimate;
				var wa = parseInt((this.position/this.durationEstimate)*175);
				var wb = parseInt((this.duration/this.durationEstimate)*175);
				var pa = parseInt((this.position/this.durationEstimate)*300);
				//var pb = parseInt((this.duration/this.durationEstimate)*300);
				if(!wa) wa = 1;
				if(!wb) wb = 1;
				if(!pa) pa = 1;
				//if(!pb) pb = 1;
				$("stateLoading").setStyle("width",wb+"px");
				$("statePosition").setStyle("width",wa+"px");
				//$("positionload").setStyle("width",pb+"px");
				$("positionbar").setStyle("width",pa+"px");
				//paper.debug(">>position:"+this.position+",duration:"+this.duration+",durationEstimate:"+this.durationEstimate)
			}
		});
	},
	getTimeStr:function(nMSec,bAsString){
		// convert milliseconds to mm:ss, return as object literal or string
	    var nSec = Math.floor(nMSec/1000);
	    var min = Math.floor(nSec/60);
	    var sec = nSec-(min*60);
	    // if (min == 0 && sec == 0) return null; // return 0:00 as null
	    return (bAsString?(min+':'+(sec<10?'0'+sec:sec)):{'min':min,'sec':sec});
	},
	getUrl:function(){return paper.media.player[Browser.Engine.gecko?"src":"url"];},
	getState:function(){
		if(paper.media.player.paused){
			return 2;
		}else if(paper.media.player.playState==1){
			return 3;
		}else if(paper.media.player.playState==0){
			return 1;
		}else{
			return 0;
		}
	},
	getVolume:function(){return paper.media.player.settings.volume;},
	getDuration:function(){return paper.media.player.duration},
	getPosition:function(){return paper.media.player.position},
	isInit:function(){return (paper.media.getState()==0)?true:false},
	isStop:function(){return (paper.media.getState()==1)?true:false},
	isPause:function(){return (paper.media.getState()==2)?true:false},
	isPlay:function(){return (paper.media.getState()==3)?true:false},
	isFail:function(){return (paper.media.getState()==1)?true:false},
	notPlay:function(){return (paper.media.getState()!=3)?true:false},
	position:{
		init:function(){
			paper.media.positionbox = new Element("div",{'id':'positionbox','class':'playerpositionbox'}).inject(paper.mmlmw);
			paper.media.positionload = new Element("div",{'id':'positionload','class':'playerpositionload'}).inject(paper.media.positionbox);
			paper.media.positionbar = new Element("div",{'id':'positionbar','class':'playerpositionbar'}).inject(paper.media.positionload);
//			paper.media.positionTimer = window.setInterval(function(){
//				var duration = paper.media.getDuration();
//				var position = paper.media.getPosition();
//				var barwidth = position/duration*302;
//				//paper.debug("media.position.init():"+duration+", "+position+", w="+barwidth+", "+paper.media.getState());
//				if(barwidth>0) paper.media.positionbar.setStyle("width",barwidth);
//				if(paper.media.isStop()){
//					paper.media.positionbar.setStyle("width",(paper.media.positionbox.getSize().x-2));
//					paper.media.position.clearTimer();
//				}
//				
//			},200);
		},
		clearTimer:function(){
			paper.debug("paper.media.position.clearTimer()");
			window.clearInterval(paper.media.positionTimer);
		}
	},
	setStateTimer:function(){
		window.clearInterval(paper.media.stateTimer);
		paper.media.stateTimer = window.setInterval(function(){
			//paper.debug("StateTimer播放状态: "+paper.media.getState());
			//paper.debug("readyState:"+paper.media.player.readyState+",readCount:"+paper.media.readyCount);
			var state = $("playerState");
			if(state){
				$("stateText").set('html',paper.media.stateTitle(paper.media.getState()));
				var sec = (paper.media.player.position/1000);
				if(sec>60) sec = sec%60;
				sec =  Math.floor(sec);
				paper.debug(">>"+Math.floor(paper.media.player.position/60000)+":"+sec+",position:"+paper.media.player.position+",duration:"+paper.media.player.duration+",durationEstimate:"+paper.media.player.durationEstimate)
				state.setStyle('display','block');
				//if(paper.media.isFail()) state.setStyle('display','none');
//				if(paper.mode.test){
//					if(paper.media.isStop()){
//						state.setStyle('display','none');
//					}
//				}
				if(paper.media.isStop()){
					paper.media.clearStateTimer();
				}
				if(paper.media.player.readyState==2){
					paper.media.readyCount++;
					if(paper.media.readyCount>15){
						paper.media.readyCount = 0;
						//paper.widget.xalert.init("错误提示","MP3文件加载失败，请确认文件是否存在！",{okbtn:"确定",nobtn:""});
						paper.widget.xalert.init("错误提示","音频加载失败，请检查网络！网络恢复后请点击[确定]重新加载。",{okbtn:"确定",okfunc:function(){paper.show.init(paper.bakno);},nobtn:""});
						paper.media.clearStateTimer();
					}
				}
			}
		},1000)
	},
	clearStateTimer:function(){
		paper.debug("paper.media.clearStateTimer()");
		window.clearInterval(paper.media.stateTimer);
		var state = $("playerState");
		if(state){
			state.setStyle('display','none');
		}
		paper.media.hideVolume();
	},
	volume:{
		init:function(){
			paper.media.volume.minus = $("volminus");
			paper.media.volume.plus = $("volplus");
			
			paper.media.volume.player = paper.media.player;
			if(!paper.media.volume.player) return;
			
			paper.media.volume.minus.addEvent("mouseover",function(){this.setStyle("backgroundColor","#394D94");this.setStyle('color','#fff');});
			paper.media.volume.minus.addEvent("mouseout", function(){this.setStyle("backgroundColor","#ccc");this.setStyle('color','#000');});
			paper.media.volume.plus.addEvent("mouseover", function(){this.setStyle("backgroundColor","#394D94");this.setStyle('color','#fff');});
			paper.media.volume.plus.addEvent("mouseout",  function(){this.setStyle("backgroundColor","#ccc");this.setStyle('color','#000');});
			
			paper.media.volume.minus.addEvent("click",function(){
				paper.media.volume.len -= 10;
				if(paper.media.volume.len<=10) paper.media.volume.len = 10;
				paper.media.volume.setLen();
			});
			paper.media.volume.plus.addEvent("click",function(){
				paper.media.volume.len += 10;
				if(paper.media.volume.len>=100) paper.media.volume.len = 100;
				paper.media.volume.setLen();
			});
			paper.media.volume.show();
			paper.media.volume.initLen();
		},
		initLen:function(){
			//paper.media.volume.len = paper.media.volume.player.settings.volume;
			paper.media.volume.len = paper.media.player.volume;
			if(!paper.media.volume.len) paper.media.volume.len = 50;
			paper.media.volume.setLen();
		},
		setLen:function(){
			var len = paper.media.volume.len/10;
			var items = $("volitem").getElements("span");
			items.each(function(o,i){
				o.set('class',i<len?'itact':'it');
			});
			//paper.media.volume.player.settings.volume = paper.media.volume.len;
			try {
				paper.media.player.setVolume(paper.media.volume.len);
			} catch (e) {
				paper.debug(e);
			}
		},
		show:function(){
			$("playerDiv").setStyle("display","block");
		},
		hide:function(){
			$("playerDiv").setStyle("display","none");
		}
	},
	stateTitle:function(state){
		switch (state) {
			case 0:return "Undefined"; case 1:return "Stopped"; case 2:return "Paused"; case 3:return "playing..."; case 4:return "ScanForward";
			case 5:return "ScanReverse"; case 6:return "Bufering..."; case 7:return "Waiting..."; case 8:return "MediaEnded"; 
			case 9:return "Transitioning..."; case 10:return "Ready"; case 11:return "Reconnecting...";
		}

	},
	clearTimer:function(){
		paper.debug("paper.media.clearTimer()");
//		window.clearInterval(paper.media.startTimer);
//		window.clearTimeout(paper.media.setTimer);
//		paper.media.position.clearTimer();
		window.clearInterval(paper.media.startTimer);
		window.clearTimeout(paper.media.setTimer);
		paper.media.position.clearTimer();
	},
	clear:function(){
//		paper.media.clearTimer();
//		paper.media.stop();
//		//active play buttons
//		if(paper.playback) paper.playback.set('disabled',false);
		paper.media.stop();
		paper.media.clearTimer();
	},
	singleMode:function(tf){
		try {
			$$(".quebtnspan").getElements("input").each(function(a){
				a.set('disabled',tf?false:true);
			});
		} catch (e) {}
		
	},
	formatImgTime:function(s){
		try {
			var arr = s.split("-");
			var startmin = parseInt(arr[0].split(":")[0]);
			var startsec = parseInt(arr[0].split(":")[1]);
			
			var endmin = parseInt(arr[1].split(":")[0]);
			var endsec = parseInt(arr[1].split(":")[1]);
			return {start:(startmin*60+startsec),end:(endmin*60+endsec)}
		} catch (e) {
			return false;
		}
	},
	showVolume:function(){paper.playerDiv.setStyle("display","block");},
	hideVolume:function(){paper.playerDiv.setStyle("display","none");}
};