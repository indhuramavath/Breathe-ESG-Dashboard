export default function App() {
  return (
    <div style={{
      padding: "40px",
      fontFamily: "Arial",
      backgroundColor: "#f4f4f4",
      minHeight: "100vh"
    }}>
      <h1>Breathe ESG Dashboard 🚀</h1>

      <div style={{
        marginTop: "20px",
        padding: "20px",
        background: "white",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h2>Data Sources</h2>
        <ul>
          <li>SAP Fuel & Procurement Data</li>
          <li>Utility Electricity Data</li>
          <li>Corporate Travel Data</li>
        </ul>
      </div>

      <div style={{
        marginTop: "20px",
        padding: "20px",
        background: "white",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h2>Status</h2>
        <p>✔ Data ingestion active</p>
        <p>✔ ESG normalization running</p>
        <p>✔ Analyst review dashboard connected</p>
      </div>
    </div>
  );
}