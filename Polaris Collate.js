

//-------------------------------POLARIS--------------------------------------------------------------------------------------




function process_polaris_rows(file, tracking_num, collate_sheet, error_sheet, old_row, sh, date_str, pharmacy_name, sh, backend_sh){
    var curr_spreadsheet = SpreadsheetApp.openById(file.getId())
    var upload_sheet = curr_spreadsheet.getSheets()[0] //just take the first sheet

    var today = Utilities.formatDate(new Date(), "GMT", "MM/dd/yyyy hh:mm:ss").toString()

    //Get full range of data
    var SRange = upload_sheet.getDataRange();
    //get the data values in range
    var SData = SRange.getValues(); //2d array now of ndc & qty columns
    var copyData = []
    
    var index_ndc = -1
    var index_name = -1
    var index_qty = -1
    var title_row = SData[0]
    
    if(title_row[0].toString().trim().length == 0) title_row = SData[1] //because in some csv's they skipped the first row


    for(var i = 0; i < title_row.length; i++){
      var elem = title_row[i].toString().toLowerCase()
      if(elem.indexOf("ndc") > -1){
        index_ndc = i
      } else if((elem.indexOf("drug name") > -1) || (elem.indexOf("drug label name") > -1)){
        index_name = i
      } else if((elem.indexOf("qty") > -1) || (elem.indexOf("quantity") > -1)){
        index_qty = i
      }
    }
    
    if((index_ndc == -1) || (index_qty == -1)){
      sendAlertEmail('issue with polaris sheet that has no headers')
      return old_row
    }
    
    
    var row_counter = old_row
    var item_counter = 0
    var qty_tracker = 0
    for(var i = 1; i < SData.length; i++){ //go through each row and reorder them so they all match up
        var new_arr = SData[i]
        var copy_arr = []
        copy_arr.push(new_arr[index_name])
        if(index_ndc == -1){
          copy_arr.push("")
        } else {
          copy_arr.push(new_arr[index_ndc])
        }
        copy_arr.push(new_arr[index_qty])
        copy_arr.push(date_str)
        copy_arr.push(tracking_num.toString());
        item_counter += 1
        copy_arr.push(today);
        copy_arr.push(pharmacy_name);
        Logger.log(copy_arr)
      
        copyData.push(copy_arr)
        qty_tracker += parseInt(new_arr[index_qty])
        row_counter += 1
        
        if(row_counter > 2450){
          var last_full_row = collate_sheet.getLastRow();
          collate_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
          collate_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);
          copyData = []
          
          time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
          sh.insertSheet('polaris_batch_' + time_stamp)
          var collate_sheet = sh.getSheetByName('polaris_batch_' + time_stamp);      
          collate_sheet.appendRow(['Drug Name','ndc', 'Qty', 'date_str','tracking num','collated_timestamp', 'pharmacy_name'])
          row_counter = 0;
        }
    }
    
    backend_sh.getSheetByName('tracking_sheet').appendRow([pharmacy_name,tracking_num,date_str,qty_tracker,item_counter])
  
    if(copyData.length > 0){
    
      var last_full_row = collate_sheet.getLastRow();
      collate_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
    
      collate_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);
    
      return old_row + copyData.length;
      
    } else {
      return old_row;
    } 
}


function polarisCollate(){

  var source_folder = DriveApp.getFolderById(POLARIS_SOURCE);  //has subfolders for each polaris
  var uploaded_folder = DriveApp.getFolderById(POLARIS_UPLOADED);
  
  var sh = SpreadsheetApp.getActiveSpreadsheet();
  var error_sheet = sh.getSheetByName('raw_errors')
  var backend_sh = SpreadsheetApp.openById(backendSheetID())

  convertAllExcelsToGSheet(POLARIS_SOURCE, POLARIS_DISCARD) //because they're uploaded as excelss
  
  var files = source_folder.getFilesByType(MimeType.GOOGLE_SHEETS)
          
  var file_names = [];
  var file_counter = 0;
  
  var row_counter = 0;
  var time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
  
  var sheet = sh.insertSheet('polaris_batch_' + time_stamp)
    
  sheet.appendRow(['Drug Name','ndc', 'Qty', 'date_str','tracking num','collated_timestamp', 'pharmacy_name'])
  sheet.getRange("A:F").setNumberFormat("@STRING@")
  
  while (files.hasNext() && file_counter < 2){ //artificial limit becasue theres TOO MANY docs right now

    var error = false
        
    if(row_counter > 2400){
      time_stamp = Utilities.formatDate(new Date(), "GMT-07:00", "MM/dd/yyyy HH:mm:ss")
      sheet = sh.insertSheet('polaris_batch_' + time_stamp)
      sheet.appendRow(['Drug Name','ndc', 'Qty', 'date_str','tracking num','collated_timestamp', 'pharmacy_name'])
      row_counter = 0;
    }
            
    var file = files.next()

             
    var pharmacy_name = getNameFromFile(file.getName())
    
    file_counter += 1;
    file_names.push(file.getName());
    
    var file_name = file.getName();
    var regExp = new RegExp("([0-9]{15})", "gi"); // "i" is for case insensitive
    var tracking_num_arr = regExp.exec(file_name);
    var tracking_num = ""
            
            if(tracking_num_arr){ //either a full tracking number
              tracking_num = tracking_num_arr[0];
              row_counter = process_polaris_rows(file, tracking_num, sheet, error_sheet, row_counter, sh, "", pharmacy_name, sh, backend_sh);
              sheet = sh.getSheets()[sh.getSheets().length -1]
            } else {  //or a 6 digit date
              regExp = new RegExp("([0-9]{6})", "gi"); //then look for 6 digit date format
              tracking_num_arr = regExp.exec(file_name);
              if(tracking_num_arr){
                var date_str = tracking_num_arr[0]
                var month = date_str.substring(0,2)
                if(month == "97"){
                  error = true;
                  error_sheet.appendRow([file_name,"Couldn't find a 15 digit tracking number or a six digit date"])
                } else {
                  var day = date_str.substring(2,4)
                  var year = date_str.substring(4,6)
                  date_str = "20" + year + "-" + month + "-" + day
                  row_counter = process_polaris_rows(file, tracking_num, sheet, error_sheet, row_counter, sh, date_str, pharmacy_name, sh, backend_sh);
                  sheet = sh.getSheets()[sh.getSheets().length -1]
                }
              } else { //then try the mm-dd-yy<----TODO: once all are moved to this, only use this format
                regExp = new RegExp("([0-9]{2}-[0-9]{2}-[0-9]{2})", "gi"); //then look for 6 digit date format
                tracking_num_arr = regExp.exec(file_name);
                if(tracking_num_arr){
                  var date_arr = tracking_num_arr[0].split("-")
                  var month = date_arr[0]
                  var day = date_arr[1]
                  var year = date_arr[2]
                  date_str = "20" + year + "-" + month + "-" + day
                  row_counter = process_polaris_rows(file, tracking_num, sheet, error_sheet, row_counter, sh, date_str, pharmacy_name, sh, backend_sh);
                  sheet = sh.getSheets()[sh.getSheets().length -1]
                }
              }
            }
            
            if((!error) && (file_name.indexOf("SIRUM ONLY") === -1)){
              uploaded_folder.addFile(file);
              source_folder.removeFile(file); 
            }
          }
       
   
}


function getNameFromFile(filename){
  //TODO: if tampa or ft lauderdal hard-code
  //if has FT LAUDERDALE then  LTC PHARMA HLDG LLC POLARIS PHARMACY SERVICES ;
  //if has TAMPA then POLARIS PHARMACY SERVICES OF TAMPA LLC PRIME PHARMACY
  //if ; is present, split and take it out
  if(~ filename.indexOf("TAMPA")) return "POLARIS PHARMACY SERVICES OF TAMPA LLC PRIME PHARMACY"
  if(~ filename.indexOf("FT LAUDERDALE")) return "LTC PHARMA HLDG LLC POLARIS PHARMACY SERVICES"
  
  if(~ filename.indexOf(";")){
    return filename.split(";")[0].trim()
  } else {
    throw new Error("filename doesn't include facility name")
  }
  
}
