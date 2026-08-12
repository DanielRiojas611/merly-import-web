"use client";

import { FormEvent, useMemo, useState } from "react";
import { BRAND_NAME, CONTACT_EMAIL, LOGO_PATH, OFFICIAL_SITE_URL, SITE_DOMAIN, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "../lib/brand";
import styles from "./page.module.css";

type FormState = {
  nombre: string;
  telefono: string;
  correo: string;
  departamento: string;
  negocio: string;
  objetivo: string;
  categorias: string[];
};

const departamentos = [
  "Amazonas","Áncash","Apurímac","Arequipa","Ayacucho","Cajamarca","Callao","Cusco",
  "Huancavelica","Huánuco","Ica","Junín","La Libertad","Lambayeque","Lima","Loreto",
  "Madre de Dios","Moquegua","Pasco","Piura","Puno","San Martín","Tacna","Tumbes","Ucayali"
];

const negocios = ["Distribuidor", "Mayorista", "Bodega", "Minimarket", "Botica / Farmacia", "Otro"];
const objetivos = ["Comprar productos al por mayor", "Distribuir productos en mi ciudad", "Conocer catálogo y precios"];
const categorias = ["Higiene", "Limpieza", "Hogar", "Ferreteria", "Utiles de oficina", "Mundo Bebe", "Otros"];

const initialForm: FormState = {
  nombre: "",
  telefono: "",
  correo: "",
  departamento: "",
  negocio: "",
  objetivo: "",
  categorias: [],
};

export default function TikTokDistribuidoresPreview() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(
      `Hola, soy ${form.nombre || "un potencial cliente"}. Acabo de completar el formulario mayorista de ${BRAND_NAME}. ` +
      `Estoy en ${form.departamento || "Peru"} y me interesa: ${form.objetivo || "informacion mayorista"}.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(category: string) {
    setForm((current) => ({
      ...current,
      categorias: current.categorias.includes(category)
        ? current.categorias.filter((item) => item !== category)
        : [...current.categorias, category],
    }));
  }

  function validate() {
    if (!form.nombre.trim()) return "Ingresa tu nombre y apellido.";
    if (!/^\+?[0-9\s-]{9,15}$/.test(form.telefono.trim())) return "Ingresa un celular válido.";
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) return "Revisa el correo electrónico.";
    if (!form.departamento) return "Selecciona tu departamento.";
    if (!form.negocio) return "Selecciona el tipo de negocio.";
    if (!form.objetivo) return "Selecciona qué estás buscando.";
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/distribuidor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fuente: params.get("utm_source") ? "campaña" : "web-distribuidor",
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_content: params.get("utm_content") || "",
        }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No pudimos registrar tu solicitud. Intenta nuevamente o continúa por WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.topbar}>
            <span className={styles.topTitle}>{BRAND_NAME}</span>
            <button className={styles.close} aria-label="Cerrar">×</button>
          </header>
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Solicitud recibida</h2>
            <p>Gracias por contactar a {BRAND_NAME}. Puedes continuar ahora por WhatsApp o revisar el catalogo mayorista.</p>
            <a className={styles.whatsapp} href={whatsappHref} target="_blank" rel="noreferrer">Continuar por WhatsApp</a>
            <a className={styles.catalog} href={`${OFFICIAL_SITE_URL}/catalogo`} target="_blank" rel="noreferrer">Ver catalogo mayorista</a>
            <div className={styles.legalCard}>
              <strong>{BRAND_NAME}</strong>
              <span>{WHATSAPP_DISPLAY}</span>
              <span>{CONTACT_EMAIL}</span>
              <span>{SITE_DOMAIN}</span>
            </div>
          </div>
          <div className={styles.footnote}>Formulario de captacion comercial · {BRAND_NAME}</div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topbar}>
          <span className={styles.topTitle}>Formulario instantáneo</span>
          <button className={styles.close} aria-label="Cerrar">×</button>
        </header>

        <div className={styles.banner}>
          <div className={styles.brandRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.logo} src={LOGO_PATH} alt={BRAND_NAME} />
            <span className={styles.domainPill}>{SITE_DOMAIN}</span>
          </div>
          <div className={styles.kicker}>Mayoristas y distribuidores</div>
          <h1>Abastecimiento mayorista para tu negocio</h1>
          <p>Productos de higiene, limpieza y hogar para negocios en Lima y provincias.</p>
          <div className={styles.chips}>
            <span className={styles.chip}>Atención mayorista</span>
            <span className={styles.chip}>Despachos a nivel nacional</span>
          </div>
        </div>

        <form className={styles.content} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.introTitle}>Solicita atención comercial</h2>
          <p className={styles.introText}>Déjanos tus datos y atenderemos tu consulta mayorista.</p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="nombre">Nombres y apellidos <span className={styles.required}>*</span></label>
            <input className={styles.input} id="nombre" name="name" autoComplete="name" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} placeholder="Tu nombre completo" />
            <div className={styles.helper}>TikTok puede completar este dato automáticamente si está disponible en tu cuenta.</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="telefono">Celular / WhatsApp <span className={styles.required}>*</span></label>
            <input className={styles.input} id="telefono" name="tel" inputMode="tel" autoComplete="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} placeholder="+51 999 999 999" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="correo">Correo electrónico</label>
            <input className={styles.input} id="correo" name="email" type="email" autoComplete="email" value={form.correo} onChange={(e) => update("correo", e.target.value)} placeholder="correo@empresa.com" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="departamento">Departamento <span className={styles.required}>*</span></label>
            <select className={styles.select} id="departamento" value={form.departamento} onChange={(e) => update("departamento", e.target.value)}>
              <option value="">Selecciona</option>
              {departamentos.map((departamento) => <option key={departamento} value={departamento}>{departamento}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="negocio">Tipo de negocio <span className={styles.required}>*</span></label>
            <select className={styles.select} id="negocio" value={form.negocio} onChange={(e) => update("negocio", e.target.value)}>
              <option value="">Selecciona</option>
              {negocios.map((negocio) => <option key={negocio} value={negocio}>{negocio}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>¿Qué estás buscando? <span className={styles.required}>*</span></div>
            <div className={styles.optionGroup}>
              {objetivos.map((objetivo) => (
                <label key={objetivo} className={`${styles.option} ${form.objetivo === objetivo ? styles.optionSelected : ""}`}>
                  <input type="radio" name="objetivo" checked={form.objetivo === objetivo} onChange={() => update("objetivo", objetivo)} />
                  <span>{objetivo}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Categorías de interés</div>
            <div className={styles.optionGroup}>
              {categorias.map((categoria) => (
                <label key={categoria} className={`${styles.option} ${form.categorias.includes(categoria) ? styles.optionSelected : ""}`}>
                  <input type="checkbox" checked={form.categorias.includes(categoria)} onChange={() => toggleCategory(categoria)} />
                  <span>{categoria}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.sectionDivider} />
          <div className={styles.about}>
            <div className={styles.aboutTitle}>Información comercial</div>
            <div className={styles.aboutText}>{BRAND_NAME} · {WHATSAPP_DISPLAY} · {CONTACT_EMAIL}.</div>
          </div>

          <p className={styles.privacy}>Al enviar aceptas que {BRAND_NAME} utilice estos datos para atender tu solicitud comercial. Consulta la <a href={`${OFFICIAL_SITE_URL}/privacidad`} target="_blank" rel="noreferrer">Politica de Privacidad</a>.</p>
          <button className={styles.submit} type="submit" disabled={busy}>{busy ? "Enviando..." : "Enviar solicitud"}</button>
        </form>
      </section>
    </main>
  );
}
