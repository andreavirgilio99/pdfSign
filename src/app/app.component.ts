import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'pdfSign';

  pdfToSign?: File
  openSigner = false;

  fileCatcher(event: any){
   this.pdfToSign = event.target.files[0]
  }
}
