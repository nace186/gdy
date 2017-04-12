function showError(jqXHR, errorThrown) {
   
   var text = "Received HTTP Status Code "+jqXHR.status+" "+errorThrown;
   if (jqXHR.responseXML)
   {
      text += ": "+jqXHR.responseXML.firstChild.firstChild.innerHTML;
   }
   
   $("#modalMsg").text(text);
   $("#myModal").modal();
}