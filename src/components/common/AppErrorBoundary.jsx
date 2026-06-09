import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
          <h1>PimPamPof kon niet laden</h1>
          <p>Er is een runtime-fout opgetreden. Open de browser console voor details.</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.08)", padding: 12, borderRadius: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
