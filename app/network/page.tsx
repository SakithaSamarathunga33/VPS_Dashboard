"use client"

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ opacity: 0.45 }}>
      {children}
    </div>
  )
}

const STATIC_PORTS = [
  { port: 22, service: "SSH", proto: "TCP", safe: true },
  { port: 80, service: "HTTP", proto: "TCP", safe: true },
  { port: 443, service: "HTTPS", proto: "TCP", safe: true },
]

export default function NetworkPage() {
  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: "rgba(74,162,171,0.06)", border: "1px solid rgba(74,162,171,0.15)" }}
      >
        <p className="text-sm" style={{ color: "#8899b0" }}>
          <span className="font-semibold" style={{ color: "#4aa2ab" }}>Network monitoring</span>{" "}
          requires additional agent instrumentation. Real-time bandwidth and interface statistics
          will appear here once the agent is extended with network metrics collection.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Placeholder charts */}
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Inbound (eth0)</Label>
            <span className="font-mono text-[13px]" style={{ color: "#4aa2ab", opacity: 0.5 }}>—</span>
          </div>
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ height: 90, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)" }}
          >
            <span className="text-sm" style={{ opacity: 0.3 }}>No data — agent extension needed</span>
          </div>
        </DashCard>
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Outbound (eth0)</Label>
            <span className="font-mono text-[13px]" style={{ color: "#8ed8ad", opacity: 0.5 }}>—</span>
          </div>
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ height: 90, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)" }}
          >
            <span className="text-sm" style={{ opacity: 0.3 }}>No data — agent extension needed</span>
          </div>
        </DashCard>
      </div>

      {/* Open ports (static placeholder) */}
      <DashCard>
        <Label>Common Ports Reference</Label>
        <div className="mt-3 overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Port", "Service", "Protocol", "Exposure"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-widest"
                    style={{ opacity: 0.45, borderBottom: "1px solid var(--border)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIC_PORTS.map((p) => (
                <tr key={p.port}>
                  <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span className="font-mono font-semibold" style={{ color: "#f0f4f8" }}>{p.port}</span>
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    {p.service}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span className="font-mono text-[11px]" style={{ opacity: 0.55 }}>{p.proto}</span>
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                      style={
                        p.safe
                          ? { background: "rgba(142,216,173,0.12)", color: "#8ed8ad" }
                          : { background: "rgba(245,158,11,0.12)", color: "#f59e0b" }
                      }
                    >
                      {p.safe ? "public" : "internal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashCard>
    </div>
  )
}
