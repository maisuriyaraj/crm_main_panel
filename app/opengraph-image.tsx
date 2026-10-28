import { ImageResponse } from "next/og";

export const alt = "OrbitOps — Run your entire business from one platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image renderer can't read our CSS variables or oklch(), so these are
// hex equivalents of the --primary and dark --background theme tokens.
const PRIMARY = "#007b01";
const DARK = "#0c1507";

const modules = ["CRM", "Sales Pipeline", "Automation", "Ads", "Billing", "Analytics"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, #ffffff 0%, #f1f7ee 55%, #d9f0d4 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: PRIMARY }} />
          <span style={{ fontSize: 36, fontWeight: 700, color: DARK }}>OrbitOps</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: PRIMARY, textTransform: "uppercase" }}>
            The operating system for business growth
          </span>
          <span style={{ marginTop: 20, fontSize: 72, fontWeight: 700, lineHeight: 1.08, color: DARK, maxWidth: 950 }}>
            Run Your Entire Business From One Platform
          </span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {modules.map((m) => (
            <span
              key={m}
              style={{ padding: "10px 20px", borderRadius: 999, background: "#ffffff", border: "2px solid rgba(0, 123, 1, 0.2)", fontSize: 22, color: DARK }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
