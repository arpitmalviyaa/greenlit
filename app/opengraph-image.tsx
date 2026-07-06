import { ImageResponse } from "next/og";

export const alt = "Greenlit — Stop signing contracts you haven't really read";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F5F3EE",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", color: "#1D9E75", fontSize: 44, fontWeight: 700 }}>greenlit</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#111111",
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          <span>Stop signing contracts</span>
          <span style={{ display: "flex" }}>
            you haven&apos;t&nbsp;<span style={{ color: "#1D9E75", fontStyle: "italic" }}>really</span>&nbsp;read.
          </span>
        </div>
        <div style={{ display: "flex", color: "#11111199", fontSize: 30 }}>
          Contract intelligence for the creator economy · getgreenlit.in
        </div>
      </div>
    ),
    size
  );
}
