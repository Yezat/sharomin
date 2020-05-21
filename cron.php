<?php

/////////////
// Executed every hour by a cron job

require "base.php";

WriteLog("CRONCALL");


$conn = EstablishDatabaseConnection();
$stmt = $conn->Prepare("Select R_ID,FreeSpace,Expirates,Established from Rooms");
$stmt->execute();
$result = $stmt->get_result();


$deleted = 0;

while($row = $result->fetch_row()){
    if($row[2] < time()){
        DeleteRoom($row[0]);
        $deleted = $deleted + 1;
    }else if($row[1] == 100000000 && $row[3] + 3600 < time()){ //Nothing has been uploaded within an hour
        DeleteRoom($row[0]);
        $deleted = $deleted + 1;
    }
}
$stmt->close();

WriteLog("DELETED $deleted ROOMS");





?>