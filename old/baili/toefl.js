/**
 * Paper Object
 */
var paper = {};

paper.no = 0;//试卷试题总数
paper.noOffset = 0;//用多题同时显示的情况
paper.current=0;
paper.store = {};//存储对象
paper.isReading = false;
paper.isListening = false;
paper.isWriting = false;
paper.isSpeaking = false;
paper.initOk = true;

//试卷模式对象
//preivew 预览试卷
//test 学生测试
//view 查看试卷（测试完成）
paper.mode = {
	test:false,
	testUnit:false,
	view:false,
	review:false,
	preview:false,
	debug:false,
	//solution:false,
	//practise:false,
	sReloadTime:35000,
	set:function(modeStr){
		if(modeStr=="testUnit"){
			paper.mode.test = true;
			paper.action.formAction = "testUnit.do";
		}
		if(modeStr=="test"){
			paper.action.formAction = "test.do";
		}
		if(modeStr=="review"){
			paper.mode.preview = true;
		}
		paper.mode[modeStr] = true;
		if(paper.mode.preview || paper.mode.view){
			paper.mode.debug=true
		}
	},
	get:function(){
		if(paper.mode.test) return "Test";
		if(paper.mode.view) return "View";
		if(paper.mode.preview) return "Preview";
		//if(paper.mode.practise) return "Practise";
	}
};

//试卷模型对象
paper.model = {
	init:function(mode,queDataSrc,storeDataSrc){
		paper.fsupport = paper.widget.flash.check();
		
		//paper.debug("flash: "+JSON.encode(paper.fsupport)+",nav:"+navigator.userAgent);
		
		if(!paper.fsupport.f){
			paper.widget.xalert.init("Required Adobe Flash Player","<p style=\"padding:15px 5px;text-align:center;\"><a href=\""+paper.widget.flash.url+"\">请点击这里下载并安装Flash Player播放器。</a></p>",{okbtn:"OK",okfunc:function(){location=paper.widget.flash.url}});
			return;
		}
		paper.readyTimer = window.setInterval(function(){
			//paper.debug("paper.media.smLoaded:"+paper.media.smLoaded+",paper.media.initCount:"+paper.media.initCount);
			if(paper.media.smLoaded){
				window.clearInterval(iCheckInitTimer);
				paper.debug("window.clearInterval.iCheckInitTimer");
				window.clearInterval(paper.readyTimer);
				
				paper.model.fire(mode,queDataSrc,storeDataSrc);
			}
//			else{
//				paper.media.initCount++;
//				if(paper.media.initCount>10){
//					paper.media.init();
//					paper.media.smLoaded = true;
//				}
//			}
		},200);
		
	},
	fire:function(mode,queDataSrc,storeDataSrc){
		paper.layout.init();//初始布局对象
		paper.mode.set(mode);//初始化试卷模式
		if(!paper.model.setData(queDataSrc,storeDataSrc)) return;//初始化数据源
		
		if(paper.isSpeaking) paper.recorder.init();
		if(!paper.model.start()) return;//开始数据设置
		paper.show.init(paper.initNo);//显示
		if(paper.initOk){
			paper.show.success();
		}else{
			return;
		}
		//paper.model.src();
	},
	setData:function(queDataSrc,storeDataSrc){//设置数据模型
		try {
			paper.data = JSON.decode($(queDataSrc).value);
			if(storeDataSrc){
				paper.data.store = JSON.decode($(storeDataSrc).value);
				paper.refers = paper.data.store.refers;//中间引用模型,存储试题引用信息
				paper.stat = paper.data.store.stat;
			}
			if(!paper.refers) paper.refers = [];
			
			paper.firstReadingEnd=1;
			paper.firstReadingEndNo = paper.data.ques[0].children.length;
			//alert(paper.firstReadingEndNo);
			var skill = paper.data.skill;
			paper.isReading = skill==paper.Skill.reading;
			paper.isListening = skill==paper.Skill.listening;
			paper.isWriting = skill==paper.Skill.writing;
			paper.isSpeaking = skill==paper.Skill.speaking;
			if($("userId")) paper.userId = $("userId").value;
			if($("userName")) paper.userName = $("userName").value;
			
			if(paper.isListening){//set Listening section No
				try {
					var mlen = paper.data.ques[2].children.length;
					paper.LSNo = paper.data.ques[2].children[mlen-1].no;
				} catch (e) {
					paper.LSNo = 17;
				}
			}
			
			return true;
		} catch (e) {
			paper.model.initError(e);
		}
	},
	initError:function(e){
		paper.widget.xalert.init("错误提示","试题数据初始化失败，请检查是否录入试题数据！"+"<div>"+e+"</div>",{okbtn:"关闭窗口",okfunc:function(){window.close()},nobtn:""});
		paper.initOk = false;
	},
	initErrorQue:function(e){
		paper.model.initError(e);
		paper.initOk = false;
	},
	initErrorListen:function(){
		//alert("试题听力材料未上传，请检查！");
		paper.initOk = false;
	},
	start:function(){
		if(!paper.data || !paper.data.ques || paper.data.ques.length==0){
				paper.model.initError("!paper.data or !paper.data.ques");
		}
		if(paper.refers && paper.refers.length>0){
			paper.no = paper.refers.length;
			if(paper.mode.review){
				paper.refers.each(function(r){
					r.uk = null;
				});
			}
		}else{
			if(paper.isSpeaking || paper.isWriting){
				paper.model.build(paper.data.ques);
			}else{
				paper.data.ques.each(function(que,qi){
					paper.model.build(que.children,que);
				});
			}
		}
		paper.model.setInitNo();
		paper.model.setTitle();
		return true;
	},
	build:function(arr,que){
		if(!arr || arr.length==0){
			return;
			paper.refers[0] = {
				no:1,
				id:que.id,
				qid:que.id,
				skill:que.skill,
				type:-1,//no sub question
				sc:(!que.sc || isNaN(que.sc)?1:que.sc),
			    //sk:paper.model.getSKey(item.type,item),
				uk:"",//user key
				usc:"",//user score
				rs:paper.RS.notyetseen.id,//user response status
				as:""//user key status
			};
			
		}
		arr.each(function(item,ii){
			if(paper.isSpeaking || paper.isWriting){
				que = item;
			}
			paper.refers[paper.no] = {
				//no:paper.no+1,
				no:(item.no<(paper.no+1)?(paper.no+1):item.no),
				id:item.id,
				qid:que.id,
				skill:que.skill,
				ver:que.ver,
				jiashi:(que.jiashi && que.jiashi=="1"?1:0),
				type:item.type,
				sc:(!item.sc || isNaN(item.sc)?1:item.sc),
				sk:paper.model.getSKey(item.type,item),
				uk:"",
				usc:"",
				rs:paper.RS.notyetseen.id,
				as:""
			};
			paper.no++;
		});
	},
	setInitNo:function(){
		paper.initQuestionNo = $("questionNo");
		paper.frmQuestionId = $("fromQuestionId");
		if(paper.initQuestionNo && paper.initQuestionNo.value!="") paper.initNo = paper.initQuestionNo.value;
		if(paper.frmQuestionId && paper.frmQuestionId.value!=""){
			//alert(paper.frmQuestionId.value);
			var fromQid = paper.frmQuestionId.value;
			//paper.debug(JSON.encode(paper.refers));
			var returns = paper.refers.filter(function(refer){return refer.qid==fromQid;});
			if(returns && returns.length>0){
				paper.initNo =  returns[0].no;
			}else{
				returns = paper.refers.filter(function(refer){return refer.id==fromQid;});
				if(returns && returns.length>0){
					paper.initNo = returns[0].no;
				}
			}
		}
		
	},
	getSKey:function(quetype,item){
		try {
			if(quetype==paper.QT.jztk){
				return item.options[0].content;
			}else if(quetype==paper.QT.ydpp){
				var arrs = [];
				if(item.numtype==1){//summary
					item.options.each(function(io){
						if(io.value==1){
							arrs.push(io.id);
						}
					});
				}else if(item.numtype==2){//category chart
					var aas = [];
					var bbs = [];
					var ccs = [];
					item.options.each(function(io){
						if(io.value==1){
							aas.push(io.id);
						}else if(io.value==2){
							bbs.push(io.id);
						}else if(io.value==3){
							ccs.push(io.id);
						}
					});
					arrs.push(aas);
					arrs.push(bbs);
					arrs.push(ccs);
				}
				return arrs;
			}else if(quetype==paper.QT.tlpp){
				var arrs = [];
				item.options.each(function(io,ii){
					arrs[ii] = parseInt(io.value);
				});
				return arrs;
			}else if(quetype==paper.QT.tlpx){
				var arrs = [];
				var opts = [];
				item.options.each(function(io){
					opts.push({id:io.id,val:parseInt(io.value)});
				});
				opts.sort(function(a,b){return a.val-b.val});
				opts.each(function(a){
					arrs.push(a.id);
				});
				return arrs;
			}else if(quetype==paper.QT.tlfl){
				var arrs = [];
				var aas = [];
				var bbs = [];
				item.options.each(function(io){
					if(io.value==1){
						aas.push(io.id);
					}else if(io.value==2){
						bbs.push(io.id);
					}
				});
				arrs.push(aas);
				arrs.push(bbs);
				return arrs;
			}else{
				if(item.numtype==2){//多选

					var arrs = [];
					item.options.each(function(io){
						if(io.value==1) arrs.push(io.id);
					});
					return arrs;
				}
				if(item.options){
					return item.options.filter(function(io){return io.value==1;})[0].id;
				}else{
					return "";
				}
			}
		} catch (e) {
			paper.debug("[error]paper.model.getSKey(qt:"+quetype+",item.id:"+item.id+")>"+e);
		}
		return "";
	},
	etSKeyWord:function(m){
		try {
			var que = paper.model.getQue(m.qid);
			if(m.type==paper.QT.yddp){
				var index = 0;
				var item = que.options.filter(function(a,ai){
					if(a.id==m.sk){index = ai;return true;}
				})[0];//.content;
				return paper.common.abc(index);}
			else if(m.type==paper.QT.ydxz || m.type==paper.QT.wxtk
				|| m.type==paper.QT.ydpd || m.type==paper.QT.xxxz
				|| m.type==paper.QT.tlxz || m.type==paper.QT.tpxz
				|| m.type==paper.QT.tltpxz || m.type==paper.QT.tldztpxz
				){
				var index = 0;
				var item = paper.model.getQueChild(que,m.id).options.filter(function(a,ai){
					if(a.id==m.sk){index = ai;return true;}
				})[0];//.content;
				return paper.common.abc(index);}
			else if(m.type==paper.QT.cwbx || m.type==paper.QT.tltk
				|| m.type==paper.QT.xxtk
				|| m.type==paper.QT.wxtk_open){
				return que.options.filter(function(a){return a.content==m.sk})[0].content;
				}
		} catch (e) {}
	},
	get:function(no){
		return paper.refers.filter(function(item){return item.no==no})[0];
	},
	getQue:function(qid){
		return paper.data.ques.filter(function(q){return q.id==qid;})[0];
	},
	getQueChild:function(que,id){
		return que.children.filter(function(q){return q.id==id})[0];
	},
	getQueOption:function(que,id){
		return que.options.filter(function(q){return q.id==id})[0];
	},
	getUkon:function(quetype,id){
		var a = paper.refers.filter(function(m){return m.type==quetype && m.uk && m.uk==id});
		if(!a) return null;
		if(a.length==0) return null;
		return true;
	},
	checkFirstOfQue:function(no){//检查当前no是否为大题的第一个题
		var m = paper.model.get(no);
		var m2 = paper.refers.filter(function(a){return a.qid==m.qid})[0];
		if(!m2) return false;
		if(no==m2.no) return m2;
		return false;
	},
	check:function(){
//		try {
			if(paper.isReading || paper.isListening){
				paper.refers.each(function(item){
					switch (item.rs) {
						case paper.RS.notyetseen.id:
							item.as = paper.RS.incorrect.id;
							item.usc = 0;
							break;
						case paper.RS.notanswered.id:
							item.as = paper.RS.incorrect.id;
							item.usc = 0;
							break;
						case paper.RS.answered.id:
							var res = paper.model.getRsOfCompare(item,item.sk,item.uk);
							paper.debug("checked:"+JSON.encode(res));
							item.as = res.rs;
							item.usc = res.usc;
							if(res.rc) item.rc = res.rc;
							break;
						default: break;
					}
				});
				return paper.model.stat();
			}
//		} catch (e) {
//			return true;
//		}
		return true;
	},
	getRsOfCompare:function(item,sk,uk){
		paper.debug("paper.model.getRsCompare(item.no:"+item.no+",sk:"+sk+",uk:"+uk+")");
		//try{
			if(!sk || !uk) return {rs:paper.RS.incorrect.id,usc:0};
			if(typeof(uk)=="number" || typeof(uk)=="string"){
				if(sk.toString()==uk.toString()) return {rs:paper.RS.correct.id,usc:item.sc};
				return {rs:paper.RS.incorrect.id,usc:0};
			}else if(typeof(uk)=="object"){
				if(uk[0] && typeof(uk[0])=="number" || typeof(uk[0])=="string"){
					if(item.type==paper.QT.tlpp){
						//alert("uk[0]==tlpp>"+item.no+typeof(uk[0]));
						var rcount = 0;
						sk.each(function(a,ai){
							if(uk[ai]){
								if(uk[ai]==a) rcount++;
							}
						});
						if(rcount==sk.length){
							return {rs:paper.RS.correct.id,usc:item.sc};
						}else{
							var usc = (rcount/sk.length*item.sc).round();
							return {rs:paper.RS.partiallycorrect.id,usc:usc};
						}
					}else if(item.type==paper.QT.tlpx){
						if(sk.toString()===uk.toString()){
							return {rs:paper.RS.correct.id,usc:item.sc};
						}else{
							return {rs:paper.RS.incorrect.id,usc:0};
						}
					}else{
						//alert("uk[0]==number>"+item.no+typeof(uk[0]));
						if(sk.sort(function(m,n){return m-n;}).toString()==uk.sort(function(m,n){return m-n;}).toString()) return {rs:paper.RS.correct.id,usc:item.sc};
						if(item.sc==1){
							return {rs:paper.RS.incorrect.id,usc:0}; 
						}
						var rcount = 0;
						uk.each(function(a){
							if(sk.contains(a)) rcount++;
						});
						if(rcount>0){
							var usc = (rcount/sk.length*item.sc).round();
							return {rs:paper.RS.partiallycorrect.id,usc:usc};
						}else{
							 return {rs:paper.RS.incorrect.id,usc:0};
						}
					}
				}else if(uk[0] && typeof(uk[0])=="object"){
					//alert("uk[0]==object"+item.no);
					//paper.debug("[info]"+typeof(uk[0]));
					if(uk[0].length==0 && uk[1].legnth==0) return {rs:paper.RS.incorrect.id,usc:0};
	//				uk[0].sort();
	//				uk[1].sort();
	//				uk[2].sort();
	//				sk[0].sort();
	//				sk[1].sort();
	//				sk[2].sort();
	//				if(sk.sort().toString()==uk.sort().toString()) return {rs:paper.RS.correct.id,usc:item.sc,rc:(sk[0].length+sk[1].length)};
					var rcounta = 0;
					var rcountb = 0;
					var rcountc = 0;
					uk[0].each(function(a){
						if(sk[0].contains(a)) rcounta++;
					});
					uk[1].each(function(a){
						if(sk[1].contains(a)) rcountb++;
					});
					if(sk[2] && uk[2]){
						uk[2].each(function(a){
							if(sk[2].contains(a)) rcountc++;
						});
					}
					var rcount = rcounta + rcountb + rcountc;
					var srcount = sk[0].length+sk[1].length;
					if(sk[2]) srcount += sk[2].length;
					
					if(rcount==0) return {rs:paper.RS.incorrect.id,usc:0,rc:0};
					if(rcount>0){
						//var usc = (rcount/(sk[0].length+sk[1].length)*item.sc).round();
						//return {rs:paper.RS.partiallycorrect.id,usc:usc,rc:rcount};
						var aCount = sk[0].length+sk[1].length;//总数量
						var usc = 0;
						switch (aCount) {
							case 7:
								if(rcount==7) usc = 4;
								else if(rcount==6) usc = 3;
								else if(rcount==5) usc = 2;
								else if(rcount==4) usc = 1;
								break;
							case 6:
								if(rcount==6) usc = 3;
								else if(rcount==5) usc = 2;
								else if(rcount==4) usc = 2;
								else if(rcount==3) usc = 1;
								break;
							case 5:
								if(rcount==5) usc = 3;
								else if(rcount==4) usc = 2;
								else if(rcount==3) usc = 1;
								break;
							case 4:
								if(rcount==4) usc = 2;
								else if(rcount==3) usc = 1;
								break;
							case 3:
								if(rcount==3) usc = 2;
								else if(rcount==2) usc = 1;
								break;
							case 2:
								if(rcount==2) usc = (item.sc>1?item.sc:1);
								else if(rcount==1) usc = (item.sc>1?1:0);
								break;
							default:
								return {rs:paper.RS.incorrect.id,usc:0,rc:0};
						}
						//alert("usc:"+usc+","+rcount);
						return {rs:(rcount==srcount?paper.RS.correct.id:paper.RS.partiallycorrect.id),usc:usc,rc:rcount};
					}
				}else{
					return {rs:paper.RS.incorrect.id,usc:0,rc:0};
				}
				
			}else{
				return {rs:paper.RS.incorrect.id,usc:0};
			}
		
		//}catch(e){
		//	paper.debug("[error]"+e);
		//}
	},
	stat:function(){//统计
		paper.store.stat = {};
		paper.store.stat.id = paper.data.skill;
		paper.store.stat.tc = paper.refers.length;
		paper.store.stat.tqc = 0;
		paper.store.stat.tjsc = 0;//jiashi
		paper.store.stat.sc = 0;
		paper.store.stat.usc = 0;
		paper.refers.each(function(refer){
			if(refer.jiashi){
				paper.store.stat.tjsc++;
			}else{
				paper.store.stat.tqc++;
				paper.store.stat.sc += refer.sc;
				paper.store.stat.usc += refer.usc;
			}
		});
		//paper.store.stat.susc = paper.scores.get(paper.store.stat.usc);
		//paper.store.stat.susc = paper.scores.getPercent(paper.store.stat.rpf);
		paper.store.stat.susc = paper.scores.getScore(paper.store.stat.usc,paper.store.stat.sc);
		paper.store.stat.level = paper.scores.getLevel(paper.store.stat.susc);
		var rpercent = (paper.store.stat.usc/paper.store.stat.sc)*100;
		paper.store.stat.rp = rpercent.round(0);
		paper.store.stat.rpf = rpercent.round(1);
		
//		if(isNaN(paper.store.stat.rp)) paper.store.stat.rp = 0;
//		if(isNaN(paper.store.stat.sc)) paper.store.stat.sc = 0;
//		if(isNaN(paper.store.stat.usc)) paper.store.stat.usc = 0;
		//paper.model.src();
//		alert(
//			" tc:"+paper.store.stat.tc+
//			" rp:"+paper.store.stat.rp+
//			" rpf:"+paper.store.stat.rpf+
//			" sc:"+paper.store.stat.sc+
//			" usc:"+paper.store.stat.usc+
//			" susc:"+paper.store.stat.susc+
//			" level:"+paper.store.stat.level
//		);
		return true;
	},
	calc:function(rc,tc){
		return ((rc/tc)*25).round(1);
	},
	getRight:function(m){
		var html = "<img border='0' src='images/que_"+(m.as==paper.RS.correct.id?"right":"wrong")+".gif' />";
//		if(!m.r){
//			var keyword = paper.model.getSKeyWord(m);
//			if(keyword){
//				html += "<span class='answer'>";
//				html += keyword;
//				html += "</span>";
//			}
//		}
		return html;
	},
	getRightImg:function(m){
		return "<img border='0' src='images/que_"+(m.r?"right":"wrong")+".gif' />";
	},
	setTitle:function(){
		window.document.title = window.document.title+' - '+ paper.common.getSkillTitle();// + " " +paper.mode.get() + (paper.userName?" "+paper.userName:"");
		new Element("span",{'class':'skilltitle'}).inject($("tdownl")).set('text',' - '+paper.common.getSkillTitle());
//		if(paper.mode.view2 || paper.mode.preview){
//			var selector = $("skillSelector");
//			if(selector){
//				selector.setStyle("display","inline");
//				selector.url = (paper.mode.preview?"paper.do?method=preview":"test.do?method=view");
//				selector.onchange = function(){
//					location = this.url+"&paperId="+paper.data.id+"&skillType="+this.value+"&userId="+paper.userId;
//				}
//				selector.value = paper.data.skill;
//			}
//		}
	},
	setForm:function(){
		paper.store.refers = paper.refers;
		
		$("paperId").value = paper.data.id;
		$("skillType").value = paper.data.skill;
		$("storeData").value = JSON.encode(paper.store);
		
		paper.debug("paper.model.setForm():"+JSON.encode(paper.store));
		return true;
	},
	src:function(){
		var s = "";
		paper.refers.each(function(a){
			s += "<div>"+JSON.encode(a)+"</div>";
		});
		paper.debug("paper.model.src():"+s);
	}
};
//动作
paper.action = {
	end:function(){
		var actionReq = new Request({
			method: 'get', 
			url: paper.widget.checker.connectUrl+paper.widget.checker.getData(),
			onSuccess:function(res){
				if(res=="1"){
					paper.debug("paper.action.end()>ok"+res);
					//return;
					if(paper.model.check()){
						if(paper.model.setForm()){
							paper.model.refreshSubmit = true; 
							paper.widget.xlogin.setMask("Submit Data......");
							paper.action.submit();
						}
					}
				}else{
					paper.debug("paper.action.end()>fail"+res);
					paper.widget.xlogin.init();
				}
			},
			onFailure:function(req){
				paper.debug("paper.action.end()>net_work_fail"+req);
				paper.widget.xlogin.init();
			}
		}).send();
	},
	autoEnd:function(){
		paper.action.end();
	},
	submit:function(){
		if(!paper.mode.test){
			return;
		}
		if(document.testForm){
			//paper.model.refreshSubmit = false; 
			document.testForm.action = paper.action.formAction+"?method=submit";
			document.testForm.submit();
		}
	}
}

//显示
paper.show = {
	init:function(no){
		paper.debug("paper.show.init(no):"+no);
		if(!no) no = 1;
		no = parseInt(no);
		
		paper.show.reInit(no);
		
		paper.show.updateBtnStatus(no);
		paper.bakno = no;
		
		paper.widget.xwiner.hideAll();
		
		var model = paper.model.get(no);
		if(!model){
			paper.model.initErrorQue();
			return;
		}
		if(model.rs==paper.RS.notyetseen.id) model.rs = paper.RS.notanswered.id;
		
		var parQue = paper.model.getQue(model.qid);
		var que = paper.model.getQueChild(parQue,model.id);
		if(paper.isReading || paper.isListening){
			if(!que){
				paper.model.initErrorQue("paper.show.init().que is null,"+JSON.encode(model)+","+no);
				return;
			}
		}
		
		paper.layout.setBackColor();
		
		if(paper.mode.test){
			if(paper.isReading){
				if(!paper.isDirections){
					paper.show.initReadingDirections(); return;
				}
				var retm = paper.model.checkFirstOfQue(no);
				if(retm){
					if(!retm.readed){
						paper.show.playerReadingRead(parQue);
						return;
					}
				}
				paper.show.initReading(parQue);
				
			}else if(paper.isListening){
				if(!paper.isHeadset){
					paper.show.initListeningHeadset(); return;
				}
//				if(!paper.isChangeVolume){
//					paper.show.initListeningChangeVolume(); return;
//				}
				if(!paper.isDirections){
					paper.show.initListeningDirections(); return;
				}
				
				var retm = paper.model.checkFirstOfQue(no);
				if(retm){
					if(!retm.played){
						paper.show.playListeningMedia(parQue);
						return;
					}
				}
				if(que.extend && que.extend=="1"){
					retm = paper.model.get(no);
					if(!retm.partPlayed){
						paper.show.playListeningMediaOfPart(parQue,que);
						return;
					}
				}
				paper.show.initListening();
			}else if(paper.isSpeaking){
				if(!paper.isMicrophone){
					paper.show.initSpeakingMicrophone(); return;
				}else{
					//paper.recorder.div.setStyle("display",'none');
					paper.recorder.hide();
				}
				if(!paper.isDirections){
					paper.show.initSpeakingDirections(); return;
				}
				paper.layout.setStyle({cols:1});
				
				que = parQue;
				var retm = paper.model.get(no);
				//paper.debug("attach2:"+que.attach2+",contenta:"+que.contenta);
				if(que.img5 && !retm.playDrectioned){
					paper.show.playSpeakingDrection(que);
					return;
				}
				
				if(que.contenta && que.contenta.length>0 && !retm.readed){//阅读材料
					paper.show.playSpeakingText(que);
					return;
				}else if(que.attach2 && !retm.played){//听力材料
					paper.show.playSpeakingMedia(que);
					return;
				}
				paper.show.initSpeaking();
			}else if(paper.isWriting){
				if(!paper.isDirections){
					paper.show.initWritingDirections(); return;
				}
				if(!paper.isWritingTaskOne){
					paper.show.initWritingTaskOne(); return;
				}
				if(paper.isWritingTaskOne_Finished && !paper.isWritingTaskTwo){
					paper.show.initWritingTaskTwo(); return;
				}
				paper.layout.setStyle({cols:1});
				que = parQue;
				var retm = paper.model.get(no);
				if(que.contenta && que.contenta.length>0 && !retm.readed){//阅读材料
					paper.show.playWritingText(que);
					paper.layout.setSize();
					return;
				}else if(que.attach2 && !retm.played){//听力材料
					paper.show.playWritingMedia(que);
					return;
				}
				paper.show.initWriting();
			}
		}else if(paper.mode.view){
			if(paper.isReading){paper.show.initReading(parQue);}
			else if(paper.isListening){paper.layout.setStyle({cols:1});paper.show.initListening();}
			else if(paper.isSpeaking){paper.layout.setStyle({cols:1});paper.show.initSpeaking();que = parQue;}
			else if(paper.isWriting){paper.layout.setStyle({cols:1});paper.show.initWriting();que = parQue;}
		}else if(paper.mode.preview){
			if(paper.isReading){
				if(!paper.initNo){
					if(!paper.isDirections){
						paper.show.initReadingDirections(); return;
					}
				}
				paper.show.initReading(parQue);
				
			}else if(paper.isListening){
				if(!paper.initNo){
					if(!paper.isHeadset){
						paper.show.initListeningHeadset(); return;
					}
//					if(!paper.isChangeVolume){
//						paper.show.initListeningChangeVolume(); return;
//					}
					if(!paper.isDirections){
						paper.show.initListeningDirections(); return;
					}
				}
				paper.show.initListening();
				var retm = paper.model.checkFirstOfQue(no);
				if(retm){
					if(!retm.played){
						paper.show.playListeningMedia(parQue);
						return;
					}
				}
				if(que.extend && que.extend=="1"){
					retm = paper.model.get(no);
					if(!retm.partPlayed){
						paper.show.playListeningMediaOfPart(parQue,que);
						return;
					}
				}
			}else if(paper.isSpeaking){
					if(!paper.isMicrophone){
						paper.show.initSpeakingMicrophone(); return;
					}
				if(!paper.initNo){
					if(!paper.isDirections){
						paper.show.initSpeakingDirections(); return;
					}
				}
				paper.layout.setStyle({cols:1});
				paper.show.initSpeaking();
				que = parQue;
				var retm = paper.model.get(no);
				if(que.img5 && !retm.playDrectioned){
					paper.show.playSpeakingDrection(que);
					return;
				}
				if(que.contenta && que.contenta.length>0 && !retm.readed){//阅读材料
					paper.show.playSpeakingText(que);
					return;
				}else if(que.attach2 && !retm.played){//听力材料
					paper.show.playSpeakingMedia(que);
					return;
				}
			}else if(paper.isWriting){
				if(!paper.initNo){
					if(!paper.isDirections){
						paper.show.initWritingDirections(); return;
					}
					if(!paper.isWritingTaskOne){
						paper.show.initWritingTaskOne(); return;
					}
					if(paper.isWritingTaskOne_Finished && !paper.isWritingTaskTwo){
						paper.show.initWritingTaskTwo(); return;
					}
				}
				paper.layout.setStyle({cols:1});
				paper.show.initWriting();
				que = parQue;
				var retm = paper.model.get(no);
				if(que.contenta && que.contenta.length>0 && !retm.readed){//阅读材料
					paper.show.playWritingText(que);
					paper.layout.setSize();
					return;
				}else if(que.attach2 && !retm.played){//听力材料
					paper.show.playWritingMedia(que);
					return;
				}
			}
		}
		//paper.tip.set("html",que.desc);
		//if(paper.current.qid!=que.id) paper.mmlmw.set("html",que.content);
		
		if(!que || !que.type){
			if(paper.isReading){
				paper.show.setReadContent(parQue,que);	
			}
			return;
		}
	
		if(que.type==paper.QT.ydpp){
			//paper.debug(que.numtype);
			paper.mmlmw.empty();
			paper.layout.setStyle({cols:1});
			paper.show.setReadContent(parQue,que);
			paper.show.showButton("viewTextBtn");
			
			var rlbox = new Element("div",{'class':'rlbox'}).inject(paper.mmlmw);
			var directions = new Element("div",{'class':'directions'}).inject(rlbox);
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(directions);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr);
			new Element("div").inject(rttdb).set('html',que.desc);
			if(que.content) new Element("div",{'class':'quetips'}).inject(rttdb).set('html',que.content);
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){
					var sfeedback = new Element("div",{'class':'sfeedback','id':'feedbackdiv'}).inject(rttdb);
					var salinke = new Element("a").inject(sfeedback);
					salinke.set('html','显示解析');
					salinke.fb = paper.widget.jsHtml(que.feedback);
					salinke.onclick = function(){
						paper.widget.xwiner.init("ae","题目解析",this.fb,paper.common.sampleWin);
					}
				}
			}
			
			var dropables = [];
			var dragItems = [];
			if(que.numtype==1){//summary ******************************************************************************
				model.sk.each(function(a,ai){
					var optlist = new Element("div",{'class':'optlist'}).inject(rlbox);
					optlist.index = ai;
					optlist.no = no;
					if(model["uk"+ai]){
						var aoptid = model["uk"+ai];
						var aopttile = que.options.filter(function(a){return a.id==aoptid})[0].content;
						var aoptspan = new Element("span").inject(optlist).set('text',aopttile);
						if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
							if(model.sk.contains(aoptid)) aoptspan.setStyle("background","#ffff00");
						}
						optlist.initid = model["uk"+ai];
					}
					if(paper.mode.test || paper.mode.preview){
						optlist.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk) m.uk = [];
							var valid = null;
							if(this.el){
								valid = this.el.id;
								this.el.setStyle("display","");
								this.el = null;
							}
							if(this.initid){
								var initid = this.initid;
								valid = initid;
								$$(".chitem").each(function(a){
									if(a.id==initid){
										a.setStyle("visibility","visible");
									}
								});
								this.initid = null;
							}
							m.uk.erase(parseInt(valid));
							if(m["uk"+this.index]) m["uk"+this.index] = null;
							if(!m.uk || m.uk.length<=0) m.rs = paper.RS.notanswered.id
							this.set('text','');
						});
						dropables.push(optlist);
					}
					new Element("div",{'class':'optlist-v'}).inject(rlbox);
				});
				
				var choices = new Element("div",{'class':'choices'}).inject(rlbox);
				var chtitle = new Element("div",{'class':'chtitle'}).inject(choices).set('text','Answer Choices');
				que.options.each(function(a){//初始化待选项
					var chitem = new Element("div",{'class':'chitem'}).inject(choices);
					var letext = new Element("span").inject(chitem).set('text',a.content);
					chitem.id = a.id;
					chitem.no = no;
					chitem.txt = a.content;
					if(model.uk && model.uk.length>0){
						if(model.uk.contains(a.id)) chitem.setStyle("visibility","hidden");
					}
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
						if(model.sk.contains(a.id)) letext.setStyle("background","#ffff00");
					}
					
					//chitem.onclick = function(){alert(this.id);}
					dragItems.push(chitem);
				});
				new Element("div",{'class':'space-10'}).inject(rlbox);
				var answertip = new Element("div",{'class':'answertip'}).inject(rlbox).set('html',paper.common.answerDragTip);
				if(paper.mode.test || paper.mode.preview){
					answertip.coord = answertip.getCoordinates();
					answertip.setStyle("position","absolute");
					answertip.setStyles(answertip.coord);
					
					//choices.height = choices.getSize().y;
					//alert(choices.height);
				}
				//初始化拖拽
				if(paper.mode.test || paper.mode.preview){
					for(var i=(dragItems.length-1);i>=0;i--){
						var di = dragItems[i];
						var coord = di.getCoordinates();
						di.setStyles(coord);//设置原始位置
						di.coord = coord;
						di.drag = di.makeDraggable({
							container:document.body,
							droppables:dropables,
							onEnter:function(el,dr){
								if(!dr.el && !dr.initid) dr.highlight("#FF8C00");
							},
							onDrop:function(el,dr){
								if(dr){
									if(!dr.el && !dr.initid){
										dr.set('text',el.txt);
										dr.el = el;
										el.setStyle("display","none");
										var m = paper.model.get(dr.no);
										if(!m.uk) m.uk = [];
										if(!m.uk.contains(el.id)) m.uk.push(parseInt(el.id));
										m["uk"+dr.index] = parseInt(el.id);
										if(m.uk.length>0) m.rs = paper.RS.answered.id;
										//paper.debug(JSON.encode(m));
									}
								}
								el.setStyles(el.coord);
							}
						});
					}
					//choices.setStyle("height",choices.height);
				}
//				var a = paper.mmlm.getScrollSize().y;
//				var aa = paper.mmlm.getSize().y;
//				var b = document.body.getSize().y;
//				
//				alert(aa+"/"+a+">"+(a+85)+","+b);
//				var cha = a-aa;
//				if(cha>0){
//					document.body.setStyle("height",(b+cha)+"px");
//				}
			}else if(que.numtype==2){//category chart ***********************************************************

				var plats = new Element("div",{'class':'plats'}).inject(rlbox);
				var lefts =  new Element("div",{'class':'lefts'}).inject(plats);
				var rights =  new Element("div",{'class':'rights'}).inject(plats);
				
				//右边答案选项
				if(model.sk && model.sk.length>=2){
					var aopts = model.sk[0];
					var bopts = model.sk[1];
					var copts = model.sk[2];//maybe
					var abtitles = que.options.filter(function(a){return a.value==-1});
					
					var rititle1 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[0].content);
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)) rititle1.setStyle("background","#ffff00");
					aopts.each(function(a,ai){
						var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
						optlist.index = ai;
						optlist.no = no;
						optlist.ab = 0;
						if(model["uk"+optlist.ab+ai]){
							var aoptid = model["uk"+optlist.ab+ai];
							var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
							var aspan = new Element("span").inject(optlist).set('text',atitle);
							if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
								if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
								if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
								if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
							}
							optlist.initid = model["uk"+optlist.ab+ai];
						}
						if(paper.mode.test || paper.mode.preview){
							optlist.addEvent("click",function(){
								var m = paper.model.get(this.no);
								if(!m.uk){
									m.uk = [];
									m.uk[0] = [];
									m.uk[1] = [];
									m.uk[2] = [];
								}
								var valid = null;
								if(this.el){
									valid = this.el.id;
									this.el.setStyle("display","");
									this.el = null;
								}
								if(this.initid){
									var initid = this.initid;
									valid = initid;
									$$(".leitem").each(function(a){
										if(a.id==initid){
											a.setStyle("visibility","visible");
										}
									});
									this.initid = null;
								}
								m.uk[this.ab].erase(parseInt(valid));
								if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
								if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0 && m.uk[2].length==0)) m.rs = paper.RS.notanswered.id
								this.set('text','');
							});
							dropables.push(optlist);
						}
					});
					
					var rititle2 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[1].content);
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)) rititle2.setStyle("background","#BDBE00");
					bopts.each(function(a,ai){
						var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
						optlist.index = ai;
						optlist.no = no;
						optlist.ab = 1;
						if(model["uk"+optlist.ab+ai]){
							var aoptid = model["uk"+optlist.ab+ai];
							var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
							var aspan = new Element("span").inject(optlist).set('text',atitle);
							if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
								if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
								if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
								if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
							}
							optlist.initid = model["uk"+optlist.ab+ai];
						}
						if(paper.mode.test || paper.mode.preview){
							optlist.addEvent("click",function(){
								var m = paper.model.get(this.no);
								if(!m.uk){
									m.uk = [];
									m.uk[0] = [];
									m.uk[1] = [];
									m.uk[2] = [];
								}
								var valid = null;
								if(this.el){
									valid = this.el.id;
									this.el.setStyle("display","");
									this.el = null;
								}
								if(this.initid){
									var initid = this.initid;
									valid = initid;
									$$(".leitem").each(function(a){
										if(a.id==initid){
											a.setStyle("visibility","visible");
										}
									});
									this.initid = null;
								}
								m.uk[this.ab].erase(parseInt(valid));
								if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
								if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0 && m.uk[2].length==0)) m.rs = paper.RS.notanswered.id
								this.set('text','');
							});
							dropables.push(optlist);
						}
					});
					
					if(copts && copts.length>0){
					var rititle3 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[2].content);
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)) rititle3.setStyle("background","#EEB500");
					copts.each(function(a,ai){
						var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
						optlist.index = ai;
						optlist.no = no;
						optlist.ab = 2;
						if(model["uk"+optlist.ab+ai]){
							var aoptid = model["uk"+optlist.ab+ai];
							var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
							var aspan = new Element("span").inject(optlist).set('text',atitle);
							if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
								if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
								if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
								if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
							}
							optlist.initid = model["uk"+optlist.ab+ai];
						}
						if(paper.mode.test || paper.mode.preview){
							optlist.addEvent("click",function(){
								var m = paper.model.get(this.no);
								if(!m.uk){
									m.uk = [];
									m.uk[0] = [];
									m.uk[1] = [];
									m.uk[2] = [];
								}
								var valid = null;
								if(this.el){
									valid = this.el.id;
									this.el.setStyle("display","");
									this.el = null;
								}
								if(this.initid){
									var initid = this.initid;
									valid = initid;
									$$(".leitem").each(function(a){
										if(a.id==initid){
											a.setStyle("visibility","visible");
										}
									});
									this.initid = null;
								}
								m.uk[this.ab].erase(parseInt(valid));
								if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
								if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0 && m.uk[2].length==0)) m.rs = paper.RS.notanswered.id
								this.set('text','');
							});
							dropables.push(optlist);
						}
					});
					}
				}
				//左边待选项
				new Element("div",{'class':'letitle'}).inject(lefts).set('text','Answer Choices');
				que.options.each(function(a){
					if(a.value!=-1){
						var leitem = new Element("div",{'class':'leitem'}).inject(lefts);
						var letext = new Element("span").inject(leitem).set('text',a.content);
						leitem.id = a.id;
						leitem.no = no;
						leitem.txt = a.content;
						if(model.uk && model.uk.length>0){
							if(model.uk[0].contains(a.id) || model.uk[1].contains(a.id) || (model.uk[2] && model.uk[2].contains(a.id))) leitem.setStyle("visibility","hidden");
						}
						if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
							if(model.sk[0] && model.sk[0].contains(a.id)) letext.setStyle("background","#ffff00");
							if(model.sk[1] && model.sk[1].contains(a.id)) letext.setStyle("background","#BDBE00");
							if(model.sk[2] && model.sk[2].contains(a.id)) letext.setStyle("background","#EEB500");
						}
						//leitem.ondblclick = function(){alert(this.id+">"+this.txt);}
						dragItems.push(leitem);
					}
				});
				
				new Element("div",{'class':'space-10'}).inject(rlbox);
				var answertip = new Element("div",{'class':'answertip'}).inject(rlbox).set('html',paper.common.answerDragTip);
				if(paper.mode.test || paper.mode.preview){
					answertip.coord = answertip.getCoordinates();
					answertip.setStyle("position","absolute");
					answertip.setStyles(answertip.coord);
				}
				
				if(paper.mode.test || paper.mode.preview){
					//初始化拖拽

					for(var i=(dragItems.length-1);i>=0;i--){
						var di = dragItems[i];
						var coord = di.getCoordinates();
						di.setStyles(coord);//设置原始位置
						di.coord = coord;
						di.drag = di.makeDraggable({
							container:document.body,
							droppables:dropables,
							onEnter:function(el,dr){
								if(!dr.el && !dr.initid) dr.highlight("#FF8C00");
							},
							onDrop:function(el,dr){
								if(dr){
									if(!dr.el && !dr.initid){
										dr.set('text',el.txt);
										dr.el = el;
										el.setStyle("display","none");
										var m = paper.model.get(dr.no);
										if(!m.uk){
											m.uk = [];
											m.uk[0] = [];
											m.uk[1] = [];
											m.uk[2] = [];
										}
										if(!m.uk[dr.ab].contains(el.id)) m.uk[dr.ab].push(parseInt(el.id));
										m["uk"+dr.ab+dr.index] = parseInt(el.id);
										if(m.uk[0].length>0 || m.uk[1].length>0 || m.uk[2].length>0) m.rs = paper.RS.answered.id;
									}
								}
								el.setStyles(el.coord);
							}
						});
					}
				}
			}
//			if(paper.mode.view || paper.mode.preview){
//				if(que.feedback){//set feedback
//					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rlbox);
//					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
//					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
//				}
//			}
		}else if(que.type==paper.QT.jztk){
			paper.layout.setStyle();
			paper.mmlmw.empty();
			paper.show.setReadContent(parQue,que);
			var aIndex = 1;
			var startEl = null;
			paper.mmrmw.getElements("input").each(function(a,ai){
				if(a.name==paper.common.psquares){
					var square = a.square;
					if(!square){
						square = new Element("span",{'class':'squares'}).inject(a,'after');
						square.no = no;
						square.txt = que.contenta;
						square.value = aIndex;
						a.square = square;
						aIndex++;
						if(paper.mode.test || paper.mode.preview){
							square.addEvent("click",function(){
								paper.mmrmw.getElements(".squares-val").each(function(a){
										a.set('class','squares');
										a.set('text',"");
								});
								this.set('class','squares-val');
								this.set('text',this.txt);
								var m = paper.model.get(this.no);
								m.uk = parseInt(this.value);
								if(m.uk) m.rs = paper.RS.answered.id
							});
						}
					}else{
						square.setStyle('display','');
						square.set('className','squares');
						square.set('text','');
					}
					var m = paper.model.get(no);
					if(m.uk && m.uk==square.value){
						square.set('class','squares-val');
						square.set('text',que.contenta);
					}
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
						if(m.sk==square.value){
							square.set('class','squares-sk');
							square.set('text',que.contenta);
						}
					}else{
//						if(m.sk==square.value){
//							square.set('class','squares');
//							square.set('text','');
//						}
					}
					if(!startEl) startEl = square;
				}
			});
			if(startEl){
				//try {startEl.focus();} catch (e) {}
				paper.layout.setMMRMScorllTop(startEl);
			}
			
			var rque = new Element("div",{'class':'quebox'}).inject(paper.mmlmw);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content);
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
		}else if(que.type==paper.QT.ydxz){
			paper.layout.setStyle();
			
			paper.show.setReadContent(parQue,que);
			
			paper.mmlmw.empty();
			var rque = new Element("div",{'class':'quebox'}).inject(paper.mmlmw);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);
			var ropts = new Element("div",{'class':'opts'}).inject(rque);
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			
			var qtitle = que.content;
			if(que && que.word){
				qtitle = qtitle.replace(que.word.trim(),"<span class='bxstoefltexthl-on'>"+que.word+"</span>");
			}
			new Element("td",{'class':'wenzi'}).inject(rttr).set('html',qtitle);
			
			que.options.each(function(o,oi){
				var ropt = new Element("div",{'class':'queopt'}).inject(ropts);
				//new Element("span",{'class':'abc'}).set("html",paper.common.abc(oi)).inject(ropt);
				//var input = new Element("input",{'type':'radio','name':'opt'+que.id,'value':o.id});
				var input = new Element("input",{'type':(que.numtype && que.numtype==2?'checkbox':'radio'),'name':'opt'+que.id,'value':o.id});
				input.inject(ropt);
				input.no = que.no;
				//new Element("span",{'class':'abc'}).set("html",paper.common.abc(oi)+".").inject(ropt);
				var opttext = new Element("span",{'class':'opttext'}).set("html",paper.widget.trim(o.content)).inject(ropt);
				
				var m = paper.model.get(que.no);
				if(m.uk && m.uk==o.id) input.set('checked','true');
				
				if(paper.mode.test || paper.mode.preview){
					input.addEvent("click",function(){
						var m = paper.model.get(this.no);
						if(m.uk==this.value){
							this.checked = false;
							m.uk = "";
							m.rs = paper.RS.notanswered.id
						}else{
							m.uk = parseInt(this.value);
							m.rs = paper.RS.answered.id
						}
					});
				}
				
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
					if(paper.mode.view) input.set('disabled',true);
					//if(m.sk && m.sk==o.id) opttext.setStyle("background","#FFFF00");
					if(typeof(model.sk)=="object"){
						if(model.sk.contains(o.id)) opttext.setStyle("background","#FFFF00");
					}else{
						if(model.sk && model.sk==o.id) opttext.setStyle("background","#FFFF00");
					}
				}
			});
			
			//paragraph arrows
			if(que.extend){
				var parrowshow = new Element("div",{'class':'parrowshow'}).inject(rque).set('html',paper.common.getParagraphShowText+paper.common.getArrowSpan()+".");
				var strs = que.extend.split(",");
				if(strs){
					var count = 0;
					paper.mmrmw.getElements(".arrows").each(function(a){
						strs.each(function(b,bi){
							if(a.val==b){
								a.setStyle("display","");
								if(count==0 && !que.word){
									paper.layout.setMMRMScorllTop(a);
								}
								count++;
							}
						});
					});
				}
			}
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
		}else if(que.type==paper.QT.tlxz){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			var rquewide = new Element("div",{'class':'quebox-lwide'}).inject(paper.mmlmw);
			var rque = new Element("div",{'class':'quebox-l'}).inject(rquewide);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);;
			
			var rtbl = new Element("table",{'border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content);
			//if(que.content.indexOf("say this")>0 || que.content.indexOf("says this")>0){
				 new Element("td").inject(rttr).set('html',paper.widget.getEarPhoneImg(que.content));
			//}
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			var optbox = new Element("div",{'id':'optbox','class':'opts'}).inject(rque);
			
			if(paper.mode.test) optbox.setStyle("display","none");
			
			paper.media.hideObj = optbox;
			que.options.each(function(o,oi){
				var ropt = new Element("div",{'class':'queopt'});
				ropt.inject(optbox);
				//new Element("span",{'class':'abc'}).set("html",paper.common.abc(oi)).inject(ropt);
				var input = new Element("input",{'type':(que.numtype && que.numtype==2?'checkbox':'radio'),'name':'opt'+que.id,'value':o.id});
				input.inject(ropt);
				input.no = que.no;
				if(model.uk){
					if(typeof(model.uk)=="object"){
						if(model.uk.contains(o.id)) input.set('checked','true');
					}else{
						if(model.uk==o.id) input.set('checked','true');
					}
				}
				if(paper.mode.test || paper.mode.preview){
					if(que.numtype && que.numtype==2){
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk) m.uk = [];
							var val = parseInt(this.value);
							if(this.checked==true){
								m.uk.include(val);
							}else{
								m.uk.erase(val);
							}
							if(m.uk.length>0){
								m.rs = paper.RS.answered.id;
							}else{
								m.rs = paper.RS.notanswered.id;
							}
						});
					}else{
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(m.uk==this.value){
								this.checked = false;
								m.uk = "";
								m.rs = paper.RS.notanswered.id
							}else{
								m.uk = parseInt(this.value);
								m.rs = paper.RS.answered.id
							}
						});
					}
				}
				var opttext = new Element("span",{'class':'opttext'}).set("text",paper.widget.trim(o.content)).inject(ropt);
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
					if(paper.mode.view) input.set('disabled',true);
					if(typeof(model.sk)=="object"){
						if(model.sk.contains(o.id)) opttext.setStyle("background","#FFFF00");
					}else{
						if(model.sk && model.sk==o.id) opttext.setStyle("background","#FFFF00");
					}
				}
			});
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
			
			if(paper.mode.test || paper.mode.preview){
				function _iShowQuestion(){
					paper.media.clear();
					if(paper.mode.test){
						if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
						paper.layout.setButtonImg(paper.next,'next',false);
					}
					if(paper.mode.preview) paper.show.showButton("solutionBtn");
				}
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							_iShowQuestion();
						}
					},1000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.tltpxz){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			var rquewide = new Element("div",{'class':'quebox-lwide'}).inject(paper.mmlmw);
			var rque = new Element("div",{'class':'quebox-l'}).inject(rquewide);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);;
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content+(que.content.indexOf("say this")>0 || que.content.indexOf("says this")>0?"<img src='images/toefl_earphone.gif'/>":""));
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			var optbox = new Element("div",{'id':'optbox','class':'opts_tp'}).inject(rque);
			
			if(paper.mode.test) optbox.setStyle("display","none");
			
			paper.media.hideObj = optbox;
			que.options.each(function(o,oi){
				var ropt = new Element("div",{'class':'queopt'});
				ropt.inject(optbox);
				//new Element("span",{'class':'abc'}).set("html",paper.common.abc(oi)).inject(ropt);
				var input = new Element("input",{'type':(que.numtype && que.numtype==2?'checkbox':'radio'),'name':'opt'+que.id,'value':o.id});
				input.inject(ropt);
				input.no = que.no;
				if(model.uk){
					if(typeof(model.uk)=="object"){
						if(model.uk.contains(o.id)) input.set('checked','true');
					}else{
						if(model.uk==o.id) input.set('checked','true');
					}
				}
				if(paper.mode.test || paper.mode.preview){
					if(que.numtype && que.numtype==2){
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk) m.uk = [];
							var val = parseInt(this.value);
							if(this.checked==true){
								m.uk.include(val);
							}else{
								m.uk.erase(val);
							}
							if(m.uk.length>0){
								m.rs = paper.RS.answered.id;
							}else{
								m.rs = paper.RS.notanswered.id;
							}
						});
					}else{
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(m.uk==this.value){
								this.checked = false;
								m.uk = "";
								m.rs = paper.RS.notanswered.id
							}else{
								m.uk = parseInt(this.value);
								m.rs = paper.RS.answered.id
							}
						});
					}
				}
				var optimg = new Element("img",{'class':'optimg'}).set("src",".."+o.content).inject(ropt);
				
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
					if(paper.mode.view) input.set('disabled',true);
					if(typeof(model.sk)=="object"){
						if(model.sk.contains(o.id)){
							optimg.setStyle("border","5px solid #FFFF00");
						}
					}else{
						if(model.sk && model.sk==o.id){
							optimg.setStyle("border","5px solid #FFFF00");
						}
					}
				}
			});
			new Element("div").inject(optbox).setStyle("clear","both");
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
			
			if(paper.mode.test || paper.mode.preview){
				function _iShowQuestion(){
					paper.media.clear();
					if(paper.mode.test){
						if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
						paper.layout.setButtonImg(paper.next,'next',false);
					}
					if(paper.mode.preview) paper.show.showButton("solutionBtn");
				}
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							_iShowQuestion();
						}
					},1000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.tldztpxz){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			var rquewide = new Element("div",{'class':'quebox-lwide'}).inject(paper.mmlmw);
			var rque = new Element("div",{'class':'quebox-l'}).inject(rquewide);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);;
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content+(que.content.indexOf("say this")>0 || que.content.indexOf("says this")>0?"<img src='images/toefl_earphone.gif'/>":""));
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			var optbox = new Element("div",{'id':'optbox','class':'opts_tp'}).inject(rque);
			
			if(paper.mode.test) optbox.setStyle("display","none");
			
			paper.media.hideObj = optbox;
			var optviewImg = new Element("img").inject(optbox);
			optviewImg.src = ".."+que.img2;
			que.options.each(function(o,oi){
				var ropt = new Element("div",{'class':'queopt'});
				ropt.inject(optbox);
				//new Element("span",{'class':'abc'}).set("html",paper.common.abc(oi)).inject(ropt);
				var input = new Element("input",{'type':(que.numtype && que.numtype==2?'checkbox':'radio'),'name':'opt'+que.id,'value':o.id});
				input.inject(ropt);
				input.no = que.no;
				if(model.uk){
					if(typeof(model.uk)=="object"){
						if(model.uk.contains(o.id)) input.set('checked','true');
					}else{
						if(model.uk==o.id) input.set('checked','true');
					}
				}
				if(paper.mode.test || paper.mode.preview){
					if(que.numtype && que.numtype==2){
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk) m.uk = [];
							var val = parseInt(this.value);
							if(this.checked==true){
								m.uk.include(val);
							}else{
								m.uk.erase(val);
							}
							if(m.uk.length>0){
								m.rs = paper.RS.answered.id;
							}else{
								m.rs = paper.RS.notanswered.id;
							}
						});
					}else{
						input.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(m.uk==this.value){
								this.checked = false;
								m.uk = "";
								m.rs = paper.RS.notanswered.id
							}else{
								m.uk = parseInt(this.value);
								m.rs = paper.RS.answered.id
							}
						});
					}
				}
				var opttext = new Element("span",{'class':'opttext'}).set("text",paper.widget.trim(o.content)).inject(ropt);
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
					if(paper.mode.view) input.set('disabled',true);
					if(typeof(model.sk)=="object"){
						if(model.sk.contains(o.id)) opttext.setStyle("background","#FFFF00");
					}else{
						if(model.sk && model.sk==o.id) opttext.setStyle("background","#FFFF00");
					}
				}
			});
			new Element("div").inject(optbox).setStyle("clear","both");
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
			
			if(paper.mode.test || paper.mode.preview){
				function _iShowQuestion(){
					paper.media.clear();
					if(paper.mode.test){
						if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
						paper.layout.setButtonImg(paper.next,'next',false);
					}
					if(paper.mode.preview) paper.show.showButton("solutionBtn");
				}
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							_iShowQuestion();
						}
					},1000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.tlpp){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			var rquewide = new Element("div",{'class':'quebox-lwide'}).inject(paper.mmlmw);
			var rque = new Element("div",{'class':'quebox-l'}).inject(rquewide);
			var rtitle = new Element("div",{'class':'title'}).inject(rque);;

			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(rtitle);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content);
			
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			var optbox = new Element("div",{'id':'optbox','class':'opts'}).inject(rque);
			if(paper.mode.test) optbox.setStyle("display","none");
			paper.media.hideObj = optbox;
			
			var table = new Element("table",{'border':'0','cellpadding':'0','cellspacing':'1','width':'100%'}).inject(optbox);
			var tbody = new Element("tbody").inject(table);
			var tra = new Element("tr").inject(tbody);
			new Element("td").inject(tra);
			var ritem = (que.qdata?que.qdata:que.word);
			
			if(!ritem) ritem = "Yes/No";
			var ritems = ritem.split("/");
			for(var ri=0;ri<ritems.length;ri++){
				new Element("th").inject(tra).set('text',ritems[ri]);
			}
			que.options.each(function(o,oi){
				var trb = new Element("tr").inject(tbody);
				new Element("td").inject(trb).set('text',o.content);
				
				for(var ri=0;ri<ritems.length;ri++){
					var tha = new Element("th").inject(trb);
					var yesradio = new Element("input",{'type':'radio','name':'tlpp_opt'+o.id}).inject(tha).set('value',(ri+1));
					yesradio.no = no;
					yesradio.index = oi;
					if(paper.mode.test || paper.mode.preview){
						yesradio.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk) m.uk = [];
							if(m.uk[this.index]==this.value){
								this.checked = false;
								m.uk[this.index] = "";
							}else{
								m.uk[this.index] = parseInt(this.value);
							}
							if(m.uk.length>0){
								m.rs = paper.RS.answered.id
							}else{
								m.rs = paper.RS.notanswered.id;
							}
						});
					}
					if(model.uk && model.uk[oi]>=0){
						if(model.uk[oi]==(ri+1)) yesradio.set('checked',true);
					}
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
						if(paper.mode.view) yesradio.set('disabled',true);
						if(o.value==(ri+1)) tha.setStyle('background','#ffff00');
						else if(o.value==0) thb.setStyle('background','#ffff00');
					}
				}
				
			});
			
			if(paper.mode.view || paper.mode.preview){
				if(que.feedback){//set feedback
					var fbdiv = new Element("div",{'class':'feedback','id':'feedbackdiv'}).inject(rque);
					new Element("label",{'class':'label'}).inject(fbdiv).set('html',paper.common.answerExplain);
					new Element("div",{'class':'txt'}).inject(fbdiv).set('html',paper.widget.jsHtml(que.feedback));
				}
			}
			
			if(paper.mode.test || paper.mode.preview){
				function _iShowQuestion(){
					paper.media.clear();
					if(paper.mode.test){
						if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
						paper.layout.setButtonImg(paper.next,'next',false);
					}
					if(paper.mode.preview) paper.show.showButton("solutionBtn");
				}
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							_iShowQuestion();
						}
					},2000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.tlpx){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			paper.layout.setStyle({cols:1});
			
			var rlbox = new Element("div",{'class':'rlbox'}).inject(paper.mmlmw).setStyle("padding","25px 0 0 0");
			var directions = new Element("div",{'class':'directions'}).inject(rlbox).setStyle("padding","0 0 10px 0");
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(directions);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content);
			
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			if(paper.mode.preview){
				if(que.feedback){
					var sfeedback = new Element("div",{'class':'sfeedback','id':'feedbackdiv'}).inject(rttdb);
					var salinke = new Element("a").inject(sfeedback);
					salinke.set('html','显示解析');
					salinke.fb = paper.widget.jsHtml(que.feedback);
					salinke.onclick = function(){
						paper.widget.xwiner.init("ae","题目解析",this.fb,paper.common.sampleWin);
					}
				}
			}
			
			var dropables = [];
			var dragItems = [];
			
			if(!model.sk) return;
			
			model.sk.each(function(a,ai){
				var optwarp = new Element("div",{'class':'optwarp'}).inject(rlbox);
				new Element("div",{'class':'optlistnum'}).inject(optwarp).set("html",(ai+1)+".");
				var optlist = new Element("div",{'class':'optlist'}).inject(optwarp);
				optlist.index = ai;
				optlist.no = no;
				if(model["uk"+ai]){
					var aoptid = model["uk"+ai];
					var aopttile = que.options.filter(function(a){return a.id==aoptid})[0].content;
					var aoptspan = new Element("span").inject(optlist).set('text',aopttile);
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
						//if(model.sk.contains(aoptid)) aoptspan.setStyle("background","#ffff00");
						var akey = model.sk.indexOf(aoptid)+1;
						if(model.sk.contains(a.id)) letext.setStyle("background","#ffff00");
						var iLhtml = aoptspan.innerHTML;
						aoptspan.innerHTML = "<strong>"+akey+". </strong>"+iLhtml;
					}
					optlist.initid = model["uk"+ai];
				}
				if(paper.mode.test || paper.mode.preview){
					optlist.addEvent("click",function(){
						var m = paper.model.get(this.no);
						if(!m.uk) m.uk = [];
						var valid = null;
						if(this.el){
							valid = this.el.id;
							this.el.setStyle("display","");
							this.el = null;
						}
						if(this.initid){
							var initid = this.initid;
							valid = initid;
							$$(".chitem").each(function(a){
								if(a.id==initid){
									a.setStyle("visibility","visible");
								}
							});
							this.initid = null;
						}
						//m.uk.erase(parseInt(valid));
						m.uk[this.index]=null;
						if(m["uk"+this.index]) m["uk"+this.index] = null;
						if(!m.uk || m.uk.length<=0) m.rs = paper.RS.notanswered.id
						this.set('text','');
					});
					dropables.push(optlist);
				}
				new Element("div",{'class':'optlist-v'}).inject(rlbox);
			});
			
			var choices = new Element("div",{'class':'choices'}).inject(rlbox);
//			var chtitle = new Element("div",{'class':'chtitle'}).inject(choices).set('text','Answer Choices');
			que.options.each(function(a){//初始化待选项
				var chitem = new Element("div",{'class':'chitem'}).inject(choices);
				var letext = new Element("span").inject(chitem).set('text',a.content);
				chitem.id = a.id;
				chitem.no = no;
				chitem.txt = a.content;
				if(model.uk && model.uk.length>0){
					if(model.uk.contains(a.id)) chitem.setStyle("visibility","hidden");
				}
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
					var akey = model.sk.indexOf(a.id)+1;
					if(model.sk.contains(a.id)) letext.setStyle("background","#ffff00");
					var iLhtml = letext.innerHTML;
					letext.innerHTML = "<strong>"+akey+". </strong>"+iLhtml;
				}
				
				//chitem.onclick = function(){alert(this.id);}
				dragItems.push(chitem);
			});
			new Element("div",{'class':'space-10'}).inject(rlbox);
			var answertip = new Element("div",{'class':'answertip'}).inject(rlbox).set('html',paper.common.answerDragTipOfTLPX);
			if(paper.mode.test || paper.mode.preview){
				answertip.coord = answertip.getCoordinates();
				answertip.setStyle("position","absolute");
				answertip.setStyles(answertip.coord);
				
				//choices.height = choices.getSize().y;
				//alert(choices.height);
			}
			
			//初始化拖拽
			if(paper.mode.test || paper.mode.preview){
				for(var i=(dragItems.length-1);i>=0;i--){
					var di = dragItems[i];
					var coord = di.getCoordinates();
					di.setStyles(coord);//设置原始位置
					di.coord = coord;
					di.drag = di.makeDraggable({
						container:document.body,
						droppables:dropables,
						onEnter:function(el,dr){
							if(!dr.el && !dr.initid) dr.highlight("#FF8C00");
						},
						onDrop:function(el,dr){
							if(dr){
								if(!dr.el && !dr.initid){
									dr.set('text',el.txt);
									dr.el = el;
									el.setStyle("display","none");
									var m = paper.model.get(dr.no);
									if(!m.uk) m.uk = [];
									if(!m.uk.contains(el.id)){
										//m.uk.push(parseInt(el.id));
										m.uk[dr.index]=parseInt(el.id);
									}
									m["uk"+dr.index] = parseInt(el.id);
									if(m.uk.length>0) m.rs = paper.RS.answered.id;
									//paper.debug(JSON.encode(m));
								}
							}
							el.setStyles(el.coord);
						}
					});
				}
				//choices.setStyle("height",choices.height);
			}
			
//			function _iShowQuestion(){
//				paper.media.clear();
//				if(paper.mode.test){
//					//if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
//					paper.layout.setButtonImg(paper.next,'next',false);
//				}
//				if(paper.mode.preview) paper.show.showButton("solutionBtn");
//			}
			if(paper.mode.test || paper.mode.preview){
				
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							//_iShowQuestion();
							if(paper.mode.test){
								//if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
								paper.layout.setButtonImg(paper.next,'next',false);
							}
							if(paper.mode.preview) paper.show.showButton("solutionBtn");
						}
					},2000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.tlfl){
			if(paper.mode.view || paper.mode.preview) paper.show.handleListeningView(model,que,parQue);
			paper.mmlmw.empty();
			paper.layout.setStyle({cols:1});
			
			var rlbox = new Element("div",{'class':'rlbox'}).inject(paper.mmlmw).setStyle("padding","25px 0 0 0");
			var directions = new Element("div",{'class':'directions'}).inject(rlbox).setStyle("padding","0 0 10px 0");
			
			var rtbl = new Element("table",{'width':'100%','border':'0','cellpadding':'0','cellspacing':'0'}).inject(directions);
			var rtbody = new Element("tbody").inject(rtbl);
			var rttr = new Element("tr").inject(rtbody);
			if(paper.mode.view){
				var rttda = new Element("td",{'class':'goucha'}).inject(rttr).set('html',paper.model.getRight(model));
			}
			var rttdb = new Element("td",{'class':'wenzi'}).inject(rttr).set('html',que.content);
			
			if(paper.mode.preview || paper.mode.view || (paper.mode.test && !paper.media.playQueAudios)){
				if(que.attach || que.attach2){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(rttdb);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playListeningMediaOfPart(parQue,que);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							var que = paper.model.getQueChild(parQue,model.id);
							paper.show.playQueAudio(que,paper._audio);
						}
					}
				}
			}
			
			if(paper.mode.preview){
				if(que.feedback){
					var sfeedback = new Element("div",{'class':'sfeedback','id':'feedbackdiv'}).inject(rttdb);
					var salinke = new Element("a").inject(sfeedback);
					salinke.set('html','显示解析');
					salinke.fb = paper.widget.jsHtml(que.feedback);
					salinke.onclick = function(){
						paper.widget.xwiner.init("ae","题目解析",this.fb,paper.common.sampleWin);
					}
				}
			}
			
			var dropables = [];
			var dragItems = [];
			
			if(!model.sk) return;

			var plats = new Element("div",{'class':'plats'}).inject(rlbox);
			var lefts =  new Element("div",{'class':'lefts'}).inject(plats);
			var rights =  new Element("div",{'class':'rights'}).inject(plats);
			
			//右边答案选项
			if(model.sk && model.sk.length>=2){
				var aopts = model.sk[0];
				var bopts = model.sk[1];
				//var copts = model.sk[2];//maybe
				var abtitles = que.options.filter(function(a){return a.value==-1});
				
				var rititle1 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[0].content);
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)) rititle1.setStyle("background","#ffff00");
				aopts.each(function(a,ai){
					var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
					optlist.index = ai;
					optlist.no = no;
					optlist.ab = 0;
					if(model["uk"+optlist.ab+ai]){
						var aoptid = model["uk"+optlist.ab+ai];
						var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
						var aspan = new Element("span").inject(optlist).set('text',atitle);
						if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
							if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
							if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
							if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
						}
						optlist.initid = model["uk"+optlist.ab+ai];
					}
					if(paper.mode.test || paper.mode.preview){
						optlist.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk){
								m.uk = [];
								m.uk[0] = [];
								m.uk[1] = [];
								//m.uk[2] = [];
							}
							var valid = null;
							if(this.el){
								valid = this.el.id;
								this.el.setStyle("display","");
								this.el = null;
							}
							if(this.initid){
								var initid = this.initid;
								valid = initid;
								$$(".leitem").each(function(a){
									if(a.id==initid){
										a.setStyle("visibility","visible");
									}
								});
								this.initid = null;
							}
							m.uk[this.ab].erase(parseInt(valid));
							if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
							if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0)) m.rs = paper.RS.notanswered.id
							this.set('text','');
						});
						dropables.push(optlist);
					}
				});
				
				var rititle2 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[1].content);
				if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)) rititle2.setStyle("background","#BDBE00");
				bopts.each(function(a,ai){
					var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
					optlist.index = ai;
					optlist.no = no;
					optlist.ab = 1;
					if(model["uk"+optlist.ab+ai]){
						var aoptid = model["uk"+optlist.ab+ai];
						var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
						var aspan = new Element("span").inject(optlist).set('text',atitle);
						if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
							if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
							if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
							//if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
						}
						optlist.initid = model["uk"+optlist.ab+ai];
					}
					if(paper.mode.test || paper.mode.preview){
						optlist.addEvent("click",function(){
							var m = paper.model.get(this.no);
							if(!m.uk){
								m.uk = [];
								m.uk[0] = [];
								m.uk[1] = [];
								//m.uk[2] = [];
							}
							var valid = null;
							if(this.el){
								valid = this.el.id;
								this.el.setStyle("display","");
								this.el = null;
							}
							if(this.initid){
								var initid = this.initid;
								valid = initid;
								$$(".leitem").each(function(a){
									if(a.id==initid){
										a.setStyle("visibility","visible");
									}
								});
								this.initid = null;
							}
							m.uk[this.ab].erase(parseInt(valid));
							if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
							if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0)) m.rs = paper.RS.notanswered.id
							this.set('text','');
						});
						dropables.push(optlist);
					}
				});
				
//				if(copts && copts.length>0){
//					var rititle3 = new Element("div",{'class':'rititle'}).inject(rights).set('text',abtitles[2].content);
//					if(paper.mode.view || paper.mode.solution) rititle3.setStyle("background","#EEB500");
//					bopts.each(function(a,ai){
//						var optlist = new Element("div",{'class':'rioptlist'}).inject(rights);
//						optlist.index = ai;
//						optlist.no = no;
//						optlist.ab = 2;
//						if(model["uk"+optlist.ab+ai]){
//							var aoptid = model["uk"+optlist.ab+ai];
//							var atitle = que.options.filter(function(a){return a.id==aoptid})[0].content;
//							var aspan = new Element("span").inject(optlist).set('text',atitle);
//							if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
//								if(model.sk[0] && model.sk[0].contains(aoptid)) aspan.setStyle("background","#ffff00");
//								if(model.sk[1] && model.sk[1].contains(aoptid)) aspan.setStyle("background","#BDBE00");
//								if(model.sk[2] && model.sk[2].contains(aoptid)) aspan.setStyle("background","#EEB500");
//							}
//							optlist.initid = model["uk"+optlist.ab+ai];
//						}
//						if(paper.mode.test || paper.mode.preview){
//							optlist.addEvent("click",function(){
//								var m = paper.model.get(this.no);
//								if(!m.uk){
//									m.uk = [];
//									m.uk[0] = [];
//									m.uk[1] = [];
//									//m.uk[2] = [];
//								}
//								var valid = null;
//								if(this.el){
//									valid = this.el.id;
//									this.el.setStyle("display","");
//									this.el = null;
//								}
//								if(this.initid){
//									var initid = this.initid;
//									valid = initid;
//									$$(".leitem").each(function(a){
//										if(a.id==initid){
//											a.setStyle("visibility","visible");
//										}
//									});
//									this.initid = null;
//								}
//								m.uk[this.ab].erase(parseInt(valid));
//								if(m["uk"+this.ab+this.index]) m["uk"+this.ab+this.index] = null;
//								if(!m.uk || (m.uk[0].length==0 && m.uk[1].length==0)) m.rs = paper.RS.notanswered.id
//								this.set('text','');
//							});
//							dropables.push(optlist);
//						}
//					});
//				}
			}
			
			//左边待选项
			//new Element("div",{'class':'letitle'}).inject(lefts).set('text','Answer Choices');
			que.options.each(function(a){
				if(a.value!=-1){
					var leitem = new Element("div",{'class':'leitem'}).inject(lefts);
					var letext = new Element("span").inject(leitem).set('text',a.content);
					leitem.id = a.id;
					leitem.no = no;
					leitem.txt = a.content;
					if(model.uk && model.uk.length>0){
						if(model.uk[0].contains(a.id) || model.uk[1].contains(a.id) || (model.uk[2] && model.uk[2].contains(a.id))) leitem.setStyle("visibility","hidden");
					}
					if(paper.mode.view || paper.mode.solution || (paper.mode.preview && !paper.mode.review)){
						if(model.sk[0] && model.sk[0].contains(a.id)) letext.setStyle("background","#ffff00");
						if(model.sk[1] && model.sk[1].contains(a.id)) letext.setStyle("background","#BDBE00");
						//if(model.sk[2] && model.sk[2].contains(a.id)) letext.setStyle("background","#EEB500");
					}
					//leitem.ondblclick = function(){alert(this.id+">"+this.txt);}
					dragItems.push(leitem);
				}
			});
			
			new Element("div",{'class':'space-10'}).inject(rlbox);
			var answertip = new Element("div",{'class':'answertip'}).inject(rlbox).set('html',paper.common.answerDragTipOfTLPX);
			if(paper.mode.test || paper.mode.preview){
				answertip.coord = answertip.getCoordinates();
				answertip.setStyle("position","absolute");
				answertip.setStyles(answertip.coord);
			}
			
			if(paper.mode.test || paper.mode.preview){
				//初始化拖拽
				for(var i=(dragItems.length-1);i>=0;i--){
					var di = dragItems[i];
					var coord = di.getCoordinates();
					di.setStyles(coord);//设置原始位置
					di.coord = coord;
					di.drag = di.makeDraggable({
						container:document.body,
						droppables:dropables,
						onEnter:function(el,dr){
							if(!dr.el && !dr.initid) dr.highlight("#FF8C00");
						},
						onDrop:function(el,dr){
							if(dr){
								if(!dr.el && !dr.initid){
									dr.set('text',el.txt);
									dr.el = el;
									el.setStyle("display","none");
									var m = paper.model.get(dr.no);
									if(!m.uk){
										m.uk = [];
										m.uk[0] = [];
										m.uk[1] = [];
										//m.uk[2] = [];
									}
									if(!m.uk[dr.ab].contains(el.id)) m.uk[dr.ab].push(parseInt(el.id));
									m["uk"+dr.ab+dr.index] = parseInt(el.id);
									if(m.uk[0].length>0 || m.uk[1].length>0 || m.uk[2].length>0) m.rs = paper.RS.answered.id;
								}
							}
							el.setStyles(el.coord);
						}
					});
				}
			}
			
			
			if(paper.mode.test || paper.mode.preview){
				function _iShowQuestion(){
					paper.media.clear();
					if(paper.mode.test){
						if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
						paper.layout.setButtonImg(paper.next,'next',false);
					}
					if(paper.mode.preview) paper.show.showButton("solutionBtn");
				}
				if(que.attach && paper.media.playQueAudios){//&& !model.attachPlayed
					paper.timer.main.pause();
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							paper.timer.main.resume();
							//_iShowQuestion();
							if(paper.mode.test){
								//if(paper.media.hideObj) paper.media.hideObj.setStyle("display","");
								paper.layout.setButtonImg(paper.next,'next',false);
							}
							if(paper.mode.preview) paper.show.showButton("solutionBtn");
						}
					},2000);
				}else{
					paper.timer.main.resume();
					_iShowQuestion();
				}
				
			}
		}else if(que.type==paper.QT.xz){
			paper.mmlmw.empty();
			paper.mmrmw.empty();
			paper.mmrmw.setStyle("padding","1px");
			paper.layout.setStyle();
			
			if(paper.mode.test){
				paper.show.showButton(["nextBtn"]);
				paper.layout.setButtonImg(paper.next,'nextb',true);
			}
			
			if(no==1){
				paper.mt.setStyle("display","block");
				paper.next.onclick = function(){
					//paper.debug(paper.timer.main.ing);
					if(!paper.timer.main.ing || paper.timer.main.ing<=0){
						paper.show.next();
					}else{
						paper.mt.setStyle("display","none");
						paper.mtw.empty();
						paper.layout.setSize();
						paper.mmlmw.empty();
						paper.mmrmw.empty();
						paper.layout.setStyle({cols:1});
						paper.show.hideButton();
						
						paper.widget.xwiner.hideAll();
						
						var warnboxwide = new Element("div",{'class':'warnboxwide'}).inject(paper.mmlmw);
						var warnbox = new Element("div",{'class':'warnbox'}).inject(warnboxwide);
						var warntitle = new Element("div",{'class':'warntitle'}).inject(warnbox).set('html','Exit Writing');
						var warnw = new Element("div",{'class':'warnw'}).inject(warnbox).set('html',paper.common.exitWritingTask1);
						var warnfoot = new Element("div",{'class':'warnfoot'}).inject(warnw);
						var returnBtn = new Element("input",{'type':'button','value':'Return'}).inject(warnfoot).addEvent("click",function(){paper.timer.main.continued=1;paper.show.init(paper.bakno)});
						var exitBtn = new Element("input",{'type':'button','value':'Exit'}).inject(warnfoot).addEvent("click",function(){
							paper.isWritingTaskOne_Finished=1;
							paper.timer.main.clear();
							paper.timer.main.continued = 0;
							paper.media.clear();
							paper.show.next()
						});
					}
				}

				paper.mtw.empty();
				var writwide = new Element("div",{'class':'writewide'}).inject(paper.mtw);
				var directions = new Element("div",{'class':'directions'}).inject(writwide).set('html',que.desc);
				var questions = new Element("div",{'class':'questions'}).inject(writwide).set('html',que.content);
				
				if((paper.mode.view || paper.mode.preview) && (que.attach || que.attach2)){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(directions);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							paper.show.playWritingMedia(parQue);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							paper.show.playQueAudio(parQue,paper._audio);
						}
					}
				}
				paper.mmlmw.set('html',(que.img2?"<div class='readerimgdiv'><img border='0' src='"+paper.media.getFileServerUrl()+que.img2+"'/></div>":"")+que.contenta);
			}
			if(no==2){
				paper.mt.setStyle("display","none");
				paper.next.onclick = function(){
					if(!paper.timer.main.ing || paper.timer.main.ing<=0){
						paper.show.next();
					}else{
						paper.mt.setStyle("display","none");
						paper.mtw.empty();
						paper.layout.setSize();
						paper.mmlmw.empty();
						paper.mmrmw.empty();
						paper.layout.setStyle({cols:1});
						paper.show.hideButton();
						
						paper.widget.xwiner.hideAll();
						
						var warnboxwide = new Element("div",{'class':'warnboxwide'}).inject(paper.mmlmw);
						var warnbox = new Element("div",{'class':'warnbox'}).inject(warnboxwide);
						var warntitle = new Element("div",{'class':'warntitle'}).inject(warnbox).set('html','Exit Writing');
						var warnw = new Element("div",{'class':'warnw'}).inject(warnbox).set('html',paper.common.exitWritingTask1);
						var warnfoot = new Element("div",{'class':'warnfoot'}).inject(warnw);
						var returnBtn = new Element("input",{'type':'button','value':'Return'}).inject(warnfoot).addEvent("click",function(){paper.timer.main.continued=1;paper.show.init(paper.bakno)});
						var exitBtn = new Element("input",{'type':'button','value':'Exit'}).inject(warnfoot).addEvent("click",function(){
							paper.show.endWriting();
						});
					}
				}
				
				paper.mmlmw.empty();
				var writwide = new Element("div",{'class':'writewide'}).inject(paper.mmlmw);
				var directions = new Element("div",{'class':'directions'}).inject(writwide).set('html',que.desc);
				var questions = new Element("div",{'class':'questions'}).inject(writwide).set('html',que.content);
				if((paper.mode.view || paper.mode.preview) && (que.attach || que.attach2)){
					var btnspan = new Element("span",{'class':'quebtnspan'}).inject(directions);
					if(que.attach2){
						paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
						paper._material.no = no;
						paper._material.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							paper.show.playWritingMedia(parQue);
						}
					}
					if(que.attach){
						paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
						paper._audio.no = no;
						paper._audio.onclick = function(){
							var parQue = paper.model.getQue(paper.model.get(this.no).qid);
							paper.show.playQueAudio(parQue,paper._audio);
						}
					}
				}
				
			}
			
			function _iCreateWriteArea(no){
				if(!no) no = paper.bakno;
				paper.mmrmw.writeContainer = new Element("div",{'id':'writeContainer'}).inject(paper.mmrmw);
				paper.mmrmw.wctools =  new Element("div",{'class':'wctools'}).inject(paper.mmrmw.writeContainer);
				paper.mmrmw.wcw =  new Element("div",{'class':'wcw'}).inject(paper.mmrmw.writeContainer);
				
				paper.mmrmw.btns = new Element("span",{'class':'btns'}).inject(paper.mmrmw.wctools);
				paper.mmrmw.counts = new Element("span",{'class':'counts'}).inject(paper.mmrmw.wctools).set('html','Word Count: 0');
				
	//			new Element("input",{'type':'button','value':'Copy'}).inject(paper.mmrmw.btns).addEvent("click",function(){paper.mmrmw.writeElement.focus();document.execCommand("Copy");}); 
	//			new Element("input",{'type':'button','value':'Cut'}).inject(paper.mmrmw.btns).addEvent("click",function(){paper.mmrmw.writeElement.focus();document.execCommand("Cut");}); ;
	//			new Element("input",{'type':'button','value':'Paste'}).inject(paper.mmrmw.btns).addEvent("click",function(){paper.mmrmw.writeElement.focus();document.execCommand("Paste");}); ;
				//new Element("input",{'type':'button','value':'Undo'}).inject(paper.mmrmw.btns).addEvent("click",function(){document.execCommand("Undo");}); ;
				
				paper.mmrmw.writeElement = new Element("textarea",{'id':'writeElement'}).inject(paper.mmrmw.wcw);
				paper.mmrmw.writeElement.no = no;
//				paper.mmrmw._iCreateWriteArea = _iCreateWriteArea;
				if(paper.mode.test){
					paper.mmrmw.writeElement.set("disabled",true);
					paper.mmrmw.writeElement.setStyle("backgroundColor","#ccc");
				}
				if(model.uk){
					var atts = "";
					try {
						var scores = $N("writing_scores");
						var comments = $N("writing_comments");
						if(scores[model.no-1].value.length>0){
							atts = "\n\nScore: "+scores[model.no-1].value+"\nFeedback: "+comments[model.no-1].value;
						}
					} catch (e) {}
					paper.mmrmw.writeElement.set("value",model.uk+atts);
				}
				paper.mmrmw.writeElement.addEvent("keyup",function(){
					paper.model.get(this.no).uk = (this.value);
					var count = paper.common.countWord(this.value);
					paper.mmrmw.counts.set('text','Word Count: '+count);
				});
				paper.mmrmw.writeElement.addEvent("focus",function(){
					paper.model.get(this.no).uk = (this.value);
					var count = paper.common.countWord(this.value);
					paper.mmrmw.counts.set('text','Word Count: '+count);
				});
				if(paper.mode.view){
					var count = paper.common.countWord(model.uk);
					paper.mmrmw.counts.set('text','Word Count: '+count);
				}
				
				paper.mmrmw.writeElement.setSize = function(){
					try {
						paper.mmrmw.writeElement.setStyle("width",10);
						var ww = paper.mmrmw.getSize().x;
						var wh = paper.mmrm.getSize().y;
						var wth = paper.mmrmw.wctools.getSize().y;
						paper.debug("###.ww"+ww+",wh:"+wh+",wth:"+wth+">"+(wh-wth-18));
						paper.mmrmw.writeElement.setStyle("width",ww-16);
						paper.mmrmw.writeElement.setStyle("height",(wh-wth-16));
					} catch (e) {
						paper.debug("paper.mmrmw.writeElement.setSize.error:"+e);
					}
					
				}
				window.setTimeout(function(){
					paper.mmrmw.writeElement.setSize();
					window.addEvent("resize",function(){paper.mmrmw.writeElement.setSize();});
				},200);
				
			}
			
			_iCreateWriteArea(no);
			
			function _iStartWriting(){
				if(paper.mode.test || paper.mode.preview){
					if(!paper.timer.main.continued){
						paper.timer.main.clear();
						paper.timer.main.setElement();
						paper.timer.main.ing = paper.common.getWritingTaskTime(paper.bakno);
						paper.timer.main.bar.set("html",paper.timer.main.format(paper.timer.main.ing));
						//paper.debug("# Task 测试开始...");
						paper.timer.main.tid = window.setInterval(function(){
							paper.timer.main.ing--;
							paper.timer.main.bar.set("text",paper.timer.main.format(paper.timer.main.ing));
							if(paper.timer.main.ing<=0){
								paper.timer.main.clear();
								//paper.debug("# Task 测试时间到....");
								if(paper.bakno>=paper.no){
									paper.show.endWriting();
								}else{
									paper.isWritingTaskOne_Finished=1;
									paper.timer.main.clear();
									paper.timer.main.continued = 0;
									paper.media.clear();
									paper.show.next()
								}
							}
							if(paper.timer.main.ing==(5*60)) paper.timer.main.blink();
						},1000);
					}
				}
				paper.layout.setButtonImg(paper.next,'next',false);
				try {
					paper.mmrmw.writeElement.set("disabled",false);
					paper.mmrmw.writeElement.setStyle("backgroundColor","#fff");
					paper.mmrmw.writeElement.focus();
				} catch (e) {}
				
			}
			
			if(paper.mode.view || paper.mode.preview){
				paper.show.handleWritingView(model,que,parQue);
				if(paper.mode.view) paper.mmrmw.writeElement.set('readOnly',true);
			}
			
			if(paper.mode.test || paper.mode.preview){
				if(que.attach  && paper.media.notPlay()){//&& !model.attachPlayed
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							paper.model.get(paper.bakno).attachPlayed = 1;
							_iStartWriting();
						}
					},1000);
				}else{
					_iStartWriting();
				}
			}
		}else if(que.type==paper.QT.ky){
			paper.mmlmw.empty();
			
//			paper.debug(model.rec);
			
			var speakwide = new Element("div",{'class':'speakwide'}).inject(paper.mmlmw);
			var quetitle = new Element("div",{'class':'title'}).inject(speakwide).set('html',que.content);
			
			if(paper.mode.view || paper.mode.preview){
				var btnspan = new Element("span",{'class':'quebtnspan'}).inject(quetitle);
				if(que.contenta){
					paper._read = paper.common.getPlayQueReadBtn().inject(btnspan);
					paper._read.no = no;
					paper._read.onclick = function(){
						var parQue = paper.model.getQue(paper.model.get(this.no).qid);
						paper.show.playSpeakingText(parQue);
					}
				}
				if(que.attach2){
					paper._material = paper.common.getPlayQueMaterialBtn().inject(btnspan);
					paper._material.no = no;
					paper._material.onclick = function(){
						var parQue = paper.model.getQue(paper.model.get(this.no).qid);
						paper.show.playSpeakingMedia(parQue);
					}
				}
				if(que.attach){
					paper._audio = paper.common.getPlayQueAudioBtn().inject(btnspan);
					paper._audio.no = no;
					paper._audio.onclick = function(){
						var parQue = paper.model.getQue(paper.model.get(this.no).qid);
						paper.show.playQueAudio(parQue,paper._audio);
					}
				}
				try {
					if($N("speaking_scores")[model.no-1].value.length>0){
						var feedback = new Element("div",{'class':'quefeedback'}).inject(quetitle);
						feedback.innerHTML = "<div>Score: "+$N("speaking_scores")[model.no-1].value+"<br/>Feedback: "+$N("speaking_comments")[model.no-1].value+"</div>";
					}
				} catch (e) {}
			}
			
			function _iStartQue(no){
				
				var que = paper.model.getQue(paper.model.get(no).qid);
				if(que.attach){
					paper.media.setUrl(que.attach);
					paper.media.play();
					paper.media.startTimer = window.setInterval(function(){
						//paper.debug(paper.media.getState()+","+paper.media.isStop());
						//paper.debug("#_iStartQue():stop:"+paper.media.isStop()+",fail:"+paper.media.isFail())
						if(paper.media.isStop() || paper.media.isFail()){
							paper.media.clear();
							if(paper.media.timetbl) paper.media.timetbl.setStyle("display","block");
							paper.media.setTimer = window.setTimeout(function(){_iPreRecordSound();},5000)
						}
					},500);
				}else{
					if(paper.media.timetbl) paper.media.timetbl.setStyle("display","block");
					paper.media.setTimer = window.setTimeout(function(){_iPreRecordSound();},2000)
				}
			}
			function _iPreRecordSound(){
				paper.media.clear();
				paper.media.setUrl(paper.common.prepareRecSound);
				paper.media.play();
				paper.media.startTimer = window.setInterval(function(){
					if(paper.media.isStop()){
						paper.media.clear();
						paper.media.setUrl(paper.common.beepSound);
						paper.media.play();
						paper.media.startTimer = window.setInterval(function(){
							if(paper.media.isStop()){
								paper.media.clear();
								paper.debug("#call:_iPreRecordSount()");
								_iPreRecord();
							}
						},100);
					}
				},100);
			}
			function _iPreRecord(){
				paper.media.recordtbl.setStyle("display","block");
				paper.media.recordtitle.set('text','Prepare your response');
				paper.media.recordtiming.ing = paper.common.getRecTime(no).pre;
				paper.media.clearTimer();
				paper.media.startIndex = 1;
				paper.media.recordtiming.set('text',paper.timer.main.format2(paper.media.recordtiming.ing));
				paper.media.startTimer = window.setInterval(function(){
					var total = paper.common.getRecTime(no).pre*10;
					var totalLen = paper.media.positionbox.getCoordinates().width-2;
					var barwidth = parseInt(paper.media.startIndex/total*totalLen);
					if(barwidth>0) paper.media.positionbar.setStyle("width",barwidth);
					if(paper.media.startIndex % 10==0){
						paper.media.recordtiming.ing--;
						paper.media.recordtiming.set('text',paper.timer.main.format2(paper.media.recordtiming.ing));
					}
					//paper.debug("paper.media.startIndex:"+paper.media.startIndex+", width:"+barwidth+",ing:"+paper.media.recordtiming.ing)
					if(paper.media.startIndex>=total){
//						paper.media.clearTimer();
//						//window.setTimeout(function(){_iStartRecord();},1000);
//						paper.media.setUrl(paper.common.beepSound);
//						paper.media.play();
//						paper.media.startTimer = window.setInterval(function(){
//							if(paper.media.isStop()){
//								paper.media.clearTimer();
//								_iRecordSound();
//							}
//						},100);
						_iRecordSound();
					}
					paper.media.startIndex++;
				},100);
			}
			function _iRecordSound(){
				paper.media.clearTimer();
				paper.media.setUrl(paper.common.recSound);
				paper.media.play();
				paper.media.startTimer = window.setInterval(function(){
					if(paper.media.isStop()){
						paper.media.clearTimer();
						paper.media.setUrl(paper.common.beepSound);
						paper.media.play();
						paper.media.startTimer = window.setInterval(function(){
							if(paper.media.isStop()){
								paper.media.clearTimer();
								_iStartRecord();
							}
						},100);
					}
				},100);
			}
			function _iStartRecord(){
				paper.recorder.setFileName(1);
				paper.recorder.rec();//录音
				paper.debug("start record...");
				
				paper.media.recordtitle.set('text','Recording...');
				paper.media.recordtiming.ing = paper.common.getRecTime(no).rec;
				paper.media.recordtiming.set('text',paper.timer.main.format2(paper.media.recordtiming.ing));
				paper.media.positionbar.setStyle("width",0);
				paper.media.clearTimer();
				paper.media.startIndex = 1;
				paper.media.startTimer = window.setInterval(function(){
					var total = paper.common.getRecTime(no).rec*10;
					var totalLen = paper.media.positionbox.getCoordinates().width-2;
					var barwidth = parseInt(paper.media.startIndex/total*totalLen);
					if(barwidth>0) paper.media.positionbar.setStyle("width",barwidth);
					if(paper.media.startIndex % 10==0){
						paper.media.recordtiming.ing--;
						paper.media.recordtiming.set('text',paper.timer.main.format2(paper.media.recordtiming.ing));
					}
					//paper.debug("paper.media.startIndex:"+paper.media.startIndex+", width:"+barwidth+",ing:"+paper.media.recordtiming.ing)
					if(paper.media.startIndex>=total){
						paper.media.clear();
						paper.media.recordtitle.set('text','Recording end');
						paper.media.setTimer = window.setTimeout(function(){
							paper.recorder.stopRec();
							paper.debug("record end...");
							if(paper.mode.preview){
//								paper.media.recordplaybar.set('disabled',false);
								if(paper.bakno>=paper.no){
									paper.layout.setButtonImg(paper.next,'next',false);
									paper.next.onclick = function(){
										paper.media.clear();
										paper.show.endSpeaking();
									}
								}
								if(paper.media.recordbar) paper.media.recordbar.set('disabled',false);
								if(paper.media.recordtbl) paper.media.recordtbl.setStyle('display','none');
								paper.media.singleMode(1);
								paper.flvplayer.setPlay(paper.temp,paper.common.speakingFolder+paper.recorder.fn+".flv");
								//alert("录音完成，请点击上方工具栏Plackback按钮回放");
							}
						},1000);
						
						if(paper.mode.test){
							window.setTimeout(function(){
								paper.media.recordtitle.set('text','Saving recording...');
								//paper.media.recorder.saveRec(paper.media.getReqUrl());
								var mm = paper.model.get(paper.bakno);
								mm.rec = paper.common.speakingSavePath();
								paper.debug("save record..mm.rec="+mm.rec);
								
								paper.media.setUrl(paper.common.beepSound);
								paper.media.play();
								paper.media.startTimer = window.setInterval(function(){
									if(paper.media.isStop() || paper.media.isFail()){
										paper.media.clear();
										if(paper.bakno>=paper.no){
											window.setTimeout(function(){paper.show.endSpeaking();},5000);
											return;
										}
										if(paper.mode.test) window.setTimeout(function(){paper.show.next();},3000);
									}
								},100);
							},2000);
						}
					}
					paper.media.startIndex++;
				},100);
			}
			
			var timetbl = new Element("div",{'id':'timetbl','class':'timetbl'}).inject(speakwide);//.setStyle("display","none");
			var timetblbox = new Element("div",{'class':'timetblbox'}).inject(timetbl);
			var table = new Element("table",{'border':'0','cellpadding':'0','cellspacing':'1'}).inject(timetblbox);
			var tbody = new Element("tbody").inject(table);
			var tra = new Element("tr").inject(tbody);
			var trb = new Element("tr").inject(tbody);
			new Element("td").inject(tra).set('text','Preparation time:');
			new Element("td").inject(tra).set('text',paper.common.getRecTime(no).pre+' seconds');
			new Element("td").inject(trb).set('text','Response time:');
			new Element("td").inject(trb).set('text',paper.common.getRecTime(no).rec+' seconds');
			
			if(paper.mode.preview){
				paper.temp = new Element("div",{'class':'centers'}).inject(speakwide);
				
				paper.media.recordbar = new Element("input",{'type':'button','value':'Record'}).inject(paper.temp);
				//paper.media.recordplaybar = new Element("input",{'type':'button','value':'Playback','disabled':true}).inject(linediv);
				paper.media.recordbar.onclick = function(){
					_iStartQue(paper.bakno);
					this.set('disabled',true);
//					paper.media.recordplaybar.set('disabled',true);
					paper.media.singleMode();
				}
//				paper.media.recordplaybar.onclick = function(){
//					paper.media.recorder.playRec();
//					paper.media.startTimer = window.setInterval(function(){
//						var state = paper.media.recorder.checkPlayRecThread();
//						if(state=="1"){
//							paper.media.recordplaybar.set('disabled',true);
//						}else{
//							paper.media.clear();
//							paper.media.recordplaybar.set('disabled',false);
//						}
//					},1000)
//				}
			}
			
			var recordtbl = new Element("div",{'class':'recordtbl'}).inject(speakwide).setStyle("display","none");
			var recordtitle = new Element("div",{'class':'recordtitle'}).inject(recordtbl);
			var recordtiming = new Element("div",{'class':'recordtiming'}).inject(recordtbl).setStyle("border-top","0px").setStyle("border-bottom","0px");
			var positionbox = new Element("div",{'class':'positionbox'}).inject(recordtbl);
			var positionbar = new Element("div",{'class':'positionbar'}).inject(positionbox);
			
			paper.media.timetbl = timetbl;
			paper.media.recordtbl = recordtbl;
			paper.media.recordtitle = recordtitle;
			paper.media.recordtiming = recordtiming;
			paper.media.positionbox = positionbox;
			paper.media.positionbar = positionbar;
			
			if(paper.mode.view || paper.mode.preview){
				paper.show.handleSpeakingView(model,que,parQue);
			}
			
			if(paper.mode.view){
				if(model.rec){
					paper.flvplayer.setPlay(speakwide,model.rec)
				}
			}
			
			if(paper.mode.preview){
				if(que.attach){
					paper.media.setUrl(que.attach);
					paper.media.play();
				}
			}
			if(paper.mode.test){
				_iStartQue(no);
			}
			
//			new Element("input",{'type':'text','id':'recout'}).inject(paper.mmlmw).set('value',30);
//			paper.recoutTimer = window.setInterval(function(){
//				var recout = $("recout");
//				recout.value = parseInt(recout.value)-1;
//				if(parseInt(recout.value)==28){
//					paper.debug("start record...");
//					paper.media.recorder.startRec();
//				}
//				if(parseInt(recout.value)==25){
//					//window.clearInterval(paper.recoutTimer);
//					paper.media.recorder.stopRec();
//					paper.debug("stop record");
//				}
//				if(parseInt(recout.value)==20){
//					paper.media.recorder.saveRec(new String(paper.bakno));
//					paper.debug("save...");
//					window.clearInterval(paper.recoutTimer);
//				}
//			},1000)
			
			
		}else{
			paper.debug("paper.show.init():未处理试题类型[question type="+que.type+"]");
			paper.next.setStyle("display","inline");
			paper.layout.setButtonImg(paper.next,'next',false);
		}
		
		paper.current = model;//当前试题模块
		paper.current.qid = parQue.id;
		paper.show.checkFeedback();
		//paper.show.style();
		paper.show.updateQueNum();
		paper.layout.setSize();
		paper.show.endHandle();
		
	},
	endHandle:function(){
		paper.layout.setBackColor();
	},
	recycle:function(){
		paper.mode.solution = 0;
	},
	checkFeedback:function(){
		if(paper.mode.review){
			var feedbackdiv = $("feedbackdiv");
			if(feedbackdiv) feedbackdiv.setStyle("display",paper.mode.solution?"block":"none");
		}
	},
	initReadingDirections:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/rsd-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',paper.common.getSkillTitle());
		//var sections = new Element("div",{'class':'sections'}).inject(heads).set('text','Section Directions');
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getDirections());
		paper.buttons = $("topReadDirecBtn")?$("topReadDirecBtn"):new Element("input",{'id':'topReadDirecBtn','type':'button','class':'continueBtn','value':''}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.isDirections = 1;
			paper.show.init(paper.bakno);
			paper.timer.main.init();
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
	},
	initListeningHeadset:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text','Put on your headset');
		
		var imgdiv = new Element("div",{'class':'imgdiv'}).inject(direbox);
		new Element("img",{'border':'0'}).inject(imgdiv).set('src','../toefl/images/headset.jpg');
		new Element("div",{'class':'linediv'}).inject(direbox).set('html','<center>Click on <strong>Continue</strong> to continue.</center>');
		
		paper.buttons = $("topHeadsetBtn")?$("topHeadsetBtn"):new Element("input",{'id':'topHeadsetBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.isHeadset = 1;
			paper.show.init(paper.bakno);
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
	},
	initListeningChangeVolume:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text','Changing the Volume');
		
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.changeVolume);
		
		paper.playerDiv.setStyle("display","block");
		var btns = $("topVolBtn")?$("topVolBtn"):new Element("input",{"id":"topVolBtn",'type':'button','class':' continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		btns.onclick = function(){
			paper.media.stop();
			paper.isChangeVolume = 1;
			paper.show.init(paper.bakno);
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
		
		paper.media.setUrl("/toefl/audio/changeVolume.mp3");
		paper.media.play();
		
	},
	initListeningDirections:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/lsd-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',paper.common.getSkillTitle());
		//var sections = new Element("div",{'class':'sections'}).inject(heads).set('text','Section Directions');
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getDirections());
		
		paper.buttons = $("topDismissBtn")?$("topDismissBtn"):new Element("input",{'id':'topDismissBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isDirections = 1;
			paper.show.init(paper.bakno);
			paper.timer.main.init(null,true);
			this.destroy();
		}
		
		paper.layout.setBackColor("#F1E7CA");
		
		paper.media.setUrl("/toefl/audio/listenDirections.mp3");
		paper.media.play();
		paper.media.clearTimer();
		paper.media.startTimer = window.setInterval(function(){
			if(paper.media.isStop()){
				paper.media.clearTimer();
				paper.media.stop();
				paper.buttons.destroy();
				paper.isDirections = 1;
				paper.show.init(paper.bakno);
				paper.timer.main.init(null,true);
			}
		},500)
	},
	initListeningDirectionsPart:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/lsd-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',paper.common.getSkillTitle());
		//var sections = new Element("div",{'class':'sections'}).inject(heads).set('text','Section Directions');
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.listeningDirectionsPart());
		
		if(paper.numCtrl) paper.numCtrl.set("text","");
		
		paper.show.hideButton()
		
		paper.buttons = $("topDismissBtn")?$("topDismissBtn"):new Element("input",{'id':'topDismissBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isDirections = 1;
			paper.LSectionPartEnd =1;
			paper.show.next();
			paper.timer.main.init(null,true);
			this.destroy();
		}
		
		paper.layout.setBackColor("#F1E7CA");
		
	},
	initSpeakingMicrophone:function(){
		paper.layout.setStyle({cols:1});
		paper.layout.setBackColor("#F1E7CA");
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text','Test the Microphone');
		var contents = new Element("div",{'class':'linediv'}).inject(direbox).set('html',paper.common.adjustmicro());
		
		var flashdiv = new Element("div",{'id':'flashspacediv','class':'flashdiv'}).inject(direbox);
		paper.recorder.setFlashPosition('flashspacediv');
		
		paper.recorddiv = new Element("div",{'class':'records'}).inject(direbox);
		paper.rb = new Element("input",{'id':'startRecordBtn','type':'button','value':'Record'}).inject(paper.recorddiv);
		paper.rb.set("disabled",true);
//		paper.rsb = new Element("input",{'type':'button','value':'Stop Record'}).inject(paper.recorddiv);
//		paper.pb = new Element("input",{'type':'button','value':'Play'}).inject(paper.recorddiv);
//		paper.psb = new Element("input",{'type':'button','value':'Stop Play'}).inject(paper.recorddiv);
		
//		paper.rsb.onclick = function(){
//			paper.recorder.stopRec();
//			paper.media.clearTimer();
//			paper.rb.set('value','Record');
//			paper.rb.set('disabled',false);	
//			paper.debug("end record...")
//		}
//		paper.pb.onclick = function(){paper.recorder.play();}
//		paper.psb.onclick = function(){paper.recorder.stopPlay();}
		
		paper.rb.onclick = function(){
			this.set('disabled',true);
			this.ing = 10;
			paper.media.setUrl(paper.common.beepSound);
			paper.media.play();
			paper.media.clearTimer();
			paper.media.startTimer = window.setInterval(function(){
				if(paper.media.isStop()){
					paper.media.clearTimer();
					paper.recorder.setFileName(0);
					paper.recorder.rec();
					paper.rb.set('value','Recording...('+paper.rb.ing+')')
					paper.debug("start recording...")
					paper.media.startTimer = window.setInterval(function(){
						paper.rb.ing--;
						paper.rb.set('value','Recording...('+paper.rb.ing+')');
						paper.debug(">>:"+paper.rb.ing+","+paper.recorder.getStatus());
						if(paper.rb.ing<0){
							paper.media.clearTimer();
							paper.recorder.stopRec();
							paper.debug("end record...")
							paper.debug("play record...")
							paper.rb.set('value','Play...');
							window.setTimeout(function(){
								paper.recorder.play();
								paper.media.startTimer = window.setInterval(function(){
									paper.debug("$"+paper.recorder.getStatus()+","+paper.recorder.playCount)
									if(paper.recorder.getStatus()=='1'){
										paper.recorder.playCount++;
										if(paper.recorder.playCount>15){
											paper.media.clearTimer();
											paper.rb.set('value','Record');
											paper.rb.set('disabled',false);
											paper.debug("play end...")
											paper.recorder.stopPlay();
											paper.recorder.playCount=0;
										}
									}
									if(paper.recorder.getStatus()=='0'){
										paper.media.clearTimer();
										paper.rb.set('value','Record');
										paper.rb.set('disabled',false);
										paper.debug("play end...")
										paper.recorder.playCount=0;
										paper.recorder.stopPlay();
									}
									if(paper.recorder.getStatus()=='2'){
										//paper.debug("#"+paper.recorder.getStatus());
										paper.recorder.count++;
										if(paper.recorder.count>5){
											paper.media.clearTimer();
											paper.rb.set('value','Record');
											paper.rb.set('disabled',false);
											paper.recorder.count = 0;
											paper.recorder.stopRec();
											paper.recorder.playCount=0;
											paper.recorder.stopPlay();
										}
									}
								},1000)
							},1000)
						}
					},1000);
				}
			},500);
		}
		
		//var appletTip = new Element("div",{'class':'applet-tip'}).inject(direwide); 
		//appletTip.set("html","<img src='../images/java_applet_tip.gif'/>");
		
		//paper.playerDiv.setStyle("display","block");
		paper.buttons = $("recorderTestBtn")?$("recorderTestBtn"):new Element("input",{'id':'recorderTestBtn','type':'button','class':'proceedBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		//paper.buttons.disabled = true;
		paper.layout.setButtonImg(paper.buttons,'proceedb',true);
		paper.buttons.onclick = function(){
			paper.media.stop();
			paper.isMicrophone = 1;
			
			paper.media.clearTimer();
			try {
				paper.recorder.stopRec();
				paper.recorder.stopPlay();
				paper.recorder.hide();
			} catch (e) {
				paper.debug("error:"+e);
			}

			paper.show.init(paper.bakno);
			this.destroy();
		}
		
		paper.recorder.chkTimer = window.setInterval(function(){
			if(!paper.recorder.loaded){
				location.reload();
			}
			if(paper.recorder.loaded){
				window.clearInterval(paper.recorder.chkTimer);
			}
		},paper.mode.sReloadTime);
	},
	initSpeakingDirections:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/ssd-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',paper.common.getSkillTitle());
		//var sections = new Element("div",{'class':'sections'}).inject(heads).set('text','Section Directions');
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getDirections());
		
		paper.buttons = $("topSpeakDirecBtn")?$("topSpeakDirecBtn"):new Element("input",{'id':'topSpeakDirecBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isDirections = 1;
			paper.show.init(paper.bakno);
			paper.timer.main.init();
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
		paper.media.setUrl("/toefl/audio/speakDirections.mp3");
		paper.media.play();
		paper.media.clearTimer();
		paper.media.startTimer = window.setInterval(function(){
			if(paper.media.isStop()){
				paper.media.clearTimer();
				paper.media.stop();
				paper.buttons.destroy();
				paper.isDirections = 1;
				paper.show.init(paper.bakno);
				paper.timer.main.init();
			}
		},500)
	},
	initWritingDirections:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/wsd-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',paper.common.getSkillTitle());
		//var sections = new Element("div",{'class':'sections'}).inject(heads).set('text','Section Directions');
		
		var imgdiv = new Element("div",{'class':'imgdiv'}).inject(direbox);
		new Element("img",{'border':'0'}).inject(imgdiv).set('src','../toefl/images/headset.jpg');
		
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getDirections());
		
		paper.buttons = $("topWriteDirecBtn")?$("topWriteDirecBtn"):new Element("input",{'id':'topWriteDirecBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isDirections = 1;
			paper.show.init(paper.bakno);
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
		paper.playerDiv.setStyle("display","block");
		paper.media.setUrl("/toefl/audio/writeDirections.mp3");
		paper.media.play();

		paper.media.startTimer = window.setInterval(function(){
			if(paper.media.isStop()){
				paper.media.clearTimer();
				paper.media.stop();
				paper.buttons.destroy();
				paper.isDirections = 1;
				paper.show.init(paper.bakno);
			}
		},500)
	},
	initWritingTaskOne:function(){
		paper.layout.setStyle({cols:1});
		paper.show.hideButton();
		paper.mmlmw.empty();
		paper.show.updateQueNum(paper.bakno);
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/wsd1-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"Directions");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.writingtaskone());
		
		paper.buttons = $("topTaskOneBtn")?$("topTaskOneBtn"):new Element("input",{'id':'topTaskOneBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isWritingTaskOne = 1;
			paper.show.init(paper.bakno);
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
//		paper.playerDiv.setStyle("display","block");
//		paper.media.setUrl("/toefl/audio/writeDirections.wma");
//		paper.media.play();
//		paper.media.clearTimer();
//		paper.media.startTimer = window.setInterval(function(){
//			if(paper.media.isStop()){
//				paper.media.clearTimer();
//				paper.media.stop();
//				paper.buttons.destroy();
//				paper.isWritingTaskOne = 1;
//				paper.show.init(paper.bakno);
//			}
//		},500)
	},
	initWritingTaskTwo:function(){
		paper.mt.setStyle("display","none");
		paper.layout.setStyle({cols:1});
		paper.show.hideButton();
		paper.mmlmw.empty();
		paper.show.updateQueNum(paper.bakno);
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		new Element("div",{'class':'directionh3'}).inject(direbox).set("html","<img src=\"images/wsd2-h3.png\"/>");
		//var heads = new Element("div",{'class':'heads'}).inject(direbox);
		//var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"Directions");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.writingtasktwo());
		
		paper.buttons = $("topTaskTwoBtn")?$("topTaskTwoBtn"):new Element("input",{'id':'topTaskTwoBtn','type':'button','class':'continueBtn'}).inject(paper.btnCtrl).setStyle("display","inline");
		paper.buttons.onclick = function(){
			paper.media.clearTimer();
			paper.media.stop();
			paper.isWritingTaskTwo = 1;
			paper.media.volume.hide();
			paper.show.init(paper.bakno);
			this.destroy();
		}
		paper.layout.setBackColor("#F1E7CA");
//		paper.playerDiv.setStyle("display","block");
//		paper.media.setUrl("/toefl/audio/writeDirections.wma");
//		paper.media.play();
//		paper.media.clearTimer();
//		paper.media.startTimer = window.setInterval(function(){
//			if(paper.media.isStop()){
//				paper.media.clearTimer();
//				paper.media.stop();
//				paper.buttons.destroy();
//				paper.isWritingTaskTwo = 1;
//				paper.media.volume.hide();
//				paper.show.init(paper.bakno);
//			}
//		},500)
	},
	endReading:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		paper.show.showButton(["continueBtn","returnBtn","reviewBtn"])
		
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"End of Section");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getEndDirections());
		paper.continues.onclick = function(){
			if(paper.mode.test){
				paper.action.end();
				return;
			}
			location = paper.common.getReqUrlOfEndSection();
		}
	},
	endListeningPart:function(){
		paper.layout.setStyle({cols:1});
		paper.media.clear();
		paper.mmlmw.empty();
		
		//paper.LSectionPartEnd = 1;
		paper.show.showButton(["continueBtn"])
		
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"End of Section");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.listeningEndDirectionsPart());
		paper.continues.onclick = function(){
			paper.timer.main.clear();
			paper.show.initListeningDirectionsPart();
			//this.destroy();
		}
	},
	endListening:function(){
		paper.layout.setStyle({cols:1});
		paper.media.clear();
		paper.mmlmw.empty();
		
		//paper.show.showButton(["continueBtn","returnBtn"]);
		paper.show.showButton(["continueBtn"]);
		
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"End of Section");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getEndDirections());
		paper.continues.onclick = function(){
			if(paper.mode.test){
				paper.action.end();
				return;
			}
			location = paper.common.getReqUrlOfEndSection();
		}
	},
	endSpeaking:function(){
		if(paper.mode.test){
			paper.action.autoEnd();return;
		}
		
		paper.layout.setStyle({cols:1});
		paper.media.clear();
		paper.mmlmw.empty();
		
		paper.show.showButton(["continueBtn"])
		
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"End of Section");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getEndDirections());
		paper.continues.onclick = function(){
			if(paper.mode.test){
				paper.action.end();return;
			}
			location = paper.common.getReqUrlOfEndSection();
		}
	},
	endWriting:function(){
		if(paper.mode.test){
			paper.action.autoEnd();return;
		}
		paper.layout.setStyle({cols:1});
		paper.media.clear();
		paper.mmlmw.empty();
		
		paper.show.showButton(["continueBtn"])
		
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"End of Section");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getEndDirections());
		paper.continues.onclick = function(){
			alert("测试完成");
		}
		
	},
	breaking:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		
		paper.timer.main.clear();
		paper.timer.main.setElement();
		paper.timer.main.ing = paper.common.getBreakTime();
		paper.timer.main.bar.set("html",paper.timer.main.format(paper.timer.main.ing));
		paper.debug("# 休息 测试开始...");
		paper.timer.main.tid = window.setInterval(function(){
			paper.timer.main.ing--;
			paper.debug(paper.timer.main.ing)
			paper.timer.main.bar.set("text",paper.timer.main.format(paper.timer.main.ing));
			if(paper.timer.main.ing<0){
				paper.timer.main.clear();
				paper.debug("# 休息结束，自动进入口语测试....");
				location = paper.common.getReqUrlOfEndSection();
			}
		},1000);
		paper.continues.setStyle("display","inline");
		paper.continues.onclick = function(){
			location = paper.common.getReqUrlOfEndSection();
		}
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"Break");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getBreakDirections());
	},
	testOver:function(){
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		paper.numCtrl.empty();
		
		paper.timer.main.clear();
		paper.timer.main.clearElement();
		
		paper.continues.setStyle("display","inline");
//		paper.continues.set("value","");
		paper.continues.onclick = function(){
			alert("Test Over.");
		}
		var direwide =  new Element("div",{'class':'direwide'}).inject(paper.mmlmw);
		var direbox = new Element("div",{'class':'direbox'}).inject(direwide);
		var heads = new Element("div",{'class':'heads'}).inject(direbox);
		var skills = new Element("div",{'class':'skills'}).inject(heads).set('text',"Test Over");
		var contents = new Element("div",{'class':'contents'}).inject(direbox).set('html',paper.common.getTestOverDirections());
	},
	next:function(){
		paper.debug("paper.show.next()");
		paper.media.clear();
		paper.show.recycle();
		if(paper.isReading && (paper.mode.test || paper.mode.preview) && paper.timer.main.ing){
			if(!paper.firstReadingEnd && paper.current.no==paper.firstReadingEndNo){
//				if(confirm("You still have time left to answer your response. As long as there is time remaining,you can continue answering or revising your response.\n\nClick on cancel to continue answering your response.\n\nClick on OK.")){
//					
//					paper.firstReadingEnd=1;
//					paper.timer.main.init();
//					paper.show.init(paper.firstReadingEndNo+1);
//				}
				paper.mt.setStyle("display","none");
				paper.mtw.empty();
				paper.layout.setSize();
				paper.mmlmw.empty();
				paper.layout.setStyle({cols:1});
				paper.show.hideButton();
				
				var warnboxwide = new Element("div",{'class':'warnboxwide'}).inject(paper.mmlmw);
				var warnbox = new Element("div",{'class':'warnbox'}).inject(warnboxwide);
				var warntitle = new Element("div",{'class':'warntitle'}).inject(warnbox).set('html','Exit Reading Section One');
				var warnw = new Element("div",{'class':'warnw'}).inject(warnbox).set('html',paper.common.exitReadingTask1);
				var warnfoot = new Element("div",{'class':'warnfoot'}).inject(warnw);
				var returnBtn = new Element("input",{'type':'button','value':'Return'}).inject(warnfoot).addEvent("click",function(){
					paper.show.init(paper.bakno)
				});
				var exitBtn = new Element("input",{'type':'button','value':'Exit'}).inject(warnfoot).addEvent("click",function(){
					paper.firstReadingEnd=1;
					paper.timer.main.init();
					paper.show.init(paper.firstReadingEndNo+1);
				});
			}else{
				paper.show.init(paper.current.no+1);
			}
		}else{
			paper.show.init(paper.current.no+1);
		}
	},
	back:function(){
		paper.debug("paper.show.back()");
		paper.media.clear();
		paper.show.recycle();
		if(paper.mode.test && paper.bakno-paper.current.no==1){
			paper.show.init(paper.current.no);
		}else{
			paper.show.init(paper.current.no-1);
		}
	},
	style:function(){
		var model = paper.current;
		paper.show.reset();
		$("navque"+model.qid).getElement(".fnav").getElements("span").each(function(a){
			a.set("class","sel");
			a.active = false;
			if(a.no==model.no){
				a.set("class","active");
				a.active = true;
			}
			if(model.type==paper.QT.jztk || model.type==paper.QT.tldp || model.type==paper.QT.tldp_zh){
				a.set("class","active");
				a.active = true;
			}
		});
	},
	updateBtnStatus:function(pno){
		if(pno>=paper.no){
			paper.layout.setButtonImg(paper.next,'nextb',true);
			paper.layout.setButtonImg(paper.back,'back',false);
			if(paper.mode.test){
				if(paper.isReading){
					paper.layout.setButtonImg(paper.next,'next',false);
					paper.next.onclick = function(){
						paper.show.endReading();
						return false;
					}
				}else if(paper.isListening){
					if(paper.mode.preview){
						paper.layout.setButtonImg(paper.next,'next',false);
						paper.next.onclick = function(){
							paper.show.endListening();
							return false;
						}
					}else if(paper.mode.test){
						paper.next.onclick = function(){
							paper.layout.setButtonImg(paper.ok,'ok',false);
							paper.layout.setButtonImg(paper.next,'nextb',true);
						}
						paper.ok.onclick = function(){
							if(paper.show.checkListenAnswer()){
								paper.show.endListening();
								return;
							}
						}
					}
				}else if(paper.isSpeaking){
					paper.layout.setButtonImg(paper.next,'next',false);
					paper.next.onclick = function(){
						paper.show.endSpeaking();
						return;
					}
				}else if(paper.isWriting){
					if(paper.mode.preview){
						paper.layout.setButtonImg(paper.next,'next',false);
					}
				}
			}
			return false;
		}else{
			if(!pno || pno<=1){
				paper.layout.setButtonImg(paper.back,'backb',true);
				paper.layout.setButtonImg(paper.next,'next',false);
			}else{
				paper.layout.setButtonImg(paper.next,'next',false);
				paper.layout.setButtonImg(paper.back,'back',false);
			}
			if(paper.no==1){
				paper.layout.setButtonImg(paper.back,'backb',true);
				paper.layout.setButtonImg(paper.next,'nextb',true);
			}
			if(paper.isListening && paper.mode.test){
				paper.layout.setButtonImg(paper.next,'nextb',true);
				paper.layout.setButtonImg(paper.ok,'okb',true);
				paper.next.onclick = function(){
					paper.layout.setButtonImg(paper.ok,'ok',false);
					paper.layout.setButtonImg(paper.next,'nextb',true);
				}
				paper.ok.onclick = function(){
					if(paper.show.checkListenAnswer()){
						paper.show.next();
						paper.layout.setButtonImg(paper.ok,'okb',true);
					}
				}
			}
			if(paper.isListening && !paper.LSectionPartEnd){
				//paper.debug(pno+",LSNo:"+paper.LSNo);
				if(pno>=paper.LSNo){
					if(paper.mode.preview){
						paper.layout.setButtonImg(paper.next,'next',false);
						paper.next.onclick = function(){
							paper.show.endListeningPart();
							return false;
						}
					}else if(paper.mode.test){
						paper.next.onclick = function(){
							paper.layout.setButtonImg(paper.ok,'ok',false);
							paper.layout.setButtonImg(paper.next,'nextb',true);
						}
						paper.ok.onclick = function(){
							if(paper.show.checkListenAnswer()){
								paper.show.endListeningPart();
								return;
							}
						}
					}
				}
			}
			//paper.debug(paper.firstReadingEnd+","+pno+","+paper.firstReadingEndNo);
			if(paper.isReading){
//				if(paper.firstReadingEnd && pno==paper.firstReadingEndNo+1){
//					paper.layout.setButtonImg(paper.back,'backb',true);
//				}else{
//					paper.layout.setButtonImg(paper.back,'back',false);
//				}
			}
		}
		return true;
	},
	checkListenAnswer:function(){
		var model = paper.model.get(paper.current.no);
		//paper.debug(JSON.encode(model)+"<br/>"+typeof(model.sk));
		var flag = true;
		if(typeof(model.sk)=="object"){
			if(!model.uk || model.uk.length==0){
				flag = false;
				paper.widget.xalert.init("Required Answer",paper.common.getMustAnswerDirections(),{okbtnclass:"returntoqueBtn"});
			}else if(model.uk.length!=model.sk.length){
				flag = false;
				paper.widget.xalert.init("Required Answer",paper.common.getMustAnswerDirections2(),{okbtnclass:"returntoqueBtn"});
			}else if(model.type==paper.QT.tlfl){
				if(model.uk[0].length==0 || model.uk[1].length==0){
					flag = false;
					paper.widget.xalert.init("Required Answer",paper.common.getMustAnswerDirections2(),{okbtnclass:"returntoqueBtn"});
				}
			}
		}else{
			if(!model.uk || model.uk.length==0){
				flag = false;
				paper.widget.xalert.init("Required Answer",paper.common.getMustAnswerDirections(),{okbtnclass:"returntoqueBtn"});
			}
		}
		return flag;
	},
	updateQueNum:function(no){
		if(paper.numCtrl){
			paper.numCtrl.set('text','Question '+(no?no:paper.current.no)+' of '+paper.no);
		}
	},
	setReadContent:function(parQue,que){
		if(paper.current.qid != parQue.id){
			paper.mmrmw.set('html',"<div class='readerw'>"+"<div class=\"readtitle\">"+parQue.title+"</div>"+paper.widget.filterVDir(parQue.content)+"</div>");
			//paper.mmrmw.set('html',"<div class='readerw'>"+paper.widget.filterVDir(parQue.content)+"</div>");
			paper.mmrm.set('scrollTop',0);
		}
		if(paper.mmrmw.readHtml && paper.mmrmw.readHtml.length>10){
			paper.mmrmw.set('html',paper.mmrmw.readHtml);
			paper.mmrmw.readHtml = null;
		}
		//paragraph arrows
		var inputs = paper.mmrmw.getElements("input");
		if(inputs){
			inputs.each(function(a){
				a.setStyle('display','none');
				if(a.square) a.square.setStyle('display','none');
				if(a.arrow) a.arrow.setStyle('display','none');
				if(a.name==paper.common.parrows){
					if(!a.arrow){
						var arrow = $("arrows"+a.value);
						if(!arrow) arrow = new Element("a",{'id':'arrows'+a.value,'class':'arrows','href':'javascript:void(0)'}).inject(a,'after');
						a.arrow = arrow;
						arrow.set('html',paper.common.getArrowChar)
						arrow.setStyle('display','none');
						arrow.val = a.value;
					}
				}
			});
		}
		
		paper.mmrm.addEvent("scroll",function(){
			paper.layout.setMMRMInitScrollStatus();
		});
		paper.layout.setMMRMInitScrollStatus();
		
		//high ligth question word
		var strongs = paper.mmrmw.getElementsByTagName("strong");
		if(strongs && strongs.length>0){
			for(var i=0;i<strongs.length;i++){
				var sobj = strongs[i];
				var words = sobj.innerText;
				if(!words){
					try {
						words = sobj.get("text");
					} catch (e) {}
				}
				if(parQue.title && parQue.title.trim()!=words.trim()){
					if(que && que.word && que.word.length>0){
						if(words.trim()==que.word.trim()){
							sobj.className = "strongs";
							sobj.style.fontWeight="bold";
						}else{
							sobj.className = "";
							sobj.style.fontWeight="normal";
						}
					}else{
						sobj.className = "";
						sobj.style.fontWeight="normal";
					}
				}
				
				
			}
		}
		strongs = paper.mmrmw.getElementsByTagName("span");
		if(strongs && strongs.length>0){
			for(var i=0;i<strongs.length;i++){
				var sobj = strongs[i];
				if(sobj.className && sobj.className.indexOf('bxstoefltexthl')>-1){
					var words = sobj.innerText;
					//if(words){
						//words = words.replace("'","#");
					//}
					if(!words){
						try {
							words = sobj.get("text");
						} catch (e) {}
					}
					if(parQue.title && parQue.title.trim()!=words.trim()){
						if(que && que.word && que.word.length>0){
							var arr = que.word.split("|");
							var wordarr = [];
							for(var kk=0;kk<arr.length;kk++){
								var nword = arr[kk].trim();
								//nword = nword.replace("'","#");
								nword = nword.replace("&amp;","&");
								wordarr.push(nword);
								paper.debug("spbn:"+nword);
							}
							//paper.debug("span:"+words);
							//paper.debug("TF:"+wordarr.contains(words.trim()));
							if(wordarr.contains(words.trim())){
								paper.layout.setMMRMScorllTop(sobj);
								sobj.className = "bxstoefltexthl-on";
							}else{
								sobj.className = "bxstoefltexthl";
							}
						}else{
							sobj.className = "bxstoefltexthl";
						}
					}
				}
				
			}
		}
		
	},
	initReading:function(parQue){
		paper.show.showButton(["nextBtn","backBtn","reviewBtn"]);
		paper.media.volume.hide();
		//if(paper.mode.preview) 
		if(paper.mode.preview){
			paper.show.showButton("solutionBtn");
		}
		if(paper.mode.preview || paper.mode.view || paper.mode.review){
			if(parQue.feedback){
				if(!paper.readExplain) return;
				paper.show.showButton("readExplainBtn");
				paper.readExplain.qid = parQue.id;
				paper.readExplain.fb = parQue.feedback;
				paper.readExplain.onclick = function(){
					paper.widget.xwiner.init("readExplains"+this.qid,"文章解析",paper.widget.jsHtml(this.fb),paper.common.readExplainWin);
				}
				
			}
		}
	},
	initListening:function(parQue){
		paper.layout.setStyle({cols:1});
//		if(paper.scripts && paper.scripts.show) paper.layout.setStyle();
//		else paper.layout.setStyle({cols:1});
//		paper.media.showVolume();
		
		if(paper.mode.test){
			paper.show.showButton(["okBtn","nextBtn"]);
			//paper.layout.setButtonImg(paper.next,'next',false);
			paper.layout.setButtonImg(paper.ok,'okb',true);
		}
	},
	initSpeaking:function(){
		paper.media.recorder = document.getElementById("appletRecorder");
		paper.show.hideButton();
//		paper.media.showVolume();
	},
	initWriting:function(){
		
	},
	playerReadingRead:function(parQue){
		paper.layout.setStyle();
		paper.mmlmw.empty();
		paper.show.showButton(["nextBtn"]);
		paper.numCtrl.set("text","");
		
		paper.next.onclick = function(){
			var m = paper.model.get(paper.bakno);
			m.readed = 1;
			if(m.scrolled){
				m.readed = 1;
				paper.show.next();
			}else{
				//alert("");
				paper.widget.xalert.init("More Text",paper.common.getReadingScrollDirections(),{okbtnclass:"continueBtn"});
				return;
			}
		}
		paper.show.setReadContent(parQue);
	},
	playListeningMedia:function(parQue){//播放听力
		paper.numCtrl.set("text","");
		paper.mmlmw.empty();
		if(!parQue.attach){
			paper.model.initErrorListen();
			paper.initOk = false;
			return;
		}
		paper.timer.main.pause(true);//hide timing
		paper.media.setUrl(parQue.attach);
		paper.media.play();
		paper.media.position.init();
		
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_iStartAnswer();
			}
		}
		
		if(paper.mode.view || paper.mode.preview){
			if(parQue.scripts) paper.show.showButton("scriptsBtn");
		}
		
		var listenboxwide = new Element("div",{"id":"listenboxwide","class":"listenboxwide"}).inject(paper.media.positionbox,"before");
		var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
		listenbox.set("html","<div>"+parQue.title+"</div>");
		//paper.debug(JSON.encode(parQue.attaches));
		var rangImg2 = paper.media.formatImgTime(parQue.img2t);
		var rangImg3 = paper.media.formatImgTime(parQue.img3t);
		var rangImg4 = paper.media.formatImgTime(parQue.img4t);
		var rangImg5 = paper.media.formatImgTime(parQue.img5t);
		var rangImg6 = paper.media.formatImgTime(parQue.img6t);
		var rangImg7 = paper.media.formatImgTime(parQue.img7t);
		var rangImg8 = paper.media.formatImgTime(parQue.img8t);
		var rangImg9 = paper.media.formatImgTime(parQue.img9t);
		var rangImg10 = paper.media.formatImgTime(parQue.img10t);
		paper.media.startIndex = 0;
		paper.media.startTimer = window.setInterval(function(){
			paper.media.pos = parseInt(paper.media.getPosition()/1000);
			//paper.debug("paper.show.playListeningMedia():posotion:"+paper.media.pos+",playstate:"+paper.media.getState()+",index:"+paper.media.startIndex);
			if(paper.media.isPlay()) paper.media.startIndex++
			if(paper.media.startIndex==6){
				if(parQue.img){
					$("listenboxwide").empty();
					var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject($("listenboxwide"));
					Element("img",{'id':'listeningImgEle'}).inject(centerImgbox).set("src",paper.media.getFileServerUrl()+parQue.img);
					//if(parQue.img2) Element("img").inject($("listenboxwide")).set("src",paper.media.getFileServerUrl()+parQue.img2);
				}
			}
			if(parQue.img2){
				if(rangImg2){
					if(paper.media.pos==rangImg2.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img2;
						paper.debug("set img2:"+parQue.img2);
					}
					if(paper.media.pos==rangImg2.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img3){
				if(rangImg3){
					if(paper.media.pos==rangImg3.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img3;
						paper.debug("set img3:"+parQue.img3);
					}
					if(paper.media.pos==rangImg3.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img4){
				if(rangImg4){
					if(paper.media.pos==rangImg4.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img4;
						paper.debug("set img4:"+parQue.img4);
					}
					if(paper.media.pos==rangImg4.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img5){
				if(rangImg5){
					if(paper.media.pos==rangImg5.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img5;
						paper.debug("set img5:"+parQue.img5);
					}
					if(paper.media.pos==rangImg5.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img6){
				if(rangImg6){
					if(paper.media.pos==rangImg6.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img6;
						paper.debug("set img6:"+parQue.img6);
					}
					if(paper.media.pos==rangImg6.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img7){
				if(rangImg7){
					if(paper.media.pos==rangImg7.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img7;
						paper.debug("set img7:"+parQue.img7);
					}
					if(paper.media.pos==rangImg7.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img8){
				if(rangImg8){
					if(paper.media.pos==rangImg8.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img8;
						paper.debug("set img8:"+parQue.img8);
					}
					if(paper.media.pos==rangImg8.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img9){
				if(rangImg9){
					if(paper.media.pos==rangImg9.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img9;
						paper.debug("set img9:"+parQue.img9);
					}
					if(paper.media.pos==rangImg9.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(parQue.img10){
				if(rangImg10){
					if(paper.media.pos==rangImg10.start){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img10;
						paper.debug("set img10:"+parQue.img10);
					}
					if(paper.media.pos==rangImg10.end){
						$("listeningImgEle").src = paper.media.getFileServerUrl()+parQue.img;
						paper.debug("set img:"+parQue.img);
					}
				}
			}
			if(paper.media.isStop() || paper.media.isFail()){
				paper.media.clear();
				_iStartAnswer();
			}
		},500);
		
		function _iStartAnswer(){
			paper.media.clear();
			paper.model.get(paper.bakno).played = 1;
			listenboxwide.empty();
			if(paper.mode.test){
				var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
				listenbox.set("html","<div>"+paper.common.readytoanswer+"</div>");
				window.setTimeout(function(){
					paper.show.init(paper.bakno);
				},paper.common.delayShowQueTimeOfAnswer);
			}else if(paper.mode.view || paper.mode.preview){
				paper.show.init(paper.bakno);
			}
		}
	},
	playListeningMediaOfPart:function(parQue,que){//播放试题中听力材料

		paper.numCtrl.set("text","");
		paper.mmlmw.empty();
		
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_iStartAnswerOfPart();
			}
		}
		paper.timer.main.pause();
		paper.media.setUrl(que.attach2);
		paper.media.play();
		paper.media.position.init();
		
		var listenboxwide = new Element("div",{"id":"listenboxwide","class":"listenboxwide"}).inject(paper.media.positionbox,"before");
		var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
		listenbox.set("html","<div>"+paper.common.listenagain+"</div>");
		paper.media.startIndex = 0;
		paper.media.startTimer = window.setInterval(function(){
			//paper.debug("show.playListening():"+"playstate:"+paper.media.getState()+",index:"+paper.media.startIndex);
			if(paper.media.isPlay()) paper.media.startIndex++
			if(paper.media.startIndex==5){
				if(que.img){
					$("listenboxwide").empty();
					var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject($("listenboxwide"));
					Element("img").inject(centerImgbox).set("src",paper.media.getFileServerUrl()+que.img);
				}else{
					if(parQue.img){
						$("listenboxwide").empty();
						var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject($("listenboxwide"));
						Element("img").inject(centerImgbox).set("src",paper.media.getFileServerUrl()+parQue.img);
					}
				}
			}
			if(paper.media.isStop() || paper.media.isFail()){
				_iStartAnswerOfPart();
			}
		},1000);
		
		function _iStartAnswerOfPart(){
			paper.media.clear();
			paper.model.get(paper.bakno).partPlayed = 1;
			if(paper.mode.test){
				window.setTimeout(function(){
					paper.show.init(paper.bakno);
				},paper.common.delayShowQueTime)
			}else if(paper.mode.preview || paper.mode.view){
				paper.show.init(paper.bakno);
			}
		}
	},
	playQueAudio:function(que,obj){
		paper.media.setUrl(que.attach);
		paper.media.play();
//		paper.media.clearTimer();
//		paper.media.startTimer = window.setInterval(function(){
//			//if(paper.media.isPlay()) obj.set('disabled',true);
//			if(paper.media.isStop()){
//				paper.media.clearTimer();
//				//obj.set('disabled',false);
//			}
//		},500);
	},
	playSpeakingDrection:function(parQue){
		paper.mmlmw.empty();
		paper.debug("paper.show.playSpeakingDrection()");
		paper.show.updateQueNum(paper.bakno);
		
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_skilpSpeakingDrection();
			}
		}
		
		paper.media.clear();
		paper.media.setUrl(parQue.img5);
		paper.media.play();
		//paper.media.position.init();
		
		var listenboxwide = new Element("div",{"id":"listenboxwide","class":"listenboxwide"}).inject(paper.mmlmw);
		var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject(listenboxwide);
		Element("img").inject(centerImgbox).set("src","images/headset2.jpg");
		
		paper.media.startTimer = window.setInterval(function(){
//			paper.debug("paper.show.playSpeakingDrection():"+paper.media.isFail());
			if(paper.media.isStop() || paper.media.isFail()){
				paper.media.clear();
//				if(parQue.img4){//图片材料
//					_iPlaySpeakingReading(parQue.img4);
//				}else{
					var m = paper.model.get(paper.bakno);
					m.playDrectioned = 1;
					paper.show.init(paper.bakno)
//				}
			}
		},1000);
		
		function _skilpSpeakingDrection(){
			paper.media.clear();
			var m = paper.model.get(paper.bakno);
			m.playDrectioned = 1;
			paper.show.init(paper.bakno)
		}
	},
	playSpeakingText:function(parQue){
		paper.numCtrl.set("text","");
		paper.mmlmw.empty();
		paper.media.clear();
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_iGonext();
			}
		}
		
		function _iPlaySpeakingReading(urls){
			paper.media.clear();
			paper.media.setUrl(parQue.img4);
			paper.media.play();
//			paper.debug("paper.show.playSpeakingDrection()._iPlaySpeakingReading()");
			paper.media.startTimer = window.setInterval(function(){
				if(paper.media.isStop() || paper.media.isFail()){
					var m = paper.model.get(paper.bakno);
					_iReadTextTiming();
				}
			},1000);
		}
		
		var speakwide = new Element("div",{'class':'speakwide'}).inject(paper.mmlmw);
		var readbox = new Element("div",{'class':'readbox'}).inject(speakwide);
		var readtiming = new Element("div",{'class':'readtiming'}).inject(readbox).set('html',"&nbsp;");
		var readtext = new Element("div",{'class':'readtext'}).inject(readbox).set('html',"<div class='readerw'>"+parQue.contenta+"</div>");
		
		if(paper.mode.test || paper.mode.preview){
			paper.media.readtiming = readtiming;
			
			if(parQue.img4){//图片材料
				_iPlaySpeakingReading(parQue.img4);
			}else{
				paper.media.setTimer = window.setTimeout(function(){
					_iReadTextTiming();
				},1000);
			}
			
			var _iReadTextTiming = function(){
				paper.media.readtiming.ing = paper.common.getReadTime();
				paper.media.clearTimer();
				paper.media.startTimer = window.setInterval(function(){
					var total = paper.common.getReadTime();
					paper.media.readtiming.ing--;
					paper.media.readtiming.set('text',paper.timer.main.format2(paper.media.readtiming.ing));
					//paper.debug(paper.media.readtiming.ing);
					if(paper.media.readtiming.ing<=0){
						_iGonext();
					}
				},1000);
			}
		}
		function _iGonext(){
			paper.media.clear();
			paper.model.get(paper.bakno).readed = 1;
			paper.show.init(paper.bakno);
		}
	},
	playSpeakingMedia:function(parQue){
		paper.numCtrl.set("text","");
		paper.mmlmw.empty();
		if(paper.mode.debug){
			
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				paper.media.clear();
				_iBackQue();
			}
		}
		
		if(paper.mode.view || paper.mode.preview){
			if(parQue && parQue.scripts) paper.show.showButton("scriptsBtn");
		}
		
		paper.media.clear();
		paper.media.setUrl(parQue.attach2);
		paper.media.play();
		paper.media.position.init();
		
		var listenboxwide = new Element("div",{"id":"listenboxwide","class":"listenboxwide"}).inject(paper.media.positionbox,"before");
		var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject(listenboxwide);
		Element("img").inject(centerImgbox).set("src",paper.media.getFileServerUrl()+(parQue.img?parQue.img:paper.common.defaultImgOfCaiLiao));
		//var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
		//listenbox.set("html","<div>"+parQue.title+"</div>");
		//paper.debug(JSON.encode(parQue.attaches));
		paper.media.startIndex = 0;
		paper.media.startTimer = window.setInterval(function(){
			//paper.debug("show.playListening():"+"playstate:"+paper.media.getState()+",index:"+paper.media.startIndex);
			if(paper.media.isPlay()) paper.media.startIndex++
			if(paper.media.isStop() || paper.media.isFail()){
				paper.media.clear();
				_iBackQue();
			}
		},1000);
		var _iBackQue = function(){
			paper.media.clear();
			paper.model.get(paper.bakno).played = 1;
			//if(paper.media.positionbox) paper.media.positionbox.setStyle("display","none");
			if(paper.mode.test){
				listenboxwide.empty();
				var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
				listenbox.set("html","<div>"+paper.common.readytoanswer+"</div>");
				window.setTimeout(function(){
					paper.show.init(paper.bakno);
				},2000);
			}else{
				paper.show.init(paper.bakno);
			}
		}
	},
	playWritingText:function(parQue){
		paper.layout.setStyle();
		paper.mmlmw.empty();
		paper.mmrmw.empty();
		paper.media.clear();
		paper.media.volume.hide();
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_iBackWritingQue();
				return;
			}
		}
		
		//paper.mmlmw.set('html',"<div class='readerw'>"+parQue.desc+"</div>");
		//paper.mmrmw.set('html',"<div class='readerw'>"+parQue.contenta+"</div>");
		paper.mmlmw.set('html',"<div class='readerw'>"+(parQue.img2?"<div class='readerimgdiv'><img border='0' src='"+paper.media.getFileServerUrl()+parQue.img2+"'/></div>":"")+parQue.contenta+"</div>");
		
		if(paper.mode.test || paper.mode.preview){
			paper.timer.main.setElement();
			paper.timer.main.clear();
			paper.timer.main.ing = paper.common.getReadTime();
			paper.timer.main.bar.set("html",paper.timer.main.format(paper.timer.main.ing));
			paper.timer.main.tid = window.setInterval(function(){
				paper.timer.main.ing--;
				paper.timer.main.bar.set("text",paper.timer.main.format(paper.timer.main.ing));
				if(paper.timer.main.ing<0){
					_iBackWritingQue();
					return;
				}
			},1000);
		}
		function _iBackWritingQue(){
			paper.timer.main.clear();
			var m = paper.model.get(paper.bakno);
			m.readed = 1;
			paper.show.init(paper.bakno)
		}
	},
	playWritingMedia:function(parQue){
		paper.layout.setStyle({cols:1});
		paper.mt.setStyle("display","none");
		paper.mmlmw.empty();
		paper.media.volume.show();
		paper.timer.main.clear();
		
		if(paper.mode.debug){
			paper.show.showButton(["skipBtn"]);
			paper.layout.setButtonImg(paper.skip,'skip',false);
			paper.skip.onclick = function(){
				paper.layout.setButtonImg(paper.skip,'skipb',true);
				_iBackWritingQues();
			}
		}
		
		if(paper.mode.view || paper.mode.preview){
			if(parQue.scripts) paper.show.showButton("scriptsBtn");
		}
		
		paper.media.setUrl(parQue.attach2);
		paper.media.play();
		paper.media.position.init();
		
		var listenboxwide = new Element("div",{"id":"listenboxwide","class":"listenboxwide"}).inject(paper.media.positionbox,"before");
		var centerImgbox = new Element("div",{"id":"centerImgbox","class":"centerImgbox"}).inject(listenboxwide);
		Element("img").inject(centerImgbox).set("src",paper.media.getFileServerUrl()+(parQue.img?parQue.img:paper.common.defaultImgOfCaiLiao));
		//var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
		//listenbox.set("html","<div>"+parQue.title+"</div>");
		//paper.debug(JSON.encode(parQue.attaches));
		paper.media.startIndex = 0;
		paper.media.startTimer = window.setInterval(function(){
			//paper.debug("show.playListening():"+"playstate:"+paper.media.getState()+",index:"+paper.media.startIndex);
			if(paper.media.isPlay()){
				paper.media.startIndex++
			}
			if(paper.media.isStop() || paper.media.isFail()){
				_iBackWritingQues();
			}
		},1000);
		
		function _iBackWritingQues(){
			paper.media.clear();
			paper.model.get(paper.bakno).played = 1;
			paper.media.volume.hide();
			//if(paper.media.positionbox) paper.media.positionbox.setStyle("display","none");
			if(paper.mode.test){
				paper.show.hideButton();
				listenboxwide.empty();
				var listenbox = new Element("div",{"id":"listenbox","class":"listenbox"}).inject(listenboxwide);
				listenbox.set("html","<div>"+paper.common.readytoanswer+"</div>");
				window.setTimeout(function(){
					paper.show.init(paper.bakno);
				},2000);
			}else{
				paper.show.init(paper.bakno);
			}
		}
	},
	handleListeningView:function(model,que,parQue){
		paper.show.showButton(["playTalkBtn","backBtn","nextBtn","reviewBtn","scriptsBtn"]);
		if(paper.mode.preview){
			paper.show.showButton("solutionBtn");
		}
		paper.playTalk.onclick = function(){paper.show.playListeningMedia(parQue);}
	},
	handleSpeakingView:function(model,que,parQue){
		paper.show.showButton(["backBtn","nextBtn"]);
		if(parQue.scripts) paper.show.showButton("scriptsBtn");
//		if(model.rec){
//			paper.show.showButton("playbackBtn");
//			paper.playback.onclick = function(){
//				if(model.rec){
//					paper.media.setUrl(model.rec);
//					paper.media.play();
////					paper.media.startTimer = window.setInterval(function(){
////						if(paper.media.isPlay()) paper.playback.set('disabled',true);
////						if(paper.media.isStop()){
////							paper.media.clearTimer();
////							paper.playback.set('disabled',false);
////						}
////					},200)
//				}else{
//					
//				}
//			};
//		}
	},
	handleWritingView:function(model,que,parQue){
		if(parQue.attach2){
			paper.show.showButton(["playTalkBtn","backBtn","nextBtn"]);
			paper.playTalk.onclick = function(){paper.show.playWritingMedia(parQue);}
		}else{
			paper.show.showButton(["backBtn","nextBtn"]);
		}
		if(parQue.scripts) paper.show.showButton("scriptsBtn");
		if(que.wa){
			if(!paper.wa) paper.wa = new Element("input",{'id':'writinga','type':'button','value':''}).inject(paper.playback,'before');
			paper.show.showButton("writinga");
			paper.wa.content = que.wa;
			paper.wa.onclick = function(){
				paper.widget.xwiner.init("writingsa","Sample 1",this.content,paper.common.sampleWin);
			}
		}
		if(que.wb){
			if(!paper.wb) paper.wb = new Element("input",{'id':'writingb','type':'button','value':''}).inject(paper.playback,'before');
			paper.show.showButton("writingb");
			paper.wb.content = que.wb;
			paper.wb.onclick = function(){
				paper.widget.xwiner.init("writingsb","Sample 2",this.content,paper.common.sampleWin);
			}
		}
		if(que.wc){
			if(!paper.wc) paper.wc = new Element("input",{'id':'writingc','type':'button','value':''}).inject(paper.playback,'before');
			paper.show.showButton("writingc");
			paper.wc.content = que.wc;
			paper.wc.onclick = function(){
				paper.widget.xwiner.init("writingsc","Sample 3",this.content,paper.common.sampleWin);
			}
		}
	},
	reset:function(){
		$$(".fitem").each(function(o){
			o.getElement(".fnav").getElements("span").each(function(a){
				a.set("class","nowide");
				a.active = false;
			});
		});
	},
	hideButton:function(arrIds){
		if(!arrIds) paper.btnCtrl.getElements("input").each(function(a){a.setStyle("display","none");});
		else if(typeof(arrIds)=="string") $(arrIds).setStyle("display","none");
		else if(typeof(arrIds)=="object") paper.btnCtrl.getElements("input").each(function(a){a.setStyle("display",arrIds.contains(a.id)?"none":"inline");});
	},
	showButton:function(arrIds){
		if(!arrIds) paper.btnCtrl.getElements("input").each(function(a){a.setStyle("display","inline");});
		else if(typeof(arrIds)=="string") $(arrIds).setStyle("display","inline");
		else if(typeof(arrIds)=="object") paper.btnCtrl.getElements("input").each(function(a){a.setStyle("display",arrIds.contains(a.id)?"inline":"none");});
	},
	reInit:function(no){
//		paper.mml.setBackground();
		paper.mmlt.inactive();
		paper.mmrt.inactive();
		paper.mmlmw.reset();
		paper.viewText.setStyle("display","none");
		//paper.viewText.value = "View Text";
		paper.viewText.viewed = 0;
		paper.next.onclick = function(){paper.show.next();};
		if(paper.media.recorder){
			try {
				paper.media.recorder.stopRec();
			} catch (e) {}
		}
		if(no!=paper.bakno) paper.media.clear();
	},
	review:function(){//检查答题情况
		if(!paper.refers || paper.refers.length==0 || paper.refers[0].type==-1) return;
		paper.layout.setStyle({cols:1});
		paper.mmlmw.empty();
		paper.show.showButton(["returnBtn"]);
		var reviewbox = new Element("div",{'class':'reviewbox'}).inject(paper.mmlmw)
		var tables = new Element("table",{'class':'tables','border':'0','cellpadding':'0','cellspacing':'1'}).inject(reviewbox);
		var tbodys =  new Element("tbody").inject(tables)
		var trhead =  new Element("tr").inject(tbodys);
		new Element("th",{'width':'30'}).inject(trhead).set('text',"No.");
		new Element("th").inject(trhead).set("text","Description");
		new Element("th",{'width':'120'}).inject(trhead).set("text","Status");
		if(!$("divContainer")){
			paper.divContainer = new Element("div",{'id':'divContainer'}).inject(document.body);
		}else{paper.divContainer = $("divContainer");}
		paper.divContainer.setStyle("display","none");
		paper.refersout = [];
		if(paper.isReading && (paper.mode.test || paper.mode.preview) && paper.timer.main.ing){
//			if(paper.firstReadingEnd){
//				paper.refersout = paper.refers.filter(function(a){return a.no>paper.firstReadingEndNo});
//			}else{
//				paper.refersout = paper.refers.filter(function(a){return a.no<=paper.firstReadingEndNo});
//			}
			paper.refersout = paper.refers;
		}else{
			paper.refersout = paper.refers;
		}
		paper.refersout.each(function(refer,rindex){
			var parQue = paper.model.getQue(refer.qid);
			var que = paper.model.getQueChild(parQue,refer.id);
			var tr = new Element("tr").inject(tbodys);
			if(refer.no==paper.bakno) tr.setStyle("background","#ccc");
			new Element("td",{'class':'one'}).inject(tr).set('text',refer.no);
			paper.divContainer.set('html',que.content);
			var trbody = new Element("td",{'class':'two'}).inject(tr).set('text',paper.divContainer.get('text'));
			trbody.no = refer.no;
			
			if(paper.mode.test && refer.rs==paper.RS.notyetseen.id){}
			else {trbody.addEvent("click",function(){paper.show.init(this.no)});}
			trbody.addEvent("mouseover",function(){this.setStyles({'color':'blue','text-decoration':'underline'})});
			trbody.addEvent("mouseout",function(){this.setStyles({'color':'','text-decoration':'none'})});
			var states = paper.RS.get(refer.rs);
			if(paper.mode.view){
				states = paper.RS.get(refer.as);
			}
			new Element("td",{'class':'three'}).inject(tr).set('html',"<strong class='"+paper.common.getAnswerStateStyle(refer.as)+"'>"+states+"</strong>");
		});
	},
	success:function(){
		if(paper.mode.test || paper.mode.preview) paper.widget.checker.init();
		paper.widget.bans.init();
		paper.layout.setMask(0);
	}
};

//布局
paper.layout = {
	init:function(){
		paper.layout.setFrame();
		paper.layout.setElement();
		paper.layout.setStyle();
		paper.layout.setSize();
	},
	setFrame:function(){
		paper.mt = $("mt");
		paper.mtw = $("mtw");
		paper.mm = $("mm");
		paper.mml = $("mml");
		paper.mmlt = $("mmlt");
		paper.mmltw = $("mmltw");
		paper.mmlm = $("mmlm");
		paper.mmlmw = $("mmlmw");
		paper.mmr = $("mmr");
		paper.mmrt = $("mmrt");
		paper.mmrtw = $("mmrtw");
		paper.mmrm = $("mmrm");
		paper.mmrmw = $("mmrmw");
	},
	setElement:function(){
		paper.mask = $("bxsloadmask");
		paper.b = $("b");
		paper.btnCtrl = $("tupr");//右上角 按钮控制
		paper.numCtrl = $("tdownc");//中间试题进度
		
		
		paper.mmlt.active = function(){
			paper.mmlt.setStyle("display","");
		}
		paper.mmlt.inactive = function(){
			paper.mmlt.setStyle("display","none");
			paper.mmltw.empty();
		}
		paper.mmrt.active = function(){
			paper.mmrt.setStyle("display","");
		}
		paper.mmrt.inactive = function(){
			//paper.mmrt.setStyle("display","none");
			paper.mmrtw.empty();
		}
		
		paper.mmlmw.reset = function(){
			paper.mmlmw.setStyle('padding','5px');
		}
		
		paper.playerDiv = $("playerDiv");
		
		paper.continues = $("continueBtn");
		paper.returns = $("returnBtn");
		paper.next = $("nextBtn");
		paper.ok = $("okBtn");
		paper.back = $("backBtn");
		paper.review = $("reviewBtn");
		paper.viewText = $("viewTextBtn");
		paper.skip = $("skipBtn");
		paper.playback = $("playbackBtn");
		
		paper.playTalk = $("playTalkBtn");
		paper.playAudio = $("playAudioBtn");
		paper.playQue = $("playQueBtn");
		paper.scripts = $("scriptsBtn");
		paper.solution = $("solutionBtn");
		paper.readExplain = $("readExplainBtn");
		
		paper.next.onclick = function(){
			paper.show.next();
		}
		paper.back.onclick = function(){
			paper.show.back();
		}
		paper.returns.onclick = function(){paper.show.init(paper.bakno)};
		
		paper.review.onclick = function(){paper.show.review();}
		paper.viewText.onclick = function(){
			if(!this.viewed){
				paper.layout.setStyle();
				paper.mmlmw.empty();
				paper.layout.setButtonImg(paper.viewText,'viewque',false);
				this.viewed = 1;
			}else{
				paper.show.init(paper.current.no);
				paper.layout.setButtonImg(paper.viewText,'viewtext',false);
				this.viewed = 0;
			}
		}
		paper.scripts.onclick = function(){
			var que = paper.model.getQue(paper.model.get(paper.bakno).qid);
			if(que){
				var title = que.title;
				if(!title) title = "";
				else if(title.length>50) title = title.substr(0,50)+"...";
				paper.widget.xwiner.init(que.id,title+" - "+"Scripts",que.scripts,paper.common.scriptsWin);
			}
				
		}
		paper.solution.onclick = function(){
			paper.mode.solution = (!paper.mode.solution?true:false);
			paper.show.init(paper.bakno);
		}
		
	},
	setStyle:function(set){
		paper.debug("**paper.layout.setStyle."+JSON.encode(set));
		paper.mml.setStyles({"width":"50%","float":"left","display":""});
		paper.mmr.setStyles({"width":"49.3%","float":"right","display":""});
		paper.layout.single = 0;
		if(set){
			if(set.cols && set.cols==1){
				paper.mml.setStyles({"width":(set.w?set.w:"100%"),"float":"none"});
				paper.mmr.setStyles({"display":"none"});
				paper.layout.single = 1;
			}
			if(set.cols && set.cols==2){
				paper.mml.setStyles({"width":(set.l?set.l:"55%"),"float":"left"});
				paper.mmr.setStyles({"width":(set.r?set.r:"43.5%"),"display":""});
				paper.layout.single = 0;
			}
		}
		paper.layout.setSize();
	},
	setSize:function(){
		try {
			//var mmH = $(window).getSize().y-(6+14+$("t").getSize().y);
			var mmH = $(window).getSize().y-(6+$("t").getSize().y);//new ui
			var mmW = $(window).getSize().x;
			//mmW = mmW - 6-24;//three 30px space
			mmW = mmW - 6;//new ui
			
			if($("hdsec")){
				mmH = mmH - $("hdsec").getSize().y;
			}
			
			var mmWL = parseInt(mmW*0.5);
			var mmWR = mmW - mmWL;
			
			if(paper.isReading){
				var model = paper.model.get(paper.bakno);
				if(model && model.ver=='1'){
					mmWR = 628;
					mmWL = mmW - mmWR;
					if(mmWL>mmWR){
						mmWL = parseInt(mmW*0.5);
						mmWR = mmW - mmWL;
					}
				}
			}
			
//			if(Browser.Engine.trident && Browser.Engine.version<5){
//				mmWR = mmWR - 10;
//			}
			if(paper.layout.single){
				mmWL = mmW+6;
				mmWR = 0;
			}
			if(paper.mt){
				if(paper.mt.getStyle("display")!="none"){
					//paper.debug(paper.mt.getSize().y);
					mmH -= paper.mt.getSize().y+10;
				}
			}
			paper.mm.setStyle("height",mmH);
			var ammrt = paper.mmrt.getCoordinates().height;
			if(!ammrt || ammrt<=0){
				if(paper.mmrt.getStyle("display")!="none") ammrt = 20;
			}
		
			paper.mmlm.setStyle("height",mmH);
			paper.mmrm.setStyle("height",mmH-ammrt);
			$("mmcc").setStyle("height",mmH);
			
			paper.mml.setStyle("width",mmWL);
			paper.mmr.setStyle("width",mmWR);
			paper.debug("#setSize>mmW:"+mmW+",mmH:"+mmH+","+ammrt);
		} catch (e) {
			paper.debug("#setSize>"+e);
		}
	},
	setMMRMScorllTop:function(obj){
		if(!obj) return;
		var sobjHeight = $(obj).getCoordinates().top;
		var mmrmScorll = paper.mmrm.getScroll();
		var mmrmSSizey = paper.mmrm.getScrollSize().y;
		var mmrmSizey = paper.mmrm.getSize().y;
		var mmrmSH = mmrmSSizey - mmrmSizey;
		var seeHeight =(mmrmSizey/2)+30;
		if(Browser.Engine.trident){//ie
			if(mmrmScorll.y>0){
				sobjHeight = sobjHeight+mmrmScorll.y;
			}
		}
		//paper.debug("sobjHeight:"+sobjHeight+",seeHeight:"+seeHeight+",mmrmScorll.y:"+mmrmScorll.y);
		if(sobjHeight<seeHeight || sobjHeight>seeHeight){
			paper.mmrm.scrollTop = (sobjHeight-seeHeight)+mmrmScorll.y;
		}
		//paper.debug("paper.layout.setMMRMScorllTop():"+paper.mmrm.scrollTop);
	},
	setMMRMInitScrollStatus:function(){
		var ha = paper.mmrm.getScrollSize().y;
		var hb = paper.mmrm.getSize().y;
		var hc = ha - hb;
		paper.mmrm.sh = hc;
		var hh = paper.mmrm.getScroll().y;
		if(paper.mmrm.sh>0 && hh<=10){
			paper.mmrtw.set('text','Beginning');
		}else if(paper.mmrm.sh>0 && hh>=paper.mmrm.sh - 30){
			paper.mmrtw.set('text','End');
			paper.model.get(paper.bakno).scrolled = 1
		}else{
			if(paper.mmrm.sh<=0){
				paper.model.get(paper.bakno).scrolled = 1;
				paper.mmrtw.set('text','');
			}else{
				paper.mmrtw.set('text','More Available');
			}
		}
	},
	setMask:function(val,word){
		if(paper.mask){
			if(val==null) val = 0.8
			paper.mask.set('html',(word?word:""));
			paper.mask.fade(val);
			window.setTimeout(function(){
				//paper.mask.setStyle("width",0);
				//paper.mask.setStyle("height",0);
				paper.mask.setStyle("display","none");
			},500);
		}
	},
	setButtonImg:function(btn,img,tf){
		if(!$(btn)) return;
		$(btn).setStyle("background","url('images/"+img+".gif') no-repeat");
		$(btn).set('disabled',(tf?true:false));
	},
	setBackColor:function(color){
		if(!color) color = "#fff";
		$("m").setStyle("backgroundColor",color);
	}
}

//计时器

paper.timer = {
	main:{//主计时器
		init:function(ing,notstart){
			if(paper.isReading || paper.isListening){
				if(!ing) ing = paper.common.getTestTimes();
				paper.timer.main.ing = ing
				paper.timer.main.setElement();
				paper.timer.main.set(notstart);
			}
		},
		format:function(ing){
			var hour = parseInt(ing/3600);
			var minute = parseInt(hour>=1?ing%3600/60:paper.timer.main.ing/60);
			var second = parseInt(ing%60);
			if(hour<10) hour = "0"+hour;
			if(minute<10) minute = "0"+minute;
			if(second<10) second = "0"+second;
			return hour+":"+minute+":"+second;
		},
		format2:function(ing){
			var minute = parseInt(ing/60);
			var second = parseInt(ing%60);
			if(minute<10) minute = "0"+minute;
			if(second<10) second = "0"+second;
			return minute+":"+second;
		},
		setElement:function(){
			if(!paper.timer.main.setElemented){
				paper.timer.main.bar = $("timingBar");
				paper.timer.main.sw = $("timingsw");
				//paper.timer.main.sw.setStyle("display","inline");
				paper.timer.main.sw.change = 1;
				paper.timer.main.sw.set('text','HIDE')
				//paper.timer.main.sw.set('html',"<img align='absmiddle' src='images/time_hide.gif' border='0'/>");
				paper.timer.main.sw.addEvent("click",function(){
					if(this.change){
						paper.timer.main.bar.setStyle("visibility","hidden");
						this.set('text','SHOW');
						//this.set('html',"<img align='absmiddle' src='images/time_show.gif' border='0'/>");
						this.change = 0;
					}else{
						paper.timer.main.bar.setStyle("visibility","visible");
						this.set('text','HIDE');
						//this.set('html',"<img align='absmiddle' src='images/time_hide.gif' border='0'/>");
						this.change = 1;
					}
				});
				//paper.timer.main.bar.setStyle("color","#000");
				paper.timer.main.setElemented = 1;
			}
		},
		clearElement:function(){
			try {
				paper.timer.main.sw.set('text','')
				paper.timer.main.bar.set('text','');
			} catch (e) {}
		},
		set:function(notstart){
			window.clearInterval(paper.timer.main.tid);
			if(notstart){
				if(paper.timer.main.sw) paper.timer.main.sw.setStyle("display","none");
				return;
			}else{
				if(paper.timer.main.sw) paper.timer.main.sw.setStyle("display","");
			}
			if(paper.timer.main.bar) paper.timer.main.bar.set("text",paper.timer.main.format(paper.timer.main.ing));
			paper.timer.main.tid = window.setInterval(function(){
				paper.timer.main.ing--;
				paper.timer.main.bar.set("text",paper.timer.main.format(paper.timer.main.ing));
				if(paper.timer.main.ing<=0){
					window.clearInterval(paper.timer.main.tid);
					if(paper.isReading && !paper.firstReadingEnd){
							paper.firstReadingEnd = 1;
							//alert(paper.current.no+","+paper.firstReadingEndNo);
							paper.current = paper.model.get(paper.firstReadingEndNo);
							paper.timer.main.init();
							paper.show.init(paper.firstReadingEndNo+1);
					}else if(paper.isListening && !paper.LSectionPartEnd){
						paper.timer.main.clear();
						paper.LSectionPartEnd = 1;
						paper.current.no=paper.LSNo;
						paper.show.initListeningDirectionsPart();
					}else{
						if(paper.mode.test){
							paper.action.autoEnd();
						}else{
							alert("End of test time.");
							return false;
						}
					}
					return;
				}
				if(paper.data.skill==paper.Skill.reading){
					if(paper.timer.main.ing<=10*60){//10分钟
						//paper.timer.main.bar.setStyle("color","red");//变红
						if(paper.timer.main.ing==10*60) paper.timer.main.blink();//闪烁
						if(paper.timer.main.ing==5*60) paper.timer.main.blink();
						if(paper.timer.main.ing==1*60) paper.timer.main.blink();
					}else{
						paper.timer.main.bar.setStyle("color","#fff");
					}
				}
				if(paper.data.skill==paper.Skill.writing){
					if(paper.timer.main.ing<=10*60){//10分钟
						//paper.timer.main.bar.setStyle("color","red");
						if(paper.timer.main.ing==10*60) paper.timer.main.blink();
						if(paper.timer.main.ing==5*60) paper.timer.main.blink();
						if(paper.timer.main.ing==1*60) paper.timer.main.blink();
					}
				}
//				if(paper.data.skill==paper.Skill.listening){
//					if(paper.timer.main.ing<=1*60) paper.timer.main.bar.setStyle("color","red");
//				}
//				if(paper.data.skill==paper.Skill.speaking){
//					if(paper.timer.main.ing<=1*60) paper.timer.main.bar.setStyle("color","red");
//				}
				
			},1000);
		},
		blink:function(){
			paper.timer.main.blinkc = 0;
			paper.timer.main.blinkt = window.setInterval(function(){
				var v = paper.timer.main.bar.getStyle("visibility");
				paper.timer.main.bar.setStyle("visibility",(v=="hidden"?"visible":"hidden"));
				paper.timer.main.blinkc++;
				if(paper.timer.main.blinkc>=20){//闪动10秒
					//paper.timer.main.bar.setStyle("color","#000");//变黑
					window.clearInterval(paper.timer.main.blinkt);return;
				}
			},500)
			//paper.timer.main.bar.setStyle("color","red");//变红
		},
		clear:function(){
			paper.debug("paper.timer.main.clear()");
			window.clearInterval(paper.timer.main.tid);
			paper.timer.main.ing = 0;
			paper.timer.main.clearElement();
		},
		pause:function(ishide){
			paper.debug("--paper.timer.main.pause("+ishide+")>"+paper.timer.main.ing);
			if(ishide){
				paper.timer.main.bar = $("timingBar");
				paper.timer.main.sw = $("timingsw");
				if(paper.timer.main.sw){
					paper.timer.main.sw.setStyle("display","none");
				}
				if(paper.timer.main.bar){
					paper.timer.main.bar.set("text","");
				}
			}
			window.clearInterval(paper.timer.main.tid);
		},
		resume:function(){
			paper.debug("paper.timer.main.resume()>"+paper.timer.main.ing);
			try {
				paper.timer.main.set();
			} catch (e) {}
		}
	}
	
};
paper.flvplayer = {
	getHtml:function(fn){
		var shtml = "";
		shtml += ("<div id=\"flvPlayerDiv\"><embed height=\"50\" width=\"380\" align=\"left\" id=\"flvPlayer\" ");
		shtml += ("	pluginspage=\"http:\/\/www.macromedia.com\/go\/getflashplayer\" ");
		shtml += ("	allowscriptaccess=\"always\" base=\".\" wmode=\"transparent\" ");
		shtml += ("	quality=\"high\" bgcolor=\"#ffffff\" name=\"flvPlayer\" ");
		shtml += ("	mediawrapchecked=\"true\" ");
		shtml += ("	src=\"flvPlayer.swf?filename="+fn+"\" ");
		shtml += ("	type=\"application\/x-shockwave-flash\" ");
		shtml += ("	splayername=\"SWF\" ");
		shtml += ("	tplayername=\"SWF\"");
		shtml += ("\/></div>")
		return shtml;
	},
	setPlay:function(obj,url){
		var flvplayerbox = $("flvplayerdivbox")
		if(flvplayerbox){
			flvplayerbox.empty();
		}else{
			flvplayerbox = new Element("div",{'id':'flvplayerdivbox','class':'flvplayerbox'}).inject(obj);
		}
		url = paper.media.getServierDir()+url;
		flvplayerbox.set("html",paper.flvplayer.getHtml(url));
	}
}
paper.recorder = {
	count:0,
	playCount:0,
	isTest:0,
	loaded:0,
	fn:"undefined",
	init:function(){
		paper.recorder.player = $("flashRecorder");
		paper.recorder.div = $("flashRecorderDiv");
		paper.debug("paper.recorder.init()"+paper.recorder.player+","+paper.recorder.div);
	},
	setFlashPosition:function(id){
		//if(paper.debug.ref.micui) return;
		var coord = $(id).getCoordinates();
		paper.recorder.div.setStyle("top",coord.top);
		paper.recorder.div.setStyle("left",coord.left);
		paper.recorder.div.setStyle("display",'');
		paper.recorder.div.setStyle("height","1px");
		paper.recorder.permit();
	},
	permit:function(){
//		try {
//			window.setTimeout(function(){
//				if(!paper.recorder.loaded){
//					paper.recorder.player.dopashe_ks();
//				}
//			},3500)
//		} catch (e) {
//			paper.debug("paper.recorder.permit():"+e);
//		}
	},
	recordLevelSet:function(flag){
		paper.recorder.player.dopashe_js();
		if(flag=="1"){
			paper.recorder.hideRecorder();
			paper.recorder.loaded = 1;
			if($("startRecordBtn")){
				$("startRecordBtn").set("disabled",false);
			}
			if($("recorderTestBtn")){
				paper.layout.setButtonImg($("recorderTestBtn"),'proceed',false);
			}
		}else{
			alert("无法使用麦克风，不能录音！请选择【允许】按钮！");
			location.reload();
		}
	},
	recordLevelSetNew:function(val){
		paper.debug("recordLevelSetNew()"+val);
		if(val=="init_ok"){
			paper.recorder.hideRecorder();
			paper.recorder.loaded = 1;
			if($("startRecordBtn")){
				$("startRecordBtn").set("disabled",false);
			}
			if($("recorderTestBtn")){
				paper.layout.setButtonImg($("recorderTestBtn"),'proceed',false);
			}
		}else if(val=="mic_muted"){
			paper.recorder.hide();
			paper.widget.xalert.init("麦克风权限提示","<p style=\"padding:10px 5px;text-align:center;\">不允许使用电脑麦克风，请在权限设置中选择【允许】按钮！</p>",{okbtn:"OK",okfunc:function(){location.reload();}});
		}else if(val=="no_mic"){
			paper.recorder.hide();
			paper.widget.xalert.init("麦克风权限提示","<p style=\"padding:10px 5px;text-align:center;\">未检测到麦克风，请确认电脑是否已接上麦克风设备！</p>",{okbtn:"OK",okfunc:function(){location.reload();}});
		}else if(val=="no_server" || val=="server_fail"){
			paper.recorder.hide();
			paper.widget.xalert.init("麦克风权限提示","<p style=\"padding:10px 5px;text-align:center;\">录音初始化失败！</p>",{okbtn:"OK",okfunc:function(){location.reload();}});
		}else{
			
		}
	},
	hideRecorder:function(){
		if(paper.debug.ref.micui) return;
		$("flashRecorderObj").style.position = "absolute";
		$("flashRecorderObj").style.top = "-1000px";
		$("flashspacediv").style.height = "30px";
	},
	hide:function(){
		if(paper.debug.ref.micui) return;
		$("flashRecorderDiv").style.position = "absolute";
		$("flashRecorderDiv").style.top = "-1000px";
	},
	testOk:function(){
		var btn = $("recorderTestBtn")
		if(btn){
			btn.set("disabled",false);
		}
	},
	rec:function(){
		//paper.recorder.player.dopashe_ks();
		paper.recorder.player.callRec();
	},
	stopRec:function(){
		//paper.recorder.player.dopashe_js();
		paper.recorder.player.callStop();
	},
	play:function(){
		//paper.recorder.player.dobofang_bf();
		paper.recorder.player.callPlay();
	},
	stopPlay:function(){
		//paper.recorder.player.tingzhi();
		paper.recorder.player.callStop();
	},
	getStatus:function(){
		//return paper.recorder.player.bfzt();
		return paper.recorder.player.callPlayStatus();
	},
	setFileName:function(cmd){
		var fileName = "tem";
		if(cmd=="0"){
			fileName = "test_mico_"+paper.userId;
		}else if(cmd=='1'){
			if(paper.mode.test){
				fileName = "test_"+paper.data.id+"_"+paper.userId+"_"+paper.bakno;
			}else if(paper.mode.preview){
				fileName = "test_preview_"+paper.userId+"_"+paper.bakno;
			}
		}
		//paper.recorder.player.SetVariable('fileName',fileName);
		paper.recorder.fn = fileName
		try {
			paper.debug("paper.recorder.setFileName()."+paper.recorder.fn);
			//paper.recorder.player.resetFileName(paper.recorder.fn);
			paper.recorder.player.setSaveName(paper.recorder.fn);
		} catch (e) {
			paper.debug("[error]paper.recorder.setFileName()."+e);
		}
		
	}
};

//常用对象
paper.common = {
	navLen:23,
	navAdd:4,
	navMinus:7,
	delayShowQueTime: 1000,//seconds/1000
	delayShowQueTimeOfAnswer: 2000,
	speakingFolder:"/file_upload/Red5/webapps/toefl/streams/",
	//speakingFolder:"/file_upload/speaking/toefl/streams/_definst_/",
	speakingSavePath:function(){
		return paper.common.speakingFolder+"test_"+paper.data.id+"_"+paper.userId+"_"+paper.bakno+".flv"
	},
	prepareRecSound:"/toefl/audio/prepareRecSound.mp3",
	recSound:"/toefl/audio/recSound.mp3",
	beepSound:"/toefl/audio/beep.mp3",
	defaultImgOfCaiLiao:"/images/def_cailiao.jpg",
	parrows:"bxs_parrows",
	psquares:"bxs_psquares",
	//getArrowChar:"&#10149;",
	getArrowChar:"<img border=\"0\" align=\"absmiddle1\" src=\"images/read_parrow.gif\"/>",
	getArrowSpan:function(){
		return "<span class='arrows'>"+paper.common.getArrowChar+"</span>";
	},
	scriptsWin:{w:500,h:280},
	sampleWin:{w:500,h:280},
	readExplainWin:{w:500,h:280},
	getParagraphShowText:"Paragraph is marked with an arrow ",
	getPlayQueAudioBtn:function(){
		return new Element("input",{'id':'playQueAudioBtn','type':'button','value':'Question Audio'});
	},
	getPlayQueMaterialBtn:function(){
		return new Element("input",{'id':'playQueMaterialBtn','type':'button','value':'Question talk'});
	},
	getPlayQueReadBtn:function(){
		return new Element("input",{'id':'playQueReadBtn','type':'button','value':'View Text'});
	},
	getAnswerStateStyle:function(as){
		if(as==paper.RS.correct.id) return "ra";
		else if(as==paper.RS.incorrect.id) return "wa";
		else if(as==paper.RS.partiallycorrect.id) return "rwa";
	},
	abc:function(i){
		switch (i) {
			case 0:return "A";case 1:return "B";case 2:return "C";case 3:return "D";case 4:return "E";
			case 5:return "F";case 6:return "G";case 7:return "H";case 8:return "I";case 9:return "J";
			case 10:return "K";case 11:return "L";case 12:return "M";case 13:return "N";case 14:return "O";
			case 15:return "P";case 16:return "Q";case 17:return "R";case 18:return "S";case 19:return "T";
			case 20:return "U";case 21:return "V";case 22:return "W";case 23:return "X";case 24:return "Y";
			case 25:return "Z";
			default:return "";
		}

	},
	getRecTime:function(no){
		switch (no) {
			case 1: return {pre:15,rec:45};
			case 2: return {pre:15,rec:45};
			case 3: return {pre:30,rec:60};
			case 4: return {pre:30,rec:60};
			case 5: return {pre:20,rec:60};
			case 6: return {pre:20,rec:60};
			default: return {pre:0,rec:0};
		}
	},
	getTestTimes:function(){
		//return paper.data.times * 60;
		var len = paper.data.ques.length;
		if(paper.isReading){
			if(!paper.firstReadingEnd){
				return 20*60;//20min/reading
			}else{
				if(len<=1) return 20*60;
				//return (len-1) * 20 * 60;
				return len * 20 * 60;
			}
			//return len*20*60;
		}else if(paper.isListening){
			//return len*13*60;//standard:10+playing:3
			return 10*60;
		}else{
			return 0;
		}
	},
	getReadTime:function(){
		if(paper.isSpeaking) return 45;
		if(paper.isWriting) return 180;
		return 0;
	},
	getWritingTaskTime:function(no){
		if(no==1) return 20*60;
		if(no==2) return 30*60;
//		if(no==1) return 12;
//		if(no==2) return 15;
		return 0;
	},
	getBreakTime:function(){return 10*60},
	answerExplain:"解析",
	adjustmicro:function(s){
		s  = "<p>In order to adjust your microphone volume, please answer the practice question below, using your normal voice tone and volume. The microphone volume will be automatically adjusted as you speak.</p>";
		s += "<p>Click the <strong>Record</strong> button to start recording for 10 seconds.<br/>Begin speaking after the beep.</p>";
		s += "<center><strong><em>\"Describe the city you live in.\"</em></strong></center>";
		return s;
	},
	listenagain:"<p>Listen again to part of the conversation/lecture.</p><p>Then answer the question.</p>",
	readytoanswer:"<p>Now get ready to answer the questions.</p><p>You may use you notes to help you answer.</p>",
	answerDragTip:"Drag your answer choices to the spaces where they belong. To remove an answer choice, click on it. To reivew the passage, click <strong>View Text</strong>.",
	answerDragTipOfTLPX:"Drag your answer choices to the spaces where they belong. To remove an answer choice, click on it.",
	exitWritingTask1:"<p>You still have time left to write your response. As long as there is time remaining,you can continue writing or revising your response.</p><p>Click on <strong>Return</strong> to continue writing your response.</p><p>Click on <strong>Exit</strong> to leave this writing question. Once you exit this question you will NOT be able to return and you may not continue writing.</p>",
	exitReadingTask1:"<p>You still have time left to answer your response. As long as there is time remaining,you can continue answering or revising your response.</p><p>Click on <strong>Return</strong> to continue answering your response.</p><p>Click on <strong>Exit</strong> to leave this reading question. Once you exit this question you will NOT be able to return and you may not continue answering.</p>",
	readingDirections:function(s){
		s = "<p>This section measures your ability to understand academic passages in English.</p>";
		s += "<p>The Reading section is divided into 2 separately timed parts.</p>";
		s += "<p>Most questions are worth 1 point but the last question in each set is worth more than 1 point. The directions indicate how many points you may receive.</p>";
		s += "<p>Some passages include a word or phrase that is <u>underlined</u> in blue. Click on the word or phrase to see a definition or an explanation.</p>";
		s += "<p>Within each part, you can go to the next question by clicking <strong>Next</strong>. You may skip questions and go back to them later. If you want to return to previous questions, click on <strong>Back</strong>. You can click on <strong>Review</strong> at anytime and the review screen will show you which questions you have answered and which you have not answered. From this review screen, you may go directly to any question you have already seen in the Reading section.</p>";
		//s += "<p>During this practice test, you may click the <strong>Pause</strong> icon at anytime. This will stop the test until you decide to continue. You may continue the test in a few minutes or at anytime during the period that your test is activated.</p>";
		s += "<p>You may now begin the Reading section. In this part you will read 1 passage. In an actual test you will have <strong>20 minutes</strong> to read the passage and answer the questions.</p>";
		s += "<p>Click on <strong>Continue</strong> to go on.</p>";
//		s = "<p>In this section you will read three passages and answer reading comprehension questions about each passage. Most questions are worth one point, but the last question in each set is worth more than one point. The directions indicate how many points you may receive.</p>";
//		s += "<p>You will have 60 minutes to read all of the passages and answer the questions. Some passages include a word or phrase that is underlined in blue. Click on the word or phrase to see a definition or an explanation.</p>";
//		s += "<p>When you want to move on to the next question, click on <strong>Next</strong>. You can skip questions and go back to them later as long as there is time remaining. If you want to return to previous questions, click on <strong>Back</strong>. You can click on <strong>Review</strong> at any time and the review screen will show you which questions you have answered and which you have not. From this review screen, you may go directly to any question you have already seen in the reading section.</p>";
//		s += "<p>When you are ready to continue, click on the <strong>Continue</strong> button.</p>";
		return s;
	},
	listeningDirections2:function(s){
		s = "<p>This section measures your ability to understand conversations and lectures in English. You will hear each conversation or lecture only one time. After each conversation or lecture, you will answer some questions about it. The questions typically ask about the main idea and supporting details. Some questions ask about a speaker's purpose or attitude. Answer the questions based on what is stated or implied by the speakers.</p>";
		s += "<p>You may take notes while you listen. You may use your notes to help you answer the questions. Your notes will not be scored.</p>";
		s += "<p>If you need to change the volume while you listen, click on the <strong>Volume</strong> icon at the top of the screen.</p>";
		s += "<p>In some questions, you will see this icon:  . This means that you will hear, but not see part of the question.</p>";
		s += "<p>Some of the questions have special directions. These directions appear in a gray box on the screen.</p>";
		s += "<p>Most questions are worth one point. If a question is worth more than one point, it will have special directions that indicate how many points you can receive.</p>";
		s += "<p>You must answer each question. After you answer, click on <strong>Next</strong>. Then click on <strong>OK</strong> to confirm your answer and go on to the next question. After you click on <strong>OK</strong>, you cannot return to previous questions.</p>";
		s += "<p>You will have 20 minutes to answer the questions in this section. A clock at the top of the screen will show you how much time is remaining. The clock will not count down while you are listening to test material.</p>";
		s += "<p><strong>Note:</strong> In the <strong>Listening Section</strong> of the actual test, you will both hear and read the questions.</p>";
		return s;
	},
	listeningDirections:function(s){
		s = "<p>This test measures your ability to understand conversations and lectures in English.</p>";
		s += "<p>The Listening section is divided into 2 separately timed parts. In each part you will listen to 1 conversation and 2 lectures. You will hear each conversation or lecture only <strong>one</strong> time.</p>";
		s += "<p>After each conversation or lecture, you will answer some questions about it. The questions typically ask about the main idea and supporting details. Some questions ask about a speaker's purpose or attitude. Answer the questions based on what is stated or implied by the speakers.</p>";
		s += "<p>You may take notes while you listen. You may use your notes to help you answer the questions. Your notes will <strong>not</strong> be scored.</p>";
		s += "<p>If you need to change the volume while your listen, click on the <strong>Volume</strong> icon at the top of the screen.</p>";
		s += "<p>In some questions, you will see this icon:<img src=\"images/toefl_earphone.gif\" border=\"0\"/> This means that you will hear, but not see, part of the question.</p>";
		s += "<p>Some of the questions have special directions. These directions appear in a gray box on the screen.</p>";
		s += "<p>Most questions are worth 1 point. If a question is worth more than 1 point, it will have special directions that indicate how many points your can receive.</p>";
		s += "<p>Your must answer each question. After you answer, click on <strong>Next</strong>. Then click on <strong>OK</strong> to confirm your answer and go on to the next question. After you click on <strong>OK</strong>, you cannot return to previous questions. If you are using the <strong>Untimed Mode</strong>, your may return to previous questions and you may listen to each conversation and lecture again. Remember that prior exposure to the conversations, lectures, and questions could lead to an increase in your section scores and may not reflect a score you would get when seeing them for the first time.</p>";
		s += "<p>During this practice test, you may click <strong>Pause</strong> icon at any time. This will stop the test until you decide to continue. Your may continue the test in a few minutes or at any time during the period that your test is activated.</p>";
		s += "<p>In an actual test, and if you are using <strong>Timed Mode</strong>, a clock at the top of the screen will show you how much time is remaining. The clock will not count down while you are listening. The clock will count down only while you are answering the questions.</p>";
		s += "<p>Click on <strong>Continue</strong> to go on.</p>";
		return s;
	},
	listeningDirectionsPart:function(s){
		s = "<p>In this part you will listen to 1 conversation and 2 lectures.</p>";
		s += "<p>You must answer each question. After you answer, click on <strong>Next</strong>. Then click on <strong>OK</strong> to confirm your answer and go on to the next question.</p>";
		s += "<p>After you click on <strong>OK</strong>, you cannot return to previous questions. If you are using the <strong>Untimed Mode</strong>, you may return to previous questions.</p>";
		s += "<p>You will now begin this part of the Listening section. In an actual test, you will have <strong>10 minutes</strong> to answer the questions.</p>";
		s += "<p>Click on <strong>Continue</strong> to go on.</p>";
		return s;
	},
	writingDirections:function(s){
		s  = "<p>This section measures your ability to use writing to communicate in an academic environment. There will be two writing tasks.</p>";
		s += "<p>For the first writing task, you will read a passage and listen to a lecture and then answer a question based on what you have read and heard. For the second writing task, you will answer a question based on your own knowledge and experience.</p>";
		s += "<p>During this practice test, you may click the <strong>Pause</strong> icon at anytime. This will stop the test until you decide to continue. You may continue the test in a few minutes, or at anytime during the period that your test is activated.</p>";
		s += "<p>Now listen to the directions for the first writing task.</p>";
		return s;
	},
	speakingDirections2:function(s){
		s  = "<p>In this section of the test, you will be able to demonstrate your ability to speak about a variety of topics. You will answer six questions by speaking into the microphone. Answer each of the questions as completely as possible.</p>";
		s += "<p>In questions one and two, you will speak about familiar topics. Your response will be scored on your ability to speak clearly and coherently about the topics.</p>";
		s += "<p>In questions three and four, you will first read a short text. The text will go away and you will then listen to a talk on the same topic. You will then be asked a question about what you have read and heard. You will need to combine appropriate information from the test and the talk to provide a complete answer to the question. Your response will be scored on your ability to speak clearly and coherently and on your ability to accurately convey information about what you read and heard.</p>";
		s += "<p>In questions five and six, you will listen to part of a conversation or a lecture. You will then be asked a question about what you heard. Your response will be scored on your ability to speak clearly and coherently and on your ability to accurately convey information about what you heard.</p>";
		s += "<p>You may take notes while you read and while you listen to the conversations and lectures. You may use your notes to help prepare your response.</p>";
		s += "<p>Listen carefully to the directions for each question. The directions will not be written on the screen.</p>";
		s += "<p>For each question you will be given a short time to prepare your response. A clock will show how much preparation time is remaining. When the preparation time is up, you will be told to begin your response. A clock will show how much response time is remaining. A message will appear on the screen when the response time has ended.</p>";
		return s;
	},
	speakingDirections:function(s){
		s  = "<p>In this Speaking practice test, you will be able to demonstrate your ability to speakaboutavanetyoftopics. You will answer six questions by speaking into a microphone. Answer each of the questions as completely as possible.</p>";
		s += "<p>In questions 1 and 2, you will speak about familiar topics. Your response will be scored on your ability to speak clearly and coherently about the topics.</p>";
		s += "<p>In questions 3 and 4, you will first read a short text. The text will go away and you will then listen to a talk on the same topic. You will then be asked a question about what you have read and heard. You will need to combine appropriate information from the text and the talk to provide a complete answer to the question. Your response will be scored on your ability to speak clearlj'and coherently and on your ability to accurately convey information about what you have read and heard. In questions 5 and 6. you will listen to part of a conversation or a lecture. You will then be asked a question about what you have heard. Your response will be scored on your ability to speak clearly and coherently and on your ability to accurately convey information about what you heard. In questions 3 through 6, you may take notes while you read and while you listen to the conversations and lectures. You may use your notes to help prepare your response.</p>";
		s += "<p>Listen carefully to the directions for each question. The directions will not be written on the screen. For each question, you will be given a short time to prepare your response (15 to 30 seconds, depending on the question). A clock will show how much preparation time is remaining. When the preparation time is up. you will be told to begin your response. A clock will show how much response time is remaining. A message will appear on the screen when the response time has ended.</p>"
		//s += "<p>Click on <strong>Continue</strong> to go on.</p>";
		return s;
	},
	changeVolume:"<p>To change the volume, click on the <strong>Volume</strong> icon at the top of the screen. The volume control will appear. Move the volume indicator to the left or to the right to change the volume.</p><p>To close the volume control, move the mouse pointer to another part of the screen.</p><p>You will be able to change the volume during the test if you need to.</p><p>You may now change the volume.</p><p>When you are finished, click on <strong>Continue</strong>.</p>",
	writingtaskone:function(s){
		s  = "<p>For this task, you will first have five minutes to read a passage about an academic topic. You may take notes on the passage if you wish. The passage will then be removed and you will listen to a lecture about the same topic. While you listen, you may also take notes.</p>";
		s += "<p>Then you will have 20 minutes to write a response to a question that asks you about the relationship between the lecture you heard and the reading passage. Try to answer the question as completely as possible using information from the reading passage and the lecture. The question does not ask you to express your personal opinion. You will be able to see the reading passage again when it is time for you to write. You may use your notes to help you answer the question.</p>";
		s += "<p>Typically, an effective response will be 150 to 225 words long. Your response will be judged on the quality of your writing and on the completeness and accuracy of the content. If you finish your response before time is up, you may click on <strong>Next</strong> to go on to the second writing task.</p>";
		s += "<p>Now you will see the reading passage for five minutes. Remember it will be available to you again when you write immediately after the reading time ends. The lecture will begin, so keep your headset on until the lecture is over.</p>";
		return s;
	},
	writingtasktwo:function(s){
		s  = "<p>For this task, you will write an essay in response to a question that asks you to state, explain, and support your opinion on an issue. You will have 30 minutes to plan, write, and revise your essay.</p>";
		s += "<p>Typically, an effective essay will contain a minimum of 300 words. Your essay will be judged on the quality of your writing. This includes the development of your ideas, the organization of your essay, and the quality and accuracy of the language you use to express your ideas.</p>";
		s += "<p>If you finish your essay before time is up, you may click on <strong>Next</strong> to end this section.</p>";
		s += "<p>When you are ready to continue, click on the <strong>Continue</strong> button.</p>";
		return s;
	},
	getDirections:function(){
		if(paper.isReading) return paper.common.readingDirections();
		else if(paper.isListening) return paper.common.listeningDirections();
		else if(paper.isWriting) return paper.common.writingDirections();
		else if(paper.isSpeaking) return paper.common.speakingDirections();
		else return "Unknown";
	},
	readingEndDirections:function(s){
		s  = "<p>You have seen all of the questions in this section. You may continue to review your work.</p>";
		s += "<p>Click on <strong>Return</strong> to continue working. Click on <strong>Continue</strong> to go on.</p>";
		s += "<p>Once you leave this section and proceed to the next,you WILL NOT be able to return to it.</p>";
		return s;
	},
	listeningEndDirections:function(s){
		s  = "<p>This is the end of the Listening section.</p>";
		s += "<p>Click on <strong>Continue</strong> to proceed.</p>";
		s += "<p>Once you leave this section and proceed to the next,you WILL NOT be able to return to it.</p>";
		return s;
	},
	listeningEndDirectionsPart:function(s){
		s  = "<p>This is the end of this part of the Listening section.</p>";
		s += "<p>Click on <strong>Continue</strong> to go on.</p>";
		s += "<p>Once you leave this section and continue to the next,you WILL NOT be able to return to it.</p>";
		return s;
	},
	writingEndDirections:function(s){
		s  = "<p>This is the end of the Writing section.</p>";
		s += "<p>Click on <strong>Continue</strong> to proceed.</p>";
		s += "<p>Once you leave this section and proceed to the next,you WILL NOT be able to return to it.</p>";
		return s;
	},
	speakingEndDirections:function(s){
		s  = "<p>This is the end of the Speaking section.</p>";
		s += "<p>Click on <strong>Continue</strong> to proceed.</p>";
		s += "<p>Once you leave this section and proceed to the next,you WILL NOT be able to return to it.</p>";
		return s;
	},
	getEndDirections:function(){
		if(paper.isReading) return paper.common.readingEndDirections();
		else if(paper.isListening) return paper.common.listeningEndDirections();
		else if(paper.isWriting) return paper.common.writingEndDirections();
		else if(paper.isSpeaking) return paper.common.speakingEndDirections();
		else return "Unknown";
	},
	getBreakDirections:function(s){
		s  = "<p>You may now take a break.</p>";
		s += "<p>If you do not wish to take a break, click on <strong>Proceed</strong> to continue.</p>";
		return s;
	},
	getTestOverDirections:function(s){
		s  = "<p>Congratulations!</p>";
		s += "<p>You have completed the test. Click on <strong>Close</strong> to end test.</p>";
		return s;
	},
	getSkillTitle:function(){
		if(paper.isReading) return "Reading";
		else if(paper.isListening) return "Listening";
		else if(paper.isWriting) return "Writing";
		else if(paper.isSpeaking) return "Speaking";
		else return "Unknown";
	},
	getReqUrlOfEndSection:function(){
		if(paper.mode.test){
			return "test.do?method=start&paperId="+paper.data.id;
		}else if(paper.mode.preview){
			return "paper.do?method=preview&paperId="+paper.data.id+"&skillType="+paper.common.getNextSkill();
		}else if(paper.mode.view){
			return "test.do?method=view&paperId="+paper.data.id;
		}else{
			return "";
		}
	},
	getReadingScrollDirections:function(){
		var s = "<p>You should use the scroll bar to read the whole passage before you begin to answer the questions.</p>";
		s += "<p>The passage will appear again with each question.</p>";
		return s;
	},
	getMustAnswerDirections:function(){
		var s = "<p>You must answer this question before moving to the next question.</p>";
		return s;
	},
	getMustAnswerDirections2:function(){
		var s = "<p>You must select the EXACT number of choices before you can leave this question.</p>";
		return s;
	},
	getNextSkill:function(){
		if(paper.isReading) return paper.Skill.listening;
		else if(paper.isListening) return paper.Skill.speaking;
		else if(paper.isSpeaking) return paper.Skill.writing;
	},
	countWord:function(s){
		if(!s) return 0;
		if(s.trim().length==0) return 0;
		var exp = /^[^A-Za-z0-9]+/gi;
		var exp2 = /[^A-Za-z0-9]+/gi;
		var str = s.trim()+" ";
		str = str.replace(exp,"");
		str = str.replace(exp2," ");
		return str.split(" ").length-1;
	},
	getMMtop:function(){
		return paper.mm.getCoordinates().top;
	},
	getMMLleft:function(){
		return paper.mml.getCoordinates().right;
	},
	setSubmitBar:function(){
//		var div = $("btooldiv");
//		if(!div) div = new Element("div",{'id':'btooldiv'}).inject(document.body);
//		var btn = new Element("input",{'type':'button','id':'submitbar','value':'END','class':'becbtn'}).inject(div);
//		btn.addEvent('click',function(){
//			paper.action.end();
//		});
		var part = $$(".fpart").getLast();
		if(part){
			var fpart = new Element("div",{'class':'fpart'}).inject(part,'after');
			var fitem = new Element("div",{'class':'fitem'}).inject(fpart);
			var fnav = new Element("div",{'class':'fnav'}).inject(fitem);
			var span = new Element("span",{'id':'endBtn','class':'nowide'}).inject(fnav).set('text','End');
			span.onmouseover = function(){
				this.setStyle('backgroundColor','#fff');
				this.setStyle('color','#000');
			}
			span.onmouseout = function(){
				this.setStyle('backgroundColor','');
				this.setStyle('color','');
			}
			span.addEvent('click',function(){
				paper.action.end();
			});
		}
	},
	setScoreBar:function(){
		var div = $("btooldiv");
		if(!div) div = new Element("div",{'id':'btooldiv'}).inject(document.body);
		var btn = new Element("input",{'type':'button','id':'socrebar','value':'Scores','class':'becbtn'}).inject(div);
		btn.addEvent('click',function(){
			var a = paper.model.getScore();
		});
	},
	setExitBar:function(){
		var div = $("btooldiv");
		if(!div) div = new Element("div",{'id':'btooldiv'}).inject(document.body);
		var btn = new Element("input",{'type':'button','id':'socrebar','value':'Exit','class':'becbtn'}).inject(div);
		btn.addEvent('click',function(){
			location.href = "?method=viewInit&paperId="+paper.data.id+($("userId")?"&userId="+$("userId").value:"");
		});
	},
	setBackBar:function(){
		if(paper.initNo && paper.initNo.value>0){
			return;
		};
		var div = $("btooldiv");
		if(!div) div = new Element("div",{'id':'btooldiv'}).inject(document.body);
		var btn = new Element("input",{'type':'button','id':'socrebar','value':'Back','class':'becbtn'}).inject(div);
		btn.addEvent('click',function(){
			history.back();
		});
	}
};
//widget tools
paper.widget = {
	checker:{//Session checker like BXSSessionChecker.satrt();
		interval: 5,//minutes
		connectUrl:"../user/sessionChecker.do?method=req",//request action
		intervaling: function(){return paper.widget.checker.interval*60*1000;},
		init:function(intervalTime){
			//window.setTimeout(function(){
				paper.widget.checker.title = window.document.title;
				if(intervalTime) paper.widget.checker.interval = intervalTime;
				window.document.title =paper.widget.checker.title+ ".";
				paper.widget.checker.start();
			//},paper.widget.checker.intervaling())
		},
		start:function(){
			paper.widget.checker.timerId = window.setInterval(function(){
				paper.widget.checker.set();
			},paper.widget.checker.intervaling());
		},
		set:function(){
			paper.widget.checker.req = new Request({
				method: 'get', 
				url: paper.widget.checker.connectUrl+paper.widget.checker.getData(),
				onSuccess:function(res){
					if(res=="1"){
						paper.debug("paper.widget.checker.init()>ok"+res);
						window.document.title = paper.widget.checker.title;
						//paper.widget.xlogin.clear();
					}else{
						paper.debug("paper.widget.checker.init()>relogin"+res);
						window.document.title = paper.widget.checker.title+ "..";
						paper.widget.xlogin.init();
					}
				},
				onFailure:function(req){
					paper.debug("paper.widget.checker.init()>fail");
					window.document.title = paper.widget.checker.title+ "...";
					paper.widget.xlogin.init();
				}
			}).send();
		},
		clear:function(){
			window.clearInterval(paper.widget.checker.timerId);
		},
		getData:function(){
			return "&t="+new Date().getTime();
		}
	},
	xlogin:{
		connectUrl:"../user/sessionChecker.do?method=xlogin",//request action
		init:function(){
			var xloginbox = $("xloginbox");
			if(!xloginbox){
				xloginbox = new Element("div",{"id":"xloginbox"}).inject(document.body);
				var xloginhtml = "";
				xloginhtml += "<div class='h3'>提示</div>";
				xloginhtml += "<div class='msg'>"+"网络中断，当前窗口不能关闭，请等待恢复。<br/>网络恢复后请输入账号和密码重新登录，考试将继续！"+"</div>";
				xloginhtml += "<div class='clogin'>";
				xloginhtml += "<p><label>账号:</label>"+"<input type='text' id='xloginname' name='xloginname'/></p>";
				xloginhtml += "<p><label>密码:</label>"+"<input type='password' id='xloginpassword' name='xloginpassword'/></p>";
				xloginhtml +="</div>";
				xloginhtml +="<div class='action'><input type='button' onclick='paper.widget.xlogin.login()' value='登录'/></div>";
				xloginbox.set("html",xloginhtml);			}
			paper.widget.xlogin.setMask();
			paper.widget.xlogin.center();
			paper.timer.main.pause();
		},
		center:function(){
			var ws = $(window).getSize();
			var scrolly = $(window).getScroll().y;
			if(!scrolly) scrolly = 0;
			var topH = (ws.y/2)-175+scrolly;
			if(topH<=0) topH = 30;
			$("xloginbox").setStyle("display","block");
			$("xloginbox").setStyle("top",topH);
			$("xloginbox").setStyle("left",(ws.x/2)-250);
		},
		login:function(){
			var xname = $("xloginname");
			var xpassword = $("xloginpassword");
			if(xname && xname.value.trim().length==0){
				alert("请输入您账号或用户名！");
				xname.focus();
				return false;
			}
			if(xpassword && xpassword.value.length==0){
				alert("请输入您的密码！");
				xpassword.focus();
				return false;
			}
			var vdata = "&xloginname="+xname.value.trim()+"&xloginpassword="+xpassword.value;
			paper.widget.xlogin.xreq = new Request({
				method: 'post', 
				url: paper.widget.xlogin.connectUrl,
				data: vdata,
				onSuccess:function(res){
					if(res=="1"){
						paper.widget.xlogin.clear();
					}else if(res=='0'){
						alert("用户名或密码不正确，请重试！");
						//paper.widget.xlogin.init();
					}
				},
				onFailure:function(req){
					alert("网络中断，请稍后再试！");
					//paper.widget.xlogin.init();
				}
			}).send();
		},
		setMask:function(msg){
			var mask = $("genMask");
			if(!mask){
				mask = new Element("div",{"id":"genMask"}).inject($(document.body));
			}
			var ww = $(window).getSize().x;
			var wh = $(window).getSize().y;
			mask.setStyle("display","block");
			mask.setStyle("width",ww);
			mask.setStyle("height",ww);
			
			if(msg){
				new Element("p").inject(mask).set("html",msg);
			}
		},
		clear:function(){
			var xloginbox = $("xloginbox");
			var mask = $("genMask")
			
			if(mask){
				mask.setStyle("display","none");
				mask.destroy();
			}
			if(xloginbox){
				xloginbox.setStyle("display","none");
				xloginbox.destroy();
				paper.timer.main.resume();
			}
		}
	},
	xwiner:{
		items:[],
		init:function(id,title,content,pars){
			var xwin = $("xwiner_"+id);
			var max = paper.widget.xwiner.items.length;
			if(!xwin){
				xwin = new Element("div",{'id':'xwiner_'+id,'class':'xwiner'}).inject(document.body);
				xwin.setStyle('z-index',(99+max));
				var coord = null;
				if(max>0){
					coord = paper.widget.xwiner.items.getLast().getCoordinates();
					xwin.setStyle('top',(coord.top+50));
					xwin.setStyle('left',coord.left+50);
				}
				paper.widget.xwiner.items.push(xwin);
				xwin.addEvent("mousedown",function(){paper.widget.xwiner.zindex(this);})
				var inner = new Element("div",{'class':'inner'}).inject(xwin);
				var handler = new Element("div",{'class':'handler'}).inject(inner);
				var innerwrap = Element("div",{'class':'innerwrap'}).inject(inner);
				var innerwrite = Element("div",{'class':'innerwrite'}).inject(innerwrap);
				
				if(pars){
					if(pars.w) xwin.setStyle("width",pars.w);
					if(pars.h) innerwrap.setStyle("height",pars.h)
				}
				
				var titer = new Element("div",{'class':'titler'}).inject(handler).set('html',title);
				var closer = new Element("div",{'class':'closer'}).inject(handler);
				new Element("img",{'border':'0','src':'../images/close.gif'}).inject(closer);
				closer.xwin = xwin;
				closer.addEvent("click",function(){
					var dis = this.xwin.getStyle("display");
					this.xwin.setStyle("display",(dis=="none"?"block":"none"))
				});
				
				innerwrite.set('html',content)
				
				xwin.makeDraggable({
					container:document.body,
					handle:handler
				});
			}else{
				//var dis = xwin.getStyle("display");
				xwin.setStyle("display","block");
			}
			paper.widget.xwiner.zindex(xwin);
		},
		zindex:function(obj){
			//alert(obj.id);
			paper.widget.xwiner.items.each(function(x){
				var zi = x.getStyle('z-index');
				if(!zi) zi = 99;
				x.setStyle('z-index',(x==obj?(99+paper.widget.xwiner.items.length):(zi-1)));
			});
		},
		hideAll:function(){
			paper.widget.xwiner.items.each(function(x){
				if(x) x.setStyle('display','none');
			});
		}
	},
	xalert:{
		init1:function(title,content,btntext){
			var xawin = $("xalertx1");
			if(!xawin){
				xawin = new Element("div",{'id':'xalertx1','class':'xalert'}).inject(document.body);
			}
			xawin.set("html","");
			new Element("h5",{"id":"xalerth5"}).inject(xawin).set("html",(title?title:"More Directions"));
			new Element("div",{"id":"xalerp"}).inject(xawin).set("html",content);
			var btndiv = new Element("div",{"id":"xalertbtndiv"}).inject(xawin);
			var btn = new Element("input",{"type":"button","id":"xalertbtn","value":(btntext?btntext:"Return to question")}).inject(btndiv);
			btn.onclick = function(){
				paper.widget.xalert.hide();
			}
			xawin.setStyle("display","block");
			paper.widget.xalert.setLocation();
		},
		init:function(title,content,btn){
			var xawin = $("xalertx1");
			if(!xawin){
				xawin = new Element("div",{'id':'xalertx1','class':'xalert'}).inject(document.body);
			}
			xawin.set("html","");
			new Element("h5",{"id":"xalerth5"}).inject(xawin).set("html",(title?title:"More Directions"));
			new Element("div",{"id":"xalerp"}).inject(xawin).set("html",content);
			var btndiv = new Element("div",{"id":"xalertbtndiv"}).inject(xawin);
			if(btn.okbtn){
				var okbtns = new Element("input",{"type":"button","id":"xalertokbtn","value":btn.okbtn}).inject(btndiv);
				okbtns.onclick = function(){
					paper.widget.xalert.hide();
					if(btn.okfunc) btn.okfunc.call();
				}
			}
			if(btn.okbtnclass){
				var okbtns = new Element("input",{"type":"button","class":btn.okbtnclass,"id":"xalertokbtn"}).inject(btndiv);
				okbtns.onclick = function(){
					paper.widget.xalert.hide();
					if(btn.okfunc) btn.okfunc.call();
				}
			}
			if(btn.nobtn){
				var nobtns = new Element("input",{"type":"button","id":"xalertcanselbtn","value":btn.nobtn}).inject(btndiv);
				nobtns.onclick = function(){
					paper.widget.xalert.hide();
				}
			}
			xawin.setStyle("display","block");
			paper.widget.xalert.setLocation();
		},
		hide:function(){
			var xawin = $("xalertx1");
			if(xawin){
				xawin.setStyle("display","none");
			}
		},
		setLocation:function(){
			try {
				var xawin = $("xalertx1");
				var tops = $(window).getSize().y/2-100;
				var left = $(window).getSize().x/2-225;
				xawin.setStyle("left",left);
				xawin.setStyle("top",tops);
			} catch (e) {}
		}
	},
	setAlertWindow:function(type,title,content){
		paper.mt.setStyle("display","none");
		paper.mtw.empty();
		paper.layout.setSize();
		paper.mmlmw.empty();
		paper.layout.setStyle({cols:1});
		paper.show.hideButton();
		
		var warnboxwide = new Element("div",{'class':'warnboxwide'}).inject(paper.mmlmw);
		var warnbox = new Element("div",{'class':'warnbox'}).inject(warnboxwide);
		var warntitle = new Element("div",{'class':'warntitle'}).inject(warnbox).set(title);
		var warnw = new Element("div",{'class':'warnw'}).inject(warnbox).set('html',content);
		var warnfoot = new Element("div",{'class':'warnfoot'}).inject(warnw);
		var returnBtn = new Element("input",{'type':'button','value':'Return'}).inject(warnfoot).addEvent("click",function(){
			paper.show.init(paper.bakno)
		});
		
	},
	trim:function(str){
		if(!str) return str;
		str = str.trim();
		str = str.replace("","");
		str = str.replace("","");
		return str;
	},
	jsHtml:function(val){
		var s = "";
        if(!val || val.length == 0) return "";   
//        s = val.replace(/&/g,"&gt;");   
//        s = s.replace(/</g,"&lt;");   
//        s = s.replace(/>/g,"&gt;");   
//        s = s.replace(/ /g,"&nbsp;");   
//        s = s.replace(/\'/g,"&#39;");   
//        s = s.replace(/\"/g,"&quot;");   
//        s = s.replace(/\n/g,"<br/>");   
        s = val.replace(/\n/g,"<br/>"); 
        return s;  
	},
	filterVDir:function(content){
//		if(!paper.iServerDir){
//			return content.replace(/\/t\/file_upload\//g,"/file_upload/");
//		}else{
//			return content.replace(/"\/file_upload\//g,"\"/t/file_upload/");
//		}
		content = content.replace(/"\/t\/file_upload\//g,"\"../file_upload/");
		content = content.replace(/"\/file_upload\//g,"\"../file_upload/");
		return content;
	},
	getEarPhoneImg:function(str){
		if(!str || str.trim().length==0) return "";
		if(str.indexOf("say this")>0 
			|| str.indexOf("says this")>0
			|| str.indexOf("he says")>0
			|| str.indexOf("she says")>0
			|| str.indexOf("ask this")>0
		){
			return "<img src='images/toefl_earphone.gif'/>";
		}
		return "";
	},
	flash:{
		url:"http://get.adobe.com/flashplayer/",
		check:function(){
			var hasFlash = 0;
			var flashVersion = 0;
			//paper.debug("##: "+Browser.name);
			//paper.debug("##trident: "+Browser.Engine.trident);
			//paper.debug("##webkit: "+Browser.Engine.webkit);
			//paper.debug("##gecko: "+Browser.Engine.gecko);
			try {
				if(Browser.Engine.trident){//ie
					var swf = new ActiveXObject('ShockwaveFlash.ShockwaveFlash'); 
					if(swf){
						hasFlash=1;
						VSwf=swf.GetVariable("$version");
						flashVersion=parseInt(VSwf.split(" ")[1].split(",")[0]); 
					}
				}else{
					if(navigator.plugins && navigator.plugins.length>0){
						for (var ii=0;ii<navigator.plugins.length;ii++){
							if (navigator.plugins[ii].name.indexOf('Shockwave Flash')!=-1){
								//paper.debug("navigator.plugins[ii].description: "+navigator.plugins[ii].description);
								hasFlash=1;
								flashVersion=navigator.plugins[ii].description.split('Shockwave Flash ')[1];
						　　		break;
							}
						}
					}
				}
			} catch (e) {}
			return {f:hasFlash,v:flashVersion};
		}
	},
	bans:{
		init:function(){
			if(paper.debug.ref.bans) return;
			try {
				window.document.body.oncontextmenu = function(){return false;}
				window.document.body.onselectstart = function(){return false;}
				//window.document.body.onmouseup = function(){return false;}
				window.document.body.ondragstart = function(){return false;}
				window.document.body.onbeforecopy = function(){return false;}
				window.document.body.oncopy = function(){document.selection.empty();}
				window.document.body.onselect = function(){document.selection.empty();}
				
				window.onhelp = function(){return false;}
				document.oncontextmenu = function(){return false;}
				document.onkeydown = function(e){
					var ev = window.event || e;
					var code = ev.keyCode || ev.which;
					var activeObj = document.activeElement;
					if((event.keyCode==8) || (event.keyCode==116) || (event.ctrlKey  &&  event.keyCode==82)){
						if(activeObj && activeObj.tagName.toUpperCase()=="INPUT" || activeObj.tagName.toUpperCase()=="TEXTAREA"){
							
						}else{
							ev.keyCode ? ev.keyCode = 0 : ev.which = 0;
							event.returnValue = false;
							cancelBubble = true;
							return false;
						}
					}
					 if((window.event.altKey) && ((window.event.keyCode==37) || (window.event.keyCode==39))){
						 event.returnValue=false;
						 return false;
					 }
					
				}
				
			} catch (e) {}
		}
	}
}
//技能
paper.Skill = {reading:1,writing:2,listening:3,speaking:4};
//题型对象
paper.QT = {ydxz:1,jztk:2,ydpp:3,tlxz:4,tlpx:5,tlpp:6,xz:7,ky:8,tltpxz:9,tldztpxz:10,tlfl:11};

paper.RS = {//回答问题状态 responseStatus -> rs
	notyetseen:{id:0,wo:"Not Seen"},
	answered:{id:1,wo:"Answered"},
	notanswered:{id:2,wo:"Not Answered"},
	correct:{id:3,wo:"Correct"},
	incorrect:{id:4,wo:"Incorrect"},
	partiallycorrect:{id:5,wo:"Partially Correct"},
	get:function(id){
		switch (id) {
			case 0:return paper.RS.notyetseen.wo;
			case 1:return paper.RS.answered.wo;
			case 2:return paper.RS.notanswered.wo;
			case 3:return paper.RS.correct.wo;
			case 4:return paper.RS.incorrect.wo;
			case 5:return paper.RS.partiallycorrect.wo;
			default:return "Unknown";
		}

	}
}
//score and scaled
paper.scores = {
	reading:{S45:30,S44:29,S43:29,S42:28,S41:27,S40:26,S39:25,S38:24,S37:23,S36:22,S35:21,S34:20,S33:19,S32:18,S31:17,S30:16,S29:16,S28:15,S27:14,S26:13,S25:12,S24:11,S23:10,S22:9,S21:8,S20:8,S19:7,S18:7,S17:6,S16:6,S15:5,S14:5,S13:4,S12:4,S11:3,S10:3,S9:2,S8:2,S7:1,S6:1,S5:0,S4:0,S3:0,S2:0,S1:0,S0:0},
	listening:{S34:30,S33:29,S32:27,S31:26,S30:25,S29:24,S28:23,S27:22,S26:21,S25:19,S24:17,S23:16,S22:15,S21:15,S20:14,S19:13,S18:11,S17:9,S16:8,S15:8,S14:7,S13:6,S12:5,S11:4,S10:4,S9:3,S8:3,S7:2,S6:2,S5:1,S4:0,S3:0,S2:0,S1:0,S0:0},
	R45:{S45:30,S44:30,S43:29,S42:29,S41:29,S40:28,S39:28,S38:27,S37:27,S36:26,S35:26,S34:25,S33:24,S32:23,S31:23,S30:22,S29:21,S28:20,S27:19,S26:18,S25:17,S24:16,S23:15,S22:14,S21:13,S20:12,S19:11,S18:9,S17:8,S16:7,S15:6,S14:5,S13:4,S12:3,S11:2,S10:1,S9:0,S8:0,S7:0,S6:0,S5:0,S4:0,S3:0,S2:0,S1:0,S0:0},
	R43:{S43:30,S42:30,S41:29,S40:29,S39:29,S38:28,S37:28,S36:27,S35:27,S34:26,S33:25,S32:24,S31:24,S30:23,S29:22,S28:22,S27:21,S26:20,S25:20,S24:19,S23:18,S22:18,S21:17,S20:16,S19:15,S18:14,S17:13,S16:12,S15:11,S14:10,S13:9,S12:8,S11:7,S10:6,S9:5,S8:4,S7:3,S6:2,S5:1,S4:0,S3:0,S2:0,S1:0,S0:0},
	R42:{S42:30,S41:30,S40:29,S39:29,S38:28,S37:28,S36:27,S35:27,S34:26,S33:25,S32:24,S31:24,S30:23,S29:22,S28:22,S27:21,S26:20,S25:20,S24:19,S23:18,S22:18,S21:17,S20:16,S19:15,S18:14,S17:13,S16:12,S15:11,S14:10,S13:9,S12:8,S11:7,S10:6,S9:5,S8:4,S7:3,S6:2,S5:1,S4:0,S3:0,S2:0,S1:0,S0:0},
	L36:{S36:30,S35:29,S34:28,S33:28,S32:27,S31:26,S30:25,S29:25,S28:24,S27:23,S26:22,S25:21,S24:20,S23:19,S22:18,S21:17,S20:16,S19:15,S18:14,S17:13,S16:12,S15:12,S14:11,S13:10,S12:9,S11:8,S10:7,S9:6,S8:5,S7:4,S6:3,S5:2,S4:1,S3:0,S2:0,S1:0,S0:0},
	L35:{S35:30,S34:29,S33:28,S32:27,S31:26,S30:25,S29:25,S28:24,S27:23,S26:22,S25:21,S24:20,S23:19,S22:18,S21:17,S20:16,S19:15,S18:14,S17:13,S16:12,S15:12,S14:11,S13:10,S12:9,S11:8,S10:7,S9:6,S8:5,S7:4,S6:3,S5:2,S4:1,S3:0,S2:0,S1:0,S0:0},
	L34:{S34:30,S33:29,S32:29,S31:28,S30:27,S29:26,S28:25,S27:23,S26:22,S25:21,S24:19,S23:18,S22:17,S21:15,S20:14,S19:13,S18:11,S17:10,S16:9,S15:8,S14:7,S13:6,S12:5,S11:4,S10:4,S9:3,S8:3,S7:2,S6:2,S5:1,S4:0,S3:0,S2:0,S1:0,S0:0},
	L33:{S33:30,S32:29,S31:28,S30:27,S29:26,S28:25,S27:23,S26:22,S25:21,S24:19,S23:18,S22:17,S21:15,S20:14,S19:13,S18:11,S17:10,S16:9,S15:8,S14:7,S13:6,S12:5,S11:4,S10:4,S9:3,S8:3,S7:2,S6:2,S5:1,S4:0,S3:0,S2:0,S1:0,S0:0},
	srange:[{a:98.3,b:100,c:30},{a:95,b:98.2,c:29},{a:91.7,b:94.9,c:28},{a:88.3,b:91.6,c:27},{a:85,b:88.2,c:26},{a:81.7,b:84.92,c:25},{a:78.3,b:81.62,c:24},{a:75,b:78.2,c:23},{a:71.7,b:74.9,c:22},{a:68.3,b:71.62,c:21},{a:65,b:68.2,c:20},{a:61.7,b:64.92,c:19},{a:58.3,b:61.6,c:18},{a:55,b:58.2,c:17},{a:51.7,b:54.9,c:16},{a:48.3,b:51.6,c:15},{a:45,b:48.2,c:14},{a:41.7,b:44.9,c:13},{a:38.3,b:41.62,c:12},{a:35,b:38.2,c:11},{a:31.7,b:34.9,c:10},{a:28.3,b:31.62,c:9},{a:25,b:28.2,c:8},{a:21.7,b:24.9,c:7},{a:18.3,b:21.6,c:6},{a:15,b:18.2,c:5},{a:11.7,b:14.9,c:4},{a:8.3,b:11.6,c:3},{a:5,b:8.2,c:2},{a:2.7,b:4.9,c:1},{a:0,b:2.6,c:0}],
	get:function(score){
		score = parseInt(score);
		if(paper.isReading) return paper.scores.reading["S"+score];
		else if(paper.isListening) return paper.scores.listening["S"+score];
		else return 0;
	},
	getScore:function(score,tscore){
		if(!score || !tscore) return 0;
		//paper.debug("##paper.scores.getScore("+score+","+tscore+")");
		if(score>tscore){
			score = tscore;
		}
		if(paper.isReading){
			if(tscore>=44 && tscore<=45){return paper.scores.R45["S"+score];}
			else if(tscore==43){return paper.scores.R43["S"+score];}
			else if(tscore>=41 && tscore<=42){return paper.scores.R42["S"+score];}
			else{return paper.scores.reading["S"+score]}
			
		}else if(paper.isListening){
			if(tscore==36){return paper.scores.L36["S"+score];}
			else if(tscore==35){return paper.scores.L35["S"+score];}
			else if(tscore==34){return paper.scores.L34["S"+score];}
			else if(tscore==33){return paper.scores.L33["S"+score];}
			else{return paper.scores.listening["S"+score];}
		}else{
			return 0;
		}
	},
	getPercent:function(rpf){
		if(!rpf || rpf<0) return 0;
		if(rpf>100) return 30;
		var scores = 0;
		paper.scores.srange.each(function(s){
			if(rpf>=s.a && rpf<=s.b){
				scores = s.c;
			}
		});
		return scores;
	},
	getLevel:function(score){
		if(paper.isReading || paper.isListening){
			if(score>=0 && score<=14) return "L1";//"Low";
			else if(score>=15 && score<=21) return "L2";// "Intermediate";
			else if(score>=22 && score<=30) return "L3";// "Hight";
		}else if(paper.isSpeaking){
			if(score>=0 && score<=9) return "S1";// "Weak";
			else if(score>=10 && score<=17) return "S2";// "Limited";
			else if(score>=18 && score<=25) return "S3";// "Fair";
			else if(score>=26 && score<=30) return "S4";// "Good";
		}else if(paper.isWriting){
			if(score>=0 && score<=16) return "W1";// "Limited";
			else if(score>=17 && score<=23) return "W2";// "Fair";
			else if(score>=24 && score<=30) return "W3";// "Good";
		}else{
			return "0";//Unknown Level"
		}
	}
}

//debug
paper.debug = function(s){
	if(!paper.debug.ref.show) return;
	if(!paper.debug.ref.el) paper.debug.ref.init();
	paper.debug.ref.el.setStyle('display','');
	paper.debug.ref.w.set("html","<div style='margin-bottom:5px;font-size:12px;'>"+s+"</div>"+paper.debug.ref.w.get("html"));
}
paper.debug.ref = {
	el:null,
	show:0,
	bans:0,
	micui:0,
	init:function(){
		if(!paper.el){
			paper.debug.ref.el = new Element("div",{id:"debugDiv"});
			paper.debug.ref.el.inject(document.body);
			
			paper.debug.ref.hand = new Element("div",{'class':'handle'}).inject(paper.debug.ref.el);
			new Element("span").inject(paper.debug.ref.hand)
			.set('text','[Clean] ').addEvent("click",function(){
				paper.debug.ref.w.set('html','');
			});
			
			var input = new Element("input").inject(paper.debug.ref.hand);
			input.ondblclick = function(){eval(this.value)};
			input.setStyle("width","260px");
			
			new Element("span").inject(paper.debug.ref.hand)
			.set('text','[Close] ').addEvent("click",function(){
				paper.debug.ref.el.setStyle('display','none');
			});
			
			paper.debug.ref.w = new Element("div",{'class':'w'}).inject(paper.debug.ref.el);
			
			
			paper.debug.ref.el.makeDraggable({
				container:document.body,
				handle:paper.debug.ref.hand
			});
			//paper.debug.ref.el.setStyle("opacity",0.5);
		}
	}
}

window.onbeforeunload = function(e){
	//e = e || window.event;
	if(paper.mode.test && !paper.mode.completed){
		try {
			if(!paper.model.refreshSubmit){
				e.returnValue = "考试期间不能离开界面，请选择“留在此页” 或 “不重新加载”，否则将不能保存成绩！";
			}
		} catch (e) {
			
		}
	}
};

window.onunload = function(e){
	if(paper.mode.test && !paper.mode.completed){
		paper.action.autoSave();
	}
}

window.addEvent("resize",function(){
	paper.layout.setSize();
});
//window.addEvent("load",function(){
//	paper.widget.checker.init();
//	//paper.widget.bans.init();
//});
//window.document.onkeydown = function(event){
////	if(paper.data.skill==paper.Skill.reading){
//		e = event || window.event;
//		//paper.debug(e.keyCode);
//		if(e.ctrlKey && e.keyCode==49){
//			paper.media.clearTimer();
//			paper.timer.main.clear();
//			paper.show.back();
//		}else if(e.ctrlKey && e.keyCode==50){
//			paper.media.clearTimer();
//			paper.timer.main.clear();
//			paper.show.next();
//		}
////	}
//}
function end(){
	paper.recorder.testOk();
}
function recordLevelSet(flag){
	paper.recorder.recordLevelSet(flag);
}
function initFlexParamCallback(val){
	paper.recorder.recordLevelSetNew(val);
}
var iCheckInitCount = 0;
var iCheckInitTimer = window.setInterval(function(){
	iCheckInitCount++;
	paper.debug("iCheckInitTimer:"+iCheckInitCount+","+paper.media.smLoaded);
	if(iCheckInitCount>35 && !paper.media.smLoaded){
		window.clearInterval(iCheckInitTimer);
		paper.widget.xalert.init("浏览器兼容提示","<p style=\"padding:10px 5px;text-align:center;\">当前浏览器不能完全支持托福模考，请更换以下浏览器登录：<br/>IE7、IE8、IE9、火狐、谷歌浏览器。</p>",{okbtn:"Close",okfunc:function(){window.close();}});
	}else if(paper.media.smLoaded){
		window.clearInterval(iCheckInitTimer);
		paper.debug("window.clearInterval.iCheckInitTimer:");
	}
},1000);





