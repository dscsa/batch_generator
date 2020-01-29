function  getTodolist(ui_data){
  var res = []
  for(var i = 5; i < ui_data.length; i++){
    if(ui_data[i][3].toString().trim().length == 0){
      res.push(ui_data[i][0].toString().trim())
    }
  }
  return res
}



function passes(date){
  var arr = date.split("-")
  if(arr.length != 3) return false
  if((arr[0].length != 4) || (arr[1].length != 2) || (arr[2].length != 2)) return false
  return true
}


function buildMap(data){
  var res = {}
  for(var i = 0; i < data.length; i++){
    res[data[i][1]] = data[i][0]
  }
  return res
}



function buildNameFilterList(){
  var bertha_data_val = SpreadsheetApp.openById(BerthaID()).getSheetByName("Data Validation")
  return getPharmacyNames(bertha_data_val)
}



//getColemanExclude
//Looks at the Data Validation sheet to see all the state fields to ignore
//when pending the coleman to-dos
function getPharmacyNames(data_val_sheet){
  var data = data_val_sheet.getDataRange().getValues() //.getRange("J2:J").getValues()//data_val_sheet.getDataRange().getValues();
  var first_row = data[0]
  var index_col = first_row.indexOf("DO NOT SEND TO COLEMAN - FACILITIES")

  if(index_col > -1){
    var res = []
    for(var i = 1; i < data.length; i++){
      if(data[i][index_col].toString().trim().length > 0){
        res.push(data[i][index_col].toString().toLowerCase().trim());
      }
    }
    return res
  } else {
    sendAlertEmail("ERROR WITH DATA VAL", "Couldn't find the Pharmacy name column of Data Validation")
    return []
  }
}

