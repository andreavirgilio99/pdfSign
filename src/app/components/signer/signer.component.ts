import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';

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
  selectedColor = '#000000';
  selectedWidth = 2; 
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
      this.currentPage = 1;
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

    this.ctx!.globalCompositeOperation = 'source-over';
    this.ctx!.strokeStyle = this.selectedColor;
    this.ctx!.lineWidth = this.selectedWidth;
  
    const x = event.offsetX;
    const y = event.offsetY;
  
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);

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

  drawLine(line: Segment) {
    if (!this.ctx) return;
  
    this.ctx.beginPath();
    this.ctx.strokeStyle = line.color;
    this.ctx.lineWidth = line.width;
  
    for (let i = 0; i < line.points.length; ++i) {
      const point = line.points[i];
  
      if (i === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        const previousPoint = line.points[i - 1];
        this.ctx.lineTo(point.x, point.y); 
      }
    }
  
    this.ctx.stroke(); 
    this.ctx.closePath();
  }

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

  async downloadPDF() {
    if (!this.pdfDoc) return;
  
    const pdf = new jsPDF();
    const scaleFactor = 1; // Manteniamo la scala originale
  
    for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: scaleFactor });
  
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
  
      // Converti l'immagine della pagina in un'immagine data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
  
      pdf.addImage(
        imageDataUrl,
        'JPEG',
        0, // x
        0, // y
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight()
      );
  
      const pageSegments = this.segments.get(pageNumber);
      if (pageSegments) {
        for (const segment of pageSegments) {
          this.drawSegmentOnPage(pdf, segment, scaleFactor);
        }
      }
  
      if (pageNumber < this.pdfDoc.numPages) {
        pdf.addPage();
      }
    }
  
    pdf.save(this.pdfToSign.name);
  }
  
  private drawSegmentOnPage(
    pdf: jsPDF,
    segment: Segment,
    scaleFactor: number
  ) {
    for (const point of segment.points) {
      const x = point.x * scaleFactor;
      const y = point.y * scaleFactor;
      const circleRadius = segment.width * scaleFactor;
      
      pdf.setFillColor(segment.color);
      pdf.circle(x, y, circleRadius, 'F');
    }
  }
}