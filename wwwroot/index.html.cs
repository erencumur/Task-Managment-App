< !doctype html >
< html lang = "tr" >
< head >
  < meta charset = "utf-8" />
  < title > Mini - Trello </ title >
  < meta name = "viewport" content = "width=device-width, initial-scale=1" />
  < link rel = "stylesheet" href = "./styles.css" />
</ head >
< body >
  < header >
    < h1 > Görev Takip Sistemi</h1>
    <div class= "project-info" >
      Proje ID:
      < input id = "projectId" type = "number" value = "1" min = "1" />
      < button id = "btnLoad" > Yükle </ button >
    </ div >
  </ header >

  < main id = "board" >
    < !--JS dolduracak-- >
  </ main >

  < section class= "add-task" >
    < h3 > Yeni Görev(Yapılacak sütununa) </ h3 >
    < div class= "form-row" >
      < input id = "taskTitle" placeholder = "Başlık" />
      < input id = "taskDue" type = "date" />
    </ div >
    < textarea id = "taskDesc" placeholder = "Açıklama" ></ textarea >
    < button id = "btnAdd" > Ekle </ button >
    < span id = "status" ></ span >
  </ section >

  < script src = "./app.js" ></ script >
</ body >
</ html >
