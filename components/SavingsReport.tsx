'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '@/types';

interface SavingsReportProps {
  result: AnalysisResult;
  scanId: string;
  fileName: string;
  userTier: string;
}

export default function SavingsReport({
  result,
  scanId,
  fileName,
  userTier,
}: SavingsReportProps) {
  const [generating, setGenerating] = useState(false);

  if (userTier !== 'pro') return null;

  const generatePDF = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;

      const navy = '#1B2A4A';
      const teal = '#2A9D8F';
      const lightGray = '#F3F4F6';
      const darkGray = '#4B5563';
      const mediumGray = '#6B7280';
      const white = '#FFFFFF';

      // --- Helper: check for page overflow ---
      const checkPageBreak = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
      };

      // --- Helper: draw a horizontal rule ---
      const drawHR = () => {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      // =====================
      // HEADER
      // =====================
      doc.setFillColor(27, 42, 74); // navy
      doc.rect(0, 0, pageWidth, 44, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('Auditflow Savings Report', margin, 22);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(180, 190, 210);
      doc.text(`File: ${fileName}`, margin, 32);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        pageWidth - margin,
        32,
        { align: 'right' }
      );

      y = 56;

      // =====================
      // EXECUTIVE SUMMARY
      // =====================
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(27, 42, 74);
      doc.text('Executive Summary', margin, y);
      y += 8;

      // Summary box
      doc.setFillColor(250, 248, 245); // cream-ish
      doc.roundedRect(margin, y, contentWidth, 44, 3, 3, 'F');

      const summaryCol1X = margin + 6;
      const summaryCol2X = margin + contentWidth / 2 + 6;
      const labelValueGap = 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128); // mediumGray
      doc.text('Vendor', summaryCol1X, y + 10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 42, 74);
      doc.text(result.vendor_name || 'Unknown', summaryCol1X, y + 10 + labelValueGap);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Invoice Date', summaryCol2X, y + 10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 42, 74);
      doc.text(result.invoice_date || 'N/A', summaryCol2X, y + 10 + labelValueGap);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Invoice Total', summaryCol1X, y + 28);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 42, 74);
      doc.text(
        `$${result.invoice_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        summaryCol1X,
        y + 28 + labelValueGap
      );

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Risk Score', summaryCol2X, y + 28);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      const riskColors: Record<string, string> = {
        low: '#22C55E',
        medium: '#F59E0B',
        high: '#EF4444',
      };
      const riskColor = riskColors[result.overall_risk_score] || darkGray;
      doc.setTextColor(riskColor);
      doc.text(
        result.overall_risk_score.charAt(0).toUpperCase() + result.overall_risk_score.slice(1),
        summaryCol2X,
        y + 28 + labelValueGap
      );

      // Flags count badge
      const flagCountText = `${result.flags.length} Issue${result.flags.length !== 1 ? 's' : ''} Flagged`;
      doc.setFillColor(42, 157, 143); // teal
      const badgeWidth = doc.getTextWidth(flagCountText) + 10;
      doc.roundedRect(pageWidth - margin - badgeWidth - 6, y + 24, badgeWidth + 6, 10, 2, 2, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(flagCountText, pageWidth - margin - badgeWidth / 2 - 3, y + 30.5, { align: 'center' });

      y += 54;

      // =====================
      // TOTAL POTENTIAL SAVINGS (prominent)
      // =====================
      if (result.total_potential_savings !== undefined && result.total_potential_savings > 0) {
        checkPageBreak(30);
        doc.setFillColor(42, 157, 143); // teal
        doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('Total Potential Savings', margin + contentWidth / 2, y + 8, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(
          `$${result.total_potential_savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          margin + contentWidth / 2,
          y + 19,
          { align: 'center' }
        );

        y += 32;
      }

      // =====================
      // FLAGGED ITEMS
      // =====================
      if (result.flags.length > 0) {
        checkPageBreak(30);
        drawHR();

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(27, 42, 74);
        doc.text('Flagged Items', margin, y);
        y += 8;

        // Table header
        const colX = {
          type: margin,
          severity: margin + 42,
          description: margin + 68,
          amount: pageWidth - margin,
        };

        doc.setFillColor(27, 42, 74); // navy
        doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Type', colX.type + 3, y + 5.5);
        doc.text('Severity', colX.severity + 3, y + 5.5);
        doc.text('Description', colX.description + 3, y + 5.5);
        doc.text('Amount', colX.amount - 3, y + 5.5, { align: 'right' });

        y += 10;

        result.flags.forEach((flag, i) => {
          checkPageBreak(16);

          // Alternating row background
          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 1, contentWidth, 12, 'F');
          }

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);

          // Type
          const typeLabel = flag.type
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          doc.text(typeLabel, colX.type + 3, y + 5);

          // Severity with color
          const sevColors: Record<string, string> = {
            low: '#22C55E',
            medium: '#F59E0B',
            high: '#EF4444',
          };
          doc.setTextColor(sevColors[flag.severity] || darkGray);
          doc.setFont('Helvetica', 'bold');
          doc.text(
            flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1),
            colX.severity + 3,
            y + 5
          );

          // Description (truncate if too long)
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(75, 85, 99);
          const maxDescWidth = colX.amount - colX.description - 20;
          let desc = flag.description;
          while (doc.getTextWidth(desc) > maxDescWidth && desc.length > 10) {
            desc = desc.slice(0, -4) + '...';
          }
          doc.text(desc, colX.description + 3, y + 5);

          // Amount
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(27, 42, 74);
          doc.text(
            flag.amount !== null ? `$${flag.amount.toFixed(2)}` : '-',
            colX.amount - 3,
            y + 5,
            { align: 'right' }
          );

          y += 12;
        });

        y += 4;
      }

      // =====================
      // BENCHMARK COMPARISON
      // =====================
      if (result.benchmarks && result.benchmarks.length > 0) {
        checkPageBreak(30);
        drawHR();

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(27, 42, 74);
        doc.text('Benchmark Comparison', margin, y);
        y += 8;

        const benchColX = {
          service: margin,
          invoiced: margin + 70,
          market: margin + 100,
          diff: pageWidth - margin,
        };

        // Table header
        doc.setFillColor(27, 42, 74);
        doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Service', benchColX.service + 3, y + 5.5);
        doc.text('Invoiced Rate', benchColX.invoiced + 3, y + 5.5);
        doc.text('Market Avg', benchColX.market + 3, y + 5.5);
        doc.text('Difference', benchColX.diff - 3, y + 5.5, { align: 'right' });

        y += 10;

        result.benchmarks.forEach((bench, i) => {
          checkPageBreak(14);

          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 1, contentWidth, 12, 'F');
          }

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);

          // Service description (truncate)
          let serviceDesc = bench.service_description;
          const maxServiceWidth = benchColX.invoiced - benchColX.service - 8;
          while (doc.getTextWidth(serviceDesc) > maxServiceWidth && serviceDesc.length > 10) {
            serviceDesc = serviceDesc.slice(0, -4) + '...';
          }
          doc.text(serviceDesc, benchColX.service + 3, y + 5);

          // Invoiced Rate
          doc.text(`$${bench.invoiced_rate.toFixed(2)}`, benchColX.invoiced + 3, y + 5);

          // Market Average
          doc.text(`$${bench.market_average.toFixed(2)}`, benchColX.market + 3, y + 5);

          // Difference %
          const isOver = bench.difference_percent > 0;
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(isOver ? '#EF4444' : '#22C55E');
          doc.text(
            `${isOver ? '+' : ''}${bench.difference_percent.toFixed(1)}%`,
            benchColX.diff - 3,
            y + 5,
            { align: 'right' }
          );

          y += 12;
        });

        y += 4;
      }

      // =====================
      // RECOMMENDATIONS
      // =====================
      checkPageBreak(40);
      drawHR();

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(27, 42, 74);
      doc.text('Recommendations', margin, y);
      y += 8;

      const recommendations: string[] = [];

      if (result.flags.some((f) => f.type === 'vague_charge')) {
        recommendations.push(
          'Request itemized breakdowns for all vague or ambiguous charges before approving payment.'
        );
      }
      if (result.flags.some((f) => f.type === 'duplicate')) {
        recommendations.push(
          'Cross-reference flagged duplicates with previous invoices to confirm they are not repeat billings.'
        );
      }
      if (result.flags.some((f) => f.type === 'phantom_fee')) {
        recommendations.push(
          'Challenge any fees that do not correspond to agreed-upon contract terms or deliverables.'
        );
      }
      if (result.flags.some((f) => f.type === 'math_error')) {
        recommendations.push(
          'Notify the vendor of calculation errors and request a corrected invoice before payment.'
        );
      }
      if (result.flags.some((f) => f.type === 'overpriced') || (result.benchmarks && result.benchmarks.some((b) => b.difference_percent > 20))) {
        recommendations.push(
          'Negotiate pricing on services that exceed market rates by more than 20%. Use benchmark data as leverage.'
        );
      }
      if (result.flags.some((f) => f.type === 'formatting_trick')) {
        recommendations.push(
          'Review the original invoice carefully for formatting that may obscure true costs or terms.'
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          'Review flagged items with your team and contact the vendor to discuss any discrepancies.'
        );
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);

      recommendations.forEach((rec, i) => {
        checkPageBreak(14);
        const bulletText = `${i + 1}. ${rec}`;
        const lines = doc.splitTextToSize(bulletText, contentWidth - 6);
        doc.text(lines, margin + 3, y + 4);
        y += lines.length * 4.5 + 3;
      });

      // =====================
      // FOOTER
      // =====================
      const footerY = pageHeight - 16;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Generated by Auditflow', margin, footerY);
      doc.text(
        new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        pageWidth - margin,
        footerY,
        { align: 'right' }
      );

      // Save
      doc.save(`auditflow-report-${scanId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={generating}
      className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {generating ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generating Report...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download Savings Report
        </>
      )}
    </button>
  );
}
