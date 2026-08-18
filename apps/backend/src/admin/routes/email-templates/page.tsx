import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type TemplateInfo = { name: string; label: string }

type RenderResult = {
  html: string
  subject: string
  synthetic: string[]
}

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sdk.client
      .fetch<{ templates: TemplateInfo[] }>("/admin/email-templates", { method: "GET" })
      .then((res) => {
        setTemplates(res.templates || [])
        if (res.templates?.length) selectTemplate(res.templates[0].name)
      })
      .catch((e: any) => setError(e?.message || "Could not load templates"))
  }, [])

  const selectTemplate = async (name: string) => {
    setSelected(name)
    setResult(null)
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<RenderResult>(`/admin/email-templates/${name}`, {
        method: "GET",
      })
      setResult(res)
    } catch (e: any) {
      setError(e?.message || "Could not render template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-0">
      <div className="flex h-[calc(100vh-120px)]">
        <div className="w-64 border-r border-ui-border-base overflow-y-auto shrink-0">
          <div className="p-4">
            <Heading level="h2">Email Templates</Heading>
            <p className="text-xs text-ui-fg-subtle mt-1">
              Preview all transactional and marketing emails with sample data.
            </p>
          </div>
          <div className="divide-y divide-ui-border-base">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => selectTemplate(t.name)}
                className={`block w-full text-left px-4 py-3 text-sm hover:bg-ui-bg-base-hover ${
                  selected === t.name ? "bg-ui-bg-base-hover font-medium" : ""
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <p className="text-sm text-ui-fg-error p-4" role="alert">
              {error}
            </p>
          )}

          {result && (
            <>
              <div className="p-4 border-b border-ui-border-base flex items-center justify-between gap-4">
                <div>
                  <Text size="small" className="text-ui-fg-subtle">
                    Subject
                  </Text>
                  <Text weight="plus">{result.subject}</Text>
                </div>
                {result.synthetic.length > 0 && (
                  <div className="text-right">
                    <Badge size="2xsmall" color="orange">
                      Sample data
                    </Badge>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                      Synthetic: {result.synthetic.join(", ")}
                    </Text>
                  </div>
                )}
              </div>
              <iframe
                title={selected || "preview"}
                srcDoc={result.html}
                className="w-full flex-1 border-0 bg-white"
              />
            </>
          )}

          {loading && !result && <p className="p-4 text-sm text-ui-fg-subtle">Rendering...</p>}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Email Templates",
  icon: undefined,
})

export default EmailTemplatesPage
