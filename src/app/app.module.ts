import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AdblockerDetectorComponent } from './components/adblocker-detector/adblocker-detector.component';
@NgModule({
  declarations: [
    AppComponent,
    AdblockerDetectorComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
