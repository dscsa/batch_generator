
//-----------------------------------V2------------------------------------------------------------------------------------


//TODO: decompose this out
function pullData(){
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var ui_page = sh.getSheetByName('V2 UI')
  ui_page.getDataRange().setNumberFormat('@STRING@')
  var ui_data = ui_page.getDataRange().getValues()
  
  var looking_for = [] //key = number, value = [start,end]
  var months_to_check = []
  
  for(var i = 5; i < ui_data.length; i++){
    if(ui_data[i][3].toString().trim().length == 0){
      var track_num = ui_data[i][0].toString().trim()
      var date = ui_data[i][2].toString().trim()
      var month = date.split("/")[0]
      var year = date.split("/")[2]
      var quasi_month = year + "-" + month
      if(months_to_check.indexOf(quasi_month) == -1) months_to_check.push(quasi_month)
      
      looking_for.push(track_num)
    }
  }
  
  if(looking_for.length == 0) return;

  var rows_to_upload = []
  var row_counter = 0 //if this hits 2500, then shift
  
  var finished_list = []
  
  var time_stamp = Utilities.formatDate(new Date(), "GMT", "MM-dd-yyyy HH:mm:ss")
  var sheet_name = "V2 batch: " + time_stamp
  var sheet = sh.insertSheet(sheet_name)
  sheet.appendRow(["ndc","qty.to","Drug Name","exp.to","drug.price.goodrx", "drug.price.nadac","drug.price.updatedAt","shipment._id", "shipment.tracking","verifiedAt", "item_last_updated_at"])
  
  for(var n = 0; n< months_to_check.length; n++){
  
    var range = getDateBoundArray(months_to_check[n])
    var res = getV2JSON(range[0],range[1])
    
    var rows = res.rows
    var ids = []
    
    for(var j = 0; j < rows.length; j++){
      if(! (~ ids.indexOf(rows[j].doc.shipment._id))) ids.push(rows[j].doc.shipment._id)
    }
        
    var numbers = {}
    var ids_we_check = []
    
    for(var i = 0; i < ids.length; i++){
      var num = getTrackingNum(ids[i])
      if(~ looking_for.indexOf(num)){
        ids_we_check.push(ids[i])
        numbers[ids[i]] = num
      }
    }
    
    var to_save = []
    
    for(var i = 0; i < rows.length; i++){
    
      var id = rows[i].doc.shipment._id
      
      if(~ ids_we_check.indexOf(id)){
      
        if(rows_to_upload.length > 2400){ //then save the current batch and refresh all the necessary variables
            addRows(sheet,rows_to_upload)
            
            for(var j = 0; j < ui_data.length;j++){
                if(finished_list.indexOf(ui_data[j][0].toString().trim()) > -1){
                  ui_page.getRange((j+1), 4).setValue(time_stamp)
                }
            }
            
            finished_list = []
            rows_to_upload = []
                     
            time_stamp = Utilities.formatDate(new Date(), "GMT", "MM-dd-yyyy HH:mm:ss")
            sheet_name = "V2 batch: " + time_stamp
            sheet = sh.insertSheet(sheet_name)
            sheet.appendRow(["ndc","qty.to","Drug Name","exp.to","drug.price.goodrx", "drug.price.nadac","drug.price.updatedAt","shipment._id", "shipment.tracking","verifiedAt", "item_last_updated_at"])
        }
        
        var tracking = numbers[id]
        var item = rows[i].doc
        
        var ndc_raw = item.drug._id.split("-") //get the label (must be 5digit) and prod (must be 4digit), so pad both
        var ndc = ("00000" + ndc_raw[0]).slice(-5) + ("0000" + ndc_raw[1]).slice(-4)
        var prices = item.drug.price
  
        var verified = ""
        if(!((item.bin) && (item.bin.length > 0))){ //if theres no bin, then it was destroyred and we want the timestamp
            if(item.next.length > 0){
              verified = item.next[0].disposed ? item.next[0].disposed._id : ''
            }
        } 
         //use the direct appendrow if you're doing something manually to cathc errors
        rows_to_upload.push([ndc,item.qty.to,item.drug.generic,item.exp.to, prices.goodrx ? prices.goodrx : "", prices.nadac ? prices.nadac : "",prices.updatedAt ? prices.updatedAt : "", item.shipment._id, tracking.toString(), verified, item.updatedAt])
        finished_list.push(tracking)
         //to_save.push([ndc,item.qty.to,item.drug.generic,item.exp.to, prices.goodrx ? prices.goodrx : "", prices.nadac ? prices.nadac : "",prices.updatedAt ? prices.updatedAt : "", item.shipment._id, tracking, verified, item.updatedAt])
      }
    }
  
    break //this makes it only do one month at a time TODO remove
  }
  
  
  if(rows_to_upload.length > 0){ //then save the current batch and refresh all the necessary variables
      addRows(sheet,rows_to_upload)
      
      for(var j = 0; j < ui_data.length;j++){
          if(finished_list.indexOf(ui_data[j][0].toString().trim()) > -1){
            ui_page.getRange((j+1), 4).setValue(time_stamp)
          }
      }
  }
  
  
}

//for when mistakes happen
function removeV2Batches(){
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var sheets = sh.getSheets()
  for(var i = 0; i < sheets.length; i++){
    if(~ sheets[i].getName().indexOf('V2 batch')){
    Logger.log(sheets[i].getName())
      sh.deleteSheet(sheets[i])
    }
  }
}

//Given a date, build an array, with the start of the month and end of date strings
function getDateBoundArray(quasi_month){  
  
  var res = []
  res.push(quasi_month + "-01")
  var arr = quasi_month.split("-")

  var month_num = parseInt(arr[1],10)
  var year_num = parseInt(arr[0],10)

  if(month_num == 12){
    year_num += 1
    month_num = 1
  } else {
    month_num += 1
  }
  
  month_num = month_num.toString()
  year_num = year_num.toString()

  if(month_num.length == 1) month_num = "0" + month_num
  
  res.push(year_num + "-" + month_num + "-01")
  return res
}


function addRows(sheet,rows){
  if(rows.length == 0) return
  sheet.insertRowsAfter(1, rows.length)
  sheet.getRange(sheet.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows)
}






