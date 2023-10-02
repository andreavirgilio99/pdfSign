import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

type Coordinates = {x: number, y: number}
type Segment = {points: Coordinates[]}

@Component({
  selector: 'app-signer',
  templateUrl: './signer.component.html',
  styleUrls: ['./signer.component.css']
})
export class SignerComponent implements OnChanges {
  @Input() pdfToSign!: File;
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef;

  pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  currentPage = 1;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  drawing = false;
  lastX = 0;
  lastY = 0;
  selectedColor = '#000000'; // Default color is black
  segments = new Map<number, Segment[]>()

  currentSegment: Coordinates[] = []

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.0.279/pdf.worker.min.js"
  }

  ngOnChanges(): void {
    if (this.pdfToSign) {
      this.loadPDF();
    }
  }

  async loadPDF() {
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
      this.pdfDoc = await pdfjsLib.getDocument({ data: typedArray }).promise;
      this.currentPage = 1; // Reset current page to the first page
      this.renderPage(this.currentPage);
    };

    fileReader.readAsArrayBuffer(this.pdfToSign);
  }

  renderPage(pageNumber: number) {
    if (!this.pdfDoc || !this.pdfCanvas) return;

    this.pdfDoc.getPage(pageNumber).then(page => {
      if (!this.canvas) {
        this.canvas = this.pdfCanvas.nativeElement;
        this.ctx = this.canvas!.getContext('2d');
      }

      const viewport = page.getViewport({ scale: 1.0 });
      this.canvas!.height = viewport.height;
      this.canvas!.width = viewport.width;

      page.render({ canvasContext: this.ctx!, viewport }).promise.then(() => {
        // Ripristina i disegni della pagina corrente
        const currPageLines = this.segments.get(pageNumber);
        if(currPageLines){
          currPageLines.forEach(line =>{
            line.points.forEach(point => this.drawPoint(point))
          })
        }
      }).catch(error => {
        console.error('Error rendering page:', error);
      });
    });
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderPage(this.currentPage);
    }
  }

  goToNextPage() {
    if (this.pdfDoc && this.currentPage < this.pdfDoc.numPages) {
      this.currentPage++;
      this.renderPage(this.currentPage);
    }
  }

  // Start drawing
  startDrawing(event: MouseEvent) {
    this.currentSegment = []
    this.drawing = true;
    const canvas = this.canvas!;
    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    this.ctx!.lineJoin = 'round';
    this.ctx!.lineCap = 'round';
    this.ctx!.strokeStyle = this.selectedColor;
    this.ctx!.beginPath();
    this.ctx!.moveTo(this.lastX, this.lastY);
  }

  draw(event: MouseEvent) {
    if (!this.drawing) return;
    //usa il colore selezionato per disegnare
    this.ctx!.globalCompositeOperation = 'source-over';
    this.ctx!.strokeStyle = this.selectedColor;
    this.ctx!.lineWidth = 2; // Imposta la larghezza del tratto

    // Disegna il tratto
    this.ctx!.lineTo(event.offsetX, event.offsetY);
    this.ctx!.stroke();
    this.currentSegment.push({x: event.offsetX, y: event.offsetY})
  }

  // Stop drawing
  endDrawing() {
    this.drawing = false;
    this.ctx!.closePath();
    const clone = JSON.parse(JSON.stringify(this.currentSegment))
    const newSegment: Segment = {points: clone}

    if(this.segments.get(this.currentPage) == undefined){
      this.segments.set(this.currentPage, [newSegment])
    }
    else{
      this.segments.get(this.currentPage)!.push(newSegment)
    }
    console.log(this.segments.get(this.currentPage))
    this.currentSegment = []
  }

  mouseLeaveCheck(){
    if(this.drawing){
      this.endDrawing()
    }
  }

  // Aggiungi questa funzione al tuo componente
  drawPoint(point: Coordinates) {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.selectedColor;
    this.ctx.fill();
  }

  // Select color
  selectColor(color: string) {
    this.selectedColor = color;
  }

  undoLastAction() {
   const currSegments = this.segments.get(this.currentPage)

   if(currSegments && currSegments.length > 0){
    currSegments.pop()
    this.renderPage(this.currentPage);
   }
  }

  downloadModifiedPDF() {
    // Implement logic to download the modified PDF
  }
}