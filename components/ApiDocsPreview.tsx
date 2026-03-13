export default function ApiDocsPreview() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1B2A4A]">API Usage</h2>
      <p className="mt-1 text-sm text-gray-600">
        Use the Auditflow API to programmatically analyze invoices and retrieve
        scan results. All API requests require a Bearer token.
      </p>

      {/* Analyze Invoice */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#1B2A4A]">
          Analyze an Invoice
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          POST /api/v1/analyze
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
{`curl -X POST https://app.auditflow.ai/api/v1/analyze \\
  -H "Authorization: Bearer af_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file": "<base64-encoded-file>",
    "file_name": "invoice.pdf",
    "file_type": "application/pdf"
  }'`}
        </pre>
      </div>

      {/* JavaScript Example */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#1B2A4A]">
          JavaScript / Fetch Example
        </h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
{`const file = fs.readFileSync('invoice.pdf');
const base64 = file.toString('base64');

const response = await fetch(
  'https://app.auditflow.ai/api/v1/analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer af_live_your_key_here',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: base64,
      file_name: 'invoice.pdf',
      file_type: 'application/pdf',
    }),
  }
);

const data = await response.json();
console.log(data.result);`}
        </pre>
      </div>

      {/* Response Shape */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#1B2A4A]">
          Response Shape
        </h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
{`{
  "result": {
    "vendor_name": "Acme Plumbing",
    "invoice_date": "2025-03-15",
    "invoice_total": 2450.00,
    "line_items": [
      {
        "description": "Emergency repair",
        "quantity": 1,
        "unit_price": 2200.00,
        "total": 2200.00
      }
    ],
    "flags": [
      {
        "type": "overpriced",
        "description": "Emergency repair rate 35% above market",
        "severity": "high",
        "amount": 2200.00
      }
    ],
    "math_check": {
      "status": "pass",
      "expected_total": 2450.00,
      "actual_total": 2450.00,
      "details": "All line items sum correctly"
    },
    "overall_risk_score": "high",
    "benchmarks": [...],
    "total_potential_savings": 570.00,
    "benchmark_summary": "..."
  },
  "scan_id": "uuid-here",
  "scan_limit": {
    "used": 12,
    "limit": 150,
    "remaining": 138
  }
}`}
        </pre>
      </div>

      {/* List Scans */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#1B2A4A]">
          List Scans
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          GET /api/v1/scans?page=1&per_page=20
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
{`curl https://app.auditflow.ai/api/v1/scans?page=1&per_page=20 \\
  -H "Authorization: Bearer af_live_your_key_here"`}
        </pre>
      </div>

      {/* Get Scan Detail */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#1B2A4A]">
          Get Scan Detail
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          GET /api/v1/scans/:id
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
{`curl https://app.auditflow.ai/api/v1/scans/scan-uuid-here \\
  -H "Authorization: Bearer af_live_your_key_here"`}
        </pre>
      </div>
    </div>
  );
}
