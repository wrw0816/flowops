import { createClient } from "@/lib/supabase/server";

export default async function TestConnectionPage() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("flowops_connection_test")
    .select("*")
    .limit(1);

  const message = error?.message ?? "";
  const connected =
    message.toLowerCase().includes("could not find the table") ||
    message.toLowerCase().includes("schema cache");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f3f4f6",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(520px, 100%)",
          padding: "32px",
          background: "#ffffff",
          border: "1px solid #e4e6ea",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#d6262e",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          FlowOps Setup
        </p>

        <h1 style={{ margin: "0 0 12px", fontSize: "30px" }}>
          {connected ? "Supabase Connected" : "Connection Needs Attention"}
        </h1>

        <p style={{ margin: 0, color: "#737985", lineHeight: 1.6 }}>
          {connected
            ? "FlowOps successfully reached your Supabase project."
            : message || "An unknown connection error occurred."}
        </p>
      </section>
    </main>
  );
}