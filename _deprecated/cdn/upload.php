<?php
error_reporting(0);
date_default_timezone_set("Asia/Taipei");
header('Access-Control-Allow-Origin: https://chat.snkms.com');
header("Access-Control-Allow-Methods: POST, OPTIONS");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] != 'OPTIONS' && $_SERVER['REQUEST_METHOD'] != "POST")
	http_response_code(403);

function generateRdStr($length = 11) {
	$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[mt_rand(0, strlen($characters) - 1)];
    }
	
    return $randomString;
}

if($_POST['submit']){
	require_once(__DIR__.'/php_api/class.imageresize.php');
	$arr = array();
	$fileCount = count($_FILES["fileToUpload"]["name"]);
	
	for($i=0;$i<$fileCount;$i++){
		$MIME = mime_content_type($_FILES["fileToUpload"]["tmp_name"][$i]);
		if($_FILES["fileToUpload"]["size"][$i] > 8388608) continue;
		
		$fileHash = hash_file('sha1', $_FILES["fileToUpload"]["tmp_name"][$i]);
		$fileHashHeader = substr($fileHash,0,2);
		$randomID = generateRdStr();
		$dest = __DIR__ . "/files/$fileHashHeader/";
		
		if(!is_dir($dest))
			mkdir($dest);
		
		if(preg_match('/^image\//i',$MIME)){
			$image = new ImageResize($_FILES["fileToUpload"]["tmp_name"][$i]);

			if($MIME == "image/gif"){
				$ext = ".gif";
				$dest = $dest . $fileHash . $ext;
				
				move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
				$compressed = false;
			}
			else if($_FILES["fileToUpload"]["size"][$i] > 819200) { // 800KB
				$dest = $dest.$fileHash.".jpg";
				$image->save($dest,IMAGETYPE_JPEG);
				
				$compressed = true;
				$tmp = $dest;
				$ext = ".jpg";
			}
			else{
				$ext = ".".end(explode('/',$MIME));
				$tmp = $_FILES["fileToUpload"]["tmp_name"][$i];
				$dest = $dest.$fileHash.$ext;
				$compressed = false;
				
				move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
			}
			
			array_push($arr,array(
				"url"=>"https://".$_SERVER['HTTP_HOST']."/files/$fileHashHeader/$fileHash$ext?fileName=".$_FILES["fileToUpload"]["name"][$i],
				"name"=>$_FILES["fileToUpload"]["name"][$i],
				"compressed"=>$compressed,
				"size"=>array(
					"upload"=>$_FILES["fileToUpload"]["size"][$i],
					"cloud"=>filesize($dest)
				)
			));
		
		}
		else{
			$arrName = explode('.',$_FILES["fileToUpload"]["name"][$i]);
			$ext = (count($arrName) > 1)?".".end($arrName):"";
			$dest = $dest.$fileHash.$ext;
			
			move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
			
			array_push($arr,array(
				"url"=>"https://".$_SERVER['HTTP_HOST']."/files/$fileHashHeader/$fileHash$ext?fileName=".$_FILES["fileToUpload"]["name"][$i],
				"name"=>$_FILES["fileToUpload"]["name"][$i],
				"compressed"=>false,
				"size"=>array(
					"upload"=>$_FILES["fileToUpload"]["size"][$i],
					"cloud"=>filesize($dest)
				)
			));
		}
	}
	
	if(count($arr)==0)
		http_response_code(422);
	else
		http_response_code(200);
	
	echo json_encode($arr);
}