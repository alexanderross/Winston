var SETTINGS = {

	"winston_selector":{
		render_as: "sel",
		label: "Selector Type",
		description: "Depicts what kind of selector is used in the test.",
		options: [
			["xpath", "XPATH"],
			["css", "CSS"]
		]
	},
	"winston_position":{
		render_as: "sel",
		label: "Position",
		description: "Position of the winston bar on the screen",
		options: [
			["wn_top_right","Top Right"],
			["wn_top_lft","Top Left"],
			["wn_bot_right","Bottom Right"],
			["wn_bot_left","Bottom Left"]
		],
		default:"wn_bot_right"
	},

	"winston_index_behaviour":{
		render_as: "aldn",
		label: "Indexed Selector",
		description: "Allow, if an element can't be uniquely resolved to a composite of it's ID, class, or attributes,  an index selector to be used.",
	},
	"winston_scoping_behaviour":{
		render_as: "aldn",
		label: "Scoped Selector",
		description: "Allow winston to select an element by recursively selecting parent nodes until finding one that resolves uniquely with the current criteria.",
	},
	"winston_allow_label_click":{
		render_as: "aldn",
		label: "Click By Content",
		description: "Allow clicks to resolve to the content of their container. ie allow for use of click_link('my link'), click_button('Save') etc. Having this set to no may lead to denied clicks, but strengthens the test against changes to code."
	},
	"winston_required":{
		render_as: "text",
		label: "Required In Selector",
		description: "A comma-separated list of items required to exist in a tag. If you'd like to only accept click events on objects that have classes, we put '.' as one/the item in the list. Example: I'm a stickler and only want to select objects with a class AND id, so I'd put '.,#' in the list.",
	},
	"winston_deny":{
		render_as: "text",
		label: "Denied In Selector",
		description: "A comma-separated list of items that should never exist in a tag. Formatting is the same as accept selectors above.",
		options: []
	}

}

document.addEventListener('DOMContentLoaded',function(){
	var active_val = 0;
	var active_setting = undefined;
	document.getElementById("settings_block").appendChild(document.createElement("BR"));
	Object.keys(SETTINGS).forEach(function(key){
		active_setting = SETTINGS[key];
		var options = active_setting.render
		var input_obj = undefined
		if (active_setting.render_as != "text"){
			var use_options = (active_setting.render_as == "aldn")? ([["1","Allow"],["0","Deny"]]) : active_setting.options ;
			input_obj = getSelect(key, use_options, localStorage[key]);
		}else{
			input_obj = getTextInput(key, localStorage[key]);
		}
		input_obj.id = key;
		var container = document.createElement("DIV");
		container.className = "widmh";
		label = document.createElement("LABEL");
		label.appendChild(document.createTextNode(active_setting.label));
		container.appendChild(label);
		container.appendChild(input_obj);
		container.appendChild(document.createElement("BR"));
		var desc = document.createElement("SMALL");
		desc.appendChild(document.createTextNode(active_setting.description));
		container.appendChild(document.createElement("BR"));
		container.appendChild(desc);
		container.appendChild(document.createElement("BR"));
		container.appendChild(document.createElement("HR"));
		document.getElementById("settings_block").appendChild(container);


	});

	restore_options();





	$(".vnm").html("ver "+localStorage["winston_version_number"]);

/*
	swidth=$("#used").width();
	width=(parseInt((localStorage["winston_saved"].length / 2500000)*swidth).toString())+"px";
	$("#used").attr("width",width);
	$("#used").css("width",width);
*/
	$("#used").hide();

	document.getElementById("clear_saved").addEventListener('click', function(){
		localStorage["winston_saved"]="[]";
	});

	$("a.wcop").bind("click",function(event){
		data=JSON.parse(localStorage["winston_saved"])[parseInt(event.target.id)]["data"];

		copyToClipboard(data);
	});

	$("a.wdel").bind("click",function(event){
		data=JSON.parse(localStorage["winston_saved"]);
		data.splice(parseInt(event.target.id),1);
		localStorage["winston_saved"]=JSON.stringify(data);
		$(event.target).parent().parent().parent().remove();
	});

	$("a.wres").bind("click",function(event){
		chrome.extension.sendMessage({action:"Winston",target:"setevents",values:JSON.parse(localStorage["winston_saved"])[parseInt(event.target.id)]["data"]});
		alert("Restored capture into (hopefully running somewhere) winston bar");
	});
	$(".saveBtn").click(function(){
	  var input_select = undefined;
	  var active_val = 0;
	  var active_setting = undefined;

	  Object.keys(SETTINGS).forEach(function(key){
	  	active_setting = SETTINGS[key];
	  	input_select = document.getElementById(key);
	  	active_val = (active_setting.render_as != "text")? input_select.children[input_select.selectedIndex].value : input_select.value;
	  	localStorage[key] = active_val;
	  });

	  if($("#winston_save").attr("checked")=="checked"){
	  	localStorage["winston_do_saved"]="y";

	  }else{
	  	localStorage["winston_do_saved"]="";
	  }

	  if($("#winston_wait").attr("checked")=="checked"){
	  	localStorage["winston_wait"]="1";

	  }else{
	  	localStorage["winston_wait"]="0";
	  }


	  // Update status to let user know options were saved.
	  var status = document.getElementById("status");
	  status.innerHTML = "Options Saved.";
	  chrome.extension.sendMessage({action: "Options", target: "reload"});
	  setTimeout(function() {
	    window.location.reload();
	  }, 750);

	});

});

function getSelect(newid, options, def_val){
	var new_el = document.createElement("SELECT");

	for(var i = 0; i<options.length; i++){
		var option = document.createElement("OPTION");
		option.appendChild(document.createTextNode( options[i][1].toString() ));
		option.value = options[i][0];
		if (options[i][0] == def_val){
			new_el.selectedIndex = i;
			option.setAttribute("selected","true");
		}
		new_el.appendChild(option);
	}
	return new_el;
}

function getTextInput(newid, def_val){
	var new_el = document.createElement("INPUT");

	if(def_val != undefined){
		new_el.value = def_val;
	}

	return new_el;

}

function restore_options(){
	var active_setting = undefined;

	Object.keys(SETTINGS).forEach(function(key){
		active_setting = SETTINGS[key];
		if(active_setting.render_as != "text"){
			restore_select(key);
		}else{
			restore_field(key);
		}
	});

	if(localStorage["winston_wait"]=="1"){
		$("#winston_wait").attr("checked","checked");
	}
	else{
		$("#winston_wait").attr("checked","");
	}
  	

	get_saved_entries();
}

function restore_field(option) {
  var attr = localStorage[option];
  if (!attr) {
    return;
  }
  var field = document.getElementById(option);
  field.value = attr;
}

function get_saved_entries(){
		if(localStorage["winston_do_saved"]=="y"){
			$("#winston_save").attr("checked","checked");
		if (!localStorage["winston_do_saved"]) {
			$("#winston_save").attr("checked","");
	    	return;
	  	}
		data=JSON.parse(localStorage["winston_saved"]);
		table=document.getElementById("save_table");

		for(i in data){
			trtag=(i%2==0)? "<tr>":"<tr class='alt'>";
			$(table).html($(table).html()+trtag+"<td>"+data[i]["date"]+"</td><td>"+data[i]["time"]+"</td><td>"+data[i]["data"].length+"</td><td><a class='wcop' id='"+i+"'>Re-Copy</a>-<a class='wres' id='"+i+"'>Restore</a>-<a class='wdel' id='"+i+"'>X</a></td></tr>");
		}
	}else{
		$("#saved_stuff").hide();
	}
}

//Repeated.. so what..
function copyToClipboard(data){
	//Remove tags
	for(i=0;i<data.length; i++){
		data[i]=data[i][1];
	}
    var copyDiv = document.createElement('div');
    copyDiv.contentEditable = true;
    document.body.appendChild(copyDiv);
    copyDiv.innerHTML = data.join("<br/>");
    copyDiv.unselectable = "off";
    copyDiv.focus();
    document.execCommand('SelectAll');
    document.execCommand("Copy", false, null);
    document.body.removeChild(copyDiv);
    alert(data.length+" Test items copied to clipboard.");
}


function restore_select(option) {
  var attr = localStorage[option];
  if (!attr) {
    return;
  }
  var select = document.getElementById(option);
  for (var i = 0; i < select.children.length; i++) {
    var child = select.children[i];
    if (child.value == attr.toString()) {
      child.selected = "true";
      break;
    }
  }
}
