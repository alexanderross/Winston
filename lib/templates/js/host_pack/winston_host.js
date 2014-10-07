//Engine / extension file
var wayneStarted=false;
var lastRecieved=null;
var actions = new Array();
var undidactions= new Array();


var outputVerbage="CAPY";
localStorage["winston_version_number"]="0.6.30";
loadDefaults();


function eventWrapper(trigger, wrapper_id){

}

function getStorageUsed(){
	return ((localStorage["winston_saved"].length / 2500000)*100).toFixed(2);
}

function addToSavedCaps(){
	today = new Date();
	storedData=JSON.parse(localStorage["winston_saved"]);
	storedData.push({"date":(today.getFullYear()+ "/" + today.getMonth() + 1 + "/" + today.getDate()),"time":(today.getHours()+":"+today.getMinutes()),"data":actions});
	localStorage["winston_saved"]=JSON.stringify(storedData);
	
}

function start(){
	actions = new Array();
	chrome.contextMenus.create({title: "Assert Element Count", contexts:["page"],id:"wayne--elct", onclick: function(info, tab) {
    	sendMessage({swag:"Select"});
	}});

	chrome.contextMenus.create({title: "Assert Selection Exists", contexts:["selection"],id:"wayne--selex", onclick: function(info, tab) {
	    	addEvent(translateEvent({action:"AssertText",target:info.selectionText}));
	    	updateNode();
	}});
	wayneStarted=true;

}

function stop(){
	wayneStarted=false;
	copyToClipboard();
	if(actions.length == 0){
		alert("Terminated an empty capture.. wow..");
	}else{
		alert(actions.length+" Test items copied to clipboard."+((localStorage["winston_do_saved"]=="y")?"Save storage "+getStorageUsed()+"% full.":""));
	}
	chrome.contextMenus.remove("wayne--elct");
	chrome.contextMenus.remove("wayne--selex");
}

function updateNode(){
	localStorage["winston_required"]=localStorage["winston_required"].replace(/ /g,"");
	console.log("Updated Node.");
	sendMessage({swag:"update",stat:((wayneStarted)? "Running" : "Stopped"),update:getLastMsg(),count:actions.length,recount:undidactions.length,position:localStorage["winston_position"],allow_index:localStorage["winston_index_behaviour"],selectors:localStorage["winston_required"],bad_selectors:localStorage["winston_deny"],labelclicks:localStorage["winston_allow_label_click"]});
}

function isRepeat(msg){
	if(lastRecieved){
		if(msg==lastRecieved){
			return true;
		}
	}
	return false;
}

function msgToEnglish(msg){
	return msg.action+" -> "+msg.target;
}

function getLastMsg(){
	if(actions.length > 0){
		if(localStorage["winston_technical"]==1){
			return actions[actions.length-1][1];
		}else{
			return actions[actions.length-1][0];
		}
	}
}

function fetchTemplate(name){
  return document.getElementById("template_"+name).innerHTML;
}

function getTemplates(){
	return {
		"main": fetchTemplate("main"), 
        "expander": fetchTemplate("expander"),
        "expander_attr": fetchTemplate("expander_attr"),
        "expander_attr_comp": fetchTemplate("expander_attr_comp")
	}
}

function getSettingsHash(){
	return {
		swag: "settings",
		templates: getTemplates(),
		is_started: wayneStarted
	}
}

function addEvent(processedEvent){
	if(processedEvent){
		if(processedEvent!=""){
			actions.push(processedEvent);
			undidactions= new Array();
		}
	}
}

function addRedoEvent(){
	redoEvent=undidactions.pop();
	if(redoEvent){
		if(redoEvent!=""){
			actions.push(redoEvent);
			lastRecieved=redoEvent;
		}
	}
}


chrome.extension.onMessage.addListener(function(msg,sender, sendResponse) {
	console.log("Host rcv - "+msg.action+"-"+msg.target);
	if(msg.action == "Winston"){
		if(msg.target == "load_templates"){
			sendMessage(getSettingsHash());
			return;
		}else{
			updateNode();
		}
	}
	if(msg.action=="Wayne"){
		if(msg.target=="setevents"){
			actions = msg.values;
		}
		if(msg.target=="undo"){
			if(actions.length>0){
				undidactions.push(actions.pop());
				lastRecieved=actions[actions.length-1];
			}
		}else if(msg.target=="redo"){
			addRedoEvent();
		}else if(msg.target=="kill"){
			wayneStarted=false;
			sendMessage({swag:"Stop"});
			stop();
		}
	}else if(wayneStarted){
		if(msg.action == "Options"){//Should reload active client
			updateNode();
		}
		processed=translateEvent(msg);
	  	if(!isRepeat(processed) && processed!=""){
	  		lastRecieved=processed;
	    	addEvent(processed);
	    }
	}
	updateNode();
});


chrome.browserAction.onClicked.addListener(function(tab) { inject();});

function translateEvent(msg){
	keyword=localStorage["winston_selector"];
	if(outputVerbage=="CAPY"){
		if(msg.action=="Visit"){
			return ["Visit Page","visit(\""+msg.target+"\")"];
		}else if(msg.action=="HTMLClick"){
			return ["Click on \""+msg.target.trim()+"\"","click_link(\""+msg.target.trim()+"\")"];
		}else if(msg.action=="AssertText"){
			return ["Page has \""+msg.target+"\"?","assert page.has_content?(\""+msg.target+"\")"];
		}else if(msg.action=="FieldBlur"){
			return ["Fill in "+msg.target+" with \""+ msg.value+"\"","fill_in(\""+msg.target+"\", :with => \""+msg.value+"\")"];
		}else if(msg.action=="FileUpload"){
			return ["Attach File","attach_file(\""+msg.target+"\", \""+msg.value+"\")"];
		}else if(msg.action=="CheckboxCheck"){
			return ["Check \""+msg.target+"\"","check(\""+msg.target+"\")"];
		}else if(msg.action=="CheckboxUnCheck"){
			return ["Uncheck \""+msg.target+"\"","uncheck(\""+msg.target+"\")"];
		}else if(msg.action=="SelectChange"){
			return ["Select \""+msg.value+"\" from "+msg.target,"select(\""+msg.value+"\", :from => \""+msg.target+"\")"];
		}else if(msg.action=="SubmitClick"){
			return ["Click on \""+msg.value+"\" button","click_button(\""+msg.value+"\")"];
		}else{
			msg.target=translateSelector(msg.target);
			if(msg.action=="AssertText"){
				return ["Assert \""+msg.target+"\" on page","assert page.has_content?(\""+msg.target+"\")"];
			}else if(msg.action=="AssertUrl"){
				//Why?
			}else if(msg.action=="AssertCount"){
				return ["Assert "+msg.value+" of \""+msg.target+"\"","assert page.has_"+keyword+"?(\""+msg.target+"\",:count => \""+msg.value+"\")"]; 
			}else if(msg.action== "AssertSingleElement"){
				return ["Assert page has "+msg.target,"assert page.has_css?(\""+msg.target+"\")"]; 
			}else if(msg.action=="AJAXEvent" && localStorage["winston_wait"]=="1"){
				return ["Wait","sleep(1)"];
			}else if(msg.action=="ElementClick"){
				if(localStorage["winston_selector"]=="xpath"){
					return ["Click "+msg.target,"find(:xpath,\""+msg.target+"\").click"];
				}else{
					return ["Click "+msg.target,"find(\""+msg.target+"\").click"];
				}
			}else{
				return "";
			}
		}
	}
}

function translateSelector(cssSelector){
	if(localStorage["winston_selector"]=="xpath"){
		return CSSToXPATHConverter.convert(cssSelector);
	}else{
		return cssSelector;
	}
}

// TODO direct descendants - " li a.linkclass" should convert to li/a[@class="linkclass"]
function convertCSSToXPath(cssSelector){
	var xpathoutput=""
	var cssSelector= " "+cssSelector;
	var data=cssSelector.split(/([.:#\[ ])/);
	var current_chunk = "";
	var select_index = -1;
	for(i=0;i<data.length; i++){
		if(data[i]==" "){ //Moving to new element
			i++;
			if(xpathoutput != ""){
				xpathoutput += "/"
			}
			if(current_chunk != ""){
				xpathoutput += current_chunk
				current_chunk = "";
			}
			current_chunk += data[i];
		}
		if(data[i]=="."){ // of current element
			current_chunk += "[contains(@class,\""+data[i+1]+"\")]"
			while(i+2<data.length && data[i+2]=="."){
				i+=2
				current_chunk += "[contains(@class,\""+data[i+1]+"\")]"
			}
		}
		if(data[i]=="#"){ // id of current element
			i++;
			current_chunk +="[@id = \""+data[i]+"\"]";
		}
		if(data[i]==":"){ // either eq(index) or contains.
			i++;
			if(data[i].indexOf("eq(") == 0){
				data[i]=data[i].replace("eq(","");
				if(i == data.length-1){ // Last item - do something different.
					select_index = (parseInt(data[i].replace(")",""))+1);
				}else{
					current_chunk +="["+(parseInt(data[i].replace(")",""))+1)+"]"; // One is zero indexed. the other is 1
				}
			}else if(data[i].indexOf("contains(") == 0){
				current_chunk += "[contains(text(),\""+data[i].replace(")","")+"\")]";
			}
		}
		if(data[i]=="["){
			i++;
			data[i]=data[i].replace("]","");
			current_chunk +="[@"+data[i]+"]";
		}
	}

	if(xpathoutput != ""){
		xpathoutput += "/"
	}
	if(current_chunk != ""){
		xpathoutput += current_chunk;
	}
	//There's a select index set- this only happens if it's the last item.
	if(select_index != -1){

		xpathoutput = "(//"+xpathoutput+")["+select_index+"]";
	}else{
		//Prepend with the global selector and call it a day.
		xpathoutput = "//"+xpathoutput;
	}
	return xpathoutput;
}

function cleanAcions(){
	for(i=0;i<actions.length; i++){
		actions[i][1]=actions[i][1].replace(/"/g,"\"");
	}
}

function getPureActionArray(index){
	newArray = new Array();
	for(i=0;i<actions.length; i++){
		newArray.push(actions[i][index]);
	}
	return newArray;
}

function copyToClipboard(){
	if(localStorage["winston_do_saved"]=="y"){
		addToSavedCaps();
	}
    var copyDiv = document.createElement("div");
    copyDiv.contentEditable = true;
    document.body.appendChild(copyDiv);
    copyDiv.innerHTML = getPureActionArray(1).join("<br/>");
    copyDiv.unselectable = "off";
    copyDiv.focus();
    document.execCommand("SelectAll");
    document.execCommand("Copy", false, null);
    document.body.removeChild(copyDiv);
}

function sendMessage(message){
  console.log("Send MSG");
  chrome.tabs.getSelected(null, function(tab) {
  	chrome.tabs.sendMessage(tab.id, message);
  });
}

function inject(){
	if(wayneStarted){
		console.log("Stopping at host");
		stop();
		sendMessage({swag:"Stop"});
	}else{
		start();
		sendMessage({swag:"Start", position:localStorage["winston_position"]});
	}
}




