import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/formatters';
import type { DateFormat } from '@/contexts/LocalizationContext';

type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export class ProfessionalPDF {
  private pdf: jsPDF;
  private currentY: number;
  private pageHeight: number;
  private margin: number;
  private pageWidth: number;
  
  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.pdf = new jsPDF(orientation, 'mm', 'a4');
    this.currentY = 20;
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.margin = 15;
  }
  
  async addHeader(companySettings: CompanySettings | null, title: string, dateFormat: DateFormat = 'MMM DD, YYYY', documentId?: string, showLogo: boolean = true): Promise<void> {
    // Track if logo was successfully added and its position
    let logoAdded = false;
    let logoY = 20; // Default to top margin
    const logoStartY = 20; // Start logo at top margin
    
    // Add company logo if available and showLogo is true
    if (showLogo && companySettings?.company_logo_url) {
      try {
        const logoPathOrUrl = companySettings.company_logo_url!;

        // If the stored value looks like a storage path (not an http(s) URL), try to download it via Supabase
        if (!/^https?:\/\//i.test(logoPathOrUrl)) {
          try {
            const { data: downloadData, error: downloadError } = await supabase.storage
              .from('project-images')
              .download(logoPathOrUrl);

            if (downloadError) {
              console.warn('Supabase download failed for company logo, falling back to signed URL:', downloadError);
            } else if (downloadData) {
              // Convert blob to data URL
              const blob = downloadData as Blob;
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              // Add image directly from data URL (larger, higher quality)
              // Try to maintain aspect ratio while fitting nicely (40mm width, auto height)
              this.pdf.addImage(dataUrl, 'PNG', this.margin, logoStartY, 40, 20);
              logoAdded = true;
              logoY = logoStartY;
            }
          } catch (err) {
            console.warn('Error downloading company logo from Supabase storage:', err);
          }

          // If we didn't already add an image via download, attempt to get a signed URL and load it
          if (!logoAdded && !/^data:/i.test(String(logoPathOrUrl))) {
            try {
              const { data, error } = await supabase.storage
                .from('project-images')
                .createSignedUrl(logoPathOrUrl, 60 * 60 * 24 * 365);
              if (error) {
                console.warn('Failed to create signed URL for company logo:', error);
              } else if (data?.signedUrl) {
                const signedUrl = data.signedUrl;
                // Fetch the signed URL as a blob then convert to data URL to avoid CORS/image taint issues
                try {
                  const resp = await fetch(signedUrl);
                  if (resp.ok) {
                    const blob = await resp.blob();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                    this.pdf.addImage(dataUrl, 'PNG', this.margin, logoStartY, 40, 20);
                    logoAdded = true;
                    logoY = logoStartY;
                  } else {
                    console.warn('Failed to fetch signed logo URL, status:', resp.status);
                  }
                } catch (err) {
                  console.warn('Error fetching signed logo URL:', err);
                }
              }
            } catch (err) {
              console.warn('Error creating signed URL for company logo:', err);
            }
          }
        } else {
          // If the stored value is already an http(s) URL, fetch it and convert to data URL
          try {
            const resp = await fetch(logoPathOrUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              this.pdf.addImage(dataUrl, 'PNG', this.margin, logoStartY, 40, 20);
              logoAdded = true;
              logoY = logoStartY;
            } else {
              console.warn('Failed to fetch company logo URL, status:', resp.status);
            }
          } catch (err) {
            console.warn('Error fetching company logo URL:', err);
          }
        }
      } catch (error) {
        console.warn('Failed to load company logo:', error);
      }
    }
    
    // Custom header template or default
    if (companySettings?.pdf_header_template) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      const lines = this.pdf.splitTextToSize(companySettings.pdf_header_template, this.pageWidth - 2 * this.margin);
      this.pdf.text(lines, this.margin + 35, this.currentY + 5);
      this.currentY += 10;
    } else if (!showLogo) {
      // For proposal format without logo, skip company info and go straight to title
      this.currentY = 20;
    } else {
      // ALWAYS show company information in header for professional appearance
      // Align text vertically centered with logo (logo is 20mm tall, so center is at logoY + 10)
      const textStartX = logoAdded ? this.margin + 45 : this.margin;
      
      // Position text to be vertically centered with the logo
      // Logo center is at logoY + 10mm, so position company name baseline slightly above center
      // to account for text height and achieve visual centering
      const logoCenterY = logoAdded ? logoY + 10 : 20;
      const companyNameY = logoAdded ? logoCenterY - 3 : 20; // Offset to visually center with logo
      
      // Company name (ALWAYS show - use company settings or fallback)
      const companyName = companySettings?.company_name || 'Eagle Construtora';
      this.pdf.setFontSize(18);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.text(companyName, textStartX, companyNameY);
      
      // Company contact info (positioned below company name, aligned with logo)
      const contactInfoY = companyNameY + 7;
      const contactInfo = [
        companySettings?.email,
        companySettings?.phone,
        companySettings?.website
      ].filter(Boolean);
      
      if (contactInfo.length > 0) {
        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(70, 70, 70);
        this.pdf.text(contactInfo.join(' | '), textStartX, contactInfoY);
        this.currentY = contactInfoY + 8;
      } else {
        // If no contact info, position currentY after company name
        this.currentY = companyNameY + 8;
      }
      
      // No horizontal line separator - removed per user request
      // Set currentY to position after header for document title
      if (logoAdded) {
        // Position title below logo and company info
        this.currentY = Math.max(logoY + 20, contactInfoY + 12);
      } else {
        this.currentY = contactInfoY + 12;
      }
    }
    
    // Document title (professional formatting - can split long titles)
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    
    // Split title if it's too long (like "Proposta de Assessoria para redução de INSS de Obras")
    const titleWords = title.split(' ');
    if (titleWords.length > 6) {
      // Split into two lines for better appearance
      const midPoint = Math.ceil(titleWords.length / 2);
      const firstLine = titleWords.slice(0, midPoint).join(' ');
      const secondLine = titleWords.slice(midPoint).join(' ');
      this.pdf.text(firstLine, this.margin, this.currentY);
      this.currentY += 7;
      this.pdf.text(secondLine, this.margin, this.currentY);
    } else {
      this.pdf.text(title, this.margin, this.currentY);
    }
    
    // Skip "Generated:" date for professional proposal format
    this.currentY += 12;
    
    // Add QR code if document ID provided and QR codes enabled
    if (documentId && companySettings?.enable_qr_codes) {
      try {
        const qrCodeUrl = `${window.location.origin}/verify/${documentId}`;
        const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 200, margin: 1 });
        this.pdf.addImage(qrDataUrl, 'PNG', this.pageWidth - this.margin - 25, 15, 25, 25);
        
        // Add small text under QR
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(100, 100, 100);
        this.pdf.text('Scan to verify', this.pageWidth - this.margin - 25, 42, { align: 'left' });
      } catch (error) {
        console.warn('Failed to generate QR code:', error);
      }
    }
    
    // No line separator after title - removed per user request
    // Just add spacing for next content
    this.currentY += 8;
  }
  
  addFooter(companySettings?: CompanySettings | null, signatureData?: string): void {
    const footerY = this.pageHeight - 20;
    
    // Custom footer template or default
    if (companySettings?.pdf_footer_template) {
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(100, 100, 100);
      const lines = this.pdf.splitTextToSize(companySettings.pdf_footer_template, this.pageWidth - 2 * this.margin);
      this.pdf.text(lines, this.margin, footerY - 10);
    } else if (companySettings?.footer_text) {
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.text(companySettings.footer_text, this.margin, footerY - 5);
    }
    
    // Add digital signature if provided and enabled
    if (signatureData && companySettings?.enable_digital_signatures) {
      try {
        this.pdf.addImage(signatureData, 'PNG', this.pageWidth - this.margin - 50, footerY - 25, 40, 15);
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(100, 100, 100);
        this.pdf.text('Digitally Signed', this.pageWidth - this.margin - 50, footerY - 8);
      } catch (error) {
        console.warn('Failed to add signature:', error);
      }
    }
    
    // Page number
    const pageCount = (this.pdf as any).internal.getNumberOfPages();
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(
      `Page ${pageCount}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );
  }
  
  addSectionTitle(title: string, fontSize: number = 16): void {
    this.checkPageBreak(15);
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 10;
  }
  
  addSubtitle(text: string): void {
    this.checkPageBreak(10);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(60, 60, 60);
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += 6;
  }
  
  addParagraph(text: string, fontSize: number = 10, lineSpacing: number = 6): void {
    this.checkPageBreak(20);
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(0, 0, 0);
    
    const lines = this.pdf.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    lines.forEach((line: string, index: number) => {
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += lineSpacing;
    });
    this.currentY += 2; // Extra spacing after paragraph
  }
  
  addKeyValue(key: string, value: string, fontSize: number = 12): void {
    this.checkPageBreak(8);
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(key + ':', this.margin, this.currentY);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(40, 40, 40);
    this.pdf.text(value, this.margin + 50, this.currentY);
    this.currentY += 8;
  }
  
  addTable(headers: string[], rows: any[][], columnWidths?: number[]): void {
    this.checkPageBreak(30);
    
    autoTable(this.pdf, {
      startY: this.currentY,
      head: [headers],
      body: rows,
      columnStyles: columnWidths ? 
        columnWidths.reduce((acc, width, i) => ({ ...acc, [i]: { cellWidth: width } }), {}) : 
        {},
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;
  }
  
  addSummaryBox(items: { label: string; value: string; highlight?: boolean }[]): void {
    this.checkPageBreak(items.length * 8 + 10);
    
    const boxX = this.margin;
    const boxWidth = this.pageWidth - 2 * this.margin;
    const boxHeight = items.length * 8 + 6;
    
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(boxX, this.currentY, boxWidth, boxHeight, 'F');
    
    this.currentY += 6;
    items.forEach(item => {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', item.highlight ? 'bold' : 'normal');
      this.pdf.text(item.label, boxX + 5, this.currentY);
      this.pdf.text(item.value, boxX + boxWidth - 5, this.currentY, { align: 'right' });
      this.currentY += 8;
    });
    
    this.currentY += 5;
  }
  
  addDivider(): void {
    this.checkPageBreak(5);
    this.pdf.setDrawColor(180, 180, 180);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }
  
  addImage(imageData: string, width: number, height: number): void {
    this.checkPageBreak(height + 10);
    this.pdf.addImage(imageData, 'PNG', this.margin, this.currentY, width, height);
    this.currentY += height + 10;
  }
  
  checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.pdf.addPage();
      this.currentY = 20;
    }
  }
  
  save(filename: string): void {
    this.pdf.save(filename);
  }
  
  getBlob(): Blob {
    return this.pdf.output('blob');
  }
  
  getPDF(): jsPDF {
    return this.pdf;
  }
}
