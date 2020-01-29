function collatePolaris() {
  //go through all polaris errors, and collate them?
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var sheets = sh.getSheets()
  var res = sh.getSheetByName('Collated Polaris Errors')
  
  var rows_to_append = []
  
  for(var n = 0; n < sheets.length; n++){
    if(~ sheets[n].getName().indexOf('polaris_batch')){
      var data = sheets[n].getDataRange().getValues().slice(1) //get all rows but first one
      rows_to_append = rows_to_append.concat(data)
      sheets[n].setName("DONE - " + sheets[n].getName())
    }
  }
  
  res.insertRows(2, rows_to_append.length)
  res.getRange(2, 1, rows_to_append.length, rows_to_append[0].length).setValues(rows_to_append)
  
  
}



function fixNumbers(){
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = sh.getSheetByName('Polaris Number Errors')
  var data = sheet.getDataRange().getValues()
  
  var index_wrong_num = 4
  var index_right = 6
  
  var map = {}
  
  var map_data = sheet.getRange("I2:J20").getValues()
  for(var i = 0; i < map_data.length; i++){
    map[map_data[i][0]] = map_data[i][1].toString().trim()
  }
    
  var new_column = []
  
  
  for(var i = 1; i <data.length; i++){
    var num = (data[i][index_wrong_num])
    var tre = map[num]
    new_column.push([tre])
  }
  
  sheet.getRange(2, 7, new_column.length, 1).setValues(new_column)

}

function splitPolaris(){
  var sh = SpreadsheetApp.getActiveSpreadsheet()
  var all_errors = sh.getSheetByName('Collated Polaris Errors')
  var date_errors_sh = sh.getSheetByName('Polaris Date Errors')
  var num_errors_sh = sh.getSheetByName('Polaris Number Errors')
  
  var data = all_errors.getDataRange().getValues().splice(1)
  
  var num_errors = []
  var date_errors = []
  
  for(var i = 0; i < data.length; i++){
    if(data[i][3].toString().trim().length > 0){
      date_errors.push(data[i])
    } else {
      num_errors.push(data[i])
    }
  }
  
  date_errors_sh.insertRows(2, date_errors.length)
  date_errors_sh.getRange(2, 1, date_errors.length, date_errors[0].length).setValues(date_errors)
  
  num_errors_sh.insertRows(2, num_errors.length)
  num_errors_sh.getRange(2, 1, num_errors.length, num_errors[0].length).setValues(num_errors)

}
