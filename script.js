// Future use: animations, form validation, etc.
console.log("Portfolio loaded");


function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.firstName,
    data.lastName,
    data.organization,
    data.email,
    data.contact,
    data.message
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ result: "Success", data: data })
  ).setMimeType(ContentService.MimeType.JSON);
}
