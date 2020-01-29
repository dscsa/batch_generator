function convertAllExcelsToGSheet(folder_id, discard_folder_id) {

 var folder = DriveApp.getFolderById(folder_id)
 var discard_folder = DriveApp.getFolderById(discard_folder_id)
 var files = folder.getFilesByType(MimeType.MICROSOFT_EXCEL)

 while(files.hasNext()){
   var file = files.next()
   var fileId = file.getId();
   var blob = file.getBlob();
   var resource = {
        'title': file.getName(),
        'mimeType': MimeType.GOOGLE_SHEETS,
        'parents': [{id: folder_id}],
   };
      
   Drive.Files.insert(resource, blob);
   discard_folder.addFile(file)
   folder.removeFile(file)
 }

}



function testPharmConvert(){
  var f_id = "1qYgcrm4I36rf6XPiMka7Z3wuV11QJBe6"
  var d_id = "1I8V58JEywdLwpBH7dFYpNNVZbuToQ2dx"
  convertAllCSVToGSheet(f_id,d_id)
}



function convertAllCSVToGSheet(folder_id, discard_folder_id){

  var folder = DriveApp.getFolderById(folder_id)
  var discard_folder = DriveApp.getFolderById(discard_folder_id)
  var files = folder.getFilesByType(MimeType.CSV)

  while(files.hasNext()){
    var csv_file = files.next();
    var new_file = SpreadsheetApp.create(csv_file.getName()) //add a gsheet file
    folder.addFile(DriveApp.getFileById(new_file.getId()))
    var sheet = new_file.getSheets()[0]
    var csvData = Utilities.parseCsv(csv_file.getBlob().getDataAsString());
    sheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
    
    discard_folder.addFile(csv_file)
    folder.removeFile(csv_file)
    
  }
  
  

}