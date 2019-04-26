function run_double_check() {
  var email_text = ""
  var indexTrackingNumCSV = 8
  var indexDonorQtyCSV = 21
  var indexDonorCountCSV = 24
  var indexShippedCSV = 11
  var indexDonorNameCSV = 0
  var datetime = Utilities.formatDate(new Date(), "GMT", "MM/dd/yyyy hh:mm:ss").toString()
    var backend_sh = SpreadsheetApp.openById(backendSheetID())
  var files = DriveApp.getFolderById(parentFolderID()).getFiles()
  while(files.hasNext()){
    var file = files.next() 
    if(file.getName().toString().indexOf("SIRUM Donations") > -1){ //then this will be the donations.csv file
      var donations_csv_file = SpreadsheetApp.open(file)
      donations_csv_file.getRange("L:R").setNumberFormat("@STRING@")
      
      var donations_csv = donations_csv_file.getSheets()[0].getDataRange().getValues()
      
      var records_sheet = backend_sh.getSheetByName("tracking_sheet")
      var records_data = records_sheet.getDataRange().getValues()
      
      //go through each row of the records_data and , if not already confirmed, make sure its in donations.csv
      for(var i = 1; i < records_data.length; i++){
          if(records_data[i][5].toString().trim().length == 0){
          
            var item_count = records_data[i][4].toString().trim()
            var item_qty = records_data[i][3].toString().trim()
            var tracking_num = records_data[i][1].toString().trim()
            if(tracking_num.length == 6){
              tracking_num = "971424215" + tracking_num
            }
            var error_text = ""
            var found_row = false
              
            if(tracking_num.length > 0){ //if there's one, use it
              //lookup in donations_csv
              for(var j = 1; j < donations_csv.length; j++){
                if(donations_csv[j][indexDonorQtyCSV].toString().trim().length > 0){
                  if(donations_csv[j][8].toString().trim() == tracking_num){ //then you found the row
                    found_row = true

                    if(donations_csv[j][indexDonorCountCSV].toString().trim() != item_count){
                      error_text += ",actual count: " + donations_csv[j][indexDonorCountCSV].toString().trim()
                    }
                  
                    if(donations_csv[j][indexDonorQtyCSV].toString().trim() != item_qty){
                      error_text += ",actual qty: " + donations_csv[j][indexDonorQtyCSV].toString().trim()
                    }                  
                  
                  }
                }
              }
              
            } else { //else, look at the date_string since it's probably Polaris
              var facility_name = records_data[i][0].toString().trim()
              var date_str = new Date(records_data[i][2].toString().trim())
              var day_before = new Date(date_str.getTime());
              day_before.setDate(date_str.getDate() - 1);
              var day_after = new Date(date_str.getTime());
              day_after.setDate(date_str.getDate() + 1);
              var date_arr = [date_str.toString(),day_before.toString(),day_after.toString()]
              Logger.log(date_arr)
              
              for(var j = 1; j < donations_csv.length; j++){
                if(donations_csv[j][indexDonorQtyCSV].toString().trim().length > 0){
                  if(donations_csv[j][indexDonorNameCSV].toString() == facility_name){ //only check the rows for this faciltiy in donations.csv
                    //todo: generate the two extra date strings for the day before and the day after to compare
                    //if one of them matches, the found_row = true, and compare values
                    var date_shipped = new Date(donations_csv[j][indexShippedCSV].toString().substring(0,10))
                    if(date_arr.indexOf(date_shipped.toString()) > -1){ //if you matched name & date range
                      found_row = true
                      if(donations_csv[j][indexDonorCountCSV].toString().trim() != item_count){
                            error_text += ",actual count: " + donations_csv[j][indexDonorCountCSV].toString().trim()
                      }
                      if(donations_csv[j][indexDonorQtyCSV].toString().trim() != item_qty){
                            error_text += ",actual qty: " + donations_csv[j][indexDonorQtyCSV].toString().trim()
                      }     
                    }
                  }
                }
              }
            }
            
            //deal with unfounds or errors in either
            if(!found_row){
                error_text += ",donation not found"
            }
              
            if(error_text.length > 0){
              records_sheet.getRange("F" + (i+1)).setValue(error_text)
            } else {
              records_sheet.getRange("F" + (i+1)).setValue("Confirmed: " + datetime)
            }
          }
      }
    }
  }
  
}
