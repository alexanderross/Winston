// available options and default values. Could extract this into json and iterate over it.. later...
var PrefStorage = {
	loadDefaults: function(){
		if (!localStorage["winston_engine"]){
			localStorage["winston_engine"]="RACCOON";
		}

		if (!localStorage["winston_position"]){
			localStorage["winston_position"]="wn_bot_right";
		}

		if (!localStorage["winston_technical"]){
			localStorage["winston_technical"]=1;
		}

		if (!localStorage["winston_selector"]){
			localStorage["winston_selector"]="css";
		}

		if(!localStorage["winston_wait"]){
			localStorage["winston_wait"]="1";
		}

		if(!localStorage["winston_allow_label_click"]){
			localStorage["winston_allow_label_click"]="1";
		}

		if(!localStorage["winston_do_saved"]){
			localStorage["winston_do_saved"]="y";
		}

		if(!localStorage["winston_saved"]){
			localStorage["winston_saved"]="[]";
		}
	}
};

PrefStorage.loadDefaults();