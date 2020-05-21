<?php
require "base.php";


if($_SERVER["REQUEST_METHOD"] == "POST"){

    $R_ID = $_GET["R_ID"];
    $Password = $_POST["password"];

    $conn = EstablishDatabaseConnection();
    $stmt = $conn->prepare("Select Password from Rooms where R_ID = ?");
    $stmt->bind_param("i",$R_ID);
    $stmt->execute();
    
    $result = $stmt->get_result();
    if(password_verify($Password,$result->fetch_row()[0])){ 

        $JWT = GetJWT($R_ID);
        ServeRoomWithJWT($R_ID,$JWT);
        http_response_code(200);
        $stmt->close();
        die();

    }
    $stmt->close();

    http_response_code(403);

    die();
}
http_response_code(418); //I'm a teapot
die();



?>
