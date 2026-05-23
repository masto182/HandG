import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Textarea } from "@medusajs/ui"
import { useState } from "react"

const StockImportPage = () => {
  const [csv, setCsv] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/admin/stock-import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setResult({ errors: [err.message] })
    }
    setLoading(false)
  }

  return (
    <Container>
      <Heading level="h1" className="mb-4">Stock CSV Import</Heading>
      <p className="text-sm text-ui-fg-subtle mb-4">
        Paste CSV with columns: name, brewery, style, abv, price, stock, container (optional), comment (optional)
      </p>
      <Textarea
        placeholder="name,brewery,style,abv,price,stock,container&#10;Status Quo DIPA,Mountain Culture Beer Co,Double IPA,8.0,15,24,Can 440ml"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={10}
        className="mb-4 font-mono text-xs"
      />
      <Button onClick={handleImport} isLoading={loading}>
        Import Stock
      </Button>
      {result && (
        <div className="mt-4 p-4 border border-ui-border-base rounded-lg">
          <p className="text-sm">
            Created: <strong>{result.created}</strong> | Updated: <strong>{result.updated}</strong> | Total: {result.total}
          </p>
          {result.errors?.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-ui-fg-error font-medium">Errors:</p>
              <ul className="text-xs text-ui-fg-subtle mt-1 space-y-1">
                {result.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Stock Import",
})

export default StockImportPage
