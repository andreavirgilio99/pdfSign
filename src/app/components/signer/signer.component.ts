import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';

type Point = { x: number, y: number };
type Segment = { points: Point[], color: string, width: number };

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
  selectedWidth = 2; // Default width is 2
  segments = new Map<number, Segment[]>()

  currentSegment: Point[] = []

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
        if (currPageLines) {
          currPageLines.forEach(line => this.drawLine(line))
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
    this.ctx!.lineWidth = this.selectedWidth; // Imposta la larghezza del tratto
  
    // Disegna il tratto
    const x = event.offsetX;
    const y = event.offsetY;
  
    // Calcola la distanza tra il punto corrente e l'ultimo punto registrato
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Registra i punti ad ogni pixel di distanza
    if (distance >= 2) {
      const step = 1 / distance;
      for (let t = 0; t < 1; t += step) {
        const currentX = this.lastX + t * dx;
        const currentY = this.lastY + t * dy;
        this.ctx!.lineTo(currentX, currentY);
        this.currentSegment.push({
          x: currentX,
          y: currentY,
        });
      }
      this.ctx!.stroke()
      this.lastX = x;
      this.lastY = y;
    }
  }

  // Stop drawing
  endDrawing() {
    this.drawing = false;
    this.ctx!.closePath();
    const clone = JSON.parse(JSON.stringify(this.currentSegment))
    const newSegment: Segment = { points: clone, color: this.selectedColor, width: this.selectedWidth }

    if (this.segments.get(this.currentPage) == undefined) {
      this.segments.set(this.currentPage, [newSegment])
    }
    else {
      this.segments.get(this.currentPage)!.push(newSegment)
    }
    this.currentSegment = []
  }

  mouseLeaveCheck() {
    if (this.drawing) {
      this.endDrawing()
    }
  }
  
  async createModifiedPdf(originalPdfFile: File, drawings: Map<number, Segment[]>): Promise<void> {
    try {
      // Carica il PDF originale
      const originalPdfData = await this.readFileAsArrayBuffer(originalPdfFile);
      const pdfDoc = await pdfjsLib.getDocument({ data: originalPdfData }).promise;

      // Crea un nuovo documento PDF
      //const newPdfDoc = new pdfjsLib.PDFDocument();

      // Per ogni pagina del PDF originale
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        // Aggiungi una pagina vuota al nuovo documento con le stesse dimensioni della pagina originale
        //const newPage = newPdfDoc.addPage([page.view[2], page.view[3]]);

        // Ottieni i disegni per questa pagina
        const pageDrawings = drawings.get(pageNum);

        // Disegna il contenuto della pagina originale
        const content = await page.getOperatorList();
        //newPage.addPage(content);

        // Aggiungi i disegni alla pagina
        if (pageDrawings) {
          for (const segment of pageDrawings) {
            const color = segment.color || '#000000'; // Colore predefinito se non specificato
            const width = segment.width || 2; // Larghezza predefinita se non specificata
            for (let i = 0; i < segment.points.length; i++) {
              const point = segment.points[i];
              if (i === 0) {
                //newPage.moveTo(point.x, point.y);
              } else {
                //newPage.lineTo(point.x, point.y);
              }
              //newPage.setStrokeColor(new pdfjsLib.PDFColor({ rgb: [color, color, color] }));
              //newPage.setLineWidth(width);
            }
          }
        }
      }

      // Genera un blob dal nuovo documento PDF
      //const pdfData = await newPdfDoc.save();

      // Crea un oggetto Blob
      //const blob = new Blob([pdfData], { type: 'application/pdf' });

      // Scarica il nuovo PDF
      //saveAs(blob, 'modified_pdf.pdf');
    } catch (error) {
      console.error('Error creating modified PDF:', error);
    }
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          resolve(event.target.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer.'));
        }
      };
      reader.onerror = (event) => {
        reject(new Error('Error reading file: ' + event.target?.error));
      };
      reader.readAsArrayBuffer(file);
    });
  }


  // Aggiungi questa funzione al tuo componente
  drawLine(line: Segment) {
    if (!this.ctx) return;
  
    this.ctx.beginPath();
    this.ctx.strokeStyle = line.color;
    this.ctx.lineWidth = line.width;
  
    for (let i = 0; i < line.points.length; ++i) {
      const point = line.points[i];
  
      if (i === 0) {
        this.ctx.moveTo(point.x, point.y); // Muoviti al primo punto
      } else {
        const previousPoint = line.points[i - 1];
        this.ctx.lineTo(point.x, point.y); // Traccia una linea al punto successivo
      }
    }
  
    this.ctx.stroke(); // Rendi visibile la linea
    this.ctx.closePath();
  }

  // Select color
  selectColor(color: string) {
    this.selectedColor = color;
  }

  undoLastAction() {
    const currSegments = this.segments.get(this.currentPage)

    if (currSegments && currSegments.length > 0) {
      currSegments.pop()
      this.renderPage(this.currentPage);
    }
  }

  downloadModifiedPDF() {
    // Implement logic to download the modified PDF
  }
}