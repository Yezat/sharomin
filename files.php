<?php

require 'base.php';

$R_ID = $_GET["R_ID"];//We authenticate first since any file related interaction requires authentication
$JWT = $_GET["JWT"];


if(AuthenticateUser($R_ID,$JWT)){

    $roompath = "/home/pi/Webdetails/RoomFolders/".$R_ID;


    if($_SERVER["REQUEST_METHOD"] == "GET"){//Serves directory:
        ServeRoomWithJWT($R_ID,$JWT);
    }else if($_SERVER["REQUEST_METHOD"] == "PUT"){
        $Oldname = $_GET["oldname"]; // Renames file works also as a file mover
        $Newname = $_GET["newname"];
        $dir = $roompath."/";        
        if(!rename($dir.$Oldname,$dir.$Newname)){
            if(is_dir($dir.$Oldname)){
                RenameDir($dir.$Oldname,$dir.$Newname);
                
            }else{
                http_response_code(400);
                die();
            }
        }
        ServeRoomWithJWT($R_ID,$JWT);


    }else if ($_SERVER["REQUEST_METHOD"] == "POST"){//uploads exactly one file...
        $path = $_GET["path"];
        $dir = $roompath . "/" . $path .  "";

        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Select FreeSpace from Rooms where R_ID = ?");
        $stmt->bind_param("i",$R_ID);
        $stmt->execute();
        $result = $stmt->get_result();
        $freespace = $result->fetch_row()[0];
        
        if($_FILES["file"]["error"] == 0){ // No error

            $filesize = $_FILES["file"]["size"];

            if($filesize < $freespace){//Enough free space

                $tmplocation = $_FILES["file"]["tmp_name"];
                $filelocation = $dir.$_FILES["file"]["name"];

                if(move_uploaded_file($tmplocation,$filelocation)){
                    $freespace = $freespace -$filesize;
                }else{
                    http_response_code(400);
                    die();
                }

            }else{
                http_response_code(400);
                die();
            }


        }else{
            http_response_code(400);
            die();
        }

        $stmt->close();
        $stmt = $conn->prepare("Update Rooms Set FreeSpace = ? Where R_ID = ?");
        $stmt->bind_param("ii",$freespace,$R_ID);
        $stmt->execute();
        $stmt->close();

        ServeRoomWithJWT($R_ID,$JWT);

    }else if ($_SERVER["REQUEST_METHOD"] == "FOLD"){//Creates folder
        $path = $_GET["path"];
        $name = $_GET["name"];
        if(substr($path,-1)!="/"){
            $path = $path . "/";
        }
        mkdir($roompath."/".$path.$name);

        ServeRoomWithJWT($R_ID,$JWT);

    }else if ($_SERVER["REQUEST_METHOD"] == "DELETE"){
        $filetodelete = $_GET["delete"];
        $file = $roompath . "/" . $filetodelete;
        if(is_dir($file)){
            DeleteFiles($file);
        }else {
            if(!unlink($file))
                http_response_code(400);
        }
	
        $f = "/home/pi/Webdetails/RoomFolders/" + $R_ID;
        $size = 0;
        
        $f = realpath($path);
        
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($f, FilesystemIterator::SKIP_DOTS)) as $object){
            if(!is_dir($object->getPath())){ //We don't count directory space... isn't this a possible vulnerability?
                $size += filesize($object->getPath());
            }
        }
        
        
        
        $free = 100000000 - $size;

        $conn = EstablishDatabaseConnection();
        $stmt = $conn->prepare("Update Rooms set FreeSpace = ? where R_ID = ?");
        $stmt->bind_param("ii",$free,$R_ID);
        $stmt->execute();
        $stmt->close();
	

        ServeRoomWithJWT($R_ID,$JWT);

    }else{
        //Unknown request_method
        http_response_code(501); //not implemented
        die();
    }


}else{
    http_response_code(403); //Forbidden
    die();
}

?>
