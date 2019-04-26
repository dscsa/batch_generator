function cleanOutGenerator() {
  //go through all sheets
  //if tagged done, move them to an archive file
  //keep track of numnber of sheets per archive
  //when creating a file, note the first batch's timestamp
  
  //when closing a batch, note the last batch timestampt
  var timestamp = Utilities.formatDate(new Date(), "GMT-04:00", "MM-dd-yyyy");
  var sh = SpreadsheetApp.openById(activeSpreadsheetID())
  var sheets = sh.getSheets()
  var sheets_to_archive = []
  
  for(var i = 0; i < sheets.length; i++){
     var sheet_name = sheets[i].getName()
      if((sheet_name.indexOf("batch") > -1) && (sheet_name.toLowerCase().indexOf("done") > -1)){
        sheets_to_archive.push(sheets[i])
      }
  }
  
  
  var archives_folder = DriveApp.getFolderById(archivesFolderID())
  var archives_files = archives_folder.getFiles()
  
  var current_file = archives_files.next()
  //get the latest sheet, by looping through & finding the one with the most recent lastUpdated date
  while(archives_files.hasNext()){
    var test_sheet = archives_files.next()
    if(test_sheet.getLastUpdated().getTime() > current_file.getLastUpdated().getTime()){
      current_file = test_sheet
    }
  }

  var current_sheet = SpreadsheetApp.open(current_file)
  
  for(var i = sheets_to_archive.length - 1; i >= 0; i--){ //do it backwards in case delete messes with anything
    var sheet_to_archive = sheets_to_archive[i]
    
    if(current_sheet.getSheets().length >= 30){
      Logger.log("hit max on sheet");
      //current_file.setName(current_file.getName() + " Closed on: " + timestamp)//rename current_sheet
      var new_name = "Uploaded Batches Started on: " + timestamp
      current_sheet = SpreadsheetApp.create(new_name)
      //move the new spreadsheet into this file
      current_file = DriveApp.getFileById(current_sheet.getId())
      archives_folder.addFile(current_file)
      DriveApp.getRootFolder().removeFile(current_file)
      
    }
    sheet_to_archive.copyTo(current_sheet)
    //TODO: then delete the sheet from this doc
    sh.deleteSheet(sheet_to_archive);
  }  
}
