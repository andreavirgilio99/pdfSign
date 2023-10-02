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

    this.currentSegment = []
  }

  // Aggiungi questa funzione al tuo componente
  drawPoint(x: number, y: number) {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.selectedColor;
    this.ctx.fill();
  }

  // Select color
  selectColor(color: string) {
    this.selectedColor = color;
  }

  undoLastAction() {
    // Implement logic to undo the last action (e.g., erase signature)
  }

  downloadModifiedPDF() {
    // Implement logic to download the modified PDF
  }
}