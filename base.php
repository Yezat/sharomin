<?php
require_once 'vendor/autoload.php'; // Needed to load the JSON Webtoken tool

use Lcobucci\JWT\Builder; // A tool used for JSON Webtokens
use Lcobucci\JWT\ValidationData;
use Lcobucci\JWT\Parser;
use Lcobucci\JWT\Signer\Hmac\Sha256;

    


    function EstablishDatabaseConnection(){

        $passwordfile = fopen("/home/pi/Webdetails/file.sugar","r");
        $password = fread($passwordfile,filesize("/home/pi/Webdetails/file.sugar"));
        fclose($passwordfile);

        if(substr($password,-1) == "\n"){
            $password = substr($password,0,strlen($password)-1);
        }


        $servername = "localhost";
        $username ="usr";
        $dbname = "Sharomin";


        //Connect to Shamin database
        $conn = new mysqli($servername,$username, $password, $dbname);

        //Does the connection work?
        if ($conn->connect_error){
            http_response_code(503);
            die();
        }


        return $conn;
    }

    function GetNewR_ID(){
        //Do we even have enough space?
        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select Count(R_ID) from Rooms");
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_row();

        if($row[0] > 30){
	        header("X-PHP-Response-Code:",true,511); // Tried multiple ways of setting the response code. Had problems to find a responsecode supported by Apache and clientbrowsers. finally I just chose this method because it worked http_response_code(511) might work aswell
            die();
        }


        $id = rand(1111,999999); 
        $iterations = 0;
        while(DoesIDExist($id)){
            $id = rand(1111,999999);
            $iterations += 1;
            if($iterations > 9999999){ // unlikely to ever happen
                return false;
            }
        }
        return $id;
    }


    function IsRoomLocked($R_ID){ //Checks if a room is still editable
        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select Locked from Rooms where R_ID = ?"); 
        $stmt->bind_param("i",$R_ID);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_row();
        if($row[0])return true;
        return false;
    }

    function DeleteRoom($R_ID){
        //Deletes room from database and deletes all files and the room folder...
        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Delete from Rooms where R_ID = ?");
        $stmt->bind_param("i",$R_ID);
        $stmt->execute();
        $stmt->close();
        DeleteFiles("/home/pi/Webdetails/RoomFolders/".$R_ID."/");
    }

    function DeleteFiles($dir){
        foreach(glob($dir . '/*') as $file) { 
            if(is_dir($file)) DeleteFiles($file); else unlink($file); //Unlink deletes a file
        } rmdir($dir); //removes a dir -> must be empty (see top)
    }

    function FilesystemToJson($dir){ // a way of representing the filesystem tree in json
        /////////////////////
        //NOTE TO ME
        //In later version: only create Jsonencode as soon as the object has been created. make the json readable. with this solution (well no json at all but if we used json) we would have json within json within ....
        ///////////////////////////
        $ob = new stdClass(); //An empty class
        $ob->name = basename($dir);
        $ob->children = "";
        foreach(glob($dir . "/*") as $file){ //glob returns all pathnames matching the pattern /* gives thus all pathnames within the directory $dir
            if(is_dir($file)){
                $ob->children = $ob->children . FilesystemToJson($dir . "/" . basename($file)) . ",";
            }else{
                $ob->children = $ob->children . basename($file) ."," ;
                
            }
        }
        return "{name:".$ob->name.",children:{".$ob->children."}}"; //It's not actually JSON anymore. I think this way the result is shorter and more humanreadable. Involves though some more sophisticated code on the client side. 
    }

    function CreateRoom($R_ID){
        //inserts a new database record and creates the room directory
        mkdir("/home/pi/Webdetails/RoomFolders/" . $R_ID ."/");//Directory created
        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Insert Into Rooms(R_ID,Established,Expirates,Locked,FreeSpace) Values(?,?,?,FALSE,?)");
        $ex = time() + 4*24*3600;
        $t = time();
        $space = 100000000;
        $stmt->bind_param("iiii",$R_ID,$t,$ex,$space); //4 days availability and 100 MB space...
        $stmt->execute();
        $stmt->close();
    }

    function RenameDir($old,$new){ // Creates a new directory and copies the old ones content to the new one
        if(!is_dir($old)){
            http_response_code(400);
            die();
        }
        //Create the new folder
        mkdir($new);
        if(substr($old, -1) == '/'){ // -1 start at the end of the string
            $dir = $old . "*";
        }else{
            $dir = $old. "/*";
        }
        
        foreach(glob($dir) as $file){
            if(is_dir($file)){
                RenameDir($file,$new. "/".basename($file));
            }else{
                rename($file,$new. "/" .basename($file));
            }
        }
        rmdir($old);
    }


    function AuthenticateUser($R_ID,$JWT){
        //Is R_ID even set? can't AuthenticateUser when R_ID isn't set... 
        if(!DoesIDExist($R_ID)){
            return false;
        }

        //Is user with jwt allowed to see content of r_id?
        if(AuthenticationNeeded($R_ID)){
            if(IsJWTValid($R_ID,$JWT)){
                return true;
            }
            return false;
        }
        return true;
    }

    function GetJWT($R_ID){ //Create a JSON Webtoken for a specific R_ID using thirdparty software lcobbuci
        $saltfile = fopen("/home/pi/Webdetails/saltfile.sugar","r");
        $salt = fread($saltfile,filesize("/home/pi/Webdetails/saltfile.sugar"));
        fclose($saltfile);
        $signer = new Sha256();
        $token = (new Builder())->setIssuer('https://kasimirtanner.ch')// Configures the issuer (iss claim)
                                ->setAudience($_SERVER['REMOTE_ADDR']) // Configures the audience (aud claim)
                                ->setIssuedAt(time()) // Configures the time that the token was issue (iat claim)
                                ->setNotBefore(time()) // Configures the time that the token can be used (nbf claim)
                                ->setExpiration(time() + 3600) // Configures the expiration time of the token (nbf claim)
                                ->setId($R_ID,true)
                                ->sign($signer, $salt) 
                                ->getToken(); // Retrieves the generated token
        return $token;
    }

    function IsJWTValid($R_ID,$JWT){ 
        $saltfile = fopen("/home/pi/Webdetails/saltfile.sugar","r");
        $salt = fread($saltfile,filesize("/home/pi/Webdetails/saltfile.sugar"));
        fclose($saltfile);   

        $signer = new Sha256();

        try{
            $token = (new Parser())->parse((string) $JWT); // Parses from a string
            if($token->verify($signer,$salt)){
                $data = new ValidationData();
                $data->setIssuer("https://kasimirtanner.ch");
                $data->setAudience($_SERVER["REMOTE_ADDR"]);
                $data->setId($R_ID);
            
                
                if($token->validate($data)){ //I think timestamps are checked automatically
                    return true;
                }
            }
        }catch(Exception $e){
            http_response_code(400);
            die();
        }
        return false;
        
    }

    function ServeRoomWithJWT($R_ID,$JWT){
        //Serves room properties and jwt in json
        $json = new stdClass(); //A std Class
        $json->R_ID = $R_ID;
        $json->JWT = (string)$JWT;
        $json->URL = "/room.php?R_ID=" . $R_ID . "&JWT=" . $JWT;
        $json->filesystem = FilesystemToJson("/home/pi/Webdetails/RoomFolders/".$R_ID);

        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select Name,Description,Established,Expirates,Locked,Password,FreeSpace from Rooms where R_ID = ?");
        $stmt->bind_param("i",$R_ID);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $row = $result->fetch_row();


        $json->Name = $row[0];
        $json->Description = $row[1];
        $json->TimeLeft = $row[3]-time();
        $json->Locked = $row[4];

        if($row[5] == "")
            $json->Password=0;
        else
            $json->Password=1;

        $json->FreeSpace = $row[6];

        echo json_encode($json);
    }

    function WriteLog($log){
        
        $logfile = "/home/pi/Webdetails/log.sugar";
        
        file_put_contents($logfile, "LOG: ". date("d.m.Y") . " " . date("H:i:s") ."\n".$log .  "\n\n" , FILE_APPEND | LOCK_EX);
    }

    function DoesIDExist($id){

        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select R_ID,Expirates from Rooms");

	    $stmt->execute();
        $result = $stmt->get_result();

	    while($row = $result->fetch_row()){
            if($row[0] == $id){

                if($row[1] < time()){
                    //Room expired...$_COOKI
                    DeleteRoom($id);
                    $stmt->close();
                    return false;
                    
                }
                $stmt->close();
                return true;
            }
        }
        $stmt->close();
        return false;
    }

    function AuthenticationNeeded($R_ID){
        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select Password from Rooms where R_ID = ?");
        $stmt->bind_param("i",$R_ID);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_row();
        if($row[0]){
            $stmt->close();
            return true;
        }
        $stmt->close();
        return false;
    }



?>
