
//-----------------------------------V2------------------------------------------------------------------------------------

function pullData(){
  var data = SpreadsheetApp.openById(activeSpreadsheetID()).getSheetByName("V2 UI").getDataRange().getValues()
  var start = data[1][0]
  var end = data[1][1]
  if(!(passes(start) && passes(end))) throw new Error("Dates are invalid. Use YYYY-MM-DD format")
  pullV2Inventory(start,end)
}


function pullV2Inventory(start,end) {
  var sh = SpreadsheetApp.openById(activeSpreadsheetID())
  var backend_sh = SpreadsheetApp.openById(backendSheetID())
  var ui_page = sh.getSheetByName("V2 UI")
  var ui_page_data = ui_page.getDataRange().getValues()
  
  var todo_list = getTodolist(ui_page_data) //array of tracking numbers to look for
  var filter_list = buildNameFilterList() //pull from Bertha
  var name_phone_map = buildMap(backend_sh.getSheetByName("V1 Phone DB Clean").getDataRange().getValues()) //get an object of phone# - facilityname
  var finished_list = [] //list of tracking nums that we pulled
  
  var res = getV2JSON(start,end) //pull from V2
  var rows = res.rows

  var num_rows = rows.length
  if(num_rows == 0) throw new Error("No items within that range")

  //needed for naming each sheet & adding appropriate headers
  var time_stamp = Utilities.formatDate(new Date(), "GMT", "MM-dd-yyyy HH:mm:ss")
  var raw_name = start + " : " + end + " : " +  time_stamp
  var headers = ["ndc","qty.to","Drug Name","exp.to","drug.price.goodrx", "drug.price.nadac","drug.price.updatedAt","shipment._id", "shipment.tracking","verifiedAt", "item_last_updated_at"]
  
  
  var counter = 0
  var new_sheet = sh.insertSheet()  
  if(parseInt(num_rows) > 2500){
    new_sheet.setName(raw_name + " PT1")
    counter = 1
  } else {
    new_sheet.setName(raw_name)
  }
  new_sheet.appendRow(headers)
  

  var copyData = [] //use this to hold rows until you can append 2400 all at once (significantly increases speed)

  var curr_donation_id = "" //keep track of this so we only make the 2nd api call when necessary
  var curr_tracking_num = ""
  var counter = 0
  for(var i = 0; i < rows.length; i++){
  
    if((counter > 0) && (counter % 2400 == 0)){
    
      var last_full_row = new_sheet.getLastRow();
      new_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
      new_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);    
      copyData = []
      
      //move on to the next sheet because we've reached row limit here
      new_sheet = sh.insertSheet()
      counter += 1
      new_sheet.setName(raw_name + " PT" + counter)
      new_sheet.appendRow(headers)
      
    }
    
    //for every item, build a row with what we need
    if(typeof rows[i] !== "undefined"){
      var item = rows[i].doc
      if(item.shipment._id != curr_donation_id){
        curr_donation_id = item.shipment._id
        curr_tracking_num = getTrackingNum(curr_donation_id)
        if(!(curr_donation_id.split(".")[2] in name_phone_map)){ //then this'd be an issue down the line
        }
      }
      if(todo_list.indexOf(curr_tracking_num) > -1){ //only add rows for ones in our todo list
        if(finished_list.indexOf(curr_tracking_num) == -1) finished_list.push(curr_tracking_num)
        var ndc_raw = item.drug._id.split("-") //get the label (must be 5digit) and prod (must be 4digit), so pad both
        var ndc = ("00000" + ndc_raw[0]).slice(-5) + ("0000" + ndc_raw[1]).slice(-4)
        var prices = item.drug.price
        Logger.log(item.bin)
        Logger.log(item.next)
        var verified = ""
        if(!((item.bin) && (item.bin.length > 0))){ //if theres no bin, then it was destroyred and we want the timestamp
          if(item.next.length > 0){
            verified = item.next[0].createdAt
          }
        } 
        copyData.push([ndc,item.qty.to,item.drug.generic,item.exp.to, prices.goodrx ? prices.goodrx : "", prices.nadac ? prices.nadac : "",prices.updatedAt ? prices.updatedAt : "", item.shipment._id, curr_tracking_num, verified, item.updatedAt])
        counter += 1
      }
    }
    
  }
  
  //get rid of any straglers in copyData after loop finished
  if(copyData.length > 0){
    var last_full_row = new_sheet.getLastRow();
    new_sheet.insertRows(last_full_row+1, copyData.length); //add empty rows
    new_sheet.getRange(last_full_row+1, 1, copyData.length, copyData[0].length).setValues(copyData);   
  }
  
  Logger.log(finished_list)
  //mark the ui page for tracking nums found
  for(var i = 0; i < ui_page_data.length;i++){
    
    if(finished_list.indexOf(ui_page_data[i][0].toString().trim()) > -1){
      ui_page.getRange((i+1), 4).setValue(time_stamp)
    }
    
  }
  
  
  
}
