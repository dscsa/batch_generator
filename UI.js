function onOpen(e) {
  var ui = SpreadsheetApp.getUi()
  ui.createMenu('V1 Import')
    .addItem('Queue All Batches', 'buildBatchNameList')
    .addItem('Archive "DONE" files', 'cleanOutGenerator')
    .addItem('Queue Only Current Sheet', 'queueCurrentSheet')
    .addItem('Manually process next batch', 'manualTriggerV1')
    .addToUi();
  ui.createMenu('Generate Batches')
    .addItem('Coleman', 'colemanCollate')
    .addItem('Polaris', 'polarisCollate')
    .addItem('Pharmerica', 'pharmericaSplit').addToUi()
  ui.createMenu('V2 Data Pull').addItem('Run Data Pull', 'pullData').addToUi();
  ui.createMenu('Compare Tracking Sheet').addItem('Run Comparison', 'run_double_check').addToUi();
}

