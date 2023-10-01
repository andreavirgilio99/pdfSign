import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-adblocker-detector',
  templateUrl: './adblocker-detector.component.html',
  styleUrls: ['./adblocker-detector.component.css']
})
export class AdblockerDetectorComponent implements AfterViewInit {

  naughtyBoy = false

  constructor() { }

  ngAfterViewInit(): void {
    setTimeout(this.checkAdBlock, 3000)
  }

  checkAdBlock(): void {
    const ADS_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        const adsBlocked = xhr.status === 0 || xhr.responseURL !== ADS_URL;
        this.naughtyBoy = adsBlocked;
        console.log(adsBlocked)
      }
    };

    xhr.open('HEAD', ADS_URL, true);
    xhr.send(null);
  }
}
