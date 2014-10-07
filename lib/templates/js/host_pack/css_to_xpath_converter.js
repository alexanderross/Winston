/*
	Converter from the native CSS selector to XPATH
	Tests should make sure that the execution of the input css's length is = to this.
*/


var CSSToXPATHConverter = {
	convert: function(css_selector){
		var xpathoutput=""
		// This is important, as the logic below interprets a space as starting a new element.
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
			/* 
				Classes are interesting in that xpath analyzes class as a string, where css looks at it more as an array.
				To keep a constant behavior between the two, we just chain class contains statements for each .<class> in the element.
			*/
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
			//Essentially a generic handler for anything else
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
			// Wrap the output in parens, then apply the index
			xpathoutput = "(//"+xpathoutput+")["+select_index+"]";
		}else{
			//Prepend with the global selector and call it a day.
			xpathoutput = "//"+xpathoutput;
		}
		return xpathoutput;
	}
}