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
	require_once(getcwd().'/php_api/class.imageresize.php');
	$arr = array();
	$fileCount = count($_FILES["fileToUpload"]["name"]);
	
	for($i=0;$i<$fileCount;$i++){
		$MIME = mime_content_type($_FILES["fileToUpload"]["tmp_name"][$i]);
		if($_FILES["fileToUpload"]["size"][$i] > 8388608) continue;
		
		if(preg_match('/^image\//i',$MIME)){
			$image = new ImageResize($_FILES["fileToUpload"]["tmp_name"][$i]);
			$randomID = generateRdStr();
			
			
			if($MIME == "image/gif"){
				$dest = getcwd()."/images/".$randomID.".gif";
				$ext = ".gif";
				
				/*
				$tmpImage = imagecreatefromgif($_FILES["fileToUpload"]["tmp_name"][$i]);
				imagetruecolortopalette($tmpImage, false, 64);
				imagegif($tmpImage, $dest);
				*/
				
				
				move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
				$compressed = false;
			}
			else if($_FILES["fileToUpload"]["size"][$i] > 819200) { // 800KB
				$dest = getcwd()."/images/".$randomID.".jpg";
				$image->save($dest,IMAGETYPE_JPEG);
				
				$compressed = true;
				$tmp = $dest;
				$ext = ".jpg";
			}
			else{
				$ext = ".".end(explode('/',$MIME));
				$tmp = $_FILES["fileToUpload"]["tmp_name"][$i];
				$dest = getcwd()."/images/".$randomID.$ext;
				$compressed = false;
				
				move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
			}
			
			array_push($arr,array(
				"url"=>"https://".$_SERVER['HTTP_HOST']."/images/".$randomID.$ext,
				"name"=>$_FILES["fileToUpload"]["name"][$i],
				"compressed"=>$compressed,
				"size"=>array(
					"upload"=>$_FILES["fileToUpload"]["size"][$i],
					"cloud"=>filesize($dest)
				)
			));
		
		}
		else{
			$randomID = generateRdStr();
			$arrName = explode('.',$_FILES["fileToUpload"]["name"][$i]);
			$ext = (count($arrName) > 1)?".".end($arrName):"";
			$filefullname = str_replace(" ","_",$_FILES["fileToUpload"]["name"][$i]);
			$extIndex = ($ext)?strpos($filefullname,$ext):"";
			$filename = ($ext)?substr($filefullname,0,$extIndex):$filefullname;
			
			$dest = getcwd()."/files/".$filename."_".$randomID.$ext;
			move_uploaded_file($_FILES["fileToUpload"]["tmp_name"][$i], $dest);
			
			array_push($arr,array(
				"url"=>"https://".$_SERVER['HTTP_HOST']."/files/".$filename."_".$randomID.$ext,
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
	
	//print_r($arr);
	
	echo json_encode($arr);
	
	/*
	$image = new ImageResize($_FILES["fileToUpload"]["tmp_name"]);
	$randomID = generateRdStr();
		
	if($_FILES["fileToUpload"]["size"] > 819200) { // 800KB
		$dest = getcwd()."/images/".$randomID.".jpg";
		$image->save($dest,IMAGETYPE_JPEG);	
		$tmp = $dest;
		$ext = ".jpg";
			
		echo "Compressed<br/>";
	}
	else{
		echo "Not compress<br/>";
		$ext = ".".strtolower(end((explode(".", $_FILES["fileToUpload"]["name"]))));
		$tmp = $_FILES["fileToUpload"]["tmp_name"];
		$dest = getcwd()."/images/".$randomID.$ext;
		rename($_FILES["fileToUpload"]["tmp_name"], $dest);
	}
	echo $tmp .">>".$dest;
	echo "<div>Upload Success > ".$_FILES["fileToUpload"]["name"]."</div>";
	echo '<div><a href="https://cdn.eoe.asia/images/'.$randomID.$ext.'">https://cdn.eoe.asia/images/'.$randomID.$ext.'</a></div>';
	*/
}