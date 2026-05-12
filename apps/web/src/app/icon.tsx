import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1940",
          borderRadius: "6px",
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
          color: "white",
          gap: 0,
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1.1 }}>CS</span>
        <div style={{ width: "80%", height: 1.5, background: "white", margin: "1px 0" }} />
        <span style={{ fontSize: 9, lineHeight: 1.1 }}>HRM</span>
      </div>
    ),
    { ...size }
  );
}
