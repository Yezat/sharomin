<?php
require 'base.php';


$R_ID = $_GET["R_ID"];
$JWT = $_GET["JWT"];
$path = $_GET["path"];
if(AuthenticateUser($R_ID,$JWT)){
     $roompath = "/home/pi/Webdetails/RoomFolders/".$R_ID;

    if($_SERVER["REQUEST_METHOD"] == "GET"){//serves file


        if(file_exists($roompath.$path)){
		    $file_name = $roompath . $path;
		
            header("Content-Length: " . filesize($file_name)); // Sets HTTP header
            header("Content-type: application/octet-stream");
            header('Content-Disposition: attachment; filename="' . basename($file_name) . '"');
        
            ob_clean(); //Löscht Ausgabepuffer, vermute, dass dies die response cleart.
            flush(); //Sendet ausgabepuffer
            readfile($file_name);//Sendet Datei
            exit;

        }else{
            http_response_code(400);
            die();
        }

        

    }else{
        http_response_code(501);
        die();
    }

}else{
    http_response_code(403);
    die();
}



?>
