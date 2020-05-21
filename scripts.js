

var ContentEnum ={
    noroomleft : 1,
    roominexistant : 2,
    login : 3,
    datatree:4,
    empty:5
};

var TypeEnum = {
    file : 1,
    folder :2
};


///////////////////////////////////////


function writeErrorMessage(message, type = "danger"){ // Writes an error message, who guessed that huh?
    $("#errormessagecontainer").append("<div class=\"alert alert-" + type + "\" role=\"alert\"><strong>" + message + "</strong></div>");
}

function getR_IDfromURL() {
    url = window.location.href;
    var loc = url.search("R_ID=");
    if(loc == -1)return "";
    loc += 5;
    return url.substr(loc);
}

function ActivateMainContent(content){
    $("#roominexistant").removeClass().addClass("hidden");
    $("#noroomleft").removeClass().addClass("hidden");
    $("#login").removeClass().addClass("hidden");
    $("#datatree").removeClass().addClass("hidden");
    $("#empty").removeClass().addClass("hidden");
    var toshow = "";
    switch(content){
        case ContentEnum.datatree:
            toshow = "#datatree";
            break;
        case ContentEnum.login:
            toshow = "#login";
            break;
        case ContentEnum.roominexistant:
            toshow = "#roominexistant";
            break;
        case ContentEnum.noroomleft:
            toshow = "#noroomleft";
            break;
        case ContentEnum.empty:
            toshow = "#empty";
            break;
    }
    if(toshow != ""){
        $(toshow).removeClass("hidden");
    }
}

function PrettyPrintTime(seconds){
    var result = "";
    result = (Math.floor(seconds % 60)).toString() + "S";
    seconds /= 60;

    result = (Math.floor((seconds % 60)).toString() + "M ").concat(result);
    seconds /= 60;

    result = (Math.floor((seconds % 24)).toString() + "H ").concat(result);
    seconds /= 24;

    if(seconds == 0)return result;

    result = (Math.floor(seconds).toString() + "T ").concat(result);
    return result;
}

function UpdateTime(){
    var timeleft = localStorage.getItem("seconds");
    $("#timeleft").empty().append("Noch <span class=\"text-success\">" + PrettyPrintTime(timeleft) + "</span> Verfügbar");
    timeleft -= 5;
    localStorage.setItem("seconds",timeleft);
}

function SetSpace(space){
    space /= 1000000;
    $("#spaceleft").empty().append("<span class=\"text-success\">" + Math.floor(space) + "/100 MB </span>frei (gerundet)");
}

function FindFolderEnd(filesystem){
    var c = 0;
    for(var i = 0;i<filesystem.length;i++){
        if(filesystem[i] == "{")c++;
        if(filesystem[i] == "}")c--;
        if(c < 0)return i;
    }
}

function GetFolderTree(filesystem){
    var endofrid = filesystem.search(",");
    var tree = {
        "type" : TypeEnum.folder,
        "name" : filesystem.substr(6,endofrid-6),
        "children": [],
    };
    //var tree = new TreeObject(TypeEnum.folder,filesystem.substr(6,endofrid-6),[]);

    var posofchildren = filesystem.search("children:{") + 10;
        
    filesystem = filesystem.substr(posofchildren,filesystem.length-2-posofchildren); 
    

    while(filesystem.search(",") != -1){
        if(filesystem[0] == "{"){
            //Folder is next
            var folderend = FindFolderEnd(filesystem.substr(1));
            tree.children.push(GetFolderTree(filesystem.substr(0,folderend+2)));
            filesystem = filesystem.substr(folderend+3);
        }else{
            //File is next
            var fileendpos = filesystem.search(",");
            var filename = filesystem.substr(0,fileendpos);
            var treechild = {
                "type" : TypeEnum.file,
                "name" : filename,
                "children" : null,
            };
            //var treechild = new TreeObject(TypeEnum.file,filename);

	    tree.children.push(treechild);
            filesystem = filesystem.substr(fileendpos+1);
        }
        
    }
    return tree;
}

function DoesLocationExist(loc,tree){ //Dirs only
    var pos = loc.toString().search(",");

    if(pos == -1){
        if(tree.name == loc)return tree;
        return false;
    }

    var folder = loc.substr(0,pos);

    if(folder != tree.name)return false;
    if(tree.type != TypeEnum.folder)return false;

    

    for(var i = 0;i<tree.children.length;i++){
        var r = DoesLocationExist(loc.substr(pos+1),tree.children[i]);
        if(r != false)return r;
    }

    return false;
}

function DrawAtLocation(){
    

    var loc = localStorage.getItem("location").toString();
    var tree = JSON.parse(localStorage.getItem("tree"));
    var result = DoesLocationExist(loc,tree);

    if(result != false){
        tree = result;
    }else{
        loc = localStorage.getItem("R_ID");
    }
    

    var orientation = "";
    var n = 0;
    while(loc.search(",") != -1){
        orientation = orientation + "<li><a id=\"bread" + n +"\" onclick=\"OnBreadSelection(this)\" >" + loc.substr(0,loc.search(",")) + "</a></li>";
        loc= loc.substr(loc.search(",")+1);
        n += 1;
    }
    orientation += "<li class=\"active\">" + loc + "</li>";
    
    $("#treeorientation").empty().append(orientation);


    if(tree.children.length == 0){
	
        ActivateMainContent(ContentEnum.empty)
        return;
    }else{
        ActivateMainContent(ContentEnum.datatree);
    }

    localStorage.setItem("numberOfChildren",tree.children.length);

    $("#datatree").empty()

    var appendcontent = "<table class=\"table table-striped\"><tbody><tr><th class=\"col-md-1\" >Auswählen</th class=\"col-md-1\" ><th></th><th>Datei</th> </tr>";

    for(var i=0;i<tree.children.length;i++){
        var type = "file";
        var name = tree.children[i].name;
        
        
        if(tree.children[i].type == TypeEnum.folder)type = "folder-open";
        var content = "<tr><td ><input id=\"check" + i + "\" style=\"display:inline-block\" type=\"checkbox\"  ></td><td><a id=\"type"+i+"\" class=\"hidden\">"+type+"</a><span style=\"float:right\" class=\"   glyphicon glyphicon-" +type +"\"></span></td><td><p><a id=\"name" +i + "\" onclick=\"OnSelection(this)\" >"+name+"</a></p></td></tr>";
        
        appendcontent += content;    
    }
    localStorage.setItem("setBoxes",tree.children.length);
    appendcontent += "</tbody></table>";
    $("#datatree").append(appendcontent);

}

function GetCheckedBoxes(){
    var amount = localStorage.getItem("setBoxes");
    var result = [];
    for(var i=0;i<amount;i++){
        var box = "check"+i;
        var name= "name"+i;
        var type= "type"+i;
        if($("#"+box).is(":checked")){
            var tree = {
                name:$("#"+name).text(),
                type:$("#"+type).text().substr(0,6),
            };
            result.push(tree);
        }
    }
    return result;
}

function NormalizeAndPrintFilesystem(filesystem){
    var tree = GetFolderTree(filesystem);

    localStorage.setItem("tree",JSON.stringify(tree));
    DrawAtLocation();
}

function CreateQueryPath(loc){
    if(loc.search(",") == -1)return "";

    var cp = "";
    var last = 0;
    for(var i=0;i<loc.length;i++){
        if(loc[i] == ","){
            cp += loc.substr(last,i-last) + "/";
            last = i+1;
        }
    }
    cp += loc.substr(last);

    cp = cp.substr(cp.search("/"));
    
    return cp;
}


////////////////////////////////////////

function SaveJsondataToLocalStorageAndUpdate(jsondata){

    if(jsondata == ""){
        writeErrorMessage("Da ging was schief, Entschuldigung");
    }

    ActivateMainContent(ContentEnum.datatree);

    var room = JSON.parse(jsondata);    

    //R_ID:
    var rid = room.R_ID;
    localStorage.setItem("R_ID",rid);
    $("#sidepaneltitle").text("Raum " + rid + " Details");
    $("#sharelink").val("https://kasimirtanner.ch/minute/share.html?R_ID=" + rid);

    //JWT
    var jwt = room.JWT;
    localStorage.setItem("JWT",jwt);

    //url
    //we don't need the url

    //filesystem
    NormalizeAndPrintFilesystem(room.filesystem);

    //Locked
    var locked = room.Locked;
    localStorage.setItem("locked",locked);

    if(locked){
        $("#editopen").removeClass().addClass("hidden");
        $("#editclose").removeClass().addClass("show");
    }else{
        $("#editopen").removeClass().addClass("show");
        $("#editclose").removeClass().addClass("hidden");
    }

    //Password
    if(room.Password == 1){
        $("#passwordset").removeClass().addClass("show");
        $("#passwordunset").removeClass().addClass("hidden");
    }else if(locked){
        $("#passwordset").removeClass().addClass("hidden");
        $("#passwordunset").removeClass().addClass("hidden");
    }else{
        $("#passwordset").removeClass().addClass("hidden");
        $("#passwordunset").removeClass().addClass("show");
    } 

    //TimeLeft
    var timeleft = room.TimeLeft;

    localStorage.setItem("seconds",timeleft);
   // window.clearInterval();
    UpdateTime();
    window.setInterval(UpdateTime,5000);

    //Spaceleft
    var spaceleft = room.FreeSpace;

    SetSpace(spaceleft);

    //NAme & desc
    var name = room.Name;
    var desc = room.Description;

    if(name == null)name = "";
    if(desc == null)desc = "";

    if(locked){
        $("#roomdetailsshow").removeClass().addClass("hidden");
        $("#roomdetailshidden").removeClass().addClass("show");
        $("#name").empty().text(name);
        $("#desc").empty().text(desc);
    }else{
        $("#roomdetailsshow").removeClass().addClass("show");
        $("#roomdetailshidden").removeClass().addClass("hidden");
        $("#nameshow").empty().val(name);
        $("#descshow").empty().append(desc);
    }

}

function SendQuery(dest,requesttype,  callbackfunction = function(){}, parameter = {}){ //Sends a query
    destination = "https://kasimirtanner.ch/minute/" + dest;
    $.ajax({url: destination,
        method: requesttype,
        data: parameter,
        error: function(result,status,error){
           localStorage.setItem("statuscode",result.status);
        },
        success: function(result){
            localStorage.setItem("statuscode",200);
            SaveJsondataToLocalStorageAndUpdate(result);
        },
        complete : function(result,status){
            callbackfunction(result,status);
        },
    });
}



///////////////////////////////////
// Eventhandlers
///////////////////////////////

function OnSelection(obj){
    var tree = JSON.parse(localStorage.getItem("tree"));
    var loc = localStorage.getItem("location") + "," + $(obj).text();

	

    var result = DoesLocationExist(loc,tree);
    if(result == false){
        writeErrorMessage("Entschuldigung, da ging etwas schief");
        return;
    }

    var cp = CreateQueryPath(loc);
    

    if(result.type == TypeEnum.file){

        window.location = "https://kasimirtanner.ch/minute/file.php?R_ID="+ localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT") + "&path=" + cp;
	//SendQuery("file.php?R_ID=" + localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT") + "&path=" + cp,"GET");
    }else{
        localStorage.setItem("location",loc);
        DrawAtLocation();
    }
}

function OnBreadSelection(obj){
    var loc = "";
    var content = $("#treeorientation").text();
    var currentloc = localStorage.getItem("location");

    var n = $(obj).attr("id").toString().substr(5);
    
    var c = -1;
    for(var i = 0;i<currentloc.length;i++){
        if(currentloc[i] == ","){
            c++;
        }
        if(c == n)break;
        loc += currentloc[i];
    }

    localStorage.setItem("location",loc);
    DrawAtLocation();
}


function move(){
    var loc = localStorage.getItem("location");
    var cp = CreateQueryPath(loc);
    cp += "/"+localStorage.getItem("oldfilename");
    var old = localStorage.getItem("oldfilepath");
    SendQuery("files.php?R_ID="+ localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT")  + "&oldname=" + old + "&newname=" + cp,"PUT");
    $("#confirm").removeClass().addClass("hidden");
}

function cancelMove(){
    $("#confirm").removeClass().addClass("hidden");
}

///////////////////////////////////
// Eventhandlers !!!!!!!!!!!!!!!!
///////////////////////////////




///////////////////////////////////
// Callbacks
///////////////////////////////

function RoomInfoCallback(){
    if(localStorage.getItem("statuscode") == 403 || localStorage.getItem("statuscode") == 400){
        ActivateMainContent(ContentEnum.login);
        return;
    }
    
    if(localStorage.getItem("statuscode") != 200){
        ActivateMainContent(ContentEnum.roominexistant);
    }

}

function RoomCreationCallback(){
    if(localStorage.getItem("statuscode") == 511){
        ActivateMainContent(ContentEnum.noroomleft);
	writeErrorMessage("Ich bin eine Teekanne","primary");
	return;
    }
    window.location = "https://kasimirtanner.ch/minute/share.html?R_ID=" + localStorage.getItem("R_ID");
}

function LoginCallback(){
    if(localStorage.getItem("statuscode") != 200){
        writeErrorMessage("Das Passwort ist leider falsch.");
        return;
    }
    $("#errormessagecontainer").empty();
}


///////////////////////////////////
// Callbacks !!!!!!!!!!!!!!!!!!!!!!!!
///////////////////////////////

$(document).ready(function(){
    //Prerequisites
    if (typeof(Storage) === "undefined") {
    // Code for localStorage/sessionStorage.
        writeErrorMessage("Ihr Browser wird leider nicht unterstützt.");
        return;
    } 

    //Either request new Room or if Room id given, request room details
    

    var rid = getR_IDfromURL();
    localStorage.setItem("R_ID",rid);
    var jwt = localStorage.getItem("JWT");

    
    localStorage.setItem("location",rid);


    if(rid != ""){
        //Query room info
        SendQuery("room.php","GET",RoomInfoCallback,{"R_ID":rid,JWT:jwt});
    }else{
        //Request new room
        
        SendQuery("room.php","PUT",RoomCreationCallback);
    }

    //Behaviour:
    $("#openroom").click(function(){
        localStorage.setItem("R_ID",null);
        localStorage.setItem("JWT",null);
	 window.location.replace("share.html?R_ID="+$("#openroomtext").val());
    });

    $("#sperren").click(function(){
        SendQuery("room.php?R_ID=" + localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT"),"POST",function(){},{locked:1});
    });

    $("#save").click(function(){
        var name = $("#nameshow").val();
        var desc = $("#descshow").val();
        SendQuery("room.php?R_ID=" + localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT"),"POST",function(){},{name:name,description:desc});
    });

    $("#setpassword").click(function(){
        var p = $("#password").val();
        var p1 = $("#password2").val();
        if(p != p1){
            writeErrorMessage("Die Passwörter stimmen nicht überein");
     setTimeout(function(){$("#errormessagecontainer").empty();},4000);
	       return;
        }
        SendQuery("room.php?R_ID=" + localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT"),"POST",function(){},{password:p});
    });

    $("#loginbutton").click(function(){
        var p = $("#loginpassword").val();
        SendQuery("login.php?R_ID=" + localStorage.getItem("R_ID"),"POST",LoginCallback,{password:p});
    });

    $("#upload").click(function(){

        $("#uploadinput").click();


        
    });

    $("input[type=file]").change(function(){
        if(localStorage.getItem("locked") == 1){
            writeErrorMessage("Dieser Raum ist gesperrt. Sie können ihn nicht mehr bearbeiten.","warning");
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        var loc = localStorage.getItem("location");
        var cp = CreateQueryPath(loc);
        cp += "/";
        $(this).simpleUpload("https://kasimirtanner.ch/minute/files.php?R_ID=" + localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT") + "&path=" + cp, {
            start: function(file){
        	
		
	        $("#progresscontainer").removeClass().addClass("show");
                                $("#progressbar").attr("style","width: 0%");
                $("#progressbar").empty().append("0%");
            },

            progress: function(progress){
                $("#progressbar").attr("style","width: " +  Math.round(progress) + "%");
                $("#progressbar").empty().append(Math.round(progress)+"%");
                
            },

            success: function(data){
                $("#progresscontainer").removeClass().addClass("hidden");
                writeErrorMessage("Die Datei wurde erfolgreich hochgeladen.","success");
                setTimeout(function(){$("#errormessagecontainer").empty();},4000);
                SaveJsondataToLocalStorageAndUpdate(data);
		
            },

            error: function(error){
                $("#progresscontainer").removeClass().addClass("hidden");
                writeErrorMessage("Entschuldigung, die Datei konnte nicht hochgeladen werden.<br>Vielleicht steht nicht mehr genügend Speicherplatz zur Verfügung.","warning");
                setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            }


        });
    });


    $("#delete").click(function(){
        if(localStorage.getItem("locked") == 1){
            writeErrorMessage(localStorage.getItem("locked"));
            writeErrorMessage("Dieser Raum ist gesperrt. Sie können ihn nicht mehr bearbeiten.","warning");
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        var selected = GetCheckedBoxes();
        selected.forEach(function(item){
            var loc = localStorage.getItem("location");
            var cp = CreateQueryPath(loc);
            cp += "/";
            var todelete = cp + item.name;
            SendQuery("files.php?R_ID="+ localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT")   + "&delete=" + todelete,"DELETE");
        });
        if(selected.length == 0){
            writeErrorMessage("Wählen Sie zuerst eine Datei zum Löschen.","warning")
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);

        }
    });

    $("#folder").click(function(){
        if(localStorage.getItem("locked") == 1){
            writeErrorMessage("Dieser Raum ist gesperrt. Sie können ihn nicht mehr bearbeiten.","warning");
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        var foldername = prompt("Ordnername:");
        if(foldername != null){
            var loc = localStorage.getItem("location");
            var cp = CreateQueryPath(loc);
            cp += "/";
            SendQuery("files.php?R_ID="+ localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT")  + "&path=" + cp + "&name=" + foldername,"FOLD");
        }
    });

    $("#move").click(function(){
        if(localStorage.getItem("locked") == 1){
            writeErrorMessage("Dieser Raum ist gesperrt. Sie können ihn nicht mehr bearbeiten.","warning");
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        var selected = GetCheckedBoxes();
        if(selected.length > 1){
            writeErrorMessage("Sie können nur eine Datei auf einmal bewegen.","warning")
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        selected.forEach(function(item){
            var loc = localStorage.getItem("location");
            var cp = CreateQueryPath(loc);
            cp += "/"+item.name;
            localStorage.setItem("oldfilename",item.name);
            localStorage.setItem("oldfilepath",cp);
            $("#confirm").removeClass();
        });
        if(selected.length == 0){
            writeErrorMessage("Wählen Sie zuerst eine Datei zum Bewegen.","warning")
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
        }

    });

    $("#rename").click(function(){
        if(localStorage.getItem("locked") == 1){
            writeErrorMessage("Dieser Raum ist gesperrt. Sie können ihn nicht mehr bearbeiten.","warning");
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
            return;
        }
        var selected = GetCheckedBoxes();
        selected.forEach(function(item){
            var loc = localStorage.getItem("location");
            var cp = CreateQueryPath(loc);
            var cop = cp;
            cp += "/"+item.name;
            
            var t = "Datei";
            if(item.type == "folder")t="Ordner";
            var n = prompt(t + " " + item.name + " umbenennen zu:");
            if(n != null){
                var np = cop + "/" + n;
                SendQuery("files.php?R_ID="+ localStorage.getItem("R_ID") + "&JWT=" + localStorage.getItem("JWT")  + "&oldname=" + cp + "&newname=" + np,"PUT");
            }
        });
        if(selected.length == 0){
            writeErrorMessage("Wählen Sie zuerst eine Datei zum Umbenennen.","warning")
            setTimeout(function(){$("#errormessagecontainer").empty();},4000);
        }
    });

   

});

