/*BEFORE RUN 
- Instantiate DRRenderer's templates to something


-Separate object for options?

EVENTUALLY
- Dynamic socket opts loading
- Presentations change depending on output subtype (XPATH, CSS, etc.)
- De-Wayne this thing. Wayne is dead to me.
- Actually use the EventWrapper object between the host and client
*/

var rush_those_listeners = true; //Load the core listeners before anything else (to beat the page's listeners)

//An eventwrapper is more of a node, only it also stores information about the event it wraps with the hope that It can
//re-fire that event.
//Should it store details about how it was selected? ie. A var containing the active expander..
function EventWrapper(evt_object){
    //the event holds enough information to resolve the target.
    this.base = evt_object.target;
    //action data describes the event and it's payload. 
    // eg. {action: 'click'} , {action: 'fill_in', payload: 'myname'}
    this.evt_data = evt_object;
    this.nextEvt = undefined;
    this.prevEvt = undefined;
    this.continue_on_surrender = false;

    this.toString = function(){

    }

    this.continueEvent = function (){
        this.evt_data.bypass_win = true;
        this.evt_data.cancelBubble = undefined;
        this.evt_data.returnValue = true;
        this.evt_data.defaultPrevented = undefined;
        document.dispatchEvent(this.evt_data);
        this.base.dispatchEvent(this.evt_data);
    }

    this.setNext = function(evt_obj){
        this.nextEvt = evt_obj;
        ext_obj.prevEvt = this;
    }

    this.setPrev = function(evt_obj){
        this.prevEvt = evt_obj;
        ext_obj.nextEvt = this;
    }

    // Yield to the next event. continue propegation.
    this.surrender = function(){

        var rtn_evt_wrap = undefined;
        if(this.nextEvt!= undefined){
            this.nextEvt.prevEvt = undefined;
            rtn_evt_wrap = this.nextEvt;
        }
        if(this.continue_on_surrender){
            this.continueEvent();
        }
        return rtn_evt_wrap;

    }

    this.addToTail = function(event_obj){
        if(this.nextEvt!= undefined){
            this.nextEvt.addToTail(event_obj);
            return;
        }
        this.setNext(event_obj);
    }
}

var WinstonSocket = {
    current_event_id: 0,
    sendEvent: function(evt){
        console.log("JECT SENDING");
        console.log(evt);
        chrome.extension.sendMessage(evt);
    },
    queueEvent: function(action, target, arg){
        

    },
    loadTemplate: function(template_type){
        
    },
    opts: {
        "seek_attrs":[
            "class","id","value","_label"
        ]
    }
}
var winston_renders = undefined;

//Gets instances from a hopefully initialized collection of template strings.
//Also serves as a bit of a helper the the functionality of Winston's classes.
var DRRenderer = {
   
    // What we present these to the user as. <> is replaced by a var. A presentation with one of these, expects one input.
    presentations:{
        "class": ".<>",
        "id": "#<>",
        "_label": "<>",
        "_eq": ":eq(<>)",
        "_default": "[<>='<>']"
    },
    // Same as above, though these are what are acutally used to eval expressions.
    // Pretty much the same as above, but with some exceptions.
    engine_executions:{ 
        "class": ".<>",
        "id": "#<>",
        "_label": ":contains('<>')",
        "_eq": ":eq(<>)",
        "_default": "[<>='<>']"
    },
    negation: ":not(<>)",
    windom_execution: " ", // spaces between heirarchal selects, can switch to '/' for xpath. But why?
    box_postition: "wn_bot_right",


    // By unbias, I mean modify it so it doesn't accidentally include winston stuff. Mainly for keeping the integrity of counts.
    unbiasTag: function(tag){
        var new_tag = tag;
        var processor = DRRenderer.negation.split("<>");
        new_tag += processor[0];
        new_tag += "[id^=\'winston_\'],[class^=\'winston_\']"
        new_tag += processor[1];
        console.log("UNBIAS => "+new_tag);
        return new_tag;
    },
    deWinstonfy: function(string_in){
        return $.trim(string_in.replace(/winstondom_\S+/g,""));
    },
    getValidLabel: function(candidate){
        candidate = candidate[0];
        // Candidate actually exists.
        if(candidate){
            var label_txt= "";
            for(var i=0; i< candidate.childNodes.length; i++){
                if(candidate.childNodes[i].tagName == undefined){
                    label_txt += candidate.childNodes[i].data
                }
            }
            return label_txt
        }
        return "";
    },
    truncateStr: function(input, limit){
        var new_str = input;
        if(input.length > limit){
            var portion = Math.floor(limit/2)-2;
            new_str = new_str.substr(0, portion)+" .. " + new_str.substr(new_str.length - portion );
        }
        return new_str;
    },
    
    decorateAttrComp: function(template, attr_name){
        //Add the presentation
        var presenter = DRRenderer.presentations[attr_name];
        if(presenter == undefined){
            presenter = DRRenderer.presentations["_default"].split("<>"); 
            if(presenter.length == 3){ //Pretty much the case most of the time unless default is redefined
                presenter[0] = presenter[0]+attr_name+presenter[1];
                presenter[1] = presenter[2];
            }
        }else{
            presenter = presenter.split("<>"); 
        }
        if(presenter[0] != "") template.find(".wad_head").html(presenter[0]);
        if(presenter[1] != "") template.find(".wad_tail").html(presenter[1]);
        return template;
   },
   getNewBase: function(base_obj){
    var template = winston_renders["main"];
    var $t_render = $(DRRenderer.prepTemplateWithWildcards(template, []));
    $t_render.attr("class",DRRenderer.box_postition);
    return $t_render;
   },
   getNewDomExpander: function(obj){
    var template = winston_renders["expander"];
    var wildcards = [["dom_tag", obj[0].tagName]]
    return $(DRRenderer.prepTemplateWithWildcards(template, wildcards));
   },
   getNewExpanderAttrComp: function(attr_comp_val){
    var template = winston_renders["expander_attr_comp"];


    return $(DRRenderer.prepTemplateWithWildcards(template, [["atr_value", DRRenderer.truncateStr(attr_comp_val,16)]]));
   },
   getNewExpanderAttr: function(attr){
    var template = winston_renders["expander_attr"];
    return $(DRRenderer.prepTemplateWithWildcards(template, [["type", attr]]));
   },
   getExpanderAttrDelimiter: function(attr_name){
    return DRRenderer.delimiters[attr_name];
   },
   //Replace wildcards with actual stuff.
   prepTemplateWithWildcards: function(template_str, wildcards){
        for(var i=0;i<wildcards.length;i++){
            template_str = template_str.replace(new RegExp('@'+wildcards[i][0]+'@',"g"),wildcards[i][1]);
        }
        return template_str;
   }
}


function WinDomAttrWrapper(parent_wrapper, attr, value_in){
    this.attr_name = undefined;
    this.display_block = undefined;
    this.attr_states = [];
    this.parent_wrapper = undefined;

    this.toggle_active = function(target, index){
        this.attr_states[index][0] = !this.attr_states[index][0];
        target = this.display_block.find(".winston_attr_comp_wrap:eq("+index+")");
        if(this.attr_states[index][0]){
            target.addClass("winston_active_attr");
        }else{
            target.removeClass("winston_active_attr");
        }
        Winston.refreshActive(true);

        //Refresh count
    };

    this.renderWrapper = function(){
        if(this.display_block == undefined){
            this.display_block = DRRenderer.getNewExpanderAttr(this.attr_name);
        }
        //Go through all of the states, render each of them, add class if active.
        var myself = this;
        for(var k=0; k < this.attr_states.length; k++){
            (function(k, myself){
                var new_component = DRRenderer.getNewExpanderAttrComp(myself.attr_states[k][1]);
                myself.display_block.append(new_component);
                //add the before/after swag
                DRRenderer.decorateAttrComp(new_component,myself.attr_name);

                //add a toggle listener.. may need to revisit this for efficiency
                new_component.click(function(evt){
                    myself.toggle_active(new_component, k);
                });

                if(myself.attr_states[k][0]) new_component.addClass("winston_active_attr");
            })(k,myself);
        }

        return this.display_block;
    };

    this.to_tag = function(){
        var output = "";
        var class_builder = DRRenderer.engine_executions[this.attr_name];
        if(class_builder == undefined){
            class_builder = DRRenderer.engine_executions["_default"].split("<>");
            if(class_builder.length == 3){
                class_builder[0] = class_builder[0]+this.attr_name+class_builder[1];
                class_builder[1] = class_builder[2];
            }
        }else{
            class_builder = class_builder.split("<>");
        }
        for(var i = 0; i < this.attr_states.length; i++){
            if(this.attr_states[i][0]){
                output+= class_builder[0]+this.attr_states[i][1].replace(/([\'\"])/,'\\$1')+class_builder[1];
            }
        }
        return output;
    };

    //Like for class, or id, or value... maybe label.. just store attr and the values as a structure.
    this.instantiateWrapper = function(parent_wrapper, attr, value){
        this.parent_wrapper = parent_wrapper;
        this.attr_name = attr;
       if(attr=="class"){
            var values = value.split(" ");
            for(var i=0;i<values.length;i++){
                //is used, value
                this.attr_states.push([false, values[i]])
            }
       }else{
            this.attr_states.push([false, value])
       }
    };
    //Initializer.. purdy much..
    this.instantiateWrapper(parent_wrapper, attr, value_in);
}

// Wrapper for the entire DOM object/event
function WinDomWrapper (obj, parent_wrap, child_wrap) {
    // this.active_parent
    // this.passive_child

    this.wrapper_id = "STATIC"; // Used eventually?
    this.display_block = undefined;
    this.attr_tracker = {};
    this.base = undefined;
    this.current_length = 0;
    this.use_eq = false;
    this.silenced = false;

    //RENDERING

    //Render the entire state of the dom wrapper, namely it's attrs
    this.renderWrapper = function(){
        if(this.display_block == undefined){
            this.display_block = DRRenderer.getNewDomExpander(this.base);
        }
        var focus_dom = this.display_block.find(".winston_expander_criteria");
        focus_dom.remove(".winston_criteria_sel"); //Remove rendered criteria.

        for(var attr_name in this.attr_tracker){
            focus_dom.append(this.attr_tracker[attr_name].renderWrapper());
        }
        var myself = this;
        this.display_block.find(".winston_expander_toggle_parent").click(function(){
            myself.addParent();
        });
        this.display_block.find(".winston_expander_destroy").click(function(){
            myself.destroy();
        });
        this.display_block.find(".winston_expander_toggle_eq").click(function(evt){
            myself.toggleIndexing(evt);
        });
        this.display_block.find(".winston_expander_toggle_silenced").click(function(evt){
            myself.toggleSilenced(evt);
        });
        this.refresh();
        return this.display_block;
    };

    this.toggleSilenced = function(evt){
        this.silenced = !this.silenced;
        $(evt.target).toggleClass("winston_expander_option_inactive");
        this.display_block.toggleClass("silenced");
        Winston.active_expander.refresh(true); // We need to refresh everything.
    };

    this.toggleIndexing = function(evt){
        $(evt.target).toggleClass("winston_expander_option_inactive");
        this.use_eq = !this.use_eq;
        Winston.active_expander.refresh(true);
    };
    //render the current evaluation of the extension.
    this.renderCount = function(count){
        var ct_disp_block = this.display_block.find(".winston_expander_count")
        ct_disp_block.html(this.current_length);
        //If ! selecting, does it resolve singularly? 
        if(Winston.selecting || this.current_length == 1){
            ct_disp_block.addClass("winston_select_count_valid");
        }else{
            ct_disp_block.removeClass("winston_select_count_valid");
        }
    };

    this.addAttribute = function(attribute, value){
        this.attr_tracker[attribute] = new WinDomAttrWrapper(this, attribute, value);
    };

    //Add the expander and re-render around that
    this.instantiateWrapper = function(base_obj, parent_wrap, child_wrap){
        this.active_parent = parent_wrap;
        this.passive_child = child_wrap;
        this.base = $(base_obj);

        this.display_block = DRRenderer.getNewDomExpander(this.base);
        //sweep it for attrs that we can use.
        var tmp_attrs = WinstonSocket.opts["seek_attrs"];
        for(var i=0;i<tmp_attrs.length; i++){
            if(this.base.attr(tmp_attrs[i])!= undefined){
                var tmp_attr = DRRenderer.deWinstonfy(this.base.attr(tmp_attrs[i]).toString());
                if(tmp_attr!=""){
                    this.addAttribute(tmp_attrs[i] , tmp_attr);
                }
            }
        }
        // For label selects
        var label_content = DRRenderer.getValidLabel(this.base);
        if(label_content != ""){
            this.addAttribute("_label",label_content);
        }
    };

    this.indexWithinTag = function(eval_tag){
        var use_index = $(eval_tag).index(this.base);
        if(use_index != -1){
            var ex_builder = DRRenderer.engine_executions["_eq"].split("<>");
            return ex_builder[0]+use_index.toString()+ex_builder[1];
        }
    }
    //Must be called on lowest node
    this.to_tag = function(){
        var self_obj = this;
        var content = "";
        if(self_obj.active_parent != undefined){
            if(this.silenced){
                return self_obj.active_parent.to_tag();
            }
            content = self_obj.active_parent.to_tag() + DRRenderer.windom_execution;
        }
        content += self_obj.base[0].tagName;

        for(var attr_name in self_obj.attr_tracker){
            content += self_obj.attr_tracker[attr_name].to_tag();
        }

        if(self_obj.use_eq){
            content += self_obj.indexWithinTag(content);
        }
        return content;
    };

    this.refresh = function(render_upwards){
        var preview_tag = $(DRRenderer.unbiasTag(this.to_tag()));
        console.log("IS LEN "+ preview_tag.length.toString());
        this.current_length = preview_tag.length;
        // Only show highlight elements for the final selector's matches
        this.renderCount();
        if(render_upwards && this.active_parent!=undefined){
            this.active_parent.refresh(true);
        }

        var $silencer_el = this.display_block.find(".winston_expander_toggle_silenced");
        var $destroy_el = this.display_block.find(".winston_expander_destroy");
        var $index_el = this.display_block.find(".winston_expander_toggle_eq");

        $silencer_el.hide();
        $destroy_el.hide();
        $index_el.hide();

        //Show index option only if the count is > 1
        if(this.current_length > 1 && !this.use_eq) $index_el.show();

        //Only render the silence button if wrapper has a parent and child. 
        if(this.passive_child != undefined){
            $destroy_el.show();
            if(this.active_parent != undefined){
                $silencer_el.show();   
            }
        }else{
            // Only show highlight elements for the final selector's matches
            $(".winstondom_matched_element").removeClass("winstondom_matched_element");
            preview_tag.addClass("winstondom_matched_element");
        }
    };

    //NODEISH OPS----------

    //Add and activate the parent
    this.addParent = function(){
        if(this.active_parent != undefined){
            this.active_parent.addParent();
            return;
        };
        this.active_parent = new WinDomWrapper(this.base.parent(), undefined, this);
        this.display_block.before(this.active_parent.renderWrapper());
        this.refresh(false);
    };

    this.destroy = function(){
        // Must be the highest expander and have a kid. The show logic for the button that triggers this should enforce it.
        if(this.active_parent == undefined && this.passive_child != undefined){
            //Make the child disown the parent
            this.passive_child.active_parent = undefined;
            this.display_block.remove();
        }else{
            console.log("attempted to destroy expander with parents.. That shouldn't happen.");
        }

    };

    this.toParent = function(){
        if(this.base.children().length != 0) this.instantiateWrapper(this.base.firstChild()[0]);
        this.renderWrapper();
    };
    this.toFirstChild = function(){
        if(this.base.children().length != 0) this.instantiateWrapper(this.base.firstChild()[0]);
        this.renderWrapper();
    };
    this.toRight = function(){
        if(this.base.next().length != 0) this.instantiateWrapper(this.base.next()[0], this.active_parent);
        this.renderWrapper();
    };
    this.toLeft = function(){
        if(this.base.prev().length != 0) this.instantiateWrapper(this.base.prev()[0], this.active_parent);
         this.renderWrapper();
    };
    
    this.instantiateWrapper(obj, parent_wrap, child_wrap);
}


//Kill listeners on AEC select
//Scope event sends
//Scope high this calls
var Winston = {
    //TODO how much of this is actually used?
    loaded: false,
    paused: false,
    use_dom_keys: false,
    do_kill: false,
    lock_ajax: false,
    page_listeners_loaded: false,
    base_loaded: false,
    display_block: undefined,
    sel_mode: 0, //0-not doing shit, 1-clicking, 2-counting
    active_expander: undefined,
    active_deferred_event: undefined,
    event_active: false,
    skip_count: 0,

    destroyAll: function(){
        $(document).unbind(".winston");
        Winston.destroyCurrentExpander();
        Winston.destroyPageListeners();
        Winston.destroyWinstonBaseListeners();
        Winston.destroyDomTraversalKeys();
        Winston.destroySelectEventListeners();
        $("*").unbind(".winston");
        $("body").children("#winston_box").fadeOut(500).remove();
        Winston.loaded= false;
    },

    loadAll: function(just_listeners){
        if(Winston.loaded) return;
        if(winston_renders == undefined){
            console.log("Warning :: render templates not defined at load time. Is the base broken??");
            return;
        }
        if(just_listeners == true || just_listeners == undefined){
            this.display_block = DRRenderer.getNewBase();
            $("body").append(this.display_block);
        }
        this.loadPageListeners();
        this.loadWinstonBaseListeners();
        Winston.loaded = true;
    },

    loadWrapper: function( wrapper){
        if(wrapper == undefined) return;
        if(this.active_expander != undefined){
            Winston.destroyCurrentExpander();
        }
        $(document.getElementById("winston_kill_current")).removeClass("winston_item_hidden");
        $(document.getElementById("winston_confirm")).removeClass("winston_item_hidden");
        this.sel_mode = 1;
        this.active_expander = wrapper;
        this.active_expander.base.addClass("winstondom_selected_dom_element");
        this.display_block.find("#winston_expand_container").append(wrapper.renderWrapper());
    },
    //obj is native JS
    loadObject: function(obj){
        if(obj == undefined) return;
        if(obj.tagName == undefined) return;
        Winston.loadWrapper(new WinDomWrapper(obj));
    },
    destroyCurrentExpander: function(){
        if(this.display_block == undefined) return;
        this.display_block.find(".winston_expander").remove();
        $(".winstondom_selected_dom_element").removeClass("winstondom_selected_dom_element");
        $(document.getElementById("winston_kill_current")).addClass("winston_item_hidden");
        $(document.getElementById("winston_confirm")).addClass("winston_item_hidden");
        $(".winstondom_matched_element").removeClass("winstondom_matched_element");
        this.active_expander = undefined;
        this.deleteHead();
        this.sel_mode = 0;
    },

    toggleDomKeys: function(){
        Winston.use_dom_keys = !Winston.use_dom_keys;
        var dk_obj = $(document.getElementById("winston_keys"));
        if(Winston.use_dom_keys){
            dk_obj.addClass("winston_base_option_active");
            Winston.loadDomTraversalKeys();
        }else{
            dk_obj.removeClass("winston_base_option_active");
            Winston.destroyDomTraversalKeys();
        }
    },

    //EVENT QUEUEING
    // If it's something like a submit/link click, we want to pause execution of redirection until the user
    // can work out how they want to resolve the node that triggered the event. We hold this until the expander is confirmed and
    // release is fired. 
    // dethroneHead should load the event into the focus wrapper.
    // destroyCurrentExpander should fire it. 
    //Release paused event listener chain
    // Some of that is not as simple as it sounds. Fuck.
    activateHead:function(){
        //We need to signify that the deferred event needs to be notified when this event is confirmed.
        Winston.loadObject(Winston.active_deferred_event.base);
        Winston.event_active = true;
    },
    deleteHead: function(){
        if(this.active_deferred_event != undefined){
            Winston.active_deferred_event = Winston.active_deferred_event.surrender();
        }
    },
    //Add the rest of an event chain until the event is resolved.
    queueEvent:function(evt_obj){
        if(Winston.active_deferred_event != undefined){
            Winston.active_deferred_event.addToTail(evt_obj)
        }else{
            Winston.active_deferred_event = evt_obj;
        }
        if(Winston.active_expander == undefined){
            Winston.activateHead();
        }
    },
    catchEvent:function(evt){
        console.log("Caught Event.");
        if(evt.bypass_win == true){
            console.log("Saw a resumed event!! YOU DID IT!!!");
            return true;
        } 
        var object=event.target;
        $(object).removeClass("winston_hover");
        if(object.className.indexOf("winston_") == -1 && object.id.indexOf("winston_") == -1 && Winston.sel_mode == 0){
            if(Winston.skip_count != 0){
                Winston.modifySkipCount(-1);
                event.bypass_win = true;
                return true;
            }
            Winston.queueEvent(new EventWrapper(event));
            event.stopImmediatePropagation();
            event.preventDefault();
            Winston.sel_mode = 1;
            return false;
        }

    },
    modifySkipCount:function(change_amt){
        Winston.skip_count = Winston.skip_count + change_amt;
        var skip_html = "I";
        if(Winston.skip_count != 0) skip_html += "("+Winston.skip_count.toString()+")"
        this.display_block.find("#winston_ignore_next").html(skip_html);
    },

    //LISTENERS

    loadPageListeners: function(){
        $(document).on("blur.winston",function(){//TextField
            //WinstonSocket.queueEvent(WinstonSocket.eventForAction("FieldBlur",this));
            WinstonSocket.sendEvent({action: "FieldBlur", target: this.name,value:$(this).val()});
        });

        $(document).on('change.winston', 'input[type="file"]',function(event){
            //WinstonSocket.queueEvent(WinstonSocket.eventForAction("FileUpload",this));
            WinstonSocket.sendEvent({action: "FileUpload", target: this.name,value:$(this).val()});
        });

        $(document).on('change.winston', function(){
            if($(this).is(':checked')){
                //WinstonSocket.queueEvent(WinstonSocket.eventForAction("CheckboxCheck",this));
                WinstonSocket.sendEvent({action: "CheckboxCheck", target: object.name, value: $(object).val()});
            } else {
                //WinstonSocket.queueEvent(WinstonSocket.eventForAction("CheckboxUnCheck",this));
                WinstonSocket.sendEvent({action: "CheckboxUnCheck", target: object.name, value: $(object).val()});
            }
        });

        $(document).on('change.winston', function(){
            var sval = $(object).find("option:selected").html();
            WinstonSocket.sendEvent({action: "SelectChange", target: this.name, value: sval});
            //WinstonSocket.queueEvent(WinstonSocket.eventForAction("SelectChange",this, sval));
        });

        $(document).on('submit.winston', function (event){
            //sendEvent({action: "SubmitForm", target: object.id});

        });

        $(document).on('click.winston', "input:submit", function(){
            if(!selecting){
                var object = this;
                if(allowLabelClick){
                    WinstonSocket.sendEvent({action: "SubmitClick", target: object.name, value: $(object).val()});
                    return true;
                }else{
                    return fullProcessClickedObject(object); //Will break TODO
                }
            }else{
                return false;
            }
        });
        //The money shot.

        $(document).on("click.winston",function(event) {
            return Winston.catchEvent(event);
        });

        Winston.page_listeners_loaded = true;
    },
    destroyPageListeners: function(){
        $(document).unbind(".winston");
        Winston.page_listeners_loaded = false;
    },
    loadWinstonBaseListeners: function(){
        Winston.lock_ajax=true;
        var common_container = $(document.getElementById("winston_box"));

        //FWD/BACK CURRENTLY DISABLED!!
        common_container.on('click.winstoncr', "#winston_back",function(){
                WinstonSocket.sendEvent({action:"Winston",target:"undo"});
                return false;
        });

        common_container.on('click.winstoncr',"#winston_forward",function(){
                WinstonSocket.sendEvent({action:"Winston",target:"redo"});
                return false;
        });

        common_container.on('click.winstoncr',"#winston_kill" ,function(){
                WinstonSocket.sendEvent({action: "Winston", target: "kill"});
                return false;
        });

        common_container.on('click.winstoncr', "#winston_pause",function(){
                Winston.paused = !Winston.paused;
                if(Winston.paused){
                        Winston.destroyPageListeners();
                        $("b.winston_name").html("Winston[Paused]");
                        $("#winston_pause").html("R");
                }else{
                        Winston.loadPageListeners();
                        $("b.winston_name").html("Winston");
                        $("#winston_pause").html("P");
                }
                return false;
        });

        common_container.on('click.winstoncr', "#winston_kill_current",function(){
            Winston.destroyCurrentExpander();
        });

        common_container.on('click.winstoncr', "#winston_ignore_next",function(){
            Winston.modifySkipCount(+1);
        });

        common_container.on('click.winstoncr', "#winston_confirm",function(){
            Winston.confirmCurrentState();
        });

        common_container.on('click.winstoncr',"#winston_select",function(){
                if(selecting){
                        disableSelectMode();
                        setHeaderMsg("notify","Canceled Element Selection");
                }
                return false;
        });
        common_container.on('click.winstoncr',"#winston_keys",function(){
            Winston.toggleDomKeys();
        });

        //Clicking the count to confirm the action.
        common_container.on('click.winstoncr',".winston_select_count.winston_select_count_valid", function(){
            Winston.confirmCurrentState();
        });
        console.log("Winston: Base Loaded");
        Winston.base_loaded=true;
        Winston.lock_ajax=false;
    },
    destroyWinstonBaseListeners: function(){
        $("*").unbind(".winstoncr");
        Winston.base_loaded=false;
    },
    loadSelectEventListeners: function(){
        Winston.sel_evts_loaded=false;
    },
    destroySelectEventListeners: function(){
        $("*").unbind(".winstonsel");
        Winston.sel_evts_loaded=false;
    },

    loadDomTraversalKeys: function(){
        if(!Winston.use_dom_keys) return;
        $(document).on("keydown.winstondomkey",function(event){
            switch(event.keyCode){
                case 37: //left arrow
                    Winston.traverseLeft();
                    break;
                case 38: // up arrow
                    Winston.traverseUpwards();
                    break;
                case 39: // Right arrow
                    Winston.traverseRight();
                    break;
                case 40: // Down arrow
                    Winston.traverseDownwards();
                    break;
                case 13: //Enter
                    Winston.confirmCurrentState();
                    break;
                default:
                        break;
            }        
            
        });
        Winston.dk_evts_loaded=true;
    },

    destroyDomTraversalKeys: function(){
        $("*").unbind(".winstondomkey");
        Winston.dk_evts_loaded=false;
    },

    // Actual stuff=========
    //Select
    selecting: false,
    startSelectSequence: function(){
        if(Winston.selecting) return;
        Winston.selecting = true;
        Winston.sel_mode = 2;
        Winston.loadSelectEventListeners();
    },

    endSelectSequence: function(){
        console.log("ESS");
        Winston.selecting = false;
        Winston.sel_mode = 0;
        Winston.destroySelectEventListeners();
    },

    //Add an expander container above current with the clicked element's parent
    gotoParentLevel: function(){
        this.active_expander = Winston.active_expander.activate_parent();
        this.active_expander.disownChild();
    }, 

    //Add an expander below current, but just to look it..
    traverseLeft: function(){
        Winston.loadObject(Winston.active_expander.base.prev()[0]);
    },
    traverseRight: function(){
        Winston.loadObject(Winston.active_expander.base.next()[0]);
    },
    //Set the upward expander as the clicked object, discard lower expanders.
    traverseUpwards: function(){
        Winston.loadObject(Winston.active_expander.base.parent()[0]);
    },
    //Set the child displayed by seekChild as the current. Keep parents by default.
    traverseDownwards: function(obj, retain_upper){
        Winston.loadObject(Winston.active_expander.base[0].childNodes[0]);
    },
    refreshActive: function(){
        Winston.active_expander.refresh(true);
    },
    //Set an attribute of the element to either be active or inactive in the query
    setAttribute: function(obj, attribute, active){

    },
    //Export the current heirarchy to the extension's client.
    confirmCurrentState: function(){
        if(Winston.sel_mode == 0){ // Not doing shit
            return;
        }else{ // Clicking
            if(Winston.active_expander.current_length == 1){
                if(Winston.active_deferred_event != undefined){
                    Winston.active_deferred_event.continue_on_surrender = true;
                }
                WinstonSocket.sendEvent({action: "ElementClick", target: Winston.active_expander.to_tag()});
            }else if(Winston.active_expander.current_length > 1){
                Winston.sel_mode = 2;
            }else{
                console.log("Empty target! Wtf, bro??");
                return;
            }
        }
        if(Winston.sel_mode == 2){
            var tag = Winston.active_expander.to_tag();
            WinstonSocket.sendEvent({action: "AssertCount", target: tag, value: $(tag).length });
        }
        console.log("Confirmed current state");
        Winston.sel_mode = 0;
        Winston.destroyCurrentExpander();
    },

    //Response handlers
    processMessage: function(type, content){
        var msg_window =  document.getElementById("winston_message_display");

        if(msg_window != undefined){
            msg_window.innerHTML = content;
        }
    },

    processUpdate: function(msg){
        if(msg.stat=="Running"){
            Winston.loadAll();
            document.getElementById("winston_count").innerHTML = msg.count;
            DRRenderer.box_postition = msg.position;
        }
        Winston.processMessage("event",msg.update);
    }
}
var active_engine = Winston;
if(rush_those_listeners){
    Winston.loadPageListeners();
}
$(document).bind("ready",function(){
    //This needs to see everything. so it's down here.
    chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) { 
        console.log("Winject rcv");
        console.log(msg);
        if (msg.swag == "settings"){
            winston_renders = msg.templates;
            console.log("Templates Loaded");
            WinstonSocket.sendEvent({action:"Winston",target:"Winston! Leave the fucking cat alone!!"});
        }
        if (msg.swag == "Stop" || msg.stat=="Stopped"){
            active_engine.processMessage("notify","Stopped!");
            active_engine.destroyAll();
        }else if (msg.swag == "Start"){
            active_engine.loadAll();
            WinstonSocket.sendEvent({action:"Visit",target:window.location.pathname})
        }else if (msg.swag == "Select"){
            active_engine.startSelectSequence();
        }else if(msg.swag=="update"){
            active_engine.processUpdate(msg)
        }else{

            active_engine.processMessage("notify",msg);

        }
        
    });

    WinstonSocket.sendEvent({action:"Winston",target:"load_templates"});
});