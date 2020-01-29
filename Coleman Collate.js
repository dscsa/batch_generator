


//-------------------------------COLEMAN--------------------------------------------------------------------------------------
//Handling the google sheets they build out


function process_coleman_rows(file, tracking_num, collate_sheet, error_sheet, old_row, sh,backend_sh){
     var curr_spreadsheet = SpreadsheetApp.open(file);
     var upload_sheet = curr_spreadsheet.getSheetByName('SIRUM Only CSV Upload');
     var today = Utilities.formatDate(new Date(), "GMT", "MM/dd/yyyy hh:mm:ss").toString()
     var item_count = 0
    //Get full range of data
    var SRange = upload_sheet.getDataRange();
    //get the data values in range
    var SData = SRange.getValues(); //2d array
    
    var copyData = []
    var qty_tracker = 0
    
    for(var i = 1; i < SData.length; i++){
      if((SData[i][0].toString().trim().length > 0) && (SData[i][0].toString().trim() != "#N/A")){
        var new_arr = SData[i]
        new_arr[1] = new_arr[1].toString().replace("?","%");
        copyData.push(new_arr)
        qty_tracker += parseInt(new_arr[2])
        if(new_arr.length == 3) copyData[copyData.length-1].push(""); 

        copyData[copyData.length-1].push(tracking_num);
        copyData[copyData.length-1].push(today);
        item_count += 1;
      }
    }
    
    //add appropraite row to the tracking sheet
    backend_sh.getSheetByName('tracking_sheet').appendRow([file.getName(),tracking_num,"",qty_tracker,item_count])
    if(copyData.length > 0){
    
      var last_full_row = collate_sheet.getLastRow();
      collate_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
    
      collate_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);
    
      return old_row + copyData.length;
      
    } else {
      return old_row;
    } 
}




function colemanCollate(){
  var source_folder = DriveApp.getFolderById(coleman_source()); 
  var uploaded_folder = DriveApp.getFolderById(coleman_finished()); 
  
  var sh = SpreadsheetApp.getActiveSpreadsheet();
  var backend_sh = SpreadsheetApp.openById(backendSheetID())

  var error_sheet = sh.getSheetByName('raw_errors')

  var files = source_folder.getFilesByType('application/vnd.google-apps.spreadsheet')
  var file_names = [];
  var file_counter = 0;

  //modify these depending on how/when you're running it: default is to run it with row = 0, sheet = 0, and the sheet name as collate_sheet
  //but if working in continuing another incomplete run
  var row_counter = 0;
  var time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
  sh.insertSheet('coleman_batch_' + time_stamp)
  var sheet = sh.getSheetByName('coleman_batch_' + time_stamp);
  
  sheet.appendRow(['ndc','Drug Name', 'Qty',  'colorado_exact_ndc','tracking num', 'collated_timestamp'])
  
  while (files.hasNext() && file_counter < 200){ 
    var error = false

    if(row_counter > 2400){
      time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
      sh.insertSheet('coleman_batch_' + time_stamp)
      var sheet = sh.getSheetByName('coleman_batch_' + time_stamp);      
      sheet.appendRow(['ndc','Drug Name', 'Qty', 'colorado_exact_ndc', 'tracking num','collated_timestamp'])
      row_counter = 0;
    }
    
    var file = files.next();
    file_counter += 1;
    file_names.push(file.getName());
    
    var file_name = file.getName();
    var regExp = new RegExp("([0-9]{15})", "gi"); // "i" is for case insensitive
    var tracking_num_arr = regExp.exec(file_name);
    var tracking_num = ""
    
    if(tracking_num_arr){ //this catches Polaris
      tracking_num = tracking_num_arr[0];
      row_counter = process_coleman_rows(file, tracking_num, sheet, error_sheet, row_counter, sh, backend_sh);
      
    } else {
      regExp = new RegExp("([0-9]{6})", "gi"); // "i" is for case insensitive
      tracking_num_arr = regExp.exec(file_name);
      
      if(tracking_num_arr){ //this catches Coleman
        tracking_num = tracking_num_arr[0];
        row_counter = process_coleman_rows(file, tracking_num, sheet, error_sheet, row_counter, sh, backend_sh);
      } else {
        error_sheet.appendRow([file_name,"Couldn't find tracking number here, must be 15 or 6 digits"])
        error = true
      }
    }
    if((!error) && (file_name.indexOf("SIRUM Only") === -1)){
      uploaded_folder.addFile(file);
      source_folder.removeFile(file); 
    }

  }
}


