import { jsPDF } from 'jspdf';
import type { MenuWithSections } from '@menucraft/api-client';

interface PDFOptions {
  venueName: string;
  showPrices?: boolean;
  showDescriptions?: boolean;
  showDietaryTags?: boolean;
  layout?: 'single' | 'two-column';
}

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'V',
  vegan: 'VG',
  gluten_free: 'GF',
  dairy_free: 'DF',
  nut_free: 'NF',
  halal: 'H',
  kosher: 'K',
  spicy: 'S',
};

export function generateMenuPDF(
  menu: MenuWithSections,
  options: PDFOptions
): void {
  const {
    venueName,
    showPrices = true,
    showDescriptions = true,
    showDietaryTags = true,
    layout = 'single',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const columnWidth = layout === 'two-column' ? (contentWidth - 10) / 2 : contentWidth;

  let y = margin;
  let currentColumn = 0;
  let columnStartY = margin;

  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - margin) {
      if (layout === 'two-column' && currentColumn === 0) {
        currentColumn = 1;
        y = columnStartY;
      } else {
        doc.addPage();
        y = margin;
        currentColumn = 0;
        columnStartY = margin;
      }
    }
  };

  const getX = () => {
    if (layout === 'two-column') {
      return margin + currentColumn * (columnWidth + 10);
    }
    return margin;
  };

  // Header - Venue Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(venueName, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Menu Name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(menu.name, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Decorative line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  columnStartY = y;

  // Sections
  for (const section of menu.sections) {
    checkPageBreak(20);

    // Section Name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(section.name, getX(), y);
    y += 6;

    // Section Description
    if (section.description && showDescriptions) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      const descLines = doc.splitTextToSize(section.description, columnWidth);
      doc.text(descLines, getX(), y);
      y += descLines.length * 4 + 2;
      doc.setTextColor(0);
    }

    y += 3;

    // Items
    for (const item of section.items) {
      if (!item.isAvailable) continue;

      // Estimate height needed for this item
      let itemHeight = 6;
      if (item.description && showDescriptions) {
        const descLines = doc.splitTextToSize(item.description, columnWidth - 30);
        itemHeight += descLines.length * 3.5 + 2;
      }
      if (showDietaryTags && item.dietaryTags && (item.dietaryTags as string[]).length > 0) {
        itemHeight += 4;
      }
      if (item.options && item.options.length > 0) {
        itemHeight += 4;
      }

      checkPageBreak(itemHeight + 5);

      const x = getX();

      // Item Name and Price on same line
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');

      const itemName = item.name;
      let priceText = '';
      if (showPrices && item.priceAmount) {
        priceText = `$${(item.priceAmount / 100).toFixed(2)}`;
      }

      // Draw item name
      doc.text(itemName, x, y);

      // Draw price aligned right
      if (priceText) {
        const priceWidth = doc.getTextWidth(priceText);
        doc.text(priceText, x + columnWidth - priceWidth, y);
      }

      // Draw dotted line between name and price
      if (priceText) {
        const nameWidth = doc.getTextWidth(itemName);
        const priceWidth = doc.getTextWidth(priceText);
        const dotsStart = x + nameWidth + 2;
        const dotsEnd = x + columnWidth - priceWidth - 2;

        if (dotsEnd > dotsStart + 10) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          let dotX = dotsStart;
          while (dotX < dotsEnd) {
            doc.text('.', dotX, y);
            dotX += 2;
          }
          doc.setTextColor(0);
        }
      }

      y += 5;

      // Item Description
      if (item.description && showDescriptions) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        const descLines = doc.splitTextToSize(item.description, columnWidth - 5);
        doc.text(descLines, x + 2, y);
        y += descLines.length * 3.5 + 1;
        doc.setTextColor(0);
      }

      // Dietary Tags
      if (showDietaryTags && item.dietaryTags && (item.dietaryTags as string[]).length > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const tags = (item.dietaryTags as string[])
          .map((tag) => DIETARY_LABELS[tag] || tag)
          .join(' | ');
        doc.setTextColor(60, 120, 60);
        doc.text(tags, x + 2, y);
        doc.setTextColor(0);
        y += 4;
      }

      // Options (grouped)
      if (item.options && item.options.length > 0) {
        const groups = item.options.reduce(
          (acc, opt) => {
            const group = opt.optionGroup || 'Options';
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
          },
          {} as Record<string, typeof item.options>
        );

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);

        for (const [groupName, opts] of Object.entries(groups)) {
          const optionsText = opts
            .map((o) => {
              if (showPrices && o.priceModifier) {
                return `${o.name} (+$${(o.priceModifier / 100).toFixed(2)})`;
              }
              return o.name;
            })
            .join(', ');

          const fullText = `${groupName}: ${optionsText}`;
          const optLines = doc.splitTextToSize(fullText, columnWidth - 5);
          doc.text(optLines, x + 2, y);
          y += optLines.length * 3;
        }

        doc.setTextColor(0);
        y += 1;
      }

      y += 3;
    }

    y += 8;
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Powered by MenuCraft', pageWidth / 2, footerY, { align: 'center' });

  // Dietary legend on last page
  if (showDietaryTags) {
    const legendY = footerY - 8;
    doc.setFontSize(7);
    doc.setTextColor(100);
    const legend = 'V=Vegetarian | VG=Vegan | GF=Gluten Free | DF=Dairy Free | NF=Nut Free | H=Halal | K=Kosher | S=Spicy';
    doc.text(legend, pageWidth / 2, legendY, { align: 'center' });
  }

  // Download the PDF
  const filename = `${menu.name.replace(/[^a-zA-Z0-9]/g, '_')}_menu.pdf`;
  doc.save(filename);
}
