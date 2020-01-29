


//-------------------------------PHARMERICA--------------------------------------------------------------------------------------






function pharmericaSplit(){
  var source_folder = DriveApp.getFolderById(pharmerica_source()); 
  var uploaded_folder = DriveApp.getFolderById(pharmerica_uploaded());
  
  convertAllCSVToGSheet(pharmerica_source(), PHARMERICA_CSV) //in case there are any csv's sitting there
  
  
  var backend_sh = SpreadsheetApp.openById(backendSheetID())
  //var transfer_list = getTransferList(backend_sh)

  
  var sh = SpreadsheetApp.getActiveSpreadsheet();
  var error_sheet = sh.getSheetByName('raw_errors')
  var files = source_folder.getFilesByType('application/vnd.google-apps.spreadsheet') //TODO return to this
  //var files = DriveApp.getFilesByName("Pharmerica End-of-year OS UPLOADING") //Point this at a file with the proper Pharmerica format for specific files, or for end-of-year

  var file_counter = 0
  var month = ""
  
  while(files.hasNext() && file_counter < 1){
    file_counter += 1
    var file = files.next() //only do one at a time
    while((file.getName().indexOf("SIRUM ONLY") > -1) && (files.hasNext())){
      file = files.next()
    }
    if(file.getName().indexOf("SIRUM ONLY") == -1){
    
      Logger.log(file.getName())
      var row_counter = 0;
      var time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
      
      //first sheet
      sh.insertSheet('pharmerica_batch_' + time_stamp)
      var collate_sheet = sh.getSheetByName('pharmerica_batch_' + time_stamp);
      
      //Get full range of data
      var upload_sheet = SpreadsheetApp.open(file).getSheets()[0]
      var SRange = upload_sheet.getDataRange();
      //get the data values in range
      var SData = SRange.getValues(); //2d array of the upload sheet to be split
     
      var top_rows = []
      var copyData = []
    
      for(var i = 0; i < SData.length; i++){
      
        if(i < 6){
          top_rows.push(SData[i])
          row_counter += 1
          continue
        }
        
        if(i == 6){
          Logger.log(top_rows)
          //then add the top rows
          
          for(var j = 0; j < top_rows.length; j++){
            top_rows[j].push(" ")
            collate_sheet.appendRow(top_rows[j])
          }
        }
        
        if(row_counter > 2450){
          var last_full_row = collate_sheet.getLastRow();
          collate_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
          collate_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);
        
          //scanForTransfers(top_rows, copyData, transfer_list, sh) //before copying in these values, scan them and check if they need to be duplicated, if so, also insert the duplicate batch
        
          time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
          sh.insertSheet('pharmerica_batch_' + time_stamp)
          collate_sheet = sh.getSheetByName('pharmerica_batch_' + time_stamp);   
          //then add the top rows
          for(var j = 0; j < top_rows.length; j++){
            collate_sheet.appendRow(top_rows[j])
          }
          row_counter = 0
          copyData = []
        }
        
        copyData.push(SData[i])
        row_counter += 1        
     }
      //for the last bit
    if(copyData.length > 0){
      var last_full_row = collate_sheet.getLastRow();
      collate_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
      collate_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);
      //scanForTransfers(top_rows,copyData, transfer_list,sh)
    }
      
    uploaded_folder.addFile(file); //TODO uncomment
    source_folder.removeFile(file); 
    }
  }
}



function scanForTransfers(top_rows,items_data, transfer_list,sh){
  for(var n = 0; n < transfer_list.length; n++){
    var original_donor = transfer_list[n][0]
    var new_donor = transfer_list[n][1] //also the original recipient. There's anew recipent field in the orignal page, but not yet necessary to pull that over

    var duplicate_items_data = []
    for(var i = 0; i < items_data.length; i++){
      if(items_data[i][1].trim() == original_donor){
        var temp_copy = items_data[i].slice() //make a copy
        temp_copy[1] = new_donor
        duplicate_items_data.push(temp_copy)
      }
    }

    if(duplicate_items_data.length > 0){ //then make a sheet for this transfer data, and it'll upload along with the regular batches
      var time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
      var transfer_sheet = sh.insertSheet('pharmerica_transfer_batch_' + time_stamp)
      
      for(var j = 0; j < top_rows.length; j++){
        transfer_sheet.appendRow(top_rows[j])
      }
      
      var last_full_row = transfer_sheet.getLastRow();
      transfer_sheet.insertRows(last_full_row+1, duplicate_items_data.length); //add empty rows
      transfer_sheet.getRange(last_full_row+1, 1, duplicate_items_data.length, duplicate_items_data[0].length).setValues(duplicate_items_data);
      
    }
  }
}


function getTransferList(backend_sh){
  var data = backend_sh.getSheetByName('Transfer Facilities').getDataRange().getValues()
  var res = []
  for(var i = 1; i < data.length; i++){
     if(data[i][0].toString().length > 0){
       res.push([data[i][0].toString().trim(),data[i][1].toString().trim()])
     }
  }
  return res

}