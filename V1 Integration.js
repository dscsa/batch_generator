//Pulls names of all the batches in the document.
//Essentially acts as Queue-ing up all the batches for upload to V1
//This counts as 'setting up' the uploads, which Allison will do after the batches
//have been generated
function buildBatchNameList(){
  var sh = SpreadsheetApp.openById(activeSpreadsheetID())
  var sheets = sh.getSheets()
  var res = []
  for(var i = 0; i < sheets.length; i++){
     var sheet_name = sheets[i].getName()
      if((sheet_name.indexOf("batch") > -1) && (sheet_name.toLowerCase().indexOf("done") == -1)){
        res.push(sheet_name)
      }
  }
  sh.getSheetByName('V1 Upload UI').getRange("B2").setValue(res.join(",\n"))
  
}



function queueCurrentSheet(){
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = sh.getActiveSheet()
  var sheet_name = sheet.getName()
  Logger.log(sheet_name)
  if((sheet_name.indexOf("batch") > -1) && (sheet_name.toLowerCase().indexOf("done") == -1)){
    sh.getSheetByName('V1 Upload UI').getRange("B2").setValue(sheet_name)
  } else {
    throw new Error("Can only queue a 'batch' sheet that isn't 'done'")
  }
  
}

//----------------------------------------Prep & Serve to V1-------------------------------------------------------------------------------------------------

function manualTriggerV1(){ //so that during debugging or in other instances, there's a manual option that overrides the time-restraints
  triggerV1BatchPull(true)
}

function autoTriggerV1(){
  triggerV1BatchPull(false)
}

function testCri(manual){
  var date = new Date()
  var hour = date.getHours() //because date is in GMT
  Logger.log(hour)
  if(manual || (hour > 23) || (hour < 6)){
    Logger.log("IT WOULD RUN")
  } else {
    Logger.log("not run")
  }

}

//This function runs every five minutes
//by using B1:B3 of the UI sheet, it will mostly return empty, but whenever a batch has finished, it will queue up the next batch, if there is one
//and then ping V1 to look there
function triggerV1BatchPull(manual) {

  var date = new Date()
  var hour = date.getHours()
  if(manual || (hour > 21) || (hour < 6)){
      
      //pop off the next queue item and place it in B1 for doGet to check
      var logging_page = SpreadsheetApp.openById(activeSpreadsheetID()).getSheetByName('V1 Upload UI')
      var params_range = logging_page.getRange("B1:B3")
      var params_values = params_range.getValues()
      
      if((params_values[0].toString().trim().length > 0) || (params_values[0].toString().indexOf("ERROR") > -1)) return; //don't do anything if it's currently processing (this is how we can trigger constantly throughout day, or was just an error
      if(params_values[1].toString().trim().length == 0) return; //don't do anything if ther's no more batches to process, obviously. this will be most of the time
      
      //Otherwise, line up the next batch and ping V1
      var batches_to_process = params_values[1].toString()
      var new_current = ""
      batches_to_process = batches_to_process.split(",")
      var new_current = batches_to_process[0].trim()
      batches_to_process = batches_to_process.slice(1).join(",\n")
      
      params_range.setValues([[new_current],[batches_to_process],[params_values[2]]])
      SpreadsheetApp.flush()
        
      var url =  getV1IntegrationUrl()
      var url_a = getWebAppUrl()
      var url_b = getWebAppUrl() //could be two different urls if we wanted to split this up across several webapps
      
      url += "/" + Utilities.base64EncodeWebSafe(url_a) + "/" + Utilities.base64EncodeWebSafe(url_b)
      try{
        var res = UrlFetchApp.fetch(url,{'muteHttpExceptions':true})  
        Logger.log("here")
        Logger.log(res)
      } catch(e){
        Logger.log(e)
        console.log(e)
        //sendAlertEmail("Error or completion on V1 trigger", e)
      }
  }   
}


//Serves up the latest batch when V1 comes asking
function doGet(e){
  var batch_name = SpreadsheetApp.openById(activeSpreadsheetID()).getSheetByName("V1 Upload UI").getRange("B1").setNumberFormat("@STRING@").getValue().toString().trim()
  try{
    var batch_sheet = SpreadsheetApp.openById(activeSpreadsheetID()).getSheetByName(batch_name)
    batch_sheet.getDataRange().setNumberFormat('@STRING@')
    SpreadsheetApp.flush();
    var batch_data = JSON.stringify(batch_sheet.getDataRange().getValues())
    var params = JSON.stringify({"batch_data": batch_data, "batch_name":batch_name});
  
    return ContentService.createTextOutput(params)
  } catch(e){
    var range_ = SpreadsheetApp.openById(activeSpreadsheetID()).getSheetByName("V1 Upload UI").getRange("B1")
    var error_msg = "ERROR: " + e + "  Batch_name: " + range_.getValue()
    range_.setValue(error_msg)
  }
}









//----------------------------------------Catching Response-------------------------------------------------------------------------------------------------







//called from doPost, and marks a batch as complete and updates B1:B3 params
function updateSheet(sh,ui_page,batch_name,has_errors){

  var params_range = ui_page.getRange("B1:B3")
  var params_values = params_range.getValues()
  
  //Note completion by moving 'current' to 'completed'
  
  var double_check = params_values[0].toString().trim() == batch_name.trim()
  
  if(!double_check){
    var error_msg = "ERROR: Received post from V1 that didn't match current batch. OS has been contacted to fix before uploading can proceed. Batch_name: " + params_values[0] + ", received: " + batch_name
    params_range.setValues([[error_msg],[params_values[1].toString()],[params_values[2].toString()]])
    sendAlertEmail("Batch Generator Error",error_msg)
  
  } else {
    var completed_batches = params_values[2].toString()
    if(completed_batches.trim().length == 0){
      completed_batches = batch_name +  (has_errors ? " - ERRORS" : "")
    } else {
      completed_batches += ",\n" + batch_name +  (has_errors ? " - ERRORS" : "")
    }
    params_range.setValues([[""],[params_values[1].toString()],[completed_batches]])
    
    var batch_sheet = sh.getSheetByName(batch_name) //tag a sheet as done so we don't revisit it.
    
    if(batch_name.length > 90) batch_name = batch_name.substring(0,90)

    
    batch_sheet.setName("DONE: " + batch_name)
    
  }

}



//How V1 lets us know it's finished. 
function doPost(e){
  var sh = SpreadsheetApp.openById(activeSpreadsheetID())
  var backend_sh = SpreadsheetApp.openById(backendSheetID())
  var ui_page = sh.getSheetByName('V1 Upload UI')
  var logging_page = backend_sh.getSheetByName('V1 Upload Logging')
  var timestamp = Utilities.formatDate(new Date(), "GMT-04:00", "MM-dd-yyyy HH:mm:ss");

  logging_page.appendRow([timestamp,"Received doPost with following event:",JSON.stringify(e)])
  
  try{
    var parsed_res = JSON.parse(e.postData['contents'])
    var batch_name = e.parameter.batch_name
    
    
    if( ((batch_name.toLowerCase().indexOf("pharmerica") > -1) && (parsed_res.length > 6)) || //either pharmerica and has more than 6 leading rows
         ((batch_name.toLowerCase().indexOf("pharmerica") == -1) && (parsed_res.length > 1))){ //or its non-pharmerica and has more than 1 header row
      
      updateSheet(sh,ui_page,batch_name, true)
      var new_sheet_name = ""
      
      if(batch_name.indexOf("ERROR CSV") > -1){
        new_sheet_name = batch_name.split("received:")[0] + " received: " + timestamp
      } else {
        new_sheet_name = "ERROR CSV FOR: " + batch_name + " received: " + timestamp
      }
      
      var res_sheet = sh.insertSheet(new_sheet_name) // sh.getSheetByName('Results')
      SpreadsheetApp.flush();
      res_sheet.insertRows(1,parsed_res.length) //add all the empty rows
      
      if(batch_name.toLowerCase().indexOf("pharmerica") > -1){
        for(var j = 0; j < 5;j++){
          parsed_res[j].push("")
        }
        res_sheet.getRange(1,1,parsed_res.length,parsed_res[5].length).setValues(parsed_res)
  
      } else {
      
        res_sheet.getRange(1,1,parsed_res.length,parsed_res[0].length).setValues(parsed_res)
      }
      
      logging_page.appendRow([timestamp,"Errors saved for batch: " + batch_name])
      
    } else { //no errors, log somewhere
      updateSheet(sh,ui_page,batch_name,false)
      logging_page.appendRow([timestamp,"No errors for batch: " + batch_name])
    }
  
    logging_page.appendRow([timestamp,"Completed processing"])
    return HtmlService.createHtmlOutput("<div>SUCCESS</div>") //just send an empty response to V1 so it can close
  
  } catch(e){
    var backend_sh = SpreadsheetApp.openById(backendSheetID()).getSheetByName('V1 Upload Logging')
    backend_sh.appendRow(["Error with doPost",e])
    sendAlertEmail("Error with handling doPost", "")
  }
}

















