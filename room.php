<?php
require "base.php";

if($_SERVER["REQUEST_METHOD"] == "GET"){
    //Serve room details
    //Room id must be known
    //If Room is PW protected user must be authenticated
    //We need R_ID and JWT via _Get
    $R_ID = $_GET["R_ID"];
    $JWT = $_GET["JWT"];


    //Does R_ID even exist?
    if(!DoesIDExist($R_ID)){
	
        http_response_code(404); //Resource not found (or gone...)
        die();
    }

    //Must the user be authenticated?
    if(AuthenticateUser($R_ID,$JWT)){
        ServeRoomWithJWT($R_ID,$JWT);
        die();// we're done
    }
    http_response_code(403); //Forbidden
    die();

}else if($_SERVER["REQUEST_METHOD"] == "PUT"){
    //Max Room Number = 30
    //Create room then serve it 
    //User doesn't have to be authenticated
    //No ?vars= needed
    //Then serve the room
    $R_ID = GetNewR_ID();
    CreateRoom($R_ID);
    $JWT = NULL;
    ServeRoomWithJWT($R_ID,$JWT);
    
    die();

}else if($_SERVER["REQUEST_METHOD"] == "POST"){
    //Update room details
    //Room id must be known
    //if Room is locked this is impossible
    //if room is pw protected user must be authenticated
    //Then Serve the room
    $R_ID = $_GET["R_ID"];
    $JWT = $_GET["JWT"];

    //Does R_ID even exist?
    if(!DoesIDExist($R_ID)){
        http_response_code(404); //Resource not found (or gone...)
        die();
    }
    
    //Check wheter Room is Locked..
    if(!IsRoomLocked($R_ID)){
        //authenticate
        if(AuthenticateUser($R_ID,$JWT)){
            //Update the values;
            //Updatable: Name,Description,Locked (only to lock), Password (only once)
            
            //Get old values:
            $conn = EstablishDatabaseConnection();
            $stmt = $conn->prepare("Select Name,Description,Locked,Password from Rooms where R_ID = ?");
            $stmt->bind_param("i",$R_ID);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_row();


            //Fetch new Values:
            $Name = $_POST["name"] != "" ? $_POST["name"] : $row[0] ;
            $Description = $_POST["description"] ? $_POST["description"] : $row[1];
            $Locked = $row[2] ? true : $_POST["locked"];

            if($_POST["locked"] == 1 or $_POST["locked"] == true){
                $Locked = true;
            }else{
                $Locked = false;
                if($row[2] == true){
                    $Locked = true;
                }
            }


            if($row[3] != NULL){
                $Password = $row[3];
            }else{
                if($_POST["password"] != ""){
                    $Password = password_hash($_POST["password"],PASSWORD_DEFAULT);
                    $JWT = GetJWT($R_ID);
                }else{
                    $Password = NULL;
                }
            }




            //update 
            $stmt->close();

            $stmt = $conn->prepare("Update Rooms Set Name = ?, Description = ?, Locked = ?, Password = ? Where R_ID = ?");
            $stmt->bind_param("ssisi",$Name,$Description,$Locked,$Password,$R_ID);
            $stmt->execute();
            $stmt->close();//Assuming everything went fine...
            ServeRoomWithJWT($R_ID,$JWT);
            die();// we're done
        }
    }
    //Forbidden
    http_response_code(403);
    die();


}else{//An unserved REQUEST_METHOD http_response_code 501 -> "Not implemented"
    http_response_code(501);
    die();
}

?>
