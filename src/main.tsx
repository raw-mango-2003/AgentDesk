import {StrictMode, Component, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

class AppErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AgentDesk] Application render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:'100vh',background:'#020617',color:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:'system-ui,sans-serif'}}>
          <div style={{maxWidth:'720px',width:'100%',background:'#0f172a',border:'1px solid #334155',borderRadius:'16px',padding:'28px'}}>
            <h1 style={{fontSize:'24px',fontWeight:700,margin:'0 0 12px'}}>AgentDesk could not load</h1>
            <p style={{color:'#cbd5e1',margin:'0 0 18px'}}>The application encountered a browser error while starting. Refresh once. If it persists, the technical error below identifies the failing component.</p>
            <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',background:'#020617',padding:'16px',borderRadius:'10px',color:'#fca5a5',fontSize:'13px'}}>{this.state.error.message || String(this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={{marginTop:'18px',padding:'10px 16px',borderRadius:'10px',border:0,cursor:'pointer',background:'#2563eb',color:'#fff',fontWeight:600}}>Reload AgentDesk</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <StrictMode>
        <AppErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppErrorBoundary>
      </StrictMode>,
    );
  }
} catch (err: any) {
  console.error('[AgentDesk] Root initialization error:', err);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="min-height:100vh;background:#020617;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif">
        <div style="max-width:680px;width:100%;background:#0f172a;border:1px solid #334155;border-radius:16px;padding:28px">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">AgentDesk Startup Interrupted</h1>
          <p style="color:#cbd5e1;margin:0 0 16px">A browser initialization error occurred.</p>
          <pre style="whiteSpace:pre-wrap;background:#020617;padding:14px;border-radius:10px;color:#fca5a5;font-size:13px">${err?.message || String(err)}</pre>
          <button onclick="window.location.reload()" style="margin-top:16px;padding:10px 18px;border-radius:8px;border:0;cursor:pointer;background:#2563eb;color:#fff;font-weight:600">Reload Application</button>
        </div>
      </div>
    `;
  }
}
