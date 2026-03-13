/**
 * Invoice format converters for accounting integrations.
 *
 * These functions convert raw invoice data from QuickBooks and Xero
 * into plain-text summaries suitable for Claude AI analysis.
 *
 * Both functions are scaffolded with TODO comments because the exact
 * JSON shapes depend on the provider APIs and need testing with real data.
 */

/**
 * Converts a QuickBooks invoice JSON object into a plain-text summary
 * that can be fed to Claude for audit analysis.
 *
 * TODO: Implement this converter once QuickBooks invoice fetching is working.
 *
 * QuickBooks invoice object reference:
 *   https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
 *
 * Expected input shape (key fields):
 *   {
 *     Id: string,
 *     DocNumber: string,
 *     TxnDate: string,
 *     DueDate: string,
 *     CustomerRef: { value: string, name: string },
 *     TotalAmt: number,
 *     Balance: number,
 *     Line: [
 *       {
 *         Description: string,
 *         Amount: number,
 *         SalesItemLineDetail: { Qty: number, UnitPrice: number }
 *       }
 *     ]
 *   }
 *
 * Expected output: A formatted text string like:
 *   "Invoice #1234 from Vendor Name\nDate: 2025-01-15\nTotal: $5,000.00\n\nLine Items:\n- Service description: 5 x $100.00 = $500.00\n..."
 *
 * @param invoice - A raw QuickBooks invoice object from the API
 * @returns A plain-text summary of the invoice for Claude analysis
 */
export function convertQuickBooksInvoice(invoice: any): string {
  // TODO: Implement QuickBooks invoice conversion.
  // Map the QuickBooks JSON structure to a human-readable text format
  // that Claude can analyze for overcharges, duplicate fees, etc.
  //
  // Example implementation:
  //
  // const lines = invoice.Line
  //   ?.filter((line: any) => line.DetailType === 'SalesItemLineDetail')
  //   ?.map((line: any) => {
  //     const detail = line.SalesItemLineDetail;
  //     const qty = detail?.Qty ?? 1;
  //     const price = detail?.UnitPrice ?? line.Amount;
  //     return `- ${line.Description || 'No description'}: ${qty} x $${price.toFixed(2)} = $${line.Amount.toFixed(2)}`;
  //   })
  //   ?.join('\n') ?? 'No line items';
  //
  // return [
  //   `Invoice #${invoice.DocNumber || invoice.Id}`,
  //   `Vendor/Customer: ${invoice.CustomerRef?.name || 'Unknown'}`,
  //   `Date: ${invoice.TxnDate || 'Unknown'}`,
  //   `Due Date: ${invoice.DueDate || 'Unknown'}`,
  //   `Total: $${invoice.TotalAmt?.toFixed(2) || '0.00'}`,
  //   `Balance Due: $${invoice.Balance?.toFixed(2) || '0.00'}`,
  //   '',
  //   'Line Items:',
  //   lines,
  // ].join('\n');

  throw new Error(
    'QuickBooks invoice converter not yet implemented. ' +
      'Implement convertQuickBooksInvoice() in lib/integrations/invoice-converter.ts ' +
      'once QuickBooks API integration is configured and you have sample invoice data.'
  );
}

/**
 * Converts a Xero invoice JSON object into a plain-text summary
 * that can be fed to Claude for audit analysis.
 *
 * TODO: Implement this converter once Xero invoice fetching is working.
 *
 * Xero invoice object reference:
 *   https://developer.xero.com/documentation/api/accounting/invoices
 *
 * Expected input shape (key fields):
 *   {
 *     InvoiceID: string,
 *     InvoiceNumber: string,
 *     Date: string,
 *     DueDate: string,
 *     Contact: { Name: string },
 *     Total: number,
 *     AmountDue: number,
 *     LineItems: [
 *       {
 *         Description: string,
 *         Quantity: number,
 *         UnitAmount: number,
 *         LineAmount: number
 *       }
 *     ]
 *   }
 *
 * Expected output: A formatted text string like:
 *   "Invoice #INV-0042 from Vendor Name\nDate: 2025-01-15\nTotal: $5,000.00\n\nLine Items:\n- Service description: 5 x $100.00 = $500.00\n..."
 *
 * @param invoice - A raw Xero invoice object from the API
 * @returns A plain-text summary of the invoice for Claude analysis
 */
export function convertXeroInvoice(invoice: any): string {
  // TODO: Implement Xero invoice conversion.
  // Map the Xero JSON structure to a human-readable text format
  // that Claude can analyze for overcharges, duplicate fees, etc.
  //
  // Example implementation:
  //
  // const lines = invoice.LineItems
  //   ?.map((line: any) => {
  //     const qty = line.Quantity ?? 1;
  //     const price = line.UnitAmount ?? line.LineAmount;
  //     return `- ${line.Description || 'No description'}: ${qty} x $${price.toFixed(2)} = $${line.LineAmount.toFixed(2)}`;
  //   })
  //   ?.join('\n') ?? 'No line items';
  //
  // return [
  //   `Invoice #${invoice.InvoiceNumber || invoice.InvoiceID}`,
  //   `Vendor/Contact: ${invoice.Contact?.Name || 'Unknown'}`,
  //   `Date: ${invoice.Date || 'Unknown'}`,
  //   `Due Date: ${invoice.DueDate || 'Unknown'}`,
  //   `Total: $${invoice.Total?.toFixed(2) || '0.00'}`,
  //   `Amount Due: $${invoice.AmountDue?.toFixed(2) || '0.00'}`,
  //   '',
  //   'Line Items:',
  //   lines,
  // ].join('\n');

  throw new Error(
    'Xero invoice converter not yet implemented. ' +
      'Implement convertXeroInvoice() in lib/integrations/invoice-converter.ts ' +
      'once Xero API integration is configured and you have sample invoice data.'
  );
}
