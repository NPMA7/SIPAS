import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../hooks/ToastContext';
import { apiFetch } from '../api/client';
import { Loader } from '../components/ui/index';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle';
import SwaggerUIStandalonePreset from 'swagger-ui-dist/swagger-ui-standalone-preset';
import 'swagger-ui-dist/swagger-ui.css';

export default function ApiDocs() {
  const ctx = useContext(ToastContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const swaggerRef = useRef(null);

  const currentAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem('hotspot_admin') || '{}');
    } catch {
      return {};
    }
  })();

  const isSuperAdmin = currentAdmin?.role === 'superadmin';

  useEffect(() => {
    ctx?.setPageTitle?.('Dokumentasi REST API');
  }, [ctx]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Akses ditolak. Dokumentasi REST API ini hanya dapat diakses oleh Super Administrator.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initSwagger() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/admin/openapi.json');
        
        if (!res || res.success === false) {
          throw new Error(res?.message || 'Gagal memuat OpenAPI specification dari server.');
        }

        if (!isMounted) return;

        const token = localStorage.getItem('hotspot_token');

        if (swaggerRef.current) {
          swaggerRef.current.innerHTML = ''; // reset container
          
          const ui = SwaggerUIBundle({
            spec: res,
            domNode: swaggerRef.current,
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset,
            ],
            layout: "BaseLayout",
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: "list",
            filter: true,
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            requestInterceptor: (req) => {
              if (token && !req.headers['Authorization']) {
                req.headers['Authorization'] = `Bearer ${token}`;
              }
              return req;
            }
          });

          if (token && ui.preauthorizeApiKey) {
            ui.preauthorizeApiKey("BearerAuth", token);
          }

          // Inject "Salin JWT Token" button beside Servers
          const injectBtn = () => {
            const schemesSec = swaggerRef.current?.querySelector('.scheme-container .schemes');
            if (schemesSec && !schemesSec.querySelector('#btn-copy-jwt-token')) {
              const btn = document.createElement('button');
              btn.id = 'btn-copy-jwt-token';
              btn.type = 'button';
              btn.className = 'btn-copy-jwt-swagger';
              btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Salin JWT Token</span>
              `;
              btn.onclick = (e) => {
                e.preventDefault();
                const curToken = localStorage.getItem('hotspot_token');
                if (curToken) {
                  navigator.clipboard.writeText(curToken);
                  ctx?.addToast?.('Token Disalin', 'JWT Bearer Token berhasil disalin ke clipboard.', 'success');
                }
              };
              schemesSec.appendChild(btn);
            }
          };

          // Run injection immediately and listen for DOM mutations
          setTimeout(injectBtn, 100);
          setTimeout(injectBtn, 500);

          const observer = new MutationObserver(() => {
            injectBtn();
          });
          observer.observe(swaggerRef.current, { childList: true, subtree: true });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Gagal memuat dokumentasi API.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initSwagger();

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, ctx]);

  if (!isSuperAdmin) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-100 mb-2">Akses Terbatas (SuperAdmin Only)</h2>
        <p className="text-xs text-slate-400 mb-6">
          Dokumentasi REST API ini memuat skema internal sistem dan hanya dapat diakses oleh akun dengan hak akses <strong>Super Administrator</strong>.
        </p>
        <button className="btn btn-primary btn-sm mx-auto" onClick={() => navigate('/manage/admin')}>
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Swagger UI Container Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 sm:p-6 min-h-[600px] shadow-2xl">
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader />
            <span className="text-xs text-slate-400">Memuat OpenAPI Specification & Swagger UI...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <div className="font-bold flex items-center gap-2 mb-1">
              <span>⚠️ Akses Ditolak / Gagal Memuat</span>
            </div>
            <div>{error}</div>
          </div>
        )}

        <div
          ref={swaggerRef}
          className={`swagger-custom-theme ${loading || error ? 'hidden' : 'block'}`}
        />
      </div>
    </div>
  );
}
