import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Component({
  selector: 'app-signer',
  templateUrl: './signer.component.html',
  styleUrls: ['./signer.component.css']
})
export class SignerComponent implements OnChanges {

  @Input()
  pdfToSign!: File

  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef;

  pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  currentPage = 1; // Start from the first page
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  pageDrawings: { [page: number]: { x: number, y: number }[] } = {};
  drawing = false;
  lastX = 0;
  lastY = 0;
  selectedColor = '#000000'; // Default color is black

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
        // Render successful
      }).catch(error => {
        console.error('Error rendering page:', error);
      });
    });
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.pageDrawings[this.currentPage] = this.getDrawings(); // Salva i disegni della pagina corrente
      this.currentPage--;
      this.renderPage(this.currentPage);
      this.restoreDrawings(this.currentPage); // Ripristina i disegni della nuova pagina
    }
  }

  goToNextPage() {
    if (this.pdfDoc && this.currentPage < this.pdfDoc.numPages) {
      this.pageDrawings[this.currentPage] = this.getDrawings(); // Salva i disegni della pagina corrente
      this.currentPage++;
      this.renderPage(this.currentPage);
      this.restoreDrawings(this.currentPage); // Ripristina i disegni della nuova pagina
    }
  }

  // Metodo per ottenere i disegni della pagina corrente
  private getDrawings(): { x: number, y: number }[] {
    return this.pageDrawings[this.currentPage] || [];
  }

  // Metodo per ripristinare i disegni sulla pagina specificata
  private restoreDrawings(pageNumber: number) {
    const drawings = this.pageDrawings[pageNumber];
    if (drawings) {
      for (const point of drawings) {
        this.drawPoint(point.x, point.y);
      }
    }
  }

  // Start drawing
  startDrawing(event: MouseEvent) {
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

    if (this.selectedColor === '#FFFFFF') {
      // Se la gomma è selezionata, usa il colore di sfondo per cancellare
      this.ctx!.globalCompositeOperation = 'destination-out';
      this.ctx!.lineWidth = 5; // Imposta la larghezza della gomma
    } else {
      // Altrimenti, usa il colore selezionato per disegnare
      this.ctx!.globalCompositeOperation = 'source-over';
      this.ctx!.strokeStyle = this.selectedColor;
      this.ctx!.lineWidth = 2; // Imposta la larghezza del tratto
    }

    // Disegna il tratto
    this.ctx!.lineTo(event.offsetX, event.offsetY);
    this.ctx!.stroke();
  }

  // Stop drawing
  endDrawing() {
    this.drawing = false;
    this.ctx!.closePath();
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
